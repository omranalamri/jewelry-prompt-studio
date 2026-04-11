import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return Response.json({ success: false, error: 'Image URL required.' }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return Response.json({ success: false, error: 'Not configured.' }, { status: 503 });
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const output = await replicate.run('lucataco/remove-bg', {
      input: { image: imageUrl },
    });

    const resultUrl = typeof output === 'string' ? output : String(output);

    return Response.json({ success: true, data: { resultUrl } });
  } catch (error) {
    console.error('Remove BG error:', error);
    return Response.json({ success: false, error: 'Background removal failed.' }, { status: 500 });
  }
}
