export interface ReelScene {
  id: number;
  name: string;
  duration: number; // seconds
  shotType: string;
  purpose: string;
  promptGuidance: string;
}

export interface ReelTemplate {
  id: string;
  name: string;
  totalDuration: number;
  scenes: ReelScene[];
  platform: 'instagram-reels' | 'tiktok' | 'youtube-shorts' | 'campaign';
  aspectRatio: '9:16' | '16:9' | '1:1';
}

export const REEL_TEMPLATES: ReelTemplate[] = [
  {
    id: 'hook-hero-detail',
    name: 'Hook → Hero → Detail (15s)',
    totalDuration: 15,
    platform: 'instagram-reels',
    aspectRatio: '9:16',
    scenes: [
      {
        id: 1,
        name: 'Hook',
        duration: 3,
        shotType: 'extreme-close-up',
        purpose: 'Stop the scroll — high visual impact in first 1.5 seconds',
        promptGuidance: 'Extreme close-up of the most visually striking detail — diamond facets, gold texture, stone color. Dramatic lighting, shallow depth of field, slow reveal motion.',
      },
      {
        id: 2,
        name: 'Hero',
        duration: 5,
        shotType: 'full-product',
        purpose: 'Show the complete piece in its best light',
        promptGuidance: 'Full view of the jewelry piece on body/surface. Beautiful composition, professional lighting, the money shot. Slow cinematic movement.',
      },
      {
        id: 3,
        name: 'Detail',
        duration: 4,
        shotType: 'lifestyle-detail',
        purpose: 'Show the piece in context — how it looks being worn',
        promptGuidance: 'Lifestyle context shot — piece being worn in an aspirational setting. Natural movement, warm lighting, emotional connection.',
      },
      {
        id: 4,
        name: 'Close',
        duration: 3,
        shotType: 'beauty-shot',
        purpose: 'Final beauty shot that lingers — the "want" moment',
        promptGuidance: 'Final glamour shot of the piece. Slow motion sparkle, light catching gems, cinematic fade quality. Leave the viewer wanting.',
      },
    ],
  },
  {
    id: 'transformation',
    name: 'Transformation (20s)',
    totalDuration: 20,
    platform: 'tiktok',
    aspectRatio: '9:16',
    scenes: [
      {
        id: 1,
        name: 'Before',
        duration: 3,
        shotType: 'plain-product',
        purpose: 'Show the piece simply — product on surface',
        promptGuidance: 'Simple clean product shot on neutral surface. Flat lighting, minimal staging. Sets up the transformation.',
      },
      {
        id: 2,
        name: 'Transition',
        duration: 4,
        shotType: 'creative-transition',
        purpose: 'Magical transformation moment',
        promptGuidance: 'Creative transition — light sweep, fabric reveal, or hand picking up the piece. Dynamic motion, building energy.',
      },
      {
        id: 3,
        name: 'Styled',
        duration: 5,
        shotType: 'styled-shot',
        purpose: 'The piece fully styled in a beautiful scene',
        promptGuidance: 'Full styled shot with props, fabric, flowers. Luxury setting, dramatic lighting, editorial quality. Slow cinematic.',
      },
      {
        id: 4,
        name: 'On Body',
        duration: 5,
        shotType: 'lifestyle-worn',
        purpose: 'Show it being worn — the aspiration shot',
        promptGuidance: 'Piece being worn on model in lifestyle setting. Natural elegant movement, catching light. Aspirational context.',
      },
      {
        id: 5,
        name: 'Close',
        duration: 3,
        shotType: 'sparkle-close',
        purpose: 'Final sparkle moment',
        promptGuidance: 'Extreme close-up beauty shot with maximum sparkle and light play. Slow motion, cinematic.',
      },
    ],
  },
  {
    id: 'editorial-story',
    name: 'Editorial Story (30s)',
    totalDuration: 30,
    platform: 'campaign',
    aspectRatio: '16:9',
    scenes: [
      {
        id: 1,
        name: 'Atmosphere',
        duration: 4,
        shotType: 'establishing',
        purpose: 'Set the mood — location, lighting, atmosphere',
        promptGuidance: 'Establishing shot of the scene. Luxury environment, cinematic atmosphere, dramatic lighting. No jewelry visible yet — build anticipation.',
      },
      {
        id: 2,
        name: 'Reveal',
        duration: 5,
        shotType: 'product-reveal',
        purpose: 'First glimpse of the jewelry',
        promptGuidance: 'Slow reveal of the jewelry piece. Dramatic lighting hitting the piece for the first time. Beautiful staging.',
      },
      {
        id: 3,
        name: 'Detail Exploration',
        duration: 5,
        shotType: 'macro-detail',
        purpose: 'Explore craftsmanship up close',
        promptGuidance: 'Macro close-ups exploring the craftsmanship. Stone setting, metal finish, intricate details. Orbital camera movement.',
      },
      {
        id: 4,
        name: 'On Model',
        duration: 6,
        shotType: 'model-beauty',
        purpose: 'The piece worn by a model — the editorial moment',
        promptGuidance: 'Model wearing the piece in editorial pose. Professional fashion photography in motion. Dramatic lighting, confidence, luxury.',
      },
      {
        id: 5,
        name: 'Lifestyle',
        duration: 5,
        shotType: 'lifestyle-moment',
        purpose: 'Aspirational lifestyle context',
        promptGuidance: 'Lifestyle scene showing the piece in real life. Elegant dinner, gallery opening, or intimate moment. Natural movement.',
      },
      {
        id: 6,
        name: 'Final Beauty',
        duration: 5,
        shotType: 'hero-beauty',
        purpose: 'Hero beauty shot — the signature frame',
        promptGuidance: 'The iconic final shot. Maximum production value. Slow motion, perfect lighting, the image that stays in memory.',
      },
    ],
  },
];

export function getTemplateById(id: string): ReelTemplate | undefined {
  return REEL_TEMPLATES.find(t => t.id === id);
}
