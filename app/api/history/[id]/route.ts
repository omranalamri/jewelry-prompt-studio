import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('History delete error:', error);
      return errorResponse('DB_ERROR', 'Could not delete entry.', 500);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('History delete error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
