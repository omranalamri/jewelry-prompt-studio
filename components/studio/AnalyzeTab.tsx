'use client';

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
    setAssets,
    setContext,
    setOutputType,
    analyze,
    reset,
  } = useAnalyze();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Analyze & Generate</h2>
        <p className="text-sm text-muted-foreground">
          Upload a reference image and your jewelry assets to get platform-optimized prompts.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <UploadZone
          label="Reference Image (required)"
          onFilesChange={(files) => files[0] && setReference(files[0])}
          previews={referencePreview ? [referencePreview] : []}
          disabled={isLoading}
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
        />
        <p className="text-xs text-muted-foreground text-right">{context.length}/500</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Output Type</label>
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={analyze} disabled={isLoading} className="flex-1">
          {isLoading ? 'Analyzing...' : 'Analyze & Generate'}
        </Button>
        {result && (
          <Button variant="outline" onClick={reset}>
            Start Over
          </Button>
        )}
      </div>

      {isLoading && <LoadingSpinner message="Analyzing your images and generating prompts..." />}

      {result && (
        <div className="space-y-6">
          <AnalysisCard analysis={result.analysis} />

          <div>
            <h3 className="text-lg font-semibold mb-1">Platform Recommendation</h3>
            <p className="text-sm text-muted-foreground mb-4">{result.recommendation.reason}</p>
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
        </div>
      )}
    </div>
  );
}
