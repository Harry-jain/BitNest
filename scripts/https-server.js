// HTTPS Server for BitNest
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Default HTTPS port
const PORT = process.env.HTTPS_PORT || 443;

// Check for SSL certificates
let sslOptions = {};
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;

if (!certPath || !keyPath) {
    console.error('❌ SSL certificate paths not found in .env.local');
    console.error('Please set SSL_CERT_PATH and SSL_KEY_PATH in your .env.local file');
    process.exit(1);
}

try {
    sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    console.log('🔒 SSL certificates loaded successfully');
} catch (err) {
    console.error('❌ Error loading SSL certificates:', err.message);
    console.error(`Please check the paths in your .env.local file:
  SSL_CERT_PATH=${certPath}
  SSL_KEY_PATH=${keyPath}`);
    process.exit(1);
}

app.prepare().then(() => {
    createServer(sslOptions, (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(PORT, (err) => {
        if (err) throw err;
        console.log(`🚀 Ready on https://localhost:${PORT}`);

        // Try to get the local IP address
        try {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            let localIp = '';

            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    // Skip internal and non-IPv4 addresses
                    if (net.family === 'IPv4' && !net.internal) {
                        localIp = net.address;
                        break;
                    }
                }
                if (localIp) break;
            }

            if (localIp) {
                console.log(`🌐 Access from other devices: https://${localIp}:${PORT}`);
            }
        } catch (e) {
            // Ignore errors in getting IP address
        }
    });
});