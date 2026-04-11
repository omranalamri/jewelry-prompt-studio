import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const data = await sql`SELECT * FROM brand_guidelines ORDER BY updated_at DESC LIMIT 1`;
    return Response.json({ success: true, data: data[0] || null });
  } catch (error) {
    console.error('Brand error:', error);
    return Response.json({ success: false, error: 'Could not load brand.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, colors, tone, mood, modelPreferences, logoUrl, guidelinesText } = body;

    const sql = getDb();

    // Upsert — update existing or create new
    const existing = await sql`SELECT id FROM brand_guidelines LIMIT 1`;

    if (existing.length > 0) {
      const data = await sql`
        UPDATE brand_guidelines SET
          name = ${name || 'Default Brand'},
          colors = ${JSON.stringify(colors || [])},
          tone = ${tone || null},
          mood = ${mood || null},
          model_preferences = ${JSON.stringify(modelPreferences || {})},
          logo_url = ${logoUrl || null},
          guidelines_text = ${guidelinesText || null},
          updated_at = now()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return Response.json({ success: true, data: data[0] });
    } else {
      const data = await sql`
        INSERT INTO brand_guidelines (name, colors, tone, mood, model_preferences, logo_url, guidelines_text)
        VALUES (${name || 'Default Brand'}, ${JSON.stringify(colors || [])}, ${tone || null}, ${mood || null}, ${JSON.stringify(modelPreferences || {})}, ${logoUrl || null}, ${guidelinesText || null})
        RETURNING *
      `;
      return Response.json({ success: true, data: data[0] });
    }
  } catch (error) {
    console.error('Brand save error:', error);
    return Response.json({ success: false, error: 'Could not save brand.' }, { status: 500 });
  }
}
