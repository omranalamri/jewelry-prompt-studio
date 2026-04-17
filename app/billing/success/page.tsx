'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function BillingSuccessPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={32} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-md w-full text-center rounded-2xl border p-8"
        style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-gold)' }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 obs-gold-gradient">
          <CheckCircle2 className="h-8 w-8 text-black" />
        </div>
        <h1 className="obs-display text-3xl mb-2" style={{ color: 'var(--obs-text-primary)' }}>
          Payment <span className="obs-gold-gradient-text">confirmed</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--obs-text-secondary)' }}>
          Shukran — your credits are being added to your account. You&apos;ll receive a confirmation email shortly.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/studio/dashboard">
            <Button className="w-full obs-gold-gradient text-black border-0 h-11"
                    style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}>
              Go to Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
          <Link href="/studio/campaign/new">
            <Button variant="outline" className="w-full h-11"
                    style={{ borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-secondary)' }}>
              Start a Campaign
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
