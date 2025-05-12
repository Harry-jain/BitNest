import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import clientPromise from '@/app/lib/mongodb';
import { ObjectId } from 'mongodb';

// Media paths
const MEDIA_ROOT = process.env.MEDIA_ROOT || '/storage/external-1/BitNestMedia';
const HLS_PATH = path.join(MEDIA_ROOT, 'streaming');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const segmentPath = searchParams.get('segment');
    const quality = searchParams.get('quality') || '720p';
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'VideoId is required' },
        { status: 400 }
      );
    }
    
    // Get video info from database
    const client = await clientPromise;
    const db = client.db('bitnest');
    
    // Convert string ID to ObjectId for MongoDB
    const video = await db.collection('videos').findOne({ _id: new ObjectId(videoId) });
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // If a segment is requested, serve it
    if (segmentPath) {
      // Security check - ensure path doesn't contain '..' to prevent directory traversal
      if (segmentPath.includes('..')) {
        return NextResponse.json(
          { error: 'Invalid segment path' },
          { status: 400 }
        );
      }
      
      const fullPath = path.join(HLS_PATH, video.streamingPath, quality, segmentPath);
      
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json(
          { error: 'Segment not found' },
          { status: 404 }
        );
      }
      
      const segment = await fsPromises.readFile(fullPath);
      
      // Return the segment file with appropriate headers
      const response = new NextResponse(segment);
      response.headers.set('Content-Type', segmentPath.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
      response.headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for a year
      
      return response;
    }
    
    // If no segment specified, return the master playlist
    const masterPlaylistPath = path.join(HLS_PATH, video.streamingPath, 'master.m3u8');
    
    if (!fs.existsSync(masterPlaylistPath)) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }
    
    const playlist = await fsPromises.readFile(masterPlaylistPath, 'utf-8');
    
    // Return the playlist with appropriate headers
    const response = new NextResponse(playlist);
    response.headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    response.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for an hour
    
    return response;
    
  } catch (error) {
    console.error('Streaming error:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}

// Handle video process requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'VideoId is required' },
        { status: 400 }
      );
    }
    
    // Get video info from database
    const client = await clientPromise;
    const db = client.db('bitnest');
    
    // Convert string ID to ObjectId for MongoDB
    const video = await db.collection('videos').findOne({ _id: new ObjectId(videoId) });
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, this would start a background job
    // to process the video for streaming using our media-processor.ts utility
    
    // For this example, we'll just update the status in the database
    await db.collection('videos').updateOne(
      { _id: new ObjectId(videoId) },
      { 
        $set: { 
          status: 'processing',
          processingStarted: new Date()
        }
      }
    );
    
    return NextResponse.json({
      success: true,
      videoId,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Processing request error:', error);
    return NextResponse.json(
      { error: 'Failed to process video request' },
      { status: 500 }
    );
  }
} 