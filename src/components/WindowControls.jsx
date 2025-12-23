import React from 'react';
import { isMac } from '../lib/platform';

export const WindowControls = ({ className }) => {
    if (isMac) return null;

    const handleMinimize = () => {
        if (window.electron) {
            window.electron.ipcRenderer.invoke('window-minimize');
        }
    };

    const handleMaximize = () => {
        if (window.electron) {
            window.electron.ipcRenderer.invoke('window-maximize-toggle');
        }
    };

    const handleClose = () => {
        if (window.electron) {
            window.electron.ipcRenderer.invoke('window-close');
        }
    };

    return (
        <div className={`flex items-center gap-3 ${className || ''}`} style={{ WebkitAppRegion: 'no-drag' }}>
            <button onClick={handleMinimize} className="p-2 hover:bg-white/10 rounded-full transition-colors group" title="Minimize">
                <div className="w-3 h-0.5 bg-white group-hover:bg-primary" />
            </button>
            <button onClick={handleMaximize} className="p-2 hover:bg-white/10 rounded-full transition-colors group" title="Maximize">
                <div className="w-3 h-3 border border-white group-hover:border-primary" />
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-red-500/20 rounded-full transition-colors group" title="Close">
                <div className="relative w-3 h-3">
                    <div className="absolute inset-0 rotate-45 bg-white group-hover:bg-red-500 h-[1px] top-1.5" />
                    <div className="absolute inset-0 -rotate-45 bg-white group-hover:bg-red-500 h-[1px] top-1.5" />
                </div>
            </button>
        </div>
    );
};
