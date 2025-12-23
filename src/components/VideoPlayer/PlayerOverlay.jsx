import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadingAnimation from '../../assets/loading.lottie?url';

export const PlayerOverlay = ({ isLoading, error, isPlaying, onRetry }) => {
    return (
        <>
            {/* Loading Overlay */}
            {isLoading && (
                <div className="player-overlay loading-overlay">
                    <DotLottieReact
                        src={loadingAnimation}
                        loop
                        autoplay
                        style={{ width: 300, height: 300 }}
                    />
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
