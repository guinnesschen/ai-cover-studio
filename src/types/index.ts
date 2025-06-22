// Frontend types that match our database schema
export interface Cover {
  id: string;
  youtubeUrl: string;
  character: string;
  imagePrompt?: string | null;
  
  // Processing state
  status: CoverStatus;
  progress: number;
  errorMessage?: string | null;
  
  // Metadata
  title?: string | null;
  artist?: string | null;
  duration?: number | null;
  
  // Final outputs
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  
  // Timestamps
  createdAt: string; // ISO string for JSON serialization
  completedAt?: string | null;
}

export interface Artifact {
  id: string;
  coverId: string;
  type: ArtifactType;
  url: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type CoverStatus = 
  | 'queued'
  | 'downloading'
  | 'generating_image'
  | 'cloning_voice_full'
  | 'cloning_voice_isolated' 
  | 'generating_video'
  | 'stitching'
  | 'completed'
  | 'failed';

export type ArtifactType = 
  | 'audio'
  | 'image'
  | 'vocals_full'
  | 'vocals_isolated'
  | 'video';

// API Response types
export interface CoverWithArtifacts extends Cover {
  artifacts: {
    downloadedAudioId?: string;
    generatedImageId?: string;
    generatedVocalsFullId?: string;
    generatedVocalsIsolatedId?: string;
    generatedVideoId?: string;
  };
}

export interface GalleryResponse {
  covers: Cover[];
  total: number;
  hasMore: boolean;
}

export interface ProgressUpdate {
  status: CoverStatus;
  progress: number;
  message: string;
  artifacts: {
    downloadedAudioId?: string;
    generatedImageId?: string;
    generatedVocalsFullId?: string;
    generatedVocalsIsolatedId?: string;
    generatedVideoId?: string;
  };
  error?: string;
}

// Form types
export interface CreateCoverFormData {
  youtubeUrl: string;
  character: string;
  imagePrompt: string;
}

// Character data
export interface Character {
  id: string;
  name: string;
  emoji: string;
  available: boolean;
  voiceModelUrl?: string;
  fluxFineTuneId?: string;
}

// Replicate webhook payload
export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: unknown;
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}