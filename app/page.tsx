'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Eye, MessageSquare, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Eye,
    title: 'Analyze & Generate',
    description: 'Upload reference images and jewelry assets. AI analyzes composition, lighting, and mood to create platform-optimized prompts.',
  },
  {
    icon: MessageSquare,
    title: 'Concept Studio',
    description: 'Describe your creative vision. Refine it through AI conversation until you have production-ready prompts.',
  },
  {
    icon: Wand2,
    title: 'Vision Engineer',
    description: 'Upload any image, describe your transformation. Get precise prompts to execute that exact vision.',
  },
];

const platforms = ['Midjourney', 'DALL-E 3', 'Runway Gen-3', 'Kling / Sora'];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center max-w-3xl mx-auto z-10"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
              AI-Powered Creative Studio
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="gold-gradient-text">Jewelry Prompt</span>
            <br />
            <span>Engineering Studio</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Transform your jewelry marketing with AI. Analyze references, develop concepts,
            and generate production-ready prompts for every major AI platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/studio">
              <Button size="lg" className="gold-gradient text-white border-0 hover:opacity-90 px-8 h-12 text-base shadow-lg">
                Open Studio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Floating platform badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap gap-3 justify-center mt-12"
        >
          {platforms.map((platform) => (
            <span
              key={platform}
              className="text-xs px-4 py-2 rounded-full border bg-card/50 text-muted-foreground backdrop-blur-sm"
            >
              {platform}
            </span>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Three powerful modules</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Each designed for a different stage of the creative process.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <div className="group relative p-8 rounded-2xl border bg-card/60 backdrop-blur-sm hover:shadow-lg hover:border-gold/30 transition-all duration-300">
                  <div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center mb-5">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Jewelry Prompt Studio
          </span>
          <span className="text-xs text-muted-foreground">
            Powered by Claude AI
          </span>
        </div>
      </footer>
    </div>
  );
}
