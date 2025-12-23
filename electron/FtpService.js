const ftp = require("basic-ftp")
const path = require("path")

class FtpService {
    constructor() {
        this.client = new ftp.Client()
        this.client.ftp.verbose = true // For debugging
        this.config = null
        this.isConnected = false
    }

    async connect(config) {
        this.config = config
        try {
            await this.client.access({
                host: config.host,
                port: config.port || 21,
                user: config.user,
                password: config.password,
                secure: config.secure || false,
                secureOptions: { rejectUnauthorized: config.rejectUnauthorized !== false } // Default to Secure (true) unless explicitly disabled
            })
            this.isConnected = true
            console.log("FTP Connected")
            return true
        } catch (err) {
            console.error("FTP Connection Error:", err.message)
            this.isConnected = false
            throw err
        }
    }

    async ensureConnection() {
        if (this.client.closed && this.config) {
            console.log("Reconnecting FTP...")
            try {
                await this.connect(this.config)
            } catch (error) {
                console.warn("Failed to reconnect FTP:", error.message);
                throw new Error("FTP Reconnection Failed");
            }
        }
    }

    async scanDir(remotePath = "/", depth = 0, maxDepth = 15) {
        // Prevent infinite recursion
        if (depth > maxDepth) {
            console.warn(`[FTP] Max depth ${maxDepth} reached at ${remotePath}, skipping.`);
            return [];
        }

        try {
            await this.ensureConnection()
        } catch (e) {
            console.error("[FTP] Skipping scan, no connection.");
            return [];
        }

        let results = [];
        const indent = '  '.repeat(depth);

        try {
            console.log(`${indent}[FTP] Scanning: ${remotePath}`);

            // Navigate into the directory first - this avoids issues with spaces/brackets in arguments
            try {
                await this.client.cd(remotePath);
            } catch (err) {
                console.warn(`${indent}[FTP] Failed to CD into ${remotePath}: ${err.message}`);
                return [];
            }

            // List current directory
            const listPromise = this.client.list(); // List current dir
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("FTP List Timeout")), 15000)
            );
            const list = await Promise.race([listPromise, timeoutPromise]);

            // Separate directories and files
            const directories = [];
            const files = [];

            for (const item of list) {
                if (item.name.startsWith('.')) continue;

                if (item.isDirectory) {
                    directories.push(item);
                } else {
                    files.push(item);
                }
            }

            console.log(`${indent}[FTP] Found ${directories.length} dirs, ${files.length} files in ${remotePath}`);

            // Process files first
            for (const item of files) {
                const itemPath = path.posix.join(remotePath, item.name);
                if (/\.(mkv|mp4|avi|mov|wmv|m4v|webm|flv|m2ts|ts)$/i.test(item.name)) {
                    console.log(`${indent}  [FTP Found] ${item.name}`);
                    results.push({
                        name: item.name,
                        path: itemPath,
                        size: item.size,
                        type: 'video',
                        source: 'ftp'
                    });
                }
            }

            // Process directories SEQUENTIALLY
            // Note: failing to scan a subdir shouldn't stop the rest
            for (const item of directories) {
                const itemPath = path.posix.join(remotePath, item.name);
                // We must recursively scan. Since scanDir will 'cd' into the absolute path of the child,
                // we don't need to manually 'cd' back and forth here. scanDir handles the navigation.
                const subResults = await this.scanDir(itemPath, depth + 1, maxDepth);
                results = results.concat(subResults);
            }

        } catch (err) {
            console.error(`[FTP] Error scanning dir ${remotePath}: ${err.message}`);
        }

        if (depth === 0) {
            console.log(`[FTP] Scan complete: Found ${results.length} media files`);
        }

        return results;
    }

    /**
     * Get a dedicated client for streaming to avoid blocking the main command channel
     * or reusing the main one if we are careful. 
     * For robust streaming, a dedicated connection is safer.
     */
    async createStreamClient() {
        const streamClient = new ftp.Client()
        // copying config
        if (!this.config) throw new Error("No config available")

        await streamClient.access({
            host: this.config.host,
            port: this.config.port || 21,
            user: this.config.user,
            password: this.config.password,
            secure: this.config.secure || false,
            secureOptions: { rejectUnauthorized: this.config.rejectUnauthorized !== false }
        })
        return streamClient
    }

    async disconnect() {
        this.client.close()
        this.isConnected = false
    }
}

module.exports = new FtpService()
