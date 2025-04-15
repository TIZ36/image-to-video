import { NextRequest, NextResponse } from 'next/server';

// In a real application, this would be a database or cache
const videoStatusStorage: Record<string, {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  url?: string;
  error?: string;
  createdAt: Date;
}> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Check if we have this video in our "database"
    if (!videoStatusStorage[videoId]) {
      // For demo purposes, initialize a new video processing entry
      videoStatusStorage[videoId] = {
        status: 'processing',
        progress: 0,
        createdAt: new Date()
      };
    }

    // Get the current status
    const videoStatus = videoStatusStorage[videoId];
    const elapsedSeconds = (new Date().getTime() - videoStatus.createdAt.getTime()) / 1000;

    // Simulate progress based on elapsed time (for demo purposes)
    if (videoStatus.status === 'processing') {
      // Simulate 20 seconds to complete
      const progress = Math.min(elapsedSeconds / 20 * 100, 100);
      
      if (progress >= 100) {
        // 5% chance of failure for demo purposes
        if (Math.random() < 0.05) {
          videoStatus.status = 'failed';
          videoStatus.error = 'Video processing failed due to server error';
        } else {
          videoStatus.status = 'completed';
          videoStatus.url = `/api/static/sample-video.mp4`; // In a real app, this would be a real URL
        }
      } else {
        videoStatus.progress = progress;
      }
    }

    // Update our "database"
    videoStatusStorage[videoId] = videoStatus;

    return NextResponse.json({
      videoId,
      status: videoStatus.status,
      ...(videoStatus.url && { url: videoStatus.url }),
      ...(videoStatus.error && { error: videoStatus.error })
    }, { status: 200 });
  } catch (error) {
    console.error('Video status check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check video status' 
    }, { status: 500 });
  }
} 