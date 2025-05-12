import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileRecord } from './supabase';
import { createUserContainer, getUserContainerPath, verifyPathBelongsToUser, accessUserContainer } from './containerization';
import { logErrorAndNotify } from './notifications';

// Base storage paths
const DEFAULT_STORAGE_PATH = '/storage/emulated/0/BitNestMedia';
const EXTERNAL_STORAGE_PATH = '/storage/external-1/BitNestMedia';

// Get the storage root from environment or use default
export const MEDIA_ROOT = process.env.MEDIA_ROOT ||
    (fs.existsSync('/storage/external-1') ? EXTERNAL_STORAGE_PATH : DEFAULT_STORAGE_PATH);

// Create subdirectories
const CHUNKS_PATH = path.join(MEDIA_ROOT, 'chunks');
const FILES_PATH = path.join(MEDIA_ROOT, 'files');
const STREAMING_PATH = path.join(MEDIA_ROOT, 'streaming');
const THUMBNAILS_PATH = path.join(MEDIA_ROOT, 'thumbnails');
const TEMP_PATH = path.join(MEDIA_ROOT, 'temp');

// Ensure storage directories exist
export async function ensureStorageDirectories() {
    const directories = [
        MEDIA_ROOT,
        CHUNKS_PATH,
        FILES_PATH,
        STREAMING_PATH,
        THUMBNAILS_PATH,
        TEMP_PATH
    ];

    for (const dir of directories) {
        try {
            await fsPromises.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error(`Error creating directory ${dir}:`, error);
        }
    }
}

// Get path for a specific user's directory
function getUserPath(basePath: string, userId: string): string {
    return path.join(getUserContainerPath(userId), path.relative(MEDIA_ROOT, basePath));
}

// Save a file to the storage system and return a FileRecord
export async function saveFile(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    userId: string
): Promise<FileRecord> {
    try {
        // Ensure user container exists
        await createUserContainer(userId);

        // Check access (this will also check size limits)
        if (!(await accessUserContainer(userId))) {
            throw new Error("Storage quota exceeded or container access issue");
        }

        // Generate unique ID for file
        const fileId = uuidv4();

        // Create user directory if it doesn't exist
        const userFilesPath = getUserPath(FILES_PATH, userId);
        await fsPromises.mkdir(userFilesPath, { recursive: true });

        // Save file
        const filePath = path.join(userFilesPath, fileId);
        await fsPromises.writeFile(filePath, buffer);

        // Create file record
        const fileRecord: FileRecord = {
            id: fileId,
            name: filename,
            size: buffer.length,
            type: mimetype,
            path: filePath,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_public: false
        };

        return fileRecord;
    } catch (error) {
        await logErrorAndNotify(
            error instanceof Error ? error : new Error(String(error)),
            'File Save Operation'
        );
        throw error;
    }
}

// Read a file from storage
export async function readFile(fileId: string, userId: string): Promise<Buffer> {
    // Mark container as accessed
    await accessUserContainer(userId);

    const userFilesPath = getUserPath(FILES_PATH, userId);
    const filePath = path.join(userFilesPath, fileId);

    // Security check - verify file belongs to user
    if (!verifyPathBelongsToUser(filePath, userId)) {
        throw new Error("Access denied: File does not belong to user");
    }

    try {
        return await fsPromises.readFile(filePath);
    } catch (error) {
        console.error(`Error reading file ${fileId}:`, error);
        throw new Error(`File not found: ${fileId}`);
    }
}

// Delete a file from storage
export async function deleteFile(fileId: string, userId: string): Promise<void> {
    const userFilesPath = getUserPath(FILES_PATH, userId);
    const filePath = path.join(userFilesPath, fileId);

    // Security check - verify file belongs to user
    if (!verifyPathBelongsToUser(filePath, userId)) {
        throw new Error("Access denied: File does not belong to user");
    }

    try {
        await fsPromises.unlink(filePath);
    } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
        throw new Error(`Error deleting file: ${fileId}`);
    }
}

// Create a readable stream for a file
export function createReadStream(fileId: string, userId: string) {
    // Mark container as accessed (do this asynchronously)
    accessUserContainer(userId).catch(error => {
        console.error(`Error marking container accessed: ${error}`);
    });

    const userFilesPath = getUserPath(FILES_PATH, userId);
    const filePath = path.join(userFilesPath, fileId);

    // Security check - verify file belongs to user
    if (!verifyPathBelongsToUser(filePath, userId)) {
        throw new Error("Access denied: File does not belong to user");
    }

    return fs.createReadStream(filePath);
}

// Get total and available storage space
export async function getStorageInfo() {
    try {
        // Get disk usage information - this is platform specific
        // For Android/Linux systems we can use df command
        const { execSync } = require('child_process');
        let diskInfo;

        try {
            // Try using df command (works on Linux/Android)
            const dfOutput = execSync(`df -B1 ${MEDIA_ROOT}`).toString();
            const lines = dfOutput.trim().split('\n');
            const parts = lines[1].split(/\s+/);

            diskInfo = {
                totalSpace: parseInt(parts[1], 10),
                availableSpace: parseInt(parts[3], 10),
                usedSpace: parseInt(parts[2], 10)
            };
        } catch (err) {
            // Fallback for Windows or if df command fails
            console.warn('Could not get disk info via df command, using fallback values:', err);
            return {
                totalSpace: 95 * 1024 * 1024 * 1024, // 95 GB in bytes
                availableSpace: 90 * 1024 * 1024 * 1024, // 90 GB in bytes
                usedSpace: 5 * 1024 * 1024 * 1024 // 5 GB in bytes
            };
        }

        return diskInfo;
    } catch (error) {
        console.error('Error getting storage info:', error);
        // Return fallback values
        return {
            totalSpace: 95 * 1024 * 1024 * 1024, // 95 GB in bytes
            availableSpace: 90 * 1024 * 1024 * 1024, // 90 GB in bytes
            usedSpace: 5 * 1024 * 1024 * 1024 // 5 GB in bytes
        };
    }
}

// Save video segments for HLS streaming
export async function saveVideoSegment(
    userId: string,
    videoId: string,
    quality: string,
    segmentName: string,
    buffer: Buffer
): Promise<string> {
    const userStreamingPath = getUserPath(STREAMING_PATH, userId);
    const videoPath = path.join(userStreamingPath, videoId, quality);

    await fsPromises.mkdir(videoPath, { recursive: true });

    const segmentPath = path.join(videoPath, segmentName);

    // Security check - verify file belongs to user
    if (!verifyPathBelongsToUser(segmentPath, userId)) {
        throw new Error("Access denied: Path does not belong to user");
    }

    await fsPromises.writeFile(segmentPath, buffer);

    return segmentPath;
}

// Save video playlist file
export async function savePlaylist(
    userId: string,
    videoId: string,
    quality: string,
    playlistContent: string
): Promise<string> {
    const userStreamingPath = getUserPath(STREAMING_PATH, userId);
    const videoPath = path.join(userStreamingPath, videoId, quality);

    await fsPromises.mkdir(videoPath, { recursive: true });

    const playlistPath = path.join(videoPath, 'playlist.m3u8');

    // Security check - verify file belongs to user
    if (!verifyPathBelongsToUser(playlistPath, userId)) {
        throw new Error("Access denied: Path does not belong to user");
    }

    await fsPromises.writeFile(playlistPath, playlistContent);

    return playlistPath;
}

// Save video thumbnail
export async function saveThumbnail(
    userId: string,
    videoId: string,
    buffer: Buffer
): Promise<string> {
    const userThumbnailPath = getUserPath(THUMBNAILS_PATH, userId);
    await fsPromises.mkdir(userThumbnailPath, { recursive: true });

    const thumbnailPath = path.join(userThumbnailPath, `${videoId}.jpg`);

    // Security check - verify file belongs to user
    if (!verifyPathBelongsToUser(thumbnailPath, userId)) {
        throw new Error("Access denied: Path does not belong to user");
    }

    await fsPromises.writeFile(thumbnailPath, buffer);

    return thumbnailPath;
}

export {
    CHUNKS_PATH,
    FILES_PATH,
    STREAMING_PATH,
    THUMBNAILS_PATH,
    TEMP_PATH
}; 