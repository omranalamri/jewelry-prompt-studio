import { getDb } from '@/lib/db';
import { GEMSTONES, METALS, FINISHES } from '@/lib/jewelry/domain';

interface PromptContext {
  basePrompt: string;
  jewelryType?: string;
  metalType?: string;
  gemstoneType?: string;
}

/**
 * Enhances a base system prompt with:
 * 1. Jewelry domain knowledge (materials, gems, finishes)
 * 2. Learned best practices from user feedback
 * 3. Known pitfalls to avoid
 */
export async function buildEnhancedPrompt(ctx: PromptContext): Promise<string> {
  let prompt = ctx.basePrompt;

  // Always inject domain knowledge
  const domainKnowledge: string[] = [];

  // Material-specific prompt guidance
  if (ctx.metalType && METALS[ctx.metalType]) {
    const metal = METALS[ctx.metalType];
    domainKnowledge.push(`METAL KNOWLEDGE (${metal.name}): ${metal.promptNotes}`);
  }

  // Gemstone-specific guidance
  if (ctx.gemstoneType && GEMSTONES[ctx.gemstoneType]) {
    const gem = GEMSTONES[ctx.gemstoneType];
    domainKnowledge.push(`GEMSTONE KNOWLEDGE (${gem.name}): ${gem.promptNotes}. Use "${gem.promptTerm}" not generic descriptions. Valid cuts: ${gem.cuts.join(', ')}.`);
  }

  // Always include the anti-hallucination rules
  domainKnowledge.push(`ANTI-HALLUCINATION RULES:
- NEVER say "sparkle" for diamonds — use "fire and scintillation"
- NEVER say "shiny" for pearls — use "lustrous with orient"
- NEVER say "glowing" for metal — use "polished with specular highlights"
- NEVER say "matte" for faceted gems — faceted gems are always polished
- Diamond facets are ALWAYS polished. Only metal settings can be brushed/matte.
- "Carat" = gemstone weight. "Karat" = gold purity. Don't confuse them.
- Use the 70/20/10 framework: 70% jewelry subject, 20% environment, 10% camera/style.`);

  if (domainKnowledge.length > 0) {
    prompt += '\n\nJEWELRY DOMAIN KNOWLEDGE:\n' + domainKnowledge.join('\n\n');
  }

  // Inject brand guidelines if they exist
  try {
    const sql = getDb();
    const brand = await sql`SELECT name, colors, tone, mood, guidelines_text FROM brand_guidelines LIMIT 1`;
    if (brand.length > 0 && brand[0].name) {
      const b = brand[0];
      const brandParts: string[] = [];
      if (b.name) brandParts.push(`Brand: ${b.name}`);
      if (b.tone) brandParts.push(`Tone: ${b.tone}`);
      if (b.mood) brandParts.push(`Default mood: ${b.mood}`);
      if (b.colors && Array.isArray(b.colors) && b.colors.length > 0) brandParts.push(`Brand colors: ${(b.colors as string[]).join(', ')}`);
      if (b.guidelines_text) brandParts.push(`Guidelines: ${b.guidelines_text}`);
      if (brandParts.length > 0) {
        prompt += '\n\nBRAND GUIDELINES (auto-applied):\n' + brandParts.join('\n');
      }
    }
  } catch { /* non-critical */ }

  if (!ctx.jewelryType) return prompt;

  try {
    const sql = getDb();

    // Get learned positive fragments
    const fragments = await sql`
      SELECT fragment_text FROM prompt_fragments
      WHERE is_active = true
        AND (applies_to_jewelry = '{}' OR ${ctx.jewelryType} = ANY(applies_to_jewelry))
        AND lift > 0
      ORDER BY lift DESC
      LIMIT 5
    `;

    // Get known pitfalls
    const pitfalls = await sql`
      SELECT description, suggested_prompt_change FROM feedback_patterns
      WHERE pattern_type = 'recurring-issue'
        AND (jewelry_types = '{}' OR ${ctx.jewelryType} = ANY(jewelry_types))
        AND evidence_count >= 3
      ORDER BY evidence_count DESC
      LIMIT 3
    `;

    // Get best-performing reference style for this jewelry type
    const topRef = await sql`
      SELECT lighting_description, mood FROM reference_analyses
      WHERE jewelry_type = ${ctx.jewelryType}
        AND avg_generation_rating >= 4
      ORDER BY avg_generation_rating DESC, times_used DESC
      LIMIT 1
    `;

    // Append learned knowledge
    const sections: string[] = [];

    if (fragments.length > 0) {
      sections.push(
        `LEARNED BEST PRACTICES (from user-rated generations for ${ctx.jewelryType}):\n` +
        fragments.map(f => `- ${f.fragment_text}`).join('\n')
      );
    }

    if (pitfalls.length > 0) {
      sections.push(
        `KNOWN ISSUES TO AVOID:\n` +
        pitfalls.map(p => `- AVOID: ${p.description}. Instead: ${p.suggested_prompt_change || 'See above best practices.'}`).join('\n')
      );
    }

    if (topRef.length > 0 && topRef[0].lighting_description) {
      sections.push(
        `TOP-PERFORMING STYLE (avg rating 4+):\n` +
        `- Lighting: ${topRef[0].lighting_description}\n` +
        `- Mood: ${topRef[0].mood || 'luxury editorial'}`
      );
    }

    if (sections.length > 0) {
      prompt += '\n\n' + sections.join('\n\n');
    }
  } catch {
    // If learning DB fails, just use the base prompt — never break generation
  }

  return prompt;
}
