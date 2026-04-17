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

// === IMAGE: Nano Banana 2 only. Nothing else. ===
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
    description: 'Google Gemini image model. Multi-image fusion via image_input. The only model for jewelry.',
    badge: 'Primary',
    avgTimeSeconds: 22,
    supportsImageInput: true,
  },
];

// === VIDEO: Seedance 2.0 primary (best detail on jewelry), Kling 2.5 budget ===
export const VIDEO_MODELS: ModelInfo[] = [
  {
    id: 'seedance-2',
    replicateId: 'bytedance/seedance-2.0-fast',
    name: 'Seedance 2.0 Fast',
    provider: 'ByteDance',
    type: 'video',
    quality: 10,
    speed: 9,
    costEstimate: 0.70,
    resolution: '720p',
    description: 'Best detail retention on reflective surfaces, gems, metal. 2x faster than Kling. Flexible 1-15s duration. Seed control.',
    badge: 'Primary',
    avgTimeSeconds: 75,
    supportsImageInput: true,
  },
  {
    id: 'kling-2.5',
    replicateId: 'kwaivgi/kling-v2.5-turbo-pro',
    name: 'Kling 2.5 Turbo Pro',
    provider: 'Kuaishou',
    type: 'video',
    quality: 8,
    speed: 7,
    costEstimate: 0.35,
    resolution: '1080p',
    description: 'Budget option — half the cost. Good motion quality. start_image + negative_prompt.',
    badge: 'Budget',
    avgTimeSeconds: 156,
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
