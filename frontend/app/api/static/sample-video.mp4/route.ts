import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // In a real application, this would serve a real video file
  // For this demo, we're redirecting to a sample video from a public CDN
  
  // Redirect to a royalty-free sample video
  return NextResponse.redirect('https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4');
} 