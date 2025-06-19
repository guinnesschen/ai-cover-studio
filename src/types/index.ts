export interface Cover {
  id: string;
  videoUrl: string;
  title: string;
  character: string;
  createdAt: string;
}

export interface JobProgress {
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  outputUrl?: string;
  title?: string;
  character?: string;
  error?: string;
}

export interface CreateCoverFormData {
  youtubeUrl: string;
  character: string;
  imagePrompt: string;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  voiceModelUrl?: string;
  fluxFineTuneId?: string;
}