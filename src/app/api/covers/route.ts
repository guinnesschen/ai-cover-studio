import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processNextStep } from '@/lib/pipeline';
import { GalleryResponse } from '@/types';

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

    // Create cover record in database
    const cover = await prisma.cover.create({
      data: {
        youtubeUrl,
        character,
        imagePrompt,
        status: 'downloading', // Start with downloading status
      },
    });

    // Trigger pipeline processing (fire and forget)
    processNextStep(cover.id).catch((error) => {
      console.error(`Failed to process cover ${cover.id}:`, error);
      // Update cover status to failed
      prisma.cover.update({
        where: { id: cover.id },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Processing failed',
        },
      }).catch(console.error);
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get total count of completed covers
    const total = await prisma.cover.count({
      where: { status: 'completed' },
    });

    // Get covers with pagination
    const covers = await prisma.cover.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        youtubeUrl: true,
        character: true,
        imagePrompt: true,
        status: true,
        progress: true,
        errorMessage: true,
        title: true,
        artist: true,
        duration: true,
        videoUrl: true,
        thumbnailUrl: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const response: GalleryResponse = {
      covers: covers.map(cover => ({
        ...cover,
        createdAt: cover.createdAt.toISOString(),
        completedAt: cover.completedAt?.toISOString() || null,
      })),
      total,
      hasMore: offset + limit < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching covers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch covers' },
      { status: 500 }
    );
  }
}