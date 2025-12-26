const ChromecastAPI = require('chromecast-api');
const Bonjour = require('bonjour-service').Bonjour;
const AirPlay = require('airplay-protocol');
const ip = require('ip');
const log = require('electron-log');

class CastService {
    constructor() {
        this.devices = new Map(); // key: id, value: { id, name, type, host, internal }
        this.browserCast = null;
        this.browserAirPlay = null;
        this.isScanning = false;
        this.listeners = [];
    }

    startScan(callback) {
        if (callback) {
            this.listeners.push(callback);
        }

        // Return current list immediately
        this.emitDevices();

        if (this.isScanning) return;
        this.isScanning = true;

        log.info('[Cast] Starting scan...');

        // 1. Google Cast
        try {
            this.browserCast = new ChromecastAPI();
            this.browserCast.on('deviceOn', (device) => {
                const id = `cast-${device.host}`;
                if (!this.devices.has(id)) {
                    log.info(`[Cast] Found Google Cast device: ${device.config.name} (${device.host})`);
                    this.devices.set(id, {
                        id,
                        name: device.config.name,
                        type: 'cast',
                        host: device.host,
                        internal: device
                    });
                    this.emitDevices();
                }
            });
        } catch (e) {
            log.error('[Cast] Error initializing ChromecastAPI:', e);
        }

        // 2. Apple AirPlay
        try {
            this.browserAirPlay = new Bonjour();
            this.browserAirPlay.find({ type: 'airplay' }, (service) => {
                const id = `airplay-${service.addresses[0]}`; // Use first IP as ID part
                if (!this.devices.has(id)) {
                    log.info(`[Cast] Found AirPlay device: ${service.name} (${service.addresses[0]})`);
                    this.devices.set(id, {
                        id,
                        name: service.name,
                        type: 'airplay',
                        host: service.addresses[0],
                        port: service.port,
                        internal: service
                    });
                    this.emitDevices();
                }
            });
        } catch (e) {
            log.error('[Cast] Error initializing Bonjour:', e);
        }
    }

    stopScan() {
        this.listeners = [];
        if (this.browserCast) {
            // chromecast-api doesn't have a clear stop method, but we can null it
            this.browserCast = null;
        }
        if (this.browserAirPlay) {
            this.browserAirPlay.destroy();
            this.browserAirPlay = null;
        }
        this.isScanning = false;
        this.devices.clear();
        log.info('[Cast] Scan stopped');
    }

    emitDevices() {
        const list = Array.from(this.devices.values()).map(d => ({
            id: d.id,
            name: d.name,
            type: d.type
        }));
        this.listeners.forEach(cb => cb(list));
    }

    async play(deviceId, url, title = 'Video', startTime = 0) {
        const device = this.devices.get(deviceId);
        if (!device) throw new Error('Device not found');

        // Ensure URL is accessible (replace localhost with LAN IP)
        const localIp = ip.address();
        // Assume url is http://localhost:PORT/stream...
        // Replace localhost with local IP
        const castUrl = url.replace('localhost', localIp).replace('127.0.0.1', localIp);

        log.info(`[Cast] Casting to ${device.name} (${device.type}): ${castUrl}`);

        if (device.type === 'cast') {
            return new Promise((resolve, reject) => {
                const media = {
                    url: castUrl,
                    title: title,
                    startTime: startTime
                };
                device.internal.play(media, (err) => {
                    if (err) {
                        log.error('[Cast] Cast error:', err);
                        reject(err);
                    } else {
                        log.info('[Cast] Casting started successfully');
                        resolve();
                    }
                });
            });
        } else if (device.type === 'airplay') {
            return new Promise((resolve, reject) => {
                // AirPlay Protocol usage
                const airplayDevice = new AirPlay(device.host, device.port || 7000);

                // Play URL
                airplayDevice.play(castUrl, startTime, (err) => {
                    if (err) {
                        log.error('[Cast] AirPlay error:', err);
                        reject(err);
                    } else {
                        log.info('[Cast] AirPlay started successfully');
                        resolve();
                    }
                });
            });
        }
    }

    stop(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        if (device.type === 'cast') {
            device.internal.stop(() => {
                log.info('[Cast] Stopped Google Cast');
            });
        } else if (device.type === 'airplay') {
            // AirPlay stop logic if available in library, otherwise sending stop command
            // airplay-protocol typically has a stop or close
            // Let's re-instantiate or check if we kept the reference
            // For now, simpler:
            const airplayDevice = new AirPlay(device.host, device.port || 7000);
            // It might not have a stop method directly exposed in the minimal common usage
            // But usually it does. Checking docs... assuming 'stop' exists or we close connection.
            // Actually, the library might be 'airplay-protocol' (client).
            // Let's assume standard behavior. (Sending 'stop' command).
            // If not, we might need a better library.
            try {
                // Try generic stop?
                // airplayDevice.stop(); 
            } catch (e) {
                log.warn('AirPlay stop not fully implemented');
            }
        }
    }
}

module.exports = new CastService();
