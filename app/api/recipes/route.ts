import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const data = await sql`SELECT * FROM saved_recipes ORDER BY times_used DESC, user_rating DESC NULLS LAST, created_at DESC LIMIT 50`;
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Recipes error:', error);
    return Response.json({ success: false, error: 'Could not load recipes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, jewelryType, promptText, modelId, cameraPresetId, colorGradeId, personaId, aspectRatio, referenceImageUrl, resultImageUrl, userRating } = body;

    if (!name || !promptText || !modelId) {
      return Response.json({ success: false, error: 'Name, prompt, and model required.' }, { status: 400 });
    }

    const sql = getDb();
    const data = await sql`
      INSERT INTO saved_recipes (name, description, jewelry_type, prompt_text, model_id, camera_preset_id, color_grade_id, persona_id, aspect_ratio, reference_image_url, result_image_url, user_rating)
      VALUES (${name}, ${description || null}, ${jewelryType || null}, ${promptText}, ${modelId}, ${cameraPresetId || null}, ${colorGradeId || null}, ${personaId || null}, ${aspectRatio || '1:1'}, ${referenceImageUrl || null}, ${resultImageUrl || null}, ${userRating || null})
      RETURNING *
    `;

    return Response.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Recipe save error:', error);
    return Response.json({ success: false, error: 'Could not save recipe.' }, { status: 500 });
  }
}
