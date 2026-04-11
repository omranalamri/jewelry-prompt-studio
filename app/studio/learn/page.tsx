'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Sparkles, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [lastExtraction, setLastExtraction] = useState<{ patterns: number; fragments: number } | null>(null);

  useEffect(() => {
    fetch('/api/feedback').then(r => r.json()).then(json => {
      if (json.success) setStats(json.data);
    }).finally(() => setIsLoading(false));
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

      {/* Extract patterns button */}
      <Card className="border-gold/20 bg-gold/[0.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-gold" /> Pattern Extraction</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Claude analyzes all your rated generations to find what works and what doesn&apos;t.
                {rated < 5 ? ` Need ${5 - rated} more ratings to start.` : ' Ready to extract.'}
              </p>
              {lastExtraction && (
                <p className="text-sm text-gold mt-1">
                  Last run: {lastExtraction.patterns} patterns, {lastExtraction.fragments} prompt fragments found.
                </p>
              )}
            </div>
            <Button onClick={extractPatterns} disabled={isExtracting || rated < 5}
              className="gold-gradient text-white border-0 hover:opacity-90">
              {isExtracting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <><Brain className="h-4 w-4 mr-2" /> Extract Patterns</>}
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
