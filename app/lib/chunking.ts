/**
 * BitNest Content-Defined Chunking Utility
 * 
 * Implements a lightweight version of Rabin fingerprinting for content-defined
 * chunking with variable-size chunks.
 */

import crypto from 'crypto';

// Chunk size configuration (8KB - 64KB)
const MIN_CHUNK_SIZE = 8 * 1024;    // 8 KB
const MAX_CHUNK_SIZE = 64 * 1024;   // 64 KB
const TARGET_CHUNK_SIZE = 32 * 1024; // 32 KB (average target)

// Rabin fingerprinting window size
const WINDOW_SIZE = 48;

// Polynomial for Rabin fingerprinting
const POLYNOMIAL = 0x3DA3358B4DC173;

// Mask for boundary detection (average chunk size ~= 2^bits)
const CHUNK_MASK = 0x0FFF; // ~4K chunks for 1GB file

/**
 * Generate a fast hash for a byte window
 * @param buffer The data buffer
 * @param start Starting position in the buffer
 * @param end Ending position in the buffer
 * @returns 32-bit hash value
 */
function fastHash(buffer: Buffer, start: number, end: number): number {
  let hash = 0;
  
  for (let i = start; i < end && i < buffer.length; i++) {
    hash = ((hash << 5) - hash) + buffer[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash >>> 0; // Ensure unsigned
}

/**
 * Find chunk boundaries in a buffer using content-defined chunking
 * @param buffer The data buffer to chunk
 * @returns An array of chunk boundaries (start and end positions)
 */
export function findChunkBoundaries(buffer: Buffer): Array<{start: number, end: number}> {
  const boundaries: Array<{start: number, end: number}> = [];
  let start = 0;
  
  while (start < buffer.length) {
    let pos = start + MIN_CHUNK_SIZE;
    let end = Math.min(start + MAX_CHUNK_SIZE, buffer.length);
    let foundBoundary = false;
    
    // Look for a chunk boundary after the minimum size
    while (pos < end) {
      // Calculate hash over sliding window
      const hash = fastHash(buffer, Math.max(0, pos - WINDOW_SIZE), pos);
      
      // Check if the hash matches our boundary condition
      if ((hash & CHUNK_MASK) === 0) {
        boundaries.push({ start, end: pos });
        start = pos;
        foundBoundary = true;
        break;
      }
      
      pos++;
    }
    
    // If no boundary found or we've reached max chunk size, set boundary at max
    if (!foundBoundary) {
      boundaries.push({ start, end });
      start = end;
    }
  }
  
  return boundaries;
}

/**
 * Split a buffer into chunks based on content-defined boundaries
 * @param buffer The data buffer to chunk
 * @returns An array of chunks as Buffers
 */
export function splitIntoChunks(buffer: Buffer): Buffer[] {
  const boundaries = findChunkBoundaries(buffer);
  
  return boundaries.map(({ start, end }) => 
    buffer.slice(start, end)
  );
}

/**
 * Calculate SHA-256 hash for each chunk
 * @param chunks Array of chunk buffers
 * @returns Array of chunk hashes
 */
export function hashChunks(chunks: Buffer[]): string[] {
  return chunks.map(chunk => 
    crypto.createHash('sha256').update(chunk).digest('hex')
  );
}

/**
 * Create a file manifest with chunk information
 * @param filename Original filename
 * @param chunks Array of chunk buffers
 * @returns An object with file metadata and chunk details
 */
export function createFileManifest(filename: string, chunks: Buffer[]) {
  const chunkHashes = hashChunks(chunks);
  const totalSize = chunks.reduce((size, chunk) => size + chunk.length, 0);
  
  return {
    filename,
    size: totalSize,
    created: new Date().toISOString(),
    chunks: chunkHashes.map((hash, index) => ({
      hash,
      size: chunks[index].length,
      index
    }))
  };
}

/**
 * Compress a chunk with LZ4 or Zstandard
 * (In this implementation, we'll return the buffer as-is,
 *  since we'd need LZ4 or Zstandard bindings)
 */
export function compressChunk(chunk: Buffer): Buffer {
  // In a real implementation, this would compress using LZ4 or Zstandard
  // return lz4.compress(chunk);
  return chunk;
}

/**
 * Decompress a chunk
 * (In this implementation, we'll return the buffer as-is)
 */
export function decompressChunk(compressedChunk: Buffer): Buffer {
  // In a real implementation, this would decompress using LZ4 or Zstandard
  // return lz4.decompress(compressedChunk);
  return compressedChunk;
} 