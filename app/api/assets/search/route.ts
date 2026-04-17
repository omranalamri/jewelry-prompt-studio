import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateEmbedding, cosineSimilarity, buildAssetSourceText } from '@/lib/dam/embedder';

export const maxDuration = 60;

// Semantic search across repository assets
// Since pgvector migration is pending, uses in-memory cosine similarity for now
// Scales to ~500 assets; beyond that, migrate to pgvector HNSW index
export async function POST(req: NextRequest) {
  try {
    const { query, limit = 20, category } = await req.json();
    if (!query) return Response.json({ success: false, error: 'query required' }, { status: 400 });

    const sql = getDb();
    const items = category
      ? await sql`SELECT * FROM repository WHERE category = ${category} ORDER BY created_at DESC LIMIT 200`
      : await sql`SELECT * FROM repository ORDER BY created_at DESC LIMIT 200`;

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Score each asset by semantic similarity
    const scored = await Promise.all(
      items.map(async (item) => {
        const sourceText = buildAssetSourceText({
          title: item.title,
          description: item.description,
          category: item.category,
          tags: item.tags,
          prompt_text: item.prompt_text,
          jewelry_type: item.jewelry_type,
        });
        if (!sourceText) return { item, score: 0 };
        try {
          const assetEmbedding = await generateEmbedding(sourceText);
          const score = cosineSimilarity(queryEmbedding, assetEmbedding);
          return { item, score };
        } catch { return { item, score: 0 }; }
      })
    );

    // Sort and return top results
    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit).filter(r => r.score > 0.3);

    return Response.json({
      success: true,
      data: results.map(r => ({ ...r.item, similarity: Math.round(r.score * 100) / 100 })),
      query,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
