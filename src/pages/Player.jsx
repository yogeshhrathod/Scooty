import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadingAnimation from '../assets/loading.lottie?url';
import { VideoPlayer } from '../components/VideoPlayer';
import { useStore } from '../store/useStore';
import { WindowControls } from '../components/WindowControls';
import { useAnalytics } from '../hooks/useAnalytics'; // Import hook

// Check if we're in Electron environment
const isElectron = typeof window !== 'undefined' && window.electron;
const ipcRenderer = isElectron ? window.electron.ipcRenderer : null;

export const Player = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { trackVideoPlay, trackVideoError } = useAnalytics();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [streamUrl, setStreamUrl] = useState('');
    const [streamBaseUrl, setStreamBaseUrl] = useState('');
    const [mediaInfo, setMediaInfo] = useState(null);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState(null);

    // Track if we've initialized to prevent re-runs
    const initializedRef = useRef(false);

    // Decode the file path from URL
    const filePath = decodeURIComponent(id || '');
    const title = searchParams.get('title') || filePath.split('/').pop() || 'Video';
    const isMock = id === 'mock' || !id;

    // Store integration - Split selectors to avoid infinite loop
    const updateHistory = useStore(state => state.updateHistory);
    const history = useStore(state => state.history);
    const library = useStore(state => state.library);

    const historyItem = history[filePath];

    // Find the library item to get sourceId for FTP
    const libraryItem = library.find(item => item.path === filePath);

    // Initialize player (runs once)
    useEffect(() => {
        // Prevent double initialization (React StrictMode)
        if (initializedRef.current) return;
        initializedRef.current = true;

        const initializePlayer = async () => {
            if (isMock) {
                // For demo/mock, use a sample HLS stream
                setStreamUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
                setIsLoading(false);
                trackVideoPlay('Mock Video');
                return;
            }

            if (!isElectron) {
                // Fallback for browser testing (non-Electron)
                setStreamUrl(filePath);
                setIsLoading(false);
                trackVideoPlay(title);
                return;
            }

            try {
                // Get the stream proxy base URL
                const baseUrl = await ipcRenderer.invoke('get-stream-url');
                setStreamBaseUrl(baseUrl);

                // Check if it's an MKV file
                const isMkv = filePath.toLowerCase().endsWith('.mkv');

                // Get media info for all video files (duration, audio tracks, subtitles)
                let info = null;
                let defaultAudioTrackIndex = null;

                try {
                    info = await ipcRenderer.invoke('get-media-info', filePath);
                    setMediaInfo(info);
                    console.log('[Player] Media info:', info);

                    // Find default audio track
                    // Priority: Previous History Selection > Default Flag > First Track
                    if (historyItem?.audioTrack !== undefined) {
                        defaultAudioTrackIndex = historyItem.audioTrack;
                        setSelectedAudioTrack(defaultAudioTrackIndex);
                    } else {
                        const defaultAudio = info.audioTracks?.find(t => t.default) || info.audioTracks?.[0];
                        if (defaultAudio) {
                            defaultAudioTrackIndex = defaultAudio.index;
                            setSelectedAudioTrack(defaultAudioTrackIndex);
                        }
                    }
                } catch (infoErr) {
                    console.warn('[Player] Could not get media info:', infoErr);
                    // Continue anyway - we can still play the file
                }

                // Build the stream URL
                let url;
                if (isMkv) {
                    // MKV files go through the stream proxy for transcoding
                    const streamParams = new URLSearchParams({
                        file: filePath,
                    });

                    // Pass sourceId for multi-FTP source support
                    if (libraryItem?.sourceId) {
                        streamParams.append('sourceId', libraryItem.sourceId);
                    }

                    // Use the default audio track we just found
                    if (defaultAudioTrackIndex !== null && defaultAudioTrackIndex !== undefined) {
                        streamParams.append('audio', defaultAudioTrackIndex);
                    }

                    // Append start parameter to ensure transcoding starts from the correct time
                    if (historyItem?.progress > 0) {
                        streamParams.append('start', historyItem.progress.toString());
                    }

                    url = `${baseUrl}/stream?${streamParams.toString()}`;
                } else {
                    // Use Stream Proxy for EVERYTHING to bypass secure renderer file:// restrictions
                    // StreamProxy handles both local files (via fs) and remote (via FTP streaming)
                    const streamParams = new URLSearchParams({
                        file: filePath,
                    });
                    // Pass sourceId for multi-FTP source support
                    if (libraryItem?.sourceId) {
                        streamParams.append('sourceId', libraryItem.sourceId);
                    }
                    url = `${baseUrl}/stream?${streamParams.toString()}`;
                }

                console.log('[Player] Stream URL:', url);
                setStreamUrl(url);
                trackVideoPlay(title); // Track successful play start

            } catch (err) {
                console.error('[Player] Initialization error:', err);
                setError(err.message || 'Failed to initialize player');
                trackVideoError(err.message || 'Failed to initialize player');
            } finally {
                setIsLoading(false);
            }
        };

        initializePlayer();
    }, [filePath, isMock, historyItem, trackVideoPlay, trackVideoError]); // Depend on historyItem to get correct start settings

    // Handle back navigation
    const handleBack = () => {
        navigate(-1);
    };

    // Store updates
    const handleProgress = useCallback((time, duration) => {
        // Save progress every 5 seconds or so? 
        // For now, let's just save. Zustand is fast. 
        // Ideally we debounce this. 
        updateHistory(filePath, { progress: time, duration });
    }, [filePath, updateHistory]);

    const handleSettingsChange = useCallback((settings) => {
        updateHistory(filePath, settings);
    }, [filePath, updateHistory]);

    // Loading state
    if (isLoading) {
        return (
            <div className="w-screen h-screen bg-black flex items-center justify-center relative">
                <button
                    onClick={handleBack}
                    className="absolute flex items-center justify-center w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-110 z-50"
                    style={{ top: '3.5rem', left: '1.5rem' }}
                    title="Go Back"
                >
                    <ChevronLeft size={28} />
                </button>
                <div className="flex flex-col items-center gap-4">
                    <DotLottieReact
                        src={loadingAnimation}
                        loop
                        autoplay
                        style={{ width: 300, height: 300 }}
                    />
                    <p className="text-white/70 text-sm">Loading media...</p>
                </div>
                <WindowControls className="absolute top-4 right-4 z-50" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="w-screen h-screen bg-black flex items-center justify-center relative">
                <div className="flex flex-col items-center gap-4 text-center px-8">
                    <p className="text-red-400 text-lg">{error}</p>
                    <button
                        onClick={handleBack}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        Go Back
                    </button>
                </div>
                <WindowControls className="absolute top-4 right-4 z-50" />
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-black relative">
            <WindowControls className="absolute top-4 right-4 z-50" />
            <VideoPlayer
                src={streamUrl}
                title={title}
                onBack={handleBack}
                autoPlay={true}
                mediaInfo={mediaInfo}
                streamBaseUrl={streamBaseUrl}
                originalFilePath={filePath}
                startTime={historyItem?.progress || 0}
                initialAudioTrack={historyItem?.audioTrack}
                initialSubtitleTrack={historyItem?.subtitleTrack}
                onProgress={handleProgress}
                onSettingsChange={handleSettingsChange}
            />
        </div>
    );
};

export default Player;
