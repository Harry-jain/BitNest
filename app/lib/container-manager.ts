/**
 * BitNest Container Manager
 * 
 * Handles container lifecycle, storage limits, and cleanup
 */

import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { execSync } from 'child_process';
import { getUserContainerPath } from './containerization';
import { MEDIA_ROOT } from './storage';
import { logErrorAndNotify } from './notifications';

// Environment detection
const isDesktop = !process.env.IS_MOBILE && (process.platform === 'win32' || process.platform === 'darwin' || process.env.DESKTOP_SESSION);
const TEST_MODE = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

// Container settings
const MAX_CONTAINER_SIZE_BYTES = TEST_MODE ? 5 * 1024 * 1024 * 1024 : 0; // 5GB limit for testing, 0 means no limit
const CLEANUP_ON_EXIT = isDesktop && !TEST_MODE; // Only clean up containers on exit for desktop environments
const CONTAINERS_REGISTRY = path.join(MEDIA_ROOT, '.containers');

interface ContainerInfo {
    userId: string;
    path: string;
    createdAt: Date;
    lastAccessedAt: Date;
    sizeBytes: number;
    isActive: boolean;
}

/**
 * Initialize the container manager
 */
export async function initContainerManager(): Promise<void> {
    try {
        // Create containers registry if it doesn't exist
        await fsPromises.mkdir(CONTAINERS_REGISTRY, { recursive: true });

        // Initialize container registry
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');
        if (!fs.existsSync(registryFile)) {
            await fsPromises.writeFile(registryFile, JSON.stringify({}));
        }

        // Register cleanup on process exit if we're in desktop mode
        if (CLEANUP_ON_EXIT) {
            process.on('exit', () => {
                try {
                    // Synchronous cleanup on exit
                    console.log('Cleaning up containers before exit...');
                    cleanupContainersSync();
                } catch (error) {
                    console.error('Error during container cleanup:', error);
                }
            });

            // Also handle SIGINT (Ctrl+C)
            process.on('SIGINT', () => {
                console.log('Received SIGINT, cleaning up...');
                cleanupAllContainers().then(() => {
                    process.exit(0);
                }).catch(error => {
                    console.error('Error during SIGINT cleanup:', error);
                    process.exit(1);
                });
            });
        }

        console.log(`Container manager initialized. Test mode: ${TEST_MODE}, Desktop: ${isDesktop}, Cleanup on exit: ${CLEANUP_ON_EXIT}`);
    } catch (error) {
        console.error('Error initializing container manager:', error);
    }
}

/**
 * Register a container for a user
 */
export async function registerContainer(userId: string): Promise<void> {
    try {
        const containerPath = getUserContainerPath(userId);
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');

        // Read current registry
        const registry = JSON.parse(await fsPromises.readFile(registryFile, 'utf-8'));

        // Add or update container info
        registry[userId] = {
            path: containerPath,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            isActive: true
        };

        // Write updated registry
        await fsPromises.writeFile(registryFile, JSON.stringify(registry, null, 2));
    } catch (error) {
        console.error('Error registering container:', error);
    }
}

/**
 * Mark a container as accessed (updates last accessed time)
 */
export async function markContainerAccessed(userId: string): Promise<void> {
    try {
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');

        // Read current registry
        const registry = JSON.parse(await fsPromises.readFile(registryFile, 'utf-8'));

        // Update last accessed time if container exists
        if (registry[userId]) {
            registry[userId].lastAccessedAt = new Date().toISOString();
            await fsPromises.writeFile(registryFile, JSON.stringify(registry, null, 2));
        }
    } catch (error) {
        console.error('Error marking container accessed:', error);
    }
}

/**
 * Get the size of a container in bytes
 */
export async function getContainerSize(userId: string): Promise<number> {
    try {
        const containerPath = getUserContainerPath(userId);

        // Different methods based on platform
        if (process.platform === 'win32') {
            // Windows - use PowerShell to get folder size
            const result = execSync(`powershell -command "Get-ChildItem -Path '${containerPath}' -Recurse | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum"`, { encoding: 'utf-8' });
            return parseInt(result.trim()) || 0;
        } else {
            // Linux/macOS - use du command
            const result = execSync(`du -sb "${containerPath}" | cut -f1`, { encoding: 'utf-8' });
            return parseInt(result.trim()) || 0;
        }
    } catch (error) {
        console.error('Error getting container size:', error);
        return 0;
    }
}

/**
 * Check if container is over size limit
 */
export async function isContainerOverLimit(userId: string): Promise<boolean> {
    if (MAX_CONTAINER_SIZE_BYTES === 0) {
        return false; // No limit set
    }

    const size = await getContainerSize(userId);
    return size > MAX_CONTAINER_SIZE_BYTES;
}

/**
 * Get all active containers
 */
export async function getActiveContainers(): Promise<ContainerInfo[]> {
    try {
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');

        // Read registry
        const registry = JSON.parse(await fsPromises.readFile(registryFile, 'utf-8'));

        // Convert registry to array of container info
        const containers: ContainerInfo[] = [];
        for (const userId in registry) {
            if (registry[userId].isActive) {
                const containerInfo = registry[userId];
                containers.push({
                    userId,
                    path: containerInfo.path,
                    createdAt: new Date(containerInfo.createdAt),
                    lastAccessedAt: new Date(containerInfo.lastAccessedAt),
                    sizeBytes: await getContainerSize(userId),
                    isActive: containerInfo.isActive
                });
            }
        }

        return containers;
    } catch (error) {
        console.error('Error getting active containers:', error);
        return [];
    }
}

/**
 * Clean up a specific container (remove files but keep the container)
 */
export async function cleanupContainer(userId: string): Promise<void> {
    try {
        const containerPath = getUserContainerPath(userId);

        if (!fs.existsSync(containerPath)) {
            return;
        }

        // Get all files and directories in container
        const entries = await fsPromises.readdir(containerPath, { withFileTypes: true });

        // Remove all content except special directories
        for (const entry of entries) {
            if (entry.name !== '.containers') {
                const entryPath = path.join(containerPath, entry.name);

                if (entry.isDirectory()) {
                    await fsPromises.rm(entryPath, { recursive: true, force: true });
                } else {
                    await fsPromises.unlink(entryPath);
                }
            }
        }

        console.log(`Cleaned up container for user ${userId}`);

        // Update registry
        markContainerInactive(userId);
    } catch (error) {
        console.error(`Error cleaning up container for ${userId}:`, error);
    }
}

/**
 * Mark a container as inactive in the registry
 */
export async function markContainerInactive(userId: string): Promise<void> {
    try {
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');

        // Read current registry
        const registry = JSON.parse(await fsPromises.readFile(registryFile, 'utf-8'));

        // Update container status if it exists
        if (registry[userId]) {
            registry[userId].isActive = false;
            await fsPromises.writeFile(registryFile, JSON.stringify(registry, null, 2));
        }
    } catch (error) {
        console.error('Error marking container inactive:', error);
    }
}

/**
 * Clean up all containers (for desktop shutdown)
 */
export async function cleanupAllContainers(): Promise<void> {
    if (!CLEANUP_ON_EXIT) {
        console.log('Skipping container cleanup (not in desktop mode)');
        return;
    }

    try {
        const containers = await getActiveContainers();

        for (const container of containers) {
            await cleanupContainer(container.userId);
        }

        console.log(`Cleaned up ${containers.length} containers`);

        // Clear registry
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');
        await fsPromises.writeFile(registryFile, JSON.stringify({}));
    } catch (error) {
        await logErrorAndNotify(
            error instanceof Error ? error : new Error(String(error)),
            'Container Cleanup'
        );
    }
}

/**
 * Synchronous version of cleanup for exit handler
 */
function cleanupContainersSync(): void {
    try {
        const registryFile = path.join(CONTAINERS_REGISTRY, 'registry.json');

        // Read registry synchronously
        const registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));

        // Clean up each active container
        let cleanedCount = 0;
        for (const userId in registry) {
            if (registry[userId].isActive) {
                const containerPath = registry[userId].path;

                if (fs.existsSync(containerPath)) {
                    // Recursively remove container contents
                    execSync(`rm -rf "${containerPath}/*"`, { encoding: 'utf-8' });
                    cleanedCount++;
                }
            }
        }

        // Clear registry
        fs.writeFileSync(registryFile, JSON.stringify({}));
        console.log(`Synchronously cleaned up ${cleanedCount} containers`);
    } catch (error) {
        console.error('Error during synchronous container cleanup:', error);
    }
}

// Initialize on import
initContainerManager().catch(console.error); 