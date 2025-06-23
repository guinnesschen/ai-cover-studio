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
    audioFile: null,
    character: 'squidward',
    imagePrompt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, audioFile: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || disabled || !formData.audioFile) return;

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('audioFile', formData.audioFile);
      uploadData.append('character', formData.character);
      uploadData.append('imagePrompt', formData.imagePrompt);

      const response = await fetch('/api/covers', {
        method: 'POST',
        body: uploadData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create cover');
      }

      onSubmit(data.coverId);
      
      // Reset form
      setFormData({
        audioFile: null,
        character: 'squidward',
        imagePrompt: '',
      });
      
      // Reset file input
      const fileInput = document.getElementById('audio-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
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
      {/* Audio File Input */}
      <div>
        <label htmlFor="audio-file" className="block text-sm font-medium mb-2">
          🎵 Audio File
        </label>
        <input
          id="audio-file"
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent file:text-white hover:file:bg-accent-light"
          required
          disabled={isSubmitting || disabled}
        />
        {formData.audioFile && (
          <p className="mt-2 text-sm text-muted">
            Selected: {formData.audioFile.name}
          </p>
        )}
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