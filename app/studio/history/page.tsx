'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, ChevronDown, ChevronUp, Eye, MessageSquare, Wand2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PromptCard } from '@/components/shared/PromptCard';
import { PlatformId, ModuleType } from '@/types/platforms';
import { HistoryEntry } from '@/types/prompts';

const MODULE_CONFIG: Record<ModuleType, { label: string; icon: typeof Eye; color: string }> = {
  analyze: {
    label: 'Analyze & Generate',
    icon: Eye,
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  },
  concept: {
    label: 'Concept Studio',
    icon: MessageSquare,
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800',
  },
  vision: {
    label: 'Vision Engineer',
    icon: Wand2,
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  },
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
      // show empty state
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
        toast.success('Entry deleted');
      }
    } catch {
      toast.error('Failed to delete');
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Prompt History</h2>
            <p className="text-sm text-muted-foreground">
              Your saved prompt generation sessions.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'analyze', 'concept', 'vision'] as const).map((f) => (
          <motion.button
            key={f}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
              filter === f
                ? 'gold-gradient text-white border-transparent shadow-sm'
                : 'bg-card hover:bg-accent border-border'
            }`}
          >
            {f === 'all' ? 'All' : MODULE_CONFIG[f].label}
          </motion.button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="font-medium mb-1">No saved sessions yet</p>
            <p className="text-sm text-muted-foreground">
              Generate prompts in the studio and save them to see them here.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {entries.map((entry, i) => {
              const cfg = MODULE_CONFIG[entry.module];
              const Icon = cfg.icon;
              const isExpanded = expandedId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`transition-all duration-300 ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${cfg.color}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                          <CardTitle className="text-base font-medium">
                            {entry.title || entry.input_context?.slice(0, 60) || 'Untitled'}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {new Date(entry.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="space-y-4 pt-0">
                            {entry.input_context && (
                              <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg">
                                &ldquo;{entry.input_context}&rdquo;
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
