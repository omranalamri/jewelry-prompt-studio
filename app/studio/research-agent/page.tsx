'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle, XCircle, ExternalLink, RefreshCw, Sparkles, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Finding {
  id: string;
  source: string;
  title: string;
  url: string | null;
  summary: string;
  relevance_score: number;
  category: string;
  actionable: boolean;
  suggested_action: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  reviewed: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  integrated: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function ResearchAgentPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchFindings = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = filter === 'all' ? '/api/research-agent' : `/api/research-agent?status=${filter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setFindings(json.data);
    } catch { /* */ }
    finally { setIsLoading(false); }
  }, [filter]);

  useEffect(() => { fetchFindings(); }, [fetchFindings]);

  const scan = useCallback(async (scope: string) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/research-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.data.message);
        fetchFindings();
      } else {
        toast.error(json.error);
      }
    } catch { toast.error('Scan failed'); }
    finally { setIsScanning(false); }
  }, [fetchFindings]);

  const updateStatus = useCallback(async (id: string, status: string, rejectionReason?: string) => {
    try {
      await fetch('/api/research-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, rejectionReason }),
      });
      toast.success(`Marked as ${status}`);
      fetchFindings();
    } catch { toast.error('Failed'); }
  }, [fetchFindings]);

  const filtered = findings;
  const newCount = findings.filter(f => f.status === 'new').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Research Agent</h2>
            <p className="text-sm text-muted-foreground">
              AI scans the web for new models, tools, and community feedback.
              {newCount > 0 && <span className="text-gold font-medium"> {newCount} new findings.</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => scan('quick')} disabled={isScanning} size="sm">
            {isScanning ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Quick Scan
          </Button>
          <Button onClick={() => scan('full')} disabled={isScanning} className="gold-gradient text-white border-0 hover:opacity-90" size="sm">
            {isScanning ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Scanning...</> : <><Search className="h-3.5 w-3.5 mr-1.5" /> Full Scan</>}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {['all', 'new', 'approved', 'rejected', 'integrated'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${filter === s ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
            {s === 'all' ? `All (${findings.length})` : `${s} (${findings.filter(f => f.status === s).length})`}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No findings yet</p>
            <p className="text-sm text-muted-foreground">Click &quot;Full Scan&quot; to search for new AI models, tools, and community feedback.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((f) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`border-l-4 ${f.relevance_score >= 8 ? 'border-l-gold' : f.relevance_score >= 6 ? 'border-l-blue-400' : 'border-l-muted-foreground/30'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-medium">{f.title}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[f.status] || ''}`}>{f.status}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted">{f.category}</span>
                      <span className="text-[9px] font-mono text-gold">{f.relevance_score}/10</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.summary}</p>

                    {f.suggested_action && (
                      <div className="mt-2 p-2 rounded-lg bg-gold/5 border border-gold/10">
                        <p className="text-[10px]"><span className="font-medium text-gold-dark dark:text-gold-light">Action:</span> {f.suggested_action}</p>
                      </div>
                    )}

                    {f.rejection_reason && (
                      <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900">
                        <p className="text-[10px] text-red-700 dark:text-red-400"><span className="font-medium">Rejection reason:</span> {f.rejection_reason}</p>
                      </div>
                    )}

                    <p className="text-[9px] text-muted-foreground mt-1.5">
                      {f.source} · {new Date(f.created_at).toLocaleDateString()}
                      {f.actionable && <span className="text-green-600 ml-2">Actionable</span>}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent text-xs">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {f.status === 'new' && (
                      <>
                        <button onClick={() => updateStatus(f.id, 'approved')}
                          className="text-[9px] px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50">
                          <CheckCircle className="h-2.5 w-2.5 inline mr-0.5" />Approve
                        </button>
                        <button onClick={() => {
                          const reason = prompt('Why reject this finding?');
                          if (reason) updateStatus(f.id, 'rejected', reason);
                        }}
                          className="text-[9px] px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50">
                          <XCircle className="h-2.5 w-2.5 inline mr-0.5" />Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
