'use client';

import { motion } from 'framer-motion';
import { Sparkles, Download } from 'lucide-react';
import { PlatformId } from '@/types/platforms';
import { PlatformBadge } from './PlatformBadge';
import { CopyButton } from './CopyButton';
import { GenerateButton } from './GenerateButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface PromptCardProps {
  platform: PlatformId;
  prompt: string;
  isRecommended?: boolean;
  onSave?: () => void;
  showGenerate?: boolean;
}

export function PromptCard({ platform, prompt, isRecommended, onSave, showGenerate = true }: PromptCardProps) {
  const handleExport = () => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-prompt.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${platform} prompt`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${isRecommended ? 'border-gold/40 shadow-md pulse-glow' : 'hover:border-gold/20'}`}>
        {isRecommended && (
          <div className="absolute top-0 left-0 right-0 h-0.5 gold-gradient" />
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <PlatformBadge platform={platform} showSpecialty />
            <div className="flex items-center gap-2">
              {isRecommended && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-gold-dark dark:text-gold-light bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <CopyButton text={prompt} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative group">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-5 rounded-xl leading-relaxed border">
              {prompt}
            </pre>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {prompt.split(/\s+/).length} words
            </span>
            {onSave && (
              <Button variant="ghost" size="sm" onClick={onSave} className="text-xs h-7">
                Save to history
              </Button>
            )}
          </div>

          {showGenerate && (
            <>
              <Separator />
              <GenerateButton prompt={prompt} platform={platform} />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
