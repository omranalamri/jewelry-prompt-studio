'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Image as ImageIcon, Video, BarChart3, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CostData {
  totals: {
    totalGenerations: number;
    totalCost: number;
    imageCost: number;
    videoCost: number;
    imageCount: number;
    videoCount: number;
  };
  today: { cost: number; count: number };
  byModel: { model: string; count: string; total_cost: string; avg_duration: string }[];
  recent: { model: string; type: string; cost: string; duration_seconds: string; prompt_preview: string; created_at: string }[];
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/costs').then(r => r.json()).then(json => {
      if (json.success) setData(json.data);
    }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );

  if (!data) return <p className="text-muted-foreground text-center py-12">Could not load cost data.</p>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Cost Dashboard</h2>
          <p className="text-sm text-muted-foreground">Track your AI generation spend across all models.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-6 w-6 text-gold mx-auto mb-2" />
            <p className="text-2xl font-bold">${data.totals.totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Spend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-6 w-6 text-gold mx-auto mb-2" />
            <p className="text-2xl font-bold">{data.totals.totalGenerations}</p>
            <p className="text-xs text-muted-foreground">Total Generations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <ImageIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">${data.totals.imageCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{data.totals.imageCount} Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Video className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">${data.totals.videoCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{data.totals.videoCount} Videos</p>
          </CardContent>
        </Card>
      </div>

      {/* Today */}
      <Card className="border-gold/20 bg-gold/[0.02]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Today&apos;s Spend</p>
              <p className="text-3xl font-bold">${data.today.cost.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{data.today.count} generations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost by model */}
      {data.byModel.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Spend by Model</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.byModel.map((m) => (
                <div key={m.model} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.model}</p>
                    <p className="text-xs text-muted-foreground">{m.count} runs · avg {parseFloat(m.avg_duration).toFixed(0)}s</p>
                  </div>
                  <span className="text-sm font-mono font-medium">${parseFloat(m.total_cost).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {data.recent.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {r.type === 'video' ? <Video className="h-4 w-4 text-purple-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
                    <div>
                      <p className="text-sm">{r.model}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.prompt_preview}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">${parseFloat(r.cost).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
