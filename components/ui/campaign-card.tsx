'use client';

import { motion } from 'framer-motion';
import { AgentAvatar } from '../agents/agent-avatar';
import { QualityScore } from './quality-score';
import { AGENT_PERSONAS, AgentName } from '@/lib/agents/personas';
import { Video, Clock, ArrowRight } from 'lucide-react';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'live' | 'review' | 'draft' | 'generating';
  progress?: number; // 0-100
  assignedAgents?: AgentName[];
  qualityScore?: number;
  qualityBreakdown?: {
    visual?: number;
    copy?: number;
    brandAlignment?: number;
    channelFitness?: number;
    cultural?: number;
  };
  videoEngine?: 'veo-3.1-fast' | 'veo-3.1' | 'veo-3.1-lite' | 'veo-2';
  updatedAt?: string;
  thumbnailUrl?: string;
}

const STATUS_CONFIG = {
  live: { color: 'var(--obs-success)', bg: 'var(--obs-success-bg)', label: 'Live' },
  review: { color: 'var(--obs-gold)', bg: 'rgba(201,168,76,0.1)', label: 'Review' },
  draft: { color: 'var(--obs-text-muted)', bg: 'var(--obs-raised)', label: 'Draft' },
  generating: { color: 'var(--obs-gold)', bg: 'rgba(201,168,76,0.15)', label: 'Generating' },
};

interface CampaignCardProps {
  campaign: Campaign;
  onOpen?: () => void;
}

export function CampaignCard({ campaign, onOpen }: CampaignCardProps) {
  const status = STATUS_CONFIG[campaign.status];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      className="relative rounded-2xl border overflow-hidden cursor-pointer group"
      style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
    >
      {/* Visual — ambient glow + thumbnail */}
      <div className="relative h-[140px] overflow-hidden" style={{ background: 'var(--obs-base)' }}>
        {/* Layered ambient glows */}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-4 left-4 w-32 h-32 rounded-full blur-3xl obs-animate-drift" style={{ background: 'rgba(201,168,76,0.15)' }} />
          <div className="absolute bottom-2 right-4 w-24 h-24 rounded-full blur-3xl obs-animate-drift" style={{ background: 'rgba(167,139,250,0.12)', animationDelay: '2s' }} />
        </div>

        {campaign.thumbnailUrl && (
          <img
            src={campaign.thumbnailUrl}
            alt={campaign.name}
            className="relative w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {campaign.videoEngine && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] obs-mono border flex items-center gap-1"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--obs-text-secondary)', borderColor: 'var(--obs-border-default)' }}
            >
              <Video className="h-2.5 w-2.5" />
              {campaign.videoEngine}
            </span>
          )}
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border flex items-center gap-1"
            style={{
              background: status.bg,
              color: status.color,
              borderColor: `${status.color}40`,
            }}
          >
            {campaign.status === 'generating' && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: status.color }} />
            )}
            {status.label}
          </span>
        </div>

        {/* Progress bar */}
        {campaign.progress !== undefined && campaign.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--obs-border-subtle)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${campaign.progress}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full obs-gold-gradient"
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3
            className="text-base font-medium truncate obs-display"
            style={{ color: 'var(--obs-text-primary)' }}
          >
            {campaign.name}
          </h3>
          {campaign.description && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--obs-text-secondary)' }}>
              {campaign.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Agent pips */}
          {campaign.assignedAgents && campaign.assignedAgents.length > 0 && (
            <div className="flex -space-x-1.5">
              {campaign.assignedAgents.slice(0, 4).map((name) => {
                const agent = AGENT_PERSONAS[name];
                if (!agent) return null;
                return <AgentAvatar key={name} agent={agent} size="sm" />;
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            {campaign.updatedAt && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--obs-text-muted)' }}>
                <Clock className="h-3 w-3" />
                {new Date(campaign.updatedAt).toLocaleDateString()}
              </span>
            )}
            {campaign.qualityScore !== undefined && (
              <QualityScore score={campaign.qualityScore} breakdown={campaign.qualityBreakdown} compact />
            )}
            <ArrowRight
              className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--obs-gold)' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
