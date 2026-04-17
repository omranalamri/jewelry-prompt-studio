import { getDb } from '@/lib/db';

// GET /api/models — fetch model portraits from repository
export async function GET() {
  try {
    const sql = getDb();
    const models = await sql`
      SELECT id, title, description, image_url, tags, created_at
      FROM repository
      WHERE category = 'model'
      ORDER BY created_at DESC
    `;

    return Response.json({
      success: true,
      data: models.map(m => ({
        id: m.id,
        name: m.title,
        description: m.description,
        imageUrl: m.image_url,
        tags: m.tags || [],
        gender: (m.tags || []).includes('female') ? 'female' : 'male',
      })),
    });
  } catch (error) {
    console.error('Models fetch error:', error);
    return Response.json({ success: false, data: [] });
  }
}
