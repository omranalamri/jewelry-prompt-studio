// Model Catalog — Replicate models for jewelry marketing
// NO FLUX. Core: NB2, NB Pro, Kling 2.5, Seedance, BiRefNet.

export interface CatalogModel {
  id: string;
  replicateId: string;
  name: string;
  category: 'image-gen' | 'video-gen' | 'bg-removal' | 'upscale' | 'editing' | 'lighting' | 'captioning' | 'try-on' | 'segmentation' | 'lora' | '3d' | 'ocr';
  tier: 1 | 2 | 3;
  runs: number;
  costEstimate: string;
  description: string;
  jewelryUseCase: string;
  integrated: boolean;
}

export const MODEL_CATALOG: CatalogModel[] = [
  // ===== TIER 1: CORE =====
  {
    id: 'nano-banana-2', replicateId: 'google/nano-banana-2', name: 'Nano Banana 2',
    category: 'image-gen', tier: 1, runs: 0, costEstimate: '~$0.05',
    description: 'Google Gemini image model. Multi-image fusion via image_input array.',
    jewelryUseCase: 'Primary generation — product + inspiration + model fusion. Campaign angles.',
    integrated: true,
  },
  {
    id: 'nano-banana-pro', replicateId: 'google/nano-banana-pro', name: 'Nano Banana Pro',
    category: 'image-gen', tier: 1, runs: 0, costEstimate: '~$0.13',
    description: '2K resolution. Same multi-image fusion. Higher detail output.',
    jewelryUseCase: 'Simple pipeline — BG removal + high-res generation. Print quality.',
    integrated: true,
  },
  {
    id: 'kling-2.5', replicateId: 'kwaivgi/kling-v2.5-turbo-pro', name: 'Kling 2.5 Turbo Pro',
    category: 'video-gen', tier: 1, runs: 2_400_000, costEstimate: '~$0.35',
    description: 'Cinematic video from image. Best motion quality for product commercials.',
    jewelryUseCase: 'Animate campaign frames — sparkle, rotation, light play on jewelry.',
    integrated: true,
  },
  {
    id: 'seedance-2', replicateId: 'bytedance/seedance-2.0-fast', name: 'Seedance 2.0 Fast',
    category: 'video-gen', tier: 1, runs: 2_600, costEstimate: '~$0.30',
    description: 'Multimodal video: reference_images + audio. Fast generation.',
    jewelryUseCase: 'Alternative video gen with reference images and audio support.',
    integrated: true,
  },
  {
    id: 'birefnet', replicateId: 'men1scus/birefnet', name: 'BiRefNet',
    category: 'bg-removal', tier: 1, runs: 5_300_000, costEstimate: '~$0.003',
    description: 'State-of-the-art edge preservation. 256-level alpha matte.',
    jewelryUseCase: 'Isolate jewelry — chains, filigree, gemstones with perfect edges.',
    integrated: true,
  },
  {
    id: '851-labs-bg', replicateId: '851-labs/background-remover', name: '851-Labs BG Remover',
    category: 'bg-removal', tier: 1, runs: 20_300_000, costEstimate: '~$0.001',
    description: 'Fast background removal. 20M runs — most popular BG remover.',
    jewelryUseCase: 'Fallback BG removal. Fast and cheap.',
    integrated: true,
  },

  // ===== TIER 2: HIGH VALUE =====
  {
    id: 'real-esrgan', replicateId: 'nightmareai/real-esrgan', name: 'Real-ESRGAN',
    category: 'upscale', tier: 2, runs: 88_000_000, costEstimate: '~$0.005',
    description: '4x upscaling. 88M runs — most proven upscaler on Replicate.',
    jewelryUseCase: 'Upscale generated images to print resolution for catalogs.',
    integrated: false,
  },
  {
    id: 'clarity-upscaler', replicateId: 'philz1337x/clarity-upscaler', name: 'Clarity Upscaler',
    category: 'upscale', tier: 2, runs: 28_600_000, costEstimate: '~$0.02',
    description: 'Premium upscaling with detail enhancement and sharpening.',
    jewelryUseCase: 'Enhance fine detail — diamond facets, engraving, hallmarks.',
    integrated: false,
  },
  {
    id: 'ic-light', replicateId: 'zsxkib/ic-light', name: 'IC-Light',
    category: 'lighting', tier: 2, runs: 1_700_000, costEstimate: '~$0.02',
    description: 'Prompt-based relighting. Change lighting direction, color, intensity.',
    jewelryUseCase: 'Relight jewelry for different moods — warm, cool, dramatic.',
    integrated: false,
  },
  {
    id: 'blip', replicateId: 'salesforce/blip', name: 'BLIP',
    category: 'captioning', tier: 2, runs: 172_500_000, costEstimate: '~$0.001',
    description: 'Image captioning. 172M runs — most popular captioning model.',
    jewelryUseCase: 'Auto-generate SEO product descriptions, alt text, social captions.',
    integrated: false,
  },
  {
    id: 'photomaker', replicateId: 'tencentarc/photomaker', name: 'PhotoMaker',
    category: 'image-gen', tier: 2, runs: 9_000_000, costEstimate: '~$0.03',
    description: 'Consistent character generation across multiple images.',
    jewelryUseCase: 'Same model face across all campaign shots — consistent ambassador.',
    integrated: false,
  },
  {
    id: 'blip-2', replicateId: 'andreasjansson/blip-2', name: 'BLIP-2',
    category: 'captioning', tier: 2, runs: 31_600_000, costEstimate: '~$0.002',
    description: 'Visual question answering. Ask questions about images.',
    jewelryUseCase: 'Auto-analyze: "What metal?", "How many stones?", quality checks.',
    integrated: false,
  },
  {
    id: 'text-extract-ocr', replicateId: 'abiruyt/text-extract-ocr', name: 'Text Extract OCR',
    category: 'ocr', tier: 2, runs: 90_100_000, costEstimate: '~$0.001',
    description: 'Extract text from images. 90M runs.',
    jewelryUseCase: 'Read certificates, hallmarks, packaging text, engravings.',
    integrated: false,
  },
  {
    id: 'veo-2', replicateId: 'google/veo-2', name: 'Veo 2',
    category: 'video-gen', tier: 2, runs: 108_000, costEstimate: '~$0.50',
    description: 'Google premium video generation. Real-world physics.',
    jewelryUseCase: 'High-end campaign videos when budget allows.',
    integrated: false,
  },

  // ===== TIER 3: NICE TO HAVE =====
  {
    id: 'grounded-sam', replicateId: 'schananas/grounded_sam', name: 'Grounded SAM',
    category: 'segmentation', tier: 3, runs: 1_100_000, costEstimate: '~$0.01',
    description: 'Text-guided segmentation. "Find the ring" → precise mask.',
    jewelryUseCase: 'Precise jewelry segmentation for compositing and editing.',
    integrated: false,
  },
  {
    id: 'style-transfer', replicateId: 'fofr/style-transfer', name: 'Style Transfer',
    category: 'editing', tier: 3, runs: 1_300_000, costEstimate: '~$0.01',
    description: 'Apply artistic style from one image to another.',
    jewelryUseCase: 'Apply brand aesthetic across all campaign assets.',
    integrated: false,
  },
  {
    id: 'idm-vton', replicateId: 'cuuupid/idm-vton', name: 'IDM-VTON',
    category: 'try-on', tier: 3, runs: 1_400_000, costEstimate: '~$0.03',
    description: 'Virtual try-on for clothing and accessories.',
    jewelryUseCase: 'Virtual jewelry try-on on model photos.',
    integrated: false,
  },
  {
    id: 'ad-inpaint', replicateId: 'logerzhu/ad-inpaint', name: 'Ad Inpaint',
    category: 'editing', tier: 3, runs: 630_000, costEstimate: '~$0.02',
    description: 'Product advertising image generation via inpainting.',
    jewelryUseCase: 'Generate ad layouts with jewelry in different settings.',
    integrated: false,
  },
  {
    id: 'recraft-v3-svg', replicateId: 'recraft-ai/recraft-v3-svg', name: 'Recraft V3 SVG',
    category: 'image-gen', tier: 3, runs: 394_000, costEstimate: '~$0.03',
    description: 'SVG vector graphics generation.',
    jewelryUseCase: 'Generate vector logos, icons, brand assets.',
    integrated: false,
  },
  {
    id: 'instantmesh', replicateId: 'camenduru/instantmesh', name: 'InstantMesh',
    category: '3d', tier: 3, runs: 43_000, costEstimate: '~$0.05',
    description: '3D mesh from single image.',
    jewelryUseCase: 'Generate 3D jewelry models from product photos for AR.',
    integrated: false,
  },
];

export function getModelsByTier(tier: 1 | 2 | 3) { return MODEL_CATALOG.filter(m => m.tier === tier); }
export function getModelsByCategory(category: CatalogModel['category']) { return MODEL_CATALOG.filter(m => m.category === category); }
export function getIntegratedModels() { return MODEL_CATALOG.filter(m => m.integrated); }
export function getNotIntegratedModels() { return MODEL_CATALOG.filter(m => !m.integrated); }
