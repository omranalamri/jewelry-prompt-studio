'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PromptCard } from '@/components/shared/PromptCard';
import { PlatformId, ModuleType } from '@/types/platforms';
import { HistoryEntry } from '@/types/prompts';

const MODULE_LABELS: Record<ModuleType, string> = {
  analyze: 'Analyze & Generate',
  concept: 'Concept Studio',
  vision: 'Vision Engineer',
};

const MODULE_COLORS: Record<ModuleType, string> = {
  analyze: 'bg-blue-100 text-blue-800',
  concept: 'bg-purple-100 text-purple-800',
  vision: 'bg-green-100 text-green-800',
};

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ModuleType | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('module', filter);

    try {
      const res = await fetch(`/api/history?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  const getPrompts = (entry: HistoryEntry): Record<string, string | null> => {
    const result = entry.result as unknown as Record<string, unknown>;
    if ('prompts' in result && typeof result.prompts === 'object') {
      return result.prompts as Record<string, string | null>;
    }
    return result as Record<string, string | null>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Prompt History</h2>
        <p className="text-sm text-muted-foreground">
          Your saved prompt generation sessions.
        </p>
      </div>

      <div className="flex gap-2">
        {(['all', 'analyze', 'concept', 'vision'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : MODULE_LABELS[f]}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No saved sessions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate prompts in the studio and save them to see them here.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedId(expandedId === entry.id ? null : entry.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={MODULE_COLORS[entry.module]}>
                      {MODULE_LABELS[entry.module]}
                    </Badge>
                    <CardTitle className="text-base">
                      {entry.title || entry.input_context?.slice(0, 60) || 'Untitled'}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedId === entry.id && (
                <CardContent className="space-y-4">
                  {entry.input_context && (
                    <p className="text-sm text-muted-foreground">
                      {entry.input_context}
                    </p>
                  )}
                  {Object.entries(getPrompts(entry))
                    .filter(([, v]) => v)
                    .map(([platform, prompt]) => (
                      <PromptCard
                        key={platform}
                        platform={platform as PlatformId}
                        prompt={prompt!}
                      />
                    ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
