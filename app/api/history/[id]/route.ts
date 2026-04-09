import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    await sql`DELETE FROM sessions WHERE id = ${id}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error('History delete error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
