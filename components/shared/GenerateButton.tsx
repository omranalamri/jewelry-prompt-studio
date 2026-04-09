'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Download, ExternalLink, Play, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlatformId } from '@/types/platforms';

type GenerationState = 'idle' | 'generating' | 'polling' | 'completed' | 'failed';

interface GenerateButtonProps {
  prompt: string;
  platform: PlatformId;
}

const isVideoPlatform = (p: PlatformId) => p === 'runway' || p === 'kling';

export function GenerateButton({ prompt, platform }: GenerateButtonProps) {
  const [state, setState] = useState<GenerationState>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isVideo = isVideoPlatform(platform);

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
            setError('Video generation failed.');
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

    try {
      if (isVideo) {
        // Video generation via Nano Banana
        const res = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            platform,
            duration: 5,
            aspectRatio: '16:9',
          }),
        });
        const json = await res.json();

        if (!json.success) {
          setState('failed');
          setError(json.error);
          toast.error(json.error);
          return;
        }

        setVideoId(json.data.id);
        setState('polling');
        toast.info('Video is being generated... This may take a minute.');
      } else {
        // Image generation via Replicate/Recraft
        const res = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, platform }),
        });
        const json = await res.json();

        if (!json.success) {
          setState('failed');
          setError(json.error);
          toast.error(json.error);
          return;
        }

        setResultUrl(json.data.resultUrl);
        setState('completed');
        toast.success('Image generated!');
      }
    } catch {
      setState('failed');
      setError('Network error. Please try again.');
      toast.error('Generation failed.');
    }
  }, [prompt, platform, isVideo]);

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
  }, []);

  return (
    <div className="space-y-3">
      {/* Generate Button */}
      {state === 'idle' && (
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
