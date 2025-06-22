import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/clients/prisma';
import { ProgressUpdate, CoverStatus } from '@/types';

// GET /api/covers/[id]/progress - Get current progress (for polling)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cover = await prisma.cover.findUnique({
      where: { id },
      include: {
        artifacts: {
          select: {
            id: true,
            type: true,
            url: true,
            replicateId: true,
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

    // Build progress update
    const update: ProgressUpdate = {
      status: cover.status as CoverStatus,
      progress: cover.progress,
      message: getStatusMessage(cover.status, cover.artifacts),
      artifacts: {
        downloadedAudioId: cover.artifacts.find(a => a.type === 'audio')?.id,
        generatedImageId: cover.artifacts.find(a => a.type === 'image')?.id,
        generatedVocalsFullId: cover.artifacts.find(a => a.type === 'vocals_full')?.id,
        generatedVocalsIsolatedId: cover.artifacts.find(a => a.type === 'vocals_isolated')?.id,
        generatedVideoId: cover.artifacts.find(a => a.type === 'video')?.id,
      },
      error: cover.errorMessage || undefined,
    };

    return NextResponse.json(update);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string, artifacts: { type: string; url?: string | null; replicateId?: string | null }[]): string {
  // Same logic as before
  if (status === 'completed') return 'Your cover is ready!';
  if (status === 'failed') return 'Something went wrong';
  
  const completedArtifacts = new Set(
    artifacts.filter(a => a.url).map(a => a.type)
  );
  
  const inProgressArtifacts = new Set(
    artifacts.filter(a => !a.url && a.replicateId).map(a => a.type)
  );
  
  const messages: string[] = [];
  
  if (!completedArtifacts.has('audio') && !inProgressArtifacts.has('audio')) {
    messages.push('Downloading audio from YouTube');
  }
  if (!completedArtifacts.has('image') && inProgressArtifacts.has('image')) {
    messages.push('Creating character portrait');
  }
  if (completedArtifacts.has('audio')) {
    if (!completedArtifacts.has('vocals_full') && inProgressArtifacts.has('vocals_full')) {
      messages.push('Cloning voice with full mix');
    }
    if (!completedArtifacts.has('vocals_isolated') && inProgressArtifacts.has('vocals_isolated')) {
      messages.push('Isolating vocals');
    }
  }
  if (completedArtifacts.has('image') && completedArtifacts.has('vocals_isolated')) {
    if (!completedArtifacts.has('video') && inProgressArtifacts.has('video')) {
      messages.push('Animating your performance');
    }
  }
  if (completedArtifacts.has('video') && completedArtifacts.has('vocals_full')) {
    messages.push('Finalizing your cover');
  }
  
  return messages.length > 0 ? messages.join(' • ') : 'Processing...';
}