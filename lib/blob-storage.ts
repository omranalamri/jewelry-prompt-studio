import { put } from '@vercel/blob';

// Rehost ANY temporary URL to permanent Vercel Blob storage.
// Call this on every generated image/video BEFORE returning to the client.
export async function saveToBlob(url: string, prefix = 'gen'): Promise<string> {
  if (!url) return url;
  if (url.includes('blob.vercel-storage.com')) return url; // already permanent
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url; // no Blob configured

  try {
    const resp = await fetch(url);
    if (!resp.ok) return url;

    const buf = Buffer.from(await resp.arrayBuffer());
    const isVideo = url.includes('.mp4') || url.includes('.webm');
    const isPng = url.includes('.png');
    const ext = isVideo ? 'mp4' : isPng ? 'png' : 'jpg';
    const contentType = isVideo ? 'video/mp4' : isPng ? 'image/png' : 'image/jpeg';

    const blob = await put(`${prefix}/${crypto.randomUUID()}.${ext}`, buf, {
      access: 'public',
      contentType,
    });
    return blob.url;
  } catch {
    return url; // fallback to original if rehost fails
  }
}
