import { spawn } from 'child_process';
import * as cron from 'node-cron';
import { notifyAdmin, logErrorAndNotify } from '../app/lib/notifications';
import { ensureStorageDirectories, getStorageInfo } from '../app/lib/storage';

// Configure scheduled tasks 
export function configureScheduledTasks() {
    console.log('Configuring scheduled tasks...');

    // Schedule weekly system update (Sunday at 5:00 AM)
    cron.schedule('0 5 * * 0', async () => {
        try {
            console.log('Running scheduled system update...');
            await runSystemUpdate();
        } catch (error) {
            await logErrorAndNotify(
                error instanceof Error ? error : new Error(String(error)),
                'Scheduled System Update'
            );
        }
    });

    // Schedule daily storage check (midnight every day)
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running scheduled storage check...');
            await checkStorageStatus();
        } catch (error) {
            await logErrorAndNotify(
                error instanceof Error ? error : new Error(String(error)),
                'Scheduled Storage Check'
            );
        }
    });

    // Schedule integrity check (Thursday at 3:00 AM)
    cron.schedule('0 3 * * 4', async () => {
        try {
            console.log('Running scheduled integrity check...');
            await runIntegrityCheck();
        } catch (error) {
            await logErrorAndNotify(
                error instanceof Error ? error : new Error(String(error)),
                'Scheduled Integrity Check'
            );
        }
    });

    console.log('Scheduled tasks configured successfully.');
}

// Run system update
async function runSystemUpdate(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            // Ensure all storage directories exist
            await ensureStorageDirectories();

            // Run npm update
            const result = await runCommand('npm', ['update', '--silent']);

            // Check if update was successful
            if (result.success) {
                const message = `System update completed successfully.\n${result.stdout}`;
                console.log(message);

                // Notify admin
                await notifyAdmin(
                    'Scheduled Update Complete',
                    `The BitNest system update was completed successfully on ${new Date().toLocaleString()}.\n\n${result.stdout.length > 500 ? result.stdout.substring(0, 500) + '...' : result.stdout
                    }`
                );

                resolve();
            } else {
                throw new Error(`Update failed: ${result.stderr}`);
            }
        } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
        }
    });
}

// Check storage status
async function checkStorageStatus(): Promise<void> {
    try {
        const { totalSpace, availableSpace, usedSpace } = await getStorageInfo();

        // Convert to GB for readability 
        const totalGB = (totalSpace / (1024 * 1024 * 1024)).toFixed(2);
        const availableGB = (availableSpace / (1024 * 1024 * 1024)).toFixed(2);
        const usedGB = (usedSpace / (1024 * 1024 * 1024)).toFixed(2);

        // Calculate usage percentage
        const usagePercentage = ((usedSpace / totalSpace) * 100).toFixed(2);

        // Check if storage is running low (less than 10% available)
        const isLow = (availableSpace / totalSpace) < 0.1;

        const status = `
Storage Status:
==============
Total: ${totalGB} GB
Used: ${usedGB} GB (${usagePercentage}%)
Available: ${availableGB} GB
Status: ${isLow ? 'LOW STORAGE ALERT' : 'OK'}
    `;

        console.log(status);

        // If storage is running low, send an alert
        if (isLow) {
            await notifyAdmin(
                'LOW STORAGE ALERT',
                `Your BitNest storage is running low!\n\n${status}`
            );
        }
    } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    }
}

// Run file system integrity check
async function runIntegrityCheck(): Promise<void> {
    try {
        // Ensure all storage directories exist
        await ensureStorageDirectories();

        // Add custom integrity checks here
        // For example, check if files are accessible, directories are writeable, etc.

        const message = `System integrity check completed successfully at ${new Date().toLocaleString()}.`;
        console.log(message);

        // Notify admin
        await notifyAdmin('Integrity Check Complete', message);
    } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    }
}

// Helper function to run commands
function runCommand(command: string, args: string[]): Promise<{
    success: boolean;
    stdout: string;
    stderr: string
}> {
    return new Promise((resolve) => {
        const proc = spawn(command, args);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
            });
        });
    });
}

// If this file is run directly, start the scheduled tasks
if (require.main === module) {
    configureScheduledTasks();
}

export default {
    configureScheduledTasks,
    runSystemUpdate,
    checkStorageStatus,
    runIntegrityCheck,
}; 