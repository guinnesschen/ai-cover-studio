import { Character } from '@/types';

export const characters: Character[] = [
  {
    id: 'squidward',
    name: 'Squidward',
    emoji: '🦑',
    // Using the pre-loaded Squidward model mentioned in the docs
    voiceModelUrl: undefined, // Will use default Squidward model
    fluxFineTuneId: undefined, // Will use placeholder for MVP
  },
  {
    id: 'kpop-idol',
    name: 'K-Pop Idol',
    emoji: '🎤',
    // Placeholder - would need actual trained models
    voiceModelUrl: undefined,
    fluxFineTuneId: undefined,
  },
  {
    id: 'drake',
    name: 'Drake',
    emoji: '🦉',
    // Placeholder - would need actual trained models
    voiceModelUrl: undefined,
    fluxFineTuneId: undefined,
  },
];

export const getCharacterById = (id: string): Character | undefined => {
  return characters.find((char) => char.id === id);
};