// Community Intelligence — curated opportunities from the AI ecosystem
// Updated from research done April 2026

export interface CommunityResource {
  id: string;
  category: 'model' | 'dataset' | 'tool' | 'research' | 'workflow' | 'competitor';
  name: string;
  source: string;
  url: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  impactReason: string;
  status: 'available' | 'coming-soon' | 'requires-setup';
  tags: string[];
}

export const COMMUNITY_RESOURCES: CommunityResource[] = [
  // === HIGH IMPACT — INTEGRATE NOW ===
  {
    id: 'raresense-flux-jewelry',
    category: 'dataset',
    name: 'RareSense Flux Jewelry Training Set',
    source: 'HuggingFace',
    url: 'https://huggingface.co/raresense',
    description: '76 datasets with 60K+ jewelry images for fine-tuning. Includes necklace masks, ring segmentation, hand poses, sketch-to-photo, and VITON try-on data. Largest public jewelry training data.',
    impact: 'high',
    impactReason: 'Fine-tuning Flux on this data would create a jewelry-specific model that outperforms all general models. Could eliminate hallucination issues completely.',
    status: 'available',
    tags: ['fine-tuning', 'dataset', 'flux', 'jewelry-specific'],
  },
  {
    id: 'ip-adapter',
    category: 'tool',
    name: 'IP-Adapter (Reference Image Control)',
    source: 'GitHub',
    url: 'https://github.com/tencent-ailab/IP-Adapter',
    description: '22M parameter adapter that enables reference image prompting. Far superior to basic image_input — maintains visual identity across generations.',
    impact: 'high',
    impactReason: 'Would solve the jewelry design consistency problem. IP-Adapter preserves specific jewelry details better than any current method we use.',
    status: 'requires-setup',
    tags: ['consistency', 'reference-image', 'adapter'],
  },
  {
    id: 'controlnet',
    category: 'tool',
    name: 'ControlNet (Depth/Edge Control)',
    source: 'GitHub',
    url: 'https://github.com/lllyasviel/ControlNet',
    description: '31K+ stars. Adds depth maps, edge detection, and pose control to image generation. Could give precise control over jewelry placement on body.',
    impact: 'high',
    impactReason: 'Would make try-on dramatically more accurate. Depth maps ensure rings sit on fingers correctly, necklaces drape naturally.',
    status: 'requires-setup',
    tags: ['control', 'depth', 'pose', 'try-on'],
  },
  {
    id: 'glamtry',
    category: 'research',
    name: 'GlamTry: Virtual Try-On for Accessories',
    source: 'arXiv',
    url: 'https://arxiv.org/pdf/2409.14553',
    description: 'Customized 2D try-on using MediaPipe Hand Landmarker specifically for high-end accessories including rings and bracelets.',
    impact: 'high',
    impactReason: 'Direct research paper for what we\'re building. Their hand landmark approach would make our ring try-on pixel-accurate.',
    status: 'requires-setup',
    tags: ['try-on', 'research', 'hand-detection'],
  },
  {
    id: 'seedance-reference',
    category: 'model',
    name: 'Seedance 1.5 Pro Reference Images',
    source: 'Replicate',
    url: 'https://replicate.com/bytedance/seedance-1.5-pro',
    description: 'Supports 1-4 reference images for character/object consistency in video. We\'re using it but not passing reference_images parameter.',
    impact: 'high',
    impactReason: 'Passing jewelry reference images would dramatically improve design consistency in generated videos.',
    status: 'available',
    tags: ['video', 'consistency', 'reference'],
  },
  // === MEDIUM IMPACT — NEXT SPRINT ===
  {
    id: 'sam2',
    category: 'tool',
    name: 'SAM 2 (Segment Anything)',
    source: 'Meta AI',
    url: 'https://ai.meta.com/research/sam2',
    description: 'Segment any object in images and video. Could auto-segment jewelry pieces for precise background removal and placement.',
    impact: 'medium',
    impactReason: 'Auto-segmentation would enable precise jewelry extraction from photos, better compositing, and cleaner try-on.',
    status: 'available',
    tags: ['segmentation', 'background-removal'],
  },
  {
    id: 'bria-rmbg',
    category: 'tool',
    name: 'Bria RMBG 2.0 (Background Removal)',
    source: 'fal.ai',
    url: 'https://fal.ai',
    description: 'Professional-grade background removal trained on licensed data. Better than basic rembg for jewelry with reflective surfaces.',
    impact: 'medium',
    impactReason: 'Clean background removal is step one for any product photography workflow. Our current pipeline doesn\'t have this.',
    status: 'available',
    tags: ['background-removal', 'product-photo'],
  },
  {
    id: 'jewelry-segmentation-dataset',
    category: 'dataset',
    name: 'Jewelry Segmentation Dataset (4,807 images)',
    source: 'Roboflow',
    url: 'https://universe.roboflow.com',
    description: '4,807 jewelry images with segmentation annotations. CC BY 4.0 license. Could train a jewelry-specific detector.',
    impact: 'medium',
    impactReason: 'Auto-detecting jewelry type from uploaded photos would eliminate the "what type is this?" question in our chatbot.',
    status: 'available',
    tags: ['dataset', 'segmentation', 'detection'],
  },
  {
    id: 'hands-jewelry-dataset',
    category: 'dataset',
    name: '11K Hands with Jewelry Segmentation',
    source: 'Zenodo',
    url: 'https://zenodo.org',
    description: '11,076 hand photos with segmentation masks from 190 people. Perfect for training jewelry-on-hand placement.',
    impact: 'medium',
    impactReason: 'Training data for accurate ring/bracelet placement on diverse hand types.',
    status: 'available',
    tags: ['dataset', 'hands', 'try-on'],
  },
  {
    id: 'comfyui-jewelry',
    category: 'workflow',
    name: 'ComfyUI Jewelry Product Workflow',
    source: 'RunningHub',
    url: 'https://runninghub.ai',
    description: 'Community-built ComfyUI workflow specifically for diamond ring design with precise background control and product placement.',
    impact: 'medium',
    impactReason: 'Proven workflow we could adapt. ComfyUI gives deterministic control that API-based generation can\'t match.',
    status: 'requires-setup',
    tags: ['workflow', 'comfyui', 'deterministic'],
  },
  // === COMPETITORS TO WATCH ===
  {
    id: 'formanova',
    category: 'competitor',
    name: 'FormaNova — AI Photography for Jewelry',
    source: 'Website',
    url: 'https://formanova.ai',
    description: 'Purpose-built AI photography platform exclusively for jewelry. Our closest direct competitor.',
    impact: 'high',
    impactReason: 'Watch their feature releases. They maintain the awesome-jewelry-ai GitHub repo with research links.',
    status: 'available',
    tags: ['competitor', 'jewelry-specific'],
  },
  {
    id: 'mintly',
    category: 'competitor',
    name: 'Mintly — AI Jewelry Ads',
    source: 'Website',
    url: 'https://usemintly.com',
    description: 'Turns product images into polished static ads and video creatives. Claims 100% preservation of product text and logos.',
    impact: 'medium',
    impactReason: 'Their text preservation claim is exactly our hallucination challenge. Study their approach.',
    status: 'available',
    tags: ['competitor', 'ads', 'text-preservation'],
  },
  {
    id: 'jewelryai-video',
    category: 'competitor',
    name: 'JewelryAI.video — Rotation & Scene Videos',
    source: 'Website',
    url: 'https://jewelryai.video',
    description: 'Specialized in turning jewelry photos into rotation videos and scene videos for e-commerce.',
    impact: 'medium',
    impactReason: 'Simple but focused. Their rotation video feature is something we should match.',
    status: 'available',
    tags: ['competitor', 'video', 'rotation'],
  },
];

export function getResourcesByImpact(impact: 'high' | 'medium' | 'low') {
  return COMMUNITY_RESOURCES.filter(r => r.impact === impact);
}

export function getResourcesByCategory(category: string) {
  return COMMUNITY_RESOURCES.filter(r => r.category === category);
}
