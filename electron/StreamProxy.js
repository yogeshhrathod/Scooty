const express = require('express');
const portfinder = require('portfinder');
const cors = require('cors');
const textMime = require('mime-types');
const path = require('path');
const fs = require('fs');

// FFmpeg setup
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Fix for electron dev/prod path issues if needed, but usually valid
ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));

const ftpService = require('./FtpService');

class StreamProxy {
    constructor() {
        this.app = express();
        this.server = null;
        this.port = null;

        this.app.use(cors());

        this.app.get('/stream', async (req, res) => {
            const filePath = req.query.file;
            const startTime = parseFloat(req.query.start || 0);

            if (!filePath) {
                return res.status(400).send("Missing file path");
            }

            console.log(`[StreamProxy] Requesting: ${filePath}, Start: ${startTime}`);

            // Detect Type
            const mimeType = textMime.lookup(filePath) || 'video/mp4';
            const isMkv = mimeType === 'video/x-matroska' || filePath.toLowerCase().endsWith('.mkv');

            if (isMkv) {
                // FFmpeg Transcoding Stream (Remux to MP4)
                console.log(`[StreamProxy] DETECTED MKV: ${filePath}`);

                // Debug: Print file existence
                if (fs.existsSync(filePath)) {
                    console.log(`[StreamProxy] File exists locally: ${filePath}`);
                } else {
                    console.log(`[StreamProxy] File NOT found locally: ${filePath}`);
                }

                res.writeHead(200, {
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*',
                    // 'Transfer-Encoding': 'chunked' // Express does this automatically
                });

                // Source Handling: Local vs FTP
                // For now, assume Local File Path if it starts with / or drive letter
                // To support FTP input for FFmpeg, we'd need to pipe the FTP stream INTO ffmpeg.
                // Converting FTP stream -> FFmpeg -> HTTP Response

                let command;

                // Check if file exists locally
                if (fs.existsSync(filePath)) {
                    command = ffmpeg(filePath);
                } else {
                    // It's likely an FTP path that we need to stream?
                    // FFmpeg can't read internal FTP paths directly unless we mount it or use a URL.
                    // But we don't have an FTP URL with creds exposed easily.
                    // Complex Case: FTP -> StreamProxy (Passthrough) -> FFmpeg (Pipe) -> Response
                    // Simplification: For now, if it's not local, we might fail the transcoding 
                    // unless we create a readable stream from FTP and pass it to ffmpeg.
                    // `fluent - ffmpeg` accepts a Readable Stream.

                    try {
                        const { PassThrough } = require('stream');
                        const pt = new PassThrough();

                        // We need a dedicated client for the FTP download to avoid blocking
                        const streamClient = await ftpService.createStreamClient();

                        // Start download to the Passthrough
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
                    command
                        .seekInput(startTime) // accurate seeking
                        .outputOptions([
                            '-movflags frag_keyframe+empty_moov', // fragmented mp4 for streaming
                            '-c:v copy', // copy video (fast)
                            '-c:a aac',  // transcode audio to aac (safe for web)
                            '-b:a 192k'
                        ])
                        .format('mp4')
                        .on('error', (err) => {
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
                }
                return;
            }

            // Standard HTTP Range Stream (MP4 / Direct Play)
            // Create a dedicated client for this stream to support concurrent streams/seeking without blocking
            let client = null;
            try {
                // We utilize the helper in FtpService to spawn a new authenticated client
                client = await ftpService.createStreamClient();

                // Get file size first
                const size = await client.size(filePath);

                // Handle Range Header
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

                // Start download from offset
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
}

module.exports = new StreamProxy();
