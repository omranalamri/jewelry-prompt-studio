'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, Send, RotateCcw, Upload, Sparkles, Play, Image as ImageIcon, BarChart3, Palette, Music, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GenerateButton } from '@/components/shared/GenerateButton';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  rawJson?: string;
  hasImage?: boolean;
  phase?: string;
}

interface CreativeScene {
  number: number;
  name: string;
  duration: number;
  type: string;
  shotType: string;
  videoPrompt: string;
  imagePrompt: string;
  camera: string;
  audio: string;
  transition: string;
}

interface CreativeResult {
  title: string;
  concept: string;
  mood: string;
  colorPalette: string[];
  musicDirection: string;
  persona: {
    description: string;
    skinTone: string;
    nails: string;
    styling: string;
  };
  scenes: CreativeScene[];
  attention: {
    hookElement: string;
    emotionalTrigger: string;
    scrollStopScore: number;
    keyStrengths: string[];
    improvements: string[];
  };
}

const PHASE_LABELS: Record<string, string> = {
  analyze: 'Analyzing your piece',
  discover: 'Building your brief',
  propose: 'Crafting the concept',
  generate: 'Creative package ready',
};

export function CreativeTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [creative, setCreative] = useState<CreativeResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, creative]);

  const handleImageUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
      setImageMediaType(file.type);
    };
    reader.readAsDataURL(file);

    // Also upload to blob for generation references
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', 'creative-ref');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) setReferenceImageUrl(json.url);
    } catch { /* non-critical */ }
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() && !imageBase64) return;

    const isFirstMessage = messages.length === 0;
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText.trim() || (isFirstMessage && imageBase64 ? 'Analyze this jewelry piece and help me create an amazing creative for it.' : ''),
      hasImage: isFirstMessage && !!imageBase64,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMessage];

      const res = await fetch('/api/creative/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          ...(isFirstMessage && imageBase64 && { imageBase64, imageMediaType }),
        }),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error);
        setIsLoading(false);
        return;
      }

      const data = json.data;
      setCurrentPhase(data.phase || null);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        rawJson: json.rawJson,
        phase: data.phase,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.ready && data.creative) {
        setCreative(data.creative);
        toast.success('Creative package generated!');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, imageBase64, imageMediaType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) sendMessage();
  };

  const reset = useCallback(() => {
    setMessages([]);
    setInput('');
    setCreative(null);
    setCurrentPhase(null);
    setImagePreview(null);
    setImageBase64(null);
    setImageMediaType(null);
    setReferenceImageUrl(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Clapperboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Creative Director</h2>
          <p className="text-sm text-muted-foreground">
            Upload your jewelry, chat with your AI creative director, generate a full campaign.
          </p>
        </div>
      </div>

      {/* Empty state — upload prompt */}
      {messages.length === 0 && !imagePreview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-dashed border-2 hover:border-gold/40 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-2xl gold-gradient flex items-center justify-center">
                  <Upload className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="font-medium mb-1">Upload your jewelry piece to start</p>
              <p className="text-sm text-muted-foreground">
                Drop a photo of your ring, necklace, bracelet, or watch — I&apos;ll analyze it and we&apos;ll build a creative together.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Or just type a description below if you don&apos;t have a photo yet.
              </p>
            </CardContent>
          </Card>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
          />
        </motion.div>
      )}

      {/* Image preview after upload */}
      {imagePreview && messages.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={imagePreview} alt="Jewelry" className="h-20 w-20 object-cover rounded-xl border shadow-sm" />
            <div>
              <p className="text-sm font-medium">Ready to analyze</p>
              <p className="text-xs text-muted-foreground">Hit send or type what you&apos;re looking for</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Phase indicator */}
      {currentPhase && !creative && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs text-muted-foreground">{PHASE_LABELS[currentPhase] || currentPhase}</span>
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <Card className="overflow-hidden">
          <div className="h-[400px] overflow-y-auto" ref={scrollRef}>
            <CardContent className="p-5 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'gold-gradient text-white'
                      : 'bg-muted'
                  }`}>
                    {msg.hasImage && imagePreview && (
                      <img src={imagePreview} alt="Uploaded" className="h-16 w-16 object-cover rounded-lg mb-2" />
                    )}
                    {msg.content}
                    {msg.phase && msg.role === 'assistant' && (
                      <span className="block text-[10px] mt-2 opacity-60">
                        {PHASE_LABELS[msg.phase]}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          className="h-1.5 w-1.5 rounded-full bg-gold"
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Input */}
      {!creative && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            {messages.length === 0 && !imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="h-4 w-4" />
              </button>
            )}
            <Textarea
              placeholder={
                messages.length === 0
                  ? imagePreview
                    ? 'Tell me about your creative vision, or just hit send to start...'
                    : '     Describe your jewelry piece or upload a photo...'
                  : 'Continue the conversation...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && (input.trim() || imageBase64)) sendMessage();
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isLoading && !input.trim() && !imageBase64}
              size="lg"
              className="gold-gradient text-white border-0 hover:opacity-90 h-full min-w-[50px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Reset */}
      {messages.length > 0 && !creative && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Start over
          </Button>
        </div>
      )}

      {/* Generated Creative Package */}
      <AnimatePresence>
        {creative && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Header card */}
            <Card className="border-gold/30 overflow-hidden">
              <div className="h-1 gold-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-gold" />
                  {creative.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground italic">{creative.concept}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{creative.scenes.reduce((a, s) => a + s.duration, 0)}s</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{creative.scenes.length}</p>
                    <p className="text-xs text-muted-foreground">Scenes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{creative.attention?.scrollStopScore || '-'}/10</p>
                    <p className="text-xs text-muted-foreground">Scroll-Stop</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{creative.scenes.filter(s => s.type === 'video').length} vid / {creative.scenes.filter(s => s.type === 'still').length} img</p>
                    <p className="text-xs text-muted-foreground">Outputs</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Palette className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Mood</p>
                      <p className="text-sm text-muted-foreground">{creative.mood}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Music className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Music</p>
                      <p className="text-sm text-muted-foreground">{creative.musicDirection}</p>
                    </div>
                  </div>
                </div>

                {creative.persona && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium mb-1">Model / Persona</p>
                    <p className="text-sm text-muted-foreground">{creative.persona.description}</p>
                  </div>
                )}

                {creative.colorPalette && (
                  <div className="flex gap-2 flex-wrap">
                    {creative.colorPalette.map((c, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-muted">{c}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scenes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Play className="h-5 w-5 text-gold" />
                Scenes
              </h3>
              {creative.scenes.map((scene, i) => (
                <motion.div
                  key={scene.number}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg gold-gradient text-white text-xs flex items-center justify-center font-bold">
                          {scene.number}
                        </span>
                        {scene.name}
                        <span className="text-xs text-muted-foreground font-normal">
                          {scene.duration}s · {scene.shotType}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Camera</p>
                          <p>{scene.camera}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Audio</p>
                          <p>{scene.audio}</p>
                        </div>
                      </div>

                      {scene.videoPrompt && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Play className="h-3 w-3" /> Video Prompt
                            </p>
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-xl border leading-relaxed">
                              {scene.videoPrompt}
                            </pre>
                            <div className="mt-2">
                              <GenerateButton prompt={scene.videoPrompt} platform="runway" referenceImageUrl={referenceImageUrl || undefined} />
                            </div>
                          </div>
                        </>
                      )}

                      {scene.imagePrompt && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <ImageIcon className="h-3 w-3" /> Image Prompt
                            </p>
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-xl border leading-relaxed">
                              {scene.imagePrompt}
                            </pre>
                            <div className="mt-2">
                              <GenerateButton prompt={scene.imagePrompt} platform="midjourney" referenceImageUrl={referenceImageUrl || undefined} />
                            </div>
                          </div>
                        </>
                      )}

                      {scene.transition && (
                        <p className="text-xs text-muted-foreground italic">Transition: {scene.transition}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Attention Analysis */}
            {creative.attention && (
              <Card className="border-gold/20 bg-gold/[0.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gold" />
                    Engagement Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-gold" />
                        <p className="text-sm font-medium">Hook</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{creative.attention.hookElement}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-gold" />
                        <p className="text-sm font-medium">Emotional Trigger</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{creative.attention.emotionalTrigger}</p>
                    </div>
                  </div>

                  {creative.attention.keyStrengths && (
                    <div>
                      <p className="text-sm font-medium mb-2">Strengths</p>
                      <div className="flex flex-wrap gap-2">
                        {creative.attention.keyStrengths.map((s, i) => (
                          <span key={i} className="text-xs px-3 py-1.5 rounded-full border bg-card">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {creative.attention.improvements && creative.attention.improvements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Suggestions</p>
                      <ul className="space-y-1.5">
                        {creative.attention.improvements.map((imp, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-gold font-bold shrink-0">{i + 1}.</span>{imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                New Creative
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
