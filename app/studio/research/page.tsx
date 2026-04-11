'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Telescope, ExternalLink, Lightbulb, Database, Wrench, BookOpen, Workflow, Eye, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COMMUNITY_RESOURCES, CommunityResource } from '@/lib/creative/community-intel';

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Lightbulb; color: string }> = {
  model: { label: 'AI Models', icon: Lightbulb, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300' },
  dataset: { label: 'Datasets', icon: Database, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300' },
  tool: { label: 'Tools', icon: Wrench, color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300' },
  research: { label: 'Research', icon: BookOpen, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300' },
  workflow: { label: 'Workflows', icon: Workflow, color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300' },
  competitor: { label: 'Competitors', icon: Eye, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300' },
};

const IMPACT_COLORS = {
  high: 'border-l-gold bg-gold/[0.02]',
  medium: 'border-l-blue-400',
  low: 'border-l-muted-foreground/30',
};

function ResourceCard({ resource }: { resource: CommunityResource }) {
  const cat = CATEGORY_CONFIG[resource.category] || CATEGORY_CONFIG.tool;
  const Icon = cat.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border-l-4 ${IMPACT_COLORS[resource.impact]} hover:shadow-md transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-medium text-sm">{resource.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}>
                  <Icon className="h-2.5 w-2.5 inline mr-0.5" />{cat.label}
                </span>
                {resource.impact === 'high' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full gold-gradient text-white">High Impact</span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{resource.source}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{resource.description}</p>
              <div className="mt-2 p-2 rounded-lg bg-gold/5 border border-gold/10">
                <p className="text-xs"><span className="font-medium text-gold-dark dark:text-gold-light">Why this matters:</span> {resource.impactReason}</p>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {resource.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
              </div>
            </div>
            <a href={resource.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ResearchPage() {
  const [filter, setFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');

  const filtered = COMMUNITY_RESOURCES.filter(r =>
    (filter === 'all' || r.category === filter) &&
    (impactFilter === 'all' || r.impact === impactFilter)
  );

  const highImpactCount = COMMUNITY_RESOURCES.filter(r => r.impact === 'high').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Telescope className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Research Hub</h2>
          <p className="text-sm text-muted-foreground">
            Community intelligence — models, datasets, tools, and competitors to grow the platform.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-gold/20 bg-gold/[0.02]">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-gold">{highImpactCount}</p>
            <p className="text-xs text-muted-foreground">High Impact</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{COMMUNITY_RESOURCES.length}</p>
            <p className="text-xs text-muted-foreground">Total Resources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{COMMUNITY_RESOURCES.filter(r => r.status === 'available').length}</p>
            <p className="text-xs text-muted-foreground">Ready Now</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...Object.keys(CATEGORY_CONFIG)].map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${filter === c ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
              {c === 'all' ? 'All' : CATEGORY_CONFIG[c]?.label || c}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all', 'high', 'medium', 'low'].map(i => (
            <button key={i} onClick={() => setImpactFilter(i)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${impactFilter === i ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
              {i === 'all' ? 'All Impact' : `${i} Impact`}
            </button>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="space-y-3">
        {filtered.map(r => <ResourceCard key={r.id} resource={r} />)}
      </div>

      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Telescope className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No resources match your filters.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
