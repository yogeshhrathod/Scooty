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
        this.activeCommands = new Set(); // Track active FFmpeg commands for cleanup

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
        // GET /subtitles/search - Search for subtitles using OpenSubtitles REST API
        // Uses the legacy REST API which doesn't require authentication
        // =====================================
        this.app.get('/subtitles/search', async (req, res) => {
            const { query, imdb_id, languages = 'eng', season, episode } = req.query;

            if (!query && !imdb_id) {
                return res.status(400).json({ error: 'Missing search query or imdb_id' });
            }

            try {
                const fetch = (await import('node-fetch')).default;

                // Build search URL for legacy REST API
                // Format: https://rest.opensubtitles.org/search/{params}
                let searchPath = '';

                if (imdb_id) {
                    // Search by IMDB ID (remove 'tt' prefix if present)
                    const imdbNum = imdb_id.replace(/^tt/, '');
                    searchPath = `imdbid-${imdbNum}`;
                } else {
                    // Search by query
                    searchPath = `query-${encodeURIComponent(query.toLowerCase().replace(/\s+/g, ' '))}`;
                }

                // Add language filter (skip if 'all' is selected)
                if (languages && languages !== 'all') {
                    searchPath += `/sublanguageid-${languages}`;
                }

                // Add season/episode for TV shows
                if (season) searchPath += `/season-${season}`;
                if (episode) searchPath += `/episode-${episode}`;

                const searchUrl = `https://rest.opensubtitles.org/search/${searchPath}`;
                console.log('[StreamProxy] Searching subtitles:', searchUrl);

                const response = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Scooty v1.0',
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[StreamProxy] OpenSubtitles search error:', response.status, errorText);
                    throw new Error(`OpenSubtitles API error: ${response.status}`);
                }

                const data = await response.json();

                // Transform results for frontend (legacy API format)
                const results = (Array.isArray(data) ? data : []).slice(0, 50).map(item => ({
                    id: item.IDSubtitle,
                    file_id: item.IDSubtitleFile,
                    language: item.ISO639,
                    language_name: item.LanguageName,
                    release: item.MovieReleaseName || item.SubFileName,
                    download_count: parseInt(item.SubDownloadsCnt) || 0,
                    ratings: parseFloat(item.SubRating) || 0,
                    uploader: item.UserNickName || '',
                    feature: item.MovieName,
                    year: item.MovieYear,
                    hearing_impaired: item.SubHearingImpaired === '1',
                    format: item.SubFormat,
                    download_url: item.SubDownloadLink,
                    zip_url: item.ZipDownloadLink,
                    from_trusted: item.SubFromTrusted === '1',
                    movie_kind: item.MovieKind,
                    encoding: item.SubEncoding
                }));

                console.log(`[StreamProxy] Found ${results.length} subtitles`);
                res.json({ results, total: results.length });
            } catch (err) {
                console.error('[StreamProxy] Subtitle search error:', err.message);
                res.status(500).json({ error: err.message });
            }
        });

        // =====================================
        // GET /subtitles/download - Download subtitle from OpenSubtitles
        // Uses zip download URL which works without authentication
        // =====================================
        this.app.get('/subtitles/download', async (req, res) => {
            const { zip_url, subtitle_id, download_url, file_id } = req.query;
            const startTime = parseFloat(req.query.start || 0);

            if (!zip_url && !subtitle_id && !download_url && !file_id) {
                return res.status(400).json({ error: 'Missing zip_url, subtitle_id, download_url, or file_id' });
            }

            try {
                const fetch = (await import('node-fetch')).default;
                const AdmZip = require('adm-zip');
                const zlib = require('zlib');

                // Construct URL - prefer zip_url, then subtitle_id, then gzipped file_id
                let subtitleUrl;
                let isZipFile = false;

                if (zip_url) {
                    subtitleUrl = zip_url;
                    isZipFile = true;
                } else if (subtitle_id) {
                    subtitleUrl = `https://dl.opensubtitles.org/en/download/sub/${subtitle_id}`;
                    isZipFile = true;
                } else if (download_url) {
                    subtitleUrl = download_url;
                } else {
                    subtitleUrl = `https://dl.opensubtitles.org/en/download/filead/${file_id}`;
                }

                console.log('[StreamProxy] Downloading subtitle from:', subtitleUrl);

                // Fetch the subtitle file
                const subtitleResponse = await fetch(subtitleUrl, {
                    headers: {
                        'User-Agent': 'Scooty v1.0',
                        'Accept': '*/*'
                    }
                });

                if (!subtitleResponse.ok) {
                    throw new Error(`Failed to download subtitle: ${subtitleResponse.status}`);
                }

                // Get the buffer
                const buffer = await subtitleResponse.buffer();
                let content;

                if (isZipFile) {
                    // Extract from ZIP
                    try {
                        const zip = new AdmZip(buffer);
                        const entries = zip.getEntries();

                        // Find the first subtitle file
                        const subtitleEntry = entries.find(entry =>
                            !entry.isDirectory &&
                            /\.(srt|vtt|ass|ssa|sub)$/i.test(entry.name)
                        );

                        if (!subtitleEntry) {
                            throw new Error('No subtitle file found in ZIP');
                        }

                        content = subtitleEntry.getData().toString('utf-8');
                        console.log('[StreamProxy] Extracted', subtitleEntry.name, 'from ZIP, length:', content.length);
                    } catch (zipErr) {
                        console.error('[StreamProxy] ZIP extraction error:', zipErr.message);
                        // Maybe it's gzipped instead?
                        try {
                            const decompressed = zlib.gunzipSync(buffer);
                            content = decompressed.toString('utf-8');
                        } catch (e) {
                            content = buffer.toString('utf-8');
                        }
                    }
                } else {
                    // Try gzip decompression
                    try {
                        const decompressed = zlib.gunzipSync(buffer);
                        content = decompressed.toString('utf-8');
                    } catch (e) {
                        content = buffer.toString('utf-8');
                    }
                }

                console.log('[StreamProxy] Downloaded subtitle, length:', content.length);

                // Convert to VTT format
                content = this.convertToVtt(content);

                // Adjust timestamps if seeking
                if (startTime > 0) {
                    content = this.adjustSubtitleTimestamps(content, startTime);
                }

                res.setHeader('Content-Type', 'text/vtt');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.send(content);
            } catch (err) {
                console.error('[StreamProxy] Subtitle download error:', err.message);
                res.status(500).json({ error: err.message });
            }
        });

        // =====================================
        // GET /external-subtitle - Fetch and serve external subtitle from URL
        // Supports SRT, VTT, ASS/SSA formats and converts to VTT
        // =====================================
        this.app.get('/external-subtitle', async (req, res) => {
            const subtitleUrl = req.query.url;
            const startTime = parseFloat(req.query.start || 0);

            if (!subtitleUrl) {
                return res.status(400).send('Missing subtitle URL parameter');
            }

            try {
                console.log('[StreamProxy] Fetching external subtitle from:', subtitleUrl);

                // Fetch the subtitle content
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(subtitleUrl, {
                    headers: {
                        'User-Agent': 'Scooty/1.0'
                    },
                    timeout: 30000
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch subtitle: ${response.status} ${response.statusText}`);
                }

                let content = await response.text();
                console.log('[StreamProxy] Fetched subtitle, length:', content.length);

                // Detect and convert format
                content = this.convertToVtt(content);

                // Adjust timestamps if seeking
                if (startTime > 0) {
                    content = this.adjustSubtitleTimestamps(content, startTime);
                }

                res.setHeader('Content-Type', 'text/vtt');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.send(content);
            } catch (err) {
                console.error('[StreamProxy] External subtitle fetch error:', err.message);
                res.status(500).send('External subtitle fetch failed: ' + err.message);
            }
        });

        // =====================================
        // POST /parse-subtitle - Parse uploaded/pasted subtitle content
        // =====================================
        this.app.post('/parse-subtitle', express.text({ limit: '10mb', type: '*/*' }), async (req, res) => {
            const startTime = parseFloat(req.query.start || 0);
            let content = req.body;

            if (!content) {
                return res.status(400).send('Missing subtitle content');
            }

            try {
                console.log('[StreamProxy] Parsing pasted subtitle, length:', content.length);

                // Convert to VTT format
                content = this.convertToVtt(content);

                // Adjust timestamps if seeking
                if (startTime > 0) {
                    content = this.adjustSubtitleTimestamps(content, startTime);
                }

                res.setHeader('Content-Type', 'text/vtt');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.send(content);
            } catch (err) {
                console.error('[StreamProxy] Subtitle parse error:', err.message);
                res.status(500).send('Subtitle parse failed: ' + err.message);
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
            const sourceId = req.query.sourceId; // FTP source identifier for multi-source support

            if (!filePath) {
                return res.status(400).send("Missing file path");
            }

            console.log(`[StreamProxy] Requesting: ${filePath}, Start: ${startTime}, Audio: ${audioTrack}, SourceId: ${sourceId || 'none'}`);

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

                        // Use sourceId to find the correct config, fallback to first config
                        let activeConfig = null;
                        if (sourceId) {
                            activeConfig = ftpService.getConfigById(sourceId);
                            if (activeConfig) {
                                console.log(`[StreamProxy] Using FTP config by sourceId: ${sourceId} -> ${activeConfig.host}`);
                            } else {
                                console.warn(`[StreamProxy] sourceId ${sourceId} not found, falling back to first config`);
                            }
                        }

                        // Fallback to first config if sourceId not provided or not found
                        if (!activeConfig) {
                            activeConfig = allConfigs[0];
                            console.log(`[StreamProxy] Using fallback FTP config: ${activeConfig.host}`);
                        }

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
                            this.trackCommand(command);
                        })
                        .on('stderr', (stderrLine) => {
                            if (stderrLine.includes('frame=') || stderrLine.includes('speed=')) {
                                console.log('[StreamProxy] FFmpeg:', stderrLine);
                            }
                        })
                        .on('error', (err) => {
                            if (err.message.includes('SIGKILL') || err.message.includes('SIGTERM')) return;
                            console.error('[StreamProxy] FFmpeg Error:', err.message);
                            this.activeCommands.delete(command);
                            if (!res.headersSent) {
                                res.status(500).send("Transcoding Error: " + err.message);
                            } else {
                                res.end();
                            }
                        })
                        .on('end', () => {
                            console.log('[StreamProxy] Transcoding finished');
                            this.activeCommands.delete(command);
                        })
                        .pipe(res, { end: true });

                    // Handle client disconnect - graceful SIGTERM first, then SIGKILL
                    req.on('close', () => {
                        console.log('[StreamProxy] Client disconnected, stopping ffmpeg gracefully...');
                        this.killCommand(command);
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

                client = await ftpService.createStreamClient({ sourceId });
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
                    'Access-Control-Allow-Origin': '*',
                };

                res.writeHead(206, head);
                fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': mimeType,
                    'Accept-Ranges': 'bytes',
                    'Access-Control-Allow-Origin': '*',
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
     * Convert various subtitle formats (SRT, ASS/SSA) to WebVTT
     */
    convertToVtt(content) {
        // Remove BOM if present
        content = content.replace(/^\uFEFF/, '');

        // Detect format
        const trimmedContent = content.trim();

        // Check if already VTT
        if (trimmedContent.startsWith('WEBVTT')) {
            return content;
        }

        // Check if ASS/SSA format
        if (trimmedContent.includes('[Script Info]') || trimmedContent.includes('Dialogue:')) {
            return this.convertAssToVtt(content);
        }

        // Assume SRT format
        return this.convertSrtToVtt(content);
    }

    /**
     * Convert SRT subtitle format to WebVTT
     */
    convertSrtToVtt(srtContent) {
        let vtt = 'WEBVTT\n\n';

        // Split by double newlines (subtitle blocks)
        const blocks = srtContent.split(/\r?\n\r?\n/);

        for (const block of blocks) {
            const lines = block.trim().split(/\r?\n/);
            if (lines.length < 2) continue;

            // Find the timing line (contains -->)
            let timingLineIndex = lines.findIndex(line => line.includes('-->'));
            if (timingLineIndex === -1) continue;

            // Convert timing format: 00:00:00,000 --> 00:00:00,000 to VTT format
            let timing = lines[timingLineIndex];
            // Replace comma with dot for milliseconds
            timing = timing.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

            // Get subtitle text (everything after timing line)
            const text = lines.slice(timingLineIndex + 1).join('\n');

            if (text) {
                vtt += `${timing}\n${text}\n\n`;
            }
        }

        return vtt;
    }

    /**
     * Convert ASS/SSA subtitle format to WebVTT
     */
    convertAssToVtt(assContent) {
        let vtt = 'WEBVTT\n\n';

        // Extract dialogue lines
        const lines = assContent.split(/\r?\n/);

        for (const line of lines) {
            if (!line.startsWith('Dialogue:')) continue;

            // Format: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
            const match = line.match(/Dialogue:\s*\d+,([^,]+),([^,]+),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.+)/);
            if (!match) continue;

            const [, start, end, text] = match;

            // Convert ASS time format (H:MM:SS.cc) to VTT (HH:MM:SS.mmm)
            const convertTime = (assTime) => {
                const parts = assTime.split(':');
                if (parts.length !== 3) return assTime;

                const h = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const s = parts[2].replace('.', ':').split(':');
                const sec = s[0].padStart(2, '0');
                const ms = ((parseInt(s[1] || '0') / 100) * 1000).toFixed(0).padStart(3, '0');

                return `${h}:${m}:${sec}.${ms}`;
            };

            // Clean up ASS formatting codes
            let cleanText = text
                .replace(/\\N/g, '\n')  // Line breaks
                .replace(/\\n/g, '\n')
                .replace(/\{[^}]*\}/g, '')  // Remove style tags like {\an8}
                .trim();

            if (cleanText) {
                vtt += `${convertTime(start)} --> ${convertTime(end)}\n${cleanText}\n\n`;
            }
        }

        return vtt;
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
     * Kill an FFmpeg command gracefully
     * Tries SIGTERM first, then SIGKILL after timeout
     */
    killCommand(command) {
        if (!command) return;

        this.activeCommands.delete(command);

        try {
            // Try graceful termination first
            command.kill('SIGTERM');

            // Force kill after 2 seconds if still running
            setTimeout(() => {
                try {
                    command.kill('SIGKILL');
                } catch (e) {
                    // Already terminated, ignore
                }
            }, 2000);
        } catch (e) {
            // Process already terminated
            console.log('[StreamProxy] FFmpeg process already terminated');
        }
    }

    /**
     * Track an active FFmpeg command
     */
    trackCommand(command) {
        this.activeCommands.add(command);
    }

    /**
     * Clean up cached subtitle files and active FFmpeg processes
     */
    cleanup() {
        console.log(`[StreamProxy] Cleanup: ${this.subtitleCache.size} subtitles, ${this.activeCommands.size} active commands`);

        // Kill all active FFmpeg commands
        for (const command of this.activeCommands) {
            this.killCommand(command);
        }
        this.activeCommands.clear();

        // Clean up subtitle cache
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
