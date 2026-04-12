import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

const TRAINING_PROMPT = `You are training a jewelry prompt engineering agent. You are analyzing professional jewelry reference images and their metadata to extract patterns that will improve AI generation quality.

For each batch of reference data, extract:

1. PROMPT TEMPLATES — Turn the simple labels ("female, ring") into rich, detailed prompt templates that would generate images of this quality. Create 3-5 templates per jewelry type.

2. LIGHTING PATTERNS — What lighting setups appear most often in professional jewelry photos? Describe the specific setups.

3. COMPOSITION RULES — How is the jewelry framed? What's the camera angle? Where is the piece positioned in frame?

4. BODY INTERACTION — How does the jewelry sit on the body? What makes it look natural vs artificial?

5. QUALITY MARKERS — What separates a professional jewelry photo from an amateur one? Be specific.

6. ANTI-PATTERNS — What should we AVOID based on what we see works professionally?

Respond with valid JSON:
{
  "promptTemplates": [
    {
      "jewelryType": "ring",
      "template": "Full rich prompt template text that would generate this quality of image",
      "cameraAngle": "specific angle",
      "lighting": "specific setup",
      "mood": "mood description"
    }
  ],
  "lightingPatterns": [
    {"name": "Pattern name", "description": "Detailed description", "bestFor": ["ring", "necklace"]}
  ],
  "compositionRules": [
    {"jewelryType": "ring", "rule": "Specific composition rule"}
  ],
  "qualityMarkers": ["marker 1", "marker 2"],
  "antiPatterns": ["thing to avoid 1", "thing to avoid 2"],
  "promptFragments": [
    {"text": "specific text fragment that improves prompts", "category": "lighting|composition|material|mood|body", "appliesTo": ["ring", "necklace"]}
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();

    // Gather reference data — images + their metadata
    const references = await sql`
      SELECT jewelry_type, sub_category, pose_type, original_prompt, image_url, dataset_source
      FROM repository
      WHERE dataset_source IS NOT NULL AND jewelry_type IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 200
    `;

    if (references.length < 10) {
      return Response.json({ success: true, data: { message: 'Not enough reference data yet. Import more datasets first.', trained: false } });
    }

    // Group by jewelry type
    const byType: Record<string, { count: number; prompts: string[]; poses: string[]; subCats: string[] }> = {};
    for (const ref of references) {
      const t = ref.jewelry_type as string;
      if (!byType[t]) byType[t] = { count: 0, prompts: [], poses: [], subCats: [] };
      byType[t].count++;
      if (ref.original_prompt) byType[t].prompts.push(ref.original_prompt as string);
      if (ref.pose_type) byType[t].poses.push(ref.pose_type as string);
      if (ref.sub_category) byType[t].subCats.push(ref.sub_category as string);
    }

    // Also get a few actual image URLs for Claude to analyze visually
    const sampleImages = await sql`
      SELECT image_url, jewelry_type, original_prompt
      FROM repository
      WHERE dataset_source IS NOT NULL AND image_url LIKE 'https://%'
      ORDER BY RANDOM()
      LIMIT 6
    `;

    // Build the training context
    const context = Object.entries(byType).map(([type, data]) => {
      const uniquePrompts = [...new Set(data.prompts)];
      const uniquePoses = [...new Set(data.poses)];
      return `${type.toUpperCase()} (${data.count} references):
  Prompts used: ${uniquePrompts.join(', ')}
  Pose types: ${uniquePoses.join(', ')}
  Sub-categories: ${[...new Set(data.subCats)].join(', ')}`;
    }).join('\n\n');

    // Send to Claude for analysis — include sample images for visual analysis
    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    // Add sample images for visual analysis
    for (const img of sampleImages.slice(0, 4)) {
      try {
        contentBlocks.push({
          type: 'image',
          source: { type: 'url', url: img.image_url as string },
        });
        contentBlocks.push({
          type: 'text',
          text: `[${img.jewelry_type} — original prompt: "${img.original_prompt || 'none'}"]`,
        });
      } catch { /* skip failed images */ }
    }

    contentBlocks.push({
      type: 'text',
      text: `Analyze these professional jewelry reference images and the following dataset metadata to train our prompt agent.

DATASET OVERVIEW (${references.length} references analyzed):
${context}

TOTAL REFERENCES BY TYPE:
${Object.entries(byType).map(([t, d]) => `  ${t}: ${d.count}`).join('\n')}

Based on the visual analysis of these professional photos AND the metadata patterns, extract prompt templates, lighting patterns, composition rules, and quality markers that will improve our AI jewelry generation.`,
    });

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 3000,
        system: TRAINING_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('');

    const training = parseClaudeJSON<{
      promptTemplates: { jewelryType: string; template: string; cameraAngle: string; lighting: string; mood: string }[];
      lightingPatterns: { name: string; description: string; bestFor: string[] }[];
      compositionRules: { jewelryType: string; rule: string }[];
      qualityMarkers: string[];
      antiPatterns: string[];
      promptFragments: { text: string; category: string; appliesTo: string[] }[];
    }>(rawText);

    if (!training) {
      return Response.json({ success: true, data: { message: 'Could not parse training results.', trained: false } });
    }

    // Save prompt fragments to the learning system
    let fragmentsSaved = 0;
    for (const f of training.promptFragments || []) {
      try {
        await sql`INSERT INTO prompt_fragments (category, fragment_text, applies_to_jewelry, applies_to_model, source, is_active)
          VALUES (${f.category}, ${f.text}, ${f.appliesTo || []}, ${'{}' as string}, 'dataset-training', true)`;
        fragmentsSaved++;
      } catch { /* duplicate */ }
    }

    // Save prompt templates as high-quality reference prompts
    let templatesSaved = 0;
    for (const t of training.promptTemplates || []) {
      try {
        await sql`INSERT INTO prompt_fragments (category, fragment_text, applies_to_jewelry, source, is_active)
          VALUES ('template', ${t.template}, ${[t.jewelryType]}, 'dataset-training', true)`;
        templatesSaved++;
      } catch { /* */ }
    }

    // Save anti-patterns as known issues
    for (const ap of training.antiPatterns || []) {
      try {
        await sql`INSERT INTO feedback_patterns (pattern_type, description, evidence_count, suggested_prompt_change)
          VALUES ('recurring-issue', ${ap}, 10, ${`From professional reference analysis: avoid this pattern`})`;
      } catch { /* */ }
    }

    // Log to changelog
    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('prompt-training', ${`Trained on ${references.length} professional references: ${fragmentsSaved} fragments, ${templatesSaved} templates saved`}, ${JSON.stringify({
        referencesAnalyzed: references.length, fragmentsSaved, templatesSaved,
        types: Object.keys(byType),
        antiPatterns: training.antiPatterns?.length || 0,
      })})`;

    return Response.json({
      success: true,
      data: {
        message: `Analyzed ${references.length} professional references. Saved ${fragmentsSaved} prompt fragments and ${templatesSaved} templates.`,
        trained: true,
        training,
        stats: {
          referencesAnalyzed: references.length,
          fragmentsSaved,
          templatesSaved,
          antiPatterns: training.antiPatterns?.length || 0,
          types: Object.fromEntries(Object.entries(byType).map(([t, d]) => [t, d.count])),
        },
      },
    });
  } catch (error) {
    console.error('Training error:', error);
    return Response.json({ success: false, error: 'Training failed.' }, { status: 500 });
  }
}
