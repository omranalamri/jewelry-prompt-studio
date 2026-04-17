// Instagram Graph API v25 adapter
// Docs: https://developers.facebook.com/docs/instagram-api

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

export interface IGPublishRequest {
  accessToken: string;
  igAccountId: string;
  contentType: 'feed_image' | 'feed_video' | 'reel' | 'story' | 'carousel';
  mediaUrls: string[];
  caption?: string;
  hashtags?: string[];
  location?: string;
}

function buildCaption(caption = '', hashtags: string[] = []): string {
  const parts = [caption, '\n#ad #caleums'];
  if (hashtags.length) parts.push(hashtags.map(h => `#${h}`).join(' '));
  return parts.join('');
}

async function createMediaContainer(
  igAccountId: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<string> {
  const body = new URLSearchParams({ ...params, access_token: accessToken });
  const resp = await fetch(`${GRAPH_BASE}/${igAccountId}/media`, { method: 'POST', body });
  if (!resp.ok) throw new Error(`IG container error ${resp.status}`);
  const data = await resp.json();
  return data.id;
}

async function publishContainer(
  igAccountId: string,
  containerId: string,
  accessToken: string,
): Promise<string> {
  const body = new URLSearchParams({ creation_id: containerId, access_token: accessToken });
  const resp = await fetch(`${GRAPH_BASE}/${igAccountId}/media_publish`, { method: 'POST', body });
  if (!resp.ok) throw new Error(`IG publish error ${resp.status}`);
  const data = await resp.json();
  return data.id;
}

export async function publishToInstagram(req: IGPublishRequest): Promise<{ postId: string; url: string }> {
  const caption = buildCaption(req.caption, req.hashtags);

  if (req.contentType === 'carousel' && req.mediaUrls.length > 1) {
    const childIds = await Promise.all(
      req.mediaUrls.map(url =>
        createMediaContainer(req.igAccountId, { image_url: url, is_carousel_item: 'true' }, req.accessToken)
      )
    );
    const carouselId = await createMediaContainer(
      req.igAccountId,
      { media_type: 'CAROUSEL', children: childIds.join(','), caption },
      req.accessToken,
    );
    const postId = await publishContainer(req.igAccountId, carouselId, req.accessToken);
    return { postId, url: `https://instagram.com/p/${postId}` };
  }

  if (req.contentType === 'reel' || req.contentType === 'feed_video') {
    const containerId = await createMediaContainer(
      req.igAccountId,
      { media_type: 'REELS', video_url: req.mediaUrls[0], caption },
      req.accessToken,
    );
    // Video processing can take time; in production poll container status first
    const postId = await publishContainer(req.igAccountId, containerId, req.accessToken);
    return { postId, url: `https://instagram.com/p/${postId}` };
  }

  // Default: single image
  const containerId = await createMediaContainer(
    req.igAccountId,
    { image_url: req.mediaUrls[0], caption },
    req.accessToken,
  );
  const postId = await publishContainer(req.igAccountId, containerId, req.accessToken);
  return { postId, url: `https://instagram.com/p/${postId}` };
}
