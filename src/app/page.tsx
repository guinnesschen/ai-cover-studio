'use client';

import { useState, useEffect } from 'react';
import CreateCoverForm from '@/components/CreateCoverForm';
import Gallery from '@/components/Gallery';
import VideoPlayer from '@/components/VideoPlayer';
import ProgressOverlay from '@/components/ProgressOverlay';
import { Cover, JobProgress } from '@/types';

export default function Home() {
  const [covers, setCovers] = useState<Cover[]>([]);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [latestCover, setLatestCover] = useState<Cover | null>(null);
  const [selectedCover, setSelectedCover] = useState<Cover | null>(null);

  // Load covers from localStorage on mount
  useEffect(() => {
    const savedCovers = localStorage.getItem('vividCovers');
    if (savedCovers) {
      setCovers(JSON.parse(savedCovers));
    }
  }, []);

  // Save covers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('vividCovers', JSON.stringify(covers));
  }, [covers]);

  // Subscribe to job progress updates
  useEffect(() => {
    if (!currentJob) return;

    const eventSource = new EventSource(`/api/covers/${currentJob}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setJobProgress(data);

      if (data.status === 'completed' && data.outputUrl) {
        const newCover: Cover = {
          id: currentJob,
          videoUrl: data.outputUrl,
          title: data.title || 'Untitled Cover',
          character: data.character || 'Unknown',
          createdAt: new Date().toISOString(),
        };

        setLatestCover(newCover);
        setCovers((prev) => [newCover, ...prev]);
        setCurrentJob(null);
        setJobProgress(null);
      } else if (data.status === 'error') {
        console.error('Job failed:', data.error);
        setCurrentJob(null);
        setJobProgress(null);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setCurrentJob(null);
      setJobProgress(null);
    };

    return () => {
      eventSource.close();
    };
  }, [currentJob]);

  const handleCreateCover = async (jobId: string) => {
    setCurrentJob(jobId);
    setLatestCover(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold">🎙️ Vivid Cover Studio</h1>
          <p className="text-sm text-muted mt-1">
            A cozy digital studio to craft playful character song covers effortlessly.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Create Form */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-medium mb-4">Create a Cover</h2>
              <CreateCoverForm 
                onSubmit={handleCreateCover} 
                disabled={!!currentJob}
              />
            </div>

            {/* Latest Cover Display */}
            {latestCover && !currentJob && (
              <div className="bg-card rounded-lg border border-border p-6 fade-in">
                <VideoPlayer cover={latestCover} />
              </div>
            )}
          </div>

          {/* Right: Gallery */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-medium mb-4">Your Gallery</h2>
            <Gallery 
              covers={covers} 
              onSelect={setSelectedCover}
            />
          </div>
        </div>
      </main>

      {/* Progress Overlay */}
      {currentJob && jobProgress && (
        <ProgressOverlay progress={jobProgress} />
      )}

      {/* Selected Cover Modal */}
      {selectedCover && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedCover(null)}
        >
          <div 
            className="bg-card rounded-lg border border-border p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPlayer cover={selectedCover} />
            <button
              onClick={() => setSelectedCover(null)}
              className="mt-4 text-sm text-muted hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}