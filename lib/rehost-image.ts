import Replicate from 'replicate';

// Vercel Blob URLs return 403 to ALL external fetches — even from our own server.
// This is a CSP restriction on the Blob store.
//
// Solution: Use Replicate's file upload with the raw blob data from the upload step,
// or skip the reference entirely and rely on the prompt alone.
//
// For NOW: detect blob URLs and return null so the generation uses prompt-only mode.
// The image_input will only work with Replicate-hosted URLs (from previous generations).

const cache = new Map<string, string>();

export async function rehostForReplicate(url: string): Promise<string | undefined> {
  // Already a Replicate URL — use as-is
  if (url.includes('replicate.delivery') || url.includes('api.replicate.com')) return url;

  // Check cache
  const cached = cache.get(url);
  if (cached) return cached;

  // Vercel Blob URLs are NOT accessible externally — skip
  if (url.includes('blob.vercel-storage.com')) {
    // Can't use this URL for image_input. Return undefined so the model generates from prompt only.
    return undefined;
  }

  // Other URLs (caleums.com, etc.) — try to re-host
  if (!process.env.REPLICATE_API_TOKEN) return undefined;

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const resp = await fetch(url);
    if (!resp.ok) return undefined;

    const imageBlob = await resp.blob();
    const file = await replicate.files.create(imageBlob, {
      filename: 'jewelry-ref.jpg',
      content_type: 'image/jpeg',
    });

    const rehostedUrl = (file as unknown as { urls?: { get?: string } }).urls?.get;
    if (rehostedUrl) {
      cache.set(url, rehostedUrl);
      return rehostedUrl;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
