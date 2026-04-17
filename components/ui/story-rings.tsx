'use client';

import { AgentPersona } from '@/lib/agents/personas';

interface StoryRing {
  id: string;
  label: string;
  imageUrl?: string;
  agent?: AgentPersona;
  isActive?: boolean;
  isNew?: boolean;
  onClick?: () => void;
}

interface StoryRingsProps {
  rings: StoryRing[];
}

export function StoryRings({ rings }: StoryRingsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {rings.map((ring) => (
        <button
          key={ring.id}
          onClick={ring.onClick}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px]"
        >
          {/* Outer ring */}
          <div
            className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center p-[2px]"
            style={{
              background: ring.isNew
                ? 'conic-gradient(from 180deg at 50% 50%, #c9a84c 0deg, #e8c46a 180deg, #c9a84c 360deg)'
                : ring.isActive
                ? 'conic-gradient(from 180deg at 50% 50%, var(--obs-gold) 0deg, var(--obs-gold-bright) 120deg, var(--obs-gold) 360deg)'
                : 'var(--obs-border-default)',
              animation: ring.isActive ? 'obs-drift 4s linear infinite' : undefined,
            }}
          >
            {/* Inner circle */}
            <div
              className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: ring.agent ? ring.agent.bgColor : 'var(--obs-elevated)',
              }}
            >
              {ring.imageUrl ? (
                <img src={ring.imageUrl} alt={ring.label} className="w-full h-full object-cover" />
              ) : ring.agent ? (
                <span
                  className="text-xs font-medium"
                  style={{ color: ring.agent.color, fontFamily: 'var(--font-obsidian-body)' }}
                >
                  {ring.agent.initials}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--obs-text-muted)' }}>
                  {ring.label.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <span
            className="text-[10px] truncate max-w-[60px]"
            style={{ color: ring.isActive ? 'var(--obs-gold)' : 'var(--obs-text-secondary)' }}
          >
            {ring.label}
          </span>
        </button>
      ))}
    </div>
  );
}
