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
    onSelect,
    externalSubtitles = [],
    selectedExternalSubtitle,
    onSelectExternal,
    onAddExternal
}) => {
    // Combine embedded and external tracks for display
    const hasAnyTracks = tracks.length > 0 || externalSubtitles.length > 0;

    if (!hasAnyTracks && !onAddExternal) return null;

    return (
        <div className="dropdown-wrapper">
            <button
                className={`control-btn dropdown-btn ${show ? 'active' : ''} ${(selectedTrack !== null || selectedExternalSubtitle !== null) ? 'has-selection' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                title="Subtitles (c)"
            >
                <Subtitles size={20} />
                <span className="dropdown-label">
                    {selectedTrack !== null || selectedExternalSubtitle !== null ? 'On' : 'Off'}
                </span>
                <ChevronDown size={14} />
            </button>
            {show && (
                <div className="dropdown-menu subtitle-menu">
                    <div className="dropdown-header">Subtitles</div>

                    {/* Off Option */}
                    <button
                        className={`dropdown-item ${selectedTrack === null && selectedExternalSubtitle === null ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(null);
                            if (onSelectExternal) onSelectExternal(null);
                        }}
                    >
                        <span>Off</span>
                        {selectedTrack === null && selectedExternalSubtitle === null && <Check size={16} />}
                    </button>

                    {/* Embedded Subtitles */}
                    {tracks.length > 0 && (
                        <>
                            <div className="dropdown-section-label">Embedded</div>
                            {tracks.map(track => (
                                <button
                                    key={track.index}
                                    className={`dropdown-item ${selectedTrack === track.index ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(track.index);
                                        if (onSelectExternal) onSelectExternal(null);
                                    }}
                                >
                                    <span>{track.displayName || `Track ${track.index}`}</span>
                                    {selectedTrack === track.index && <Check size={16} />}
                                </button>
                            ))}
                        </>
                    )}

                    {/* External Subtitles */}
                    {externalSubtitles.length > 0 && (
                        <>
                            <div className="dropdown-section-label">External</div>
                            {externalSubtitles.map((ext, idx) => (
                                <button
                                    key={`external-${idx}`}
                                    className={`dropdown-item external-sub ${selectedExternalSubtitle === idx ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(null);
                                        if (onSelectExternal) onSelectExternal(idx);
                                    }}
                                >
                                    <span>{ext.name || `External ${idx + 1}`}</span>
                                    {selectedExternalSubtitle === idx && <Check size={16} />}
                                </button>
                            ))}
                        </>
                    )}

                    {/* Add External Option */}
                    {onAddExternal && (
                        <>
                            <div className="dropdown-divider" />
                            <button
                                className="dropdown-item add-external-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddExternal();
                                }}
                            >
                                <span>+ Add External Subtitle</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
