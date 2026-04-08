'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, RotateCcw, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useConcept } from '@/hooks/useConcept';
import { PromptCard } from '@/components/shared/PromptCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PlatformId } from '@/types/platforms';

const QUICK_TAGS = {
  Type: ['Ring', 'Necklace', 'Earrings', 'Bracelet', 'Watch', 'Full Set'],
  Mood: ['Luxury Editorial', 'Romantic', 'Bold & Modern', 'Minimal Clean', 'Festive', 'Bridal'],
  Setting: ['Studio White', 'Dark Dramatic', 'Outdoor Natural', 'Lifestyle Scene', 'Abstract'],
  Metal: ['Yellow Gold', 'White Gold', 'Rose Gold', 'Silver', 'Platinum'],
  Feature: ['No Model', 'Female Model', 'Hands Only', 'Lifestyle Context'],
};

export function ConceptTab() {
  const {
    messages,
    inputText,
    isLoading,
    latestPrompts,
    refinedConcept,
    recommendation,
    recommendationReason,
    setInput,
    sendMessage,
    reset,
  } = useConcept();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) sendMessage();
  };

  const handleTagClick = (tag: string) => {
    setInput(inputText ? `${inputText}, ${tag.toLowerCase()}` : tag.toLowerCase());
  };

  const handleSave = async () => {
    if (!latestPrompts) return;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'concept',
          title: refinedConcept?.slice(0, 60) || 'Concept Studio',
          inputContext: refinedConcept,
          result: { prompts: latestPrompts, concept: refinedConcept },
        }),
      });
      const json = await res.json();
      if (json.success) toast.success('Saved to history');
      else toast.error('Failed to save');
    } catch {
      toast.error('Failed to save');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Concept Studio</h2>
            <p className="text-sm text-muted-foreground">
              Describe your creative concept and refine it through conversation.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <p className="text-sm font-medium">Quick tags to get started:</p>
            {Object.entries(QUICK_TAGS).map(([category, tags]) => (
              <div key={category} className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground w-16 shrink-0 font-medium">{category}</span>
                {tags.map((tag) => (
                  <motion.button
                    key={tag}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTagClick(tag)}
                    className="text-xs px-3 py-1.5 rounded-full border hover:bg-gold/5 hover:border-gold/30 hover:text-gold-dark dark:hover:text-gold-light transition-all duration-200"
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {messages.length > 0 && (
        <Card className="overflow-hidden">
          <div className="h-[420px] overflow-y-auto" ref={scrollRef}>
            <CardContent className="p-5 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'gold-gradient text-white'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
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

      <form onSubmit={handleSubmit} className="flex gap-3">
        <Textarea
          placeholder={
            messages.length === 0
              ? 'Describe your jewelry marketing concept...'
              : 'Continue the conversation...'
          }
          value={inputText}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          rows={2}
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (inputText.trim() && !isLoading) sendMessage();
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            size="lg"
            className="gold-gradient text-white border-0 hover:opacity-90 h-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {messages.length > 0 && !latestPrompts && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Start over
          </Button>
        </div>
      )}

      <AnimatePresence>
        {refinedConcept && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl bg-gold/5 border border-gold/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold">Refined Concept</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{refinedConcept}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {recommendation && recommendationReason && (
        <div className="p-5 rounded-xl bg-gold/5 border border-gold/20">
          <h3 className="text-base font-semibold mb-1">Platform Recommendation</h3>
          <p className="text-sm text-muted-foreground">{recommendationReason}</p>
        </div>
      )}

      {latestPrompts && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save to history
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              New concept
            </Button>
          </div>
          {(Object.entries(latestPrompts) as [PlatformId, string | null][])
            .filter(([, prompt]) => prompt)
            .map(([platform, prompt]) => (
              <PromptCard
                key={platform}
                platform={platform}
                prompt={prompt!}
                isRecommended={platform === recommendation}
              />
            ))}
        </div>
      )}
    </div>
  );
}
