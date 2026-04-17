import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { saveToBlob } from '@/lib/blob-storage';

export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');

    const sql = getDb();

    let data;
    if (category) {
      data = await sql`SELECT * FROM repository WHERE category = ${category} ORDER BY created_at DESC LIMIT 100`;
    } else if (tag) {
      data = await sql`SELECT * FROM repository WHERE ${tag} = ANY(tags) ORDER BY created_at DESC LIMIT 100`;
    } else if (search) {
      data = await sql`SELECT * FROM repository WHERE title ILIKE ${'%' + search + '%'} OR description ILIKE ${'%' + search + '%'} ORDER BY created_at DESC LIMIT 100`;
    } else {
      data = await sql`SELECT * FROM repository ORDER BY created_at DESC LIMIT 100`;
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Repository error:', error);
    return errorResponse('DB_ERROR', 'Could not load repository.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, title, description, imageUrl, tags, metadata } = body;

    if (!category || !title || !imageUrl) {
      return errorResponse('MISSING_FIELDS', 'Category, title, and imageUrl are required.', 400);
    }

    // Rehost temporary URLs to permanent Vercel Blob storage
    const permanentUrl = await saveToBlob(imageUrl, category);

    const sql = getDb();
    const metaJson = metadata ? JSON.stringify(metadata) : '{}';
    const data = await sql`
      INSERT INTO repository (category, title, description, image_url, tags, metadata)
      VALUES (${category}, ${title}, ${description || null}, ${permanentUrl}, ${tags || []}, ${metaJson}::jsonb)
      RETURNING *
    `;

    return Response.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Repository save error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    return errorResponse('DB_ERROR', `Save failed: ${msg.slice(0, 100)}`, 500);
  }
}
