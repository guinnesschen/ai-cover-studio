import { prisma } from '@/clients/prisma';
import { Cover, CoverStatus } from '@/types';
import { processNextStep } from '@/core/pipeline';

interface CreateCoverData {
  audioUrl: string;
  character: string;
  imagePrompt?: string;
  title?: string;
  artist?: string;
}

export class CoversService {
  // Create a new cover and start processing
  static async create(data: CreateCoverData): Promise<Cover> {
    const startTime = Date.now();
    console.log('[COVERS SERVICE] 🎬 Creating new cover - START', { 
      audioUrl: data.audioUrl, 
      character: data.character,
      hasImagePrompt: !!data.imagePrompt,
      title: data.title,
      artist: data.artist,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('[COVERS SERVICE] 💾 Creating cover record in database...');
      const cover = await prisma.cover.create({
        data: {
          audioUrl: data.audioUrl,
          character: data.character,
          imagePrompt: data.imagePrompt,
          title: data.title,
          artist: data.artist,
          status: 'in-progress',
          progress: 20, // Skip download step, start at 20%
        },
      });
      
      const dbTime = Date.now() - startTime;
      console.log('[COVERS SERVICE] ✅ Cover record created successfully', {
        coverId: cover.id,
        dbTime: `${dbTime}ms`,
        coverData: {
          id: cover.id,
          audioUrl: cover.audioUrl,
          character: cover.character,
          status: cover.status,
          progress: cover.progress,
          createdAt: cover.createdAt.toISOString()
        }
      });

      // Since we already have the audio file uploaded, we'll create an audio artifact directly
      console.log('[COVERS SERVICE] 💾 Creating audio artifact...');
      await prisma.artifact.create({
        data: {
          coverId: cover.id,
          type: 'audio',
          url: data.audioUrl,
        },
      });

      // Trigger parallel processing for voice cloning and image generation (fire and forget)
      console.log('[COVERS SERVICE] 🚀 Starting parallel processing pipeline...');
      console.log('[COVERS SERVICE] 🎤 Triggering voice cloning steps...');
      console.log('[COVERS SERVICE] 🖼️ Triggering image generation step...');
      
      Promise.all([
        processNextStep(cover.id, 'cloning_voice_full'),
        processNextStep(cover.id, 'cloning_voice_isolated'),
        processNextStep(cover.id, 'generating_image')
      ]).then(() => {
        console.log('[COVERS SERVICE] ✅ Both pipeline steps initiated successfully', {
          coverId: cover.id,
          totalTime: `${Date.now() - startTime}ms`
        });
      }).catch(async (error) => {
        console.error('[COVERS SERVICE] ❌ PIPELINE INITIATION FAILED', {
          coverId: cover.id,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          totalTime: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        });
        
        // Update cover with error
        try {
          console.log('[COVERS SERVICE] 🔄 Updating cover status to failed...');
          await this.updateStatus(cover.id, 'failed', { 
            errorMessage: `Failed to start processing: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
          console.log('[COVERS SERVICE] ✅ Cover status updated to failed');
        } catch (updateError) {
          console.error('[COVERS SERVICE] ❌ CRITICAL: Failed to update cover status', {
            coverId: cover.id,
            updateError: updateError instanceof Error ? updateError.message : updateError,
            originalError: error instanceof Error ? error.message : error
          });
        }
      });

      const totalTime = Date.now() - startTime;
      console.log('[COVERS SERVICE] 🎉 Cover creation completed', {
        coverId: cover.id,
        totalTime: `${totalTime}ms`,
        status: 'pipeline_initiated'
      });

      return this.toDto(cover);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('[COVERS SERVICE] ❌ COVER CREATION FAILED', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        totalTime: `${totalTime}ms`,
        inputData: data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
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
    youtubeUrl: string | null;
    audioUrl: string | null;
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