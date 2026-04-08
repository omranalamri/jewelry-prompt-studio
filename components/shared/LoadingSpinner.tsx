'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function LoadingSpinner({ message = 'Generating...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-5"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-2 border-muted border-t-gold"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-gold" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            className="h-1.5 w-1.5 rounded-full bg-gold"
          />
        ))}
      </div>
    </motion.div>
  );
}
