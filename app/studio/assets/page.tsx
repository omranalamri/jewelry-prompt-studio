'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { FolderOpen, Search, Loader2, ExternalLink, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface Asset {
  id: string;
  category: string;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  created_at: string;
  similarity?: number;
}

const CATEGORIES = ['all', 'generated', 'model', 'video', 'mood', 'campaign'];

export default function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [isSemanticResult, setIsSemanticResult] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const url = category === 'all' ? '/api/repository' : `/api/repository?category=${category}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setItems(json.data);
      setIsSemanticResult(false);
    } catch { /* */ }
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function semanticSearch() {
    if (!query.trim()) { fetchAll(); return; }
    setSearching(true);
    try {
      const res = await fetch('/api/assets/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, category: category === 'all' ? undefined : category }),
      });
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
        setIsSemanticResult(true);
        if (json.data.length === 0) toast.info('No semantic matches. Try different keywords.');
        else toast.success(`Found ${json.data.length} matches`);
      } else toast.error(json.error);
    } catch { toast.error('Search failed'); }
    setSearching(false);
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={24} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
            <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
              Digital <span className="obs-gold-gradient-text">Asset Library</span>
            </h1>
          </div>
          <p style={{ color: 'var(--obs-text-secondary)' }}>
            Semantic search across your entire creative library. Powered by Gemini embeddings.
          </p>
        </motion.div>

        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--obs-gold)' }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && semanticSearch()}
                placeholder="Describe what you're looking for... 'elegant gold ring with dark background'"
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl"
                style={{
                  background: 'var(--obs-raised)',
                  color: 'var(--obs-text-primary)',
                  border: '1px solid var(--obs-border-default)',
                  fontFamily: 'var(--font-obsidian-body)',
                }}
              />
            </div>
            <Button
              onClick={semanticSearch}
              disabled={searching}
              className="obs-gold-gradient text-black border-0 px-5"
              style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
            {isSemanticResult && (
              <Button variant="outline" onClick={fetchAll} size="sm"
                      style={{ borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-secondary)' }}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="text-xs px-3 py-1.5 rounded-full border capitalize transition-all"
                style={{
                  background: category === c ? 'rgba(201,168,76,0.1)' : 'var(--obs-raised)',
                  borderColor: category === c ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                  color: category === c ? 'var(--obs-gold)' : 'var(--obs-text-secondary)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Results grid */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--obs-gold)' }} />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-20 rounded-2xl border"
               style={{ borderColor: 'var(--obs-border-default)', background: 'var(--obs-raised)' }}>
            <FolderOpen className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--obs-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>No assets found</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 obs-stagger">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                onClick={() => setSelected(item)}
                className="relative rounded-xl overflow-hidden border cursor-pointer group"
                style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
              >
                <div className="aspect-square relative overflow-hidden bg-black">
                  {item.image_url.includes('.mp4') ? (
                    <video src={item.image_url} muted loop playsInline className="w-full h-full object-cover"
                           onMouseEnter={e => e.currentTarget.play()}
                           onMouseLeave={e => e.currentTarget.pause()} />
                  ) : (
                    <img src={item.image_url} alt={item.title}
                         className="w-full h-full object-cover transition-transform group-hover:scale-105"
                         onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23111" width="200" height="200"/><text x="100" y="105" text-anchor="middle" fill="%23555" font-size="14">Expired</text></svg>'; }} />
                  )}
                  {/* Similarity badge */}
                  {item.similarity !== undefined && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full obs-mono text-[10px] border"
                         style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--obs-gold)', borderColor: 'var(--obs-gold)' }}>
                      {(item.similarity * 100).toFixed(0)}% match
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs truncate" style={{ color: 'var(--obs-text-primary)' }}>{item.title}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--obs-text-muted)' }}>
                    {item.category}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.9)' }}
              onClick={() => setSelected(null)}
            >
              <button className="absolute top-6 right-6 z-10 p-2 rounded-full border"
                      style={{ background: 'rgba(0,0,0,0.6)', borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-primary)' }}
                      onClick={() => setSelected(null)}>
                <X className="h-5 w-5" />
              </button>
              <motion.div
                initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-5xl w-full max-h-[90vh] rounded-2xl overflow-hidden flex flex-col md:flex-row"
                style={{ background: 'var(--obs-elevated)' }}
              >
                <div className="flex-1 bg-black flex items-center justify-center">
                  {selected.image_url.includes('.mp4') ? (
                    <video src={selected.image_url} controls autoPlay loop className="max-w-full max-h-[70vh]" />
                  ) : (
                    <img src={selected.image_url} alt={selected.title} className="max-w-full max-h-[70vh] object-contain" />
                  )}
                </div>
                <div className="md:w-80 p-5 space-y-3 overflow-y-auto">
                  <h3 className="obs-display text-xl" style={{ color: 'var(--obs-text-primary)' }}>{selected.title}</h3>
                  {selected.description && (
                    <p className="text-xs" style={{ color: 'var(--obs-text-secondary)' }}>{selected.description}</p>
                  )}
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--obs-text-muted)' }}>
                    {selected.category}
                  </div>
                  {selected.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.slice(0, 12).map((t, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--obs-raised)', color: 'var(--obs-text-secondary)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <a href={selected.image_url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs hover:underline"
                     style={{ color: 'var(--obs-gold)' }}>
                    <ExternalLink className="h-3 w-3" /> Open full size
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
