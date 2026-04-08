'use client';

import { motion } from 'framer-motion';
import { Image, Video, Layers } from 'lucide-react';
import { OutputType } from '@/types/platforms';

interface OutputTypeSelectorProps {
  value: OutputType;
  onChange: (type: OutputType) => void;
}

const options: { value: OutputType; label: string; icon: typeof Image }[] = [
  { value: 'still', label: 'Still Images', icon: Image },
  { value: 'video', label: 'Video & Motion', icon: Video },
  { value: 'both', label: 'Both', icon: Layers },
];

export function OutputTypeSelector({ value, onChange }: OutputTypeSelectorProps) {
  return (
    <div className="flex rounded-xl border bg-muted/30 p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            value === opt.value
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {value === opt.value && (
            <motion.div
              layoutId="output-selector"
              className="absolute inset-0 bg-card shadow-sm rounded-lg border"
              transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            <opt.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.value === 'both' ? 'Both' : opt.label.split(' ')[0]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
