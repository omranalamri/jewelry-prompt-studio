export interface PlacementRule {
  jewelryType: string;
  bodyPart: string;
  cameraAngle: string;
  composition: string;
  proportionNotes: string;
  lightingTips: string;
  motionDirection: string; // for video
}

export const PLACEMENT_RULES: Record<string, PlacementRule> = {
  ring: {
    jewelryType: 'ring',
    bodyPart: 'ring finger or index finger of left hand',
    cameraAngle: 'close-up at 30-45 degree angle showing ring from slightly above, fingers naturally curved',
    composition: 'ring should occupy 40-60% of frame, finger visible from mid-knuckle, slight hand tilt to catch light on stone facets',
    proportionNotes: 'ring band should appear proportional to finger width — thin bands on slim fingers, wider bands need stronger hands. Diamond/stone should be centered and visible from all angles.',
    lightingTips: 'Key light at 45 degrees to create fire in gemstones. Rim light on metal band to show polish. Avoid flat front lighting that kills dimension.',
    motionDirection: 'slow finger turn or gentle hand lift to catch light across stone facets, wrist rotation showing band detail',
  },
  necklace: {
    jewelryType: 'necklace',
    bodyPart: 'neck and décolletage area',
    cameraAngle: 'front-facing slightly above eye level, capturing from chin to upper chest',
    composition: 'necklace pendant centered on sternum, chain draping naturally along collarbones. Show skin above and below for context. Pendant at 30-40% of frame.',
    proportionNotes: 'chain length relative to neck — choker sits at base of throat, princess length falls at collarbone, matinee at chest. Pendant size should complement not overwhelm the décolletage.',
    lightingTips: 'Soft directional light from above-right to create subtle shadows under chain links. Rim light on metal to separate from skin.',
    motionDirection: 'slow head turn causing pendant to sway, or gentle breath making chain catch light along collarbones',
  },
  earrings: {
    jewelryType: 'earrings',
    bodyPart: 'earlobes, visible with hair swept back or tucked',
    cameraAngle: '3/4 profile showing one earring prominently, second visible in background. Slightly below eye level.',
    composition: 'earring should be the focal point against the jaw/neck line. Hair pulled back or tucked behind ear. Earring at 25-35% of frame.',
    proportionNotes: 'drop earrings should not extend past jawline for elegant proportion. Studs need very close framing. Chandelier earrings need more negative space.',
    lightingTips: 'Side light from earring side to maximize sparkle. Backlight to create halo around hair and ear. Avoid harsh shadows under jaw.',
    motionDirection: 'slow head turn causing drop earrings to sway, or gentle hair tuck behind ear revealing the piece',
  },
  bracelet: {
    jewelryType: 'bracelet',
    bodyPart: 'wrist area, hand either relaxed or holding something elegant',
    cameraAngle: 'close-up of wrist at slight angle, showing bracelet draping naturally. Can include hand holding coffee cup, fabric, or resting on surface.',
    composition: 'bracelet centered on wrist, showing 2-3 inches of forearm. Include hand position for lifestyle context. Bracelet at 40-50% of frame.',
    proportionNotes: 'bracelet should sit at the natural wrist crease, not too tight or loose. Tennis bracelets should show consistent stone pattern. Bangles can stack but keep spacing visible.',
    lightingTips: 'Directional light across the wrist to show bracelet dimension. For diamond tennis bracelets, multiple small highlights show individual stones.',
    motionDirection: 'gentle wrist rotation showing all sides of bracelet, or arm lift allowing bracelet to slide slightly showing how it catches light',
  },
  watch: {
    jewelryType: 'watch',
    bodyPart: 'wrist, typically inner wrist facing camera',
    cameraAngle: 'slightly above wrist level, angled to show dial clearly. Classic "wrist shot" composition.',
    composition: 'watch face should be sharp and legible, occupying 50-60% of frame. Show shirt cuff or jacket sleeve for lifestyle context.',
    proportionNotes: 'watch case should not extend beyond wrist width. Strap should show proper fit — one finger gap. Crown and pushers visible in profile shots.',
    lightingTips: 'Avoid reflections on crystal — use polarizer. Light dial evenly. Create highlights on polished case sides.',
    motionDirection: 'arm raise to check time gesture, or slow wrist turn revealing different angles of the case and dial',
  },
  pendant: {
    jewelryType: 'pendant',
    bodyPart: 'center chest, hanging from chain at natural length',
    cameraAngle: 'front-facing, slightly above to show pendant face and chain drape',
    composition: 'pendant centered vertically, chain forming a V shape from shoulders. Dark or contrasting clothing behind pendant.',
    proportionNotes: 'pendant size should be proportional to the neckline opening. Small pendants need closer framing. Statement pendants need more breathing room.',
    lightingTips: 'Direct light on pendant face, soft fill on chain. Create shadow behind pendant on clothing/skin to add depth.',
    motionDirection: 'slow breathing motion causing pendant to gently rise and fall, or walking motion with subtle pendant sway',
  },
};

export function getPlacementForJewelry(type: string): PlacementRule | undefined {
  const normalized = type.toLowerCase();
  for (const [key, rule] of Object.entries(PLACEMENT_RULES)) {
    if (normalized.includes(key)) return rule;
  }
  return undefined;
}

export function buildPlacementPromptFragment(type: string): string {
  const rule = getPlacementForJewelry(type);
  if (!rule) return '';

  return `PLACEMENT: ${rule.bodyPart}. CAMERA: ${rule.cameraAngle}. COMPOSITION: ${rule.composition}. PROPORTIONS: ${rule.proportionNotes}. LIGHTING: ${rule.lightingTips}.`;
}

export function buildVideoPlacementFragment(type: string): string {
  const rule = getPlacementForJewelry(type);
  if (!rule) return '';

  return `MOTION: ${rule.motionDirection}. CAMERA: ${rule.cameraAngle}. PROPORTIONS: ${rule.proportionNotes}.`;
}
