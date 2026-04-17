// Brief quality scorer — uses Gemini for fast, cheap 1-5 scoring

const GEMINI_KEY = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

export interface CampaignBrief {
  name?: string;
  objective?: string;
  targetAudience?: string;
  keyMessage?: string;
  callToAction?: string;
  channels?: string[];
  languages?: string[];
  culturalContext?: string;
  jewelryType?: string;
  shootStyle?: string;
  budget?: number;
  timeline?: string;
}

export interface BriefScore {
  overall: number;       // 1-5
  specificity: number;
  feasibility: number;
  brandAlignment: number;
  completeness: number;
  suggestions: string[];
  blockers: string[];
}

export async function scoreBrief(brief: CampaignBrief): Promise<BriefScore> {
  const key = GEMINI_KEY();
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  // Quick local completeness check first
  const requiredFields = ['name', 'objective', 'targetAudience', 'keyMessage', 'jewelryType'];
  const missingRequired = requiredFields.filter(f => !brief[f as keyof CampaignBrief]);

  const systemPrompt = `You score campaign briefs for a luxury jewelry brand in Dubai. You MUST respond with ONLY valid JSON matching this schema:
{
  "overall": number (1-5, weighted average),
  "specificity": number (1-5, how specific and actionable),
  "feasibility": number (1-5, can this be executed with AI tools at reasonable cost),
  "brandAlignment": number (1-5, fits luxury jewelry brand standards),
  "completeness": number (1-5, all required fields present and useful),
  "suggestions": string[] (up to 5 concrete improvements),
  "blockers": string[] (issues that MUST be fixed before proceeding)
}

Overall = (specificity*0.3 + feasibility*0.25 + brandAlignment*0.3 + completeness*0.15)`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I will respond with only valid JSON.' }] },
          { role: 'user', parts: [{ text: `Score this brief:\n${JSON.stringify(brief, null, 2)}\n\nMissing required fields: ${missingRequired.join(', ') || 'none'}` }] },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!resp.ok) {
    // Fallback: heuristic score
    return heuristicScore(brief, missingRequired);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const parsed = JSON.parse(text);
    return {
      overall: Number(parsed.overall) || 3,
      specificity: Number(parsed.specificity) || 3,
      feasibility: Number(parsed.feasibility) || 3,
      brandAlignment: Number(parsed.brandAlignment) || 3,
      completeness: Number(parsed.completeness) || 3,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
    };
  } catch {
    return heuristicScore(brief, missingRequired);
  }
}

function heuristicScore(brief: CampaignBrief, missing: string[]): BriefScore {
  const completeness = Math.max(1, 5 - missing.length);
  const fieldCount = Object.values(brief).filter(Boolean).length;
  const specificity = Math.min(5, Math.max(1, fieldCount / 3));
  const avg = (completeness + specificity + 3) / 3;

  return {
    overall: Math.round(avg * 10) / 10,
    specificity,
    feasibility: 3.5,
    brandAlignment: 3.5,
    completeness,
    suggestions: missing.map(f => `Add ${f} to brief`),
    blockers: missing.length > 3 ? [`Fill in required fields: ${missing.join(', ')}`] : [],
  };
}
