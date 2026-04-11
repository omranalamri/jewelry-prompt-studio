export interface CampaignTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  prompt: string; // pre-filled creative direction for the chatbot
  tags: string[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // Seasonal
  {
    id: 'valentines',
    name: "Valentine's Day Campaign",
    category: 'seasonal',
    description: 'Romantic, red and pink tones, hearts, love letters, gift-giving moments',
    icon: '❤️',
    prompt: "I want to create a Valentine's Day campaign. Think romantic reds and pinks, soft lighting, gift-giving moments. The mood should be intimate and aspirational — like giving someone you love the perfect gift.",
    tags: ['seasonal', 'romantic', 'gift'],
  },
  {
    id: 'mothers-day',
    name: "Mother's Day Collection",
    category: 'seasonal',
    description: 'Elegant, warm tones, intergenerational, meaningful gifts',
    icon: '🌸',
    prompt: "Create a Mother's Day campaign. Elegant and warm, showing the bond between generations. Soft natural light, meaningful moments, the kind of gift that makes someone cry happy tears.",
    tags: ['seasonal', 'family', 'gift'],
  },
  {
    id: 'holiday',
    name: 'Holiday / Christmas',
    category: 'seasonal',
    description: 'Festive, sparkle, gift boxes, warm lighting, celebration',
    icon: '🎄',
    prompt: "Design a holiday/Christmas jewelry campaign. Festive luxury — think sparkle, gift boxes with ribbon, warm golden lighting, champagne tones, celebration moments. Premium gifting season.",
    tags: ['seasonal', 'festive', 'gift', 'luxury'],
  },
  // Product launches
  {
    id: 'new-collection',
    name: 'New Collection Launch',
    category: 'launch',
    description: 'Dramatic reveal, hero shots, editorial quality, brand moment',
    icon: '✨',
    prompt: "I'm launching a new jewelry collection and need campaign assets. I want dramatic, editorial-quality content — think luxury brand launch. Multiple shots: a teaser, a hero reveal, detail close-ups, and lifestyle context.",
    tags: ['launch', 'editorial', 'campaign'],
  },
  {
    id: 'limited-edition',
    name: 'Limited Edition Drop',
    category: 'launch',
    description: 'Exclusivity, urgency, premium feel, numbered pieces',
    icon: '🔥',
    prompt: "Create content for a limited edition jewelry drop. The feeling should be exclusive and urgent — you need to get this before it's gone. Dark, premium backgrounds with dramatic lighting that says 'rare and special'.",
    tags: ['launch', 'exclusive', 'premium'],
  },
  // Social media
  {
    id: 'instagram-grid',
    name: 'Instagram Grid Collection',
    category: 'social',
    description: '9 cohesive posts that look stunning as a grid',
    icon: '📱',
    prompt: "Design a cohesive Instagram grid — I need a series of images that look beautiful together. Mix of close-ups, lifestyle, flat lays, and detail shots. Consistent color palette and mood across all images. Square format (1:1).",
    tags: ['social', 'instagram', 'grid'],
  },
  {
    id: 'tiktok-viral',
    name: 'TikTok Viral Video',
    category: 'social',
    description: 'Scroll-stopping, trendy, quick cuts, satisfying reveals',
    icon: '📲',
    prompt: "Create a TikTok-style viral video concept. Needs to stop the scroll in the first second. Quick, satisfying, trendy — think ASMR jewelry reveals, sparkle close-ups, and transitions. Vertical 9:16 format, 15 seconds max.",
    tags: ['social', 'tiktok', 'video', 'viral'],
  },
  // Bridal
  {
    id: 'bridal-campaign',
    name: 'Bridal Campaign',
    category: 'bridal',
    description: 'Romantic, soft, wedding-day aspirational, emotional',
    icon: '💒',
    prompt: "Design a bridal jewelry campaign. Romantic, dreamy, aspirational — the kind of images that make brides-to-be save them to their Pinterest boards. Soft lighting, elegant hands, wedding-day moments. Emotional and beautiful.",
    tags: ['bridal', 'romantic', 'wedding'],
  },
  {
    id: 'engagement-ring',
    name: 'Engagement Ring Hero',
    category: 'bridal',
    description: 'The ring is the star — dramatic, emotional, milestone',
    icon: '💍',
    prompt: "Create a hero campaign for an engagement ring. This is the most important piece of jewelry someone will ever buy. Dramatic lighting on the diamond, emotional resonance, milestone moment. The ring needs to look absolutely stunning.",
    tags: ['bridal', 'engagement', 'ring', 'hero'],
  },
  // Lifestyle
  {
    id: 'everyday-luxury',
    name: 'Everyday Luxury',
    category: 'lifestyle',
    description: 'Casual elegance, coffee shop, city life, self-purchase',
    icon: '☕',
    prompt: "Create lifestyle content for everyday jewelry. Not formal or editorial — think casual elegance. Coffee shop mornings, city walks, brunch with friends. The jewelry is part of a beautiful daily life. Target: women who buy for themselves.",
    tags: ['lifestyle', 'casual', 'everyday'],
  },
  {
    id: 'travel-luxury',
    name: 'Travel & Luxury',
    category: 'lifestyle',
    description: 'Exotic locations, jet-set lifestyle, aspirational travel',
    icon: '✈️',
    prompt: "Design travel-lifestyle jewelry content. Think luxury travel — Mediterranean terraces, tropical beaches, boutique hotels. The jewelry complements a jet-set lifestyle. Warm golden light, aspirational settings.",
    tags: ['lifestyle', 'travel', 'luxury'],
  },
  // E-commerce
  {
    id: 'product-page',
    name: 'Product Page Assets',
    category: 'ecommerce',
    description: 'Clean product shots, white background, multiple angles, detail shots',
    icon: '🛒',
    prompt: "Create e-commerce product page images. I need: 1) Clean white background product shot, 2) Angled detail view showing craftsmanship, 3) Scale shot on hand/body, 4) Lifestyle context shot. Professional, accurate, conversion-focused.",
    tags: ['ecommerce', 'product', 'clean'],
  },
];

export function getTemplateById(id: string) {
  return CAMPAIGN_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string) {
  return CAMPAIGN_TEMPLATES.filter(t => t.category === category);
}

export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'launch', label: 'Launches' },
  { id: 'social', label: 'Social Media' },
  { id: 'bridal', label: 'Bridal' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'ecommerce', label: 'E-commerce' },
];
