import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CoverWithArtifacts, CoverStatus } from '@/types';

// GET /api/covers/[id] - Get specific cover with artifacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get cover with artifacts
    const cover = await prisma.cover.findUnique({
      where: { id },
      include: {
        artifacts: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    });

    if (!cover) {
      return NextResponse.json(
        { error: 'Cover not found' },
        { status: 404 }
      );
    }

    // Map artifacts to the expected format
    const artifactIds = {
      downloadedAudioId: cover.artifacts.find(a => a.type === 'audio')?.id,
      generatedImageId: cover.artifacts.find(a => a.type === 'image')?.id,
      generatedVocalsFullId: cover.artifacts.find(a => a.type === 'vocals_full')?.id,
      generatedVocalsIsolatedId: cover.artifacts.find(a => a.type === 'vocals_isolated')?.id,
      generatedVideoId: cover.artifacts.find(a => a.type === 'video')?.id,
    };

    // Format response
    const response: CoverWithArtifacts = {
      id: cover.id,
      youtubeUrl: cover.youtubeUrl,
      character: cover.character,
      imagePrompt: cover.imagePrompt,
      status: cover.status as CoverStatus,
      progress: cover.progress,
      errorMessage: cover.errorMessage,
      title: cover.title,
      artist: cover.artist,
      duration: cover.duration,
      videoUrl: cover.videoUrl,
      thumbnailUrl: cover.thumbnailUrl,
      createdAt: cover.createdAt.toISOString(),
      completedAt: cover.completedAt?.toISOString() || null,
      artifacts: artifactIds,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching cover:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover' },
      { status: 500 }
    );
  }
}