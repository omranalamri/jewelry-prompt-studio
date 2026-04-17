'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { ScrollText, Loader2, User, Clock } from 'lucide-react';

interface AuditEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/governance/audit').then(r => r.json()).then(d => {
      if (d.success) setEntries(d.data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.action.startsWith(filter));

  const actionCategories = Array.from(new Set(entries.map(e => e.action.split('.')[0])));

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={20} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ScrollText className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
            <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
              <span className="obs-gold-gradient-text">Audit Trail</span>
            </h1>
          </div>
          <p style={{ color: 'var(--obs-text-secondary)' }}>
            Immutable log of every action across the platform. {entries.length} entries.
          </p>
        </motion.div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          <button onClick={() => setFilter('all')}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    background: filter === 'all' ? 'rgba(201,168,76,0.1)' : 'var(--obs-raised)',
                    borderColor: filter === 'all' ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                    color: filter === 'all' ? 'var(--obs-gold)' : 'var(--obs-text-secondary)',
                  }}>
            All ({entries.length})
          </button>
          {actionCategories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all capitalize"
                    style={{
                      background: filter === cat ? 'rgba(201,168,76,0.1)' : 'var(--obs-raised)',
                      borderColor: filter === cat ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                      color: filter === cat ? 'var(--obs-gold)' : 'var(--obs-text-secondary)',
                    }}>
              {cat} ({entries.filter(e => e.action.startsWith(cat)).length})
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--obs-gold)' }} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 rounded-2xl border"
               style={{ borderColor: 'var(--obs-border-default)', background: 'var(--obs-raised)' }}>
            <ScrollText className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--obs-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>No audit entries yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--obs-text-muted)' }}>
              Submit something to governance to generate audit events.
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2">
          {filtered.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className="rounded-xl border p-4"
              style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--obs-gold)' }} />
                  <span className="text-xs obs-mono" style={{ color: 'var(--obs-gold)' }}>{e.action}</span>
                </div>
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--obs-text-muted)' }}>
                  <Clock className="h-3 w-3" />
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--obs-text-secondary)' }}>
                <User className="h-3 w-3" />
                <span style={{ color: 'var(--obs-text-primary)' }}>{e.actor_name || e.actor_id}</span>
                {e.entity_name && (
                  <>
                    <span>→</span>
                    <span>{e.entity_name}</span>
                  </>
                )}
              </div>

              {e.details && Object.keys(e.details).length > 0 && (
                <pre className="text-[10px] obs-mono p-2 rounded overflow-x-auto"
                     style={{ background: 'var(--obs-base)', color: 'var(--obs-text-muted)' }}>
                  {JSON.stringify(e.details, null, 2).slice(0, 300)}
                </pre>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
