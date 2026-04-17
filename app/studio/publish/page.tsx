'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { Send, AtSign, Video, Search, Loader2, Plus, Calendar, CheckCircle2, X, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Asset {
  id: string;
  title: string;
  image_url: string;
  category: string;
  tags: string[];
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: AtSign, color: '#E4405F', connected: false, envKeys: ['META_APP_ID', 'INSTAGRAM_ACCESS_TOKEN'] },
  { id: 'meta-ads', name: 'Meta Ads', icon: Globe, color: '#1877F2', connected: false, envKeys: ['META_APP_ID', 'META_APP_SECRET'] },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: '#FE2C55', connected: false, envKeys: ['TIKTOK_APP_ID', 'TIKTOK_APP_SECRET'] },
  { id: 'google-ads', name: 'Google Ads', icon: Search, color: '#4285F4', connected: false, envKeys: ['GOOGLE_ADS_DEVELOPER_TOKEN'] },
];

export default function PublishPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [captionAr, setCaptionAr] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    fetch('/api/repository').then(r => r.json()).then(d => {
      if (d.success) setAssets(d.data.filter((a: Asset) => ['generated', 'campaign', 'video'].includes(a.category)));
      setLoading(false);
    });
  }, []);

  const toggleAsset = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const togglePlatform = (id: string) => {
    setTargetPlatforms(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  async function schedulePost() {
    if (selected.length === 0 || targetPlatforms.length === 0) {
      toast.error('Pick at least one asset and one platform');
      return;
    }
    toast.info('Publishing integrations pending OAuth setup. Draft saved for review.');
    setComposerOpen(false);
    setSelected([]);
    setCaption('');
    setCaptionAr('');
    setTargetPlatforms([]);
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={24} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Send className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
            <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
              <span className="obs-gold-gradient-text">Publish</span>
            </h1>
          </div>
          <p style={{ color: 'var(--obs-text-secondary)' }}>
            Schedule and manage posts across all connected platforms.
          </p>
        </motion.div>

        {/* Platform connections */}
        <div className="rounded-2xl border p-5 mb-6" style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}>
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--obs-text-muted)' }}>
            Platform Connections
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="rounded-xl border p-4 flex flex-col gap-2"
                     style={{ background: 'var(--obs-elevated)', borderColor: 'var(--obs-border-default)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color: p.color }} />
                      <span className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>{p.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border"
                          style={{
                            background: 'rgba(224,82,82,0.08)',
                            borderColor: 'rgba(224,82,82,0.3)',
                            color: 'var(--obs-error)',
                          }}>
                      Not connected
                    </span>
                  </div>
                  <p className="text-[10px] obs-mono" style={{ color: 'var(--obs-text-muted)' }}>
                    Needs: {p.envKeys.join(', ')}
                  </p>
                  <Button size="sm" variant="outline" disabled
                          style={{ borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-secondary)' }}>
                    Connect (pending OAuth)
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compose */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: 'var(--obs-text-secondary)' }}>
            Ready to publish — {assets.length} approved assets
          </p>
          <Button onClick={() => setComposerOpen(!composerOpen)}
                  className="obs-gold-gradient text-black border-0"
                  style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Post
          </Button>
        </div>

        {/* Asset grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--obs-gold)' }} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((a) => (
              <motion.div
                key={a.id}
                layout
                onClick={() => toggleAsset(a.id)}
                className="relative rounded-xl overflow-hidden border cursor-pointer"
                style={{
                  borderColor: selected.includes(a.id) ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                  background: 'var(--obs-raised)',
                }}
              >
                <div className="aspect-square overflow-hidden bg-black">
                  {a.image_url.includes('.mp4')
                    ? <video src={a.image_url} muted loop playsInline className="w-full h-full object-cover" onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                    : <img src={a.image_url} alt={a.title} className="w-full h-full object-cover"
                           onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="%23111" width="200" height="200"/></svg>'; }} />}
                </div>
                {selected.includes(a.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                       style={{ background: 'var(--obs-gold)', color: 'black' }}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-[10px] truncate" style={{ color: 'var(--obs-text-primary)' }}>{a.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Composer Drawer */}
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={() => setComposerOpen(false)}
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border p-5 space-y-4"
              style={{ background: 'var(--obs-elevated)', borderColor: 'var(--obs-border-default)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="obs-display text-xl" style={{ color: 'var(--obs-text-primary)' }}>Post Composer</h3>
                <button onClick={() => setComposerOpen(false)}>
                  <X className="h-5 w-5" style={{ color: 'var(--obs-text-muted)' }} />
                </button>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--obs-text-secondary)' }}>
                  Selected assets: {selected.length}
                </label>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--obs-text-secondary)' }}>English Caption</label>
                <textarea value={caption} onChange={e => setCaption(e.target.value)}
                          rows={3} maxLength={2200}
                          placeholder="Craft your story. Keep it elegant."
                          className="w-full px-3 py-2 text-sm rounded-lg"
                          style={{ background: 'var(--obs-raised)', color: 'var(--obs-text-primary)', border: '1px solid var(--obs-border-default)' }} />
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--obs-text-secondary)' }}>Arabic Caption</label>
                <textarea value={captionAr} onChange={e => setCaptionAr(e.target.value)}
                          rows={3} maxLength={2200} dir="rtl"
                          placeholder="اكتب قصتك بأناقة"
                          className="w-full px-3 py-2 text-sm rounded-lg obs-arabic"
                          style={{ background: 'var(--obs-raised)', color: 'var(--obs-text-primary)', border: '1px solid var(--obs-border-default)' }} />
              </div>

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--obs-text-secondary)' }}>Target Platforms</label>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    const active = targetPlatforms.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlatform(p.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all"
                              style={{
                                background: active ? `${p.color}20` : 'var(--obs-raised)',
                                borderColor: active ? p.color : 'var(--obs-border-default)',
                                color: active ? p.color : 'var(--obs-text-secondary)',
                              }}>
                        <Icon className="h-3 w-3" />
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={schedulePost}
                        className="flex-1 obs-gold-gradient text-black border-0"
                        style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}>
                  <Calendar className="h-4 w-4 mr-1.5" /> Schedule
                </Button>
                <Button variant="outline" onClick={() => setComposerOpen(false)}
                        style={{ borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-secondary)' }}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
