import React, { useRef, useState } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipBack, SkipForward, ChevronLeft, Gauge, Check, ChevronDown, Cast
} from 'lucide-react';
import { AudioMenu, SubtitleMenu } from './PlayerMenus';

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

export const PlayerControls = ({
    show,
    title,
    onBack,
    isPlaying,
    onPlayPause,
    isMuted,
    volume,
    onMuteToggle,
    onVolumeChange,
    currentTime,
    duration,
    buffered,
    onSeek,
    onSkip,
    playbackSpeed,
    onSpeedChange,
    isFullscreen,
    onFullscreenToggle,
    // Menus props
    audioTracks,
    selectedAudioTrack,
    onAudioTrackChange,
    subtitleTracks,
    selectedSubtitleTrack,
    onSubtitleTrackChange,
    // External subtitles
    externalSubtitles = [],
    selectedExternalSubtitle,
    onSelectExternalSubtitle,
    onAddExternalSubtitle,
    // Menu States
    showAudioMenu,
    setShowAudioMenu,
    showSubtitleMenu,
    setShowSubtitleMenu,
    showSpeedMenu,
    setShowSpeedMenu,
    showCastMenu,
    setShowCastMenu,
    castDevices = [],
    onCast,
    closeAllMenus
}) => {
    const progressRef = useRef(null);
    const [previewTime, setPreviewTime] = useState(null);
    const [previewPosition, setPreviewPosition] = useState(0);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

    // Progress bar handlers
    const handleProgressClick = (e) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const targetTime = pos * duration;
        onSeek(targetTime);
    };

    const handleProgressHover = (e) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const time = pos * duration;
        setPreviewTime(time);
        setPreviewPosition(e.clientX - rect.left);
    };

    // Helper for current audio name
    const currentAudioName = audioTracks.find(t => t.index === selectedAudioTrack)?.displayName?.split(' ')[0] || 'Default';

    return (
        <>
            {/* Top Bar */}
            <div className={`player-top-bar ${show ? 'visible' : ''}`}>
                <button className="back-button" onClick={onBack}>
                    <ChevronLeft size={28} />
                </button>
                <h2 className="video-title">{title}</h2>
            </div>

            {/* Bottom Controls */}
            <div className={`player-controls ${show ? 'visible' : ''}`}>
                {/* Progress Bar */}
                <div
                    ref={progressRef}
                    className="progress-container"
                    onClick={handleProgressClick}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={() => setPreviewTime(null)}
                >
                    <div
                        className="progress-buffered"
                        style={{ width: `${Math.min(100, bufferedPercent)}%` }}
                    />
                    <div
                        className="progress-played"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                    <div
                        className="progress-handle"
                        style={{ left: `${Math.min(100, progressPercent)}%` }}
                    />
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
                        <button className="control-btn" onClick={onPlayPause} title={isPlaying ? 'Pause (k)' : 'Play (k)'}>
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>

                        <button className="control-btn" onClick={() => onSkip(-10)} title="Rewind 10s (←)">
                            <SkipBack size={20} />
                        </button>

                        <button className="control-btn" onClick={() => onSkip(10)} title="Forward 10s (→)">
                            <SkipForward size={20} />
                        </button>

                        <div className="volume-control">
                            <button className="control-btn" onClick={onMuteToggle} title={isMuted ? 'Unmute (m)' : 'Mute (m)'}>
                                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                className="volume-slider"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="time-display">
                            <span>{formatTime(currentTime)}</span>
                            <span className="time-separator">/</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="controls-right">
                        {/* Speed Selector */}
                        <div className="dropdown-wrapper">
                            <button
                                className={`control-btn dropdown-btn ${showSpeedMenu ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSpeedMenu(!showSpeedMenu);
                                    setShowAudioMenu(false);
                                    setShowSubtitleMenu(false);
                                }}
                                title="Playback Speed"
                            >
                                <Gauge size={20} />
                                <span className="dropdown-label">{playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showSpeedMenu && (
                                <div className="dropdown-menu speed-menu">
                                    <div className="dropdown-header">Speed</div>
                                    {SPEED_OPTIONS.map(speed => (
                                        <button
                                            key={speed}
                                            className={`dropdown-item ${playbackSpeed === speed ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSpeedChange(speed);
                                                setShowSpeedMenu(false);
                                            }}
                                        >
                                            <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                                            {playbackSpeed === speed && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Audio Track Selector */}
                        <AudioMenu
                            show={showAudioMenu}
                            onToggle={() => {
                                setShowAudioMenu(!showAudioMenu);
                                setShowSubtitleMenu(false);
                                setShowSpeedMenu(false);
                            }}
                            tracks={audioTracks}
                            selectedTrack={selectedAudioTrack}
                            onSelect={(idx) => {
                                onAudioTrackChange(idx);
                                closeAllMenus();
                            }}
                            currentName={currentAudioName}
                        />

                        {/* Subtitle Selector */}
                        <SubtitleMenu
                            show={showSubtitleMenu}
                            onToggle={() => {
                                setShowSubtitleMenu(!showSubtitleMenu);
                                setShowAudioMenu(false);
                                setShowSpeedMenu(false);
                            }}
                            tracks={subtitleTracks}
                            selectedTrack={selectedSubtitleTrack}
                            onSelect={(idx) => {
                                onSubtitleTrackChange(idx);
                                setShowSubtitleMenu(false);
                            }}
                            externalSubtitles={externalSubtitles}
                            selectedExternalSubtitle={selectedExternalSubtitle}
                            onSelectExternal={(idx) => {
                                if (onSelectExternalSubtitle) onSelectExternalSubtitle(idx);
                                setShowSubtitleMenu(false);
                            }}
                            onAddExternal={onAddExternalSubtitle ? () => {
                                onAddExternalSubtitle();
                                setShowSubtitleMenu(false);
                            } : undefined}
                        />

                        {/* Cast Menu */}
                        <div className="dropdown-wrapper">
                            <button
                                className={`control-btn dropdown-btn ${showCastMenu ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCastMenu(!showCastMenu);
                                    setShowAudioMenu(false);
                                    setShowSubtitleMenu(false);
                                    setShowSpeedMenu(false);
                                }}
                                title="Cast to Device"
                            >
                                <Cast size={20} />
                            </button>
                            {showCastMenu && (
                                <div className="dropdown-menu cast-menu" style={{ width: '200px' }}>
                                    <div className="dropdown-header">Cast to Device</div>
                                    {castDevices.length === 0 ? (
                                        <div className="dropdown-item" style={{ cursor: 'default', opacity: 0.7 }}>
                                            <span>Scanning...</span>
                                        </div>
                                    ) : (
                                        castDevices.map(device => (
                                            <button
                                                key={device.id}
                                                className="dropdown-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCast(device);
                                                }}
                                            >
                                                <span>{device.name}</span>
                                                <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 'auto' }}>
                                                    {device.type === 'cast' ? 'Google' : 'Apple'}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen */}
                        <button className="control-btn" onClick={onFullscreenToggle} title="Fullscreen (f)">
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
