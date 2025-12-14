import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings, Subtitles, ChevronLeft,
    Languages, Gauge, RotateCcw, X, Check, Loader2
} from 'lucide-react';
import './VideoPlayer.css';

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
    onSeek = null, // Callback for seeking (used for MKV streams)
}) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const progressRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

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

    // Settings panel state
    const [showSettings, setShowSettings] = useState(false);
    const [activeSettingsPanel, setActiveSettingsPanel] = useState('main');
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
        // If we have mediaInfo duration and it's valid, use it
        if (mediaInfo?.duration && isFinite(mediaInfo.duration) && mediaInfo.duration > 0) {
            return mediaInfo.duration;
        }
        // Otherwise use video element duration if valid
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

            // Set default audio track
            const defaultAudio = mediaInfo.audioTracks?.find(t => t.default) || mediaInfo.audioTracks?.[0];
            if (defaultAudio) {
                setSelectedAudioTrack(defaultAudio.index);
            }
        }
    }, [mediaInfo]);

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
                    if (showSettings) setShowSettings(false);
                    break;
                case 'c':
                    if (subtitleTracks.length > 0) {
                        if (selectedSubtitleTrack !== null) {
                            setSelectedSubtitleTrack(null);
                        } else {
                            setSelectedSubtitleTrack(subtitleTracks[0]?.index);
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
    }, [showSettings, selectedSubtitleTrack, subtitleTracks, effectiveCurrentTime, duration]);

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
        if (isPlaying && !showSettings) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying, showSettings]);

    useEffect(() => {
        showControlsTemporarily();
    }, [isPlaying, showSettings, showControlsTemporarily]);

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
            // For transcoded MKV streams, we need to restart the stream at the new position
            setIsSeeking(true);
            setIsLoading(true);
            setSeekOffset(clampedTime);
            setCurrentTime(0);

            // Build new stream URL with start time
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
                videoRef.current.src = newUrl;
                videoRef.current.load();
                videoRef.current.play().then(() => {
                    setIsSeeking(false);
                }).catch(err => {
                    console.error('[VideoPlayer] Seek play error:', err);
                    setIsSeeking(false);
                });
            }

            // Notify parent if callback provided
            if (onSeek) {
                onSeek(clampedTime);
            }
        } else {
            // For regular videos, just set currentTime directly
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
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const videoDur = videoRef.current.duration;
            // Only set if it's a valid finite number
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
        return `${streamBaseUrl}/subtitle?file=${encodeURIComponent(originalFilePath)}&track=${trackIndex}`;
    };

    // Calculate progress percentages
    const progressPercent = duration > 0 ? (effectiveCurrentTime / duration) * 100 : 0;
    const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

    // Render settings panels
    const renderSettingsPanel = () => {
        switch (activeSettingsPanel) {
            case 'speed':
                return (
                    <div className="settings-panel speed-panel">
                        <button className="settings-back" onClick={() => setActiveSettingsPanel('main')}>
                            <ChevronLeft size={18} />
                            <span>Playback Speed</span>
                        </button>
                        <div className="settings-options">
                            {SPEED_OPTIONS.map(speed => (
                                <button
                                    key={speed}
                                    className={`settings-option ${playbackSpeed === speed ? 'active' : ''}`}
                                    onClick={() => {
                                        setPlaybackSpeed(speed);
                                        setActiveSettingsPanel('main');
                                    }}
                                >
                                    <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                                    {playbackSpeed === speed && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'audio':
                return (
                    <div className="settings-panel audio-panel">
                        <button className="settings-back" onClick={() => setActiveSettingsPanel('main')}>
                            <ChevronLeft size={18} />
                            <span>Audio Track</span>
                        </button>
                        <div className="settings-options">
                            {audioTracks.length === 0 ? (
                                <div className="settings-empty">No audio tracks available</div>
                            ) : (
                                audioTracks.map(track => (
                                    <button
                                        key={track.index}
                                        className={`settings-option ${selectedAudioTrack === track.index ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedAudioTrack(track.index);
                                            setActiveSettingsPanel('main');
                                        }}
                                    >
                                        <span>{track.displayName || `Track ${track.index}`}</span>
                                        {selectedAudioTrack === track.index && <Check size={16} />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 'subtitles':
                return (
                    <div className="settings-panel subtitles-panel">
                        <button className="settings-back" onClick={() => setActiveSettingsPanel('main')}>
                            <ChevronLeft size={18} />
                            <span>Subtitles</span>
                        </button>
                        <div className="settings-options">
                            <button
                                className={`settings-option ${selectedSubtitleTrack === null ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedSubtitleTrack(null);
                                    setActiveSettingsPanel('main');
                                }}
                            >
                                <span>Off</span>
                                {selectedSubtitleTrack === null && <Check size={16} />}
                            </button>
                            {subtitleTracks.map(track => (
                                <button
                                    key={track.index}
                                    className={`settings-option ${selectedSubtitleTrack === track.index ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedSubtitleTrack(track.index);
                                        setActiveSettingsPanel('main');
                                    }}
                                >
                                    <span>{track.displayName || `Track ${track.index}`}</span>
                                    {selectedSubtitleTrack === track.index && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            default: // main
                return (
                    <div className="settings-panel main-panel">
                        <div className="settings-header">
                            <span>Settings</span>
                            <button className="settings-close" onClick={() => setShowSettings(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="settings-options">
                            <button
                                className="settings-option has-submenu"
                                onClick={() => setActiveSettingsPanel('speed')}
                            >
                                <Gauge size={18} />
                                <span>Playback Speed</span>
                                <span className="settings-value">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                            </button>

                            {audioTracks.length > 0 && (
                                <button
                                    className="settings-option has-submenu"
                                    onClick={() => setActiveSettingsPanel('audio')}
                                >
                                    <Languages size={18} />
                                    <span>Audio Track</span>
                                    <span className="settings-value">
                                        {audioTracks.find(t => t.index === selectedAudioTrack)?.displayName || 'Default'}
                                    </span>
                                </button>
                            )}

                            {subtitleTracks.length > 0 && (
                                <button
                                    className="settings-option has-submenu"
                                    onClick={() => setActiveSettingsPanel('subtitles')}
                                >
                                    <Subtitles size={18} />
                                    <span>Subtitles</span>
                                    <span className="settings-value">
                                        {selectedSubtitleTrack === null
                                            ? 'Off'
                                            : subtitleTracks.find(t => t.index === selectedSubtitleTrack)?.displayName || 'On'
                                        }
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div
            ref={containerRef}
            className={`video-player-container ${isFullscreen ? 'fullscreen' : ''} ${showControls ? 'controls-visible' : ''}`}
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
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

            {/* Loading Overlay */}
            {isLoading && (
                <div className="player-overlay loading-overlay">
                    <Loader2 className="spinner" size={48} />
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div className="player-overlay error-overlay">
                    <div className="error-content">
                        <p>{error}</p>
                        <button onClick={() => {
                            setError(null);
                            setIsLoading(true);
                            if (videoRef.current) {
                                videoRef.current.load();
                                videoRef.current.play();
                            }
                        }}>
                            <RotateCcw size={20} />
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Play/Pause Center Indicator */}
            {!isLoading && !error && (
                <div className={`play-indicator ${isPlaying ? 'playing' : 'paused'}`}>
                    {isPlaying ? <Pause size={64} /> : <Play size={64} />}
                </div>
            )}

            {/* Top Bar */}
            <div className={`player-top-bar ${showControls ? 'visible' : ''}`}>
                <button className="back-button" onClick={onBack}>
                    <ChevronLeft size={28} />
                </button>
                <h2 className="video-title">{title}</h2>
            </div>

            {/* Controls */}
            <div className={`player-controls ${showControls ? 'visible' : ''}`}>
                {/* Progress Bar */}
                <div
                    ref={progressRef}
                    className="progress-container"
                    onClick={handleProgressClick}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={() => setPreviewTime(null)}
                >
                    {/* Buffered */}
                    <div
                        className="progress-buffered"
                        style={{ width: `${Math.min(100, bufferedPercent)}%` }}
                    />
                    {/* Progress */}
                    <div
                        className="progress-played"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                    {/* Seek Handle */}
                    <div
                        className="progress-handle"
                        style={{ left: `${Math.min(100, progressPercent)}%` }}
                    />
                    {/* Preview Tooltip */}
                    {previewTime !== null && (
                        <div
                            className="preview-tooltip"
                            style={{ left: `${previewPosition}px` }}
                        >
                            {formatTime(previewTime)}
                        </div>
                    )}
                </div>

                {/* Controls Row */}
                <div className="controls-row">
                    {/* Left Controls */}
                    <div className="controls-left">
                        <button className="control-btn" onClick={togglePlay} title={isPlaying ? 'Pause (k)' : 'Play (k)'}>
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>

                        <button className="control-btn" onClick={() => handleSkip(-10)} title="Rewind 10s (←)">
                            <SkipBack size={20} />
                        </button>

                        <button className="control-btn" onClick={() => handleSkip(10)} title="Forward 10s (→)">
                            <SkipForward size={20} />
                        </button>

                        {/* Volume */}
                        <div className="volume-control">
                            <button className="control-btn" onClick={toggleMute} title={isMuted ? 'Unmute (m)' : 'Mute (m)'}>
                                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                className="volume-slider"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                            />
                        </div>

                        {/* Time Display */}
                        <div className="time-display">
                            <span>{formatTime(effectiveCurrentTime)}</span>
                            <span className="time-separator">/</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="controls-right">
                        {/* Speed indicator */}
                        {playbackSpeed !== 1 && (
                            <span className="speed-indicator">{playbackSpeed}x</span>
                        )}

                        {/* Quick Subtitle Toggle */}
                        {subtitleTracks.length > 0 && (
                            <button
                                className={`control-btn ${selectedSubtitleTrack !== null ? 'active' : ''}`}
                                onClick={() => {
                                    if (selectedSubtitleTrack !== null) {
                                        setSelectedSubtitleTrack(null);
                                    } else if (subtitleTracks.length > 0) {
                                        setSelectedSubtitleTrack(subtitleTracks[0].index);
                                    }
                                }}
                                title="Toggle Subtitles (c)"
                            >
                                <Subtitles size={20} />
                            </button>
                        )}

                        {/* Settings */}
                        <div className="settings-wrapper">
                            <button
                                className={`control-btn ${showSettings ? 'active' : ''}`}
                                onClick={() => {
                                    setShowSettings(!showSettings);
                                    setActiveSettingsPanel('main');
                                }}
                                title="Settings"
                            >
                                <Settings size={20} />
                            </button>

                            {showSettings && (
                                <div className="settings-dropdown">
                                    {renderSettingsPanel()}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen */}
                        <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen (f)">
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Click anywhere on settings overlay to close */}
            {showSettings && (
                <div className="settings-backdrop" onClick={() => setShowSettings(false)} />
            )}
        </div>
    );
};

export default VideoPlayer;
