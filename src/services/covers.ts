import { prisma } from '@/clients/prisma';
import { Cover, CoverStatus } from '@/types';
import { processNextStep } from '@/core/pipeline';

interface CreateCoverData {
  youtubeUrl: string;
  character: string;
  imagePrompt?: string;
}

export class CoversService {
  // Create a new cover and start processing
  static async create(data: CreateCoverData): Promise<Cover> {
    console.log('[CoversService] Creating new cover:', { 
      youtubeUrl: data.youtubeUrl, 
      character: data.character,
      hasImagePrompt: !!data.imagePrompt
    });
    
    const cover = await prisma.cover.create({
      data: {
        ...data,
        status: 'in-progress',
      },
    });
    
    console.log(`[CoversService] Cover created: ${cover.id}`);

    // Trigger parallel processing for download and image generation (fire and forget)
    Promise.all([
      processNextStep(cover.id, 'downloading'),
      processNextStep(cover.id, 'generating_image')
    ]).catch(async (error) => {
      console.error(`[CoversService] Failed to start processing for cover ${cover.id}:`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Update cover with error
      try {
        await this.updateStatus(cover.id, 'failed', { 
          errorMessage: `Failed to start processing: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
        console.log(`[CoversService] Updated cover ${cover.id} status to failed`);
      } catch (updateError) {
        console.error(`[CoversService] Failed to update cover ${cover.id} status:`, updateError);
      }
    });

    return this.toDto(cover);
  }

  // Get a single cover with its artifacts
  static async findById(id: string) {
    const cover = await prisma.cover.findUnique({
      where: { id },
      include: { artifacts: true },
    });

    if (!cover) return null;

    // Group artifacts by type for easier access
    const artifactsByType = cover.artifacts.reduce((acc, artifact) => {
      acc[artifact.type] = artifact;
      return acc;
    }, {} as Record<string, { id: string; type: string }>);

    return {
      ...this.toDto(cover),
      artifacts: {
        downloadedAudioId: artifactsByType.audio?.id,
        generatedImageId: artifactsByType.image?.id,
        generatedVocalsFullId: artifactsByType.vocals_full?.id,
        generatedVocalsIsolatedId: artifactsByType.vocals_isolated?.id,
        generatedVideoId: artifactsByType.video?.id,
      },
    };
  }

  // Get gallery of completed covers
  static async findAll(limit = 12, offset = 0) {
    const [covers, total] = await Promise.all([
      prisma.cover.findMany({
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          character: true,
          status: true,
          title: true,
          artist: true,
          videoUrl: true,
          thumbnailUrl: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.cover.count({
        where: { status: 'completed' },
      }),
    ]);

    return {
      covers: covers.map(cover => ({
        ...cover,
        status: cover.status as CoverStatus,
        createdAt: cover.createdAt.toISOString(),
        completedAt: cover.completedAt?.toISOString() || null,
        // Set defaults for missing fields
        youtubeUrl: '',
        imagePrompt: null,
        progress: 100,
        errorMessage: null,
        duration: null,
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  // Get a single artifact by ID
  static async findArtifactById(id: string) {
    const artifact = await prisma.artifact.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        url: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!artifact) return null;

    return {
      id: artifact.id,
      type: artifact.type,
      url: artifact.url,
      metadata: artifact.metadata,
      createdAt: artifact.createdAt.toISOString(),
    };
  }

  // Update cover status and optional fields
  static async updateStatus(
    id: string, 
    status: CoverStatus, 
    updates?: Partial<Cover>
  ) {
    return prisma.cover.update({
      where: { id },
      data: {
        status,
        ...updates,
        completedAt: status === 'completed' ? new Date() : undefined,
      },
    });
  }

  // Convert DB entity to DTO with proper date handling
  private static toDto(cover: {
    id: string;
    youtubeUrl: string;
    character: string;
    imagePrompt: string | null;
    status: string;
    progress: number;
    errorMessage: string | null;
    title: string | null;
    artist: string | null;
    duration: number | null;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }): Cover {
    return {
      ...cover,
      status: cover.status as CoverStatus,
      createdAt: cover.createdAt.toISOString(),
      completedAt: cover.completedAt?.toISOString() || null,
    };
  }
}