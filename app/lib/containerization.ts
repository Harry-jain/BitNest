import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { logErrorAndNotify } from './notifications';
import { MEDIA_ROOT } from './storage';
import { registerContainer, markContainerAccessed, isContainerOverLimit } from './container-manager';

// User isolation settings
const ENABLE_USER_ISOLATION = process.env.ENABLE_USER_ISOLATION === 'true';
const USER_NAMESPACE_PREFIX = 'user_';

/**
 * Creates an isolated container for a user
 */
export async function createUserContainer(userId: string): Promise<string> {
    if (!ENABLE_USER_ISOLATION) {
        return MEDIA_ROOT;
    }

    const userContainerPath = getUserContainerPath(userId);

    try {
        // Ensure user container exists
        await fsPromises.mkdir(userContainerPath, { recursive: true });

        // Create subdirectories
        const subdirs = ['files', 'streaming', 'chunks', 'thumbnails', 'temp'];
        for (const dir of subdirs) {
            await fsPromises.mkdir(path.join(userContainerPath, dir), { recursive: true });
        }

        // Set proper permissions (limit to current user only)
        if (process.platform !== 'win32') {
            try {
                const containerUserId = Number(process.env.CONTAINER_USER_ID) || 1000;
                const containerGroupId = Number(process.env.CONTAINER_GROUP_ID) || 1000;

                // Set ownership
                await runCommand('chown', ['-R', `${containerUserId}:${containerGroupId}`, userContainerPath]);

                // Set permissions (700 = owner can read/write/execute, others have no access)
                await runCommand('chmod', ['-R', '700', userContainerPath]);
            } catch (error) {
                console.warn('Failed to set container permissions:', error);
            }
        }

        // Register the container with the container manager
        await registerContainer(userId);

        return userContainerPath;
    } catch (error) {
        await logErrorAndNotify(
            error instanceof Error ? error : new Error(String(error)),
            'User Container Creation'
        );
        // Fallback to shared media root
        return MEDIA_ROOT;
    }
}

/**
 * Get the path to a user's container
 */
export function getUserContainerPath(userId: string): string {
    if (!ENABLE_USER_ISOLATION) {
        return MEDIA_ROOT;
    }

    // Transform userId to safe directory name (remove special chars)
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(MEDIA_ROOT, `${USER_NAMESPACE_PREFIX}${safeUserId}`);
}

/**
 * Verify that a file path belongs to the user's container
 */
export function verifyPathBelongsToUser(filePath: string, userId: string): boolean {
    if (!ENABLE_USER_ISOLATION) {
        return true; // No isolation, so all paths are valid
    }

    const userContainerPath = getUserContainerPath(userId);
    const normalizedFilePath = path.normalize(filePath);
    const normalizedContainerPath = path.normalize(userContainerPath);

    // Check if the file path is within the user's container
    return normalizedFilePath.startsWith(normalizedContainerPath);
}

/**
 * Access a user's container (marks it as recently accessed)
 */
export async function accessUserContainer(userId: string): Promise<boolean> {
    // Check if container is over storage limit
    if (await isContainerOverLimit(userId)) {
        console.warn(`Container for user ${userId} is over storage limit`);
        return false;
    }

    // Mark container as accessed
    await markContainerAccessed(userId);
    return true;
}

/**
 * Run a shell command
 */
async function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        process.on('close', (code: number) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
    });
}

/**
 * Clean up user containers that haven't been accessed in a long time
 */
export async function cleanupInactiveContainers(olderThanDays: number = 30): Promise<void> {
    if (!ENABLE_USER_ISOLATION) {
        return;
    }

    try {
        const now = Date.now();
        const oldestAllowedTime = now - (olderThanDays * 24 * 60 * 60 * 1000);

        const entries = await fsPromises.readdir(MEDIA_ROOT, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith(USER_NAMESPACE_PREFIX)) {
                const containerPath = path.join(MEDIA_ROOT, entry.name);
                const stats = await fsPromises.stat(containerPath);

                // If container hasn't been accessed in the specified time, archive it
                if (stats.atime.getTime() < oldestAllowedTime) {
                    console.log(`Archiving inactive container: ${containerPath}`);

                    // Move to archive directory
                    const archivePath = path.join(MEDIA_ROOT, 'archive', entry.name);
                    await fsPromises.mkdir(path.dirname(archivePath), { recursive: true });
                    await fsPromises.rename(containerPath, archivePath);
                }
            }
        }
    } catch (error) {
        await logErrorAndNotify(
            error instanceof Error ? error : new Error(String(error)),
            'Container Cleanup'
        );
    }
} 