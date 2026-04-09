import { NextRequest } from 'next/server';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    const provider = searchParams.get('provider');

    if (!videoId) {
      return errorResponse('MISSING_ID', 'No video ID provided.', 400);
    }

    if (provider === 'nanobanana') {
      const apiKey = process.env.NANOBANANA_API_KEY;
      if (!apiKey) {
        return errorResponse('NOT_CONFIGURED', 'Video service not configured.', 503);
      }

      const response = await fetch(
        `https://nanobananavideo.com/api/v1/video-status.php?video_id=${videoId}`,
        {
          headers: { 'X-API-Key': apiKey },
        }
      );

      if (!response.ok) {
        return errorResponse('STATUS_ERROR', 'Could not check video status.', 500);
      }

      const data = await response.json();

      return Response.json({
        success: true,
        data: {
          id: videoId,
          status: data.status,
          resultUrl: data.video_url || null,
          thumbnailUrl: data.thumbnail_url || null,
        },
      });
    }

    return errorResponse('UNKNOWN_PROVIDER', 'Unknown generation provider.', 400);
  } catch (error) {
    console.error('Status check error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
