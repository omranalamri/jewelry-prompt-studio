import { getDb } from '@/lib/db';

export interface Recommendation {
  model: string;
  cameraPreset: string | null;
  persona: string | null;
  confidence: number;
  basedOn: number;
  avgRating: number;
}

export async function getSmartRecommendation(jewelryType: string): Promise<Recommendation | null> {
  try {
    const sql = getDb();

    // Query combo performance for this jewelry type
    const combos = await sql`
      SELECT generation_model, camera_preset_id, avg_rating, total_generations, quality_score
      FROM combo_performance
      WHERE jewelry_type = ${jewelryType}
        AND rated_generations >= 5
      ORDER BY quality_score DESC
      LIMIT 1
    `;

    if (combos.length === 0) return null;

    const best = combos[0];
    return {
      model: best.generation_model as string,
      cameraPreset: best.camera_preset_id as string | null,
      persona: null,
      confidence: Math.min(1, (best.rated_generations as number) / 50),
      basedOn: best.total_generations as number,
      avgRating: parseFloat(best.avg_rating as string),
    };
  } catch {
    return null;
  }
}

export async function refreshComboPerformance(): Promise<void> {
  try {
    const sql = getDb();

    // Clear and rebuild
    await sql`DELETE FROM combo_performance`;

    await sql`
      INSERT INTO combo_performance (jewelry_type, generation_model, camera_preset_id, total_generations, rated_generations, avg_rating, favorite_count, regeneration_rate, quality_score)
      SELECT
        jewelry_type,
        generation_model,
        camera_preset_id,
        COUNT(*) as total_generations,
        COUNT(user_rating) as rated_generations,
        AVG(user_rating) as avg_rating,
        COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_count,
        AVG(CASE WHEN was_regenerated THEN 1.0 ELSE 0.0 END) as regeneration_rate,
        COALESCE(AVG(user_rating), 0) * 20
          + COALESCE(COUNT(CASE WHEN is_favorite THEN 1 END)::float / NULLIF(COUNT(*), 0) * 30, 0)
          - COALESCE(AVG(CASE WHEN was_regenerated THEN 1.0 ELSE 0.0 END) * 20, 0)
          as quality_score
      FROM generations
      WHERE jewelry_type IS NOT NULL
      GROUP BY jewelry_type, generation_model, camera_preset_id
      HAVING COUNT(*) >= 3
    `;
  } catch (e) {
    console.error('Refresh combo error:', e);
  }
}

export async function getLearnedFragments(jewelryType?: string): Promise<string[]> {
  try {
    const sql = getDb();
    const fragments = jewelryType
      ? await sql`SELECT fragment_text FROM prompt_fragments WHERE is_active = true AND (applies_to_jewelry = '{}' OR ${jewelryType} = ANY(applies_to_jewelry)) AND lift > 0 ORDER BY lift DESC LIMIT 5`
      : await sql`SELECT fragment_text FROM prompt_fragments WHERE is_active = true AND lift > 0 ORDER BY lift DESC LIMIT 5`;

    return fragments.map(f => f.fragment_text as string);
  } catch {
    return [];
  }
}
