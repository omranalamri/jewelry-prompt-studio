'use client';

import { useRef, useEffect } from 'react';
import { useConcept } from '@/hooks/useConcept';
import { PromptCard } from '@/components/shared/PromptCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Concept Studio</h2>
        <p className="text-sm text-muted-foreground">
          Describe your creative concept and refine it through conversation.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Quick tags to get started:</p>
          {Object.entries(QUICK_TAGS).map(([category, tags]) => (
            <div key={category} className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{category}</span>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <Card>
          <ScrollArea className="h-[400px]" ref={scrollRef}>
            <CardContent className="p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}
            </CardContent>
          </ScrollArea>
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
          <Button type="submit" disabled={isLoading || !inputText.trim()}>
            Send
          </Button>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      </form>

      {refinedConcept && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
          <span className="font-medium">Refined Concept: </span>
          {refinedConcept}
        </div>
      )}

      {recommendation && recommendationReason && (
        <div>
          <h3 className="text-lg font-semibold mb-1">Platform Recommendation</h3>
          <p className="text-sm text-muted-foreground mb-4">{recommendationReason}</p>
        </div>
      )}

      {latestPrompts && (
        <div className="space-y-4">
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
