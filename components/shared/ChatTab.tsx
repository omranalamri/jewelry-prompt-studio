'use client';

import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, ImagePlus, X } from 'lucide-react';
import React from 'react';

// Render chat messages with basic formatting: **bold**, bullet points, numbered lists
function FormattedMessage({ text, isUser }: { text: string; isUser: boolean }) {
  if (!text) return <>No response.</>;
  if (isUser) return <>{text}</>;

  // Split into paragraphs
  const paragraphs = text.split('\n\n').filter(Boolean);

  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        // Check if it's a list
        const lines = para.split('\n');
        const isBulletList = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('• ') || l.trim() === '');
        const isNumberedList = lines.every(l => /^\d+[\.\)]\s/.test(l.trim()) || l.trim() === '');

        if (isBulletList && lines.filter(l => l.trim()).length > 1) {
          return (
            <ul key={i} className="space-y-1">
              {lines.filter(l => l.trim()).map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-gold shrink-0 mt-0.5">•</span>
                  <span>{formatInline(line.replace(/^[-•]\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (isNumberedList && lines.filter(l => l.trim()).length > 1) {
          return (
            <ol key={i} className="space-y-1">
              {lines.filter(l => l.trim()).map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-gold shrink-0 font-medium">{j + 1}.</span>
                  <span>{formatInline(line.replace(/^\d+[\.\)]\s*/, ''))}</span>
                </li>
              ))}
            </ol>
          );
        }

        // Regular paragraph with inline formatting
        return <p key={i}>{formatInline(para.replace(/\n/g, ' '))}</p>;
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  if (!text) return null;
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// --- Types ---

interface ChatImage {
  base64: string;
  mediaType: string;
  preview: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  rawJson?: string;
  images?: ChatImage[];
  phase?: string;
}

interface ChatTabProps {
  apiEndpoint: string;
  header: ReactNode;
  emptyState: ReactNode;
  phaseLabels?: Record<string, string>;
  placeholder?: string;
  onResult?: (data: Record<string, unknown>) => void;
  resultRenderer?: (data: Record<string, unknown>, referenceImageUrl: string | null, reset: () => void) => ReactNode;
  isResultReady?: (data: Record<string, unknown>) => boolean;
}

// --- Component ---

export function ChatTab({
  apiEndpoint,
  header,
  emptyState,
  phaseLabels = {},
  placeholder = 'Type a message...',
  onResult,
  resultRenderer,
  isResultReady = (d) => !!d.ready,
}: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<ChatImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, resultData]);

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
          fd.append('context', 'chat-ref');
          const res = await fetch('/api/upload', { method: 'POST', body: fd });
          const json = await res.json();
          if (json.success) {
            // Use the Replicate URL for AI models (Blob URLs are blocked by external services)
            const aiUrl = json.replicateUrl || json.url;
            setReferenceImageUrl(aiUrl);

            // Auto-remove background for cleaner generation
            fetch('/api/remove-bg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: aiUrl }),
            }).then(r => r.json()).then(bgJson => {
              if (bgJson.success && bgJson.data?.resultUrl) {
                setReferenceImageUrl(bgJson.data.resultUrl);
              }
            }).catch(() => { /* keep original if bg removal fails */ });
          }
        } catch { /* non-critical */ }
      }
    }
    setPendingImages(prev => [...prev, ...newImages]);
  }, [referenceImageUrl]);

  const removePendingImage = useCallback((i: number) => {
    setPendingImages(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText && pendingImages.length === 0) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText || 'Here are my images.',
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingImages([]);
    setIsLoading(true);

    try {
      const payload = newMessages.map(m => ({
        role: m.role, content: m.content, rawJson: m.rawJson,
        images: m.images?.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
      }));

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      const json = await res.json();
      if (!json.success) { toast.error(json.error); setIsLoading(false); return; }

      const data = json.data as Record<string, unknown>;
      setCurrentPhase((data.phase as string) || null);

      // Handle both Claude (data.message) and Gemini fallback (data.content)
      const aiContent = (data.message || data.content || 'No response.') as string;
      setMessages(prev => [...prev, {
        role: 'assistant', content: aiContent,
        rawJson: json.rawJson, phase: data.phase as string,
      }]);

      if (isResultReady(data)) {
        setResultData(data);
        onResult?.(data);
        toast.success('Ready!');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, pendingImages, apiEndpoint, isResultReady, onResult]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) files.push(f); }
    }
    if (files.length > 0) { e.preventDefault(); addImages(files); }
  }, [addImages]);

  const reset = useCallback(() => {
    setMessages([]); setInput(''); setPendingImages([]);
    setResultData(null); setCurrentPhase(null); setReferenceImageUrl(null);
  }, []);

  return (
    <div className="space-y-6">
      {header}

      {/* Empty state */}
      {messages.length === 0 && emptyState}

      {/* Phase indicator */}
      {currentPhase && !resultData && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">{phaseLabels[currentPhase] || currentPhase}</span>
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
                          <img key={j} src={img.preview} alt="Upload" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                        ))}
                      </div>
                    )}
                    <FormattedMessage text={msg.content} isUser={msg.role === 'user'} />
                    {msg.phase && msg.role === 'assistant' && (
                      <span className="block text-[10px] mt-2 opacity-50">{phaseLabels[msg.phase] || msg.phase}</span>
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
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Input */}
      {!resultData && (
        <div className="space-y-2">
          <AnimatePresence>
            {pendingImages.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex gap-2 p-2 rounded-lg bg-muted/50 border">
                  {pendingImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.preview} alt="Pending" className="h-14 w-14 object-cover rounded-lg border" />
                      <button onClick={() => removePendingImage(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={(e) => { e.preventDefault(); if (!isLoading) sendMessage(); }} className="flex gap-2"
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addImages(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}>

            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ''; }} />

            <Button type="button" variant="outline" size="icon" className="shrink-0 h-auto"
              onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
            </Button>

            <textarea placeholder={messages.length === 0 ? placeholder : 'Continue...'}
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
            <p className="text-[10px] text-muted-foreground">Paste/drop images. Enter to send.</p>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-6">
                <RotateCcw className="h-3 w-3 mr-1" /> Start over
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {resultData && resultRenderer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {resultRenderer(resultData, referenceImageUrl, reset)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
