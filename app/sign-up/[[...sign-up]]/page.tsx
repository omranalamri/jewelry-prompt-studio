'use client';

import { SignUp } from '@clerk/nextjs';
import { AmbientParticles } from '@/components/ui/ambient-particles';

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={24} />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="obs-display text-4xl mb-2" style={{ color: 'var(--obs-text-primary)' }}>
            Join <span className="obs-gold-gradient-text">Caleums</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--obs-text-secondary)' }}>
            Create your AI creative operations account
          </p>
        </div>
        <SignUp
          appearance={{
            variables: {
              colorPrimary: '#c9a84c',
              colorBackground: '#111009',
              colorText: '#f0ece0',
              colorInputBackground: '#171510',
              colorInputText: '#f0ece0',
              borderRadius: '10px',
              fontFamily: 'DM Sans, sans-serif',
            },
            elements: {
              card: { background: 'var(--obs-raised)', border: '1px solid var(--obs-border-default)' },
            },
          }}
        />
      </div>
    </div>
  );
}
