'use client';

import { useState, useEffect } from 'react';
import { ProgressUpdate } from '@/types';
import { X, Download, Music, Image, Video, Loader2 } from 'lucide-react';

interface ProgressPanelProps {
  progress: ProgressUpdate;
  coverId: string;
  onCancel?: () => void;
}

const pipelineStages = [
  { status: 'downloading', label: 'Download Audio', icon: Download, artifactKey: 'downloadedAudioId' },
  { status: 'generating_image', label: 'Generate Image', icon: Image, artifactKey: 'generatedImageId' },
  { status: 'cloning_voice_full', label: 'Clone Voice (Full)', icon: Music, artifactKey: 'generatedVocalsFullId' },
  { status: 'cloning_voice_isolated', label: 'Clone Voice (Isolated)', icon: Music, artifactKey: 'generatedVocalsIsolatedId' },
  { status: 'generating_video', label: 'Generate Video', icon: Video, artifactKey: 'generatedVideoId' },
  { status: 'stitching', label: 'Final Processing', icon: Loader2, artifactKey: null },
];

export default function ProgressPanel({ progress, coverId, onCancel }: ProgressPanelProps) {
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);
  const [artifactUrls, setArtifactUrls] = useState<Record<string, string>>({});

  // Calculate progress based on completed stages
  const currentStageIndex = pipelineStages.findIndex(stage => stage.status === progress.status);
  const stageProgress = currentStageIndex === -1 
    ? 0 
    : Math.round(((currentStageIndex + 1) / pipelineStages.length) * 100);

  // Load artifact URLs as they become available
  useEffect(() => {
    Object.entries(progress.artifacts).forEach(async ([key, artifactId]) => {
      if (artifactId && !artifactUrls[key]) {
        try {
          const response = await fetch(`/api/artifacts/${artifactId}`);
          if (response.ok) {
            const artifact = await response.json();
            setArtifactUrls(prev => ({ ...prev, [key]: artifact.url }));
          } else {
            console.error(`Failed to load artifact ${artifactId}: ${response.status}`);
          }
        } catch (error) {
          console.error(`Failed to load artifact ${artifactId}:`, error);
        }
      }
    });
  }, [progress.artifacts, artifactUrls]);

  const getArtifactPreview = (artifactKey: string) => {
    const url = artifactUrls[artifactKey];
    if (!url) return null;

    if (artifactKey === 'generatedImageId') {
      return (
        <img 
          src={url} 
          alt="Character preview" 
          className="w-full h-48 object-cover rounded-lg"
        />
      );
    }

    if (artifactKey.includes('Vocals') || artifactKey === 'downloadedAudioId') {
      return (
        <audio 
          controls 
          className="w-full"
          src={url}
        />
      );
    }

    if (artifactKey === 'generatedVideoId') {
      return (
        <video 
          controls 
          className="w-full rounded-lg"
          src={url}
        />
      );
    }

    return null;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-40">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <div>
              <h3 className="font-medium">Creating Your Cover</h3>
              <p className="text-sm text-muted">{progress.message}</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pipeline Progress */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {pipelineStages.map((stage, index) => {
            const Icon = stage.icon;
            const isCompleted = currentStageIndex > index;
            const isCurrent = currentStageIndex === index;
            const hasArtifact = stage.artifactKey && progress.artifacts[stage.artifactKey as keyof typeof progress.artifacts];

            return (
              <button
                key={stage.status}
                onClick={() => hasArtifact && setExpandedArtifact(
                  expandedArtifact === stage.artifactKey ? null : stage.artifactKey
                )}
                disabled={!hasArtifact}
                className={`
                  relative flex flex-col items-center p-3 rounded-lg transition-all
                  ${isCompleted ? 'bg-accent/20 text-accent' : ''}
                  ${isCurrent ? 'bg-accent/10 text-accent animate-pulse' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-muted/50 text-muted' : ''}
                  ${hasArtifact ? 'cursor-pointer hover:bg-accent/30' : 'cursor-default'}
                `}
              >
                <Icon className={`w-6 h-6 mb-1 ${isCurrent ? 'animate-spin' : ''}`} />
                <span className="text-xs text-center">{stage.label}</span>
                {hasArtifact && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Progress</span>
            <span>{stageProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-500"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
        </div>

        {/* Expanded Artifact Preview */}
        {expandedArtifact && artifactUrls[expandedArtifact] && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm">
                {pipelineStages.find(s => s.artifactKey === expandedArtifact)?.label} Preview
              </h4>
              <a
                href={artifactUrls[expandedArtifact]}
                download
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
            {getArtifactPreview(expandedArtifact)}
          </div>
        )}

        {/* Error State */}
        {progress.status === 'failed' && progress.error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{progress.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}