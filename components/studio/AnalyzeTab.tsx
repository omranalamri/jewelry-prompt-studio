'use client';

import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Send, RotateCcw, ImagePlus, Sparkles, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PromptCard } from '@/components/shared/PromptCard';
import { AnalysisCard } from '@/components/shared/AnalysisCard';
import { TipsCard } from '@/components/shared/TipsCard';
import { PlatformId } from '@/types/platforms';

interface ChatImage {
  base64: string;
  mediaType: string;
  preview: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  rawJson?: string;
  images?: ChatImage[];
  phase?: string;
}

interface AnalyzeResult {
  analysis: Record<string, string>;
  recommendation: { primary: PlatformId; secondary?: PlatformId; reason: string };
  prompts: Record<string, string | null>;
  tips: string[];
  warnings?: string[];
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    : <Fragment key={i}>{part}</Fragment>);
}

function FormatMsg({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) return <>{text}</>;
  const paragraphs = text.split('\n\n').filter(Boolean);
  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        const isList = lines.every(l => /^[-•]\s/.test(l.trim()) || l.trim() === '');
        const isNum = lines.every(l => /^\d+[\.\)]\s/.test(l.trim()) || l.trim() === '');
        if (isList && lines.filter(l => l.trim()).length > 1)
          return <ul key={i} className="space-y-1">{lines.filter(l => l.trim()).map((l, j) => <li key={j} className="flex gap-2"><span className="text-gold shrink-0">•</span><span>{formatInline(l.replace(/^[-•]\s*/, ''))}</span></li>)}</ul>;
        if (isNum && lines.filter(l => l.trim()).length > 1)
          return <ol key={i} className="space-y-1">{lines.filter(l => l.trim()).map((l, j) => <li key={j} className="flex gap-2"><span className="text-gold shrink-0 font-medium">{j + 1}.</span><span>{formatInline(l.replace(/^\d+[\.\)]\s*/, ''))}</span></li>)}</ol>;
        return <p key={i}>{formatInline(para.replace(/\n/g, ' '))}</p>;
      })}
    </div>
  );
}

const PHASE_LABELS: Record<string, string> = {
  'first-look': 'Analyzing your piece',
  details: 'Getting the details right',
  generate: 'Prompts ready',
};

const QUICK_STARTS = [
  { text: 'Analyze my ring for Instagram', icon: '💍' },
  { text: 'Help me create product photos for my necklace', icon: '📿' },
  { text: 'I need a campaign shot for these earrings', icon: '✨' },
  { text: 'Create a video ad for my bracelet', icon: '⌚' },
];

export function AnalyzeTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const refTypeRef = useRef<'reference' | 'asset'>('reference');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, result]);

  // Image handling
  const addImages = useCallback(async (files: FileList | File[]) => {
    const newImages: ChatImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push({ base64: dataUrl.split(',')[1], mediaType: file.type, preview: dataUrl });

      if (!referenceImageUrl) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('context', 'analyze-ref');
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const json = await res.json();
          if (json.success) {
            const aiUrl = json.replicateUrl || json.url;
            setReferenceImageUrl(aiUrl);
            fetch('/api/remove-bg', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: aiUrl }),
            }).then(r => r.json()).then(bgJson => {
              if (bgJson.success && bgJson.data?.resultUrl) setReferenceImageUrl(bgJson.data.resultUrl);
            }).catch(() => {});
          }
        } catch { /* non-critical */ }
      }
    }
    setPendingImages(prev => [...prev, ...newImages]);
  }, [referenceImageUrl]);

  const removePendingImage = useCallback((i: number) => {
    setPendingImages(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  // Send message
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText && pendingImages.length === 0) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText || (pendingImages.length > 0 ? 'Analyze this jewelry piece and help me create amazing content.' : ''),
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingImages([]);
    setIsLoading(true);

    try {
      const payload = newMessages.map(m => ({
        role: m.role,
        content: m.content,
        rawJson: m.rawJson,
        images: m.images?.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
      }));

      const res = await fetch('/api/smart-analyze', {
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
        content: data.message as string,
        rawJson: json.rawJson,
        phase: data.phase as string,
      }]);

      if (data.ready && data.prompts) {
        setResult({
          analysis: (data.analysis as Record<string, string>) || {},
          recommendation: data.recommendation as AnalyzeResult['recommendation'],
          prompts: data.prompts as Record<string, string | null>,
          tips: (data.tips as string[]) || [],
          warnings: (data.warnings as string[]) || [],
        });
        toast.success('Prompts generated!');
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
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) { e.preventDefault(); addImages(files); }
  }, [addImages]);

  const reset = useCallback(() => {
    setMessages([]);
    setInput('');
    setPendingImages([]);
    setResult(null);
    setCurrentPhase(null);
    setReferenceImageUrl(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Eye className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Analyze & Generate</h2>
          <p className="text-sm text-muted-foreground">
            Upload a reference look + your jewelry. I&apos;ll recreate that style with your piece.
          </p>
        </div>
      </div>

      {/* Empty state — dual upload */}
      {messages.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Two upload zones side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Reference image */}
            <Card className="border-dashed border-2 hover:border-gold/40 transition-colors cursor-pointer"
              onClick={() => { refTypeRef.current = 'reference'; fileInputRef.current?.click(); }}>
              <CardContent className="py-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="font-medium mb-1 text-sm">Reference Image</p>
                <p className="text-xs text-muted-foreground">The look you want to copy</p>
                <p className="text-[10px] text-muted-foreground mt-1">A competitor ad, magazine shot, or mood image</p>
              </CardContent>
            </Card>

            {/* Jewelry asset */}
            <Card className="border-dashed border-2 hover:border-gold/40 transition-colors cursor-pointer"
              onClick={() => { refTypeRef.current = 'asset'; fileInputRef.current?.click(); }}>
              <CardContent className="py-8 text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="font-medium mb-1 text-sm">Your Jewelry</p>
                <p className="text-xs text-muted-foreground">Your actual piece to feature</p>
                <p className="text-[10px] text-muted-foreground mt-1">The ring, necklace, pendant, or bracelet</p>
              </CardContent>
            </Card>
          </div>

          {/* Image previews */}
          {pendingImages.length > 0 && (
            <div className="flex gap-3 p-3 rounded-xl bg-muted/50 border">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.preview} alt="Upload" className="h-20 w-20 object-cover rounded-lg border" />
                  <button onClick={(e) => { e.stopPropagation(); removePendingImage(i); }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button onClick={() => sendMessage('Here are my images — analyze both and help me recreate the reference style with my jewelry.')}
                className="gold-gradient text-white border-0 hover:opacity-90 self-center">
                <Send className="h-4 w-4 mr-2" /> Analyze
              </Button>
            </div>
          )}

          {/* How it works */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { step: '1', title: 'Reference', desc: 'Upload the look' },
              { step: '2', title: 'Jewelry', desc: 'Upload your piece' },
              { step: '3', title: 'Chat', desc: 'I ask key details' },
              { step: '4', title: 'Generate', desc: 'Get prompts + images' },
            ].map(s => (
              <div key={s.step} className="text-center p-2 rounded-xl bg-muted/50">
                <div className="h-6 w-6 rounded-full gold-gradient text-white text-[10px] font-bold flex items-center justify-center mx-auto mb-1">{s.step}</div>
                <p className="text-[10px] font-medium">{s.title}</p>
                <p className="text-[9px] text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick starts */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Or start by describing what you need:</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {QUICK_STARTS.map((qs, i) => (
                <motion.button key={i} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => sendMessage(qs.text)}
                  className="p-3 rounded-xl border bg-card hover:border-gold/30 hover:bg-gold/5 text-left text-sm transition-all">
                  <span className="mr-2">{qs.icon}</span>{qs.text}
                </motion.button>
              ))}
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files) { addImages(e.target.files); } e.target.value = ''; }} />
        </motion.div>
      )}

      {/* Phase indicator */}
      {currentPhase && !result && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">{PHASE_LABELS[currentPhase] || currentPhase}</span>
        </div>
      )}

      {/* Chat */}
      {messages.length > 0 && (
        <Card className="overflow-hidden">
          <div className="h-[380px] overflow-y-auto" ref={scrollRef}>
            <CardContent className="p-5 space-y-4">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'gold-gradient text-white' : 'bg-muted'
                  }`}>
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {msg.images.map((img, j) => (
                          <img key={j} src={img.preview} alt="Jewelry" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                        ))}
                      </div>
                    )}
                    <FormatMsg text={msg.content} isUser={msg.role === 'user'} />
                    {msg.phase && msg.role === 'assistant' && (
                      <span className="block text-[10px] mt-2 opacity-50">{PHASE_LABELS[msg.phase]}</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        className="h-1.5 w-1.5 rounded-full bg-gold" />
                    ))}
                    <span className="text-muted-foreground">Analyzing...</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Input */}
      {!result && (
        <div className="space-y-2">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex gap-2"
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addImages(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}>

            {messages.length === 0 && (
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ''; }} />
            )}

            <Button type="button" variant="outline" size="icon" className="shrink-0 h-auto"
              onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
            </Button>

            <textarea ref={textareaRef}
              placeholder={messages.length === 0 ? 'Describe your piece or paste an image...' : 'Answer the question or add more details...'}
              value={input} onChange={(e) => setInput(e.target.value)} onPaste={handlePaste}
              disabled={isLoading} rows={2}
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading) sendMessage(); } }}
            />

            <Button type="submit" disabled={isLoading && !input.trim() && pendingImages.length === 0}
              className="gold-gradient text-white border-0 hover:opacity-90 shrink-0 h-auto min-w-[48px]">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Paste, drop, or click the image button. Enter to send.</p>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-6">
                <RotateCcw className="h-3 w-3 mr-1" /> Start over
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Generated results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      {result.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-amber-800 dark:text-amber-200">{w}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <AnalysisCard analysis={result.analysis} />

            <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
              <h3 className="text-base font-semibold mb-1">Platform Recommendation</h3>
              <p className="text-sm text-muted-foreground">{result.recommendation.reason}</p>
            </div>

            <div className="space-y-4">
              {(Object.entries(result.prompts) as [PlatformId, string | null][])
                .filter(([, prompt]) => prompt)
                .map(([platform, prompt]) => (
                  <PromptCard
                    key={platform}
                    platform={platform}
                    prompt={prompt!}
                    isRecommended={platform === result.recommendation.primary}
                    referenceImageUrl={referenceImageUrl || undefined}
                  />
                ))}
            </div>

            <TipsCard tips={result.tips} />

            <Button variant="outline" onClick={reset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Analyze Another Piece
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
