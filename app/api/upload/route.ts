import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import Replicate from 'replicate';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    let formData;
    try { formData = await req.formData(); } catch { return errorResponse('MISSING_FILE', 'No file.', 400); }
    const file = formData.get('file') as File | null;
    const context = formData.get('context') as string || 'reference';

    if (!file) return errorResponse('MISSING_FILE', 'No file.', 400);
    if (!file.type.startsWith('image/')) return errorResponse('INVALID_FILE_TYPE', 'Upload JPEG/PNG/WebP.', 400);
    if (file.size > 10 * 1024 * 1024) return errorResponse('FILE_TOO_LARGE', 'Under 10MB.', 400);

    const arrayBuf = await file.arrayBuffer();
    let blobUrl: string | null = null;
    let replicateUrl: string | null = null;

    // Try Vercel Blob first (Pro plan now active)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`${context}/${crypto.randomUUID()}-${file.name}`, Buffer.from(arrayBuf), {
          access: 'public', contentType: file.type,
        });
        blobUrl = blob.url;
      } catch { /* Blob might still fail — fall through to Replicate */ }
    }

    // Also upload to Replicate (AI models can access these URLs)
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
        const repBlob = new Blob([arrayBuf], { type: file.type });
        const repFile = await replicate.files.create(repBlob, {
          filename: file.name || 'jewelry.jpg', content_type: file.type || 'image/jpeg',
        });
        replicateUrl = (repFile as unknown as { urls?: { get?: string } }).urls?.get || null;
      } catch { /* */ }
    }

    const url = blobUrl || replicateUrl;
    if (!url) return errorResponse('UPLOAD_FAILED', 'Both storage providers failed.', 500);

    return Response.json({
      success: true,
      url,           // Primary URL (Blob for display, Replicate for AI)
      blobUrl,       // Vercel Blob URL (for UI display)
      replicateUrl,  // Replicate URL (for AI model input)
    });
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('UPLOAD_FAILED', 'Could not save image.', 500);
  }
}
