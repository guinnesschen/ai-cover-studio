import { Character } from '@/types';

export const characters: Character[] = [
  {
    id: 'squidward',
    name: 'Squidward',
    emoji: '🦑',
    available: true,
    // Using the pre-loaded Squidward model mentioned in the docs
    voiceModelUrl: undefined, // Will use default Squidward model
    fluxFineTuneId: undefined, // Will use placeholder for MVP
  },
  {
    id: 'patrick',
    name: 'Patrick',
    emoji: '⭐',
    available: false,
    // Placeholder - would need actual trained models
    voiceModelUrl: undefined,
    fluxFineTuneId: undefined,
  },
  {
    id: 'spongebob',
    name: 'SpongeBob',
    emoji: '🧽',
    available: false,
    // Placeholder - would need actual trained models
    voiceModelUrl: undefined,
    fluxFineTuneId: undefined,
  },
  {
    id: 'kpop-idol',
    name: 'K-Pop Idol',
    emoji: '🎤',
    available: false,
    // Placeholder - would need actual trained models
    voiceModelUrl: undefined,
    fluxFineTuneId: undefined,
  },
  {
    id: 'drake',
    name: 'Drake',
    emoji: '🦉',
    available: false,
    // Placeholder - would need actual trained models
    voiceModelUrl: undefined,
    fluxFineTuneId: undefined,
  },
];

export const getCharacterById = (id: string): Character | undefined => {
  return characters.find((char) => char.id === id);
};