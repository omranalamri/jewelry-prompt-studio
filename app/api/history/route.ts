import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const module = searchParams.get('module');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('sessions')
      .select('*', { count: 'exact' })
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (module) {
      query = query.eq('module', module);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('History fetch error:', error);
      return errorResponse('DB_ERROR', 'Could not load history.', 500);
    }

    return Response.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        total: count || 0,
        hasMore: (count || 0) > page * limit,
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
    const { module, title, inputContext, outputType, imageUrls, result } = body;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        module,
        title,
        input_context: inputContext,
        output_type: outputType,
        image_urls: imageUrls || [],
        result,
        is_saved: true,
      })
      .select()
      .single();

    if (error) {
      console.error('History save error:', error);
      return errorResponse('DB_ERROR', 'Could not save to history.', 500);
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('History save error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
