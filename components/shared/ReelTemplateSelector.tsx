'use client';

import { motion } from 'framer-motion';
import { Film, Zap, Clapperboard } from 'lucide-react';
import { REEL_TEMPLATES, ReelTemplate } from '@/lib/creative/reel-structure';

interface ReelTemplateSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

const icons: Record<string, typeof Film> = {
  'hook-hero-detail': Zap,
  'transformation': Film,
  'editorial-story': Clapperboard,
};

export function ReelTemplateSelector({ selected, onSelect }: ReelTemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Reel Template</label>
      <div className="grid gap-3">
        {REEL_TEMPLATES.map((template) => {
          const Icon = icons[template.id] || Film;
          return (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(template.id)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                selected === template.id
                  ? 'border-gold bg-gold/5 shadow-sm'
                  : 'border-border hover:border-gold/30 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${selected === template.id ? 'gold-gradient' : 'bg-muted'}`}>
                  <Icon className={`h-4 w-4 ${selected === template.id ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <span className="text-sm font-medium block">{template.name}</span>
                  <span className="text-xs text-muted-foreground">{template.platform} · {template.aspectRatio}</span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {template.scenes.map((scene) => (
                  <span key={scene.id} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {scene.name} ({scene.duration}s)
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
