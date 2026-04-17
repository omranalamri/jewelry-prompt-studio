import { put } from '@vercel/blob';
import { getDb } from '@/lib/db';

export const maxDuration = 300;

// Batch rehost all Replicate delivery URLs to permanent Vercel Blob
export async function POST() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ success: false, error: 'Blob not configured' }, { status: 503 });
  }

  const sql = getDb();
  const items = await sql`SELECT id, image_url, category FROM repository WHERE image_url LIKE '%replicate.delivery%' ORDER BY created_at DESC LIMIT 50`;

  let rehosted = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const resp = await fetch(item.image_url);
      if (!resp.ok) { failed++; continue; }
      const buf = Buffer.from(await resp.arrayBuffer());
      const ext = item.image_url.includes('.png') ? 'png' : 'jpg';
      const blob = await put(`${item.category || 'repo'}/${crypto.randomUUID()}.${ext}`, buf, {
        access: 'public', contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      });
      await sql`UPDATE repository SET image_url = ${blob.url} WHERE id = ${item.id}`;
      rehosted++;
    } catch {
      failed++;
    }
  }

  return Response.json({
    success: true,
    data: { total: items.length, rehosted, failed, remaining: items.length - rehosted },
  });
}
