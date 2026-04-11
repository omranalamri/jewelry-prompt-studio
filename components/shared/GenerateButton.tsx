'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Download, ExternalLink, Play, Image as ImageIcon, RefreshCw, FolderPlus, Camera, Grid2x2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlatformId } from '@/types/platforms';

type GenerationState = 'idle' | 'generating' | 'polling' | 'completed' | 'failed';

interface GenerateButtonProps {
  prompt: string;
  platform: PlatformId;
  referenceImageUrl?: string;
  compact?: boolean; // hide model picker, auto-select best
}

const isVideoPlatform = (p: PlatformId) => p === 'runway' || p === 'kling';

const IMAGE_MODEL_OPTIONS = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', badge: 'Best Quality', cost: '$0.13', quality: 10 },
  { id: 'flux-ultra', name: 'Flux Ultra', badge: 'Lifestyle Only', cost: '$0.06', quality: 7 },
  { id: 'nano-banana-2', name: 'Nano Banana 2', badge: 'Fast + Consistent', cost: '$0.05', quality: 9 },
  { id: 'recraft-v3', name: 'Recraft V3', badge: 'Product Photography', cost: '$0.04', quality: 8 },
  { id: 'ideogram-v2', name: 'Ideogram V2', badge: 'Text + Detail', cost: '$0.08', quality: 8 },
];

const VIDEO_MODEL_OPTIONS = [
  { id: 'kling-2.5', name: 'Kling 2.5 Pro', badge: 'Best Motion', cost: '$0.35', quality: 10 },
  { id: 'veo-3', name: 'Google Veo 3', badge: 'Cinema + Audio', cost: '$1.25', quality: 10 },
  { id: 'seedance-2', name: 'Seedance 2.0', badge: 'Fast + Multimodal', cost: '$0.30', quality: 9 },
  { id: 'runway', name: 'Runway Gen-3', badge: 'Design Accurate', cost: '$0.25', quality: 9 },
  { id: 'seedance', name: 'Seedance 1.5', badge: 'Audio + Reference', cost: '$0.40', quality: 9 },
  { id: 'veo-2', name: 'Google Veo 2', badge: 'Reliable', cost: '$0.50', quality: 9 },
];

export function GenerateButton({ prompt, platform, referenceImageUrl, compact }: GenerateButtonProps) {
  const [state, setState] = useState<GenerationState>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoProvider, setVideoProvider] = useState<string>('replicate');
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [autoReview, setAutoReview] = useState<{ rootCause?: string; suggestedFix?: string; mainIssues?: string[] } | null>(null);
  const [costInfo, setCostInfo] = useState<string | null>(null);
  const [timeInfo, setTimeInfo] = useState<number | null>(null);
  const [creativeFrameUrl, setCreativeFrameUrl] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<{ model: string; modelId: string; resultUrl: string; cost: number; quality: number }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const _showModelPicker = true; // always visible

  const isVideo = isVideoPlatform(platform);
  const modelOptions = isVideo ? VIDEO_MODEL_OPTIONS : IMAGE_MODEL_OPTIONS;

  // Poll for video completion
  useEffect(() => {
    if (state !== 'polling' || !videoId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status?id=${videoId}&provider=${videoProvider}`);
        const json = await res.json();
        if (json.success) {
          if (json.data.status === 'completed' && json.data.resultUrl) {
            setResultUrl(json.data.resultUrl);
            setState('completed');
            toast.success('Video generated!');
            clearInterval(interval);
          } else if (json.data.status === 'failed') {
            setState('failed');
            setError(json.data.error || 'Video generation failed.');
            toast.error('Video generation failed.');
            clearInterval(interval);
          }
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state, videoId, videoProvider]);

  const handleGenerate = useCallback(async () => {
    setState('generating');
    setError(null);
    setResultUrl(null);
    // model picker always visible

    try {
      if (isVideo) {
        const res = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform, duration: 5, aspectRatio: '16:9', referenceImageUrl, model: selectedModel || modelOptions[0].id }),
        });
        const json = await res.json();

        if (!json.success) {
          setState('failed');
          setError(json.error);
          toast.error(json.error);
          return;
        }

        setVideoId(json.data.id);
        setVideoProvider(json.data.provider === 'runway' ? 'runway' : 'replicate');
        setModelUsed(json.data.model);
        setCostInfo(json.data.cost || null);
        setCreativeFrameUrl(json.data.firstFrameUrl || null);
        setState('polling');

        const fallbackNote = json.data.wasFirstChoice === false ? ` (${json.data.model} used instead)` : '';
        toast.info(`Generating with ${json.data.model}${fallbackNote} ${json.data.cost || ''}...`);
      } else {
        const res = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform, model: selectedModel || modelOptions[0].id, referenceImageUrl }),
        });
        const json = await res.json();

        if (!json.success) {
          setState('failed');
          setError(json.error);
          toast.error(json.error);
          return;
        }

        setResultUrl(json.data.resultUrl);
        setModelUsed(json.data.model);
        setGenerationId(json.data.id || null);
        setCostInfo(json.data.cost || null);
        setTimeInfo(json.data.timeSeconds || null);
        setState('completed');

        if (json.data.wasFirstChoice === false) {
          toast.success(`Generated with ${json.data.model} (${json.data.cost}, ${json.data.timeSeconds}s)`, {
            description: `Your selected model was busy, used ${json.data.model} instead`,
          });
        } else {
          toast.success(`Generated with ${json.data.model} (${json.data.cost}, ${json.data.timeSeconds}s)`);
        }
      }
    } catch {
      setState('failed');
      setError('Network error. Please try again.');
      toast.error('Generation failed.');
    }
  }, [prompt, platform, isVideo, selectedModel]);

  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${platform}-generated.${isVideo ? 'mp4' : 'png'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch {
      window.open(resultUrl, '_blank');
    }
  }, [resultUrl, platform, isVideo]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setError(null);
    setResultUrl(null);
    setVideoId(null);
    setVideoProvider('replicate');
    setModelUsed(null);
    setCostInfo(null);
    setTimeInfo(null);
    setCreativeFrameUrl(null);
    setBatchResults([]);
    setGenerationId(null);
    setUserRating(null);
    setShowFeedbackForm(false);
    setFeedbackComment('');
    setSelectedTags([]);
    setAutoReview(null);
  }, []);

  return (
    <div className="space-y-3">
      {/* Model Picker + Generate Button */}
      {state === 'idle' && (
        <div className="space-y-3">
          {/* Model selector — hidden in compact mode */}
          {!compact && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isVideo ? 'Video Model' : 'Image Model'}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {modelOptions.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`text-xs px-3 py-2.5 rounded-lg border text-left transition-all ${
                    (selectedModel === m.id || (!selectedModel && i === 0))
                      ? 'border-gold bg-gold/5 shadow-sm'
                      : 'hover:border-gold/30 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{m.cost}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-muted-foreground text-[10px]">{m.badge}</span>
                    <span className="text-[10px] text-gold">{'★'.repeat(Math.min(m.quality - 7, 3))}</span>
                  </div>
                </button>
                  ))}
            </div>
          </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              className="flex-1 gold-gradient text-white border-0 hover:opacity-90 h-11 shadow-sm text-sm"
            >
              {isVideo ? <Play className="h-4 w-4 mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              {compact
                ? (isVideo ? 'Generate Video' : 'Generate Image')
                : `Generate with ${selectedModel ? modelOptions.find(m => m.id === selectedModel)?.name : modelOptions[0].name}`
              }
            </Button>
            {!isVideo && (
              <Button
                variant="outline"
                onClick={async () => {
                  setState('generating');
                  try {
                    const res = await fetch('/api/generate/batch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt, referenceImageUrl, count: 4 }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      setBatchResults(json.data.results);
                      setState('completed');
                      toast.success(`${json.data.count} variations (${json.data.totalCost})`);
                    } else {
                      setState('failed');
                      setError(json.error);
                    }
                  } catch { setState('failed'); setError('Batch failed.'); }
                }}
                className="h-11 px-3"
                title="Generate 4 variations across different models"
              >
                <Grid2x2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {(state === 'generating' || state === 'polling') && (
        <div className="space-y-3">
          {/* Show creative frame while video generates */}
          {creativeFrameUrl && state === 'polling' && (
            <div className="relative rounded-xl overflow-hidden border">
              <img src={creativeFrameUrl} alt="Creative frame" className="w-full max-h-[300px] object-contain bg-black" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Animating this frame...
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span className="text-sm text-muted-foreground">
              {state === 'generating' ? 'Creating creative frame...' : 'Animating... This may take a minute'}
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      <AnimatePresence>
        {state === 'failed' && error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20"
          >
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Display */}
      <AnimatePresence>
        {state === 'completed' && resultUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {modelUsed && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-3.5 w-3.5 text-gold" />
                  <span className="text-xs text-muted-foreground">
                    Generated with <span className="font-medium text-foreground">{modelUsed}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {costInfo && <span className="px-2 py-0.5 rounded-full bg-muted font-medium">{costInfo}</span>}
                  {timeInfo && <span>{timeInfo}s</span>}
                </div>
              </div>
            )}
            <div className="relative rounded-xl overflow-hidden border shadow-md bg-black">
              {isVideo ? (
                <video
                  src={resultUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full max-h-[400px] object-contain"
                />
              ) : (
                <img
                  src={resultUrl}
                  alt={`Generated ${platform} image`}
                  className="w-full max-h-[500px] object-contain"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  await fetch('/api/repository', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      category: 'generated',
                      title: `${modelUsed || platform} — ${new Date().toLocaleDateString()}`,
                      description: prompt.slice(0, 200),
                      imageUrl: resultUrl,
                      tags: [platform, modelUsed || ''].filter(Boolean),
                    }),
                  });
                  toast.success('Saved to repository');
                } catch { toast.error('Failed to save'); }
              }} className="flex-1">
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                Save to Repo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.open(resultUrl, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Rating + Feedback */}
            {generationId && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Rate this {isVideo ? 'video' : 'image'}:</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star}
                        onClick={async () => {
                          setUserRating(star);
                          try {
                            await fetch('/api/feedback', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ generationId, rating: star, tags: [isVideo ? 'video-rating' : 'image-rating'] }),
                            });
                            if (star >= 4) {
                              toast.success(`Rated ${star}/5 — great, this helps improve future results!`);
                            }
                          } catch { /* non-critical */ }

                          // Auto-review on low ratings
                          if (star <= 3 && resultUrl) {
                            setShowFeedbackForm(true);
                            try {
                              const reviewRes = await fetch('/api/feedback/auto-review', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ generationId, resultUrl, userRating: star }),
                              });
                              const reviewJson = await reviewRes.json();
                              if (reviewJson.success) setAutoReview(reviewJson.data.review);
                            } catch { /* non-critical */ }
                          }
                        }}
                        className={`text-lg transition-all hover:scale-110 ${
                          userRating && star <= userRating ? (userRating <= 2 ? 'text-destructive' : userRating <= 3 ? 'text-amber-500' : 'text-gold') : 'text-muted-foreground/30 hover:text-gold/60'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback form — shows on low ratings */}
                <AnimatePresence>
                  {showFeedbackForm && userRating && userRating <= 3 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                      {/* Issue tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {['wrong-design', 'plastic-look', 'bad-lighting', 'wrong-proportions', 'text-garbled', 'wrong-metal', 'ai-artifacts', 'wrong-style'].map(tag => (
                          <button key={tag}
                            onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                              selectedTags.includes(tag) ? 'border-destructive bg-destructive/10 text-destructive' : 'hover:border-destructive/30'
                            }`}>
                            {tag.replace('-', ' ')}
                          </button>
                        ))}
                      </div>

                      {/* Comment box */}
                      <textarea
                        placeholder="What went wrong? (helps improve future generations)"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        rows={2}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-background resize-none"
                      />

                      <Button size="sm" variant="outline" className="w-full text-xs h-8"
                        onClick={async () => {
                          try {
                            await fetch('/api/feedback', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ generationId, rating: userRating, feedback: feedbackComment, tags: selectedTags }),
                            });
                            toast.success('Feedback saved — we\'ll improve based on this');
                            setShowFeedbackForm(false);
                          } catch { /* */ }
                        }}>
                        Submit Feedback
                      </Button>

                      {/* Auto-review results */}
                      {autoReview && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-muted/50 border space-y-2">
                          <p className="text-xs font-medium flex items-center gap-1.5">
                            <span className="h-4 w-4 rounded-full gold-gradient flex items-center justify-center text-white text-[8px]">AI</span>
                            Auto-Analysis
                          </p>
                          {autoReview?.rootCause && (
                            <p className="text-xs text-muted-foreground"><span className="font-medium">Root cause:</span> {autoReview?.rootCause as string}</p>
                          )}
                          {autoReview?.suggestedFix && (
                            <p className="text-xs text-muted-foreground"><span className="font-medium">Fix:</span> {autoReview?.suggestedFix as string}</p>
                          )}
                          {autoReview?.mainIssues && (
                            <div className="flex gap-1 flex-wrap">
                              {(autoReview?.mainIssues as string[]).map((issue, i) => (
                                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{issue}</span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch comparison grid */}
      <AnimatePresence>
        {batchResults.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid2x2 className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium">Compare {batchResults.length} Variations</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRetry} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {batchResults.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                  className="relative rounded-xl overflow-hidden border group">
                  <img src={r.resultUrl} alt={r.model} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 text-white">
                    <p className="text-[10px] font-medium">{r.model}</p>
                    <p className="text-[9px] opacity-70">${r.cost.toFixed(2)} · Q{r.quality}/10</p>
                  </div>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { const a = document.createElement('a'); a.href = r.resultUrl; a.download = `${r.modelId}.jpg`; a.click(); }}
                      className="h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"><Download className="h-3 w-3" /></button>
                    <button onClick={async () => {
                      try {
                        await fetch('/api/repository', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ category: 'generated', title: `${r.model} — picked`, imageUrl: r.resultUrl, tags: ['batch', 'picked'] }) });
                        toast.success('Saved!');
                      } catch { /* */ }
                    }} className="h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"><FolderPlus className="h-3 w-3" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
