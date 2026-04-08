'use client';

import { motion } from 'framer-motion';
import { Camera, Gem, Sun, Palette, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface AnalysisCardProps {
  analysis: Record<string, string>;
}

const config: Record<string, { label: string; icon: typeof Camera }> = {
  reference: { label: 'Reference Image', icon: Camera },
  assets: { label: 'Jewelry Assets', icon: Gem },
  lighting: { label: 'Lighting', icon: Sun },
  mood: { label: 'Mood & Aesthetic', icon: Palette },
  strategy: { label: 'Creative Strategy', icon: Lightbulb },
};

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const entries = Object.entries(analysis).filter(([, v]) => v);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {entries.map(([key, value], i) => {
            const cfg = config[key] || { label: key, icon: Camera };
            const Icon = cfg.icon;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-gold" />
                  <h4 className="text-sm font-medium">{cfg.label}</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">{value}</p>
                {i < entries.length - 1 && <Separator className="mt-5" />}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
