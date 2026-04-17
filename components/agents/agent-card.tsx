'use client';

import { AgentPersona } from '@/lib/agents/personas';
import { AgentAvatar } from './agent-avatar';
import { Cpu } from 'lucide-react';

interface AgentCardProps {
  agent: AgentPersona;
  onClick?: () => void;
  active?: boolean;
}

const MODEL_LABELS: Record<AgentPersona['model'], string> = {
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
};

const TIER_LABELS: Record<AgentPersona['tier'], string> = {
  production: 'Production',
  strategy: 'Strategy',
  orchestration: 'Orchestration',
  support: 'Support',
};

export function AgentCard({ agent, onClick, active }: AgentCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border p-5 transition-all cursor-pointer ${
        active ? 'border-[var(--obs-border-gold-strong)]' : 'border-[var(--obs-border-default)]'
      }`}
      style={{
        background: 'var(--obs-raised)',
        boxShadow: active ? 'var(--obs-shadow-gold)' : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        <AgentAvatar agent={agent} size="lg" showStatus={active ? 'active' : 'idle'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="text-lg font-medium truncate obs-display"
              style={{ color: 'var(--obs-text-primary)' }}
            >
              {agent.displayName}
            </h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{
                background: `${agent.color}20`,
                color: agent.color,
                border: `1px solid ${agent.color}40`,
              }}
            >
              {TIER_LABELS[agent.tier]}
            </span>
          </div>
          <p
            className="text-xs obs-text-secondary mt-0.5"
            style={{ color: 'var(--obs-text-secondary)' }}
          >
            {agent.role}
          </p>
          <p
            className="text-xs mt-2 leading-relaxed"
            style={{ color: 'var(--obs-text-secondary)' }}
          >
            {agent.description}
          </p>
          <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: 'var(--obs-text-muted)' }}>
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {MODEL_LABELS[agent.model]}
            </span>
            <span className="obs-mono">weight: {agent.debateWeight}×</span>
          </div>
        </div>
      </div>
    </div>
  );
}
