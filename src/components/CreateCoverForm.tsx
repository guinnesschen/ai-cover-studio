'use client';

import { useState } from 'react';
import { CreateCoverFormData } from '@/types';
import { characters } from '@/data/characters';

interface CreateCoverFormProps {
  onSubmit: (coverId: string) => void;
  disabled?: boolean;
}

export default function CreateCoverForm({ onSubmit, disabled }: CreateCoverFormProps) {
  const [formData, setFormData] = useState<CreateCoverFormData>({
    youtubeUrl: '',
    character: 'squidward',
    imagePrompt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create cover');
      }

      onSubmit(data.coverId);
      
      // Reset form
      setFormData({
        youtubeUrl: '',
        character: 'squidward',
        imagePrompt: '',
      });
    } catch (error) {
      console.error('Error creating cover:', error);
      alert(error instanceof Error ? error.message : 'Failed to create cover');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCharacter = characters.find(c => c.id === formData.character);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* YouTube URL Input */}
      <div>
        <label htmlFor="youtube-url" className="block text-sm font-medium mb-2">
          🔗 Link (YouTube or Audio)
        </label>
        <input
          id="youtube-url"
          type="url"
          value={formData.youtubeUrl}
          onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          required
          disabled={isSubmitting || disabled}
        />
      </div>

      {/* Character Selection */}
      <div>
        <label htmlFor="character" className="block text-sm font-medium mb-2">
          🎭 Choose character
        </label>
        <select
          id="character"
          value={formData.character}
          onChange={(e) => setFormData({ ...formData, character: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          disabled={isSubmitting || disabled}
        >
          {characters.filter(c => c.available).map((character) => (
            <option key={character.id} value={character.id}>
              {character.name} {character.emoji}
            </option>
          ))}
        </select>
      </div>

      {/* Image Prompt */}
      <div>
        <label htmlFor="image-prompt" className="block text-sm font-medium mb-2">
          🖼️ Image prompt
        </label>
        <input
          id="image-prompt"
          type="text"
          value={formData.imagePrompt}
          onChange={(e) => setFormData({ ...formData, imagePrompt: e.target.value })}
          placeholder={`${selectedCharacter?.name || 'Character'} performing soulful jazz`}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          disabled={isSubmitting || disabled}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="w-full py-2.5 px-4 bg-accent text-white rounded-lg font-medium hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
            Creating...
          </span>
        ) : disabled ? (
          'Another cover is being processed...'
        ) : (
          'Create ✨'
        )}
      </button>
      
      {/* Info message when disabled */}
      {disabled && !isSubmitting && (
        <p className="text-sm text-muted text-center">
          You can only create one cover at a time. Check the progress below.
        </p>
      )}
    </form>
  );
}