export type PlatformId = 'midjourney' | 'dalle' | 'runway' | 'kling';
export type OutputType = 'still' | 'video' | 'both';
export type ModuleType = 'analyze' | 'concept' | 'vision';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  specialty: string;
  badgeColor: string;
  bestFor: OutputType[];
}
