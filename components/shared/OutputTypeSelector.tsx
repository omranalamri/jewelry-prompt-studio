'use client';

import { OutputType } from '@/types/platforms';

interface OutputTypeSelectorProps {
  value: OutputType;
  onChange: (type: OutputType) => void;
}

const options: { value: OutputType; label: string; icon: string }[] = [
  { value: 'still', label: 'Still Images', icon: '\u25C8' },
  { value: 'video', label: 'Video & Motion', icon: '\u25B6' },
  { value: 'both', label: 'Both', icon: '\u2726' },
];

export function OutputTypeSelector({ value, onChange }: OutputTypeSelectorProps) {
  return (
    <div className="flex rounded-lg border bg-muted p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
