import React, { useRef, useEffect } from 'react';
import { Languages, ChevronDown, Check, Subtitles } from 'lucide-react';

export const AudioMenu = ({
    show,
    onToggle,
    tracks,
    selectedTrack,
    onSelect,
    currentName
}) => {
    if (tracks.length <= 1) return null;

    return (
        <div className="dropdown-wrapper">
            <button
                className={`control-btn dropdown-btn ${show ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                title="Audio Track"
            >
                <Languages size={20} />
                <span className="dropdown-label">{currentName}</span>
                <ChevronDown size={14} />
            </button>
            {show && (
                <div className="dropdown-menu">
                    <div className="dropdown-header">Audio Track</div>
                    {tracks.map(track => (
                        <button
                            key={track.index}
                            className={`dropdown-item ${selectedTrack === track.index ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(track.index);
                            }}
                        >
                            <span>{track.displayName || `Track ${track.index}`}</span>
                            {selectedTrack === track.index && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const SubtitleMenu = ({
    show,
    onToggle,
    tracks,
    selectedTrack,
    onSelect
}) => {
    if (tracks.length === 0) return null;

    return (
        <div className="dropdown-wrapper">
            <button
                className={`control-btn dropdown-btn ${show ? 'active' : ''} ${selectedTrack !== null ? 'has-selection' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                title="Subtitles (c)"
            >
                <Subtitles size={20} />
                <span className="dropdown-label">{selectedTrack !== null ? 'On' : 'Off'}</span>
                <ChevronDown size={14} />
            </button>
            {show && (
                <div className="dropdown-menu subtitle-menu">
                    <div className="dropdown-header">Subtitles</div>
                    <button
                        className={`dropdown-item ${selectedTrack === null ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(null);
                        }}
                    >
                        <span>Off</span>
                        {selectedTrack === null && <Check size={16} />}
                    </button>
                    {tracks.map(track => (
                        <button
                            key={track.index}
                            className={`dropdown-item ${selectedTrack === track.index ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(track.index);
                            }}
                        >
                            <span>{track.displayName || `Track ${track.index}`}</span>
                            {selectedTrack === track.index && <Check size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
