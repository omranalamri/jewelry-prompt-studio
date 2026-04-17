'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ALL_AGENTS, AgentName } from '@/lib/agents/personas';
import { AgentCard } from '@/components/agents/agent-card';
import { AgentAvatar } from '@/components/agents/agent-avatar';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [debateMode, setDebateMode] = useState(false);
  const [debateResult, setDebateResult] = useState<{
    rounds: { contributions: { displayName: string; response: string; role: string }[] }[];
    synthesis: { response: string };
  } | null>(null);

  async function runAgent() {
    if (!selectedAgent || !task.trim()) return;
    setRunning(true);
    setResponse(null);
    try {
      const res = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: selectedAgent, task, context: {} }),
      });
      const json = await res.json();
      if (json.success) {
        setResponse(json.data.response);
        toast.success(`${json.data.displayName} responded`);
      } else {
        toast.error(json.error);
      }
    } catch { toast.error('Agent run failed'); }
    setRunning(false);
  }

  async function runDebate() {
    if (!task.trim()) return;
    setRunning(true);
    setDebateResult(null);
    try {
      const res = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'debate',
          topic: task,
          subject: {},
          participants: ['creative-director', 'brand-compliance', 'marcom-strategist', 'copywriter-arabic'],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDebateResult(json.data);
        toast.success('Creative Council debate complete');
      } else toast.error(json.error);
    } catch { toast.error('Debate failed'); }
    setRunning(false);
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={28} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
            <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
              The <span className="obs-gold-gradient-text">Agent Team</span>
            </h1>
          </div>
          <p style={{ color: 'var(--obs-text-secondary)' }}>
            A team of 10 specialist AI agents that think, debate, create, and learn together.
          </p>
        </motion.div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 obs-stagger">
          {ALL_AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              active={selectedAgent === agent.id}
              onClick={() => { setSelectedAgent(agent.id); setDebateMode(false); }}
            />
          ))}
        </div>

        {/* Task + Response Panel */}
        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedAgent && !debateMode && (
                <>
                  <AgentAvatar agent={ALL_AGENTS.find(a => a.id === selectedAgent)!} size="md" showStatus={running ? 'thinking' : 'idle'} />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>
                      Talking to {ALL_AGENTS.find(a => a.id === selectedAgent)!.displayName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--obs-text-muted)' }}>
                      {ALL_AGENTS.find(a => a.id === selectedAgent)!.role}
                    </p>
                  </div>
                </>
              )}
              {debateMode && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" style={{ color: 'var(--obs-gold)' }} />
                  <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>Creative Council Debate</p>
                </div>
              )}
              {!selectedAgent && !debateMode && (
                <p className="text-sm" style={{ color: 'var(--obs-text-muted)' }}>
                  Select an agent above, or run a Creative Council debate
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDebateMode(!debateMode); setSelectedAgent(null); setResponse(null); setDebateResult(null); }}
                className="text-xs"
                style={{ borderColor: debateMode ? 'var(--obs-gold)' : 'var(--obs-border-default)', color: debateMode ? 'var(--obs-gold)' : 'var(--obs-text-secondary)' }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {debateMode ? 'Debate Mode ON' : 'Start Debate'}
              </Button>
            </div>
          </div>

          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder={debateMode ? 'What should the Creative Council debate?' : 'What would you like to ask?'}
            rows={3}
            className="w-full px-4 py-3 text-sm rounded-lg resize-none"
            style={{
              background: 'var(--obs-base)',
              color: 'var(--obs-text-primary)',
              border: '1px solid var(--obs-border-default)',
              fontFamily: 'var(--font-obsidian-body)',
            }}
          />

          <Button
            onClick={debateMode ? runDebate : runAgent}
            disabled={running || !task.trim() || (!debateMode && !selectedAgent)}
            className="w-full obs-gold-gradient text-black border-0 h-11"
            style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}
          >
            {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {debateMode ? 'Council debating...' : 'Thinking...'}</>
              : <><Send className="h-4 w-4 mr-2" /> {debateMode ? 'Start Council Debate' : 'Send'}</>}
          </Button>

          {/* Single-agent response */}
          {response && !debateMode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border"
              style={{ background: 'var(--obs-elevated)', borderColor: 'var(--obs-border-gold)' }}
            >
              <pre
                className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
                style={{ color: 'var(--obs-text-primary)', fontFamily: 'var(--font-obsidian-body)' }}
              >
                {response}
              </pre>
            </motion.div>
          )}

          {/* Debate rounds */}
          {debateResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {debateResult.rounds.map((round, rIdx) => (
                <div key={rIdx} className="space-y-2">
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--obs-gold)' }}>
                    Round {rIdx + 1}
                  </p>
                  {round.contributions.map((c, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3 rounded-lg border"
                      style={{ background: 'var(--obs-elevated)', borderColor: 'var(--obs-border-subtle)' }}
                    >
                      <p className="text-xs mb-1" style={{ color: 'var(--obs-gold)' }}>
                        <strong>{c.displayName}</strong> — {c.role}
                      </p>
                      <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--obs-text-primary)', fontFamily: 'var(--font-obsidian-body)' }}>
                        {c.response}
                      </pre>
                    </div>
                  ))}
                </div>
              ))}
              <div
                className="p-4 rounded-xl border-2"
                style={{ background: 'var(--obs-elevated)', borderColor: 'var(--obs-border-gold-strong)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--obs-gold)' }}>
                  Project Lead Synthesis
                </p>
                <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--obs-text-primary)', fontFamily: 'var(--font-obsidian-body)' }}>
                  {debateResult.synthesis.response}
                </pre>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
