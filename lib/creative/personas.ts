export interface ModelPersona {
  id: string;
  name: string;
  category: 'female' | 'male' | 'hands-only';
  ethnicity: string;
  skinTone: string;
  ageRange: string;
  style: string;
  // Physical descriptors for prompt consistency
  handDescription: string;
  bodyDescription: string;
  hairDescription: string;
  nailDescription: string;
  // Prompt fragment — appended to generation prompts for consistency
  promptFragment: string;
  // Best for which jewelry types
  bestFor: string[];
  thumbnail: string; // emoji placeholder
}

export const MODEL_PERSONAS: ModelPersona[] = [
  {
    id: 'sophia-luxury',
    name: 'Sophia',
    category: 'female',
    ethnicity: 'Mediterranean',
    skinTone: 'warm olive',
    ageRange: '28-35',
    style: 'Luxury Editorial',
    handDescription: 'elegant slender hands with long fingers, warm olive skin, perfectly manicured nails',
    bodyDescription: 'graceful feminine figure, slender neck and defined collarbones',
    hairDescription: 'dark brunette hair styled in soft waves',
    nailDescription: 'nude pink manicure, almond-shaped nails',
    promptFragment: 'elegant woman with warm olive skin, dark brunette waves, slender graceful hands with nude pink almond nails, luxury editorial styling',
    bestFor: ['rings', 'bracelets', 'necklaces', 'earrings'],
    thumbnail: '👩🏽',
  },
  {
    id: 'aria-modern',
    name: 'Aria',
    category: 'female',
    ethnicity: 'East Asian',
    skinTone: 'porcelain fair',
    ageRange: '24-30',
    style: 'Modern Minimalist',
    handDescription: 'delicate porcelain-skinned hands with slim fingers, clean short nails',
    bodyDescription: 'petite refined frame, graceful neck',
    hairDescription: 'sleek straight black hair',
    nailDescription: 'clear gloss manicure, short rounded nails',
    promptFragment: 'elegant East Asian woman with porcelain skin, sleek black hair, delicate hands with clear gloss short nails, modern minimalist styling',
    bestFor: ['rings', 'earrings', 'delicate necklaces'],
    thumbnail: '👩🏻',
  },
  {
    id: 'maya-bold',
    name: 'Maya',
    category: 'female',
    ethnicity: 'South Asian',
    skinTone: 'rich warm brown',
    ageRange: '25-32',
    style: 'Bold & Glamorous',
    handDescription: 'beautiful brown-skinned hands with long elegant fingers, statement nail art',
    bodyDescription: 'statuesque figure, elegant long neck, defined shoulders',
    hairDescription: 'lush dark hair in flowing loose curls',
    nailDescription: 'deep burgundy nails, stiletto shape',
    promptFragment: 'stunning South Asian woman with rich warm brown skin, flowing dark curls, elegant long-fingered hands with deep burgundy stiletto nails, glamorous bold styling',
    bestFor: ['statement rings', 'bangles', 'chandelier earrings', 'chokers'],
    thumbnail: '👩🏾',
  },
  {
    id: 'emma-bridal',
    name: 'Emma',
    category: 'female',
    ethnicity: 'Northern European',
    skinTone: 'fair with warm undertones',
    ageRange: '26-33',
    style: 'Romantic Bridal',
    handDescription: 'fair-skinned graceful hands with rose-tinted knuckles, French manicure',
    bodyDescription: 'feminine silhouette, soft shoulders, elegant décolletage',
    hairDescription: 'honey blonde hair in romantic updo with soft tendrils',
    nailDescription: 'classic French manicure, oval nails',
    promptFragment: 'beautiful fair-skinned woman with honey blonde romantic updo, graceful hands with French manicure oval nails, romantic bridal styling, soft feminine elegance',
    bestFor: ['engagement rings', 'bridal sets', 'pearl earrings', 'tennis bracelets'],
    thumbnail: '👩🏼',
  },
  {
    id: 'zara-editorial',
    name: 'Zara',
    category: 'female',
    ethnicity: 'West African',
    skinTone: 'deep rich ebony',
    ageRange: '24-30',
    style: 'High Fashion Editorial',
    handDescription: 'striking dark-skinned hands with long graceful fingers, metallic nail art',
    bodyDescription: 'tall statuesque model figure, sculptural neck, sharp jawline',
    hairDescription: 'close-cropped natural hair or sleek buzz cut',
    nailDescription: 'gold metallic nails, coffin shape',
    promptFragment: 'striking Black model with deep ebony skin, close-cropped natural hair, long graceful dark-skinned hands with gold metallic coffin nails, high fashion editorial styling',
    bestFor: ['gold jewelry', 'statement pieces', 'cuffs', 'ear cuffs'],
    thumbnail: '👩🏿',
  },
  {
    id: 'hands-elegant',
    name: 'Elegant Hands',
    category: 'hands-only',
    ethnicity: 'Universal',
    skinTone: 'warm medium',
    ageRange: 'ageless',
    style: 'Product Focus',
    handDescription: 'elegant feminine hands with medium warm skin tone, slender fingers, well-groomed natural nails',
    bodyDescription: '',
    hairDescription: '',
    nailDescription: 'natural pink nails, rounded shape, well-groomed',
    promptFragment: 'close-up of elegant feminine hands with warm medium skin, slender fingers, natural pink rounded nails',
    bestFor: ['rings', 'bracelets', 'watches'],
    thumbnail: '🤲',
  },
  {
    id: 'hands-dark',
    name: 'Dark Hands',
    category: 'hands-only',
    ethnicity: 'Universal',
    skinTone: 'deep brown',
    ageRange: 'ageless',
    style: 'Contrast Focus',
    handDescription: 'beautiful deep brown-skinned hands with long elegant fingers, glossy dark nails',
    bodyDescription: '',
    hairDescription: '',
    nailDescription: 'glossy dark chocolate nails, almond shape',
    promptFragment: 'close-up of beautiful deep brown-skinned hands with long elegant fingers, glossy dark almond nails',
    bestFor: ['gold jewelry', 'diamonds', 'rose gold', 'platinum'],
    thumbnail: '🤲🏿',
  },
  {
    id: 'hands-fair',
    name: 'Fair Hands',
    category: 'hands-only',
    ethnicity: 'Universal',
    skinTone: 'porcelain fair',
    ageRange: 'ageless',
    style: 'Delicate Focus',
    handDescription: 'delicate fair-skinned hands with slim fingers, soft pink nail polish',
    bodyDescription: '',
    hairDescription: '',
    nailDescription: 'soft blush pink nails, oval shape',
    promptFragment: 'close-up of delicate fair porcelain-skinned hands with slim fingers, soft blush pink oval nails',
    bestFor: ['engagement rings', 'delicate pieces', 'silver', 'white gold'],
    thumbnail: '🤲🏻',
  },
  {
    id: 'male-classic',
    name: 'James',
    category: 'male',
    ethnicity: 'Mixed',
    skinTone: 'warm tan',
    ageRange: '30-40',
    style: 'Classic Masculine',
    handDescription: 'strong masculine hands with clean trimmed nails, warm tan skin',
    bodyDescription: 'athletic build, strong wrist, tailored shirt cuff visible',
    hairDescription: 'short dark groomed hair',
    nailDescription: 'clean trimmed natural nails',
    promptFragment: 'masculine hands with warm tan skin, strong build, clean trimmed nails, tailored suit cuff, classic luxury styling',
    bestFor: ['watches', 'men\'s rings', 'cufflinks', 'chains'],
    thumbnail: '🧑🏽',
  },
];

export function getPersonaById(id: string): ModelPersona | undefined {
  return MODEL_PERSONAS.find(p => p.id === id);
}

export function getPersonasForJewelryType(type: string): ModelPersona[] {
  const normalized = type.toLowerCase();
  return MODEL_PERSONAS.filter(p =>
    p.bestFor.some(b => normalized.includes(b) || b.includes(normalized))
  );
}
