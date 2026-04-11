'use client';

import { motion } from 'framer-motion';
import { Film, Play, Clock, Type, Music, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GenerateButton } from '@/components/shared/GenerateButton';
import { ChatTab } from '@/components/shared/ChatTab';

interface AdScene {
  number: number;
  name: string;
  startTime: number;
  duration: number;
  videoPrompt: string;
  imagePrompt: string;
  camera: string;
  audio: string;
  textOverlay: string | null;
  transition: string;
}

interface AdResult {
  title: string;
  totalDuration: number;
  platform: string;
  aspectRatio: string;
  musicDirection: string;
  brandPlacement: string;
  scenes: AdScene[];
  exportNotes: string;
}

function AdResultView({ data, referenceImageUrl, reset }: {
  data: Record<string, unknown>;
  referenceImageUrl: string | null;
  reset: () => void;
}) {
  const ad = data.ad as AdResult | undefined;
  if (!ad) return null;

  return (
    <div className="space-y-6">
      {/* Ad header */}
      <Card className="border-gold/30 overflow-hidden">
        <div className="h-1 gold-gradient" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Film className="h-5 w-5 text-gold" />
            {ad.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 mx-auto mb-1 text-gold" />
              <p className="text-lg font-bold">{ad.totalDuration}s</p>
              <p className="text-[10px] text-muted-foreground">Duration</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Play className="h-4 w-4 mx-auto mb-1 text-gold" />
              <p className="text-lg font-bold">{ad.scenes.length}</p>
              <p className="text-[10px] text-muted-foreground">Scenes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{ad.aspectRatio}</p>
              <p className="text-[10px] text-muted-foreground">{ad.platform}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">${(ad.scenes.length * 0.5).toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Est. cost</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Music className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" />
              <div><span className="font-medium">Music: </span>{ad.musicDirection}</div>
            </div>
            <div className="flex items-start gap-2">
              <Type className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" />
              <div><span className="font-medium">Brand: </span>{ad.brandPlacement}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline visualization */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</p>
        <div className="flex rounded-lg overflow-hidden h-8 border">
          {ad.scenes.map((scene, i) => {
            const width = (scene.duration / ad.totalDuration) * 100;
            const colors = ['bg-gold/80', 'bg-blue-400/80', 'bg-purple-400/80', 'bg-green-400/80', 'bg-amber-400/80', 'bg-pink-400/80'];
            return (
              <div key={i} className={`${colors[i % colors.length]} flex items-center justify-center text-[9px] text-white font-medium`}
                style={{ width: `${width}%` }} title={`${scene.name} (${scene.duration}s)`}>
                {scene.duration >= 3 ? scene.name : scene.duration + 's'}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>0s</span>
          {ad.scenes.map(s => <span key={s.number}>{s.startTime + s.duration}s</span>)}
        </div>
      </div>

      {/* Scenes */}
      <div className="space-y-4">
        {ad.scenes.map((scene, i) => (
          <motion.div key={scene.number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md gold-gradient text-white text-[10px] font-bold flex items-center justify-center">{scene.number}</span>
                  {scene.name}
                  <span className="text-xs text-muted-foreground font-normal">{scene.startTime}s–{scene.startTime + scene.duration}s ({scene.duration}s)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Camera:</span> {scene.camera}</div>
                  <div><span className="text-muted-foreground">Audio:</span> {scene.audio}</div>
                  <div><span className="text-muted-foreground">Transition:</span> {scene.transition}</div>
                </div>

                {scene.textOverlay && (
                  <div className="p-2 rounded-lg bg-muted/50 border">
                    <Type className="h-3 w-3 inline mr-1 text-gold" />
                    <span className="text-xs font-medium">Text overlay: </span>
                    <span className="text-xs">{scene.textOverlay}</span>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Play className="h-2.5 w-2.5" /> Video
                  </p>
                  <pre className="whitespace-pre-wrap text-[11px] font-mono bg-muted/50 p-3 rounded-lg border leading-relaxed">{scene.videoPrompt}</pre>
                  <div className="mt-2"><GenerateButton prompt={scene.videoPrompt} platform="runway" referenceImageUrl={referenceImageUrl || undefined} /></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Export notes */}
      {ad.exportNotes && (
        <Card className="border-gold/20 bg-gold/[0.02]">
          <CardContent className="p-4">
            <p className="text-xs font-medium mb-1">Export Notes</p>
            <p className="text-xs text-muted-foreground">{ad.exportNotes}</p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={reset} className="w-full">
        <RotateCcw className="h-4 w-4 mr-2" /> New Ad
      </Button>
    </div>
  );
}

export function AdBuilderTab() {
  return (
    <ChatTab
      apiEndpoint="/api/ads"
      placeholder="Describe the ad you want to create..."
      phaseLabels={{ discover: 'Planning your ad', generate: 'Ad blueprint ready' }}
      isResultReady={(d) => d.ready === true && !!d.ad}
      header={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Ad Builder</h2>
            <p className="text-sm text-muted-foreground">Create complete 15-30 second video ads with scenes, transitions, and music.</p>
          </div>
        </div>
      }
      emptyState={
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm text-muted-foreground">What kind of ad do you want to create?</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { text: '15-second Instagram Reel ad for my diamond ring', icon: '📱' },
              { text: '30-second luxury brand film for my jewelry collection', icon: '🎬' },
              { text: 'TikTok hook video that stops the scroll — gold necklace', icon: '⚡' },
              { text: 'YouTube Shorts ad for engagement rings with CTA', icon: '💍' },
            ].map((ex, i) => (
              <div key={i} className="p-3 rounded-xl border bg-card text-sm text-muted-foreground">
                <span className="mr-2">{ex.icon}</span>{ex.text}
              </div>
            ))}
          </div>
        </motion.div>
      }
      resultRenderer={(data, refUrl, reset) => <AdResultView data={data} referenceImageUrl={refUrl} reset={reset} />}
    />
  );
}
