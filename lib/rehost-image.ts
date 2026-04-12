import Replicate from 'replicate';

// Vercel Blob URLs return 403 to external services.
// This function re-hosts images via Replicate's files API so all models can access them.

const cache = new Map<string, string>();

export async function rehostForReplicate(url: string): Promise<string> {
  // Skip if already a Replicate URL
  if (url.includes('replicate.delivery') || url.includes('api.replicate.com')) return url;

  // Check cache
  const cached = cache.get(url);
  if (cached) return cached;

  if (!process.env.REPLICATE_API_TOKEN) return url;

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Try to fetch the image. If it's a Blob URL that's blocked externally,
    // we can still access it from our server (same origin).
    let imageBlob: Blob;

    try {
      const resp = await fetch(url);
      if (resp.ok) {
        imageBlob = await resp.blob();
      } else {
        // If the URL is from caleums.com or similar, try the original
        return url; // Can't re-host if we can't fetch it ourselves
      }
    } catch {
      return url;
    }

    // Upload to Replicate
    const file = await replicate.files.create(imageBlob, {
      filename: 'jewelry-ref.jpg',
      content_type: 'image/jpeg',
    });

    const rehostedUrl = (file as unknown as { urls?: { get?: string } }).urls?.get || url;

    // Cache for future use
    if (rehostedUrl !== url) {
      cache.set(url, rehostedUrl);
    }

    return rehostedUrl;
  } catch {
    return url; // Fallback to original
  }
}
