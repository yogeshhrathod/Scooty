const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

// Helper to log from worker to main process
const log = (msg, level = 'info') => {
    parentPort.postMessage({ type: 'log', message: msg, level });
};

const VIDEO_EXTENSIONS = /\.(mkv|mp4|avi|mov|wmv|m4v|webm|flv|m2ts|ts)$/i;

async function scanLocalDir(dir, depth = 0, maxDepth = 10) {
    let results = [];
    if (depth > maxDepth) return results;

    try {
        const list = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const dirent of list) {
            if (dirent.name.startsWith('.')) continue;

            const filePath = path.join(dir, dirent.name);

            if (dirent.isDirectory()) {
                const nested = await scanLocalDir(filePath, depth + 1, maxDepth);
                results = results.concat(nested);
            } else if (dirent.isFile()) {
                if (VIDEO_EXTENSIONS.test(dirent.name)) {
                    const stat = await fs.promises.stat(filePath);
                    results.push({
                        name: dirent.name,
                        path: filePath,
                        size: stat.size,
                        type: 'video',
                        source: 'local'
                    });
                }
            }
        }
    } catch (err) {
        log(`Error scanning local dir ${dir}: ${err.message}`, 'warn');
    }
    return results;
}

async function scanFtpDir(config, remotePath = '/', maxDepth = 5) {
    const results = [];
    const client = new ftp.Client();
    // client.ftp.verbose = true; // Use sparingly in worker

    try {
        await client.access({
            host: config.host,
            port: config.port || 21,
            user: config.user,
            password: config.password,
            secure: config.secure || false,
            secureOptions: { rejectUnauthorized: config.rejectUnauthorized !== false }
        });

        const scan = async (currentPath, depth) => {
            if (depth > maxDepth) return;

            try {
                await client.cd(currentPath);
                const items = await client.list();

                for (const item of items) {
                    const fullPath = path.posix.join(currentPath, item.name);

                    if (item.isDirectory) {
                        await scan(fullPath, depth + 1);
                    } else if (item.isFile) {
                        if (VIDEO_EXTENSIONS.test(item.name)) {
                            results.push({
                                name: item.name,
                                path: fullPath,
                                size: item.size,
                                type: 'video',
                                source: 'ftp',
                                sourceId: config.id // Pass back sourceId to identify origin
                            });
                        }
                    }
                }
            } catch (err) {
                log(`Error scanning FTP path ${currentPath}: ${err.message}`, 'warn');
            }
        };

        await scan(remotePath, 0);
    } catch (err) {
        log(`FTP Conn Error ${config.host}: ${err.message}`, 'error');
        throw err;
    } finally {
        client.close();
    }
    return results;
}

// Main execution block
(async () => {
    const { task, data } = workerData;

    try {
        let results = [];
        if (task === 'scan-local') {
            results = await scanLocalDir(data.path);
        } else if (task === 'scan-ftp') {
            results = await scanFtpDir(data.config);
        }

        parentPort.postMessage({ type: 'result', data: results });
    } catch (error) {
        parentPort.postMessage({ type: 'error', error: error.message });
    }
})();
