'use client';

import { useState, useEffect } from 'react';
import CreateCoverForm from '@/components/CreateCoverForm';
import Gallery from '@/components/Gallery';
import VideoPlayer from '@/components/VideoPlayer';
import ProgressPanel from '@/components/ProgressPanel';
import { Cover, ProgressUpdate, GalleryResponse } from '@/types';

const CURRENT_JOB_KEY = 'vivid-cover-current-job';

export default function Home() {
  const [covers, setCovers] = useState<Cover[]>([]);
  const [currentCoverId, setCurrentCoverId] = useState<string | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [selectedCover, setSelectedCover] = useState<Cover | null>(null);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);

  // Load gallery and check for existing job on mount
  useEffect(() => {
    loadGallery();
    
    // Check localStorage for existing job (only in browser)
    if (typeof window !== 'undefined' && window.localStorage) {
      const existingJobId = localStorage.getItem(CURRENT_JOB_KEY);
      if (existingJobId) {
        // Verify the job still exists and isn't completed
        fetch(`/api/covers/${existingJobId}`)
          .then(res => res.json())
          .then(cover => {
            if (cover && cover.status !== 'completed' && cover.status !== 'failed') {
              setCurrentCoverId(existingJobId);
            } else {
              localStorage.removeItem(CURRENT_JOB_KEY);
            }
          })
          .catch(() => {
            localStorage.removeItem(CURRENT_JOB_KEY);
          });
      }
    }
  }, []);

  // Poll for progress updates
  useEffect(() => {
    if (!currentCoverId) return;

    let intervalId: NodeJS.Timeout;
    let isActive = true;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/covers/${currentCoverId}/progress`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }

        const data: ProgressUpdate = await response.json();
        
        if (isActive) {
          setProgressUpdate(data);

          if (data.status === 'completed') {
            // Stop polling and clean up
            clearInterval(intervalId);
            loadGallery();
            setCurrentCoverId(null);
            setProgressUpdate(null);
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.removeItem(CURRENT_JOB_KEY);
            }
          } else if (data.status === 'failed') {
            // Stop polling and clean up
            clearInterval(intervalId);
            console.error('Cover generation failed:', data.error);
            setCurrentCoverId(null);
            setProgressUpdate(null);
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.removeItem(CURRENT_JOB_KEY);
            }
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        // Don't clear state on network errors - just keep trying
      }
    };

    // Poll immediately
    pollProgress();

    // Then poll every 2 seconds
    intervalId = setInterval(pollProgress, 2000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [currentCoverId]);

  const loadGallery = async () => {
    try {
      setIsLoadingGallery(true);
      const response = await fetch('/api/covers?limit=20');
      const data: GalleryResponse = await response.json();
      setCovers(data.covers);
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleCreateCover = async (coverId: string) => {
    setCurrentCoverId(coverId);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CURRENT_JOB_KEY, coverId);
    }
  };

  const handleSelectCover = async (cover: Cover) => {
    // If cover doesn't have full details, fetch them
    if (!cover.videoUrl && cover.status === 'completed') {
      try {
        const response = await fetch(`/api/covers/${cover.id}`);
        const fullCover = await response.json();
        setSelectedCover(fullCover);
      } catch (error) {
        console.error('Failed to load cover details:', error);
        setSelectedCover(cover);
      }
    } else {
      setSelectedCover(cover);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold">🎙️ Vivid Cover Studio</h1>
          <p className="text-sm text-muted mt-1">
            Create AI-powered character covers of your favorite songs
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
                disabled={!!currentCoverId}
              />
            </div>

          </div>

          {/* Right: Gallery */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Community Gallery</h2>
              <button 
                onClick={loadGallery}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Refresh
              </button>
            </div>
            {isLoadingGallery ? (
              <div className="text-center py-8 text-muted">Loading covers...</div>
            ) : (
              <Gallery 
                covers={covers} 
                onSelect={handleSelectCover}
              />
            )}
          </div>
        </div>
      </main>

      {/* Progress Panel - Fixed at bottom */}
      {currentCoverId && progressUpdate && (
        <ProgressPanel 
          progress={progressUpdate} 
          onCancel={() => {
            setCurrentCoverId(null);
            setProgressUpdate(null);
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.removeItem(CURRENT_JOB_KEY);
            }
          }}
        />
      )}

      {/* Selected Cover Modal */}
      {selectedCover && selectedCover.videoUrl && (
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