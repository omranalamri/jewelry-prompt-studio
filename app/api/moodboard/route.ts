import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const data = await sql`SELECT * FROM repository WHERE category = 'mood' ORDER BY created_at DESC LIMIT 50`;
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Moodboard error:', error);
    return Response.json({ success: false, error: 'Could not load moodboard.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, imageUrl, tags } = await req.json();
    if (!imageUrl) return Response.json({ success: false, error: 'Image required.' }, { status: 400 });

    const sql = getDb();
    const data = await sql`INSERT INTO repository (category, title, description, image_url, tags)
      VALUES ('mood', ${title || 'Moodboard Image'}, '', ${imageUrl}, ${tags || []})
      RETURNING *`;

    return Response.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Moodboard save error:', error);
    return Response.json({ success: false, error: 'Could not save.' }, { status: 500 });
  }
}
