import Anthropic from '@anthropic-ai/sdk';

export async function fileToImageBlock(
  file: Buffer,
  mediaType: string
): Promise<Anthropic.ImageBlockParam> {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
      data: file.toString('base64'),
    },
  };
}

export function getMediaType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext || ''] || 'image/jpeg';
}

export function validateImageFile(file: File, maxMB = 10): string | null {
  if (!file.type.startsWith('image/')) {
    return 'File must be an image (JPEG, PNG, or WebP)';
  }
  if (file.size > maxMB * 1024 * 1024) {
    return `File must be under ${maxMB}MB`;
  }
  return null;
}
