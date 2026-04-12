// Model Registry — ranked by REAL performance data + benchmark research
// Last updated: April 2026 based on 132 tracked generations + self-review

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
  retired?: boolean;
  retiredReason?: string;
}

// IMAGE MODELS — ranked by quality AND reliability
// Lesson learned: models go down frequently. Need diversity across providers.
export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: 'ideogram-v3',
    replicateId: 'ideogram-ai/ideogram-v3-quality',
    name: 'Ideogram V3 Quality',
    provider: 'Ideogram',
    type: 'image',
    quality: 10,
    speed: 9,
    costEstimate: 0.08,
    resolution: '2K',
    description: 'Highest quality on HuggingFace benchmarks 2026. Best text rendering. Fast and reliable.',
    badge: 'Best Quality + Text',
    avgTimeSeconds: 12,
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
    description: '20M runs. Reference image input. Often at capacity — use as secondary.',
    badge: 'Reference Input',
    avgTimeSeconds: 34,
    supportsImageInput: true,
  },
  {
    id: 'recraft-v3',
    replicateId: 'recraft-ai/recraft-v3',
    name: 'Recraft V3',
    provider: 'Recraft',
    type: 'image',
    quality: 8,
    speed: 9,
    costEstimate: 0.04,
    resolution: '1K',
    description: 'Fast, cheap, reliable. Own API (not Replicate). Good fallback.',
    badge: 'Fast + Cheap',
    avgTimeSeconds: 7,
    supportsImageInput: false,
  },
  {
    id: 'flux-fill-pro',
    replicateId: 'black-forest-labs/flux-fill-pro',
    name: 'Flux Fill Pro',
    provider: 'Black Forest Labs',
    type: 'image',
    quality: 9,
    speed: 8,
    costEstimate: 0.05,
    resolution: '2K',
    description: 'Professional inpainting — place jewelry on hands/necks with pixel accuracy via mask.',
    badge: 'Inpaint + Try-On',
    avgTimeSeconds: 8,
    supportsImageInput: true,
  },
  {
    id: 'nano-banana-2',
    replicateId: 'google/nano-banana-2',
    name: 'Nano Banana 2',
    provider: 'Google',
    type: 'image',
    quality: 8,
    speed: 8,
    costEstimate: 0.05,
    resolution: '1K',
    description: 'Fast, character consistency, multi-image. Often at capacity.',
    badge: 'Fast + Consistent',
    avgTimeSeconds: 10,
    supportsImageInput: true,
  },
  // RETIRED
  {
    id: 'ideogram-v2',
    replicateId: 'ideogram-ai/ideogram-v2',
    name: 'Ideogram V2',
    provider: 'Ideogram',
    type: 'image',
    quality: 7,
    speed: 7,
    costEstimate: 0.08,
    resolution: '1K',
    description: 'Replaced by V3 Quality. Kept as emergency fallback only.',
    badge: 'Legacy',
    avgTimeSeconds: 20,
    supportsImageInput: true,
    retired: true,
    retiredReason: 'Superseded by Ideogram V3 Quality — same cost, better quality, faster',
  },
  {
    id: 'flux-ultra',
    replicateId: 'black-forest-labs/flux-1.1-pro-ultra',
    name: 'Flux 1.1 Pro Ultra',
    provider: 'Black Forest Labs',
    type: 'image',
    quality: 6,
    speed: 9,
    costEstimate: 0.06,
    resolution: '4MP',
    description: 'RETIRED for jewelry — hallucinate designs. Only for generic lifestyle.',
    badge: 'Retired (Hallucination)',
    avgTimeSeconds: 8,
    supportsImageInput: true,
    retired: true,
    retiredReason: 'Consistently hallucinate jewelry designs. Self-review rated 2.2/5. Replaced by Ideogram V3.',
  },
];

// VIDEO MODELS
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
    description: 'Best motion quality. Start+end frame control. Great for metallic surfaces.',
    badge: 'Best Motion',
    avgTimeSeconds: 45,
    supportsImageInput: true,
  },
  {
    id: 'veo-3',
    replicateId: 'google/veo-3',
    name: 'Google Veo 3',
    provider: 'Google',
    type: 'video',
    quality: 10,
    speed: 4,
    costEstimate: 1.25,
    resolution: '1080p',
    description: 'Cinema quality with generated audio. Best for ads.',
    badge: 'Cinema + Audio',
    avgTimeSeconds: 127,
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
    description: 'Multimodal: reference images + audio + video input. Fast.',
    badge: 'Fast + Multimodal',
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
    description: 'Direct API. Image-to-video preserves design best.',
    badge: 'Design Accurate',
    avgTimeSeconds: 30,
    supportsImageInput: true,
  },
  {
    id: 'seedance',
    replicateId: 'bytedance/seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    type: 'video',
    quality: 8,
    speed: 6,
    costEstimate: 0.40,
    resolution: '1080p',
    description: 'Older version. Kept as fallback for 2.0.',
    badge: 'Legacy',
    avgTimeSeconds: 60,
    supportsImageInput: true,
    retired: true,
    retiredReason: 'Superseded by Seedance 2.0 Fast — faster, cheaper, multimodal',
  },
  {
    id: 'veo-2',
    replicateId: 'google/veo-2',
    name: 'Google Veo 2',
    provider: 'Google',
    type: 'video',
    quality: 8,
    speed: 7,
    costEstimate: 0.50,
    resolution: '1080p',
    description: 'Older Veo. More expensive than Kling with less control.',
    badge: 'Legacy',
    avgTimeSeconds: 31,
    supportsImageInput: true,
    retired: true,
    retiredReason: 'Kling 2.5 is better quality at $0.35 vs $0.50',
  },
];

export function getImageModel(id: string): ModelInfo | undefined {
  return IMAGE_MODELS.find(m => m.id === id);
}

export function getVideoModel(id: string): ModelInfo | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}

export function getBestImageModel(): ModelInfo {
  return IMAGE_MODELS.filter(m => !m.retired)[0];
}

export function getBestVideoModel(): ModelInfo {
  return VIDEO_MODELS.filter(m => !m.retired)[0];
}

export function getActiveImageModels(): ModelInfo[] {
  return IMAGE_MODELS.filter(m => !m.retired);
}

export function getActiveVideoModels(): ModelInfo[] {
  return VIDEO_MODELS.filter(m => !m.retired);
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

export function getSmartImageModel(context?: { hasText?: boolean; hasDiamonds?: boolean; isProductShot?: boolean }): ModelInfo {
  if (!context) return getBestImageModel();
  if (context.hasText) return IMAGE_MODELS.find(m => m.id === 'ideogram-v3') || getBestImageModel();
  if (context.isProductShot) return IMAGE_MODELS.find(m => m.id === 'recraft-v3') || getBestImageModel();
  return getBestImageModel();
}

export function getSmartVideoModel(context?: { needsAudio?: boolean; hasReferenceFrame?: boolean }): ModelInfo {
  if (!context) return getBestVideoModel();
  if (context.needsAudio) return VIDEO_MODELS.find(m => m.id === 'veo-3') || getBestVideoModel();
  if (context.hasReferenceFrame) return VIDEO_MODELS.find(m => m.id === 'runway') || getBestVideoModel();
  return getBestVideoModel();
}
