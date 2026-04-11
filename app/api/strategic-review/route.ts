import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { COMMUNITY_RESOURCES } from '@/lib/creative/community-intel';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;

async function gatherSystemState() {
  const sql = getDb();

  const [genStats] = await sql`SELECT COUNT(*) as total, AVG(user_rating) as avg_rating, COUNT(CASE WHEN user_rating IS NOT NULL THEN 1 END) as rated FROM generations`;
  const [costStats] = await sql`SELECT COALESCE(SUM(cost), 0) as total_cost FROM cost_log`;
  const repoCount = await sql`SELECT category, COUNT(*) as count FROM repository GROUP BY category`;
  const topIssues = await sql`SELECT unnest(feedback_tags) as tag, COUNT(*) as count FROM generations WHERE feedback_tags != '{}' GROUP BY tag ORDER BY count DESC LIMIT 10`;
  const modelPerf = await sql`SELECT generation_model, COUNT(*) as count, AVG(user_rating) as avg FROM generations WHERE user_rating IS NOT NULL GROUP BY generation_model ORDER BY avg DESC`;
  const patterns = await sql`SELECT COUNT(*) as total, COUNT(CASE WHEN is_applied THEN 1 END) as applied FROM feedback_patterns`;
  const fragments = await sql`SELECT COUNT(*) as total FROM prompt_fragments WHERE is_active = true`;
  const decisions = await sql`SELECT decision, COUNT(*) as count FROM strategic_decisions GROUP BY decision`;
  const recentDecisions = await sql`SELECT opportunity, decision, rationale, outcome FROM strategic_decisions ORDER BY created_at DESC LIMIT 5`;

  return {
    generations: { total: parseInt(genStats.total as string), avgRating: parseFloat(genStats.avg_rating as string || '0'), rated: parseInt(genStats.rated as string) },
    totalCost: parseFloat(costStats.total_cost as string),
    repository: Object.fromEntries(repoCount.map(r => [r.category, parseInt(r.count as string)])),
    topIssues: topIssues.map(i => ({ tag: i.tag, count: parseInt(i.count as string) })),
    modelPerformance: modelPerf.map(m => ({ model: m.generation_model, count: parseInt(m.count as string), avg: parseFloat(m.avg as string || '0') })),
    patterns: { total: parseInt(patterns[0]?.total as string || '0'), applied: parseInt(patterns[0]?.applied as string || '0') },
    learnedFragments: parseInt(fragments[0]?.total as string || '0'),
    decisions: Object.fromEntries(decisions.map(d => [d.decision, parseInt(d.count as string)])),
    recentDecisions: recentDecisions.map(d => ({ opportunity: d.opportunity, decision: d.decision, rationale: d.rationale, outcome: d.outcome })),
    communityResources: COMMUNITY_RESOURCES.length,
    highImpactResources: COMMUNITY_RESOURCES.filter(r => r.impact === 'high').length,
  };
}

const STRATEGIC_PROMPT = `You are the Strategic AI Partner for a jewelry creative platform. You have access to the full system state and your job is to think deeply about what to do next.

You are NOT a feature-builder. You are a STRATEGIC THINKER who:
1. Reviews the overall health of the platform
2. Identifies the highest-impact improvements
3. Evaluates risks and tradeoffs honestly
4. Recommends actions with clear rationale
5. Reviews past decisions and their outcomes
6. Flags when something isn't working

Be honest. If something we built isn't being used, say so. If a model is underperforming, flag it. If spending is too high relative to quality, raise it. Think like a co-founder, not a yes-man.

YOUR REVIEW SHOULD COVER:
1. HEALTH CHECK — Is the system working? Are ratings improving? Any red flags?
2. BIGGEST GAPS — What's the single most impactful thing missing right now?
3. COMMUNITY OPPORTUNITIES — From the resources available, what should we integrate next and WHY?
4. PROMPT QUALITY — Is the prompt agent getting better? What feedback patterns suggest?
5. MODEL PERFORMANCE — Which models are delivering? Which should be swapped?
6. COST EFFICIENCY — Are we spending wisely? Any model providing poor value?
7. PAST DECISIONS — Review what we've decided before. Was it the right call?
8. NEXT 3 ACTIONS — Prioritized list of exactly what to do next

Respond with valid JSON:
{
  "reviewDate": "date",
  "healthScore": 1-10,
  "healthSummary": "One paragraph honest assessment",
  "biggestGap": "The single most impactful thing to fix",
  "recommendations": [
    {
      "priority": 1,
      "action": "What to do",
      "rationale": "Why this matters more than anything else",
      "projectedImpact": "What will change if we do this",
      "effort": "easy|medium|hard",
      "risk": "What could go wrong",
      "metrics": "How we'll know it worked"
    }
  ],
  "modelAssessment": {
    "bestPerformer": "model name + why",
    "worstPerformer": "model name + why",
    "recommendation": "swap/keep/test"
  },
  "costAssessment": {
    "totalSpend": "$X",
    "costPerGoodResult": "$X per 4+ star generation",
    "recommendation": "assessment of spend efficiency"
  },
  "pastDecisionReview": "Honest review of recent decisions",
  "warningsAndRisks": ["anything concerning"],
  "overallDirection": "Where should this platform be heading in the next month?"
}`;

export async function POST(req: NextRequest) {
  try {
    const state = await gatherSystemState();

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 3000,
        system: STRATEGIC_PROMPT,
        messages: [{
          role: 'user',
          content: `Here is the current state of the Jewelry Prompt Studio platform. Do a full strategic review.

SYSTEM STATE:
- Total generations: ${state.generations.total}
- Rated generations: ${state.generations.rated}
- Average rating: ${state.generations.avgRating || 'no data'}
- Total cost spent: $${state.totalCost.toFixed(2)}
- Repository items: ${JSON.stringify(state.repository)}
- Top reported issues: ${JSON.stringify(state.topIssues)}
- Model performance: ${JSON.stringify(state.modelPerformance)}
- Learned patterns: ${state.patterns.total} found, ${state.patterns.applied} applied
- Learned prompt fragments: ${state.learnedFragments} active
- Community resources tracked: ${state.communityResources} (${state.highImpactResources} high-impact)
- Past decisions: ${JSON.stringify(state.decisions)}
- Recent decisions: ${JSON.stringify(state.recentDecisions)}

AVAILABLE HIGH-IMPACT RESOURCES:
${COMMUNITY_RESOURCES.filter(r => r.impact === 'high').map(r => `- ${r.name} [${r.category}] (effort: ${r.effort}): ${r.impactReason}`).join('\n')}

Do your full strategic review now.`,
        }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('');

    const review = parseClaudeJSON(rawText);
    if (!review) {
      return Response.json({ success: false, error: 'Could not parse review.' }, { status: 500 });
    }

    // Save the review
    const sql = getDb();
    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('strategic-review', 'Full strategic review completed', ${JSON.stringify(review)})`;

    return Response.json({ success: true, data: { review, systemState: state } });
  } catch (error) {
    console.error('Strategic review error:', error);
    return Response.json({ success: false, error: 'Review failed.' }, { status: 500 });
  }
}

// Record a decision
export async function PUT(req: NextRequest) {
  try {
    const { opportunity, category, projectedImpact, effort, risk, decision, rationale } = await req.json();

    const sql = getDb();
    await sql`INSERT INTO strategic_decisions (opportunity, category, projected_impact, effort, risk, decision, rationale)
      VALUES (${opportunity}, ${category}, ${projectedImpact}, ${effort}, ${risk || null}, ${decision}, ${rationale})`;

    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('strategic-decision', ${`${decision}: ${opportunity}`}, ${JSON.stringify({ opportunity, decision, rationale })})`;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Decision error:', error);
    return Response.json({ success: false, error: 'Failed to record decision.' }, { status: 500 });
  }
}

// Get past decisions
export async function GET() {
  try {
    const sql = getDb();
    const decisions = await sql`SELECT * FROM strategic_decisions ORDER BY created_at DESC LIMIT 50`;
    return Response.json({ success: true, data: decisions });
  } catch (error) {
    console.error('Decisions error:', error);
    return Response.json({ success: false, error: 'Failed to load decisions.' }, { status: 500 });
  }
}
