import { NextRequest, NextResponse } from 'next/server';
import { CoversService } from '@/services/covers';

// POST /api/covers - Create a new cover
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let coverId: string | null = null;
  
  try {
    console.log('[API] POST /api/covers - Cover creation started');
    
    const body = await request.json();
    const { youtubeUrl, character, imagePrompt } = body;
    
    console.log('[API] Request data:', { youtubeUrl, character, hasImagePrompt: !!imagePrompt });

    // Basic validation
    if (!youtubeUrl || !character) {
      console.warn('[API] Missing required fields:', { youtubeUrl: !!youtubeUrl, character: !!character });
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
        console.warn('[API] Invalid YouTube URL format:', youtubeUrl);
        return NextResponse.json(
          { error: 'Invalid YouTube URL' },
          { status: 400 }
        );
      }
    } catch (urlError) {
      console.warn('[API] URL parsing failed:', urlError);
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create cover and start processing
    console.log('[API] Creating cover...');
    const cover = await CoversService.create({
      youtubeUrl,
      character,
      imagePrompt,
    });
    
    coverId = cover.id;
    const duration = Date.now() - startTime;
    console.log(`[API] Cover created successfully: ${cover.id} (took ${duration}ms)`);

    return NextResponse.json({ coverId: cover.id });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[API] Error creating cover:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      coverId,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create cover',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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