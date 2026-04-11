'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, RefreshCw, Heart, AlertTriangle, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Decision {
  id: string;
  opportunity: string;
  category: string;
  projected_impact: string;
  effort: string;
  risk: string | null;
  decision: string;
  rationale: string;
  outcome: string | null;
  created_at: string;
}

const DECISION_ICONS: Record<string, typeof CheckCircle> = {
  approved: CheckCircle,
  rejected: XCircle,
  deferred: Clock,
  investigating: Lightbulb,
};

const DECISION_COLORS: Record<string, string> = {
  approved: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  rejected: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  deferred: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  investigating: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
};

export default function StrategyPage() {
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/strategic-review').then(r => r.json()).then(json => {
      if (json.success) setDecisions(json.data);
    }).finally(() => setIsLoading(false));
  }, []);

  const runReview = useCallback(async () => {
    setIsReviewing(true);
    try {
      const res = await fetch('/api/strategic-review', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setReview(json.data.review);
        toast.success('Strategic review complete');
      } else {
        toast.error(json.error || 'Review failed');
      }
    } catch { toast.error('Review failed'); }
    finally { setIsReviewing(false); }
  }, []);

  const recordDecision = useCallback(async (opportunity: string, decision: string, rationale: string) => {
    try {
      await fetch('/api/strategic-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity, category: 'strategic', projectedImpact: 'TBD', effort: 'TBD', decision, rationale }),
      });
      toast.success(`Decision recorded: ${decision}`);
      // Refresh decisions
      const res = await fetch('/api/strategic-review');
      const json = await res.json();
      if (json.success) setDecisions(json.data);
    } catch { toast.error('Failed'); }
  }, []);

  interface ReviewData {
    healthScore: number; healthSummary: string; biggestGap: string;
    recommendations: { priority: number; action: string; rationale: string; projectedImpact: string; effort: string; risk: string; metrics: string }[];
    modelAssessment: { bestPerformer: string; worstPerformer: string; recommendation: string };
    costAssessment: { totalSpend: string; costPerGoodResult: string; recommendation: string };
    overallDirection: string; warningsAndRisks: string[];
    pastDecisionReview: string;
  }
  const r = review as ReviewData | null;
  const recs = r?.recommendations || [];
  const model = r?.modelAssessment;
  const cost = r?.costAssessment;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Strategic Partner</h2>
            <p className="text-sm text-muted-foreground">AI-powered strategic review of the entire platform.</p>
          </div>
        </div>
        <Button onClick={runReview} disabled={isReviewing} className="gold-gradient text-white border-0 hover:opacity-90">
          {isReviewing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Reviewing...</> : <><Compass className="h-4 w-4 mr-2" /> Run Strategic Review</>}
        </Button>
      </div>

      {/* Review Results */}
      {r && (
        <div className="space-y-4">
          {/* Health Score */}
          <Card className={`border-l-4 ${r.healthScore >= 7 ? 'border-l-green-500' : r.healthScore >= 4 ? 'border-l-amber-500' : 'border-l-red-500'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Heart className={`h-6 w-6 ${r.healthScore >= 7 ? 'text-green-500' : 'text-amber-500'}`} />
                  <div>
                    <p className="text-sm font-medium">Platform Health</p>
                    <p className="text-3xl font-bold">{r.healthScore as number}/10</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{r.healthSummary}</p>
            </CardContent>
          </Card>

          {/* Biggest Gap */}
          <Card className="border-gold/30 bg-gold/[0.02]">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-gold" />
                <p className="font-semibold">Biggest Gap</p>
              </div>
              <p className="text-sm">{r.biggestGap}</p>
            </CardContent>
          </Card>

          {/* Top 3 Recommendations */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gold" /> Top Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {recs.map((rec, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/50 border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full gold-gradient text-white text-xs font-bold flex items-center justify-center">{rec.priority}</span>
                      <p className="text-sm font-semibold">{rec.action}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${rec.effort === 'easy' ? 'bg-green-100 text-green-700' : rec.effort === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{rec.effort}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="font-medium">Impact:</span> {rec.projectedImpact}</div>
                    <div><span className="font-medium">Risk:</span> {rec.risk}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Metric: {rec.metrics}</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => recordDecision(rec.action, 'approved', rec.rationale)}
                      className="text-[10px] px-3 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50">Approve</button>
                    <button onClick={() => recordDecision(rec.action, 'deferred', 'Deferred for now')}
                      className="text-[10px] px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50">Defer</button>
                    <button onClick={() => {
                      const reason = prompt('Why reject?');
                      if (reason) recordDecision(rec.action, 'rejected', reason);
                    }}
                      className="text-[10px] px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50">Reject</button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Model + Cost Assessment */}
          <div className="grid sm:grid-cols-2 gap-4">
            {model && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Model Assessment</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p><span className="text-green-600 font-medium">Best:</span> {model.bestPerformer}</p>
                  <p><span className="text-red-600 font-medium">Worst:</span> {model.worstPerformer}</p>
                  <p><span className="font-medium">Action:</span> {model.recommendation}</p>
                </CardContent>
              </Card>
            )}
            {cost && (
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Cost Assessment</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p><span className="font-medium">Total:</span> {cost.totalSpend}</p>
                  <p><span className="font-medium">Per good result:</span> {cost.costPerGoodResult}</p>
                  <p>{cost.recommendation}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Direction + Warnings */}
          {r.overallDirection && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1">Overall Direction</p>
                <p className="text-sm text-muted-foreground">{r.overallDirection}</p>
              </CardContent>
            </Card>
          )}

          {(r.warningsAndRisks || [])?.length > 0 && (
            <Card className="border-destructive/20">
              <CardHeader><CardTitle className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Warnings</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {(r.warningsAndRisks || []).map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-destructive">!</span> {w}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Past Decisions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Decision History</CardTitle></CardHeader>
        <CardContent>
          {decisions.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-6">No decisions recorded yet. Run a strategic review to get started.</p>
          )}
          <div className="space-y-3">
            {decisions.map((d) => {
              const Icon = DECISION_ICONS[d.decision] || Clock;
              return (
                <div key={d.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${DECISION_COLORS[d.decision] || ''} shrink-0 mt-0.5`}>
                    <Icon className="h-2.5 w-2.5 inline mr-0.5" />{d.decision}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.opportunity}</p>
                    <p className="text-xs text-muted-foreground">{d.rationale}</p>
                    {d.outcome && <p className="text-xs text-green-600 mt-0.5">Outcome: {d.outcome}</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
