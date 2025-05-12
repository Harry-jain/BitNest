/**
 * BitNest Media Processing Utility
 * 
 * Provides utilities for video compression and HLS streaming
 * using FFmpeg in Termux.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Media paths
const MEDIA_ROOT = process.env.MEDIA_ROOT || '/storage/external-1/BitNestMedia';
const VIDEOS_PATH = path.join(MEDIA_ROOT, 'videos');
const HLS_PATH = path.join(MEDIA_ROOT, 'streaming');

/**
 * Interface for video encoding options
 */
export interface EncodingOptions {
  width?: number;          // Target width (height will be proportional)
  crf?: number;            // Constant Rate Factor (quality) - 18-28 recommended
  preset?: string;         // Encoding preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
  segmentDuration?: number; // HLS segment duration in seconds
  maxBitrate?: number;     // Maximum bitrate in kbps
}

/**
 * Default encoding options - optimized for mobile devices
 */
const DEFAULT_OPTIONS: EncodingOptions = {
  width: 1280,             // 720p
  crf: 28,                 // Good balance of quality and size for mobile
  preset: 'fast',          // Good speed/compression tradeoff for mobile CPUs
  segmentDuration: 5,      // 5 second segments
  maxBitrate: 2500,        // 2.5 Mbps - good for mobile networks
};

/**
 * Check if FFmpeg is available in the system
 * @returns Promise that resolves to true if FFmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('which ffmpeg');
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get device temperature (Android specific)
 * @returns Promise that resolves to the CPU temperature or null if unavailable
 */
export async function getCpuTemperature(): Promise<number | null> {
  try {
    // Try to read temperature from a common Android thermal zone
    const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone0/temp');
    const temp = parseInt(stdout.trim(), 10);
    return temp > 1000 ? temp / 1000 : temp; // Convert to Celsius if in milliCelsius
  } catch (error) {
    return null;
  }
}

/**
 * Throttle FFmpeg based on CPU temperature
 * @param options Current encoding options
 * @returns Adjusted encoding options
 */
export async function throttleBasedOnTemp(options: EncodingOptions): Promise<EncodingOptions> {
  const temp = await getCpuTemperature();
  const newOptions = { ...options };

  if (temp !== null) {
    if (temp > 75) {
      // Very hot - use ultrafast preset and reduce resolution
      newOptions.preset = 'ultrafast';
      newOptions.width = Math.min(options.width || 1280, 854);  // 480p max
      newOptions.crf = Math.min(options.crf || 28, 32);         // Reduce quality
    } else if (temp > 65) {
      // Warm - use faster preset
      newOptions.preset = 'faster';
    }
  }

  return newOptions;
}

/**
 * Encode a video to H.265/HEVC format
 * @param inputPath Path to the input video file
 * @param outputPath Path for the encoded output (mp4)
 * @param options Encoding options
 * @returns Promise that resolves when encoding is complete
 */
export async function encodeToH265(
  inputPath: string,
  outputPath: string,
  options: EncodingOptions = DEFAULT_OPTIONS
): Promise<void> {
  // Check if FFmpeg is available
  if (!(await checkFFmpeg())) {
    throw new Error('FFmpeg is not available');
  }

  // Apply temperature-based throttling
  const adjustedOptions = await throttleBasedOnTemp(options);

  // Build FFmpeg command
  const ffmpegCmd = [
    'ffmpeg',
    '-i', `"${inputPath}"`,
    '-c:v', 'libx265',                // H.265/HEVC codec
    '-preset', adjustedOptions.preset || DEFAULT_OPTIONS.preset,
    '-crf', adjustedOptions.crf || DEFAULT_OPTIONS.crf,
    '-maxrate', `${adjustedOptions.maxBitrate || DEFAULT_OPTIONS.maxBitrate}k`,
    '-bufsize', `${(adjustedOptions.maxBitrate || DEFAULT_OPTIONS.maxBitrate) * 2}k`,
    '-vf', `scale=${adjustedOptions.width || DEFAULT_OPTIONS.width}:-2`,  // Maintain aspect ratio
    '-c:a', 'aac',                    // AAC audio codec
    '-b:a', '128k',                   // 128 kbps audio
    '-movflags', '+faststart',        // Enable fast start for streaming
    '-y',                             // Overwrite output
    `"${outputPath}"`
  ].join(' ');

  // Execute FFmpeg command
  await execAsync(ffmpegCmd);
}

/**
 * Generate HLS (HTTP Live Streaming) segments for adaptive bitrate streaming
 * @param inputPath Path to the input video file (should be H.265 encoded)
 * @param outputDir Directory for HLS output
 * @param videoName Name of the video (for folder naming)
 * @param options Encoding options
 * @returns Promise that resolves to the HLS manifest path
 */
export async function generateHLS(
  inputPath: string,
  outputDir: string,
  videoName: string,
  options: EncodingOptions = DEFAULT_OPTIONS
): Promise<string> {
  // Check if FFmpeg is available
  if (!(await checkFFmpeg())) {
    throw new Error('FFmpeg is not available');
  }

  // Make sure output directory exists
  const hlsVideoDir = path.join(outputDir, videoName);
  await fs.mkdir(hlsVideoDir, { recursive: true });

  // Apply temperature-based throttling
  const adjustedOptions = await throttleBasedOnTemp(options);

  // Define quality variants for adaptive streaming
  const variants = [
    { height: 480, bitrate: 800 },   // 480p - Low quality
    { height: 720, bitrate: 1500 },  // 720p - Medium quality
    { height: 1080, bitrate: 2500 }, // 1080p - High quality (if original is high enough)
  ];

  // Create a master playlist
  let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

  // Get the width to use for calculations with fallback to default
  const baseWidth = adjustedOptions.width ?? DEFAULT_OPTIONS.width ?? 1280;

  // Generate streams for each quality variant
  for (const variant of variants) {
    // Skip variants higher than original resolution (using adjusted width as reference)
    if (variant.height > (baseWidth * 9 / 16)) continue;

    const variantDir = path.join(hlsVideoDir, `${variant.height}p`);
    await fs.mkdir(variantDir, { recursive: true });

    const variantOutput = path.join(variantDir, 'stream.m3u8');

    // Get preset and CRF with fallbacks to default values
    const preset = adjustedOptions.preset ?? DEFAULT_OPTIONS.preset ?? 'fast';
    const crf = adjustedOptions.crf ?? DEFAULT_OPTIONS.crf ?? 28;
    const segmentDuration = adjustedOptions.segmentDuration ?? DEFAULT_OPTIONS.segmentDuration ?? 5;

    // Build FFmpeg command for this variant
    const ffmpegCmd = [
      'ffmpeg',
      '-i', `"${inputPath}"`,
      '-c:v', 'libx265',               // H.265/HEVC codec
      '-preset', preset,
      '-crf', crf,
      '-maxrate', `${variant.bitrate}k`,
      '-bufsize', `${variant.bitrate * 2}k`,
      '-vf', `scale=-2:${variant.height}`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-hls_time', segmentDuration,
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', `"${path.join(variantDir, 'segment%03d.ts')}"`,
      '-y',
      `"${variantOutput}"`
    ].join(' ');

    // Execute FFmpeg command
    await execAsync(ffmpegCmd);

    // Calculate the width based on the aspect ratio (16:9)
    const aspectWidth = Math.round((variant.height * 16) / 9);

    // Add this variant to the master playlist
    masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bitrate * 1000},RESOLUTION=${aspectWidth}x${variant.height}\n`;
    masterPlaylist += `${variant.height}p/stream.m3u8\n`;
  }

  // Write master playlist
  const masterPlaylistPath = path.join(hlsVideoDir, 'master.m3u8');
  await fs.writeFile(masterPlaylistPath, masterPlaylist);

  return masterPlaylistPath;
}

/**
 * Process a video for streaming (encode and generate HLS)
 * @param videoPath Path to the original video file
 * @param options Encoding options
 * @returns Promise that resolves to the HLS master playlist path
 */
export async function processVideoForStreaming(
  videoPath: string,
  options: EncodingOptions = DEFAULT_OPTIONS
): Promise<string> {
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const encodedPath = path.join(VIDEOS_PATH, `${videoName}_encoded.mp4`);

  // Make sure directories exist
  await fs.mkdir(VIDEOS_PATH, { recursive: true });
  await fs.mkdir(HLS_PATH, { recursive: true });

  // Step 1: Encode to H.265
  await encodeToH265(videoPath, encodedPath, options);

  // Step 2: Generate HLS segments and playlists
  const hlsPath = await generateHLS(encodedPath, HLS_PATH, videoName, options);

  return hlsPath;
} 