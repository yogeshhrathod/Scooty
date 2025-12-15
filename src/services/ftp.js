const { ipcRenderer } = window.require('electron');

export const ftpService = {
    async scan(config) {
        try {
            const files = await ipcRenderer.invoke('ftp-scan', config);
            return files;
        } catch (e) {
            console.error("FTP Scan failed", e);
            throw e;
        }
    },

    async test(config) {
        try {
            return await ipcRenderer.invoke('ftp-test', config);
        } catch (e) {
            console.error("FTP Test failed", e);
            throw e;
        }
    },

    async getStreamUrlBase() {
        return await ipcRenderer.invoke('get-stream-url');
    }
};
