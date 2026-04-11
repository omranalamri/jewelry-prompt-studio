'use client';

import { motion } from 'framer-motion';
import { Layers, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptCard } from '@/components/shared/PromptCard';
import { ChatTab } from '@/components/shared/ChatTab';
import { PlatformId } from '@/types/platforms';

function CollectionResult({ data, referenceImageUrl, reset }: {
  data: Record<string, unknown>;
  referenceImageUrl: string | null;
  reset: () => void;
}) {
  const collection = data.collection as {
    name: string; unifiedStyle: string; colorPalette: string[];
    lighting: string; background: string; persona: string;
    pieces: { description: string; role: string; imagePrompt: string; gridPosition: string }[];
  } | undefined;

  if (!collection) return null;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
        <h3 className="text-lg font-semibold mb-2">{collection.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{collection.unifiedStyle}</p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div><span className="font-medium">Lighting:</span> {collection.lighting}</div>
          <div><span className="font-medium">Background:</span> {collection.background}</div>
          <div><span className="font-medium">Model:</span> {collection.persona}</div>
          <div className="flex gap-1.5 items-center">
            <span className="font-medium">Palette:</span>
            {collection.colorPalette?.map((c, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-muted">{c}</span>)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {collection.pieces?.map((piece, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full gold-gradient text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-sm font-medium">{piece.description}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{piece.role}</span>
            </div>
            <PromptCard
              platform={'midjourney' as PlatformId}
              prompt={piece.imagePrompt}
              referenceImageUrl={referenceImageUrl || undefined}
            />
          </motion.div>
        ))}
      </div>

      <Button variant="outline" onClick={reset} className="w-full">
        <RotateCcw className="h-4 w-4 mr-2" /> New Collection
      </Button>
    </div>
  );
}

export function CollectionTab() {
  return (
    <ChatTab
      apiEndpoint="/api/collection"
      placeholder="Describe your jewelry collection or upload multiple pieces..."
      phaseLabels={{ discover: 'Learning about your collection', generate: 'Collection campaign ready' }}
      isResultReady={(d) => d.ready === true && !!d.collection}
      header={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Collection Campaign</h2>
            <p className="text-sm text-muted-foreground">Upload multiple pieces — get a cohesive campaign with unified style.</p>
          </div>
        </div>
      }
      emptyState={
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">Upload your collection pieces or describe them:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { text: 'I have a 5-piece bridal set that needs a cohesive Instagram grid', icon: '💒' },
              { text: 'Create a product page campaign for my gold ring collection', icon: '💍' },
              { text: 'I need matching social content for my new earring line', icon: '✨' },
              { text: 'Design a holiday gift guide layout for 8 pieces', icon: '🎁' },
            ].map((ex, i) => (
              <div key={i} className="p-3 rounded-xl border bg-card text-sm text-muted-foreground">
                <span className="mr-2">{ex.icon}</span>{ex.text}
              </div>
            ))}
          </div>
        </motion.div>
      }
      resultRenderer={(data, refUrl, reset) => <CollectionResult data={data} referenceImageUrl={refUrl} reset={reset} />}
    />
  );
}
