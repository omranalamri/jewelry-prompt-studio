'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Sparkles, CreditCard, Zap, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const PACKS = [
  {
    key: 'starter' as const,
    name: 'Starter',
    aed: 450,
    highlight: false,
    features: [
      '450 Gemini 3 Pro images',
      '30 Veo 3.1 video seconds',
      '3,000 chat turns (Haiku)',
      '50 final prompt syntheses (Sonnet)',
      'All 10 AI agents',
      'UAE compliance automation',
    ],
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    aed: 1850,
    highlight: true,
    features: [
      '2,000 Gemini 3 Pro images',
      '100 Veo 3.1 video seconds',
      '15,000 chat turns (Haiku)',
      '200 final prompt syntheses (Sonnet)',
      'Creatomate video stitching',
      'Priority generation queue',
    ],
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    aed: 8000,
    highlight: false,
    features: [
      '10,000 Gemini 3 Pro images',
      '300 Veo 3.1 video seconds',
      '80,000 chat turns (Haiku)',
      '1,000 final prompt syntheses (Sonnet)',
      'API access + webhooks',
      'Dedicated success manager',
    ],
  },
];

const TOPUPS = [
  { key: 'topup_100' as const, aed: 100, images: 100, videos: 0, label: 'Quick' },
  { key: 'topup_250' as const, aed: 250, images: 250, videos: 10, label: 'Medium' },
  { key: 'topup_500' as const, aed: 500, images: 500, videos: 30, label: 'Large' },
  { key: 'topup_1000' as const, aed: 1000, images: 1000, videos: 70, label: 'Pro' },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(body: Record<string, unknown>, id: string) {
    setLoading(id);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success && json.data.redirectUrl) {
        toast.success('Redirecting to Ziina...');
        window.location.href = json.data.redirectUrl;
      } else {
        toast.error(json.error || 'Checkout failed');
        setLoading(null);
      }
    } catch { toast.error('Checkout failed'); setLoading(null); }
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={32} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4"
               style={{ borderColor: 'var(--obs-border-gold)', background: 'rgba(201,168,76,0.05)' }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--obs-gold)' }} />
            <span className="text-xs obs-mono" style={{ color: 'var(--obs-gold)' }}>
              Powered by Ziina — Pay in AED
            </span>
          </div>
          <h1 className="obs-display text-5xl mb-3" style={{ color: 'var(--obs-text-primary)' }}>
            <span className="obs-gold-gradient-text">Credits</span> that create
          </h1>
          <p className="text-lg" style={{ color: 'var(--obs-text-secondary)' }}>
            Gemini 3 Pro images + Veo 3.1 videos + BiRefNet BG removal. All best-in-class.
          </p>
        </motion.div>

        {/* What's included — unit costs transparency */}
        <div className="rounded-2xl border p-5 mb-8"
             style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--obs-text-muted)' }}>
            Two-tier AI: cheap chat for questions, premium models for the final shot
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 mt-0.5" style={{ color: 'var(--obs-gold)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>Chat turns (Haiku 4.5)</p>
                <p className="text-xs" style={{ color: 'var(--obs-text-muted)' }}>Fast Q&amp;A while we gather the brief — pennies per turn.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5" style={{ color: 'var(--obs-gold)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>Final synthesis (Sonnet 4.5 + Gemini 3 Pro)</p>
                <p className="text-xs" style={{ color: 'var(--obs-text-muted)' }}>Quality model writes the prompt, Gemini renders the image.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5" style={{ color: 'var(--obs-gold)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--obs-text-primary)' }}>Veo 3.1 video</p>
                <p className="text-xs" style={{ color: 'var(--obs-text-muted)' }}>1080p cinematic. Sparkle physics.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main packs */}
        <h2 className="obs-display text-2xl mb-4" style={{ color: 'var(--obs-text-primary)' }}>Main packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 obs-stagger mb-12">
          {PACKS.map((p) => (
            <motion.div
              key={p.key}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl border p-6 flex flex-col"
              style={{
                background: p.highlight ? 'rgba(201,168,76,0.04)' : 'var(--obs-raised)',
                borderColor: p.highlight ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                boxShadow: p.highlight ? 'var(--obs-shadow-gold)' : undefined,
              }}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full obs-gold-gradient text-black text-xs">
                  Most Popular
                </div>
              )}

              <h3 className="obs-display text-2xl mb-1" style={{ color: 'var(--obs-text-primary)' }}>
                {p.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="obs-display text-4xl" style={{ color: p.highlight ? 'var(--obs-gold)' : 'var(--obs-text-primary)' }}>
                  AED {p.aed.toLocaleString()}
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--obs-text-muted)' }}>
                ~${(p.aed / 3.67).toFixed(0)} USD equivalent
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--obs-text-secondary)' }}>
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--obs-gold)' }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => checkout({ pack: p.key }, `pack-${p.key}`)}
                disabled={loading !== null}
                className="w-full h-11"
                style={{
                  background: p.highlight ? 'var(--obs-gold)' : 'var(--obs-raised)',
                  color: p.highlight ? 'black' : 'var(--obs-text-primary)',
                  border: p.highlight ? 'none' : '1px solid var(--obs-border-default)',
                  fontFamily: 'var(--font-obsidian-body)',
                  fontWeight: 500,
                }}
              >
                {loading === `pack-${p.key}` ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1.5" />
                )}
                Buy {p.name}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Top-ups */}
        <div className="rounded-2xl border p-6"
             style={{ background: 'var(--obs-raised)', borderColor: 'var(--obs-border-default)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="obs-display text-2xl" style={{ color: 'var(--obs-text-primary)' }}>
                Need more? <span className="obs-gold-gradient-text">Top up anytime.</span>
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--obs-text-secondary)' }}>
                Running low on credits? Add more without switching plans.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TOPUPS.map((t) => (
              <button
                key={t.key}
                onClick={() => checkout({ topup: t.key }, `topup-${t.key}`)}
                disabled={loading !== null}
                className="rounded-xl border p-4 text-left transition-all hover:scale-[1.02]"
                style={{
                  background: 'var(--obs-elevated)',
                  borderColor: 'var(--obs-border-default)',
                  cursor: loading !== null ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--obs-text-muted)' }}>
                    {t.label}
                  </span>
                  {loading === `topup-${t.key}` && (
                    <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--obs-gold)' }} />
                  )}
                </div>
                <p className="obs-display text-2xl" style={{ color: 'var(--obs-gold)' }}>
                  AED {t.aed}
                </p>
                <div className="mt-2 space-y-0.5 text-[10px]" style={{ color: 'var(--obs-text-secondary)' }}>
                  <p>{t.images} images</p>
                  {t.videos > 0 && <p>{t.videos} video seconds</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-10 text-center">
          <p className="text-xs mb-3" style={{ color: 'var(--obs-text-muted)' }}>
            Secure payment via Ziina • UAE Central Bank regulated
          </p>
          <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--obs-text-secondary)' }}>
            <span>Apple Pay</span>
            <span>•</span>
            <span>Visa / Mastercard</span>
            <span>•</span>
            <span>Bank transfer</span>
            <span>•</span>
            <span>Ziina wallet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
