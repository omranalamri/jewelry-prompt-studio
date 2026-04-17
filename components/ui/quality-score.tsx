'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QualityScoreProps {
  score: number; // 1-5
  breakdown?: {
    visual?: number;
    copy?: number;
    brandAlignment?: number;
    channelFitness?: number;
    cultural?: number;
  };
  compact?: boolean;
}

function colorForScore(score: number): string {
  if (score >= 4.5) return 'var(--obs-success)';
  if (score >= 3.5) return 'var(--obs-gold)';
  if (score >= 2.5) return 'var(--obs-warning)';
  return 'var(--obs-error)';
}

export function QualityScore({ score, breakdown, compact }: QualityScoreProps) {
  const [open, setOpen] = useState(false);
  const color = colorForScore(score);
  const hasBreakdown = breakdown && Object.keys(breakdown).length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => hasBreakdown && setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs obs-mono border transition-all"
        style={{
          background: `${color}15`,
          borderColor: `${color}40`,
          color,
          cursor: hasBreakdown ? 'pointer' : 'default',
        }}
      >
        <span className="font-medium">{score.toFixed(1)}</span>
        {!compact && <span className="opacity-60">/ 5</span>}
      </button>

      <AnimatePresence>
        {open && hasBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 p-3 rounded-xl border z-50 min-w-[200px]"
            style={{
              background: 'var(--obs-elevated)',
              borderColor: 'var(--obs-border-default)',
              boxShadow: 'var(--obs-shadow-card)',
            }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--obs-text-muted)' }}>
              Quality breakdown
            </p>
            <div className="space-y-1.5">
              {breakdown?.visual !== undefined && (
                <DimensionBar label="Visual" value={breakdown.visual} />
              )}
              {breakdown?.copy !== undefined && (
                <DimensionBar label="Copy" value={breakdown.copy} />
              )}
              {breakdown?.brandAlignment !== undefined && (
                <DimensionBar label="Brand" value={breakdown.brandAlignment} />
              )}
              {breakdown?.channelFitness !== undefined && (
                <DimensionBar label="Channel" value={breakdown.channelFitness} />
              )}
              {breakdown?.cultural !== undefined && (
                <DimensionBar label="Cultural" value={breakdown.cultural} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const color = colorForScore(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-14" style={{ color: 'var(--obs-text-secondary)' }}>{label}</span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--obs-base)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[10px] obs-mono w-7 text-right" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  );
}
