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
            const startTime = parseFloat(req.query.start || 0);

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

                let content = fs.readFileSync(vttPath, 'utf8');

                // Adjust timestamps if seeking (startTime > 0)
                if (startTime > 0) {
                    content = this.adjustSubtitleTimestamps(content, startTime);
                }

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
                    // Remote FTP file - use FFmpeg native FTP support
                    try {
                        const allConfigs = ftpService.getAllConfigs();

                        if (allConfigs.length === 0) {
                            console.error('[StreamProxy] No FTP configs available - cannot stream FTP file');
                            if (!res.headersSent) {
                                return res.status(503).json({
                                    error: 'FTP not configured',
                                    message: 'No FTP sources are configured. Please add an FTP source in settings.'
                                });
                            }
                            return;
                        }

                        // Use the first config (TODO: pass sourceId from frontend for multi-source accuracy)
                        const activeConfig = allConfigs[0];
                        const { user, password, host, port } = activeConfig;

                        const encodedUser = encodeURIComponent(user);
                        const encodedPass = encodeURIComponent(password);

                        // Ensure path starts with / and encode segments
                        const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
                        const encodedPath = cleanPath.split('/').map(segment =>
                            encodeURIComponent(segment)
                                .replace(/%5B/g, '[')
                                .replace(/%5D/g, ']')
                        ).join('/');

                        const ftpUrl = `ftp://${encodedUser}:${encodedPass}@${host}:${port || 21}${encodedPath}`;
                        console.log(`[StreamProxy] Using FTP config (${host})`, ftpUrl.replace(/:[^:@]+@/, ':***@'));

                        command = ffmpeg(ftpUrl);
                    } catch (e) {
                        console.error("[StreamProxy] Failed to setup FTP for transcoding", e);
                        if (!res.headersSent) {
                            return res.status(500).send("Transcoding Setup Error");
                        } else {
                            res.end();
                        }
                        return;
                    }
                }

                if (command) {
                    const isMac = process.platform === 'darwin';

                    // Hardware Acceleration & Transcoding Options
                    // Enhanced settings for perfect A/V sync, especially on remote FTP streams
                    const inputOptions = [
                        '-fflags +genpts+discardcorrupt+igndts', // Generate PTS, discard corrupt, ignore DTS
                        '-analyzeduration 20000000',      // Analyze 20s for better stream detection
                        '-probesize 20000000',            // Read 20MB to ensure headers are valid
                        '-err_detect ignore_err',         // Be lenient with stream errors
                    ];

                    // For seeking, use accurate seek for better sync
                    if (startTime > 0) {
                        inputOptions.push('-accurate_seek'); // More accurate seeking (slower but better sync)
                    }

                    if (isMac) {
                        inputOptions.push('-hwaccel videotoolbox'); // Hardware decoding
                    }

                    const outputOptions = [
                        // MP4 Fragment Options for Streaming
                        '-movflags frag_keyframe+empty_moov+default_base_moof+faststart',
                        '-max_muxing_queue_size 9999',
                        '-reset_timestamps 1',             // Reset timestamps for clean playback
                        '-avoid_negative_ts make_zero',    // Handle negative timestamps properly

                        // Audio: Ensure Strict Sync
                        '-c:a aac',
                        '-b:a 192k',
                        '-ac 2',
                        '-ar 48000',                       // Normalize sample rate
                        '-af', 'aresample=async=1000:first_pts=0', // Audio sync correction

                        // Video: Enforce Sync
                        '-vsync cfr',                      // Constant frame rate
                        '-r 24',                           // Force 24fps output for consistency
                    ];

                    // Video Codec Selection
                    if (isMac) {
                        // MacOS Hardware Acceleration
                        outputOptions.push('-c:v h264_videotoolbox');
                        outputOptions.push('-b:v 35000k');
                        outputOptions.push('-realtime true');
                    } else {
                        // Universal Fallback (Windows/Linux)
                        outputOptions.push('-c:v libx264');
                        outputOptions.push('-preset ultrafast');
                        outputOptions.push('-tune zerolatency');
                        outputOptions.push('-b:v 35000k');
                        outputOptions.push('-maxrate 35000k');
                        outputOptions.push('-bufsize 70000k');
                    }

                    // Map specific audio track
                    if (!isNaN(audioTrack) && audioTrack >= 0) {
                        outputOptions.unshift(`-map 0:${audioTrack}`);
                        outputOptions.unshift(`-map 0:v:0`);
                    }

                    command
                        .inputOptions(inputOptions)
                        .seekInput(startTime)
                        .outputOptions(outputOptions)
                        .format('mp4')
                        .on('start', (cmd) => {
                            console.log('[StreamProxy] FFmpeg command:', cmd);
                        })
                        .on('stderr', (stderrLine) => {
                            if (stderrLine.includes('frame=') || stderrLine.includes('speed=')) {
                                console.log('[StreamProxy] FFmpeg:', stderrLine);
                            }
                        })
                        .on('error', (err) => {
                            if (err.message.includes('SIGKILL')) return;
                            console.error('[StreamProxy] FFmpeg Error:', err.message);
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

                    return;
                }
            }

            // Standard HTTP Range Stream for FTP (MP4 / Direct Play)
            let client = null;
            try {
                // Check if FTP is configured
                const allConfigs = ftpService.getAllConfigs();
                if (allConfigs.length === 0) {
                    console.error('[StreamProxy] No FTP configs available for direct streaming');
                    return res.status(503).json({
                        error: 'FTP not configured',
                        message: 'No FTP sources are configured. Please add an FTP source in settings.'
                    });
                }

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
     * Adjust VTT subtitle timestamps by subtracting the start offset
     */
    adjustSubtitleTimestamps(vttContent, offsetSeconds) {
        // Robust Regex for VTT timestamps:
        // Supports: HH:MM:SS.mmm, MM:SS.mmm, with dot or comma
        const timestampRegex = /((?:\d{2}:)?\d{2}:\d{2}(?:[.,]\d{3})?)\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}(?:[.,]\d{3})?)/g;

        const parseTime = (timeStr) => {
            const parts = timeStr.replace(',', '.').split(':');
            let seconds = 0;
            if (parts.length === 3) {
                seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
            } else if (parts.length === 2) {
                seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
            }
            return seconds;
        };

        return vttContent.replace(timestampRegex, (match, startStr, endStr) => {
            const start = parseTime(startStr);
            const end = parseTime(endStr);

            // Subtract offset
            const newStart = Math.max(0, start - offsetSeconds);
            const newEnd = Math.max(0, end - offsetSeconds);

            // Convert back to HH:MM:SS.mmm format for output
            const formatTime = (seconds) => {
                const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
                const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
                const s = (seconds % 60).toFixed(3).padStart(6, '0');
                return `${h}:${m}:${s}`;
            };

            return `${formatTime(newStart)} --> ${formatTime(newEnd)}`;
        });
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
