'use client';

import { useVision } from '@/hooks/useVision';
import { UploadZone } from '@/components/shared/UploadZone';
import { OutputTypeSelector } from '@/components/shared/OutputTypeSelector';
import { PromptCard } from '@/components/shared/PromptCard';
import { TipsCard } from '@/components/shared/TipsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CopyButton } from '@/components/shared/CopyButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlatformId } from '@/types/platforms';

export function VisionTab() {
  const {
    imagePreview,
    visionText,
    outputType,
    isLoading,
    result,
    error,
    setImage,
    setVisionText,
    setOutputType,
    generate,
    reset,
  } = useVision();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Vision Engineer</h2>
        <p className="text-sm text-muted-foreground">
          Upload an image, describe your creative vision, and get prompts to execute it.
        </p>
      </div>

      <UploadZone
        label="Upload Image"
        onFilesChange={(files) => files[0] && setImage(files[0])}
        previews={imagePreview ? [imagePreview] : []}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">Describe Your Vision (required)</label>
        <Textarea
          placeholder="Describe how you want to transform this image. What mood, style, or creative direction do you envision?"
          value={visionText}
          onChange={(e) => setVisionText(e.target.value)}
          maxLength={1000}
          disabled={isLoading}
          rows={4}
        />
        <p className="text-xs text-muted-foreground text-right">{visionText.length}/1000</p>
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
        <Button onClick={generate} disabled={isLoading} className="flex-1">
          {isLoading ? 'Generating...' : 'Generate Vision Prompts'}
        </Button>
        {result && (
          <Button variant="outline" onClick={reset}>
            Start Over
          </Button>
        )}
      </div>

      {isLoading && <LoadingSpinner message="Analyzing your image and crafting vision prompts..." />}

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vision Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Image Analysis</h4>
                <p className="text-sm leading-relaxed">{result.analysis}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Vision Interpretation</h4>
                <p className="text-sm leading-relaxed">{result.interpretation}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Execution Approach</h4>
                <p className="text-sm leading-relaxed">{result.approach}</p>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-lg font-semibold mb-1">Platform Recommendation</h3>
            <p className="text-sm text-muted-foreground mb-4">{result.reason}</p>
          </div>

          <div className="space-y-4">
            {(Object.entries(result.prompts) as [PlatformId, string | null][])
              .filter(([, prompt]) => prompt)
              .map(([platform, prompt]) => (
                <PromptCard
                  key={platform}
                  platform={platform}
                  prompt={prompt!}
                  isRecommended={platform === result.recommendation}
                />
              ))}
          </div>

          {result.negative && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Negative Prompt</CardTitle>
                  <CopyButton text={result.negative} />
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                  {result.negative}
                </pre>
              </CardContent>
            </Card>
          )}

          <TipsCard tips={result.tips} />
        </div>
      )}
    </div>
  );
}
