'use client';

import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clapperboard, Send, RotateCcw, ImagePlus, Sparkles, Play,
  Image as ImageIcon, BarChart3, Palette, Music, Eye, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GenerateButton } from '@/components/shared/GenerateButton';

// --- Types ---

interface ChatImage {
  base64: string;
  mediaType: string;
  preview: string; // data URL for display
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  rawJson?: string;
  images?: ChatImage[];
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
  persona: { description: string; skinTone: string; nails: string; styling: string };
  scenes: CreativeScene[];
  attention: {
    hookElement: string;
    emotionalTrigger: string;
    scrollStopScore: number;
    keyStrengths: string[];
    improvements: string[];
  };
}

// --- Campaign templates as starters ---

import { CAMPAIGN_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/creative/campaign-templates';

function fmtInline(text: string): React.ReactNode {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>);
}
function FmtMsg({ text, isUser }: { text: string; isUser: boolean }) {
  if (!text) return <>No response.</>;
  if (isUser) return <>{text}</>;
  return (<div className="space-y-2">{text.split('\n\n').filter(Boolean).map((para, i) => {
    const lines = para.split('\n');
    if (lines.every(l => /^[-•]\s/.test(l.trim()) || !l.trim()) && lines.filter(l => l.trim()).length > 1)
      return <ul key={i} className="space-y-1">{lines.filter(l => l.trim()).map((l, j) => <li key={j} className="flex gap-2"><span className="text-gold shrink-0">•</span><span>{fmtInline(l.replace(/^[-•]\s*/, ''))}</span></li>)}</ul>;
    if (lines.every(l => /^\d+[\.\)]\s/.test(l.trim()) || !l.trim()) && lines.filter(l => l.trim()).length > 1)
      return <ol key={i} className="space-y-1">{lines.filter(l => l.trim()).map((l, j) => <li key={j} className="flex gap-2"><span className="text-gold shrink-0 font-medium">{j+1}.</span><span>{fmtInline(l.replace(/^\d+[\.\)]\s*/, ''))}</span></li>)}</ol>;
    return <p key={i}>{fmtInline(para.replace(/\n/g, ' '))}</p>;
  })}</div>);
}

const PHASE_LABELS: Record<string, string> = {
  analyze: 'Analyzing your piece',
  discover: 'Building your brief',
  propose: 'Crafting the concept',
  generate: 'Creative package ready',
};

// --- Component ---

export function CreativeTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [creative, setCreative] = useState<CreativeResult | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [templateCat, setTemplateCat] = useState('all');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, creative]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // --- Image handling ---

  const addImages = useCallback(async (files: FileList | File[]) => {
    const newImages: ChatImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push({
        base64: dataUrl.split(',')[1],
        mediaType: file.type,
        preview: dataUrl,
      });

      // Upload first image to blob for generation reference
      if (!referenceImageUrl) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('context', 'creative-ref');
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const json = await res.json();
          if (json.success) setReferenceImageUrl(json.url);
        } catch { /* non-critical */ }
      }
    }
    setPendingImages(prev => [...prev, ...newImages]);
  }, [referenceImageUrl]);

  const removePendingImage = useCallback((index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Send message ---

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText && pendingImages.length === 0) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText || (pendingImages.length > 0 ? 'Here are some reference images.' : ''),
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingImages([]);
    setIsLoading(true);

    try {
      // Send full history — images are base64 inline
      const payload = newMessages.map(m => ({
        role: m.role,
        content: m.content,
        rawJson: m.rawJson,
        images: m.images?.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
      }));

      const res = await fetch('/api/creative/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error);
        setIsLoading(false);
        return;
      }

      const data = json.data as Record<string, unknown>;
      setCurrentPhase((data.phase as string) || null);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (data.message || data.content || 'No response.') as string,
        rawJson: json.rawJson,
        phase: data.phase as string,
      }]);

      if (data.ready && data.creative) {
        setCreative(data.creative as CreativeResult);
        toast.success('Creative package generated!');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, pendingImages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) sendMessage();
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addImages(files);
    }
  }, [addImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files);
    }
  }, [addImages]);

  const reset = useCallback(() => {
    setMessages([]);
    setInput('');
    setPendingImages([]);
    setCreative(null);
    setCurrentPhase(null);
    setReferenceImageUrl(null);
  }, []);

  // --- Render ---

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
            Chat with your AI creative director. Upload images anytime. Get a full campaign.
          </p>
        </div>
      </div>

      {/* Campaign templates — only when empty */}
      {messages.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Campaign Templates</p>
            <p className="text-xs text-muted-foreground">or type your own idea below</p>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button key={cat.id}
                onClick={() => setTemplateCat(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  templateCat === cat.id ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {CAMPAIGN_TEMPLATES
              .filter(t => templateCat === 'all' || t.category === templateCat)
              .map((t) => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => sendMessage(t.prompt)}
                className="p-3 rounded-xl border bg-card hover:border-gold/30 hover:bg-gold/5 text-left transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{t.icon}</span>
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Paste or drop images directly into the chat at any time
          </p>
        </motion.div>
      )}

      {/* Phase indicator */}
      {currentPhase && !creative && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">{PHASE_LABELS[currentPhase] || currentPhase}</span>
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <Card className="overflow-hidden">
          <div className="h-[420px] overflow-y-auto" ref={scrollRef}>
            <CardContent className="p-5 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'gold-gradient text-white' : 'bg-muted'
                  }`}>
                    {/* Inline image thumbnails */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {msg.images.map((img, j) => (
                          <img key={j} src={img.preview} alt="Reference" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                        ))}
                      </div>
                    )}
                    <FmtMsg text={msg.content} isUser={msg.role === 'user'} />
                    {msg.phase && msg.role === 'assistant' && (
                      <span className="block text-[10px] mt-2 opacity-50">{PHASE_LABELS[msg.phase]}</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          className="h-1.5 w-1.5 rounded-full bg-gold" />
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

      {/* Input area */}
      {!creative && (
        <div className="space-y-2">
          {/* Pending image previews */}
          <AnimatePresence>
            {pendingImages.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-2 p-2 rounded-lg bg-muted/50 border">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.preview} alt="Pending" className="h-14 w-14 object-cover rounded-lg border" />
                      <button onClick={() => removePendingImage(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground self-center px-2">
                    {pendingImages.length} image{pendingImages.length > 1 ? 's' : ''} attached
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex gap-2"
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ''; }} />

            <Button type="button" variant="outline" size="icon" className="shrink-0 h-auto"
              onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
            </Button>

            <textarea
              ref={textareaRef}
              placeholder={messages.length === 0 ? 'Describe your jewelry or paste an image...' : 'Continue the conversation...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              disabled={isLoading}
              rows={2}
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading) sendMessage();
                }
              }}
            />

            <Button type="submit" disabled={isLoading && !input.trim() && pendingImages.length === 0}
              className="gold-gradient text-white border-0 hover:opacity-90 shrink-0 h-auto min-w-[48px]">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Paste images, drop files, or click the image button. Enter to send.
            </p>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-6">
                <RotateCcw className="h-3 w-3 mr-1" /> Start over
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ========== GENERATED CREATIVE PACKAGE ========== */}
      <AnimatePresence>
        {creative && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Header */}
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
                    <p className="text-sm font-medium">
                      {creative.scenes.filter(s => s.type === 'video').length}v / {creative.scenes.filter(s => s.type !== 'video').length}i
                    </p>
                    <p className="text-xs text-muted-foreground">Outputs</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Palette className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <div><p className="text-xs font-medium">Mood</p><p className="text-sm text-muted-foreground">{creative.mood}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Music className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <div><p className="text-xs font-medium">Music</p><p className="text-sm text-muted-foreground">{creative.musicDirection}</p></div>
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Play className="h-5 w-5 text-gold" /> Scenes
                </h3>
                <Button size="sm" className="gold-gradient text-white border-0 hover:opacity-90 text-xs"
                  onClick={async () => {
                    toast.info(`Generating all ${creative.scenes.length} scene images...`);
                    for (const scene of creative.scenes) {
                      if (scene.imagePrompt) {
                        try {
                          await fetch('/api/generate/image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: scene.imagePrompt, platform: 'midjourney', referenceImageUrl }),
                          });
                        } catch { /* continue */ }
                      }
                    }
                    toast.success('All scene images generated! Check Repository.');
                  }}>
                  <Sparkles className="h-3 w-3 mr-1.5" /> Generate All Images
                </Button>
              </div>
              {creative.scenes.map((scene, i) => (
                <motion.div key={scene.number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="h-7 w-7 rounded-lg gold-gradient text-white text-xs flex items-center justify-center font-bold">{scene.number}</span>
                        {scene.name}
                        <span className="text-xs text-muted-foreground font-normal">{scene.duration}s · {scene.shotType}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs font-medium text-muted-foreground mb-1">Camera</p><p>{scene.camera}</p></div>
                        <div><p className="text-xs font-medium text-muted-foreground mb-1">Audio</p><p>{scene.audio}</p></div>
                      </div>

                      {scene.videoPrompt && (
                        <><Separator /><div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Play className="h-3 w-3" /> Video Prompt
                          </p>
                          <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-xl border leading-relaxed">{scene.videoPrompt}</pre>
                          <div className="mt-2"><GenerateButton prompt={scene.videoPrompt} platform="runway" referenceImageUrl={referenceImageUrl || undefined} compact /></div>
                        </div></>
                      )}

                      {scene.imagePrompt && (
                        <><Separator /><div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ImageIcon className="h-3 w-3" /> Image Prompt
                          </p>
                          <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-xl border leading-relaxed">{scene.imagePrompt}</pre>
                          <div className="mt-2"><GenerateButton prompt={scene.imagePrompt} platform="midjourney" referenceImageUrl={referenceImageUrl || undefined} compact /></div>
                        </div></>
                      )}

                      {scene.transition && <p className="text-xs text-muted-foreground italic">Transition: {scene.transition}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Attention Analysis */}
            {creative.attention && (
              <Card className="border-gold/20 bg-gold/[0.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-gold" /> Engagement Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2 mb-1"><Eye className="h-4 w-4 text-gold" /><p className="text-sm font-medium">Hook</p></div>
                      <p className="text-sm text-muted-foreground">{creative.attention.hookElement}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-gold" /><p className="text-sm font-medium">Trigger</p></div>
                      <p className="text-sm text-muted-foreground">{creative.attention.emotionalTrigger}</p>
                    </div>
                  </div>
                  {creative.attention.keyStrengths && (
                    <div><p className="text-sm font-medium mb-2">Strengths</p>
                      <div className="flex flex-wrap gap-2">
                        {creative.attention.keyStrengths.map((s, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-full border bg-card">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {creative.attention.improvements?.length > 0 && (
                    <div><p className="text-sm font-medium mb-2">Suggestions</p>
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
                <RotateCcw className="h-4 w-4 mr-2" /> New Creative
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
