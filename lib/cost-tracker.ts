import { getDb } from './db';

export async function logCost(params: {
  model: string;
  type: 'image' | 'video' | 'analysis';
  cost: number;
  durationSeconds?: number;
  promptPreview?: string;
  resultUrl?: string;
}) {
  try {
    const sql = getDb();
    await sql`INSERT INTO cost_log (model, type, cost, duration_seconds, prompt_preview, result_url)
      VALUES (${params.model}, ${params.type}, ${params.cost}, ${params.durationSeconds || null}, ${params.promptPreview?.slice(0, 200) || null}, ${params.resultUrl || null})`;
  } catch {
    // Non-critical — don't break generation if logging fails
  }
}
