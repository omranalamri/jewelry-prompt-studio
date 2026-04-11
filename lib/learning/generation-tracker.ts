import { getDb } from '@/lib/db';
import crypto from 'crypto';

export interface GenerationRecord {
  promptText: string;
  generationModel: string;
  generationType: 'image' | 'video' | 'frame';
  aspectRatio?: string;
  wasFirstChoice?: boolean;
  jewelryType?: string;
  personaId?: string;
  cameraPresetId?: string;
  campaignTemplateId?: string;
  colorGradeId?: string;
  referenceImageUrl?: string;
  resultUrl?: string;
  cost?: number;
  durationSeconds?: number;
}

export async function trackGeneration(record: GenerationRecord): Promise<string | null> {
  try {
    const sql = getDb();
    const promptHash = crypto.createHash('sha256').update(record.promptText.toLowerCase().trim()).digest('hex').slice(0, 16);

    const result = await sql`
      INSERT INTO generations (
        prompt_text, prompt_hash, generation_model, generation_type,
        aspect_ratio, was_first_choice, jewelry_type, persona_id,
        camera_preset_id, campaign_template_id, color_grade_id,
        reference_image_url, had_reference, result_url, cost, duration_seconds
      ) VALUES (
        ${record.promptText.slice(0, 2000)}, ${promptHash},
        ${record.generationModel}, ${record.generationType},
        ${record.aspectRatio || null}, ${record.wasFirstChoice ?? true},
        ${record.jewelryType || null}, ${record.personaId || null},
        ${record.cameraPresetId || null}, ${record.campaignTemplateId || null},
        ${record.colorGradeId || null},
        ${record.referenceImageUrl || null}, ${!!record.referenceImageUrl},
        ${record.resultUrl || null}, ${record.cost || 0},
        ${record.durationSeconds || null}
      ) RETURNING id
    `;
    return result[0]?.id || null;
  } catch (e) {
    console.error('Track generation error:', e);
    return null;
  }
}

export async function updateGenerationResult(id: string, resultUrl: string, cost: number, duration: number) {
  try {
    const sql = getDb();
    await sql`UPDATE generations SET result_url = ${resultUrl}, cost = ${cost}, duration_seconds = ${duration} WHERE id = ${id}`;
  } catch { /* non-critical */ }
}

export async function markRegenerated(previousResultUrl: string) {
  try {
    const sql = getDb();
    await sql`UPDATE generations SET was_regenerated = true WHERE result_url = ${previousResultUrl} AND was_regenerated = false`;
  } catch { /* non-critical */ }
}
