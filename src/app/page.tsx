'use client';

import { useState, useEffect } from 'react';
import CreateCoverForm from '@/components/CreateCoverForm';
import Gallery from '@/components/Gallery';
import VideoPlayer from '@/components/VideoPlayer';
import ProgressOverlay from '@/components/ProgressOverlay';
import { Cover, ProgressUpdate, GalleryResponse } from '@/types';

export default function Home() {
  const [covers, setCovers] = useState<Cover[]>([]);
  const [currentCoverId, setCurrentCoverId] = useState<string | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [selectedCover, setSelectedCover] = useState<Cover | null>(null);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);

  // Load gallery on mount
  useEffect(() => {
    loadGallery();
  }, []);

  // Subscribe to progress updates
  useEffect(() => {
    if (!currentCoverId) return;

    const eventSource = new EventSource(`/api/covers/${currentCoverId}/stream`);

    eventSource.onmessage = (event) => {
      const data: ProgressUpdate = JSON.parse(event.data);
      setProgressUpdate(data);

      if (data.status === 'completed') {
        // Reload gallery to show new cover
        loadGallery();
        setCurrentCoverId(null);
        setProgressUpdate(null);
      } else if (data.status === 'failed') {
        console.error('Cover generation failed:', data.error);
        setCurrentCoverId(null);
        setProgressUpdate(null);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setCurrentCoverId(null);
      setProgressUpdate(null);
    };

    return () => {
      eventSource.close();
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

            {/* Progress or Latest Cover */}
            {currentCoverId && progressUpdate && (
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-md font-medium mb-3">Creating Your Cover</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progressUpdate.message}</span>
                    <span>{progressUpdate.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressUpdate.progress}%` }}
                    />
                  </div>
                  
                  {/* Show artifacts as they become available */}
                  {progressUpdate.artifacts.generatedImageId && (
                    <div className="mt-4">
                      <p className="text-sm text-muted mb-2">Preview:</p>
                      {/* You could load and display the image artifact here */}
                    </div>
                  )}
                </div>
              </div>
            )}
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

      {/* Progress Overlay */}
      {currentCoverId && progressUpdate && (
        <ProgressOverlay progress={progressUpdate} />
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