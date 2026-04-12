import { NextRequest } from 'next/server';
import Replicate from 'replicate';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    let formData;
    try { formData = await req.formData(); } catch { return errorResponse('MISSING_FILE', 'No file.', 400); }
    const file = formData.get('file') as File | null;

    if (!file) return errorResponse('MISSING_FILE', 'No file.', 400);
    if (!file.type.startsWith('image/')) return errorResponse('INVALID_FILE_TYPE', 'Upload JPEG/PNG/WebP.', 400);
    if (file.size > 10 * 1024 * 1024) return errorResponse('FILE_TOO_LARGE', 'Under 10MB.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Storage not configured.', 503);

    // Store on Replicate Files API — works for both display and AI model access
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const arrayBuf = await file.arrayBuffer();
    const repBlob = new Blob([arrayBuf], { type: file.type });
    const repFile = await replicate.files.create(repBlob, {
      filename: file.name || 'jewelry.jpg',
      content_type: file.type || 'image/jpeg',
    });
    const url = (repFile as unknown as { urls?: { get?: string } }).urls?.get;

    if (!url) return errorResponse('UPLOAD_FAILED', 'File upload failed.', 500);

    return Response.json({ success: true, url, replicateUrl: url });
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('UPLOAD_FAILED', 'Could not save image.', 500);
  }
}
