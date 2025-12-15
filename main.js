const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hidden', // Allows full custom header styling
        trafficLightPosition: { x: 20, y: 20 }, // Adjust traffic lights on Mac
        frame: false, // For Windows/Linux custom controls
        backgroundColor: '#000000',
        icon: path.join(__dirname, 'public/logo.png'), // Set App Icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For easier local file access in demo
            webSecurity: false, // Allow local file loading
        },
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;
    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

const ftpService = require('./electron/FtpService');
const streamProxy = require('./electron/StreamProxy');
const mediaInfoService = require('./electron/MediaInfoService');

// Start Proxy
let proxyPort = null;
app.whenReady().then(async () => {
    proxyPort = await streamProxy.start();
});

// IPC Handler for getting media info
ipcMain.handle('get-media-info', async (event, filePath) => {
    try {
        const info = await mediaInfoService.getMediaInfo(filePath);

        // Add display names to tracks
        info.audioTracks = info.audioTracks.map(track => ({
            ...track,
            displayName: mediaInfoService.getTrackDisplayName(track),
        }));

        info.subtitleTracks = info.subtitleTracks.map(track => ({
            ...track,
            displayName: mediaInfoService.getTrackDisplayName(track),
        }));

        return info;
    } catch (e) {
        console.error('Error getting media info:', e);
        throw e;
    }
});

// IPC Handlers for Local File Access
ipcMain.handle('open-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections']
    });
    if (result.canceled) return null;
    return result.filePaths;
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
    try {
        const files = await scanDir(dirPath);
        return files;
    } catch (e) {
        console.error(e);
        return [];
    }
});

// IPC Handlers for FTP
ipcMain.handle('ftp-scan', async (event, config) => {
    console.log("Connecting to FTP...", config.host);
    try {
        await ftpService.connect(config);
        const files = await ftpService.scanDir("/");
        return files;
    } catch (e) {
        console.error("FTP Scan Error:", e);
        throw e;
    }
});

// Get the base URL for streaming
ipcMain.handle('get-stream-url', () => {
    return `http://localhost:${proxyPort}`;
});

async function scanDir(dir, depth = 0) {
    let results = [];
    const indent = '  '.repeat(depth);

    try {
        const list = fs.readdirSync(dir);
        console.log(`${indent}[Scan] Scanning: ${dir} (${list.length} items)`);

        for (const file of list) {
            // Skip hidden files/folders (optional, remove if you want to include them)
            if (file.startsWith('.')) continue;

            try {
                const filePath = path.resolve(dir, file);
                const stat = fs.statSync(filePath);

                if (stat && stat.isDirectory()) {
                    // Recursively scan subdirectories
                    const nestedFiles = await scanDir(filePath, depth + 1);
                    results = results.concat(nestedFiles);
                } else if (stat && stat.isFile()) {
                    // Check for video extensions
                    if (/\.(mkv|mp4|avi|mov|wmv|m4v|webm|flv|m2ts|ts)$/i.test(file)) {
                        console.log(`${indent}  [Found] ${file}`);
                        results.push({
                            name: file,
                            path: filePath,
                            size: stat.size,
                            type: 'video'
                        });
                    }
                }
            } catch (fileErr) {
                console.warn(`${indent}  [Skip] ${file}: ${fileErr.message}`);
            }
        }
    } catch (dirErr) {
        console.error(`[Scan Error] Cannot read directory ${dir}: ${dirErr.message}`);
    }

    if (depth === 0) {
        console.log(`[Scan Complete] Found ${results.length} media files in ${dir}`);
    }

    return results;
}

// Custom Window Controls
ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('window-maximize-toggle', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized();
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
