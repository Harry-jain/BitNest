/**
 * BitNest Server
 * 
 * This is the main server entry point for production mode
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Environment detection
const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.TEST_MODE === 'true';
const isDesktop = !process.env.IS_MOBILE;

// Set up variables
const port = parseInt(process.env.PORT, 10) || 3000;
const app = next({ dev: isDev });
const handle = app.getRequestHandler();

// Container management state
let containersInitialized = false;

// Get storage path
const DEFAULT_STORAGE_PATH = process.platform === 'win32'
    ? 'C:\\BitNestMedia'
    : '/storage/emulated/0/BitNestMedia';

const STORAGE_PATH = process.env.MEDIA_ROOT || DEFAULT_STORAGE_PATH;

// Container registry
const CONTAINER_REGISTRY = path.join(STORAGE_PATH, '.containers');
const REGISTRY_FILE = path.join(CONTAINER_REGISTRY, 'registry.json');

// Ensure container registry exists
function initializeContainers() {
    if (containersInitialized) return;

    try {
        // Create registry directory
        if (!fs.existsSync(CONTAINER_REGISTRY)) {
            fs.mkdirSync(CONTAINER_REGISTRY, { recursive: true });
        }

        // Create registry file if it doesn't exist
        if (!fs.existsSync(REGISTRY_FILE)) {
            fs.writeFileSync(REGISTRY_FILE, JSON.stringify({}));
        }

        // Setup cleanup on exit for desktop mode
        if (isDesktop) {
            process.on('exit', cleanupContainers);
            process.on('SIGINT', () => {
                console.log('Received SIGINT, cleaning up containers...');
                cleanupContainers();
                process.exit(0);
            });
        }

        containersInitialized = true;
        console.log(`Container system initialized. Test mode: ${isTest}, Desktop: ${isDesktop}`);

        if (isTest) {
            console.log('Running in TEST MODE with 5GB container limit');
        }
    } catch (error) {
        console.error('Error initializing container system:', error);
    }
}

// Cleanup containers on exit (desktop only)
function cleanupContainers() {
    if (!isDesktop) return;

    try {
        console.log('Cleaning up containers...');

        // Load registry
        if (!fs.existsSync(REGISTRY_FILE)) return;

        const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
        let cleanedCount = 0;

        // Clean up each active container
        for (const userId in registry) {
            if (registry[userId].isActive) {
                const containerPath = registry[userId].path;

                if (fs.existsSync(containerPath)) {
                    console.log(`Cleaning up container: ${containerPath}`);
                    // For Windows, we need to use the system command to delete non-empty directories
                    if (process.platform === 'win32') {
                        const { execSync } = require('child_process');
                        try {
                            execSync(`rmdir /s /q "${containerPath}"`);
                        } catch (e) {
                            console.error(`Error removing container: ${e.message}`);
                        }
                    } else {
                        // For Unix-based systems, we can use recursive rm
                        fs.rmdirSync(containerPath, { recursive: true, force: true });
                    }
                    cleanedCount++;
                }
            }
        }

        // Clear registry
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify({}));
        console.log(`Cleaned up ${cleanedCount} containers`);
    } catch (error) {
        console.error('Error during container cleanup:', error);
    }
}

// Prepare and start server
app.prepare().then(() => {
    // Initialize container system
    initializeContainers();

    createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(port, (err) => {
        if (err) throw err;

        console.log(`> BitNest ready on http://localhost:${port}`);

        if (isTest) {
            console.log('> Test mode active - container size limited to 5GB');
        }

        if (isDesktop) {
            console.log('> Desktop mode - containers will be cleaned up on exit');
        } else {
            console.log('> Mobile mode - containers will be preserved on exit');
        }
    });
}).catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
}); 