const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

const isDev = !!process.env.ELECTRON_START_URL;
const iconPath = isDev
    ? path.join(__dirname, 'public/logo.png')
    : path.join(__dirname, 'dist/logo.png');

if (process.platform === 'win32') {
    app.setAppUserModelId('com.sparkvault.scooty');
}
app.setName('Scooty');

function createWindow() {
    log.info('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Scooty',
        titleBarStyle: 'hidden', // Allows full custom header styling
        trafficLightPosition: { x: 15, y: 15 }, // Adjust traffic lights on Mac
        frame: false, // For Windows/Linux custom controls
        backgroundColor: '#000000',
        icon: iconPath, // Set App Icon
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            preload: path.join(__dirname, 'electron/preload.js'),
        },
    });

    if (process.env.ELECTRON_START_URL) {
        log.info(`Loading URL from dev server: ${process.env.ELECTRON_START_URL}`);
        mainWindow.loadURL(process.env.ELECTRON_START_URL);
    } else {
        const indexPath = path.join(__dirname, 'dist/index.html');
        log.info(`Loading file: ${indexPath}`);
        mainWindow.loadFile(indexPath);
    }

    mainWindow.on('closed', function () {
        log.info('Main window closed');
        mainWindow = null;
    });

    // Check for updates
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
    }
}

const ftpService = require('./electron/FtpService');
const streamProxy = require('./electron/StreamProxy');
const mediaInfoService = require('./electron/MediaInfoService');
const castService = require('./electron/CastService');

// Start Proxy
let proxyPort = null;
app.whenReady().then(async () => {
    log.info('App is ready');
    try {
        proxyPort = await streamProxy.start();
        log.info(`Stream proxy started on port ${proxyPort}`);
    } catch (error) {
        log.error('Failed to start stream proxy:', error);
    }
});

// IPC Handler for getting media info
ipcMain.handle('get-media-info', async (event, filePath) => {
    log.info(`Getting media info for: ${filePath}`);
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
        log.error('Error getting media info:', e);
        throw e;
    }
});

// IPC Handlers for Local File Access
ipcMain.handle('open-directory', async () => {
    log.info('Opening directory dialog');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('open-file', async () => {
    log.info('Opening file dialog');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections']
    });
    if (result.canceled) return null;
    return result.filePaths;
});

ipcMain.handle('scan-directory', async (event, dirPath) => {
    log.info(`Scanning directory: ${dirPath}`);
    try {
        const files = await scanDir(dirPath);
        return files;
    } catch (e) {
        log.error('Error scanning directory:', e);
        return [];
    }
});

// IPC Handlers for FTP
ipcMain.handle('ftp-test', async (event, config) => {
    log.info(`Testing FTP connection to: ${config.host}`);
    try {
        await ftpService.connect(config);
        // We disconnect after test to avoid keeping idle connection? 
        // Or keep it since we might scan next. Let's keep it simple.
        return { success: true };
    } catch (e) {
        log.error("FTP Test Error:", e.message);
        throw e;
    }
});

ipcMain.handle('ftp-scan', async (event, config) => {
    log.info(`Scanning FTP server: ${config.host}`);
    try {
        await ftpService.connect(config);
        const files = await ftpService.scanDir(config.remotePath || "/");
        return files;
    } catch (e) {
        log.error("FTP Scan Error:", e);
        throw e;
    }
});

// Restore FTP config without connecting (for lazy connection on playback)
ipcMain.handle('ftp-restore-config', async (event, config) => {
    log.info(`[FTP] Restoring config for: ${config.host}`);
    ftpService.addConfig(config);
    return { success: true };
});

// Get the base URL for streaming
ipcMain.handle('get-stream-url', () => {
    return `http://localhost:${proxyPort}`;
});

async function scanDir(dir, depth = 0, maxDepth = 10) {
    let results = [];
    const indent = '  '.repeat(depth);

    // Prevent excessive recursion depth
    if (depth > maxDepth) {
        log.warn(`${indent}[Scan] Max depth (${maxDepth}) reached, skipping: ${dir}`);
        return results;
    }

    try {
        const list = await fs.promises.readdir(dir, { withFileTypes: true });

        // Log sparingly to avoid spamming
        if (depth === 0) log.info(`[Scan] Scanning: ${dir} (${list.length} items)`);

        for (const dirent of list) {
            // Skip hidden files/folders
            if (dirent.name.startsWith('.')) continue;

            try {
                const filePath = path.resolve(dir, dirent.name);

                if (dirent.isDirectory()) {
                    // Recursively scan subdirectories
                    const nestedFiles = await scanDir(filePath, depth + 1, maxDepth);
                    results = results.concat(nestedFiles);
                } else if (dirent.isFile()) {
                    // Check for video extensions
                    if (/\.(mkv|mp4|avi|mov|wmv|m4v|webm|flv|m2ts|ts)$/i.test(dirent.name)) {
                        const stat = await fs.promises.stat(filePath);
                        results.push({
                            name: dirent.name,
                            path: filePath,
                            size: stat.size,
                            type: 'video'
                        });
                    }
                }
            } catch (fileErr) {
                log.warn(`${indent}  [Skip] ${dirent.name}: ${fileErr.message}`);
            }
        }
    } catch (dirErr) {
        log.error(`[Scan Error] Cannot read directory ${dir}: ${dirErr.message}`);
    }

    if (depth === 0) {
        log.info(`[Scan Complete] Found ${results.length} media files in ${dir}`);
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

// Cast Service Handlers
ipcMain.on('cast-scan-start', (event) => {
    log.info('[Main] Starting cast scan');
    castService.startScan((devices) => {
        if (mainWindow) {
            mainWindow.webContents.send('cast-devices-update', devices);
        }
    });
});

ipcMain.on('cast-scan-stop', () => {
    log.info('[Main] Stopping cast scan');
    castService.stopScan();
});

ipcMain.handle('cast-play', async (event, { deviceId, url, title, startTime }) => {
    log.info(`[Main] Requesting cast to ${deviceId}: ${title}`);
    try {
        await castService.play(deviceId, url, title, startTime);
        return { success: true };
    } catch (e) {
        log.error('[Main] Cast failed:', e);
        throw e;
    }
});

ipcMain.handle('cast-stop', async (event, { deviceId }) => {
    castService.stop(deviceId);
    return { success: true };
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        // Cleanup before quit
        try {
            streamProxy.cleanup();
            mediaInfoService.cleanupTempFiles();
        } catch (e) { log.error('Cleanup error:', e); }
        app.quit();
    }
});

app.on('will-quit', () => {
    // Ensure cleanup happens on macOS too (Cmd+Q)
    try {
        streamProxy.cleanup();
        mediaInfoService.cleanupTempFiles();
    } catch (e) { log.error('Cleanup error:', e); }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
