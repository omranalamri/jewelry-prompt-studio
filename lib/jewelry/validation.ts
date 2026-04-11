// Anti-hallucination validation system
// Catches physically impossible or technically incorrect jewelry descriptions
// before they reach the AI generation model

interface ValidationRule {
  id: string;
  pattern: RegExp;
  issue: string;
  fix: string;
  replacement?: string;
}

const RULES: ValidationRule[] = [
  // Optical impossibilities
  { id: 'transparent-gold', pattern: /transparent\s+gold/gi, issue: 'Gold is opaque — cannot be transparent', fix: 'polished gold with mirror reflections', replacement: 'polished gold with mirror reflections' },
  { id: 'matte-diamond-facets', pattern: /matte\s+diamond\s+facet/gi, issue: 'Diamond facets are always polished', fix: 'polished diamond facets with fire and scintillation', replacement: 'polished diamond facets with fire and scintillation' },
  { id: 'frosted-platinum', pattern: /frosted\s+platinum/gi, issue: '"Frosted" is ambiguous for platinum', fix: 'brushed matte finish platinum', replacement: 'brushed matte finish platinum' },
  { id: 'glowing-metal', pattern: /\bglowing\s+(gold|silver|platinum|metal)/gi, issue: 'Metal reflects light, it does not glow', fix: 'polished metal with specular highlights', replacement: 'polished $1 with specular highlights' },
  // Cut contradictions
  { id: 'princess-round', pattern: /princess[\s-]cut\s+round/gi, issue: 'Princess cut is square, not round', fix: 'princess cut (square) diamond', replacement: 'princess cut (square)' },
  { id: 'emerald-round', pattern: /emerald[\s-]cut\s+round/gi, issue: 'Emerald cut is rectangular, not round', fix: 'emerald cut (rectangular step)', replacement: 'emerald cut (rectangular step)' },
  // Motion contradictions
  { id: 'static-orbit', pattern: /static\s+orbit/gi, issue: 'Orbit implies movement — cannot be static', fix: 'slow orbital tracking shot', replacement: 'slow orbital tracking shot' },
  // Material confusion
  { id: 'brushed-diamond', pattern: /brushed\s+diamond/gi, issue: 'Diamonds cannot be brushed — only metal can', fix: 'brushed gold setting with polished diamond', replacement: 'brushed gold setting with polished diamond' },
  { id: 'matte-faceted-gem', pattern: /matte\s+(ruby|sapphire|emerald|diamond|topaz)/gi, issue: 'Faceted gemstones are polished, not matte', fix: 'polished faceted stone, or specify cabochon for matte', replacement: 'polished faceted $1' },
  // Vocabulary corrections
  { id: 'sparkle-diamond', pattern: /\bsparkling?\s+diamond/gi, issue: '"Sparkle" is imprecise — diamonds have "fire and scintillation"', fix: 'diamond with fire and scintillation', replacement: 'diamond with fire and scintillation' },
  { id: 'sparkle-metal', pattern: /\bsparkling?\s+(gold|silver|platinum)/gi, issue: '"Sparkle" is imprecise for metal — use "specular highlights"', fix: 'metal with specular highlights', replacement: '$1 with specular highlights' },
  { id: 'shiny-pearl', pattern: /\bshiny\s+pearl/gi, issue: 'Pearls have "luster" and "orient", not "shine"', fix: 'lustrous pearl with orient and overtone', replacement: 'lustrous pearl with orient and overtone' },
  // Physics errors
  { id: 'transparent-chain', pattern: /transparent\s+(gold|silver)\s+chain/gi, issue: 'Metal chains are opaque', fix: 'polished metal chain catching and reflecting light', replacement: 'polished $1 chain catching and reflecting light' },
  // Common misuse
  { id: 'carat-karat', pattern: /(\d+)\s*carat\s+(gold|white gold|rose gold)/gi, issue: '"Carat" = gemstone weight. "Karat" = gold purity', fix: 'karat for gold purity', replacement: '$1 karat $2' },
];

export interface ValidationIssue {
  ruleId: string;
  issue: string;
  fix: string;
  position: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  correctedPrompt: string;
  correctionCount: number;
}

export function validatePrompt(prompt: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  let corrected = prompt;
  let correctionCount = 0;

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(prompt);
    if (match) {
      issues.push({ ruleId: rule.id, issue: rule.issue, fix: rule.fix, position: match.index });
      if (rule.replacement) {
        rule.pattern.lastIndex = 0;
        corrected = corrected.replace(rule.pattern, rule.replacement);
        correctionCount++;
      }
    }
    rule.pattern.lastIndex = 0;
  }

  return { isValid: issues.length === 0, issues, correctedPrompt: corrected, correctionCount };
}

export function analyzePromptBalance(prompt: string): {
  subjectPct: number; envPct: number; cameraPct: number;
  isBalanced: boolean; suggestion: string | null;
} {
  const words = prompt.split(/\s+/).length;
  const envWords = (prompt.match(/background|surface|velvet|marble|silk|fabric|setting|scene|atmosphere|environment|backdrop|lighting|light|shadow/gi) || []).length;
  const camWords = (prompt.match(/camera|lens|f\/\d|aperture|focal|shot|angle|macro|close-up|wide|zoom|pan|orbit|tracking|hasselblad|canon|sony|arri|4k|8k|1080p|fps/gi) || []).length;
  const subjectWords = words - envWords - camWords;

  const subjectPct = Math.round((subjectWords / words) * 100);
  const envPct = Math.round((envWords / words) * 100);
  const cameraPct = Math.round((camWords / words) * 100);
  const isBalanced = subjectPct >= 50 && envPct >= 10 && cameraPct >= 5;

  let suggestion: string | null = null;
  if (envPct < 10) suggestion = 'Add environment details (background, lighting, atmosphere)';
  else if (cameraPct < 5) suggestion = 'Add camera details (lens, angle, movement)';
  else if (subjectPct < 50) suggestion = 'Add more about the jewelry piece itself';

  return { subjectPct, envPct, cameraPct, isBalanced, suggestion };
}
