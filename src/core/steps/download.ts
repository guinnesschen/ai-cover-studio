import { prisma } from '@/clients/prisma';
import { downloadYouTubeAudio } from '@/utils/youtube';
import { uploadFile } from '@/clients/storage';

type CoverWithArtifacts = {
  id: string;
  youtubeUrl: string;
  title?: string | null;
  artist?: string | null;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function downloadAudio(cover: CoverWithArtifacts) {
  console.log(`[Download] Starting audio download for cover ${cover.id}`);
  
  try {
    // Download audio from YouTube
    const audioPath = await downloadYouTubeAudio(cover.youtubeUrl, cover.id);
    console.log(`[Download] Downloaded audio to: ${audioPath}`);
    
    // Get the actual file extension from the downloaded file
    const fileExtension = audioPath.split('.').pop() || 'webm';
    console.log(`[Download] File extension: ${fileExtension}`);
    
    // Upload to storage with correct extension
    const audioUrl = await uploadFile(audioPath, `${cover.id}/audio.${fileExtension}`);
    console.log(`[Download] Uploaded audio to: ${audioUrl}`);
    
    // Save audio artifact
    await prisma.artifact.create({
      data: {
        coverId: cover.id,
        type: 'audio',
        url: audioUrl,
      },
    });
    console.log(`[Download] Saved audio artifact to database`);

    // Update cover metadata
    await prisma.cover.update({
      where: { id: cover.id },
      data: {
        progress: 20,
        title: cover.title || `Cover ${new Date().toLocaleDateString()}`,
        artist: cover.artist || 'Unknown Artist',
      },
    });
    console.log(`[Download] Updated cover progress to 20%`);

    // Trigger voice cloning tasks in parallel
    const { processNextStep } = await import('@/core/pipeline');
    
    // Start voice cloning (both full and isolated) in parallel
    // Note: image generation is already started in parallel with download
    await Promise.all([
      processNextStep(cover.id, 'cloning_voice_full'),
      processNextStep(cover.id, 'cloning_voice_isolated'),
    ]);
    
  } catch (error) {
    console.error(`[Download] Failed for cover ${cover.id}:`, error);
    
    // Update cover with error status
    await prisma.cover.update({
      where: { id: cover.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown download error',
      },
    });
    
    throw error;
  }
}