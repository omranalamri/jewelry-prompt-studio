'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Search, CheckCircle, XCircle, FlaskConical, RefreshCw, Image as ImageIcon, Video, Volume2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DiscoveredModel {
  id: string;
  source: string;
  source_id: string;
  name: string;
  provider: string;
  model_type: string;
  description: string;
  runs: number;
  supports_image_input: boolean;
  supports_audio: boolean;
  jewelry_relevance: string;
  status: string;
  test_result_url: string | null;
  test_notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: FlaskConical },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  testing: { label: 'Testing', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FlaskConical },
};

export default function ModelsPage() {
  const [models, setModels] = useState<DiscoveredModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/model-discovery');
      const json = await res.json();
      if (json.success) setModels(json.data);
    } catch { /* */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const scan = useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/model-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Scanned ${json.data.scanned} models, updated ${json.data.updated}`);
        fetchModels();
      }
    } catch { toast.error('Scan failed'); }
    finally { setIsScanning(false); }
  }, [fetchModels]);

  const updateStatus = useCallback(async (modelId: string, action: string, notes?: string) => {
    try {
      await fetch('/api/model-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, modelId, notes }),
      });
      toast.success(`Model ${action}d`);
      fetchModels();
    } catch { toast.error('Update failed'); }
  }, [fetchModels]);

  const filtered = filter === 'all' ? models : models.filter(m => m.status === filter);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Model Discovery</h2>
            <p className="text-sm text-muted-foreground">Scan for new AI models, review, and approve for production.</p>
          </div>
        </div>
        <Button onClick={scan} disabled={isScanning} className="gold-gradient text-white border-0 hover:opacity-90">
          {isScanning ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Scanning...</> : <><Search className="h-4 w-4 mr-2" /> Scan Replicate</>}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'testing', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${filter === s ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
            {s === 'all' ? `All (${models.length})` : `${s} (${models.filter(m => m.status === s).length})`}
          </button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}

      {!isLoading && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Cpu className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No models found</p>
            <p className="text-sm text-muted-foreground">Click &quot;Scan Replicate&quot; to discover available AI models.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((model) => {
          const cfg = STATUS_CONFIG[model.status] || STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          return (
            <motion.div key={model.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={model.status === 'approved' ? 'border-green-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{model.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.color}`}>
                          <StatusIcon className="h-2.5 w-2.5 inline mr-0.5" />{cfg.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">
                          {model.model_type === 'video' ? <Video className="h-2.5 w-2.5 inline mr-0.5" /> : <ImageIcon className="h-2.5 w-2.5 inline mr-0.5" />}
                          {model.model_type}
                        </span>
                        {model.supports_image_input && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"><ImagePlus className="h-2.5 w-2.5 inline mr-0.5" />img input</span>}
                        {model.supports_audio && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200"><Volume2 className="h-2.5 w-2.5 inline mr-0.5" />audio</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{model.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-mono">{model.source_id}</span>
                        <span>{(model.runs / 1000000).toFixed(1)}M runs</span>
                      </div>
                      {model.jewelry_relevance && (
                        <p className="text-xs mt-1.5 text-gold-dark dark:text-gold-light">{model.jewelry_relevance}</p>
                      )}
                      {model.test_notes && (
                        <p className="text-xs mt-1 text-muted-foreground italic">Notes: {model.test_notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {model.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => updateStatus(model.id, 'approve')}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => updateStatus(model.id, 'test', 'Queued for testing')}>
                            <FlaskConical className="h-3 w-3 mr-1" /> Test
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => updateStatus(model.id, 'reject')}>
                            <XCircle className="h-3 w-3 mr-1" /> Skip
                          </Button>
                        </>
                      )}
                      {model.status === 'testing' && (
                        <Button size="sm" variant="outline" className="text-xs h-7 border-green-300 text-green-700"
                          onClick={() => updateStatus(model.id, 'approve', 'Tested and approved')}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      )}
                      {model.status === 'approved' && (
                        <span className="text-[10px] text-green-600">Active</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
