export interface CameraPreset {
  id: string;
  name: string;
  category: 'macro' | 'editorial' | 'lifestyle' | 'cinematic' | 'product' | 'social';
  icon: string;
  // Injected into image prompts
  imageFragment: string;
  // Injected into video prompts
  videoFragment: string;
  description: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  // Macro
  {
    id: 'hasselblad-macro',
    name: 'Hasselblad Macro',
    category: 'macro',
    icon: '🔬',
    imageFragment: 'shot on Hasselblad X2D 100C with 120mm macro lens, f/2.8, extreme close-up, shallow depth of field, medium format sensor, ultra-sharp detail on gemstone facets',
    videoFragment: 'cinematic macro lens, extreme close-up slowly pulling focus across gemstone facets, shallow depth of field',
    description: 'Ultra-detailed close-up — see every facet and metal grain',
  },
  {
    id: 'canon-macro',
    name: 'Canon Macro Detail',
    category: 'macro',
    icon: '💎',
    imageFragment: 'shot on Canon EOS R5 with 100mm f/2.8L macro lens, 1:1 magnification, ring light reflection in gemstones, precise focus stacking',
    videoFragment: 'macro lens with ring light, slow orbital movement revealing stone detail at 1:1 magnification',
    description: 'Ring-light macro — shows sparkle and fire in stones',
  },
  // Editorial
  {
    id: 'hasselblad-editorial',
    name: 'Hasselblad Editorial',
    category: 'editorial',
    icon: '📸',
    imageFragment: 'shot on Hasselblad X2D, 80mm f/1.9 lens, medium format, editorial fashion photography, natural bokeh, rich tonal depth',
    videoFragment: 'medium format cinematic, 80mm lens, slow elegant camera movement, fashion editorial pacing',
    description: 'Magazine-quality editorial with creamy medium format bokeh',
  },
  {
    id: 'leica-editorial',
    name: 'Leica Street Editorial',
    category: 'editorial',
    icon: '🎞️',
    imageFragment: 'shot on Leica SL3 with 50mm Summilux f/1.4, natural light, documentary-editorial style, organic grain, rich contrast',
    videoFragment: 'Leica-style handheld movement, 50mm natural perspective, documentary feel with editorial precision',
    description: 'Authentic, natural editorial with Leica character',
  },
  // Lifestyle
  {
    id: 'iphone-lifestyle',
    name: 'iPhone Lifestyle',
    category: 'lifestyle',
    icon: '📱',
    imageFragment: 'shot on iPhone 16 Pro, natural daylight, lifestyle photography, authentic casual feel, Portrait mode bokeh',
    videoFragment: 'iPhone-style handheld video, natural daylight, casual and authentic movement, 4K Cinematic mode',
    description: 'Authentic social-ready content — looks like real life, not staged',
  },
  {
    id: 'sony-lifestyle',
    name: 'Sony Lifestyle',
    category: 'lifestyle',
    icon: '🌅',
    imageFragment: 'shot on Sony A7IV with 35mm f/1.4 GM, golden hour natural light, lifestyle photography, warm tones, environmental context',
    videoFragment: 'Sony cinema look, 35mm wide angle, golden hour warmth, steady gimbal movement through lifestyle scene',
    description: 'Warm golden-hour lifestyle with Sony color science',
  },
  // Cinematic
  {
    id: 'arri-cinematic',
    name: 'ARRI Cinema',
    category: 'cinematic',
    icon: '🎬',
    imageFragment: 'shot on ARRI Alexa Mini LF with Cooke Anamorphic lens, 2.39:1 aspect ratio, cinematic color grading, lens flares, filmic grain',
    videoFragment: 'ARRI Alexa cinematic, anamorphic lens flares, slow dolly movement, 24fps film cadence, professional color grade',
    description: 'Hollywood-grade cinematic — anamorphic flares and film grain',
  },
  {
    id: 'red-cinematic',
    name: 'RED Dramatic',
    category: 'cinematic',
    icon: '🔴',
    imageFragment: 'shot on RED V-Raptor 8K, Zeiss Supreme Prime 50mm, dramatic chiaroscuro lighting, deep blacks, selective focus, 8K ultra-resolution',
    videoFragment: 'RED V-Raptor 8K cinematic, slow dramatic push-in, deep contrast, theatrical lighting, 120fps slow motion',
    description: 'Dramatic high-contrast cinema — 8K detail with deep shadows',
  },
  // Product
  {
    id: 'product-clean',
    name: 'Clean Product',
    category: 'product',
    icon: '🏷️',
    imageFragment: 'professional product photography, white seamless background, diffused studio lighting, color-accurate, e-commerce ready, centered composition',
    videoFragment: 'clean 360-degree product rotation on white seamless background, even studio lighting, smooth turntable motion',
    description: 'Clean e-commerce product shots — white background, perfect lighting',
  },
  {
    id: 'product-dark',
    name: 'Dark Product',
    category: 'product',
    icon: '🖤',
    imageFragment: 'luxury product photography, deep black background, single dramatic key light from above-right, rim lighting on metal edges, professional studio setup',
    videoFragment: 'dramatic product reveal on black background, slow light sweep from left to right revealing details, single key light',
    description: 'Dark luxury product — dramatic single light on black',
  },
  // Social
  {
    id: 'reels-vertical',
    name: 'Reels / TikTok',
    category: 'social',
    icon: '📲',
    imageFragment: 'vertical 9:16 format, trendy social media aesthetic, bright and punchy colors, eye-catching composition, scroll-stopping first frame',
    videoFragment: 'vertical 9:16, fast-paced social media style, quick cuts, satisfying reveal, scroll-stopping hook in first second',
    description: 'Optimized for Instagram Reels & TikTok — vertical, punchy, scroll-stopping',
  },
  {
    id: 'pinterest-mood',
    name: 'Pinterest Mood',
    category: 'social',
    icon: '📌',
    imageFragment: 'Pinterest-optimized 2:3 vertical format, aspirational mood, soft muted tones, styled flat lay or lifestyle context, save-worthy composition',
    videoFragment: 'Pinterest-style slow reveal, 2:3 format, dreamy and aspirational, muted color palette, gentle movement',
    description: 'Pinterest-perfect — aspirational, muted tones, save-worthy',
  },
];

export const CAMERA_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'macro', label: 'Macro' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'product', label: 'Product' },
  { id: 'social', label: 'Social' },
];

export function getPresetById(id: string) {
  return CAMERA_PRESETS.find(p => p.id === id);
}

// Color grading presets for video director controls
export interface ColorGrade {
  id: string;
  name: string;
  description: string;
  promptFragment: string;
}

export const COLOR_GRADES: ColorGrade[] = [
  { id: 'natural', name: 'Natural', description: 'True-to-life colors', promptFragment: 'natural color grading, true-to-life tones' },
  { id: 'warm-gold', name: 'Warm Gold', description: 'Golden hour warmth', promptFragment: 'warm golden color grading, amber highlights, honey tones' },
  { id: 'cool-silver', name: 'Cool Silver', description: 'Cool elegant tones', promptFragment: 'cool silver color grading, blue-tinted shadows, elegant cool tones' },
  { id: 'moody-dark', name: 'Moody Dark', description: 'Deep shadows, rich blacks', promptFragment: 'moody dark color grading, crushed blacks, deep shadows, desaturated midtones' },
  { id: 'film-vintage', name: 'Film Vintage', description: 'Analog film look', promptFragment: 'vintage film color grading, subtle grain, faded blacks, warm halation' },
  { id: 'high-fashion', name: 'High Fashion', description: 'Editorial contrast', promptFragment: 'high fashion color grading, strong contrast, selective color, editorial look' },
  { id: 'pastel-soft', name: 'Pastel Soft', description: 'Soft dreamy pastels', promptFragment: 'soft pastel color grading, lifted shadows, dreamy pink and lavender tones' },
  { id: 'teal-orange', name: 'Teal & Orange', description: 'Hollywood blockbuster', promptFragment: 'teal and orange color grading, cinematic Hollywood look, complementary color contrast' },
];
