import { NextRequest } from 'next/server';
import { uploadToS3 } from '@/lib/s3';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const context = formData.get('context') as string || 'reference';

    if (!file) {
      return errorResponse('MISSING_FILE', 'No file provided.', 400);
    }

    if (!file.type.startsWith('image/')) {
      return errorResponse('INVALID_FILE_TYPE', 'Please upload a JPEG, PNG, or WebP image.', 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return errorResponse('FILE_TOO_LARGE', 'Image must be under 10MB.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `${context}/${crypto.randomUUID()}.${ext}`;

    const url = await uploadToS3(buffer, key, file.type);

    return Response.json({ success: true, url, key });
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('UPLOAD_FAILED', 'Could not save your image. The prompts are still available to copy.', 500);
  }
}
