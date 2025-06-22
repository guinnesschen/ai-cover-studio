import { NextRequest, NextResponse } from 'next/server';
import { CoversService } from '@/services/covers';

// POST /api/covers - Create a new cover
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, character, imagePrompt } = body;

    // Basic validation
    if (!youtubeUrl || !character) {
      return NextResponse.json(
        { error: 'Missing required fields: youtubeUrl and character' },
        { status: 400 }
      );
    }

    // Validate YouTube URL format
    try {
      const url = new URL(youtubeUrl);
      const isValidYouTube = 
        (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com' || url.hostname === 'youtu.be') &&
        (url.pathname.includes('/watch') || url.hostname === 'youtu.be');
      
      if (!isValidYouTube) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create cover and start processing
    const cover = await CoversService.create({
      youtubeUrl,
      character,
      imagePrompt,
    });

    return NextResponse.json({ coverId: cover.id });
  } catch (error) {
    console.error('Error creating cover:', error);
    return NextResponse.json(
      { error: 'Failed to create cover' },
      { status: 500 }
    );
  }
}

// GET /api/covers - Get gallery of completed covers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    const response = await CoversService.findAll(limit, offset);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching covers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch covers' },
      { status: 500 }
    );
  }
}