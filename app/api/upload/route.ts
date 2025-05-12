import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import clientPromise from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';
import { splitIntoChunks, hashChunks, createFileManifest, compressChunk } from '@/app/lib/chunking';

// Media paths
const MEDIA_ROOT = process.env.MEDIA_ROOT || '/storage/external-1/BitNestMedia';
const CHUNKS_PATH = path.join(MEDIA_ROOT, 'chunks');
const FILES_PATH = path.join(MEDIA_ROOT, 'files');

export async function POST(request: NextRequest) {
  try {
    // Check if request is multipart form data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const filePath = formData.get('path') as string || '/';

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Create necessary directories
    await mkdir(CHUNKS_PATH, { recursive: true });
    await mkdir(FILES_PATH, { recursive: true });
    await mkdir(path.join(FILES_PATH, userId, filePath), { recursive: true });

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Split file into chunks using content-defined chunking
    const chunks = splitIntoChunks(buffer);
    const chunkHashes = hashChunks(chunks);
    
    // Save each unique chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkHash = chunkHashes[i];
      const chunkPath = path.join(CHUNKS_PATH, `${chunkHash}.chunk`);
      
      try {
        // Check if chunk already exists
        await writeFile(chunkPath, await compressChunk(chunks[i]), { flag: 'wx' });
      } catch (error: any) {
        // If error is because file exists, that's fine - deduplicated chunk
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
    
    // Create file manifest
    const fileManifest = createFileManifest(file.name, chunks);
    const fileId = uuidv4();
    
    // Save manifest to database
    const client = await clientPromise;
    const db = client.db('bitnest');
    
    await db.collection('files').insertOne({
      _id: fileId,
      userId,
      name: file.name,
      path: filePath,
      size: fileManifest.size,
      created: new Date(),
      updated: new Date(),
      manifest: fileManifest.chunks.map(chunk => ({
        hash: chunk.hash,
        size: chunk.size,
        index: chunk.index
      }))
    });
    
    return NextResponse.json({ 
      success: true,
      fileId,
      name: file.name,
      size: fileManifest.size,
      chunks: fileManifest.chunks.length
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Handle upload status checks
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get('fileId');
  
  if (!fileId) {
    return NextResponse.json(
      { error: 'FileId is required' },
      { status: 400 }
    );
  }
  
  try {
    const client = await clientPromise;
    const db = client.db('bitnest');
    
    // Using string ID since we're using UUID not ObjectId
    const file = await db.collection('files').findOne({ _id: fileId });
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      fileId: file._id,
      name: file.name,
      size: file.size,
      path: file.path,
      created: file.created,
      updated: file.updated,
      chunks: file.manifest.length
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check file status' },
      { status: 500 }
    );
  }
} 