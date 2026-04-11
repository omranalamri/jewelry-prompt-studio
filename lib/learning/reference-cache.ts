import { getDb } from '@/lib/db';

export interface CachedAnalysis {
  id: string;
  imageUrl: string;
  analysis: Record<string, unknown>;
  jewelryType: string | null;
  metalType: string | null;
  detectedText: string | null;
  timesUsed: number;
}

// Simple hash from URL — not a perceptual hash, but good enough for exact URL dedup
function hashUrl(url: string): string {
  return Buffer.from(url).toString('base64').slice(0, 32);
}

export async function getCachedAnalysis(imageUrl: string): Promise<CachedAnalysis | null> {
  try {
    const sql = getDb();
    const hash = hashUrl(imageUrl);
    const results = await sql`
      SELECT * FROM reference_analyses WHERE image_hash = ${hash} LIMIT 1
    `;

    if (results.length > 0) {
      // Increment usage count
      await sql`UPDATE reference_analyses SET times_used = times_used + 1 WHERE id = ${results[0].id}`;
      return {
        id: results[0].id as string,
        imageUrl: results[0].image_url as string,
        analysis: results[0].analysis as Record<string, unknown>,
        jewelryType: results[0].jewelry_type as string | null,
        metalType: results[0].metal_type as string | null,
        detectedText: results[0].detected_text as string | null,
        timesUsed: (results[0].times_used as number) + 1,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheAnalysis(params: {
  imageUrl: string;
  analysis: Record<string, unknown>;
  jewelryType?: string;
  metalType?: string;
  detectedText?: string;
  lighting?: string;
  mood?: string;
}): Promise<string | null> {
  try {
    const sql = getDb();
    const hash = hashUrl(params.imageUrl);

    const result = await sql`
      INSERT INTO reference_analyses (image_url, image_hash, analysis, jewelry_type, metal_type, detected_text, lighting_description, mood)
      VALUES (${params.imageUrl}, ${hash}, ${JSON.stringify(params.analysis)}, ${params.jewelryType || null}, ${params.metalType || null}, ${params.detectedText || null}, ${params.lighting || null}, ${params.mood || null})
      ON CONFLICT (image_hash) DO UPDATE SET times_used = reference_analyses.times_used + 1
      RETURNING id
    `;
    return result[0]?.id || null;
  } catch (e) {
    console.error('Cache analysis error:', e);
    return null;
  }
}

export async function getTopReferences(jewelryType?: string, limit = 20): Promise<CachedAnalysis[]> {
  try {
    const sql = getDb();
    const results = jewelryType
      ? await sql`SELECT * FROM reference_analyses WHERE jewelry_type = ${jewelryType} ORDER BY times_used DESC, avg_generation_rating DESC NULLS LAST LIMIT ${limit}`
      : await sql`SELECT * FROM reference_analyses ORDER BY times_used DESC, avg_generation_rating DESC NULLS LAST LIMIT ${limit}`;

    return results.map(r => ({
      id: r.id as string,
      imageUrl: r.image_url as string,
      analysis: r.analysis as Record<string, unknown>,
      jewelryType: r.jewelry_type as string | null,
      metalType: r.metal_type as string | null,
      detectedText: r.detected_text as string | null,
      timesUsed: r.times_used as number,
    }));
  } catch {
    return [];
  }
}
