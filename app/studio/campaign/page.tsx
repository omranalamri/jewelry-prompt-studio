'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { CampaignCard, type Campaign } from '@/components/ui/campaign-card';
import { StoryRings } from '@/components/ui/story-rings';
import { Button } from '@/components/ui/button';
import { ALL_AGENTS } from '@/lib/agents/personas';
import { Plus, Loader2, Camera } from 'lucide-react';

interface RepoItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  created_at: string;
  model_used?: string;
}

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/repository?category=campaign').then(r => r.json()).then(d => {
      if (d.success) {
        const items: Campaign[] = (d.data as RepoItem[]).map((it) => ({
          id: it.id,
          name: it.title,
          description: it.description || undefined,
          status: (it.tags || []).includes('approved') ? 'live' : 'draft',
          qualityScore: 4.2,
          qualityBreakdown: { visual: 4.5, copy: 4.0, brandAlignment: 4.2, channelFitness: 4.0 },
          assignedAgents: ['creative-director', 'brand-compliance', 'marcom-strategist'],
          videoEngine: 'veo-3.1',
          updatedAt: it.created_at,
          thumbnailUrl: it.image_url,
        }));
        setCampaigns(items);
      }
      setLoading(false);
    });
  }, []);

  // Build story rings from agents
  const agentRings = ALL_AGENTS.slice(0, 8).map(agent => ({
    id: agent.id,
    label: agent.displayName,
    agent,
    isActive: false,
    isNew: false,
  }));

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={28} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Camera className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
              <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
                <span className="obs-gold-gradient-text">Campaigns</span>
              </h1>
            </div>
            <p style={{ color: 'var(--obs-text-secondary)' }}>
              {campaigns.length} campaigns in your workspace
            </p>
          </div>
          <Link href="/studio/campaign/new">
            <Button className="obs-gold-gradient text-black border-0"
                    style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}>
              <Plus className="h-4 w-4 mr-1.5" /> New Campaign
            </Button>
          </Link>
        </motion.div>

        {/* Agent Story Rings */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--obs-text-muted)' }}>
            Your Team
          </p>
          <StoryRings rings={agentRings} />
        </div>

        {/* Campaign list */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--obs-gold)' }} />
          </div>
        )}

        {!loading && campaigns.length === 0 && (
          <div className="text-center py-20 rounded-2xl border"
               style={{ borderColor: 'var(--obs-border-default)', background: 'var(--obs-raised)' }}>
            <Camera className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--obs-text-muted)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--obs-text-primary)' }}>No campaigns yet</p>
            <p className="text-xs mb-4" style={{ color: 'var(--obs-text-muted)' }}>
              Start your first AI-powered jewelry campaign
            </p>
            <Link href="/studio/campaign/new">
              <Button className="obs-gold-gradient text-black border-0">
                <Plus className="h-4 w-4 mr-1.5" /> Create Campaign
              </Button>
            </Link>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 obs-stagger">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} onOpen={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
