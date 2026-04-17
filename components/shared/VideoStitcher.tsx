'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Film, Play, Loader2, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoClip {
  videoUrl: string;
  label: string;
}

interface VideoStitcherProps {
  clips: VideoClip[];
}

export function VideoStitcher({ clips }: VideoStitcherProps) {
  const [stitching, setStitching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stitchVideos = useCallback(async () => {
    if (!clips.length || !canvasRef.current) return;
    setStitching(true);
    setProgress(0);
    setOutputUrl(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1024;
    canvas.height = 1024;

    // MediaRecorder to capture canvas
    const stream = canvas.captureStream(30);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 5_000_000 });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const finalBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      recorder.start();

      // Play each clip sequentially on canvas
      let clipIdx = 0;

      const playNext = () => {
        if (clipIdx >= clips.length) {
          // Add 0.5s black fade out
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          setTimeout(() => recorder.stop(), 500);
          return;
        }

        setProgress(Math.round(((clipIdx) / clips.length) * 100));

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.src = clips[clipIdx].videoUrl;

        video.onloadeddata = () => {
          video.play();

          const draw = () => {
            if (video.paused || video.ended) return;
            // Draw video frame to canvas, cover-fit
            const vw = video.videoWidth || 1024;
            const vh = video.videoHeight || 1024;
            const scale = Math.max(canvas.width / vw, canvas.height / vh);
            const w = vw * scale;
            const h = vh * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(video, x, y, w, h);

            // Fade in first 0.3s
            const t = video.currentTime;
            if (t < 0.3) {
              ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.3})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            // Fade out last 0.3s
            const remaining = video.duration - t;
            if (remaining < 0.3) {
              ctx.fillStyle = `rgba(0,0,0,${1 - remaining / 0.3})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            requestAnimationFrame(draw);
          };

          requestAnimationFrame(draw);
        };

        video.onended = () => {
          clipIdx++;
          video.remove();
          playNext();
        };

        video.onerror = () => {
          clipIdx++;
          video.remove();
          playNext();
        };
      };

      playNext();
    });

    const url = URL.createObjectURL(finalBlob);
    setOutputUrl(url);
    setProgress(100);
    setStitching(false);
    toast.success('Campaign reel created!');
  }, [clips]);

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `campaign-reel-${Date.now()}.webm`;
    a.click();
    toast.success('Downloading reel');
  };

  if (!clips.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-gold" />
          <span className="text-sm font-semibold">Create Campaign Reel</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{clips.length} clips → 1 video</span>
      </div>

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {!outputUrl && !stitching && (
        <Button onClick={stitchVideos} className="w-full gold-gradient text-white border-0 h-11">
          <Play className="h-4 w-4 mr-2" />
          Stitch {clips.length} Clips into Campaign Reel
        </Button>
      )}

      {stitching && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span className="text-sm">Rendering reel... {progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full gold-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {outputUrl && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gold">
            <Check className="h-4 w-4" />
            Campaign reel ready
          </div>
          <div className="rounded-xl overflow-hidden border bg-black">
            <video src={outputUrl} controls autoPlay loop className="w-full max-h-[500px]" />
          </div>
          <Button onClick={handleDownload} variant="outline" className="w-full h-10">
            <Download className="h-4 w-4 mr-2" />
            Download Campaign Reel (.webm)
          </Button>
        </motion.div>
      )}
    </div>
  );
}
