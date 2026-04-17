// Creatomate integration — professional server-side video stitching
// Docs: https://creatomate.com/docs/api
// $41/mo for a startup plan

export type TransitionType = 'fade' | 'slide-left' | 'slide-up' | 'zoom' | 'wipe' | 'crossfade';

export interface CreatomateClip {
  videoUrl: string;
  duration?: number;            // seconds
  transition?: TransitionType;
}

export interface TextOverlay {
  text: string;
  startTime: number;
  duration: number;
  position: 'top' | 'center' | 'bottom';
  style: 'headline' | 'subtitle' | 'price' | 'cta';
  language?: 'en' | 'ar';
}

export interface StitchRequest {
  clips: CreatomateClip[];
  audioUrl?: string;
  textOverlays?: TextOverlay[];
  outputFormat: 'mp4' | 'gif' | 'webm';
  outputResolution: '1080x1920' | '1080x1080' | '1920x1080';
  watermarkUrl?: string;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface StitchResult {
  renderUrl: string;
  renderId: string;
  thumbnailUrl?: string;
}

function apiKey(): string {
  const k = process.env.CREATOMATE_API_KEY;
  if (!k) throw new Error('CREATOMATE_API_KEY not set. Get one at https://creatomate.com');
  return k;
}

export async function stitchWithCreatomate(req: StitchRequest): Promise<StitchResult> {
  const key = apiKey();

  const [width, height] = req.outputResolution.split('x').map(Number);
  const elements: Record<string, unknown>[] = [];

  let timeOffset = 0;
  for (let i = 0; i < req.clips.length; i++) {
    const clip = req.clips[i];
    const duration = clip.duration || 8;
    const transition = clip.transition || 'crossfade';

    elements.push({
      type: 'video',
      source: clip.videoUrl,
      time: timeOffset,
      duration,
      ...(i > 0 && { transition: { type: transition, duration: 0.5 } }),
    });

    timeOffset += duration;
  }

  if (req.audioUrl) {
    elements.push({
      type: 'audio',
      source: req.audioUrl,
      time: 0,
      duration: timeOffset,
      volume: 0.3,
      audio_fade_out: 1.5,
    });
  }

  for (const overlay of req.textOverlays || []) {
    elements.push({
      type: 'text',
      text: overlay.text,
      time: overlay.startTime,
      duration: overlay.duration,
      y: overlay.position === 'top' ? '10%' : overlay.position === 'bottom' ? '85%' : '50%',
      x: '50%',
      x_anchor: '50%',
      y_anchor: '50%',
      width: '80%',
      font_family: overlay.language === 'ar' ? 'Noto Sans Arabic' : 'Cormorant Garamond',
      font_size: overlay.style === 'headline' ? '42' : '28',
      fill_color: '#f0ece0',
      text_direction: overlay.language === 'ar' ? 'rtl' : 'ltr',
      shadow_color: 'rgba(0,0,0,0.6)',
      shadow_blur: 8,
    });
  }

  if (req.watermarkUrl) {
    const pos = req.watermarkPosition || 'bottom-right';
    elements.push({
      type: 'image',
      source: req.watermarkUrl,
      width: '15%',
      x: pos.includes('right') ? '88%' : '12%',
      y: pos.includes('bottom') ? '92%' : '8%',
      opacity: 0.7,
    });
  }

  const resp = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      output_format: req.outputFormat,
      width,
      height,
      source: {
        elements,
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Creatomate error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const render = Array.isArray(data) ? data[0] : data;

  return {
    renderUrl: render.url,
    renderId: render.id,
    thumbnailUrl: render.snapshot_url,
  };
}

// Poll a render until completion (up to 3 min)
export async function waitForRender(renderId: string, maxWaitMs = 180000): Promise<{ url: string; status: string }> {
  const key = apiKey();
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const resp = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.status === 'succeeded' && data.url) return { url: data.url, status: 'succeeded' };
      if (data.status === 'failed') throw new Error('Creatomate render failed');
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Creatomate render timed out');
}

export function isCreatomateConfigured(): boolean {
  return !!process.env.CREATOMATE_API_KEY;
}
