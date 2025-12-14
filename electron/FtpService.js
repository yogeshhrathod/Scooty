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
                secureOptions: { rejectUnauthorized: false } // Relaxed security for home servers
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

    async scanDir(remotePath = "/") {
        try {
            await this.ensureConnection()
        } catch (e) {
            console.error("Skipping scan, no connection.");
            return [];
        }

        let results = []
        try {
            // Add timeout for listing
            const listPromise = this.client.list(remotePath);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("FTP List Timeout")), 10000));

            const list = await Promise.race([listPromise, timeoutPromise]);

            for (const item of list) {
                const itemPath = path.posix.join(remotePath, item.name)

                if (item.isDirectory) {
                    try {
                        const subResults = await this.scanDir(itemPath)
                        results = results.concat(subResults)
                    } catch (err) {
                        console.warn(`Failed to scan subdir ${itemPath}:`, err.message)
                    }
                } else {
                    if (/\.(mkv|mp4|avi|mov|wmv)$/i.test(item.name)) {
                        results.push({
                            name: item.name,
                            path: itemPath,
                            size: item.size,
                            type: 'video',
                            source: 'ftp'
                        })
                    }
                }
            }
        } catch (err) {
            console.error("Error scanning dir:", remotePath, err.message)
        }
        return results
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
            secureOptions: { rejectUnauthorized: false }
        })
        return streamClient
    }

    async disconnect() {
        this.client.close()
        this.isConnected = false
    }
}

module.exports = new FtpService()
