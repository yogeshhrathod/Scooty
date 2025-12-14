const express = require('express');
const portfinder = require('portfinder');
const cors = require('cors');
const textMime = require('mime-types');
const path = require('path');
const fs = require('fs');
const os = require('os');

// FFmpeg setup - using @ffmpeg-installer for cross-platform support (including Apple Silicon)
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Get ffmpeg path (handle asar packaging for Electron)
const ffmpegPath = ffmpegInstaller.path.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfmpegPath(ffmpegPath);

const ftpService = require('./FtpService');
const mediaInfoService = require('./MediaInfoService');

class StreamProxy {
    constructor() {
        this.app = express();
        this.server = null;
        this.port = null;
        this.subtitleCache = new Map(); // Cache extracted subtitles

        this.app.use(cors());
        this.app.use(express.json());

        // =====================================
        // GET /media-info - Get media track information
        // =====================================
        this.app.get('/media-info', async (req, res) => {
            const filePath = req.query.file;

            if (!filePath) {
                return res.status(400).json({ error: 'Missing file path' });
            }

            try {
                console.log('[StreamProxy] Getting media info for:', filePath);
                const info = await mediaInfoService.getMediaInfo(filePath);

                // Add display names to tracks
                info.audioTracks = info.audioTracks.map(track => ({
                    ...track,
                    displayName: mediaInfoService.getTrackDisplayName(track),
                }));

                info.subtitleTracks = info.subtitleTracks.map(track => ({
                    ...track,
                    displayName: mediaInfoService.getTrackDisplayName(track),
                }));

                res.json(info);
            } catch (err) {
                console.error('[StreamProxy] Media info error:', err.message);
                res.status(500).json({ error: err.message });
            }
        });

        // =====================================
        // GET /subtitle - Extract and serve subtitle as VTT
        // =====================================
        this.app.get('/subtitle', async (req, res) => {
            const filePath = req.query.file;
            const trackIndex = parseInt(req.query.track, 10);

            if (!filePath || isNaN(trackIndex)) {
                return res.status(400).send('Missing file or track parameter');
            }

            const cacheKey = `${filePath}:${trackIndex}`;

            try {
                let vttPath = this.subtitleCache.get(cacheKey);

                if (!vttPath || !fs.existsSync(vttPath)) {
                    console.log('[StreamProxy] Extracting subtitle track', trackIndex, 'from', filePath);
                    vttPath = await mediaInfoService.extractSubtitle(filePath, trackIndex);
                    this.subtitleCache.set(cacheKey, vttPath);
                }

                res.setHeader('Content-Type', 'text/vtt');
                res.setHeader('Access-Control-Allow-Origin', '*');

                const content = fs.readFileSync(vttPath, 'utf8');
                res.send(content);
            } catch (err) {
                console.error('[StreamProxy] Subtitle extraction error:', err.message);
                res.status(500).send('Subtitle extraction failed: ' + err.message);
            }
        });

        // =====================================
        // GET /stream - Main video streaming endpoint
        // =====================================
        this.app.get('/stream', async (req, res) => {
            const filePath = req.query.file;
            const startTime = parseFloat(req.query.start || 0);
            const audioTrack = parseInt(req.query.audio, 10); // Optional: specific audio track

            if (!filePath) {
                return res.status(400).send("Missing file path");
            }

            console.log(`[StreamProxy] Requesting: ${filePath}, Start: ${startTime}, Audio: ${audioTrack}`);

            // Detect Type
            const mimeType = textMime.lookup(filePath) || 'video/mp4';
            const isMkv = mimeType === 'video/x-matroska' || filePath.toLowerCase().endsWith('.mkv');
            const isLocalFile = fs.existsSync(filePath);

            // For local files that are NOT MKV, we can do range-based streaming
            if (isLocalFile && !isMkv) {
                return this.handleLocalFileStream(req, res, filePath, mimeType);
            }

            if (isMkv) {
                // FFmpeg Transcoding Stream (Remux to MP4)
                console.log(`[StreamProxy] DETECTED MKV: ${filePath}`);

                if (isLocalFile) {
                    console.log(`[StreamProxy] File exists locally: ${filePath}`);
                } else {
                    console.log(`[StreamProxy] File NOT found locally: ${filePath}`);
                }

                res.writeHead(200, {
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*',
                });

                let command;

                // Check if file exists locally
                if (isLocalFile) {
                    command = ffmpeg(filePath);
                } else {
                    // FTP -> FFmpeg piping
                    try {
                        const { PassThrough } = require('stream');
                        const pt = new PassThrough();

                        const streamClient = await ftpService.createStreamClient();

                        streamClient.download(pt, filePath, 0).catch(err => {
                            console.error("[StreamProxy] FTP DL Error for transcoding:", err);
                            if (!res.headersSent) {
                                res.status(500).send("FTP Download Error for Transcoding");
                            } else {
                                res.end();
                            }
                        }).finally(() => {
                            streamClient.close();
                        });

                        command = ffmpeg(pt);
                    } catch (e) {
                        console.error("[StreamProxy] Failed to setup FTP for transcoding", e);
                        if (!res.headersSent) {
                            return res.status(500).send("Transcoding Setup Error");
                        } else {
                            res.end();
                        }
                    }
                }

                if (command) {
                    // Build output options
                    // Using copy mode for video - if the codec (H.265/HEVC) isn't supported,
                    // the browser will show an error. Full transcoding to H.264 is too slow
                    // for real-time playback. Consider using hardware acceleration in the future.
                    const outputOptions = [
                        '-movflags frag_keyframe+empty_moov+default_base_moof', // fragmented mp4 for streaming
                        '-c:v copy', // copy video (fast) - works for H.264, may fail for HEVC in browsers
                        '-c:a aac',  // transcode audio to aac (safe for web)
                        '-b:a 192k',
                        '-ac 2',     // Stereo output for web compatibility
                    ];

                    // Map specific audio track if requested
                    if (!isNaN(audioTrack) && audioTrack >= 0) {
                        outputOptions.unshift(`-map 0:v:0`); // First video stream
                        outputOptions.unshift(`-map 0:${audioTrack}`); // Specific audio track
                    }

                    command
                        .seekInput(startTime)
                        .outputOptions(outputOptions)
                        .format('mp4')
                        .on('start', (cmd) => {
                            console.log('[StreamProxy] FFmpeg command:', cmd);
                        })
                        .on('stderr', (stderrLine) => {
                            // Log FFmpeg progress (frame info, speed, etc.)
                            if (stderrLine.includes('frame=') || stderrLine.includes('speed=')) {
                                console.log('[StreamProxy] FFmpeg:', stderrLine);
                            }
                        })
                        .on('error', (err) => {
                            // Don't log "killed" errors as they're expected when client disconnects
                            if (!err.message.includes('SIGKILL')) {
                                console.error('[StreamProxy] FFmpeg Error:', err.message);
                            }
                            if (!res.headersSent) {
                                res.status(500).send("Transcoding Error: " + err.message);
                            } else {
                                res.end();
                            }
                        })
                        .on('end', () => {
                            console.log('[StreamProxy] Transcoding finished');
                        })
                        .pipe(res, { end: true });

                    // Handle client disconnect
                    req.on('close', () => {
                        console.log('[StreamProxy] Client disconnected, killing ffmpeg.');
                        command.kill('SIGKILL');
                    });
                }
                return;
            }

            // Standard HTTP Range Stream for FTP (MP4 / Direct Play)
            let client = null;
            try {
                client = await ftpService.createStreamClient();
                const size = await client.size(filePath);

                const range = req.headers.range;
                let start = 0;
                let end = size - 1;

                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    start = parseInt(parts[0], 10);
                    if (parts[1]) {
                        end = parseInt(parts[1], 10);
                    }
                }

                const chunksize = (end - start) + 1;

                console.log(`[StreamProxy] Streaming bytes=${start}-${end} (${chunksize} bytes)`);

                const head = {
                    'Content-Range': `bytes ${start}-${end}/${size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': mimeType,
                };

                res.writeHead(206, head);

                try {
                    await client.download(res, filePath, start);
                } catch (streamErr) {
                    console.error("[StreamProxy] Stream interrupted:", streamErr.message);
                } finally {
                    client.close();
                }

            } catch (err) {
                console.error("[StreamProxy] Error:", err.message);
                if (client) client.close();
                if (!res.headersSent) {
                    res.status(500).send("Stream Error: " + err.message);
                } else {
                    res.end();
                }
            }
        });
    }

    /**
     * Handle local file streaming with range support
     */
    handleLocalFileStream(req, res, filePath, mimeType) {
        try {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;

                console.log(`[StreamProxy] Local file range ${start}-${end}/${fileSize}`);

                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': mimeType,
                };

                res.writeHead(206, head);
                fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': mimeType,
                    'Accept-Ranges': 'bytes',
                };
                res.writeHead(200, head);
                fs.createReadStream(filePath).pipe(res);
            }
        } catch (err) {
            console.error('[StreamProxy] Local file error:', err.message);
            res.status(500).send('File read error: ' + err.message);
        }
    }

    async start() {
        try {
            this.port = await portfinder.getPortPromise({ port: 8000, stopPort: 9000 });
            this.server = this.app.listen(this.port, () => {
                console.log(`[StreamProxy] running on http://localhost:${this.port}`);
            });
            return this.port;
        } catch (err) {
            console.error("Failed to start stream proxy", err);
            throw err;
        }
    }

    getPort() {
        return this.port;
    }

    /**
     * Clean up cached subtitle files
     */
    cleanup() {
        for (const [key, vttPath] of this.subtitleCache) {
            try {
                if (fs.existsSync(vttPath)) {
                    fs.unlinkSync(vttPath);
                }
            } catch (e) {
                console.warn('[StreamProxy] Failed to cleanup subtitle:', e.message);
            }
        }
        this.subtitleCache.clear();
    }
}

module.exports = new StreamProxy();
