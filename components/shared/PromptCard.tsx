'use client';

import { PlatformId } from '@/types/platforms';
import { PlatformBadge } from './PlatformBadge';
import { CopyButton } from './CopyButton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PromptCardProps {
  platform: PlatformId;
  prompt: string;
  isRecommended?: boolean;
}

export function PromptCard({ platform, prompt, isRecommended }: PromptCardProps) {
  return (
    <Card className={isRecommended ? 'border-amber-300 shadow-md' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <PlatformBadge platform={platform} showSpecialty />
          <div className="flex items-center gap-2">
            {isRecommended && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                Recommended
              </span>
            )}
            <CopyButton text={prompt} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg leading-relaxed">
          {prompt}
        </pre>
      </CardContent>
    </Card>
  );
}
