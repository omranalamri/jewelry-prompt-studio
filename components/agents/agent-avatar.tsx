'use client';

import { AgentPersona } from '@/lib/agents/personas';

interface AgentAvatarProps {
  agent: AgentPersona;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  showStatus?: 'idle' | 'thinking' | 'active' | null;
  onClick?: () => void;
  className?: string;
}

const SIZES = {
  sm: { circle: 28, text: 10 },
  md: { circle: 36, text: 12 },
  lg: { circle: 44, text: 14 },
};

export function AgentAvatar({ agent, size = 'md', showPulse = false, showStatus = null, onClick, className = '' }: AgentAvatarProps) {
  const { circle, text } = SIZES[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: circle, height: circle }}
      onClick={onClick}
      title={`${agent.displayName} — ${agent.role}`}
    >
      {showPulse && <div className="obs-animate-pulse-ring" />}
      <div
        className="rounded-full flex items-center justify-center font-medium select-none border"
        style={{
          width: circle,
          height: circle,
          background: agent.bgColor,
          color: agent.color,
          borderColor: agent.color,
          fontSize: text,
          fontFamily: 'var(--font-obsidian-body)',
        }}
      >
        {agent.initials}
      </div>
      {showStatus && (
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
          style={{
            width: 10,
            height: 10,
            borderColor: 'var(--obs-base)',
            background:
              showStatus === 'active' ? 'var(--obs-success)' :
              showStatus === 'thinking' ? 'var(--obs-gold)' :
              'var(--obs-text-muted)',
            animation: showStatus === 'thinking' ? 'obs-think-dot 1.4s ease-in-out infinite' : undefined,
          }}
        />
      )}
    </div>
  );
}
