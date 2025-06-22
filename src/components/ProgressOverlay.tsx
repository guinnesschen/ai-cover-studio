'use client';

import { useEffect, useState } from 'react';
import { ProgressUpdate } from '@/types';

interface ProgressOverlayProps {
  progress: ProgressUpdate;
}

const loadingMessages = [
  '🎙️ Fine-tuning vocals...',
  '🖌️ Sketching the perfect frame...',
  '✨ Almost ready—just a moment.',
  '🎵 Harmonizing the melodies...',
  '🎬 Bringing your vision to life...',
];

export default function ProgressOverlay({ progress }: ProgressOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 15000); // Change message every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-card rounded-lg border border-border p-8 max-w-md w-full text-center">
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full spinner" />
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-sm text-muted mt-2">{progress.progress}%</p>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground">
          {progress.message || loadingMessages[messageIndex]}
        </p>

        {/* Status */}
        <p className="text-xs text-muted mt-2 capitalize">
          Status: {progress.status.replace(/_/g, ' ')}
        </p>

        {/* Show artifact hints */}
        {progress.artifacts.generatedImageId && !progress.artifacts.generatedVideoId && (
          <p className="text-xs text-muted mt-2">
            🖼️ Character portrait ready
          </p>
        )}
        {progress.artifacts.generatedVocalsFullId && !progress.artifacts.generatedVideoId && (
          <p className="text-xs text-muted mt-2">
            🎵 Vocals processed
          </p>
        )}
      </div>
    </div>
  );
}