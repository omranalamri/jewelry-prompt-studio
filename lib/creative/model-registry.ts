// Model Registry — STRIPPED DOWN
// Only models that actually work for jewelry. No fallbacks to bad models.
// If the model is down, tell the user to try again. Don't produce garbage.

export interface ModelInfo {
  id: string;
  replicateId: string;
  name: string;
  provider: string;
  type: 'image' | 'video';
  quality: number;
  speed: number;
  costEstimate: number;
  resolution: string;
  description: string;
  badge: string;
  avgTimeSeconds: number;
  supportsImageInput: boolean;
}

// === IMAGE: Nano Banana 2 is primary. Period. ===
export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: 'nano-banana-2',
    replicateId: 'google/nano-banana-2',
    name: 'Nano Banana 2',
    provider: 'Google',
    type: 'image',
    quality: 10,
    speed: 7,
    costEstimate: 0.05,
    resolution: '1K',
    description: 'Google\'s image model with image_input for design fidelity. Multi-image fusion. The only model that properly preserves jewelry design from reference.',
    badge: 'Primary',
    avgTimeSeconds: 22,
    supportsImageInput: true,
  },
  {
    id: 'nano-banana-pro',
    replicateId: 'google/nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'Google',
    type: 'image',
    quality: 9,
    speed: 6,
    costEstimate: 0.134,
    resolution: '2K',
    description: 'Higher resolution version. 2K output. Use when NB2 is at capacity.',
    badge: 'Backup (2K)',
    avgTimeSeconds: 30,
    supportsImageInput: true,
  },
];

// === VIDEO: Kling 2.5 primary, Seedance 2.0 backup, Runway for design accuracy ===
export const VIDEO_MODELS: ModelInfo[] = [
  {
    id: 'kling-2.5',
    replicateId: 'kwaivgi/kling-v2.5-turbo-pro',
    name: 'Kling 2.5 Turbo Pro',
    provider: 'Kuaishou',
    type: 'video',
    quality: 10,
    speed: 7,
    costEstimate: 0.35,
    resolution: '1080p',
    description: 'Best motion quality for jewelry. start_image + end_image + negative_prompt. Great for metallic surfaces.',
    badge: 'Primary',
    avgTimeSeconds: 45,
    supportsImageInput: true,
  },
  {
    id: 'seedance-2',
    replicateId: 'bytedance/seedance-2.0-fast',
    name: 'Seedance 2.0 Fast',
    provider: 'ByteDance',
    type: 'video',
    quality: 9,
    speed: 8,
    costEstimate: 0.30,
    resolution: '1080p',
    description: 'Multimodal: reference_images + audio + video. Fast generation.',
    badge: 'Multimodal',
    avgTimeSeconds: 30,
    supportsImageInput: true,
  },
  {
    id: 'runway',
    replicateId: 'runway-gen3',
    name: 'Runway Gen-3 Alpha',
    provider: 'Runway',
    type: 'video',
    quality: 9,
    speed: 8,
    costEstimate: 0.25,
    resolution: '720p',
    description: 'Direct API. Image-to-video preserves jewelry design best.',
    badge: 'Design Accurate',
    avgTimeSeconds: 30,
    supportsImageInput: true,
  },
];

export function getImageModel(id: string): ModelInfo | undefined {
  return IMAGE_MODELS.find(m => m.id === id);
}

export function getVideoModel(id: string): ModelInfo | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}

export function getBestImageModel(): ModelInfo {
  return IMAGE_MODELS[0]; // Nano Banana 2
}

export function getBestVideoModel(): ModelInfo {
  return VIDEO_MODELS[0]; // Kling 2.5
}

export function getActiveImageModels(): ModelInfo[] {
  return IMAGE_MODELS;
}

export function getActiveVideoModels(): ModelInfo[] {
  return VIDEO_MODELS;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

export function getSmartImageModel(): ModelInfo {
  return IMAGE_MODELS[0]; // Always Nano Banana 2
}

export function getSmartVideoModel(context?: { needsAudio?: boolean; hasReferenceFrame?: boolean }): ModelInfo {
  if (context?.hasReferenceFrame) return VIDEO_MODELS.find(m => m.id === 'runway') || VIDEO_MODELS[0];
  return VIDEO_MODELS[0]; // Kling 2.5
}
