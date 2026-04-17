// Agent Orchestrator — runs individual agents + Creative Council debates
// Uses Anthropic for Claude agents, Google for Gemini agents

import Anthropic from '@anthropic-ai/sdk';
import { AGENT_PERSONAS, AgentName, AgentPersona } from './personas';

const GOOGLE_API_KEY = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';

interface AgentResponse {
  agentName: AgentName;
  displayName: string;
  role: string;
  response: string;
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costEstimate: number;
}

const MODEL_IDS: Record<AgentPersona['model'], string> = {
  'claude-sonnet-4-5': 'claude-sonnet-4-20250514',  // the working ID for our key
  'claude-haiku-4-5': 'claude-sonnet-4-20250514',   // fallback to sonnet if haiku not available
  'gemini-2.5-flash': 'gemini-2.5-flash',
};

// Token cost estimates per 1M tokens (as of April 2026)
const COST_PER_MTOK = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'gemini-2.5-flash': { input: 0.075, output: 0.3 },
};

async function runClaudeAgent(
  agent: AgentPersona,
  task: string,
  context: Record<string, unknown>,
): Promise<AgentResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const contextText = Object.entries(context)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n');

  const start = Date.now();
  const modelId = MODEL_IDS[agent.model];

  try {
    const message = await client.messages.create({
      model: modelId,
      max_tokens: 2000,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: `${task}\n\nCONTEXT:\n${contextText || '(no context)'}` }],
    });

    const durationMs = Date.now() - start;
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('');

    const cost = agent.model === 'claude-sonnet-4-5'
      ? (message.usage.input_tokens * COST_PER_MTOK['claude-sonnet-4-5'].input +
         message.usage.output_tokens * COST_PER_MTOK['claude-sonnet-4-5'].output) / 1_000_000
      : (message.usage.input_tokens * COST_PER_MTOK['claude-haiku-4-5'].input +
         message.usage.output_tokens * COST_PER_MTOK['claude-haiku-4-5'].output) / 1_000_000;

    return {
      agentName: agent.id,
      displayName: agent.displayName,
      role: agent.role,
      response: text,
      model: modelId,
      durationMs,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      costEstimate: cost,
    };
  } catch (err) {
    // Fall back to Gemini if Claude fails
    return runGeminiAgent(agent, task, context, start);
  }
}

async function runGeminiAgent(
  agent: AgentPersona,
  task: string,
  context: Record<string, unknown>,
  startOverride?: number,
): Promise<AgentResponse> {
  const key = GOOGLE_API_KEY();
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  const contextText = Object.entries(context)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n');

  const start = startOverride || Date.now();

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `SYSTEM INSTRUCTIONS:\n${agent.systemPrompt}\n\nPlease acknowledge.` }] },
          { role: 'model', parts: [{ text: `Understood. I am ${agent.displayName}, ${agent.role}.` }] },
          { role: 'user', parts: [{ text: `${task}\n\nCONTEXT:\n${contextText || '(no context)'}` }] },
        ],
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || `Gemini ${resp.status}`);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  const cost = (inputTokens * COST_PER_MTOK['gemini-2.5-flash'].input +
                outputTokens * COST_PER_MTOK['gemini-2.5-flash'].output) / 1_000_000;

  return {
    agentName: agent.id,
    displayName: agent.displayName,
    role: agent.role,
    response: text,
    model: 'gemini-2.5-flash',
    durationMs: Date.now() - start,
    inputTokens,
    outputTokens,
    costEstimate: cost,
  };
}

export async function runAgent(
  agentName: AgentName,
  task: string,
  context: Record<string, unknown> = {},
): Promise<AgentResponse> {
  const agent = AGENT_PERSONAS[agentName];
  if (!agent) throw new Error(`Agent ${agentName} not found`);

  return agent.model === 'gemini-2.5-flash'
    ? runGeminiAgent(agent, task, context)
    : runClaudeAgent(agent, task, context);
}

export interface DebateRound {
  roundNumber: number;
  contributions: AgentResponse[];
}

export interface DebateResult {
  topic: string;
  participants: AgentName[];
  rounds: DebateRound[];
  synthesis: AgentResponse;
  totalDurationMs: number;
  totalCost: number;
}

export async function runCreativeCouncil(
  topic: string,
  subject: Record<string, unknown>,
  participants: AgentName[] = ['creative-director', 'brand-compliance', 'marcom-strategist', 'copywriter-arabic'],
): Promise<DebateResult> {
  const overallStart = Date.now();

  // Round 1: Independent assessment
  const round1 = await Promise.all(
    participants.map(name =>
      runAgent(name,
        `ROUND 1 — Independent assessment. Do NOT consider other agents yet.\n\nTOPIC: ${topic}`,
        { subject }
      )
    )
  );

  // Round 2: Cross-review
  const round1Summary = round1
    .map(r => `**${r.displayName}** (${r.role}):\n${r.response}`)
    .join('\n\n---\n\n');

  const round2 = await Promise.all(
    participants.map(name =>
      runAgent(name,
        `ROUND 2 — Review colleagues' Round 1 assessments and respond.\n\nYour previous assessment was recorded. Now respond to the others. Hold your position if correct; update with rationale if persuaded.\n\nOTHER AGENTS:\n${round1Summary}`,
        { topic, subject }
      )
    )
  );

  // Round 3: Project Lead synthesis
  const allRounds = participants.reduce((acc, name, i) => {
    acc[name] = {
      round1: round1[i].response,
      round2: round2[i].response,
    };
    return acc;
  }, {} as Record<string, { round1: string; round2: string }>);

  const synthesis = await runAgent(
    'project-lead',
    `Synthesize the Creative Council debate. Provide final recommendation.\n\nDEBATE TRANSCRIPT:\n${JSON.stringify(allRounds, null, 2)}`,
    { topic, subject, participants },
  );

  const totalCost =
    round1.reduce((a, r) => a + r.costEstimate, 0) +
    round2.reduce((a, r) => a + r.costEstimate, 0) +
    synthesis.costEstimate;

  return {
    topic,
    participants,
    rounds: [
      { roundNumber: 1, contributions: round1 },
      { roundNumber: 2, contributions: round2 },
    ],
    synthesis,
    totalDurationMs: Date.now() - overallStart,
    totalCost,
  };
}
