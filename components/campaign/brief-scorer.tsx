'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { BriefScore, CampaignBrief } from '@/lib/quality/scorer';

interface BriefScorerProps {
  brief: CampaignBrief;
  debounceMs?: number;
}

export function BriefScorer({ brief, debounceMs = 1000 }: BriefScorerProps) {
  const [score, setScore] = useState<BriefScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hasContent = Object.values(brief).some(v =>
      typeof v === 'string' ? v.trim().length > 3 : Array.isArray(v) ? v.length > 0 : !!v
    );
    if (!hasContent) { setScore(null); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/campaigns/score-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(brief),
        });
        const json = await res.json();
        if (json.success) setScore(json.data);
      } catch {} finally { setLoading(false); }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [brief, debounceMs]);

  if (!score && !loading) {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
      >
        <p className="text-sm" style={{ color: 'var(--obs-text-muted)' }}>
          Start typing to see live brief quality scoring.
        </p>
      </div>
    );
  }

  const overallColor =
    !score ? 'var(--obs-gold)' :
    score.overall >= 4 ? 'var(--obs-success)' :
    score.overall >= 3 ? 'var(--obs-gold)' :
    score.overall >= 2 ? 'var(--obs-warning)' :
    'var(--obs-error)';

  const StatusIcon =
    !score ? Loader2 :
    score.overall >= 4 ? CheckCircle :
    score.overall >= 2 ? AlertTriangle :
    XCircle;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-2xl border p-6 space-y-4"
      style={{ background: 'var(--obs-raised)', borderColor: `${overallColor}40` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--obs-text-muted)' }}>
            Brief Quality
          </p>
          <p className="obs-display text-2xl" style={{ color: 'var(--obs-text-primary)' }}>
            Live Scoring {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" style={{ color: 'var(--obs-gold)' }} />}
          </p>
        </div>
        {score && (
          <div className="text-right">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" style={{ color: overallColor }} />
              <span className="obs-display text-4xl" style={{ color: overallColor }}>
                {score.overall.toFixed(1)}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--obs-text-muted)' }}>/ 5.0</p>
          </div>
        )}
      </div>

      {/* Dimension bars */}
      {score && (
        <div className="space-y-2">
          <Bar label="Specificity" value={score.specificity} />
          <Bar label="Feasibility" value={score.feasibility} />
          <Bar label="Brand Alignment" value={score.brandAlignment} />
          <Bar label="Completeness" value={score.completeness} />
        </div>
      )}

      {/* Blockers */}
      {score && score.blockers.length > 0 && (
        <div
          className="p-3 rounded-lg border"
          style={{ background: 'var(--obs-error-bg)', borderColor: 'var(--obs-error)' }}
        >
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--obs-error)' }}>
            Must fix before proceeding:
          </p>
          <ul className="space-y-1">
            {score.blockers.map((b, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--obs-text-secondary)' }}>
                <span style={{ color: 'var(--obs-error)' }}>•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {score && score.suggestions.length > 0 && (
        <div
          className="p-3 rounded-lg border"
          style={{ background: 'rgba(201,168,76,0.05)', borderColor: 'var(--obs-border-gold)' }}
        >
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--obs-gold)' }}>
            Suggestions
          </p>
          <ul className="space-y-1">
            {score.suggestions.map((s, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--obs-text-secondary)' }}>
                <span style={{ color: 'var(--obs-gold)' }}>→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 4 ? 'var(--obs-success)' :
    value >= 3 ? 'var(--obs-gold)' :
    value >= 2 ? 'var(--obs-warning)' : 'var(--obs-error)';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-28" style={{ color: 'var(--obs-text-secondary)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--obs-base)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[10px] obs-mono w-8 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}
