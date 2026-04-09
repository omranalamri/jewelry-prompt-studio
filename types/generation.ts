export type GenerationProvider = 'replicate' | 'recraft' | 'nanobanana';
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface GenerationJob {
  id: string;
  provider: GenerationProvider;
  platform: string;
  prompt: string;
  status: GenerationStatus;
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
}

export interface GenerateImageRequest {
  prompt: string;
  platform: 'midjourney' | 'dalle';
  aspectRatio?: string;
}

export interface GenerateVideoRequest {
  prompt: string;
  platform: 'runway' | 'kling';
  duration?: number;
  aspectRatio?: string;
  imageUrl?: string;
}
