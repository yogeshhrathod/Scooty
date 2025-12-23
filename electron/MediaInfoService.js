/**
 * MediaInfoService - Extracts media information using FFprobe
 * Provides track information (audio, video, subtitles) for advanced player functionality
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');
const ftpService = require('./FtpService');

// Get paths (handle asar packaging for Electron)
const ffmpegPath = ffmpegInstaller.path.replace('app.asar', 'app.asar.unpacked');
const ffprobePath = ffprobeInstaller.path.replace('app.asar', 'app.asar.unpacked');

console.log('[MediaInfo] FFmpeg path:', ffmpegPath);
console.log('[MediaInfo] FFprobe path:', ffprobePath);

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class MediaInfoService {
    /**
     * Get detailed media information including all tracks
     * @param {string} filePath - Path to the media file
     * @returns {Promise<Object>} Media information with tracks
     */
    async getMediaInfo(filePath) {
        return new Promise((resolve, reject) => {
            let probePath = filePath;

            // Check if it's a local file
            if (!fs.existsSync(filePath)) {
                // If not local, check if we have FTP credentials
                if (ftpService.config) {
                    const { user, password, host, port } = ftpService.config;
                    const encodedUser = encodeURIComponent(user);
                    const encodedPass = encodeURIComponent(password);

                    // Ensure path starts with /
                    const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
                    // Split by / and encode each segment to handle spaces/special chars
                    // Split by / and encode each segment, but restore brackets which are common in file naming
                    const encodedPath = cleanPath.split('/').map(segment =>
                        encodeURIComponent(segment)
                            .replace(/%5B/g, '[')
                            .replace(/%5D/g, ']')
                    ).join('/');

                    probePath = `ftp://${encodedUser}:${encodedPass}@${host}:${port || 21}${encodedPath}`;
                    console.log('[MediaInfo] Probing remote file via FTP');
                }
            }

            ffmpeg.ffprobe(probePath, (err, metadata) => {
                if (err) {
                    console.error('[MediaInfo] FFprobe error:', err.message);
                    reject(err);
                    return;
                }

                const info = {
                    duration: metadata.format?.duration || 0,
                    size: metadata.format?.size || 0,
                    bitrate: metadata.format?.bit_rate || 0,
                    format: metadata.format?.format_name || 'unknown',
                    videoTracks: [],
                    audioTracks: [],
                    subtitleTracks: [],
                };

                if (metadata.streams) {
                    metadata.streams.forEach((stream, index) => {
                        const commonInfo = {
                            index: stream.index,
                            codec: stream.codec_name,
                            codecLong: stream.codec_long_name,
                            language: stream.tags?.language || 'und',
                            title: stream.tags?.title || `Track ${stream.index}`,
                            default: stream.disposition?.default === 1,
                            forced: stream.disposition?.forced === 1,
                        };

                        switch (stream.codec_type) {
                            case 'video':
                                info.videoTracks.push({
                                    ...commonInfo,
                                    width: stream.width,
                                    height: stream.height,
                                    frameRate: stream.r_frame_rate,
                                    bitrate: stream.bit_rate,
                                    pixelFormat: stream.pix_fmt,
                                    aspectRatio: stream.display_aspect_ratio,
                                });
                                break;
                            case 'audio':
                                info.audioTracks.push({
                                    ...commonInfo,
                                    channels: stream.channels,
                                    sampleRate: stream.sample_rate,
                                    bitrate: stream.bit_rate,
                                    channelLayout: stream.channel_layout,
                                });
                                break;
                            case 'subtitle':
                                info.subtitleTracks.push({
                                    ...commonInfo,
                                    type: this.getSubtitleType(stream.codec_name),
                                });
                                break;
                        }
                    });
                }

                console.log('[MediaInfo] Parsed info for:', path.basename(filePath));
                console.log(`  - Duration: ${info.duration}s`);
                console.log(`  - ${info.videoTracks.length} video tracks`);
                console.log(`  - ${info.audioTracks.length} audio tracks:`);
                info.audioTracks.forEach(t => console.log(`    - Audio track index ${t.index}: ${t.language} ${t.codec}`));
                console.log(`  - ${info.subtitleTracks.length} subtitle tracks`);

                resolve(info);
            });
        });
    }

    /**
     * Get subtitle type category
     */
    getSubtitleType(codec) {
        const textSubs = ['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text'];
        const imageSubs = ['dvd_subtitle', 'hdmv_pgs_subtitle', 'dvb_subtitle', 'xsub'];

        if (textSubs.includes(codec)) return 'text';
        if (imageSubs.includes(codec)) return 'image';
        return 'unknown';
    }

    /**
     * Extract a subtitle track to WebVTT format
     * @param {string} filePath - Path to the media file
     * @param {number} trackIndex - Subtitle track index
     * @returns {Promise<string>} Path to the extracted VTT file
     */
    async extractSubtitle(filePath, trackIndex) {
        const os = require('os');
        const fs = require('fs');

        // Create a temp file for the subtitle
        const tempDir = path.join(os.tmpdir(), 'scooty-subs');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const outputPath = path.join(tempDir, `sub_${Date.now()}_${trackIndex}.vtt`);

        // Determine input path - handle FTP files
        let inputPath = filePath;
        if (!fs.existsSync(filePath)) {
            // If not local, check if we have FTP credentials
            if (ftpService.config) {
                const { user, password, host, port } = ftpService.config;
                const encodedUser = encodeURIComponent(user);
                const encodedPass = encodeURIComponent(password);

                // Ensure path starts with /
                const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
                // Split by / and encode each segment to handle spaces/special chars
                // Split by / and encode each segment, but restore brackets
                const encodedPath = cleanPath.split('/').map(segment =>
                    encodeURIComponent(segment)
                        .replace(/%5B/g, '[')
                        .replace(/%5D/g, ']')
                ).join('/');

                inputPath = `ftp://${encodedUser}:${encodedPass}@${host}:${port || 21}${encodedPath}`;
                console.log('[MediaInfo] Extracting subtitle from remote FTP file');
            }
        }

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    `-map 0:${trackIndex}`,
                ])
                .output(outputPath)
                .on('start', (cmd) => {
                    console.log('[MediaInfo] Extracting subtitle with command:', cmd.replace(/:[^:@]+@/, ':***@')); // Mask password
                })
                .on('error', (err) => {
                    console.error('[MediaInfo] Subtitle extraction error:', err.message);
                    reject(err);
                })
                .on('end', () => {
                    console.log('[MediaInfo] Subtitle extracted to:', outputPath);
                    resolve(outputPath);
                })
                .run();
        });
    }

    /**
     * Get the display name for an audio/subtitle track
     */
    getTrackDisplayName(track) {
        const languageMap = {
            'und': 'Unknown',
            'eng': 'English',
            'spa': 'Spanish',
            'fre': 'French',
            'fra': 'French',
            'ger': 'German',
            'deu': 'German',
            'ita': 'Italian',
            'por': 'Portuguese',
            'rus': 'Russian',
            'jpn': 'Japanese',
            'kor': 'Korean',
            'chi': 'Chinese',
            'zho': 'Chinese',
            'hin': 'Hindi',
            'ara': 'Arabic',
        };

        let name = languageMap[track.language] || track.language?.toUpperCase() || 'Unknown';

        if (track.title && track.title !== `Track ${track.index}`) {
            name = track.title;
        }

        if (track.default) name += ' (Default)';
        if (track.forced) name += ' (Forced)';

        if (track.channels) {
            const channelLabel = track.channels === 6 ? '5.1' :
                track.channels === 8 ? '7.1' :
                    track.channels === 2 ? 'Stereo' :
                        track.channels === 1 ? 'Mono' : `${track.channels}ch`;
            name += ` - ${channelLabel}`;
        }

        if (track.codec) {
            name += ` (${track.codec.toUpperCase()})`;
        }

        return name;
    }
    /**
     * Cleanup all temporary subtitle files
     */
    cleanupTempFiles() {
        const os = require('os');
        const fs = require('fs');
        const tempDir = path.join(os.tmpdir(), 'scooty-subs');

        if (fs.existsSync(tempDir)) {
            try {
                console.log('[MediaInfo] Cleaning up temp directory:', tempDir);
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (err) {
                console.error('[MediaInfo] Failed to cleanup temp dir:', err.message);
            }
        }
    }
}

module.exports = new MediaInfoService();
