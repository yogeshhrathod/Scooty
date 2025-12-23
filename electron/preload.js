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
                'open-external'
            ];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, ...args);
            }
            return Promise.reject(new Error(`Invalid IPC channel: ${channel}`));
        },
        // If we need on/send later, add them here with validation
    }
});
