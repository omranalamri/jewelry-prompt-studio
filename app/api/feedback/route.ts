import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { refreshComboPerformance } from '@/lib/learning/smart-recommendations';

export async function POST(req: NextRequest) {
  try {
    const { generationId, rating, feedback, tags, isFavorite } = await req.json();

    if (!generationId) {
      return Response.json({ success: false, error: 'Generation ID required.' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      UPDATE generations SET
        user_rating = COALESCE(${rating || null}, user_rating),
        user_feedback = COALESCE(${feedback || null}, user_feedback),
        feedback_tags = CASE WHEN ${tags || null}::text[] IS NOT NULL THEN ${tags || []} ELSE feedback_tags END,
        is_favorite = COALESCE(${isFavorite ?? null}, is_favorite),
        rated_at = now()
      WHERE id = ${generationId}
    `;

    // Auto-save 5-star generations as reusable prompt templates
    if (rating === 5) {
      try {
        const gen = await sql`SELECT prompt_text, generation_model, jewelry_type, result_url FROM generations WHERE id = ${generationId} LIMIT 1`;
        if (gen.length > 0 && gen[0].result_url) {
          await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata)
            SELECT 'reference', ${'5-Star Template — ' + (gen[0].jewelry_type || 'jewelry')}, ${(gen[0].prompt_text as string || '').slice(0, 300)}, ${gen[0].result_url}, ${['template', '5-star', gen[0].jewelry_type || 'jewelry', gen[0].generation_model || ''].filter(Boolean)}, ${JSON.stringify({ rating: 5, model: gen[0].generation_model })}
            WHERE NOT EXISTS (SELECT 1 FROM repository WHERE image_url = ${gen[0].result_url})`;
        }
      } catch { /* non-critical */ }
    }

    // Check if we should refresh combo stats (every 10 new ratings)
    const ratedCount = await sql`SELECT COUNT(*) as c FROM generations WHERE user_rating IS NOT NULL AND rated_at > now() - interval '1 hour'`;
    if (parseInt(ratedCount[0].c as string) % 10 === 0) {
      // Refresh in background — don't block the response
      refreshComboPerformance().catch(() => {});
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return Response.json({ success: false, error: 'Could not save feedback.' }, { status: 500 });
  }
}

// Get feedback stats
export async function GET() {
  try {
    const sql = getDb();

    const stats = await sql`
      SELECT
        COUNT(*) as total_generations,
        COUNT(user_rating) as rated,
        AVG(user_rating) as avg_rating,
        COUNT(CASE WHEN is_favorite THEN 1 END) as favorites,
        COUNT(CASE WHEN was_regenerated THEN 1 END) as regenerated
      FROM generations
    `;

    const byJewelry = await sql`
      SELECT jewelry_type, COUNT(*) as count, AVG(user_rating) as avg_rating
      FROM generations
      WHERE jewelry_type IS NOT NULL AND user_rating IS NOT NULL
      GROUP BY jewelry_type
      ORDER BY avg_rating DESC
    `;

    const byModel = await sql`
      SELECT generation_model, COUNT(*) as count, AVG(user_rating) as avg_rating,
        AVG(cost) as avg_cost
      FROM generations
      WHERE user_rating IS NOT NULL
      GROUP BY generation_model
      ORDER BY avg_rating DESC
    `;

    const recentFeedback = await sql`
      SELECT generation_model, jewelry_type, user_rating, feedback_tags, user_feedback, created_at
      FROM generations
      WHERE user_rating IS NOT NULL
      ORDER BY rated_at DESC
      LIMIT 20
    `;

    return Response.json({
      success: true,
      data: {
        stats: stats[0],
        byJewelry,
        byModel,
        recentFeedback,
      },
    });
  } catch (error) {
    console.error('Feedback stats error:', error);
    return Response.json({ success: false, error: 'Could not load stats.' }, { status: 500 });
  }
}
