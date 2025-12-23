const ftp = require("basic-ftp")
const path = require("path")

class FtpService {
    constructor() {
        this.client = new ftp.Client()
        this.client.ftp.verbose = true
        this.configs = new Map() // Store multiple FTP configs by host
        this.isConnected = false
    }

    /**
     * Get the current active config (for legacy compatibility)
     */
    get config() {
        // Return the first config if available
        if (this.configs.size > 0) {
            return this.configs.values().next().value
        }
        return null
    }

    /**
     * Add/update a config in the stored configs map
     * This is called during app startup to restore configs without connecting
     */
    addConfig(config) {
        if (config && config.host) {
            console.log(`[FtpService] Adding config for host: ${config.host}`)
            this.configs.set(config.host, config)
        }
    }

    /**
     * Get a config by host
     */
    getConfig(host) {
        return this.configs.get(host)
    }

    /**
     * Get all available configs
     */
    getAllConfigs() {
        return Array.from(this.configs.values())
    }

    async connect(config) {
        this.addConfig(config) // Store it in the map
        try {
            await this.client.access({
                host: config.host,
                port: config.port || 21,
                user: config.user,
                password: config.password,
                secure: config.secure || false,
                secureOptions: { rejectUnauthorized: config.rejectUnauthorized !== false }
            })
            this.isConnected = true
            console.log("[FtpService] Connected to", config.host)
        } catch (e) {
            this.isConnected = false
            console.error("[FtpService] Connection failed:", e.message)
            throw e
        }
    }

    /**
     * Ensure connection to a specific host, reconnecting if needed
     */
    async ensureConnection(host) {
        const config = this.configs.get(host)
        if (!config) {
            throw new Error(`No config found for host: ${host}`)
        }

        // Check if we're connected to the right host
        // basic-ftp doesn't expose current host, so we track it
        if (!this.isConnected || this._currentHost !== host) {
            await this.connect(config)
            this._currentHost = host
        }
    }

    async scanDir(remotePath, maxDepth = 5) {
        const results = [];
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv'];

        const scan = async (currentPath, depth) => {
            if (depth > maxDepth) return;

            let items;
            try {
                // Navigate using cd instead of list(path) for better compatibility
                await this.client.cd(currentPath);
                items = await this.client.list();
            } catch (e) {
                console.warn(`[FtpService] Cannot access ${currentPath}:`, e.message);
                return;
            }

            for (const item of items) {
                const fullPath = path.posix.join(currentPath, item.name);

                if (item.isDirectory) {
                    await scan(fullPath, depth + 1);
                } else if (item.isFile) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (videoExtensions.includes(ext)) {
                        results.push({
                            name: item.name,
                            path: fullPath,
                            size: item.size,
                            type: 'video',
                            source: 'ftp',
                        });
                    }
                }
            }
        };

        await scan(remotePath, 0);
        return results;
    }

    /**
     * Create a dedicated FTP client for streaming
     * Uses the first available config or a specific host if provided
     */
    async createStreamClient(host = null) {
        let config;

        if (host) {
            config = this.configs.get(host);
        }

        if (!config) {
            // Fallback to first available config
            config = this.config;
        }

        if (!config) {
            throw new Error("No FTP config available for streaming");
        }

        const streamClient = new ftp.Client();

        await streamClient.access({
            host: config.host,
            port: config.port || 21,
            user: config.user,
            password: config.password,
            secure: config.secure || false,
            secureOptions: { rejectUnauthorized: config.rejectUnauthorized !== false }
        });

        return streamClient;
    }

    async disconnect() {
        this.client.close()
        this.isConnected = false
        this._currentHost = null
    }
}

module.exports = new FtpService()
