import React from 'react';
import ReactPlayer from 'react-player';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const Player = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // In a real app, resolve 'id' (or path) to a playable URL.
    // Since this is a specialized electron app for local files, we might play directly from file:// path.
    // Or if it's an HTTP stream (FTP proxy), use localhost URL.

    // For demo/mock:
    // If id has http, use it. If it's a file path, we might need a custom protocol or just raw file (electron supports it with webSecurity: false usually).

    const url = decodeURIComponent(id);
    const isMock = id === 'mock' || !id;
    const playUrl = isMock ? 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' : url;

    return (
        <div className="w-screen h-screen bg-black relative">
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>

            <ReactPlayer
                url={playUrl}
                width="100%"
                height="100%"
                controls={true}
                playing={true}
                config={{
                    file: {
                        forceHLS: true,
                    }
                }}
            />
        </div>
    );
};
