import { NextRequest } from 'next/server';
import { stitchWithCreatomate, isCreatomateConfigured } from '@/lib/video/creatomate';
import { saveToBlob } from '@/lib/blob-storage';
import { getDb } from '@/lib/db';
import { guardRoute } from '@/lib/auth/route-guard';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = await guardRoute(req, { limiter: 'video', prefix: 'auto-stitch' });
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();

    if (!isCreatomateConfigured()) {
      return Response.json(
        {
          success: false,
          error: 'Creatomate not configured. Set CREATOMATE_API_KEY. Get one at https://creatomate.com',
          code: 'NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    if (!body.clips || body.clips.length === 0) {
      return Response.json({ success: false, error: 'clips array required' }, { status: 400 });
    }

    const result = await stitchWithCreatomate({
      clips: body.clips,
      audioUrl: body.audioUrl,
      textOverlays: body.textOverlays,
      outputFormat: body.outputFormat || 'mp4',
      outputResolution: body.outputResolution || '1080x1920',
      watermarkUrl: body.watermarkUrl,
      watermarkPosition: body.watermarkPosition,
    });

    // Save the final render to Blob permanently
    const permanentUrl = await saveToBlob(result.renderUrl, 'stitched-reel');

    // Save to repository
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, description, image_url, tags)
        VALUES ('video', ${`Campaign Reel — ${new Date().toLocaleDateString()}`}, ${`Auto-stitched from ${body.clips.length} clips`}, ${permanentUrl}, ${['video', 'reel', 'stitched', 'creatomate']})`;
    } catch { /* */ }

    return Response.json({
      success: true,
      data: {
        videoUrl: permanentUrl,
        thumbnailUrl: result.thumbnailUrl,
        renderId: result.renderId,
        clipCount: body.clips.length,
      },
    });
  } catch (err) {
    logError(err, { route: '/api/video/auto-stitch', actor: guard.actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'AUTOSTITCH_FAILED' }, { status: 500 });
  }
}
