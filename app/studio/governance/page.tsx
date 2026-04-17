'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Clock, Check, X, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  current_status: string;
  submitted_by: string;
  submitted_at: string;
  priority: string;
  reviewer: string | null;
  comments: string | null;
  compliance_report: {
    status: string;
    issues: { severity: string; description: string; requiredAction: string }[];
    regulatoryReferences: string[];
  } | null;
}

const COLUMNS = [
  { id: 'draft', label: 'Draft', color: 'var(--obs-text-muted)' },
  { id: 'submitted', label: 'Submitted', color: 'var(--obs-info)' },
  { id: 'in_review', label: 'In Review', color: 'var(--obs-gold)' },
  { id: 'revisions_needed', label: 'Revisions', color: 'var(--obs-warning)' },
  { id: 'approved', label: 'Approved', color: 'var(--obs-success)' },
  { id: 'rejected', label: 'Rejected', color: 'var(--obs-error)' },
];

export default function GovernancePage() {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkflowItem | null>(null);
  const [migrating, setMigrating] = useState(false);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/governance');
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch { /* */ }
    setLoading(false);
  }

  async function migrate() {
    setMigrating(true);
    try {
      const res = await fetch('/api/db-migrate-governance', { method: 'POST' });
      const json = await res.json();
      if (json.success) { toast.success(json.message); await fetchItems(); }
      else toast.error(json.error);
    } catch { toast.error('Migration failed'); }
    setMigrating(false);
  }

  async function decide(id: string, decision: 'approve' | 'reject' | 'revise', comments?: string) {
    try {
      const res = await fetch('/api/governance/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: id, decision, comments, reviewer: 'Omran' }),
      });
      const json = await res.json();
      if (json.success) { toast.success(`Decision: ${decision}`); setSelected(null); await fetchItems(); }
      else toast.error(json.error);
    } catch { toast.error('Decision failed'); }
  }

  useEffect(() => { fetchItems(); }, []);

  const byColumn = (status: string) => items.filter(i => i.current_status === status);

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={24} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
              <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
                <span className="obs-gold-gradient-text">Governance</span>
              </h1>
            </div>
            <p style={{ color: 'var(--obs-text-secondary)' }}>
              Approval workflow. Compliance gate. Audit trail.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}
              style={{ borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-secondary)' }}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {items.length === 0 && !loading && (
              <Button onClick={migrate} disabled={migrating} size="sm" className="obs-gold-gradient text-black">
                {migrating ? 'Setting up...' : 'Setup Tables'}
              </Button>
            )}
          </div>
        </motion.div>

        {loading && items.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--obs-gold)' }} />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-20 rounded-2xl border"
               style={{ borderColor: 'var(--obs-border-default)', background: 'var(--obs-raised)' }}>
            <ShieldCheck className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--obs-text-muted)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--obs-text-primary)' }}>No workflow items yet</p>
            <p className="text-xs" style={{ color: 'var(--obs-text-muted)' }}>
              Campaigns and assets submitted for approval will appear here.
            </p>
          </div>
        )}

        {/* Kanban */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {COLUMNS.map(col => (
              <div key={col.id} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs uppercase tracking-wider" style={{ color: col.color }}>
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[10px] obs-mono" style={{ color: 'var(--obs-text-muted)' }}>
                    {byColumn(col.id).length}
                  </span>
                </div>

                <div className="space-y-2">
                  {byColumn(col.id).map(item => {
                    const daysInQueue = Math.floor((Date.now() - new Date(item.submitted_at).getTime()) / (1000 * 60 * 60 * 24));
                    const overdueQueue = daysInQueue > 3;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelected(item)}
                        className="p-3 rounded-lg border cursor-pointer transition-all"
                        style={{
                          background: 'var(--obs-raised)',
                          borderColor: selected?.id === item.id ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                        }}
                      >
                        <p className="text-xs font-medium truncate mb-1" style={{ color: 'var(--obs-text-primary)' }}>
                          {item.entity_name || item.entity_id}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--obs-text-muted)' }}>
                          {item.entity_type}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] flex items-center gap-1"
                                style={{ color: overdueQueue ? 'var(--obs-error)' : 'var(--obs-text-muted)' }}>
                            <Clock className="h-2.5 w-2.5" /> {daysInQueue}d
                          </span>
                          {item.compliance_report?.issues && item.compliance_report.issues.length > 0 && (
                            <span className="text-[10px] flex items-center gap-0.5"
                                  style={{ color: 'var(--obs-warning)' }}>
                              <AlertTriangle className="h-2.5 w-2.5" /> {item.compliance_report.issues.length}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review panel (slide-in) */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[420px] border-l z-50 overflow-y-auto"
              style={{ background: 'var(--obs-elevated)', borderColor: 'var(--obs-border-default)' }}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--obs-text-muted)' }}>
                      {selected.entity_type}
                    </p>
                    <h2 className="obs-display text-xl" style={{ color: 'var(--obs-text-primary)' }}>
                      {selected.entity_name || selected.entity_id}
                    </h2>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ color: 'var(--obs-text-muted)' }}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-xs space-y-1" style={{ color: 'var(--obs-text-secondary)' }}>
                  <p>Submitted by <strong>{selected.submitted_by}</strong></p>
                  <p>Status: <span style={{ color: 'var(--obs-gold)' }}>{selected.current_status}</span></p>
                  <p>Priority: {selected.priority}</p>
                </div>

                {selected.compliance_report && (
                  <div className="rounded-xl border p-4 space-y-3"
                       style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" style={{ color: 'var(--obs-gold)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--obs-text-primary)' }}>Compliance Report</p>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--obs-text-secondary)' }}>
                      Status: <span style={{ color: selected.compliance_report.status === 'approved' ? 'var(--obs-success)' : 'var(--obs-warning)' }}>
                        {selected.compliance_report.status}
                      </span>
                    </p>
                    {selected.compliance_report.issues?.length > 0 && (
                      <div className="space-y-1.5">
                        {selected.compliance_report.issues.map((issue, i) => (
                          <div key={i} className="text-xs p-2 rounded border"
                               style={{ background: 'var(--obs-base)', borderColor: 'var(--obs-border-default)' }}>
                            <p style={{ color: 'var(--obs-text-primary)' }}>{issue.description}</p>
                            <p className="mt-0.5" style={{ color: 'var(--obs-text-muted)' }}>→ {issue.requiredAction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selected.current_status !== 'approved' && selected.current_status !== 'rejected' && (
                  <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--obs-border-default)' }}>
                    <Button onClick={() => decide(selected.id, 'approve')}
                            className="w-full h-10" style={{ background: 'var(--obs-success)', color: 'black' }}>
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button onClick={() => decide(selected.id, 'revise', 'Please revise per compliance issues')}
                            variant="outline" className="w-full h-10"
                            style={{ borderColor: 'var(--obs-warning)', color: 'var(--obs-warning)' }}>
                      <AlertTriangle className="h-4 w-4 mr-2" /> Request Revisions
                    </Button>
                    <Button onClick={() => decide(selected.id, 'reject', 'Not approved')}
                            variant="outline" className="w-full h-10"
                            style={{ borderColor: 'var(--obs-error)', color: 'var(--obs-error)' }}>
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
