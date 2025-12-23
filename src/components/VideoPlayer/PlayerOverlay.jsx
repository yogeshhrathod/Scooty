import React from 'react';
import { Loader2, Play, Pause, RotateCcw } from 'lucide-react';

export const PlayerOverlay = ({ isLoading, error, isPlaying, onRetry }) => {
    return (
        <>
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
                        <button onClick={onRetry}>
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
        </>
    );
};
