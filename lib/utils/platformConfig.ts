import { PlatformId, PlatformConfig } from '@/types/platforms';

export const PLATFORM_CONFIG: Record<PlatformId, PlatformConfig> = {
  midjourney: {
    id: 'midjourney',
    name: 'Midjourney',
    specialty: 'Editorial & artistic imagery',
    badgeColor: 'amber',
    bestFor: ['still'],
  },
  dalle: {
    id: 'dalle',
    name: 'DALL-E 3',
    specialty: 'Precise product photography',
    badgeColor: 'blue',
    bestFor: ['still'],
  },
  runway: {
    id: 'runway',
    name: 'Runway Gen-3',
    specialty: 'Cinematic video generation',
    badgeColor: 'purple',
    bestFor: ['video'],
  },
  kling: {
    id: 'kling',
    name: 'Kling / Sora',
    specialty: 'Realistic motion & video',
    badgeColor: 'pink',
    bestFor: ['video'],
  },
};

export const PLATFORMS_FOR_OUTPUT = {
  still: ['midjourney', 'dalle'] as PlatformId[],
  video: ['runway', 'kling'] as PlatformId[],
  both: ['midjourney', 'dalle', 'runway', 'kling'] as PlatformId[],
};
