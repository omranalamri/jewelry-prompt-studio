import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    // Get all generated assets
    const generated = await sql`
      SELECT title, description, image_url, tags, created_at
      FROM repository WHERE category = 'generated'
      ORDER BY created_at DESC LIMIT 100
    `;

    // Get all prompts from generations
    const prompts = await sql`
      SELECT prompt_text, generation_model, jewelry_type, result_url, user_rating, cost, created_at
      FROM generations WHERE result_url IS NOT NULL
      ORDER BY created_at DESC LIMIT 100
    `;

    // Get brand guidelines
    const brand = await sql`SELECT * FROM brand_guidelines LIMIT 1`;

    // Build export manifest as JSON (client will create the ZIP)
    const manifest = {
      exportDate: new Date().toISOString(),
      brand: brand[0] || null,
      assets: generated.map(g => ({
        title: g.title,
        description: g.description,
        url: g.image_url,
        tags: g.tags,
        date: g.created_at,
      })),
      prompts: prompts.map(p => ({
        prompt: p.prompt_text,
        model: p.generation_model,
        jewelryType: p.jewelry_type,
        resultUrl: p.result_url,
        rating: p.user_rating,
        cost: p.cost,
        date: p.created_at,
      })),
      stats: {
        totalAssets: generated.length,
        totalPrompts: prompts.length,
        totalCost: prompts.reduce((sum, p) => sum + (parseFloat(p.cost as string) || 0), 0),
      },
    };

    return Response.json({ success: true, data: manifest });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ success: false, error: 'Export failed.' }, { status: 500 });
  }
}
