const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, ...args) => {
            const validChannels = [
                'ftp-scan',
                'ftp-test',
                'ftp-restore-config',
                'get-stream-url',
                'open-directory',
                'scan-directory',
                'open-file',
                'get-media-info',
                'window-minimize',
                'window-maximize-toggle',
                'window-close',
                'window-is-maximized',
                'open-external',
                'cast-play',
                'cast-stop',
                'start-resync'
            ];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, ...args);
            }
            return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
        },
        on: (channel, func) => {
            const validChannels = ['cast-devices-update', 'resync-complete'];
            if (validChannels.includes(channel)) {
                // Strip event as it includes sender
                ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
            }
        },
        once: (channel, func) => {
            const validChannels = ['cast-devices-update', 'resync-complete'];
            if (validChannels.includes(channel)) {
                ipcRenderer.once(channel, (event, ...args) => func(event, ...args));
            }
        },
        removeListener: (channel, func) => {
            // Note: simple removeListener won't work perfectly across context bridge with wrapped functions
            // But if we pass the exact same func reference from renderer (and don't wrap in preload multiple times inconsistentl) it implies we trust direct passing or we need a map.
            // For now, let's just expose removeAllListeners for specific channel as it's safer for React cleanup
            if (['cast-devices-update', 'resync-complete'].includes(channel)) {
                ipcRenderer.removeAllListeners(channel);
            }
        },
        send: (channel, ...args) => {
            const validChannels = ['cast-scan-start', 'cast-scan-stop'];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, ...args);
            }
        }
    }
});
