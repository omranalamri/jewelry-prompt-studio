import { NextRequest } from 'next/server';
import { getSmartRecommendation } from '@/lib/learning/smart-recommendations';
import { getLearnedFragments } from '@/lib/learning/smart-recommendations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jewelryType = searchParams.get('jewelryType') || 'ring';

    const recommendation = await getSmartRecommendation(jewelryType);
    const fragments = await getLearnedFragments(jewelryType);

    return Response.json({
      success: true,
      data: {
        recommendation,
        learnedFragments: fragments,
        hasEnoughData: !!recommendation,
      },
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return Response.json({ success: false, error: 'Could not load recommendations.' }, { status: 500 });
  }
}
