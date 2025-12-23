import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, Settings, Subtitles, ChevronLeft,
    Languages, Gauge, RotateCcw, X, Check, Loader2, ChevronDown
} from 'lucide-react';
import './VideoPlayer.css';
import { PlayerOverlay } from './PlayerOverlay';
import { PlayerControls } from './PlayerControls';
import { AudioMenu, SubtitleMenu } from './PlayerMenus';
import { ExternalSubtitleDialog } from './ExternalSubtitleDialog';

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

    // External subtitle state
    const [externalSubtitles, setExternalSubtitles] = useState([]);
    const [selectedExternalSubtitle, setSelectedExternalSubtitle] = useState(null);
    const [showExternalSubtitleDialog, setShowExternalSubtitleDialog] = useState(false);

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

            // Map subtitle track indices to their position in the video.textTracks list
            // The textTracks order corresponds to the order of <track> elements in the DOM
            for (let i = 0; i < textTracks.length; i++) {
                const track = textTracks[i];

                // Skip external tracks (they're handled separately)
                if (track.kind === 'subtitles' && !track.label.includes('External')) {
                    // Find the corresponding subtitle track by index position
                    const correspondingTrack = subtitleTracks[i];

                    if (selectedSubtitleTrack !== null && correspondingTrack && correspondingTrack.index === selectedSubtitleTrack) {
                        track.mode = 'showing';
                        console.log('[VideoPlayer] ✓ Showing subtitle track:', i, track.label);
                    } else {
                        track.mode = 'hidden';
                    }
                } else {
                    // External tracks or other kinds - hide unless explicitly selected via external subtitle system
                    if (selectedExternalSubtitle === null) {
                        track.mode = 'hidden';
                    }
                }
            }
        };

        activateSubtitles();
    }, [selectedSubtitleTrack, subtitleTracks, selectedExternalSubtitle]);

    // Handle external subtitle selection - inject into video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Remove any existing external tracks
        const existingTracks = video.querySelectorAll('track.external-subtitle');
        existingTracks.forEach(t => t.remove());

        // If an external subtitle is selected, add it
        if (selectedExternalSubtitle !== null && externalSubtitles[selectedExternalSubtitle]) {
            const ext = externalSubtitles[selectedExternalSubtitle];
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = ext.name;
            track.srclang = 'en';
            track.src = ext.url;
            track.default = true;
            track.className = 'external-subtitle';
            video.appendChild(track);

            // Wait for track to load and activate it
            track.addEventListener('load', () => {
                if (video.textTracks.length > 0) {
                    // Hide all tracks first
                    for (let i = 0; i < video.textTracks.length; i++) {
                        video.textTracks[i].mode = 'hidden';
                    }
                    // Show the external track (should be the last one)
                    video.textTracks[video.textTracks.length - 1].mode = 'showing';
                }
            });
        }
    }, [selectedExternalSubtitle, externalSubtitles]);

    // Load external subtitle from URL
    const loadExternalSubtitleUrl = useCallback(async (url, providedDisplayName = null) => {
        if (!streamBaseUrl) {
            throw new Error('Stream proxy not available');
        }

        let subtitleUrl = url;
        let displayName = providedDisplayName;

        // Check if this is already a proxy URL (from search download)
        if (!url.startsWith(streamBaseUrl)) {
            // Use our proxy to fetch and convert the subtitle
            subtitleUrl = `${streamBaseUrl}/external-subtitle?url=${encodeURIComponent(url)}&start=${seekOffset}`;
        }

        // Test if the URL is accessible
        const testResponse = await fetch(subtitleUrl);
        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            throw new Error(errorText || 'Failed to load subtitle');
        }

        // Extract filename from URL for display name if not provided
        if (!displayName) {
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1].split('?')[0] || 'External Subtitle';
            displayName = decodeURIComponent(filename).replace(/\.[^.]+$/, '');
        }

        // Add to external subtitles list
        const newSubtitle = {
            name: displayName,
            url: subtitleUrl,
            originalUrl: url
        };

        setExternalSubtitles(prev => {
            // Check if already exists
            const exists = prev.findIndex(s => s.url === subtitleUrl);
            if (exists !== -1) {
                setTimeout(() => setSelectedExternalSubtitle(exists), 0);
                return prev;
            }
            const newList = [...prev, newSubtitle];
            setTimeout(() => setSelectedExternalSubtitle(newList.length - 1), 0);
            return newList;
        });

        // Save to local storage for persistence
        if (originalFilePath) {
            try {
                const key = `scooty_ext_sub_${originalFilePath}`;
                localStorage.setItem(key, JSON.stringify(newSubtitle));
            } catch (e) {
                console.warn('Failed to save subtitle preference', e);
            }
        }

        setSelectedSubtitleTrack(null); // Deselect embedded track
        setShowExternalSubtitleDialog(false);
        closeAllMenus();
    }, [streamBaseUrl, seekOffset, originalFilePath]);

    // Restore persisted external subtitle
    useEffect(() => {
        if (!streamBaseUrl || !originalFilePath) return;

        const key = `scooty_ext_sub_${originalFilePath}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);

                // Fix potential port changes if the stream proxy port changed since save
                let url = parsed.url;
                if (url && url.includes('localhost:') && streamBaseUrl) {
                    const urlObj = new URL(url);
                    const currentObj = new URL(streamBaseUrl);
                    // Only update if port differs
                    if (urlObj.port !== currentObj.port) {
                        urlObj.protocol = currentObj.protocol;
                        urlObj.host = currentObj.host;
                        url = urlObj.toString();
                    }
                }

                const restoredSubtitle = { ...parsed, url };

                setExternalSubtitles(prev => {
                    const idx = prev.findIndex(p => p.url === url);
                    if (idx !== -1) {
                        // Already exists, select it
                        setTimeout(() => {
                            setSelectedExternalSubtitle(idx);
                            setSelectedSubtitleTrack(null);
                        }, 0);
                        return prev;
                    }
                    // Add new
                    const newList = [...prev, restoredSubtitle];
                    setTimeout(() => {
                        setSelectedExternalSubtitle(newList.length - 1);
                        setSelectedSubtitleTrack(null);
                    }, 0);
                    return newList;
                });
            }
        } catch (e) {
            console.error("Failed to restore saved subtitle", e);
        }
    }, [streamBaseUrl, originalFilePath]);

    // Load external subtitle from file content
    const loadExternalSubtitleFile = useCallback(async (content, filename) => {
        if (!streamBaseUrl) {
            throw new Error('Stream proxy not available');
        }

        // Send content to proxy for parsing
        const proxyUrl = `${streamBaseUrl}/parse-subtitle?start=${seekOffset}`;
        const response = await fetch(proxyUrl, {
            method: 'POST',
            body: content,
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to parse subtitle');
        }

        const vttContent = await response.text();

        // Create a blob URL for the VTT content
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        const blobUrl = URL.createObjectURL(blob);

        // Extract display name from filename
        const displayName = filename.replace(/\.[^.]+$/, '');

        // Add to external subtitles list
        const newSubtitle = {
            name: displayName,
            url: blobUrl,
            isBlob: true
        };

        setExternalSubtitles(prev => [...prev, newSubtitle]);
        setSelectedExternalSubtitle(externalSubtitles.length);
        setSelectedSubtitleTrack(null); // Deselect embedded track
        setShowExternalSubtitleDialog(false);
        closeAllMenus();
    }, [streamBaseUrl, seekOffset, externalSubtitles.length]);

    // Handle external subtitle selection
    const handleSelectExternalSubtitle = useCallback((idx) => {
        setSelectedExternalSubtitle(idx);
        if (idx !== null) {
            setSelectedSubtitleTrack(null); // Deselect embedded when selecting external
        }
    }, []);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            externalSubtitles.forEach(sub => {
                if (sub.isBlob) {
                    URL.revokeObjectURL(sub.url);
                }
            });
        };
    }, [externalSubtitles]);

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
                    if (subtitleTracks.length > 0 || externalSubtitles.length > 0) {
                        if (selectedSubtitleTrack !== null || selectedExternalSubtitle !== null) {
                            setSelectedSubtitleTrack(null);
                            setSelectedExternalSubtitle(null);
                            if (onSettingsChange) onSettingsChange({ subtitleTrack: null });
                        } else if (externalSubtitles.length > 0) {
                            setSelectedExternalSubtitle(0);
                            setSelectedSubtitleTrack(null);
                        } else {
                            const firstTrack = subtitleTracks[0]?.index;
                            setSelectedSubtitleTrack(firstTrack);
                            if (onSettingsChange) onSettingsChange({ subtitleTrack: firstTrack });
                        }
                    }
                    break;
                case 'u':
                    // Open external subtitle dialog
                    e.preventDefault();
                    setShowExternalSubtitleDialog(true);
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

    // Video event handlers - debounce progress callback to reduce store updates
    const lastProgressCallRef = useRef(0);
    const PROGRESS_DEBOUNCE_MS = 3000; // Only update store every 3 seconds

    const handleTimeUpdate = () => {
        if (videoRef.current && !isSeeking) {
            const time = videoRef.current.currentTime;
            currentTimeRef.current = time;
            setCurrentTime(time);

            // Debounce onProgress callback to reduce store writes
            if (onProgress) {
                const now = Date.now();
                if (now - lastProgressCallRef.current >= PROGRESS_DEBOUNCE_MS) {
                    lastProgressCallRef.current = now;
                    onProgress(isTranscodedStream ? seekOffset + time : time, duration);
                }
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
                crossOrigin="anonymous"
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
                    setSelectedExternalSubtitle(null); // Deselect external when selecting embedded
                    if (onSettingsChange) onSettingsChange({ subtitleTrack: idx });
                }}

                externalSubtitles={externalSubtitles}
                selectedExternalSubtitle={selectedExternalSubtitle}
                onSelectExternalSubtitle={handleSelectExternalSubtitle}
                onAddExternalSubtitle={() => setShowExternalSubtitleDialog(true)}

                showAudioMenu={showAudioMenu}
                setShowAudioMenu={setShowAudioMenu}
                showSubtitleMenu={showSubtitleMenu}
                setShowSubtitleMenu={setShowSubtitleMenu}
                showSpeedMenu={showSpeedMenu}
                setShowSpeedMenu={setShowSpeedMenu}
                closeAllMenus={closeAllMenus}
            />

            {/* External Subtitle Dialog */}
            <ExternalSubtitleDialog
                show={showExternalSubtitleDialog}
                onClose={() => setShowExternalSubtitleDialog(false)}
                onLoadUrl={loadExternalSubtitleUrl}
                onLoadFile={loadExternalSubtitleFile}
                streamBaseUrl={streamBaseUrl}
                videoTitle={title}
            />

        </div>
    );
};

export default VideoPlayer;
