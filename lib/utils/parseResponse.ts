export function parseClaudeJSON<T>(rawText: string): T | null {
  try {
    return JSON.parse(rawText);
  } catch {
    // Strip markdown code fences
    const stripped = rawText
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/\s*```$/m, '')
      .trim();

    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
