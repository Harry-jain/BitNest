import { configureScheduledTasks } from './scheduled-tasks';
import { notifyAdmin } from '../app/lib/notifications';
import { ensureStorageDirectories } from '../app/lib/storage';

/**
 * Start all required services and tasks for BitNest
 */
async function startServices() {
    try {
        console.log('Starting BitNest services...');

        // Ensure storage directories
        console.log('Initializing storage directories...');
        await ensureStorageDirectories();
        console.log('Storage directories initialized.');

        // Start scheduled tasks
        console.log('Starting scheduled tasks...');
        configureScheduledTasks();

        console.log('BitNest services started successfully.');

        // Notify admin
        await notifyAdmin(
            'BitNest Server Started',
            `BitNest server has been started successfully at ${new Date().toLocaleString()}.`
        );

    } catch (error) {
        console.error('Error starting BitNest services:', error);

        // Try to notify admin about the error
        try {
            await notifyAdmin(
                'BitNest Startup Error',
                `Error starting BitNest services at ${new Date().toLocaleString()}:\n\n${error instanceof Error ? error.message : String(error)
                }`
            );
        } catch (notifyError) {
            console.error('Failed to send error notification:', notifyError);
        }

        // Exit with error code
        process.exit(1);
    }
}

// If this file is run directly
if (require.main === module) {
    startServices();
}

export default startServices; 