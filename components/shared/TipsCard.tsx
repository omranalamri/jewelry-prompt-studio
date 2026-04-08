'use client';

import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TipsCardProps {
  tips: string[];
}

export function TipsCard({ tips }: TipsCardProps) {
  if (tips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="border-gold/20 bg-gold/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-gold" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3 text-sm"
              >
                <span className="text-gold font-bold shrink-0">{i + 1}.</span>
                <span className="leading-relaxed text-muted-foreground">{tip}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
