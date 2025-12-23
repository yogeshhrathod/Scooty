import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings, Subtitles, ChevronLeft,
    Languages, Gauge, RotateCcw, X, Check, Loader2, ChevronDown
} from 'lucide-react';
import './VideoPlayer.css';
import { PlayerOverlay } from './PlayerOverlay';
import { PlayerControls } from './PlayerControls';
import { AudioMenu, SubtitleMenu } from './PlayerMenus';

// Playback speed options
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Format time helper
const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoPlayer = ({
    src,
    title = 'Video',
    onBack,
    autoPlay = true,
    startTime = 0,
    mediaInfo = null,
    streamBaseUrl = '',
    originalFilePath = '',
    onSeek = null,
    onProgress = null,
    onSettingsChange = null,
    initialAudioTrack = null,
    initialSubtitleTrack = null,
}) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const progressRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const seekOffsetRef = useRef(startTime); // Ref to always have current seekOffset
    const currentTimeRef = useRef(0); // Ref to always have current video time

    // Player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSeeking, setIsSeeking] = useState(false);

    // For MKV streaming: track the base seek offset
    const [seekOffset, setSeekOffset] = useState(startTime);
    const [isTranscodedStream, setIsTranscodedStream] = useState(false);

    // Dropdown states
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Track state
    const [audioTracks, setAudioTracks] = useState([]);
    const [subtitleTracks, setSubtitleTracks] = useState([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState(null);
    const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState(null);

    // Preview tooltip state
    const [previewTime, setPreviewTime] = useState(null);
    const [previewPosition, setPreviewPosition] = useState(0);

    // Determine the effective duration (from mediaInfo for MKV, or from video element)
    const duration = useCallback(() => {
        if (mediaInfo?.duration && isFinite(mediaInfo.duration) && mediaInfo.duration > 0) {
            return mediaInfo.duration;
        }
        if (isFinite(videoDuration) && videoDuration > 0) {
            return videoDuration;
        }
        return 0;
    }, [mediaInfo?.duration, videoDuration])();

    // Effective current time for transcoded streams
    const effectiveCurrentTime = isTranscodedStream
        ? seekOffset + currentTime
        : currentTime;

    // Detect if this is a transcoded MKV stream
    useEffect(() => {
        const isMkv = originalFilePath?.toLowerCase().endsWith('.mkv');
        setIsTranscodedStream(isMkv && !!streamBaseUrl);
    }, [originalFilePath, streamBaseUrl]);

    // Initialize media info from props
    useEffect(() => {
        if (mediaInfo) {
            setAudioTracks(mediaInfo.audioTracks || []);
            setSubtitleTracks(mediaInfo.subtitleTracks || []);

            // Handle Audio Track Selection
            if (initialAudioTrack !== null && initialAudioTrack !== undefined) {
                setSelectedAudioTrack(initialAudioTrack);
            } else {
                const defaultAudio = mediaInfo.audioTracks?.find(t => t.default) || mediaInfo.audioTracks?.[0];
                if (defaultAudio) {
                    setSelectedAudioTrack(defaultAudio.index);
                }
            }

            // Handle Subtitle Track Selection
            if (initialSubtitleTrack !== null && initialSubtitleTrack !== undefined) {
                setSelectedSubtitleTrack(initialSubtitleTrack);
            }
        }
    }, [mediaInfo, initialAudioTrack, initialSubtitleTrack]);

    // Activate/deactivate subtitle tracks when selection changes
    useEffect(() => {
        if (!videoRef.current) return;

        let retryCount = 0;
        const MAX_RETRIES = 10;

        const activateSubtitles = () => {
            const video = videoRef.current;
            if (!video) return;

            const textTracks = video.textTracks;
            if (!textTracks || textTracks.length === 0) {
                // Retry after a short delay if tracks aren't loaded yet
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    setTimeout(activateSubtitles, 100);
                } else {
                    console.warn('[VideoPlayer] Subtitle tracks failed to load after', MAX_RETRIES, 'attempts');
                }
                return;
            }

            console.log('[VideoPlayer] Activating subtitles, selected:', selectedSubtitleTrack, 'available tracks:', textTracks.length);

            for (let i = 0; i < textTracks.length; i++) {
                const track = textTracks[i];
                console.log(`[VideoPlayer] Track ${i}: label="${track.label}", mode="${track.mode}"`);

                if (selectedSubtitleTrack !== null) {
                    // Try multiple matching strategies
                    const matchingSubtitle = subtitleTracks.find(st => {
                        // Match by label
                        if (st.displayName === track.label) return true;
                        // Match by track index in label
                        if (track.label.includes(`${st.index}`)) return true;
                        // Match by position if labels don't work
                        if (i === subtitleTracks.findIndex(s => s.index === st.index)) return true;
                        return false;
                    });

                    if (matchingSubtitle && matchingSubtitle.index === selectedSubtitleTrack) {
                        track.mode = 'showing';
                        console.log('[VideoPlayer] ✓ Showing subtitle track:', track.label);
                    } else {
                        track.mode = 'hidden';
                    }
                } else {
                    track.mode = 'hidden';
                }
            }
        };

        activateSubtitles();
    }, [selectedSubtitleTrack, subtitleTracks]);

    // Close all dropdowns
    const closeAllMenus = () => {
        setShowSpeedMenu(false);
        setShowAudioMenu(false);
        setShowSubtitleMenu(false);
    };

    // Handle audio track change - immediately reload stream
    const handleAudioTrackChange = useCallback((trackIndex) => {
        if (trackIndex === selectedAudioTrack) return;

        setSelectedAudioTrack(trackIndex);
        if (onSettingsChange) onSettingsChange({ audioTrack: trackIndex });
        closeAllMenus();

        if (isTranscodedStream && streamBaseUrl && originalFilePath) {
            // For transcoded streams, reload with new audio track
            setIsLoading(true);

            // Read current time from ref, with fallback to video element
            let videoCurrentTime = currentTimeRef.current;
            // If ref is 0 but video has progressed, read from element (happens if onTimeUpdate hasn't fired)
            if (videoCurrentTime === 0 && videoRef.current) {
                videoCurrentTime = videoRef.current.currentTime;
            }
            const currentPos = seekOffsetRef.current + videoCurrentTime;

            console.log('[VideoPlayer] Audio change - videoTime:', videoCurrentTime, 'seekOffsetRef:', seekOffsetRef.current, 'currentPos:', currentPos);

            const streamParams = new URLSearchParams({
                file: originalFilePath,
                start: currentPos.toString(),
                audio: trackIndex.toString(),
            });

            const newUrl = `${streamBaseUrl}/stream?${streamParams.toString()}`;
            console.log('[VideoPlayer] Changing audio track, new URL:', newUrl);

            // Reset seek offset to current position
            seekOffsetRef.current = currentPos;
            setSeekOffset(currentPos);
            setCurrentTime(0);

            if (videoRef.current) {
                const video = videoRef.current;

                // Wait for canplaythrough before playing
                const handleCanPlayThrough = () => {
                    setIsLoading(false);
                    video.play().catch(err => {
                        console.error('[VideoPlayer] Audio change play error:', err);
                        setIsLoading(false);
                    });
                    video.removeEventListener('canplaythrough', handleCanPlayThrough);
                };

                const handleLoadError = (e) => {
                    console.error('[VideoPlayer] Audio change load error:', e);
                    setIsLoading(false);
                    video.removeEventListener('error', handleLoadError);
                };

                video.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
                video.addEventListener('error', handleLoadError, { once: true });

                video.src = newUrl;
                video.load();
            }
        }
    }, [selectedAudioTrack, isTranscodedStream, streamBaseUrl, originalFilePath]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleSkip(-10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleSkip(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    changeVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    changeVolume(-0.1);
                    break;
                case 'm':
                    toggleMute();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'Escape':
                    closeAllMenus();
                    break;
                case 'c':
                    if (subtitleTracks.length > 0) {
                        if (selectedSubtitleTrack !== null) {
                            setSelectedSubtitleTrack(null);
                            if (onSettingsChange) onSettingsChange({ subtitleTrack: null });
                        } else {
                            const firstTrack = subtitleTracks[0]?.index;
                            setSelectedSubtitleTrack(firstTrack);
                            if (onSettingsChange) onSettingsChange({ subtitleTrack: firstTrack });
                        }
                    }
                    break;
                default:
                    if (e.key >= '1' && e.key <= '4') {
                        const speeds = [1, 1.25, 1.5, 2];
                        setPlaybackSpeed(speeds[parseInt(e.key) - 1]);
                    }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSubtitleTrack, subtitleTracks, effectiveCurrentTime, duration]);

    // Apply playback speed
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    // Controls visibility
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying && !showSpeedMenu && !showAudioMenu && !showSubtitleMenu) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying, showSpeedMenu, showAudioMenu, showSubtitleMenu]);

    useEffect(() => {
        showControlsTemporarily();
    }, [isPlaying, showSpeedMenu, showAudioMenu, showSubtitleMenu, showControlsTemporarily]);

    // Player actions
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const changeVolume = (delta) => {
        const newVolume = Math.max(0, Math.min(1, volume + delta));
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            if (newVolume === 0) {
                setIsMuted(true);
                videoRef.current.muted = true;
            } else if (isMuted) {
                setIsMuted(false);
                videoRef.current.muted = false;
            }
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            if (newVolume === 0) {
                setIsMuted(true);
            } else {
                setIsMuted(false);
                videoRef.current.muted = false;
            }
        }
    };

    // Handle seeking for transcoded streams
    const seekToTime = useCallback((targetTime) => {
        if (!duration || targetTime < 0) return;

        const clampedTime = Math.max(0, Math.min(duration, targetTime));

        if (isTranscodedStream && streamBaseUrl && originalFilePath) {
            setIsSeeking(true);
            setIsLoading(true);
            seekOffsetRef.current = clampedTime;
            setSeekOffset(clampedTime);
            setCurrentTime(0);

            const streamParams = new URLSearchParams({
                file: originalFilePath,
                start: clampedTime.toString(),
            });

            if (selectedAudioTrack !== null && selectedAudioTrack !== undefined) {
                streamParams.append('audio', selectedAudioTrack);
            }

            const newUrl = `${streamBaseUrl}/stream?${streamParams.toString()}`;
            console.log('[VideoPlayer] Seeking to', clampedTime, 'new URL:', newUrl);

            if (videoRef.current) {
                const video = videoRef.current;

                // Start playing as soon as we can (don't wait for full buffer)
                const handleCanPlaySeek = () => {
                    setIsSeeking(false);
                    setIsLoading(false);
                    video.play().catch(err => console.error('[VideoPlayer] Seek play error:', err));
                    video.removeEventListener('canplay', handleCanPlaySeek);
                };

                video.addEventListener('canplay', handleCanPlaySeek, { once: true });
                video.src = newUrl;
                video.load();
            }

            if (onSeek) {
                onSeek(clampedTime);
            }
        } else {
            if (videoRef.current) {
                videoRef.current.currentTime = clampedTime;
            }
        }
    }, [duration, isTranscodedStream, streamBaseUrl, originalFilePath, selectedAudioTrack, onSeek]);

    const handleSkip = (seconds) => {
        seekToTime(effectiveCurrentTime + seconds);
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!isFullscreen) {
                if (containerRef.current.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                } else if (containerRef.current.webkitRequestFullscreen) {
                    await containerRef.current.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    // Fullscreen change handler
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Progress bar handlers
    const handleProgressClick = (e) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const targetTime = pos * duration;
        seekToTime(targetTime);
    };

    const handleProgressHover = (e) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const time = pos * duration;
        setPreviewTime(time);
        setPreviewPosition(e.clientX - rect.left);
    };

    // Video event handlers
    const handleTimeUpdate = () => {
        if (videoRef.current && !isSeeking) {
            const time = videoRef.current.currentTime;
            currentTimeRef.current = time;
            setCurrentTime(time);
            if (onProgress) {
                onProgress(isTranscodedStream ? seekOffset + time : time, duration);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const videoDur = videoRef.current.duration;
            if (isFinite(videoDur) && videoDur > 0) {
                setVideoDuration(videoDur);
            }
            if (startTime > 0 && !isTranscodedStream) {
                videoRef.current.currentTime = startTime;
            }
        }
        setIsLoading(false);
    };

    const handleProgress = () => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
            try {
                const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
                setBuffered(bufferedEnd + (isTranscodedStream ? seekOffset : 0));
            } catch (e) {
                // Ignore buffered errors
            }
        }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = (e) => {
        console.error('Video error:', e);
        setError('Failed to load video. Please try again.');
        setIsLoading(false);
    };

    // Generate subtitle track URL
    const getSubtitleUrl = (trackIndex) => {
        if (!streamBaseUrl || !originalFilePath) return null;
        return `${streamBaseUrl}/subtitle?file=${encodeURIComponent(originalFilePath)}&track=${trackIndex}&start=${seekOffset}`;
    };

    // Calculate progress percentages
    const progressPercent = duration > 0 ? (effectiveCurrentTime / duration) * 100 : 0;
    const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

    // Get current track display names
    const currentAudioName = audioTracks.find(t => t.index === selectedAudioTrack)?.displayName || 'Default';
    const currentSubtitleName = selectedSubtitleTrack === null
        ? 'Off'
        : subtitleTracks.find(t => t.index === selectedSubtitleTrack)?.displayName || 'On';

    return (
        <div
            ref={containerRef}
            className={`video-player-container ${isFullscreen ? 'fullscreen' : ''} ${showControls ? 'controls-visible' : ''}`}
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && !showAudioMenu && !showSubtitleMenu && !showSpeedMenu && setShowControls(false)}
            onClick={(e) => {
                // Close menus when clicking outside
                if (!e.target.closest('.dropdown-wrapper')) {
                    closeAllMenus();
                }
            }}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="video-element"
                src={src}
                autoPlay={autoPlay}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onProgress={handleProgress}
                onPlay={handlePlay}
                onPause={handlePause}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
                onCanPlay={handleCanPlay}
                onError={handleError}
            >
                {/* Subtitle tracks */}
                {subtitleTracks.map(track => (
                    <track
                        key={track.index}
                        kind="subtitles"
                        label={track.displayName || `Track ${track.index}`}
                        srcLang={track.language || 'en'}
                        src={getSubtitleUrl(track.index)}
                        default={selectedSubtitleTrack === track.index}
                    />
                ))}
            </video>

            <PlayerOverlay
                isLoading={isLoading}
                error={error}
                isPlaying={isPlaying}
                onRetry={() => {
                    setError(null);
                    setIsLoading(true);
                    if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play();
                    }
                }}
            />

            <PlayerControls
                show={showControls || isLoading || !!error}
                title={title}
                onBack={onBack}
                isPlaying={isPlaying}
                onPlayPause={togglePlay}
                isMuted={isMuted}
                volume={volume}
                onMuteToggle={toggleMute}
                onVolumeChange={changeVolume}
                currentTime={effectiveCurrentTime}
                duration={duration}
                buffered={buffered}
                onSeek={seekToTime}
                onSkip={handleSkip}
                playbackSpeed={playbackSpeed}
                onSpeedChange={setPlaybackSpeed}
                isFullscreen={isFullscreen}
                onFullscreenToggle={toggleFullscreen}

                audioTracks={audioTracks}
                selectedAudioTrack={selectedAudioTrack}
                onAudioTrackChange={handleAudioTrackChange}

                subtitleTracks={subtitleTracks}
                selectedSubtitleTrack={selectedSubtitleTrack}
                onSubtitleTrackChange={(idx) => {
                    setSelectedSubtitleTrack(idx);
                    if (onSettingsChange) onSettingsChange({ subtitleTrack: idx });
                }}

                showAudioMenu={showAudioMenu}
                setShowAudioMenu={setShowAudioMenu}
                showSubtitleMenu={showSubtitleMenu}
                setShowSubtitleMenu={setShowSubtitleMenu}
                showSpeedMenu={showSpeedMenu}
                setShowSpeedMenu={setShowSpeedMenu}
                closeAllMenus={closeAllMenus}
            />

        </div>
    );
};

export default VideoPlayer;
