'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Telescope, ExternalLink, Lightbulb, Database, Wrench, BookOpen, Workflow, Eye, ArrowUpRight, FlaskConical, Link2, Loader2, Search, AtSign, Globe, MessageCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMMUNITY_RESOURCES, CommunityResource } from '@/lib/creative/community-intel';

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Lightbulb; color: string }> = {
  model: { label: 'AI Models', icon: Lightbulb, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300' },
  dataset: { label: 'Datasets', icon: Database, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300' },
  tool: { label: 'Tools', icon: Wrench, color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300' },
  research: { label: 'Research', icon: BookOpen, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300' },
  workflow: { label: 'Workflows', icon: Workflow, color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300' },
  lora: { label: 'LoRA/Fine-Tune', icon: FlaskConical, color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300' },
  technique: { label: 'Techniques', icon: Link2, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300' },
  competitor: { label: 'Competitors', icon: Eye, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300' },
};

const IMPACT_COLORS = {
  high: 'border-l-gold bg-gold/[0.02]',
  medium: 'border-l-blue-400',
  low: 'border-l-muted-foreground/30',
};

function ResourceCard({ resource }: { resource: CommunityResource }) {
  const cat = CATEGORY_CONFIG[resource.category] || CATEGORY_CONFIG.tool;
  const Icon = cat.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border-l-4 ${IMPACT_COLORS[resource.impact]} hover:shadow-md transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-medium text-sm">{resource.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}>
                  <Icon className="h-2.5 w-2.5 inline mr-0.5" />{cat.label}
                </span>
                {resource.impact === 'high' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full gold-gradient text-white">High Impact</span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{resource.source}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
              <div className="mt-2 p-2 rounded-lg bg-gold/5 border border-gold/10">
                <p className="text-xs"><span className="font-medium text-gold-dark dark:text-gold-light">Why this matters:</span> {resource.impactReason}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Effort: <span className={`font-medium ${resource.effort === 'easy' ? 'text-green-600' : resource.effort === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>{resource.effort}</span></p>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {resource.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <a href={resource.url} target="_blank" rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              {resource.status !== 'integrated' && (
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/safeguards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'approve-resource', data: { resourceId: resource.id, notes: resource.name } }),
                      });
                      toast.success(`"${resource.name}" approved for integration`);
                    } catch { toast.error('Failed'); }
                  }}
                  className="text-[9px] px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface LiveFinding {
  title: string;
  source: string;
  url: string | null;
  summary: string;
  relevanceScore: number;
  category: string;
  actionable: boolean;
  suggestedAction: string | null;
}

const SOURCE_ICONS: Record<string, typeof Globe> = {
  twitter: AtSign,
  reddit: MessageCircle,
  web: Globe,
  default: Search,
};

const SOURCE_COLORS: Record<string, string> = {
  twitter: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
  reddit: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  web: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  default: 'text-muted-foreground bg-muted border-muted',
};

export default function ResearchPage() {
  const [filter, setFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [liveFindings, setLiveFindings] = useState<LiveFinding[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanScope, setScanScope] = useState<'quick' | 'full'>('quick');

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/research-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: scanScope }),
      });
      const json = await res.json();
      if (json.success && json.data.findings) {
        setLiveFindings(json.data.findings);
        setLastScan(new Date().toLocaleString());
        toast.success(json.data.message);
      } else {
        toast.error(json.data?.message || 'Scan produced no results');
      }
    } catch { toast.error('Research scan failed'); }
    setScanning(false);
  };

  const filtered = COMMUNITY_RESOURCES.filter(r =>
    (filter === 'all' || r.category === filter) &&
    (impactFilter === 'all' || r.impact === impactFilter)
  );

  const highImpactCount = COMMUNITY_RESOURCES.filter(r => r.impact === 'high').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Telescope className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Research Hub</h2>
          <p className="text-sm text-muted-foreground">
            Live intelligence from Twitter/X, Reddit, web — models, tools, trends, and competitors.
          </p>
        </div>
      </div>

      {/* Live Scan Section */}
      <Card className="border-gold/20 bg-gold/[0.02]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold">Live Research Scan</span>
              {lastScan && <span className="text-[10px] text-muted-foreground">Last: {lastScan}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setScanScope('quick')}
                className={`text-[10px] px-2 py-1 rounded-full border ${scanScope === 'quick' ? 'border-gold bg-gold/10 text-gold' : ''}`}>
                Quick (4 queries)
              </button>
              <button onClick={() => setScanScope('full')}
                className={`text-[10px] px-2 py-1 rounded-full border ${scanScope === 'full' ? 'border-gold bg-gold/10 text-gold' : ''}`}>
                Full (20 queries)
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><AtSign className="h-3 w-3 text-sky-500" /> Twitter/X</span>
            <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3 text-orange-500" /> Reddit</span>
            <span className="flex items-center gap-0.5"><Globe className="h-3 w-3 text-emerald-500" /> Web</span>
            <span>— AI models, jewelry trends, competitors, techniques</span>
          </div>
          <Button onClick={runScan} disabled={scanning} className="w-full gold-gradient text-white border-0 h-10 text-sm">
            {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning {scanScope === 'full' ? '20' : '4'} sources...</>
              : <><Zap className="h-4 w-4 mr-2" /> Scan for Latest Intelligence</>}
          </Button>
        </CardContent>
      </Card>

      {/* Live Findings */}
      <AnimatePresence>
        {liveFindings.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                Live Findings ({liveFindings.length})
              </p>
              <button onClick={() => setLiveFindings([])} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
            </div>
            {liveFindings
              .sort((a, b) => b.relevanceScore - a.relevanceScore)
              .map((f, i) => {
                const sourceKey = f.source?.toLowerCase().includes('twitter') || f.source?.toLowerCase().includes('x.com') ? 'twitter'
                  : f.source?.toLowerCase().includes('reddit') ? 'reddit' : 'web';
                const SourceIcon = SOURCE_ICONS[sourceKey] || SOURCE_ICONS.default;
                const sourceColor = SOURCE_COLORS[sourceKey] || SOURCE_COLORS.default;
                const cat = CATEGORY_CONFIG[f.category] || CATEGORY_CONFIG.tool;
                const CatIcon = cat.icon;

                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className={`border-l-4 ${f.relevanceScore >= 8 ? 'border-l-gold bg-gold/[0.02]' : f.relevanceScore >= 6 ? 'border-l-blue-400' : 'border-l-muted-foreground/30'}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <h4 className="font-medium text-xs">{f.title}</h4>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${cat.color}`}>
                                <CatIcon className="h-2 w-2 inline mr-0.5" />{cat.label}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${sourceColor}`}>
                                <SourceIcon className="h-2 w-2 inline mr-0.5" />{sourceKey}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted">
                                {f.relevanceScore}/10
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{f.summary}</p>
                            {f.suggestedAction && (
                              <div className="mt-1.5 p-1.5 rounded bg-gold/5 border border-gold/10">
                                <p className="text-[10px]"><span className="font-medium text-gold">Action:</span> {f.suggestedAction}</p>
                              </div>
                            )}
                          </div>
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noreferrer"
                              className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-accent shrink-0">
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-gold/20 bg-gold/[0.02]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-gold">{highImpactCount}</p>
            <p className="text-xs text-muted-foreground">High Impact</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{COMMUNITY_RESOURCES.length}</p>
            <p className="text-xs text-muted-foreground">Total Resources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{COMMUNITY_RESOURCES.filter(r => r.status === 'available').length}</p>
            <p className="text-xs text-muted-foreground">Ready Now</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...Object.keys(CATEGORY_CONFIG)].map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${filter === c ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
              {c === 'all' ? 'All' : CATEGORY_CONFIG[c]?.label || c}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all', 'high', 'medium', 'low'].map(i => (
            <button key={i} onClick={() => setImpactFilter(i)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${impactFilter === i ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
              {i === 'all' ? 'All Impact' : `${i} Impact`}
            </button>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="space-y-3">
        {filtered.map(r => <ResourceCard key={r.id} resource={r} />)}
      </div>

      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Telescope className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No resources match your filters.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
