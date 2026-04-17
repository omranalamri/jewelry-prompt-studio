'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { StoryRings } from '@/components/ui/story-rings';
import { CampaignCard, type Campaign } from '@/components/ui/campaign-card';
import { Button } from '@/components/ui/button';
import { ALL_AGENTS } from '@/lib/agents/personas';
import { Camera, Image as ImageIcon, Video, CheckCircle2, Plus, Sparkles } from 'lucide-react';

interface RepoStats {
  total: number;
  images: number;
  videos: number;
  models: number;
  campaigns: number;
  approved: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<RepoStats>({ total: 0, images: 0, videos: 0, models: 0, campaigns: 0, approved: 0 });
  const [recent, setRecent] = useState<Campaign[]>([]);
  const [counting, setCounting] = useState({ total: 0, images: 0, videos: 0 });

  useEffect(() => {
    fetch('/api/repository').then(r => r.json()).then(d => {
      if (!d.success) return;
      const items = d.data || [];
      const next: RepoStats = {
        total: items.length,
        images: items.filter((i: { category: string }) => i.category === 'generated').length,
        videos: items.filter((i: { category: string }) => i.category === 'video').length,
        models: items.filter((i: { category: string }) => i.category === 'model').length,
        campaigns: items.filter((i: { category: string }) => i.category === 'campaign').length,
        approved: items.filter((i: { tags?: string[] }) => (i.tags || []).includes('approved')).length,
      };
      setStats(next);

      // Animated counter
      const duration = 800;
      const start = Date.now();
      const tick = () => {
        const progress = Math.min(1, (Date.now() - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCounting({
          total: Math.floor(next.total * eased),
          images: Math.floor(next.images * eased),
          videos: Math.floor(next.videos * eased),
        });
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      // Build recent campaigns
      const campaigns: Campaign[] = items
        .filter((i: { category: string }) => i.category === 'campaign')
        .slice(0, 6)
        .map((it: { id: string; title: string; description: string | null; image_url: string; created_at: string }) => ({
          id: it.id,
          name: it.title,
          description: it.description || undefined,
          status: 'draft' as const,
          qualityScore: 4.3,
          qualityBreakdown: { visual: 4.5, copy: 4.0, brandAlignment: 4.3, channelFitness: 4.2 },
          assignedAgents: ['creative-director', 'brand-compliance'] as const,
          updatedAt: it.created_at,
          thumbnailUrl: it.image_url,
        }));
      setRecent(campaigns);
    });
  }, []);

  const agentRings = ALL_AGENTS.map(agent => ({
    id: agent.id,
    label: agent.displayName,
    agent,
    isActive: false,
  }));

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={32} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="obs-display text-5xl mb-2" style={{ color: 'var(--obs-text-primary)' }}>
              Welcome back, <span className="obs-gold-gradient-text">Omran</span>
            </h1>
            <p style={{ color: 'var(--obs-text-secondary)' }}>
              Your AI creative team is ready. Let's make something extraordinary.
            </p>
          </div>
          <Link href="/studio/campaign/new">
            <Button className="obs-gold-gradient text-black border-0"
                    style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}>
              <Plus className="h-4 w-4 mr-1.5" /> New Campaign
            </Button>
          </Link>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-8 obs-stagger">
          <Metric icon={ImageIcon} label="Images" value={counting.images} tone="primary" />
          <Metric icon={Video} label="Videos" value={counting.videos} tone="primary" />
          <Metric icon={CheckCircle2} label="Assets" value={counting.total} tone="gold" />
        </div>

        {/* Agent rings */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--obs-text-muted)' }}>
            Your Agent Team
          </p>
          <StoryRings rings={agentRings} />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <QuickAction href="/studio/campaign/new" icon={Sparkles} label="Campaign Factory" description="Start 7-stage wizard" />
          <QuickAction href="/studio/agents" icon={ImageIcon} label="Agent Team" description="10 specialist AI agents" />
          <QuickAction href="/studio/assets" icon={Camera} label="DAM" description="Semantic asset search" />
          <QuickAction href="/studio/governance" icon={CheckCircle2} label="Governance" description="Approval workflow" />
        </div>

        {/* Recent campaigns */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--obs-text-muted)' }}>
                Recent Campaigns
              </p>
              <Link href="/studio/campaign" className="text-xs hover:underline" style={{ color: 'var(--obs-gold)' }}>
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recent.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof ImageIcon; label: string; value: number; tone: 'primary' | 'gold' }) {
  return (
    <div className="rounded-2xl border p-5" style={{
      background: 'var(--obs-raised)',
      borderColor: tone === 'gold' ? 'var(--obs-border-gold)' : 'var(--obs-border-default)',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color: tone === 'gold' ? 'var(--obs-gold)' : 'var(--obs-text-muted)' }} />
        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--obs-text-muted)' }}>{label}</p>
      </div>
      <p className="obs-display text-4xl" style={{ color: tone === 'gold' ? 'var(--obs-gold)' : 'var(--obs-text-primary)' }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, description }: { href: string; icon: typeof ImageIcon; label: string; description: string }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-xl border p-4 cursor-pointer h-full"
        style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
      >
        <Icon className="h-5 w-5 mb-2" style={{ color: 'var(--obs-gold)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--obs-text-primary)' }}>{label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--obs-text-muted)' }}>{description}</p>
      </motion.div>
    </Link>
  );
}
