// Jewelry Domain Knowledge Library
// Structured data about metals, gemstones, cuts, and finishes
// Used by the prompt builder and validation system

export const METALS: Record<string, { name: string; promptTerm: string; karats?: string[]; colors?: string[]; finishes: string[]; promptNotes: string }> = {
  'yellow-gold': {
    name: 'Yellow Gold',
    promptTerm: 'yellow gold',
    karats: ['10k', '14k', '18k', '24k'],
    colors: ['warm yellow', 'rich gold'],
    finishes: ['high polish', 'brushed', 'hammered', 'satin', 'sandblasted'],
    promptNotes: 'Warm reflections, mirror-like when polished. 24k is deeper yellow, 14k is lighter. Always specify karat when known.',
  },
  'white-gold': {
    name: 'White Gold',
    promptTerm: 'white gold with rhodium plating',
    karats: ['10k', '14k', '18k'],
    colors: ['bright silver-white', 'cool white'],
    finishes: ['high polish', 'brushed', 'satin'],
    promptNotes: 'Rhodium plated for bright white appearance. Slightly warmer than platinum. Reflects cool white light.',
  },
  'rose-gold': {
    name: 'Rose Gold',
    promptTerm: 'rose gold',
    karats: ['10k', '14k', '18k'],
    colors: ['warm pink-gold', 'blush copper'],
    finishes: ['high polish', 'brushed', 'satin', 'hammered'],
    promptNotes: 'Copper alloy gives warm pink tone. 18k is more subtle pink, 10k is more copper. Complements warm skin tones.',
  },
  platinum: {
    name: 'Platinum',
    promptTerm: 'platinum',
    finishes: ['high polish', 'brushed', 'satin', 'matte'],
    promptNotes: 'Naturally white, denser than gold. Develops a natural patina over time. Heavier feel. Cool-toned reflections.',
  },
  silver: {
    name: 'Sterling Silver',
    promptTerm: 'sterling silver',
    finishes: ['high polish', 'oxidized', 'brushed', 'antiqued', 'hammered'],
    promptNotes: 'Bright white with cool reflections. Can be oxidized for dark contrast effect. 925 sterling standard.',
  },
};

export const GEMSTONES: Record<string, { name: string; promptTerm: string; transparency: string; cuts: string[]; qualityDescriptors: string[]; promptNotes: string }> = {
  diamond: {
    name: 'Diamond',
    promptTerm: 'diamond with fire and scintillation',
    transparency: 'transparent',
    cuts: ['round brilliant', 'princess (square)', 'cushion', 'emerald (rectangular step)', 'oval', 'pear', 'marquise', 'radiant', 'asscher'],
    qualityDescriptors: ['VS clarity', 'eye-clean', 'ideal cut', 'hearts and arrows'],
    promptNotes: 'NEVER say "sparkle" — always "fire and scintillation". Diamonds refract light into rainbow flashes (fire) and white flashes (brilliance). Facets are always POLISHED, never matte or brushed.',
  },
  ruby: {
    name: 'Ruby',
    promptTerm: 'ruby with rich red saturation',
    transparency: 'transparent',
    cuts: ['oval', 'cushion', 'round', 'emerald (step cut)', 'cabochon (dome)'],
    qualityDescriptors: ['pigeon blood red', 'vivid red', 'deep crimson'],
    promptNotes: 'Best rubies are "pigeon blood" — a deep red with slight blue undertone. Highly saturated. Can show silk (fine needle inclusions) which adds value.',
  },
  sapphire: {
    name: 'Sapphire',
    promptTerm: 'sapphire with velvety depth',
    transparency: 'transparent',
    cuts: ['oval', 'cushion', 'round', 'emerald', 'cabochon'],
    qualityDescriptors: ['cornflower blue', 'royal blue', 'Kashmir blue', 'padparadscha (pink-orange)'],
    promptNotes: 'Sapphires ARE transparent — "transparent sapphire" is correct. Best blues are "cornflower" or "Kashmir". Padparadscha is rare pink-orange variety.',
  },
  emerald: {
    name: 'Emerald',
    promptTerm: 'emerald with natural jardín inclusions',
    transparency: 'transparent (with inclusions)',
    cuts: ['emerald (step cut)', 'oval', 'cushion', 'round'],
    qualityDescriptors: ['vivid green', 'Colombian green', 'Zambian deep green'],
    promptNotes: 'Garden-like inclusions (jardín) are expected and add character. Oil-treated is standard. The "emerald cut" is named after this stone. Rich green with blue undertones.',
  },
  pearl: {
    name: 'Pearl',
    promptTerm: 'lustrous pearl with orient and overtone',
    transparency: 'opaque',
    cuts: ['round', 'drop', 'baroque (irregular)', 'button', 'coin'],
    qualityDescriptors: ['AAA grade', 'high luster', 'mirror-like surface', 'rose overtone', 'cream body'],
    promptNotes: 'NEVER describe pearls as "shiny" — use "lustrous with orient" (the rainbow shimmer on surface). Pearls have body color + overtone. South Sea pearls are largest. Akoya are most round.',
  },
  'cubic-zirconia': {
    name: 'Cubic Zirconia',
    promptTerm: 'CZ stone with bright flash',
    transparency: 'transparent',
    cuts: ['round brilliant', 'princess', 'oval', 'cushion'],
    qualityDescriptors: ['AAAAA grade', 'diamond-like'],
    promptNotes: 'More rainbow flash than diamond. Slightly less depth. For prompt purposes, describe the visual appearance rather than specifying CZ unless the user mentions it.',
  },
};

export const FINISHES: Record<string, { name: string; promptTerm: string; description: string }> = {
  'high-polish': { name: 'High Polish', promptTerm: 'mirror-polished finish with sharp specular reflections', description: 'Mirror-like surface that reflects surroundings clearly' },
  brushed: { name: 'Brushed', promptTerm: 'brushed satin finish with fine linear texture visible under light', description: 'Fine parallel lines creating soft, diffused reflections' },
  hammered: { name: 'Hammered', promptTerm: 'hammered texture with organic dimpled surface catching light at multiple angles', description: 'Irregular indentations creating artisanal, organic look' },
  satin: { name: 'Satin', promptTerm: 'soft satin finish with gentle diffused light reflection', description: 'Smooth but not mirror-like, soft glow' },
  matte: { name: 'Matte', promptTerm: 'matte finish with minimal reflection and velvety surface texture', description: 'Non-reflective, modern look' },
  sandblasted: { name: 'Sandblasted', promptTerm: 'sandblasted frosted texture with granular surface detail', description: 'Rough, frosted appearance from sand treatment' },
  oxidized: { name: 'Oxidized', promptTerm: 'intentionally oxidized darkened patina for contrast and depth', description: 'Darkened surface, usually on silver, for contrast' },
  antiqued: { name: 'Antiqued', promptTerm: 'antiqued finish with darkened recesses highlighting relief detail', description: 'Dark in recesses, bright on raised areas' },
};
