'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, RotateCcw, Save, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAnalyze } from '@/hooks/useAnalyze';
import { UploadZone } from '@/components/shared/UploadZone';
import { OutputTypeSelector } from '@/components/shared/OutputTypeSelector';
import { PromptCard } from '@/components/shared/PromptCard';
import { AnalysisCard } from '@/components/shared/AnalysisCard';
import { TipsCard } from '@/components/shared/TipsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlatformId } from '@/types/platforms';

export function AnalyzeTab() {
  const {
    referencePreview,
    assetPreviews,
    context,
    outputType,
    isLoading,
    result,
    error,
    setReference,
    removeReference,
    setAssets,
    setContext,
    setOutputType,
    analyze,
    reset,
  } = useAnalyze();

  const handleSave = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'analyze',
          title: context?.slice(0, 60) || 'Analyze & Generate',
          inputContext: context,
          outputType,
          result,
        }),
      });
      const json = await res.json();
      if (json.success) toast.success('Saved to history');
      else toast.error('Failed to save');
    } catch {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Analyze & Generate</h2>
            <p className="text-sm text-muted-foreground">
              Upload a reference and your jewelry assets to get platform-optimized prompts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <UploadZone
          label="Reference Image (required)"
          onFilesChange={(files) => files[0] && setReference(files[0])}
          previews={referencePreview ? [referencePreview] : []}
          disabled={isLoading}
          onRemove={removeReference}
        />
        <UploadZone
          label="Jewelry Assets (up to 3)"
          multiple
          maxFiles={3}
          onFilesChange={setAssets}
          previews={assetPreviews}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Creative Context (optional)</label>
        <Textarea
          placeholder="Describe the mood, audience, brand direction, or any specific requirements..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          maxLength={500}
          disabled={isLoading}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{context.length}/500</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Output Type</label>
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <Button
          onClick={analyze}
          disabled={isLoading || !referencePreview}
          size="lg"
          className="flex-1 gold-gradient text-white border-0 hover:opacity-90 h-12 shadow-md"
        >
          {isLoading ? 'Analyzing...' : 'Analyze & Generate'}
          {!isLoading && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
        {result && (
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={handleSave} className="h-12">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="lg" onClick={reset} className="h-12">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {isLoading && <LoadingSpinner message="Analyzing your images and generating prompts..." />}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <AnalysisCard analysis={result.analysis} />

            <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
              <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
                Platform Recommendation
              </h3>
              <p className="text-sm text-muted-foreground">{result.recommendation.reason}</p>
            </div>

            <div className="space-y-4">
              {(Object.entries(result.prompts) as [PlatformId, string | null][])
                .filter(([, prompt]) => prompt)
                .map(([platform, prompt]) => (
                  <PromptCard
                    key={platform}
                    platform={platform}
                    prompt={prompt!}
                    isRecommended={platform === result.recommendation.primary}
                  />
                ))}
            </div>

            <TipsCard tips={result.tips} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
