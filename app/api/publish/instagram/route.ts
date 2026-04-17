import { NextRequest } from 'next/server';
import { publishToInstagram } from '@/lib/integrations/instagram';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 60;

// Whitelist of fields the client may supply. Credentials and account identity
// are server-controlled and never taken from the request body.
type InstagramContentType = 'feed_image' | 'feed_video' | 'reel' | 'story' | 'carousel';
const VALID_CONTENT_TYPES: InstagramContentType[] = ['feed_image', 'feed_video', 'reel', 'story', 'carousel'];

interface InstagramPublishBody {
  mediaUrls: string[];
  caption?: string;
  contentType?: InstagramContentType;
}

function badRequest(msg: string, code = 'BAD_REQUEST'): Response {
  return Response.json({ success: false, error: msg, code }, { status: 400 });
}

export async function POST(req: NextRequest) {
  // ── Auth: admin-only, derived from Clerk session (or bypass token in preview) ──
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const actor = guard.actor;

  try {
    const body = (await req.json()) as Partial<InstagramPublishBody> & Record<string, unknown>;

    // Validate client-supplied fields only. Never accept accessToken / igAccountId
    // from the request — those are loaded from env (tenant-owned integration).
    if (!Array.isArray(body.mediaUrls) || body.mediaUrls.length === 0) {
      return badRequest('mediaUrls required (array of Blob URLs)', 'MISSING_MEDIA');
    }
    if (body.mediaUrls.some(u => typeof u !== 'string' || !/^https?:\/\//.test(u))) {
      return badRequest('mediaUrls must be absolute http(s) URLs');
    }
    const caption = typeof body.caption === 'string' ? body.caption : '';
    const contentType = VALID_CONTENT_TYPES.find(t => t === body.contentType) ?? 'feed_image';

    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
    if (!accessToken || !igAccountId) {
      return Response.json(
        { success: false, error: 'Instagram not configured on this deployment', code: 'NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    // ── Asset approval gate ──
    // Every media URL must correspond to a repository row EXPLICITLY marked
    // 'approved'. NULL is not treated as approved — legacy rows must go
    // through the compliance workflow before they can be published.
    const sql = getDb();
    const approvedRows = await sql`
      SELECT image_url
      FROM repository
      WHERE image_url = ANY(${body.mediaUrls}::text[])
        AND governance_status = 'approved'
    `;
    const approved = new Set(approvedRows.map(r => String(r.image_url)));
    const unapproved = body.mediaUrls.filter(u => !approved.has(u));
    if (unapproved.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'Some media URLs are not approved for publishing',
          code: 'NOT_APPROVED',
          unapprovedCount: unapproved.length,
        },
        { status: 403 },
      );
    }

    const result = await publishToInstagram({
      mediaUrls: body.mediaUrls,
      caption,
      contentType,
      accessToken,
      igAccountId,
    });

    try {
      await sql`
        INSERT INTO audit_log (actor_id, actor_name, action, entity_type, entity_id, details)
        VALUES (
          ${actor.userId},
          ${actor.name},
          'post.publish.instagram',
          'post',
          ${result.postId},
          ${JSON.stringify({ url: result.url, mediaUrls: body.mediaUrls, source: actor.source })}::jsonb
        )
      `;
    } catch (auditErr) {
      // Audit failure is worth logging but not worth rolling back a live post
      logError(auditErr, { route: '/api/publish/instagram', stage: 'audit' });
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    logError(err, { route: '/api/publish/instagram', actor: actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'PUBLISH_FAILED' }, { status: 500 });
  }
}
