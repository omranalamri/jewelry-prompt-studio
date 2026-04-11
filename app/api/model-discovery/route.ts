import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import Replicate from 'replicate';

export const maxDuration = 120;

// Scan Replicate for new image/video models we don't have yet
async function scanReplicate(): Promise<{
  name: string; sourceId: string; type: string; description: string;
  runs: number; supportsImage: boolean; supportsAudio: boolean;
}[]> {
  if (!process.env.REPLICATE_API_TOKEN) return [];

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const discovered: Awaited<ReturnType<typeof scanReplicate>> = [];

  // Check known promising models we might want
  const candidates = [
    // Image models
    'stability-ai/stable-diffusion-3.5-large',
    'stability-ai/sdxl',
    'ideogram-ai/ideogram-v3-quality',
    'luma/photon',
    'bytedance/sdxl-lightning-4step',
    // Video models
    'bytedance/seedance-1.5-pro',
    'bytedance/seedance-1-lite',
    'google/veo-3',
    'google/veo-2',
    'minimax/video-01',
    'minimax/video-01-live',
    'tencent/hunyuan-video',
    'wan-ai/wan-2.1-i2v-480p',
    'kwaai/kling-v2.0',
    'luma/ray',
  ];

  for (const modelId of candidates) {
    try {
      const [owner, name] = modelId.split('/');
      const model = await replicate.models.get(owner, name);
      const openapi = model.latest_version?.openapi_schema as Record<string, unknown> | undefined;
      const schemas = (openapi?.components as Record<string, unknown>)?.schemas as Record<string, unknown> | undefined;
      const inputSchema = schemas?.Input as Record<string, unknown> | undefined;
      const props = (inputSchema?.properties || {}) as Record<string, unknown>;
      const paramNames = Object.keys(props);

      const isVideo = paramNames.some(p => ['duration', 'fps', 'first_frame_image'].includes(p));
      const supportsImage = paramNames.some(p => ['image', 'image_input', 'image_prompt', 'first_frame_image', 'reference_images'].includes(p));
      const supportsAudio = paramNames.some(p => ['generate_audio', 'audio'].includes(p));

      discovered.push({
        name: model.name || name,
        sourceId: modelId,
        type: isVideo ? 'video' : 'image',
        description: (model.description || '').slice(0, 300),
        runs: model.run_count || 0,
        supportsImage,
        supportsAudio,
      });
    } catch {
      // Model not found or not accessible
    }
  }

  return discovered;
}

// GET — list discovered models
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const sql = getDb();
    const models = status
      ? await sql`SELECT * FROM discovered_models WHERE status = ${status} ORDER BY runs DESC`
      : await sql`SELECT * FROM discovered_models ORDER BY status, runs DESC`;

    return Response.json({ success: true, data: models });
  } catch (error) {
    console.error('Discovery error:', error);
    return Response.json({ success: false, error: 'Failed to load.' }, { status: 500 });
  }
}

// POST — trigger a scan for new models
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'scan') {
      const discovered = await scanReplicate();
      const sql = getDb();

      let newCount = 0;
      for (const m of discovered) {
        // Detailed jewelry relevance rationale
        const reasons: string[] = [];

        if (m.supportsImage && m.type === 'image') reasons.push('Accepts reference images — critical for preserving exact jewelry design during generation');
        if (m.supportsImage && m.type === 'video') reasons.push('Image-to-video capability — animate a perfect still frame, preventing jewelry hallucination');
        if (m.supportsAudio && m.type === 'video') reasons.push('Generates audio with video — complete ad-ready content for Instagram Reels and TikTok');
        if (m.runs > 10000000) reasons.push('Extremely popular (' + (m.runs / 1e6).toFixed(0) + 'M runs) — well-tested, reliable, community support');
        else if (m.runs > 1000000) reasons.push('Popular (' + (m.runs / 1e6).toFixed(1) + 'M runs) — battle-tested at scale');
        if (m.sourceId.includes('seedance')) reasons.push('ByteDance Seedance — excellent for metallic surface rendering and jewelry motion');
        if (m.sourceId.includes('kling')) reasons.push('Kling — industry-leading for metallic physics and realistic motion');
        if (m.sourceId.includes('veo')) reasons.push('Google Veo — highest cinematic quality, native audio');
        if (m.sourceId.includes('flux') || m.sourceId.includes('sdxl')) reasons.push('Diffusion model — good for editorial stills but may hallucinate jewelry details');
        if (m.sourceId.includes('ideogram')) reasons.push('Excellent text rendering — useful for engraved jewelry and branded pieces');
        if (m.sourceId.includes('photon') || m.sourceId.includes('luma')) reasons.push('Luma — strong HDR and diamond sparkle rendering');

        if (reasons.length === 0) reasons.push('General purpose model — evaluate for specific jewelry use case');

        const relevance = reasons.join('. ');
        const impact = reasons.length >= 3 ? 'High' : reasons.length >= 2 ? 'Medium' : 'Low';

        try {
          await sql`INSERT INTO discovered_models (source, source_id, name, provider, model_type, description, runs, supports_image_input, supports_audio, jewelry_relevance)
            VALUES ('replicate', ${m.sourceId}, ${m.name}, ${m.sourceId.split('/')[0]}, ${m.type}, ${m.description}, ${m.runs}, ${m.supportsImage}, ${m.supportsAudio}, ${relevance})
            ON CONFLICT (source, source_id) DO UPDATE SET runs = ${m.runs}, description = ${m.description}`;
          newCount++;
        } catch { /* duplicate or error */ }
      }

      return Response.json({ success: true, data: { scanned: discovered.length, updated: newCount } });
    }

    if (action === 'approve' || action === 'reject' || action === 'test') {
      const { modelId, notes } = await req.json();
      const sql = getDb();
      const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'testing';

      await sql`UPDATE discovered_models SET status = ${newStatus}, test_notes = COALESCE(${notes || null}, test_notes),
        approved_at = CASE WHEN ${newStatus} = 'approved' THEN now() ELSE approved_at END
        WHERE id = ${modelId}`;

      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('Discovery action error:', error);
    return Response.json({ success: false, error: 'Action failed.' }, { status: 500 });
  }
}
