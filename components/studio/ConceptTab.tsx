'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptCard } from '@/components/shared/PromptCard';
import { ChatTab } from '@/components/shared/ChatTab';
import { PlatformId } from '@/types/platforms';
import { RotateCcw } from 'lucide-react';

const EXAMPLES = [
  { text: 'I want a luxury editorial shot of a diamond engagement ring', icon: '💍' },
  { text: 'Create a romantic bridal campaign for pearl earrings', icon: '✨' },
  { text: 'Bold modern product shots for a gold chain collection', icon: '🔗' },
  { text: 'Minimalist video ad for a silver pendant on TikTok', icon: '📱' },
];

function ConceptResult({ data, referenceImageUrl, reset }: {
  data: Record<string, unknown>;
  referenceImageUrl: string | null;
  reset: () => void;
}) {
  const concept = data.concept as string;
  const prompts = data.prompts as Record<string, string | null>;
  const recommendation = data.recommendation as PlatformId;
  const reason = data.reason as string;

  return (
    <div className="space-y-6">
      {concept && (
        <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-semibold">Refined Concept</span>
          </div>
          <p className="text-sm text-muted-foreground">{concept}</p>
        </div>
      )}

      {reason && (
        <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
          <h3 className="text-base font-semibold mb-1">Platform Recommendation</h3>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(prompts)
          .filter(([, v]) => v)
          .map(([platform, prompt]) => (
            <PromptCard
              key={platform}
              platform={platform as PlatformId}
              prompt={prompt!}
              isRecommended={platform === recommendation}
              referenceImageUrl={referenceImageUrl || undefined}
            />
          ))}
      </div>

      <Button variant="outline" onClick={reset} className="w-full">
        <RotateCcw className="h-4 w-4 mr-2" /> New Concept
      </Button>
    </div>
  );
}

export function ConceptTab() {
  return (
    <ChatTab
      apiEndpoint="/api/smart-concept"
      placeholder="Describe your jewelry marketing concept..."
      phaseLabels={{ understand: 'Understanding your vision', refine: 'Refining the concept', generate: 'Prompts ready' }}
      isResultReady={(d) => d.ready === true && !!d.prompts}
      header={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Concept Studio</h2>
            <p className="text-sm text-muted-foreground">Describe your idea. I&apos;ll refine it into production-ready prompts.</p>
          </div>
        </div>
      }
      emptyState={
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">Start with an idea or try one of these:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="p-3 rounded-xl border bg-card text-sm text-muted-foreground">
                <span className="mr-2">{ex.icon}</span>{ex.text}
              </div>
            ))}
          </div>
        </motion.div>
      }
      resultRenderer={(data, refUrl, reset) => <ConceptResult data={data} referenceImageUrl={refUrl} reset={reset} />}
    />
  );
}
