'use client';

import { motion } from 'framer-motion';
import { Check, Loader2, FileText, Search, Sparkles, Type, ShieldCheck, Video } from 'lucide-react';

export type GenerationStage =
  | 'brief' | 'research' | 'creative' | 'copy' | 'compliance' | 'output';

interface StageInfo {
  id: GenerationStage;
  label: string;
  icon: typeof FileText;
}

const STAGES: StageInfo[] = [
  { id: 'brief', label: 'Brief', icon: FileText },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'creative', label: 'Creative', icon: Sparkles },
  { id: 'copy', label: 'Copy', icon: Type },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'output', label: 'Output', icon: Video },
];

interface GenerationProgressProps {
  currentStage: GenerationStage;
  completedStages: GenerationStage[];
  stageDurations?: Partial<Record<GenerationStage, number>>; // seconds
}

export function GenerationProgress({ currentStage, completedStages, stageDurations }: GenerationProgressProps) {
  return (
    <div
      className="relative rounded-2xl border p-4 overflow-hidden"
      style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
    >
      {/* Animated scan line */}
      <motion.div
        className="absolute inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--obs-gold), transparent)' }}
        animate={{ y: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative flex items-center gap-2 overflow-x-auto">
        {STAGES.map((stage, idx) => {
          const isDone = completedStages.includes(stage.id);
          const isCurrent = currentStage === stage.id;
          const Icon = isDone ? Check : stage.icon;

          return (
            <div key={stage.id} className="flex items-center gap-2 flex-shrink-0">
              <motion.div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                animate={{
                  background: isCurrent ? 'rgba(201,168,76,0.1)' : isDone ? 'rgba(61,186,114,0.08)' : 'var(--obs-elevated)',
                  borderColor: isCurrent ? 'var(--obs-gold)' : isDone ? 'var(--obs-success)' : 'var(--obs-border-default)',
                }}
                transition={{ duration: 0.3 }}
              >
                {isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--obs-gold)' }} />
                ) : (
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: isDone ? 'var(--obs-success)' : isCurrent ? 'var(--obs-gold)' : 'var(--obs-text-muted)' }}
                  />
                )}
                <span
                  className="text-xs"
                  style={{ color: isDone ? 'var(--obs-text-primary)' : isCurrent ? 'var(--obs-gold)' : 'var(--obs-text-muted)' }}
                >
                  {stage.label}
                </span>
                {stageDurations?.[stage.id] !== undefined && isDone && (
                  <span className="text-[10px] obs-mono" style={{ color: 'var(--obs-text-muted)' }}>
                    {stageDurations[stage.id]?.toFixed(1)}s
                  </span>
                )}
              </motion.div>
              {idx < STAGES.length - 1 && (
                <div
                  className="w-4 h-px"
                  style={{ background: isDone ? 'var(--obs-success)' : 'var(--obs-border-default)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
