'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Download, ExternalLink, Play, Image as ImageIcon, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlatformId } from '@/types/platforms';

type GenerationState = 'idle' | 'generating' | 'polling' | 'completed' | 'failed';

interface GenerateButtonProps {
  prompt: string;
  platform: PlatformId;
}

const isVideoPlatform = (p: PlatformId) => p === 'runway' || p === 'kling';

const IMAGE_MODEL_OPTIONS = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', badge: 'Best Quality', cost: '$0.13', quality: 10 },
  { id: 'flux-ultra', name: 'Flux Ultra', badge: '4MP Photorealistic', cost: '$0.06', quality: 9 },
  { id: 'nano-banana-2', name: 'Nano Banana 2', badge: 'Fast + Consistent', cost: '$0.05', quality: 9 },
  { id: 'recraft-v3', name: 'Recraft V3', badge: 'Product Photography', cost: '$0.04', quality: 8 },
  { id: 'ideogram-v2', name: 'Ideogram V2', badge: 'Text + Detail', cost: '$0.08', quality: 8 },
];

const VIDEO_MODEL_OPTIONS = [
  { id: 'veo-3', name: 'Google Veo 3', badge: 'Best + Audio', cost: '$1.25', quality: 10 },
  { id: 'veo-2', name: 'Google Veo 2', badge: 'Fast + Quality', cost: '$0.50', quality: 9 },
  { id: 'minimax', name: 'Minimax Video', badge: 'Image-to-Video', cost: '$0.88', quality: 7 },
];

export function GenerateButton({ prompt, platform }: GenerateButtonProps) {
  const [state, setState] = useState<GenerationState>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [costInfo, setCostInfo] = useState<string | null>(null);
  const [timeInfo, setTimeInfo] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const isVideo = isVideoPlatform(platform);
  const modelOptions = isVideo ? VIDEO_MODEL_OPTIONS : IMAGE_MODEL_OPTIONS;

  // Poll for video completion
  useEffect(() => {
    if (state !== 'polling' || !videoId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status?id=${videoId}&provider=replicate`);
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
  }, [state, videoId]);

  const handleGenerate = useCallback(async () => {
    setState('generating');
    setError(null);
    setResultUrl(null);
    setShowModelPicker(false);

    try {
      if (isVideo) {
        const res = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform, duration: 5, aspectRatio: '16:9' }),
        });
        const json = await res.json();

        if (!json.success) {
          setState('failed');
          setError(json.error);
          toast.error(json.error);
          return;
        }

        setVideoId(json.data.id);
        setModelUsed(json.data.model || json.data.provider);
        setCostInfo(json.data.cost || null);
        setState('polling');
        toast.info(`Generating video with ${json.data.model || 'AI'} (${json.data.cost || ''})... ~${Math.round((json.data.estimatedTime || 60) / 60)}min`);
      } else {
        const res = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform, model: selectedModel }),
        });
        const json = await res.json();

        if (!json.success) {
          setState('failed');
          setError(json.error);
          toast.error(json.error);
          return;
        }

        setResultUrl(json.data.resultUrl);
        setModelUsed(json.data.model || json.data.provider);
        setCostInfo(json.data.cost || null);
        setTimeInfo(json.data.timeSeconds || null);
        setState('completed');
        toast.success(`Generated with ${json.data.model} (${json.data.cost}, ${json.data.timeSeconds}s)`);
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
    setModelUsed(null);
    setCostInfo(null);
    setTimeInfo(null);
  }, []);

  return (
    <div className="space-y-3">
      {/* Generate Button with Model Picker */}
      {state === 'idle' && (
        <div className="space-y-2">
          {/* Model selector */}
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Model: {selectedModel ? modelOptions.find(m => m.id === selectedModel)?.name : 'Auto (best available)'}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showModelPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-1.5 pb-2">
                  <button
                    onClick={() => setSelectedModel(null)}
                    className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${!selectedModel ? 'border-gold bg-gold/5' : 'hover:border-gold/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Auto</span>
                      <span className="text-gold text-[10px]">Best</span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">Highest quality first</span>
                  </button>
                  {modelOptions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${selectedModel === m.id ? 'border-gold bg-gold/5' : 'hover:border-gold/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground text-[10px]">{m.cost}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-muted-foreground text-[10px]">{m.badge}</span>
                        <span className="text-[10px]">{'★'.repeat(Math.min(m.quality - 7, 3))}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleGenerate}
            className="w-full gold-gradient text-white border-0 hover:opacity-90 h-10 shadow-sm"
          >
            {isVideo ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate Video
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {(state === 'generating' || state === 'polling') && (
        <div className="flex items-center justify-center gap-3 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          <span className="text-sm text-muted-foreground">
            {state === 'generating' ? 'Submitting...' : 'Generating... This may take a minute'}
          </span>
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
              <Button variant="outline" size="sm" onClick={() => window.open(resultUrl, '_blank')} className="flex-1">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open Full Size
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
