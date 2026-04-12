'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Sparkles, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SummaryStats({ data }: { data: unknown }) {
  const s = (data || {}) as Record<string, number>;
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="text-center p-2 rounded-lg bg-muted/50">
        <p className="text-lg font-bold">{s.totalFragments || 0}</p>
        <p className="text-[9px] text-muted-foreground">Learned Rules</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-muted/50">
        <p className="text-lg font-bold">{s.totalPatterns || 0}</p>
        <p className="text-[9px] text-muted-foreground">Patterns Found</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-muted/50">
        <p className="text-lg font-bold">{s.appliedPatterns || 0}</p>
        <p className="text-[9px] text-muted-foreground">Applied</p>
      </div>
      <div className="text-center p-2 rounded-lg bg-muted/50">
        <p className="text-lg font-bold">{s.avgLift ? (s.avgLift * 100).toFixed(0) + '%' : '—'}</p>
        <p className="text-[9px] text-muted-foreground">Avg Lift</p>
      </div>
    </div>
  );
}

function BeforeAfterCard({ data }: { data: unknown }) {
  if (!data) return null;
  const ba = data as { before: { avg: number; count: number }; after: { avg: number; count: number } };
  const improvement = (ba.after?.avg || 0) - (ba.before?.avg || 0);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-3 rounded-lg bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground mb-1">Before Learning</p>
        <p className="text-xl font-bold">{ba.before?.avg ? ba.before.avg.toFixed(1) : '—'}</p>
        <p className="text-[10px] text-muted-foreground">{ba.before?.count || 0} rated</p>
      </div>
      <div className="p-3 rounded-lg bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground mb-1">After Learning</p>
        <p className={`text-xl font-bold ${improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-destructive' : ''}`}>
          {ba.after?.avg ? ba.after.avg.toFixed(1) : '—'}
        </p>
        <p className="text-[10px] text-muted-foreground">{ba.after?.count || 0} rated</p>
      </div>
    </div>
  );
}

interface FeedbackStats {
  stats: { total_generations: string; rated: string; avg_rating: string; favorites: string; regenerated: string };
  byJewelry: { jewelry_type: string; count: string; avg_rating: string }[];
  byModel: { generation_model: string; count: string; avg_rating: string; avg_cost: string }[];
  recentFeedback: { generation_model: string; jewelry_type: string; user_rating: number; feedback_tags: string[]; user_feedback: string; created_at: string }[];
}

export default function LearnPage() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<{ patterns: number; fragments: number } | null>(null);
  const [selfReview, setSelfReview] = useState<{ avgRating: number; reviewed: number; overallAssessment: string; reviews: { rating: number; comment: string }[]; promptImprovements: { current: string; suggested: string }[] } | null>(null);
  const [impact, setImpact] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/feedback').then(r => r.json()).then(json => {
      if (json.success) setStats(json.data);
    }).finally(() => setIsLoading(false));

    fetch('/api/learn/impact').then(r => r.json()).then(json => {
      if (json.success) setImpact(json.data);
    });
  }, []);

  const extractPatterns = useCallback(async () => {
    setIsExtracting(true);
    try {
      const res = await fetch('/api/learn', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setLastExtraction({ patterns: json.data.patternsFound, fragments: json.data.fragmentsFound });
        toast.success(json.data.message);
      } else {
        toast.error(json.error || 'Extraction failed');
      }
    } catch { toast.error('Failed to extract patterns.'); }
    finally { setIsExtracting(false); }
  }, []);

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-10 w-64 bg-muted rounded" /></div>;

  const s = stats?.stats;
  const totalGens = parseInt(s?.total_generations || '0');
  const rated = parseInt(s?.rated || '0');
  const avgRating = parseFloat(s?.avg_rating || '0');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Learning Dashboard</h2>
          <p className="text-sm text-muted-foreground">See how the AI is improving from your feedback.</p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{totalGens}</p>
          <p className="text-xs text-muted-foreground">Total Generations</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{rated}</p>
          <p className="text-xs text-muted-foreground">Rated</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="h-5 w-5 text-gold" />
            <p className="text-2xl font-bold">{avgRating ? avgRating.toFixed(1) : '—'}</p>
          </div>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-2xl font-bold">{parseInt(s?.favorites || '0')}</p>
          <p className="text-xs text-muted-foreground">Favorites</p>
        </CardContent></Card>
      </div>

      {/* Self-Review — AI analyzes its own work */}
      <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2"><Star className="h-4 w-4 text-blue-500" /> Self-Review</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI critically reviews its own generated images, rates them honestly, and identifies what to improve.
              </p>
              {selfReview && (
                <p className="text-sm text-blue-600 mt-1">
                  Reviewed {selfReview.reviewed} images. Self-rating: {selfReview.avgRating.toFixed(1)}/5
                </p>
              )}
            </div>
            <Button onClick={async () => {
              setIsReviewing(true);
              try {
                const res = await fetch('/api/self-review', { method: 'POST' });
                const json = await res.json();
                if (json.success && json.data.reviewed > 0) {
                  setSelfReview(json.data);
                  toast.success(json.data.message);
                  // Refresh stats
                  fetch('/api/feedback').then(r => r.json()).then(j => { if (j.success) setStats(j.data); });
                  fetch('/api/learn/impact').then(r => r.json()).then(j => { if (j.success) setImpact(j.data); });
                } else {
                  toast.info(json.data?.message || 'Nothing to review');
                }
              } catch { toast.error('Review failed'); }
              finally { setIsReviewing(false); }
            }} disabled={isReviewing}
              variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
              {isReviewing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Reviewing...</> : <><Star className="h-4 w-4 mr-2" /> Self-Review</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Self-review results */}
      {selfReview && selfReview.reviews && (
        <Card>
          <CardHeader><CardTitle className="text-base">Self-Review Results ({selfReview.avgRating.toFixed(1)}/5 avg)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground italic">{selfReview.overallAssessment}</p>
            {selfReview.reviews.slice(0, 8).map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className="flex items-center gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map(s => <span key={s} className={`text-xs ${s <= r.rating ? 'text-gold' : 'text-muted-foreground/20'}`}>★</span>)}
                </div>
                <p className="text-xs text-muted-foreground">{r.comment}</p>
              </div>
            ))}
            {selfReview.promptImprovements && selfReview.promptImprovements.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-gold/5 border border-gold/20">
                <p className="text-xs font-medium mb-2">Prompt Improvements Identified:</p>
                {selfReview.promptImprovements.map((imp, i) => (
                  <div key={i} className="text-xs mb-2">
                    <p className="text-muted-foreground"><span className="text-destructive">Current:</span> {imp.current}</p>
                    <p><span className="text-green-600">Suggested:</span> {imp.suggested}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Extract patterns button */}
      <Card className="border-gold/20 bg-gold/[0.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-gold" /> Extract Patterns &amp; Commit</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzes all ratings (yours + AI self-review), extracts patterns, and <span className="font-medium text-gold-dark dark:text-gold-light">commits improvements to the prompt system</span>.
                {rated < 5 ? ` Need ${5 - rated} more ratings.` : ' Ready to extract and commit.'}
              </p>
              {lastExtraction && (
                <p className="text-sm text-gold mt-1">
                  Last run: {lastExtraction.patterns} patterns committed, {lastExtraction.fragments} fragments active.
                </p>
              )}
            </div>
            <Button onClick={extractPatterns} disabled={isExtracting || rated < 5}
              className="gold-gradient text-white border-0 hover:opacity-90">
              {isExtracting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Committing...</> : <><Brain className="h-4 w-4 mr-2" /> Extract &amp; Commit</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance by jewelry type */}
      {stats?.byJewelry && stats.byJewelry.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gold" /> By Jewelry Type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byJewelry.map(j => (
                <div key={j.jewelry_type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{j.jewelry_type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{j.count} rated</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-gold" />
                      <span className="text-sm font-medium">{parseFloat(j.avg_rating).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by model */}
      {stats?.byModel && stats.byModel.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" /> By Model</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byModel.map(m => (
                <div key={m.generation_model} className="flex items-center justify-between">
                  <span className="text-sm">{m.generation_model}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{m.count} rated · ${parseFloat(m.avg_cost || '0').toFixed(2)} avg</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-gold" />
                      <span className="text-sm font-medium">{parseFloat(m.avg_rating).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent feedback */}
      {stats?.recentFeedback && stats.recentFeedback.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-gold" /> Recent Feedback</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentFeedback.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm">{f.generation_model} · <span className="capitalize">{f.jewelry_type || '?'}</span></p>
                    {f.user_feedback && <p className="text-xs text-muted-foreground">{f.user_feedback}</p>}
                    {f.feedback_tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">{f.feedback_tags.map((t, j) => <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-muted">{t}</span>)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => <span key={s} className={`text-sm ${s <= f.user_rating ? 'text-gold' : 'text-muted-foreground/20'}`}>★</span>)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Impact Section */}
      {impact && (
        <>
          <Card className="border-gold/20 bg-gold/[0.02]">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gold" /> Prompt Agent Impact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Before vs After patterns */}
              <BeforeAfterCard data={(impact as Record<string, unknown>).beforeAfter} />

              {/* Summary stats */}
              <SummaryStats data={(impact as Record<string, unknown>).summary} />
            </CardContent>
          </Card>

          {/* Learned fragments */}
          {((impact as Record<string, unknown>).fragments as unknown[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" /> Learned Prompt Rules</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {((impact as Record<string, unknown>).fragments as { fragment_text: string; category: string; lift: string; times_used: number }[]).slice(0, 10).map((f, i) => (
                    <div key={i} className="flex items-start justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-xs">{f.fragment_text}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground mt-1 inline-block">{f.category}</span>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-xs font-medium ${parseFloat(f.lift) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {parseFloat(f.lift) > 0 ? '+' : ''}{(parseFloat(f.lift) * 100).toFixed(0)}% lift
                        </p>
                        <p className="text-[9px] text-muted-foreground">{f.times_used}x used</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Known issues */}
          {((impact as Record<string, unknown>).patterns as unknown[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Known Issues & Fixes</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {((impact as Record<string, unknown>).patterns as { pattern_type: string; description: string; evidence_count: number; suggested_prompt_change: string; is_applied: boolean }[]).slice(0, 10).map((p, i) => (
                    <div key={i} className="py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${p.is_applied ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.is_applied ? 'Applied' : p.pattern_type}
                        </span>
                        <p className="text-xs">{p.description}</p>
                        <span className="text-[9px] text-muted-foreground shrink-0">{p.evidence_count}x reported</span>
                      </div>
                      {p.suggested_prompt_change && (
                        <p className="text-[10px] text-muted-foreground mt-1 pl-2 border-l-2 border-gold/30">Fix: {p.suggested_prompt_change}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top issues by tag */}
          {((impact as Record<string, unknown>).issuesByTag as unknown[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top Reported Issues</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {((impact as Record<string, unknown>).issuesByTag as { tag: string; count: string }[]).map((t, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full border bg-card">
                      {t.tag} <span className="text-muted-foreground ml-1">({t.count})</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {totalGens === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground">Generate some images and rate them to start the learning loop.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
