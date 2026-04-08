'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, RotateCcw, Save, ChevronRight, Scan, Eye, Compass, Ban } from 'lucide-react';
import { toast } from 'sonner';
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
    removeImage,
    setVisionText,
    setOutputType,
    generate,
    reset,
  } = useVision();

  const handleSave = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'vision',
          title: visionText?.slice(0, 60) || 'Vision Engineer',
          inputContext: visionText,
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
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Vision Engineer</h2>
            <p className="text-sm text-muted-foreground">
              Upload an image, describe your creative vision, and get prompts to execute it.
            </p>
          </div>
        </div>
      </div>

      <UploadZone
        label="Upload Image"
        onFilesChange={(files) => files[0] && setImage(files[0])}
        previews={imagePreview ? [imagePreview] : []}
        disabled={isLoading}
        onRemove={removeImage}
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
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{visionText.length}/1000</p>
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
          onClick={generate}
          disabled={isLoading || !imagePreview || !visionText.trim()}
          size="lg"
          className="flex-1 gold-gradient text-white border-0 hover:opacity-90 h-12 shadow-md"
        >
          {isLoading ? 'Generating...' : 'Generate Vision Prompts'}
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

      {isLoading && <LoadingSpinner message="Analyzing your image and crafting vision prompts..." />}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
                    <Scan className="h-4 w-4 text-white" />
                  </div>
                  Vision Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-gold" />
                    <h4 className="text-sm font-medium">Image Analysis</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">{result.analysis}</p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="h-4 w-4 text-gold" />
                    <h4 className="text-sm font-medium">Vision Interpretation</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">{result.interpretation}</p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Compass className="h-4 w-4 text-gold" />
                    <h4 className="text-sm font-medium">Execution Approach</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">{result.approach}</p>
                </div>
              </CardContent>
            </Card>

            <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
              <h3 className="text-base font-semibold mb-1">Platform Recommendation</h3>
              <p className="text-sm text-muted-foreground">{result.reason}</p>
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
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-destructive/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Ban className="h-5 w-5 text-destructive/60" />
                        Negative Prompt
                      </CardTitle>
                      <CopyButton text={result.negative} label="Copy --no" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-5 rounded-xl border leading-relaxed">
                      {result.negative}
                    </pre>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <TipsCard tips={result.tips} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
