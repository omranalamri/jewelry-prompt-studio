// Unified VideoGenerationAdapter — Google Veo only (Luma removed)

export type VideoEngine =
  | 'veo-3.1-fast' | 'veo-3.1' | 'veo-3.1-lite' | 'veo-2';

export interface UnifiedVideoRequest {
  engine: VideoEngine;
  prompt: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
  resolution?: '480p' | '720p' | '1080p';
  cameraMotion?: string;
  callbackUrl?: string;
}

export interface UnifiedVideoResult {
  jobId: string;
  engine: VideoEngine;
  provider: 'google';
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  estimatedCostUsd: number;
}

// All video generation now goes through /api/generate/stitch which uses Veo
export async function generateVideo(req: UnifiedVideoRequest): Promise<UnifiedVideoResult> {
  throw new Error(
    `Call /api/generate/stitch with videoModel: "${req.engine}" instead of the adapter directly.`
  );
}
