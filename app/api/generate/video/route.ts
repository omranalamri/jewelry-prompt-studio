import { NextRequest } from 'next/server';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, aspectRatio, imageUrl } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    const apiKey = process.env.NANOBANANA_API_KEY;
    if (!apiKey) {
      return errorResponse('NOT_CONFIGURED', 'Video generation is not configured (missing NANOBANANA_API_KEY).', 503);
    }

    const baseUrl = 'https://nanobananavideo.com/api/v1';

    if (imageUrl) {
      // Image-to-video
      const response = await fetch(`${baseUrl}/image-to-video.php`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_urls: [imageUrl],
          prompt,
          resolution: '1080p',
          duration: duration || 5,
          aspect_ratio: aspectRatio || '16:9',
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('NanoBanana I2V error:', response.status, err);
        return errorResponse('VIDEO_ERROR', `Video generation failed (${response.status})`, 500);
      }

      const data = await response.json();
      if (!data.success) {
        return errorResponse('VIDEO_ERROR', data.error || 'Video generation failed.', 500);
      }

      return Response.json({
        success: true,
        data: {
          id: data.video_id,
          provider: 'nanobanana',
          status: 'processing',
          creditsUsed: data.credits_used,
        },
      });
    } else {
      // Text-to-video
      const response = await fetch(`${baseUrl}/text-to-video.php`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          resolution: '1080p',
          duration: duration || 5,
          aspect_ratio: aspectRatio || '16:9',
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('NanoBanana T2V error:', response.status, err);
        return errorResponse('VIDEO_ERROR', `Video generation failed (${response.status})`, 500);
      }

      const data = await response.json();
      if (!data.success) {
        return errorResponse('VIDEO_ERROR', data.error || 'Video generation failed.', 500);
      }

      return Response.json({
        success: true,
        data: {
          id: data.video_id,
          provider: 'nanobanana',
          status: 'processing',
          creditsUsed: data.credits_used,
        },
      });
    }
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed. Please try again.', 500);
  }
}
