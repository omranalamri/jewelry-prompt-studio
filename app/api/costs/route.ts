import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    const [totals] = await sql`
      SELECT
        COUNT(*) as total_generations,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(CASE WHEN type = 'image' THEN cost ELSE 0 END), 0) as image_cost,
        COALESCE(SUM(CASE WHEN type = 'video' THEN cost ELSE 0 END), 0) as video_cost,
        COALESCE(SUM(CASE WHEN type = 'analysis' THEN cost ELSE 0 END), 0) as analysis_cost,
        COUNT(CASE WHEN type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN type = 'video' THEN 1 END) as video_count
      FROM cost_log
    `;

    const today = await sql`
      SELECT COALESCE(SUM(cost), 0) as today_cost, COUNT(*) as today_count
      FROM cost_log WHERE created_at >= CURRENT_DATE
    `;

    const byModel = await sql`
      SELECT model, COUNT(*) as count, COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(duration_seconds), 0) as avg_duration
      FROM cost_log GROUP BY model ORDER BY total_cost DESC
    `;

    const recent = await sql`
      SELECT model, type, cost, duration_seconds, prompt_preview, created_at
      FROM cost_log ORDER BY created_at DESC LIMIT 20
    `;

    return Response.json({
      success: true,
      data: {
        totals: {
          totalGenerations: parseInt(totals.total_generations as string),
          totalCost: parseFloat(totals.total_cost as string),
          imageCost: parseFloat(totals.image_cost as string),
          videoCost: parseFloat(totals.video_cost as string),
          analysisCost: parseFloat(totals.analysis_cost as string),
          imageCount: parseInt(totals.image_count as string),
          videoCount: parseInt(totals.video_count as string),
        },
        today: {
          cost: parseFloat(today[0].today_cost as string),
          count: parseInt(today[0].today_count as string),
        },
        byModel,
        recent,
      },
    });
  } catch (error) {
    console.error('Costs error:', error);
    return Response.json({ success: false, error: 'Could not load costs.' }, { status: 500 });
  }
}
