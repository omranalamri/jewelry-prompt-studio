'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Layers, ChevronDown, ChevronUp, ExternalLink, Clock, DollarSign, Trophy, Loader2, X } from 'lucide-react';

interface PipelineStep {
  step: string;
  label: string;
  url: string;
  time: string;
  model?: string;
  cost?: string;
}

interface PipelineResult {
  success: boolean;
  resultUrl?: string;
  model?: string;
  cost?: string;
  costRaw?: number;
  timeSeconds?: number;
  cleanedImageUrl?: string;
  pipelineSteps?: PipelineStep[];
  error?: string;
}

interface Comparison {
  id: number;
  name: string;
  referenceUrl: string;
  referencePrompt: string;
  creativeDirection: string;
  inspirationUrl?: string;
  direct?: PipelineResult;
  simple: PipelineResult;
  full: PipelineResult;
}

interface ComparisonData {
  generatedAt: string;
  count: number;
  comparisons: Comparison[];
}

function PipelineLineage({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="flex items-start gap-0.5 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-0.5 flex-shrink-0">
          <div className="flex flex-col items-center gap-0.5 w-[64px]">
            <div className="relative w-[56px] h-[56px] rounded-lg overflow-hidden border border-white/10 bg-black">
              <img src={step.url} alt={step.label} className="w-full h-full object-cover" />
              <div className="absolute top-0 left-0 w-4 h-4 rounded-br-md bg-gold text-white text-[8px] font-bold flex items-center justify-center">
                {i + 1}
              </div>
            </div>
            <p className="text-[7px] text-center leading-tight text-muted-foreground max-w-[64px]">{step.label}</p>
            <div className="flex items-center gap-0.5">
              {step.time !== '0s' && step.time !== 'auto' && (
                <span className="text-[7px] text-muted-foreground">{step.time}</span>
              )}
              {step.cost && <span className="text-[7px] text-gold">{step.cost}</span>}
            </div>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="h-2.5 w-2.5 text-gold/40 mt-6 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function ComparisonCard({ comparison, index, onImageClick }: { comparison: Comparison; index: number; onImageClick: (url: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedView, setSelectedView] = useState<'side-by-side' | 'overlay'>('side-by-side');

  const directOk = comparison.direct?.success;
  const simpleOk = comparison.simple.success;
  const fullOk = comparison.full.success;
  const hasDirect = !!comparison.direct;
  const hasInspo = !!comparison.inspirationUrl;
  const colCount = 1 + (hasInspo ? 1 : 0) + (hasDirect ? 1 : 0) + 1 + 1;
  // Tailwind needs static class names for JIT — enumerate them
  const cols = colCount === 5 ? 'grid-cols-5' : colCount === 4 ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full gold-gradient text-white font-bold text-sm flex items-center justify-center">
              {comparison.id}
            </span>
            <div>
              <h3 className="font-semibold text-sm">{comparison.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 max-w-md truncate">
                {comparison.creativeDirection}
              </p>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main comparison grid */}
      <div className="p-4">
        <div className={`grid ${cols} gap-3`}>
          {/* Product — the customer's actual piece */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Product</span>
            </div>
            <div className="relative rounded-xl overflow-hidden border-2 border-blue-500/30 bg-black aspect-square cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
              onClick={() => onImageClick(comparison.referenceUrl)}>
              <img src={comparison.referenceUrl} alt="Product" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80">
                <p className="text-[8px] text-white/80 leading-tight">Customer&apos;s piece</p>
              </div>
            </div>
          </div>

          {/* Inspiration — the visual style reference */}
          {hasInspo && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-500">Inspiration</span>
              </div>
              <div className="relative rounded-xl overflow-hidden border-2 border-pink-500/30 bg-black aspect-square cursor-pointer hover:ring-2 hover:ring-pink-500/50 transition-all"
                onClick={() => onImageClick(comparison.inspirationUrl!)}>
                <img src={comparison.inspirationUrl} alt="Inspiration" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80">
                  <p className="text-[8px] text-white/80 leading-tight">Style reference</p>
                </div>
              </div>
            </div>
          )}

          {/* Direct Pipeline Result (if present) */}
          {hasDirect && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Direct</span>
                {directOk && (
                  <span className="text-[9px] text-muted-foreground ml-auto">
                    {comparison.direct!.timeSeconds}s · {comparison.direct!.cost}
                  </span>
                )}
              </div>
              <div className={`relative rounded-xl overflow-hidden border-2 bg-black aspect-square ${
                directOk ? 'border-amber-500/30 cursor-pointer hover:ring-2 hover:ring-amber-500/50' : 'border-destructive/30'
              }`} onClick={() => directOk && onImageClick(comparison.direct!.resultUrl!)}>
                {directOk ? (
                  <>
                    <img src={comparison.direct!.resultUrl} alt="Direct result" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80">
                      <p className="text-[8px] text-white/80">{comparison.direct!.model}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-destructive text-xs p-3 text-center">
                    {comparison.direct!.error || 'Failed'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Simple Pipeline Result */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Simple</span>
              {simpleOk && (
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {comparison.simple.timeSeconds}s · {comparison.simple.cost}
                </span>
              )}
            </div>
            <div className={`relative rounded-xl overflow-hidden border-2 bg-black aspect-square ${
              simpleOk ? 'border-emerald-500/30 cursor-pointer hover:ring-2 hover:ring-emerald-500/50' : 'border-destructive/30'
            }`} onClick={() => simpleOk && onImageClick(comparison.simple.resultUrl!)}>
              {simpleOk ? (
                <>
                  <img src={comparison.simple.resultUrl} alt="Simple result" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80">
                    <p className="text-[8px] text-white/80">{comparison.simple.model}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-destructive text-xs p-3 text-center">
                  {comparison.simple.error || 'Failed'}
                </div>
              )}
            </div>
          </div>

          {/* Full Pipeline Result */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-purple-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">Full</span>
              {fullOk && (
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {comparison.full.timeSeconds}s · {comparison.full.cost}
                </span>
              )}
            </div>
            <div className={`relative rounded-xl overflow-hidden border-2 bg-black aspect-square ${
              fullOk ? 'border-purple-500/30 cursor-pointer hover:ring-2 hover:ring-purple-500/50' : 'border-destructive/30'
            }`} onClick={() => fullOk && onImageClick(comparison.full.resultUrl!)}>
              {fullOk ? (
                <>
                  <img src={comparison.full.resultUrl} alt="Full result" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80">
                    <p className="text-[8px] text-white/80">{comparison.full.model}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-destructive text-xs p-3 text-center">
                  {comparison.full.error || 'Failed'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: Full lineage + details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              {/* Creative Direction */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Creative Direction (Prompt)</p>
                <p className="text-xs">{comparison.creativeDirection}</p>
              </div>

              {/* View toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedView('side-by-side')}
                  className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
                    selectedView === 'side-by-side' ? 'border-gold bg-gold/10 text-gold' : 'text-muted-foreground'
                  }`}
                >
                  Side by Side
                </button>
                <button
                  onClick={() => setSelectedView('overlay')}
                  className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
                    selectedView === 'overlay' ? 'border-gold bg-gold/10 text-gold' : 'text-muted-foreground'
                  }`}
                >
                  Large View
                </button>
              </div>

              {selectedView === 'overlay' && (
                <div className={`grid ${cols} gap-4`}>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-blue-500 uppercase">Product</p>
                    <img src={comparison.referenceUrl} alt="Product" className="w-full rounded-xl border-2 border-blue-500/30" />
                  </div>
                  {hasInspo && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-pink-500 uppercase">Inspiration</p>
                      <img src={comparison.inspirationUrl} alt="Inspiration" className="w-full rounded-xl border-2 border-pink-500/30" />
                    </div>
                  )}
                  {hasDirect && directOk && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-amber-500 uppercase">Direct Result</p>
                      <img src={comparison.direct!.resultUrl} alt="Direct" className="w-full rounded-xl border-2 border-amber-500/30" />
                    </div>
                  )}
                  {simpleOk && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-emerald-500 uppercase">Simple Result</p>
                      <img src={comparison.simple.resultUrl} alt="Simple" className="w-full rounded-xl border-2 border-emerald-500/30" />
                    </div>
                  )}
                  {fullOk && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-purple-500 uppercase">Full Result</p>
                      <img src={comparison.full.resultUrl} alt="Full" className="w-full rounded-xl border-2 border-purple-500/30" />
                    </div>
                  )}
                </div>
              )}

              {/* Direct Pipeline Lineage */}
              {hasDirect && directOk && comparison.direct!.pipelineSteps && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-500">Direct Pipeline Lineage</span>
                    <span className="text-[10px] text-muted-foreground">Raw image → NB2 (no processing)</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-amber-500/5 border-amber-500/20">
                    <PipelineLineage steps={comparison.direct!.pipelineSteps} />
                  </div>
                </div>
              )}

              {/* Simple Pipeline Lineage */}
              {simpleOk && comparison.simple.pipelineSteps && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Simple Pipeline Lineage</span>
                    <span className="text-[10px] text-muted-foreground">BG Removal → NB Pro (2K)</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                    <PipelineLineage steps={comparison.simple.pipelineSteps} />
                  </div>
                </div>
              )}

              {/* Full Pipeline Lineage */}
              {fullOk && comparison.full.pipelineSteps && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-purple-500">Full Pipeline Lineage</span>
                    <span className="text-[10px] text-muted-foreground">BG Removal → Canny → NB2</span>
                  </div>
                  <div className="p-2 rounded-lg border bg-purple-500/5 border-purple-500/20">
                    <PipelineLineage steps={comparison.full.pipelineSteps} />
                  </div>
                </div>
              )}

              {/* Open in new tab links */}
              <div className="flex gap-2 text-[10px]">
                <a href={comparison.referenceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Reference
                </a>
                {hasDirect && directOk && (
                  <a href={comparison.direct!.resultUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-amber-500 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Direct
                  </a>
                )}
                {simpleOk && (
                  <a href={comparison.simple.resultUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-500 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Simple
                  </a>
                )}
                {fullOk && (
                  <a href={comparison.full.resultUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-purple-500 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Full
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ComparePage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/comparison-data.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
        <span className="text-sm text-muted-foreground">Loading comparison data...</span>
      </div>
    );
  }

  if (!data || !data.comparisons.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Layers className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No comparison data yet.</p>
        <p className="text-xs text-muted-foreground">Run the comparison test to generate results.</p>
      </div>
    );
  }

  // Aggregate stats
  const hasDirect = data.comparisons.some(c => c.direct);
  const directSuccessCount = data.comparisons.filter(c => c.direct?.success).length;
  const simpleSuccessCount = data.comparisons.filter(c => c.simple.success).length;
  const fullSuccessCount = data.comparisons.filter(c => c.full.success).length;
  const avgDirectTime = data.comparisons.filter(c => c.direct?.success).reduce((s, c) => s + (c.direct!.timeSeconds || 0), 0) / (directSuccessCount || 1);
  const avgSimpleTime = data.comparisons.filter(c => c.simple.success).reduce((s, c) => s + (c.simple.timeSeconds || 0), 0) / (simpleSuccessCount || 1);
  const avgFullTime = data.comparisons.filter(c => c.full.success).reduce((s, c) => s + (c.full.timeSeconds || 0), 0) / (fullSuccessCount || 1);
  const totalDirectCost = data.comparisons.filter(c => c.direct?.success).reduce((s, c) => s + (c.direct!.costRaw || 0), 0);
  const totalSimpleCost = data.comparisons.filter(c => c.simple.success).reduce((s, c) => s + (c.simple.costRaw || 0), 0);
  const totalFullCost = data.comparisons.filter(c => c.full.success).reduce((s, c) => s + (c.full.costRaw || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pipeline Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.count} jewelry pieces tested — {hasDirect ? 'Direct vs Simple vs Full' : 'Simple vs Full'} pipeline, side by side
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Summary Stats */}
      <div className={`grid ${hasDirect ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
        {/* Direct stats */}
        {hasDirect && (
          <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="font-bold text-amber-500">Direct Pipeline</h2>
            </div>
            <p className="text-[10px] text-muted-foreground">Raw image → NB2 (no processing)</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <p className="text-lg font-bold">{directSuccessCount}/{data.count}</p>
                <p className="text-[9px] text-muted-foreground">Succeeded</p>
              </div>
              <div>
                <p className="text-lg font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{avgDirectTime.toFixed(0)}s</p>
                <p className="text-[9px] text-muted-foreground">Avg Time</p>
              </div>
              <div>
                <p className="text-lg font-bold flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{totalDirectCost.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" />
            <h2 className="font-bold text-emerald-500">Simple Pipeline</h2>
          </div>
          <p className="text-[10px] text-muted-foreground">BG Removal → Nano Banana Pro (2K)</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <p className="text-lg font-bold">{simpleSuccessCount}/{data.count}</p>
              <p className="text-[9px] text-muted-foreground">Succeeded</p>
            </div>
            <div>
              <p className="text-lg font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{avgSimpleTime.toFixed(0)}s</p>
              <p className="text-[9px] text-muted-foreground">Avg Time</p>
            </div>
            <div>
              <p className="text-lg font-bold flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{totalSimpleCost.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">Total Cost</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            <h2 className="font-bold text-purple-500">Full Pipeline</h2>
          </div>
          <p className="text-[10px] text-muted-foreground">BG Removal → Flux Canny Pro → Nano Banana 2</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <p className="text-lg font-bold">{fullSuccessCount}/{data.count}</p>
              <p className="text-[9px] text-muted-foreground">Succeeded</p>
            </div>
            <div>
              <p className="text-lg font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{avgFullTime.toFixed(0)}s</p>
              <p className="text-[9px] text-muted-foreground">Avg Time</p>
            </div>
            <div>
              <p className="text-lg font-bold flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{totalFullCost.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">Total Cost</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-blue-500/50 bg-blue-500/10" />
          <span>Product (customer&apos;s piece)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-pink-500/50 bg-pink-500/10" />
          <span>Inspiration (style reference)</span>
        </div>
        {hasDirect && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-amber-500/50 bg-amber-500/10" />
            <span>Direct (Raw → NB2)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-emerald-500/50 bg-emerald-500/10" />
          <span>Simple (BG → NB Pro 2K)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-purple-500/50 bg-purple-500/10" />
          <span>Full (BG → Canny → NB2)</span>
        </div>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="ml-auto text-[10px] text-gold hover:underline"
        >
          {expandAll ? 'Collapse All' : 'Expand All Lineage'}
        </button>
      </div>

      {/* Comparison Cards */}
      <div className="space-y-4">
        {data.comparisons.map((c, i) => (
          <ComparisonCard key={c.id} comparison={c} index={i} onImageClick={setLightboxUrl} />
        ))}
      </div>

      {/* Footer Summary */}
      <div className="rounded-xl border p-4 bg-muted/30 text-center space-y-1">
        <Trophy className="h-5 w-5 text-gold mx-auto" />
        <p className="text-sm font-semibold">Total: {data.count} comparisons</p>
        <p className="text-xs text-muted-foreground">
          Simple: ${totalSimpleCost.toFixed(2)} total, {avgSimpleTime.toFixed(0)}s avg
          {' · '}
          Full: ${totalFullCost.toFixed(2)} total, {avgFullTime.toFixed(0)}s avg
        </p>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
              onClick={() => setLightboxUrl(null)}>
              <X className="h-6 w-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={lightboxUrl} alt="Expanded"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
