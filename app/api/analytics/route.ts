import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    // What jewelry types are most generated
    const topJewelry = await sql`
      SELECT jewelry_type, COUNT(*) as count, AVG(user_rating) as avg_rating,
        AVG(cost) as avg_cost
      FROM generations WHERE jewelry_type IS NOT NULL
      GROUP BY jewelry_type ORDER BY count DESC LIMIT 10
    `;

    // What models are most used
    const topModels = await sql`
      SELECT generation_model, COUNT(*) as count, AVG(user_rating) as avg_rating,
        SUM(cost) as total_cost, AVG(duration_seconds) as avg_duration
      FROM generations GROUP BY generation_model ORDER BY count DESC LIMIT 10
    `;

    // Most common issues (from feedback tags)
    const topIssues = await sql`
      SELECT unnest(feedback_tags) as tag, COUNT(*) as count
      FROM generations WHERE feedback_tags != '{}'
      GROUP BY tag ORDER BY count DESC LIMIT 15
    `;

    // Generation volume over time (last 30 days)
    const dailyVolume = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as count, AVG(user_rating) as avg_rating
      FROM generations WHERE created_at > now() - interval '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `;

    // Most used prompt keywords (simple word frequency)
    const promptWords = await sql`
      SELECT word, COUNT(*) as count FROM (
        SELECT unnest(string_to_array(lower(prompt_text), ' ')) as word
        FROM generations WHERE prompt_text IS NOT NULL LIMIT 500
      ) w
      WHERE length(word) > 4
        AND word NOT IN ('with', 'from', 'this', 'that', 'their', 'about', 'which', 'would', 'there', 'these', 'image', 'photo', 'style', 'exact', 'piece')
      GROUP BY word ORDER BY count DESC LIMIT 20
    `;

    // Best performing combos
    const bestCombos = await sql`
      SELECT jewelry_type, generation_model, camera_preset_id,
        COUNT(*) as count, AVG(user_rating) as avg_rating
      FROM generations
      WHERE user_rating IS NOT NULL AND jewelry_type IS NOT NULL
      GROUP BY jewelry_type, generation_model, camera_preset_id
      HAVING COUNT(*) >= 3
      ORDER BY AVG(user_rating) DESC LIMIT 10
    `;

    // Reference images most reused
    const topReferences = await sql`
      SELECT image_url, jewelry_type, times_used, avg_generation_rating
      FROM reference_analyses
      ORDER BY times_used DESC LIMIT 10
    `;

    return Response.json({
      success: true,
      data: {
        topJewelry,
        topModels,
        topIssues,
        dailyVolume,
        promptWords,
        bestCombos,
        topReferences,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ success: false, error: 'Could not load analytics.' }, { status: 500 });
  }
}
