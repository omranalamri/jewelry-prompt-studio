'use client';

import { motion } from 'framer-motion';
import { Wand2, Eye, Compass, Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PromptCard } from '@/components/shared/PromptCard';
import { CopyButton } from '@/components/shared/CopyButton';
import { TipsCard } from '@/components/shared/TipsCard';
import { ChatTab } from '@/components/shared/ChatTab';
import { PlatformId } from '@/types/platforms';

function VisionResult({ data, referenceImageUrl, reset }: {
  data: Record<string, unknown>;
  referenceImageUrl: string | null;
  reset: () => void;
}) {
  const analysis = data.analysis as string;
  const interpretation = data.interpretation as string;
  const approach = data.approach as string;
  const prompts = data.prompts as Record<string, string | null>;
  const recommendation = data.recommendation as PlatformId;
  const reason = data.reason as string;
  const negative = data.negative as string;
  const tips = (data.tips as string[]) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
              <Eye className="h-4 w-4 text-white" />
            </div>
            Vision Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {analysis && (
            <div>
              <div className="flex items-center gap-2 mb-2"><Eye className="h-4 w-4 text-gold" /><h4 className="text-sm font-medium">Image Analysis</h4></div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{analysis}</p>
            </div>
          )}
          {interpretation && (<><Separator /><div>
            <div className="flex items-center gap-2 mb-2"><Wand2 className="h-4 w-4 text-gold" /><h4 className="text-sm font-medium">Vision Interpretation</h4></div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">{interpretation}</p>
          </div></>)}
          {approach && (<><Separator /><div>
            <div className="flex items-center gap-2 mb-2"><Compass className="h-4 w-4 text-gold" /><h4 className="text-sm font-medium">Execution Approach</h4></div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-6">{approach}</p>
          </div></>)}
        </CardContent>
      </Card>

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
            <PromptCard key={platform} platform={platform as PlatformId} prompt={prompt!}
              isRecommended={platform === recommendation}
              referenceImageUrl={referenceImageUrl || undefined} />
          ))}
      </div>

      {negative && (
        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive/60" /> Negative Prompt
              </CardTitle>
              <CopyButton text={negative} label="Copy --no" />
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-5 rounded-xl border">{negative}</pre>
          </CardContent>
        </Card>
      )}

      <TipsCard tips={tips} />

      <Button variant="outline" onClick={reset} className="w-full">
        <RotateCcw className="h-4 w-4 mr-2" /> New Vision
      </Button>
    </div>
  );
}

export function VisionTab() {
  return (
    <ChatTab
      apiEndpoint="/api/smart-vision"
      placeholder="Upload an image and describe your creative vision..."
      phaseLabels={{ analyze: 'Analyzing your image', vision: 'Understanding your vision', generate: 'Prompts ready' }}
      isResultReady={(d) => d.ready === true && !!d.prompts}
      header={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Vision Engineer</h2>
            <p className="text-sm text-muted-foreground">Upload an image, describe your transformation, get prompts to execute it.</p>
          </div>
        </div>
      }
      emptyState={
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">Upload a jewelry photo and tell me how you want to transform it:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { text: 'Make this look like a luxury editorial with dramatic lighting', icon: '🌑' },
              { text: 'Transform into a lifestyle shot with a model wearing it', icon: '👩' },
              { text: 'Create a romantic scene with soft pink tones and flowers', icon: '🌸' },
              { text: 'Turn this into a cinematic video ad for social media', icon: '🎬' },
            ].map((ex, i) => (
              <div key={i} className="p-3 rounded-xl border bg-card text-sm text-muted-foreground">
                <span className="mr-2">{ex.icon}</span>{ex.text}
              </div>
            ))}
          </div>
        </motion.div>
      }
      resultRenderer={(data, refUrl, reset) => <VisionResult data={data} referenceImageUrl={refUrl} reset={reset} />}
    />
  );
}
