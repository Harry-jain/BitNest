/**
 * BitNest Cleanup Script
 * 
 * Handles graceful shutdown and cleanup of containers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Environment detection
const isDesktop = !process.env.IS_MOBILE && (process.platform === 'win32' || process.platform === 'darwin' || process.env.DESKTOP_SESSION);
const isTest = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

// Cleanup settings
const CLEANUP_ON_EXIT = isDesktop && !isTest;

// Get the media root path from environment or use default
const DEFAULT_MEDIA_ROOT = process.platform === 'win32'
    ? 'C:\\BitNestMedia'
    : (fs.existsSync('/storage/external-1')
        ? '/storage/external-1/BitNestMedia'
        : '/storage/emulated/0/BitNestMedia');

const MEDIA_ROOT = process.env.MEDIA_ROOT || DEFAULT_MEDIA_ROOT;

// Container registry path
const CONTAINERS_REGISTRY = path.join(MEDIA_ROOT, '.containers');
const REGISTRY_FILE = path.join(CONTAINERS_REGISTRY, 'registry.json');

console.log(`BitNest cleanup script - Desktop: ${isDesktop}, Cleanup enabled: ${CLEANUP_ON_EXIT}`);

/**
 * Clean up all containers
 */
function cleanupContainers() {
    if (!CLEANUP_ON_EXIT) {
        console.log('Container cleanup disabled - skipping');
        return;
    }

    try {
        console.log('Cleaning up user containers...');

        // Check if registry exists
        if (!fs.existsSync(REGISTRY_FILE)) {
            console.log('No container registry found - nothing to clean up');
            return;
        }

        // Read registry
        const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
        let cleanedCount = 0;

        // Clean up each active container
        for (const userId in registry) {
            if (registry[userId].isActive) {
                const containerPath = registry[userId].path;

                if (fs.existsSync(containerPath)) {
                    console.log(`Cleaning up container for user ${userId} at ${containerPath}`);

                    try {
                        if (process.platform === 'win32') {
                            // Windows
                            execSync(`rmdir /s /q "${containerPath}"`, { encoding: 'utf-8' });
                        } else {
                            // Linux/macOS
                            execSync(`rm -rf "${containerPath}"/*`, { encoding: 'utf-8' });
                        }
                        cleanedCount++;
                    } catch (error) {
                        console.error(`Error cleaning up container ${containerPath}:`, error.message);
                    }
                }
            }
        }

        // Reset registry
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify({}));

        console.log(`Cleaned up ${cleanedCount} containers`);
    } catch (error) {
        console.error('Error during container cleanup:', error);
    }
}

/**
 * Stop the server if running
 */
function stopServer() {
    try {
        console.log('Stopping any running servers...');

        if (process.platform === 'win32') {
            // Windows - use netstat and taskkill
            try {
                const output = execSync('netstat -ano | findstr "LISTENING" | findstr "3000"', { encoding: 'utf-8' });
                const lines = output.split('\n').filter(line => line.trim().length > 0);

                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];

                    if (pid && !isNaN(parseInt(pid))) {
                        console.log(`Killing process with PID ${pid}`);
                        execSync(`taskkill /F /PID ${pid}`);
                    }
                }
            } catch (error) {
                // No server running or error in command
                console.log('No server process found or unable to check');
            }
        } else {
            // Linux/macOS - use lsof and kill
            try {
                const output = execSync('lsof -i :3000 | grep LISTEN', { encoding: 'utf-8' });
                const lines = output.split('\n').filter(line => line.trim().length > 0);

                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[1];

                    if (pid && !isNaN(parseInt(pid))) {
                        console.log(`Killing process with PID ${pid}`);
                        execSync(`kill -9 ${pid}`);
                    }
                }
            } catch (error) {
                // No server running or error in command
                console.log('No server process found or unable to check');
            }
        }
    } catch (error) {
        console.error('Error stopping server:', error);
    }
}

// Run cleanup
stopServer();
cleanupContainers();

console.log('Cleanup completed'); 