'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function BillingCancelPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={24} />
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full text-center rounded-2xl border p-8"
        style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}
      >
        <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--obs-text-muted)' }} />
        <h1 className="obs-display text-3xl mb-2" style={{ color: 'var(--obs-text-primary)' }}>
          Payment canceled
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--obs-text-secondary)' }}>
          No charges were made. You can try again anytime.
        </p>
        <Link href="/billing">
          <Button className="w-full h-11"
                  style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)', color: 'var(--obs-text-primary)' }}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Pricing
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
