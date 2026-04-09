import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const module = searchParams.get('module');
    const offset = (page - 1) * limit;

    const sql = getDb();

    let data;
    let countResult;

    if (module) {
      data = await sql`
        SELECT * FROM sessions
        WHERE is_saved = true AND module = ${module}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM sessions
        WHERE is_saved = true AND module = ${module}
      `;
    } else {
      data = await sql`
        SELECT * FROM sessions
        WHERE is_saved = true
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM sessions WHERE is_saved = true
      `;
    }

    const total = parseInt(countResult[0].total as string);

    return Response.json({
      success: true,
      data,
      pagination: {
        page,
        total,
        hasMore: total > page * limit,
      },
    });
  } catch (error) {
    console.error('History error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { module, title, inputContext, outputType, result } = body;

    const sql = getDb();
    const data = await sql`
      INSERT INTO sessions (module, title, input_context, output_type, result, is_saved)
      VALUES (${module}, ${title}, ${inputContext}, ${outputType || null}, ${JSON.stringify(result)}, true)
      RETURNING *
    `;

    return Response.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('History save error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
