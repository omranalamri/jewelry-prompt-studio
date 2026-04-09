'use client';

import { motion } from 'framer-motion';
import { MODEL_PERSONAS, ModelPersona } from '@/lib/creative/personas';

interface PersonaSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
  filter?: 'female' | 'male' | 'hands-only' | null;
}

export function PersonaSelector({ selected, onSelect, filter }: PersonaSelectorProps) {
  const personas = filter
    ? MODEL_PERSONAS.filter(p => p.category === filter)
    : MODEL_PERSONAS;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Model Persona</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {personas.map((persona) => (
          <motion.button
            key={persona.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(persona.id)}
            className={`p-3 rounded-xl border text-left transition-all duration-200 ${
              selected === persona.id
                ? 'border-gold bg-gold/5 shadow-sm'
                : 'border-border hover:border-gold/30 bg-card'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{persona.thumbnail}</span>
              <span className="text-sm font-medium">{persona.name}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {persona.style} · {persona.skinTone}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1 leading-tight">
              {persona.nailDescription}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
