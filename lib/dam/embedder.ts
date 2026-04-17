// Embedding generation via Google's text-embedding-004 model
// No OpenAI key needed — uses the same Google AI key

const GOOGLE_KEY = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

export async function generateEmbedding(text: string): Promise<number[]> {
  const key = GOOGLE_KEY();
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embedding failed ${resp.status}: ${err.slice(0, 100)}`);
  }

  const data = await resp.json();
  return data.embedding?.values || [];
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
}

// Build searchable text from asset metadata
export function buildAssetSourceText(asset: {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  prompt_text?: string;
  jewelry_type?: string;
}): string {
  const parts: string[] = [];
  if (asset.title) parts.push(asset.title);
  if (asset.description) parts.push(asset.description);
  if (asset.category) parts.push(`category: ${asset.category}`);
  if (asset.jewelry_type) parts.push(`jewelry: ${asset.jewelry_type}`);
  if (asset.tags?.length) parts.push(`tags: ${asset.tags.join(', ')}`);
  if (asset.prompt_text) parts.push(`prompt: ${asset.prompt_text}`);
  return parts.join('. ');
}
