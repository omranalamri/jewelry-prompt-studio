import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

// The research agent searches multiple sources and analyzes findings
const RESEARCH_QUERIES = [
  // AI models for jewelry
  { query: 'best AI image generation model jewelry product photography 2026', source: 'web', category: 'model' },
  { query: 'AI video generation jewelry marketing ads new model 2026', source: 'web', category: 'model' },
  { query: 'huggingface trending image-to-video jewelry product', source: 'web', category: 'model' },
  { query: 'Replicate new models image generation April 2026', source: 'web', category: 'model' },
  // Tools and techniques
  { query: 'virtual try-on jewelry ring necklace AI open source github', source: 'web', category: 'tool' },
  { query: 'AI background removal reflective jewelry metal gemstone', source: 'web', category: 'tool' },
  { query: 'LoRA fine-tune jewelry product photography AI model training', source: 'web', category: 'technique' },
  { query: 'AI batch campaign creatives multiple angles same product consistent', source: 'web', category: 'technique' },
  // Twitter/X — AI model announcements and jewelry trends
  { query: 'site:x.com OR site:twitter.com new AI image generation model 2026', source: 'twitter', category: 'model' },
  { query: 'site:x.com OR site:twitter.com Replicate new model image video', source: 'twitter', category: 'model' },
  { query: 'site:x.com OR site:twitter.com AI jewelry photography product marketing', source: 'twitter', category: 'trend' },
  { query: 'site:x.com OR site:twitter.com AI video generation product ad campaign', source: 'twitter', category: 'trend' },
  // Community feedback — Reddit + social
  { query: 'site:reddit.com AI jewelry photography product generation quality', source: 'reddit', category: 'feedback' },
  { query: 'site:reddit.com best AI model jewelry video ad 2026', source: 'reddit', category: 'feedback' },
  { query: 'site:reddit.com AI product photography gemstone diamond hallucination fix', source: 'reddit', category: 'feedback' },
  { query: 'site:reddit.com AI batch generate multiple angles same product consistent', source: 'reddit', category: 'feedback' },
  // Competitors
  { query: 'FormaNova AI jewelry review 2026', source: 'web', category: 'competitor' },
  { query: 'Mintly jewelry AI ads review feedback', source: 'web', category: 'competitor' },
  { query: 'AI jewelry creative platform new launch 2026', source: 'web', category: 'competitor' },
  { query: 'Freepik AI jewelry campaign batch generation', source: 'web', category: 'competitor' },
];

async function searchWeb(query: string): Promise<string> {
  try {
    // Use a simple search approach via the Anthropic model with web knowledge
    // In production this would use a proper search API
    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 500,
        messages: [{ role: 'user', content: `You are a research assistant. Based on your knowledge up to early 2026, what are the most relevant and recent findings for: "${query}". List 3-5 specific findings with names, URLs if known, and why they matter. Be specific and factual.` }],
      })
    );
    return message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
  } catch {
    return '';
  }
}

const ANALYSIS_PROMPT = `You are a research analyst for a jewelry AI creative platform. You analyze raw research findings and extract actionable intelligence.

For each finding, determine:
1. Relevance (1-10) to a jewelry AI creative platform
2. Whether it's actionable (can we integrate it?)
3. What specific action we should take
4. Category: model, tool, technique, dataset, competitor, feedback, trend

Only include findings scored 5+ relevance. Be specific and practical.

Respond with valid JSON:
{
  "findings": [
    {
      "title": "Short descriptive title",
      "source": "Where this came from",
      "url": "URL if available, null if not",
      "summary": "What this is and why it matters",
      "relevanceScore": 1-10,
      "category": "model|tool|technique|dataset|competitor|feedback|trend",
      "actionable": true/false,
      "suggestedAction": "Specific action we should take, or null"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { scope } = await req.json().catch(() => ({ scope: 'full' }));

    const queries = scope === 'quick'
      ? RESEARCH_QUERIES.slice(0, 4)
      : RESEARCH_QUERIES;

    // Phase 1: Gather raw research
    const rawResults: string[] = [];
    for (const q of queries) {
      const result = await searchWeb(q.query);
      if (result) rawResults.push(`[${q.category}] Query: "${q.query}"\nFindings:\n${result}\n`);
    }

    if (rawResults.length === 0) {
      return Response.json({ success: true, data: { message: 'No findings from search.', count: 0 } });
    }

    // Phase 2: Analyze with Claude
    const anthropic = getAnthropicClient();
    const analysis = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 3000,
        system: ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: `Analyze these research findings for our jewelry AI platform:\n\n${rawResults.join('\n---\n')}` }],
      })
    );

    const rawText = analysis.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
    const parsed = parseClaudeJSON<{ findings: { title: string; source: string; url: string | null; summary: string; relevanceScore: number; category: string; actionable: boolean; suggestedAction: string | null }[] }>(rawText);

    if (!parsed || !parsed.findings) {
      return Response.json({ success: true, data: { message: 'Could not parse findings.', count: 0 } });
    }

    // Phase 3: Save findings to database
    const sql = getDb();
    const batchId = `scan-${Date.now()}`;
    let saved = 0;

    for (const f of parsed.findings) {
      if (f.relevanceScore < 5) continue;
      try {
        await sql`INSERT INTO research_findings (source, title, url, summary, relevance_score, category, actionable, suggested_action, scan_batch)
          VALUES (${f.source}, ${f.title}, ${f.url || null}, ${f.summary}, ${f.relevanceScore}, ${f.category}, ${f.actionable}, ${f.suggestedAction || null}, ${batchId})`;
        saved++;
      } catch { /* duplicate or error */ }
    }

    // Log to changelog
    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('research-scan', ${`Research scan completed: ${saved} findings from ${queries.length} queries`}, ${JSON.stringify({ batchId, queriesRun: queries.length, findingsFound: parsed.findings.length, saved })})`;

    return Response.json({
      success: true,
      data: {
        message: `Scanned ${queries.length} sources, found ${parsed.findings.length} relevant items, saved ${saved} new findings.`,
        count: saved,
        findings: parsed.findings,
        batchId,
      },
    });
  } catch (error) {
    console.error('Research agent error:', error);
    return Response.json({ success: false, error: 'Research scan failed.' }, { status: 500 });
  }
}

// GET — list all findings
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const sql = getDb();
    const findings = status
      ? await sql`SELECT * FROM research_findings WHERE status = ${status} ORDER BY relevance_score DESC, created_at DESC LIMIT 50`
      : await sql`SELECT * FROM research_findings ORDER BY relevance_score DESC, created_at DESC LIMIT 50`;

    return Response.json({ success: true, data: findings });
  } catch (error) {
    console.error('Findings error:', error);
    return Response.json({ success: false, error: 'Failed to load.' }, { status: 500 });
  }
}

// PUT — update finding status (approve/reject)
export async function PUT(req: NextRequest) {
  try {
    const { id, status, rejectionReason } = await req.json();
    const sql = getDb();

    await sql`UPDATE research_findings SET
      status = ${status},
      rejection_reason = ${rejectionReason || null}
      WHERE id = ${id}`;

    // Log decision
    const finding = await sql`SELECT title FROM research_findings WHERE id = ${id}`;
    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('research-decision', ${`${status}: ${finding[0]?.title || id}`}, ${JSON.stringify({ findingId: id, status, rejectionReason })})`;

    // If rejected, also save to strategic_decisions for the record
    if (status === 'rejected' && rejectionReason) {
      await sql`INSERT INTO strategic_decisions (opportunity, category, projected_impact, effort, decision, rationale)
        VALUES (${finding[0]?.title || 'Research finding'}, 'research', 'Unknown', 'Unknown', 'rejected', ${rejectionReason})`;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ success: false, error: 'Failed.' }, { status: 500 });
  }
}
