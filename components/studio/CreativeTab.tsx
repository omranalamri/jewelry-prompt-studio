'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, ChevronRight, Save, RotateCcw, Play, Eye, BarChart3, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UploadZone } from '@/components/shared/UploadZone';
import { PersonaSelector } from '@/components/shared/PersonaSelector';
import { ReelTemplateSelector } from '@/components/shared/ReelTemplateSelector';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GenerateButton } from '@/components/shared/GenerateButton';

interface StoryboardScene {
  sceneNumber: number;
  name: string;
  duration: number;
  videoPrompt: string;
  imagePrompt: string;
  cameraMovement: string;
  audioNote: string;
  transitionNote: string;
}

interface StoryboardResult {
  storyboard: {
    title: string;
    totalDuration: number;
    mood: string;
    colorPalette: string[];
    musicDirection: string;
    scenes: StoryboardScene[];
  };
  attentionAnalysis: {
    hookElement: string;
    dwellPoints: string[];
    emotionalTrigger: string;
    predictedEngagement: string;
    scrollStopScore: number;
    improvements: string[];
  };
}

const JEWELRY_TYPES = ['Ring', 'Necklace', 'Earrings', 'Bracelet', 'Watch', 'Pendant', 'Bridal Set'];

export function CreativeTab() {
  const [jewelryDescription, setJewelryDescription] = useState('');
  const [jewelryType, setJewelryType] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [brandDirection, setBrandDirection] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StoryboardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(files[0]);
  }, []);

  const generate = useCallback(async () => {
    if (!jewelryDescription.trim() || !templateId || !personaId) {
      setError('Please fill in the jewelry description, select a template, and choose a persona.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/creative/reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jewelryDescription,
          jewelryType,
          templateId,
          personaId,
          brandDirection,
          ...(imageBase64 && { imageBase64, imageMediaType: 'image/jpeg' }),
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        toast.error(json.error);
        return;
      }

      setResult(json.data);
      toast.success('Storyboard generated!');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [jewelryDescription, jewelryType, templateId, personaId, brandDirection, imageBase64]);

  const reset = useCallback(() => {
    setJewelryDescription('');
    setJewelryType('');
    setTemplateId(null);
    setPersonaId(null);
    setBrandDirection('');
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Creative Director</h2>
            <p className="text-sm text-muted-foreground">
              Multi-shot reel storyboards with attention analysis and body placement.
            </p>
          </div>
        </div>
      </div>

      {/* Jewelry Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Describe Your Jewelry Piece</label>
        <Textarea
          placeholder="e.g., 18k yellow gold solitaire diamond ring, 1.5 carat round brilliant, thin band with pavé side stones..."
          value={jewelryDescription}
          onChange={(e) => setJewelryDescription(e.target.value)}
          disabled={isLoading}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Jewelry Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Jewelry Type</label>
        <div className="flex flex-wrap gap-2">
          {JEWELRY_TYPES.map((type) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setJewelryType(type.toLowerCase())}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                jewelryType === type.toLowerCase()
                  ? 'gold-gradient text-white border-transparent'
                  : 'hover:border-gold/30 hover:bg-gold/5'
              }`}
            >
              {type}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reference Image */}
      <UploadZone
        label="Reference Image (optional)"
        onFilesChange={handleImageUpload}
        previews={imagePreview ? [imagePreview] : []}
        disabled={isLoading}
        onRemove={() => { setImagePreview(null); setImageBase64(null); }}
      />

      {/* Reel Template */}
      <ReelTemplateSelector selected={templateId} onSelect={setTemplateId} />

      {/* Persona */}
      <PersonaSelector selected={personaId} onSelect={setPersonaId} />

      {/* Brand Direction */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Brand Direction (optional)</label>
        <Textarea
          placeholder="Target audience, brand values, campaign theme, mood references..."
          value={brandDirection}
          onChange={(e) => setBrandDirection(e.target.value)}
          disabled={isLoading}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Error */}
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

      {/* Generate Button */}
      <div className="flex gap-3">
        <Button
          onClick={generate}
          disabled={isLoading || !jewelryDescription.trim() || !templateId || !personaId}
          size="lg"
          className="flex-1 gold-gradient text-white border-0 hover:opacity-90 h-12 shadow-md"
        >
          {isLoading ? 'Creating Storyboard...' : 'Generate Reel Storyboard'}
          {!isLoading && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
        {result && (
          <Button variant="outline" size="lg" onClick={reset} className="h-12">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {isLoading && <LoadingSpinner message="Creating multi-shot storyboard with attention analysis..." />}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Storyboard Header */}
            <Card className="border-gold/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clapperboard className="h-5 w-5 text-gold" />
                  {result.storyboard.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{result.storyboard.totalDuration}s</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{result.storyboard.scenes.length}</p>
                    <p className="text-xs text-muted-foreground">Scenes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{result.attentionAnalysis.scrollStopScore}/10</p>
                    <p className="text-xs text-muted-foreground">Scroll-Stop</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{result.attentionAnalysis.predictedEngagement?.split(' ')[0]}</p>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm"><span className="font-medium">Mood:</span> {result.storyboard.mood}</p>
                  <p className="text-sm"><span className="font-medium">Music:</span> {result.storyboard.musicDirection}</p>
                </div>

                <div className="flex gap-2">
                  {result.storyboard.colorPalette?.map((color, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full bg-muted">{color}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scenes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Play className="h-5 w-5 text-gold" />
                Scenes
              </h3>
              {result.storyboard.scenes.map((scene, i) => (
                <motion.div
                  key={scene.sceneNumber}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg gold-gradient text-white text-xs flex items-center justify-center font-bold">
                            {scene.sceneNumber}
                          </span>
                          {scene.name}
                          <span className="text-xs text-muted-foreground font-normal">({scene.duration}s)</span>
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Camera</p>
                        <p className="text-sm">{scene.cameraMovement}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audio</p>
                        <p className="text-sm">{scene.audioNote}</p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Video Prompt</p>
                        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-xl border leading-relaxed">
                          {scene.videoPrompt}
                        </pre>
                        <GenerateButton prompt={scene.videoPrompt} platform="runway" />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Still Frame Prompt</p>
                        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-xl border leading-relaxed">
                          {scene.imagePrompt}
                        </pre>
                        <GenerateButton prompt={scene.imagePrompt} platform="midjourney" />
                      </div>

                      {scene.transitionNote && (
                        <p className="text-xs text-muted-foreground italic">
                          Transition: {scene.transitionNote}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Attention Analysis */}
            <Card className="border-gold/20 bg-gold/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gold" />
                  Attention & Engagement Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-gold" />
                      <p className="text-sm font-medium">Hook Element</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.attentionAnalysis.hookElement}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-gold" />
                      <p className="text-sm font-medium">Emotional Trigger</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.attentionAnalysis.emotionalTrigger}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Attention Dwell Points</p>
                  <div className="flex flex-wrap gap-2">
                    {result.attentionAnalysis.dwellPoints?.map((point, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full border bg-card">
                        {i + 1}. {point}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Improvement Suggestions</p>
                  <ul className="space-y-1.5">
                    {result.attentionAnalysis.improvements?.map((imp, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-gold font-bold shrink-0">{i + 1}.</span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
