// Best-in-class model registry with pricing and quality rankings
// Costs are estimates based on Replicate pricing + actual prediction times from our tests
// Replicate bills by second on hardware tier. Official models use fixed per-run pricing.

export interface ModelInfo {
  id: string;
  replicateId: string;
  name: string;
  provider: string;
  type: 'image' | 'video';
  quality: number;        // 1-10 quality ranking
  speed: number;          // 1-10 speed ranking (10 = fastest)
  costEstimate: number;   // estimated $ per generation
  resolution: string;
  description: string;
  badge: string;
  avgTimeSeconds: number; // from our actual tests
}

// IMAGE MODELS — ranked by quality (best first)
export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: 'nano-banana-pro',
    replicateId: 'google/nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'Google',
    type: 'image',
    quality: 10,
    speed: 6,
    costEstimate: 0.134,
    resolution: '2K',
    description: 'Google\'s state-of-the-art — highest quality, 2K resolution',
    badge: 'Best Quality',
    avgTimeSeconds: 34,
  },
  {
    id: 'flux-ultra',
    replicateId: 'black-forest-labs/flux-1.1-pro-ultra',
    name: 'Flux 1.1 Pro Ultra',
    provider: 'Black Forest Labs',
    type: 'image',
    quality: 7,  // downgraded: hallucinate jewelry details, bad with text/engravings
    speed: 9,
    costEstimate: 0.06,
    resolution: '4MP',
    description: 'Fast 4MP images but tends to hallucinate jewelry details — use for lifestyle, not product',
    badge: 'Fast (Lifestyle Only)',
    avgTimeSeconds: 8,
  },
  {
    id: 'nano-banana-2',
    replicateId: 'google/nano-banana-2',
    name: 'Nano Banana 2',
    provider: 'Google',
    type: 'image',
    quality: 9,
    speed: 8,
    costEstimate: 0.05,
    resolution: '1K',
    description: 'Fast generation with character consistency & multi-image fusion',
    badge: 'Fast + Consistent',
    avgTimeSeconds: 10,
  },
  {
    id: 'recraft-v3',
    replicateId: 'recraft-ai/recraft-v3',
    name: 'Recraft V3',
    provider: 'Recraft',
    type: 'image',
    quality: 8,
    speed: 8,
    costEstimate: 0.04,
    resolution: '1K',
    description: 'Excellent for product photography and clean compositions',
    badge: 'Product Photography',
    avgTimeSeconds: 8,
  },
  {
    id: 'ideogram-v2',
    replicateId: 'ideogram-ai/ideogram-v2',
    name: 'Ideogram V2',
    provider: 'Ideogram',
    type: 'image',
    quality: 8,
    speed: 7,
    costEstimate: 0.08,
    resolution: '1K',
    description: 'Great text rendering and prompt comprehension',
    badge: 'Text + Detail',
    avgTimeSeconds: 12,
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
    description: 'Professional inpainting — place jewelry on hands/necks/wrists with pixel accuracy',
    badge: 'Inpaint + Try-On',
    avgTimeSeconds: 8,
  },
];

// VIDEO MODELS — ranked by quality (best first)
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
    description: 'Pro-level video with smooth motion, cinematic depth — supports start+end frame for precise control',
    badge: 'Best Motion + Cheap',
    avgTimeSeconds: 45,
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
    description: 'Cinema quality with generated audio — best for ads that need sound',
    badge: 'Audio + Cinema',
    avgTimeSeconds: 127,
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
    description: 'Fast video with reference images, reference videos, reference audio — multimodal',
    badge: 'Fast + Multimodal',
    avgTimeSeconds: 30,
  },
  {
    id: 'runway',
    replicateId: 'runway-gen3', // uses direct API, not Replicate
    name: 'Runway Gen-3 Alpha',
    provider: 'Runway',
    type: 'video',
    quality: 9,
    speed: 8,
    costEstimate: 0.25,
    resolution: '720p',
    description: 'Image-to-video with highest design fidelity — uses your actual Runway API',
    badge: 'Design Accurate',
    avgTimeSeconds: 30,
  },
  {
    id: 'veo-2',
    replicateId: 'google/veo-2',
    name: 'Google Veo 2',
    provider: 'Google',
    type: 'video',
    quality: 9,
    speed: 7,
    costEstimate: 0.50,
    resolution: '1080p',
    description: 'Excellent quality, faster than Veo 3, no audio',
    badge: 'Fast + Quality',
    avgTimeSeconds: 31,
  },
  {
    id: 'seedance',
    replicateId: 'bytedance/seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    type: 'video',
    quality: 9,
    speed: 6,
    costEstimate: 0.40,
    resolution: '1080p',
    description: 'Image-to-video with audio, camera control, reference images — great for jewelry',
    badge: 'Audio + Reference',
    avgTimeSeconds: 60,
  },
  {
    id: 'minimax',
    replicateId: 'minimax/video-01',
    name: 'Minimax Video-01',
    provider: 'MiniMax',
    type: 'video',
    quality: 7,
    speed: 3,
    costEstimate: 0.88,
    resolution: '720p',
    description: 'Good for image-to-video animation',
    badge: 'Image-to-Video',
    avgTimeSeconds: 173,
  },
];

export function getImageModel(id: string): ModelInfo | undefined {
  return IMAGE_MODELS.find(m => m.id === id);
}

export function getVideoModel(id: string): ModelInfo | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}

export function getBestImageModel(): ModelInfo {
  return IMAGE_MODELS[0]; // already sorted by quality
}

export function getBestVideoModel(): ModelInfo {
  return VIDEO_MODELS[0];
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

// Material-aware model recommendation
// Returns the best model for a specific jewelry context
export function getSmartImageModel(context?: { hasText?: boolean; hasDiamonds?: boolean; isProductShot?: boolean }): ModelInfo {
  if (!context) return IMAGE_MODELS[0];

  // Text/engravings → Nano Banana Pro handles text best via image_input reference
  if (context.hasText) return IMAGE_MODELS.find(m => m.id === 'nano-banana-pro') || IMAGE_MODELS[0];

  // Product shots → Recraft excels at clean product photography
  if (context.isProductShot) return IMAGE_MODELS.find(m => m.id === 'recraft-v3') || IMAGE_MODELS[0];

  // Diamonds/sparkle → Flux Ultra raw mode captures reflections best
  if (context.hasDiamonds) return IMAGE_MODELS.find(m => m.id === 'flux-ultra') || IMAGE_MODELS[0];

  return IMAGE_MODELS[0]; // default: Nano Banana Pro (highest quality)
}

export function getSmartVideoModel(context?: { needsAudio?: boolean; hasReferenceFrame?: boolean }): ModelInfo {
  if (!context) return VIDEO_MODELS[0];

  // Audio needed → Veo 3 is the only option
  if (context.needsAudio) return VIDEO_MODELS.find(m => m.id === 'veo-3') || VIDEO_MODELS[0];

  // Has reference frame → Runway preserves design best via image-to-video
  if (context.hasReferenceFrame) return VIDEO_MODELS.find(m => m.id === 'runway') || VIDEO_MODELS[0];

  return VIDEO_MODELS[0]; // default: Veo 3
}
