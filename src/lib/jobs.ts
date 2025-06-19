import { JobProgress } from '@/types';

// Simple in-memory store for MVP
// In production, this would be Redis/Upstash
interface JobData {
  youtubeUrl: string;
  character: string;
  imagePrompt?: string;
}

class JobStore {
  private jobs: Map<string, JobProgress & { data?: JobData }> = new Map();
  private listeners: Map<string, ((progress: JobProgress) => void)[]> = new Map();

  create(jobId: string, data: JobData) {
    this.jobs.set(jobId, {
      status: 'queued',
      progress: 0,
      data,
    });
    this.emit(jobId);
  }

  update(jobId: string, updates: Partial<JobProgress>) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    Object.assign(job, updates);
    this.emit(jobId);
  }

  get(jobId: string) {
    return this.jobs.get(jobId);
  }

  subscribe(jobId: string, callback: (progress: JobProgress) => void) {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, []);
    }
    this.listeners.get(jobId)!.push(callback);

    // Send current state immediately
    const job = this.jobs.get(jobId);
    if (job) {
      callback(job);
    }

    return () => {
      const listeners = this.listeners.get(jobId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private emit(jobId: string) {
    const job = this.jobs.get(jobId);
    const listeners = this.listeners.get(jobId);
    
    if (job && listeners) {
      const { ...progress } = job;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (progress as any).data;
      listeners.forEach(callback => callback(progress));
    }
  }
}

export const jobStore = new JobStore();