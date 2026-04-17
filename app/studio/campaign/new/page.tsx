'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BriefScorer } from '@/components/campaign/brief-scorer';
import { AmbientParticles } from '@/components/ui/ambient-particles';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ChevronLeft } from 'lucide-react';
import type { CampaignBrief } from '@/lib/quality/scorer';
import Link from 'next/link';

const JEWELRY_TYPES = ['ring', 'necklace', 'bracelet', 'earrings', 'pendant', 'watch'];
const OBJECTIVES = ['Brand Awareness', 'Engagement', 'Conversion', 'Traffic', 'Launch'];
const CHANNELS = ['Instagram Feed', 'Instagram Reels', 'Instagram Stories', 'Facebook', 'TikTok', 'Google', 'Email'];
const LANGUAGES = ['English', 'Arabic', 'French'];
const CULTURAL = ['None', 'Ramadan', 'Eid al-Fitr', 'Eid al-Adha', 'UAE National Day', 'DSF', 'Wedding Season'];
const SHOOT_STYLES = ['Lifestyle', 'Editorial', 'Dramatic', 'Flat Lay'];

export default function NewCampaignPage() {
  const [brief, setBrief] = useState<CampaignBrief>({
    channels: [],
    languages: ['English'],
  });

  const update = (patch: Partial<CampaignBrief>) => setBrief(prev => ({ ...prev, ...patch }));
  const toggleArr = (key: 'channels' | 'languages', value: string) => {
    const current = brief[key] || [];
    update({
      [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
    } as Partial<CampaignBrief>);
  };

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--obs-void)' }}>
      <AmbientParticles count={24} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            href="/studio/campaign"
            className="inline-flex items-center gap-1.5 text-xs mb-3 hover:underline"
            style={{ color: 'var(--obs-text-secondary)' }}
          >
            <ChevronLeft className="h-3 w-3" /> Back to Campaigns
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6" style={{ color: 'var(--obs-gold)' }} />
            <h1 className="obs-display text-4xl" style={{ color: 'var(--obs-text-primary)' }}>
              <span className="obs-gold-gradient-text">Campaign</span> Factory
            </h1>
          </div>
          <p style={{ color: 'var(--obs-text-secondary)' }}>
            Stage 1 — Brief Intake. Write your brief. Watch it score in real-time.
          </p>
        </motion.div>

        {/* Stage indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto">
          {['Brief', 'Product & Model', 'Research', 'Creative Direction', 'Copy', 'Storyboard', 'Quality Gate'].map((stage, i) => (
            <div key={stage} className="flex items-center gap-2 flex-shrink-0">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
                style={{
                  background: i === 0 ? 'rgba(201,168,76,0.1)' : 'transparent',
                  borderColor: i === 0 ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                  color: i === 0 ? 'var(--obs-gold)' : 'var(--obs-text-muted)',
                }}
              >
                <span className="obs-mono">{i + 1}</span>
                <span>{stage}</span>
              </div>
              {i < 6 && <div className="w-3 h-px" style={{ background: 'var(--obs-border-default)' }} />}
            </div>
          ))}
        </div>

        {/* Form + Live Scorer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form fields */}
          <div className="lg:col-span-2 space-y-4">
            <Field
              label="Campaign Name"
              required
              value={brief.name || ''}
              onChange={v => update({ name: v })}
              placeholder="Ramadan Diamond Collection"
            />

            <SelectField
              label="Objective"
              required
              value={brief.objective || ''}
              onChange={v => update({ objective: v })}
              options={OBJECTIVES}
            />

            <TextAreaField
              label="Target Audience"
              required
              value={brief.targetAudience || ''}
              onChange={v => update({ targetAudience: v })}
              placeholder="Women 28-45 in UAE and KSA, luxury shoppers with affinity for heritage craftsmanship..."
            />

            <TextAreaField
              label="Key Message"
              required
              value={brief.keyMessage || ''}
              onChange={v => update({ keyMessage: v })}
              placeholder="The diamond that becomes an heirloom..."
              maxLength={280}
            />

            <Field
              label="Call to Action"
              value={brief.callToAction || ''}
              onChange={v => update({ callToAction: v })}
              placeholder="Discover the collection"
            />

            <SelectField
              label="Jewelry Type"
              required
              value={brief.jewelryType || ''}
              onChange={v => update({ jewelryType: v })}
              options={JEWELRY_TYPES}
            />

            <SelectField
              label="Shoot Style"
              value={brief.shootStyle || ''}
              onChange={v => update({ shootStyle: v })}
              options={SHOOT_STYLES}
            />

            <ChipsField
              label="Channels"
              selected={brief.channels || []}
              onToggle={v => toggleArr('channels', v)}
              options={CHANNELS}
            />

            <ChipsField
              label="Languages"
              selected={brief.languages || []}
              onToggle={v => toggleArr('languages', v)}
              options={LANGUAGES}
            />

            <SelectField
              label="Cultural Context"
              value={brief.culturalContext || ''}
              onChange={v => update({ culturalContext: v })}
              options={CULTURAL}
            />
          </div>

          {/* Live Scorer — sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              <BriefScorer brief={brief} />
              <Button
                className="w-full obs-gold-gradient text-black border-0 h-11"
                style={{ fontFamily: 'var(--font-obsidian-body)', fontWeight: 500 }}
                disabled={!brief.name || !brief.objective || !brief.jewelryType}
              >
                Next — Product & Model <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Form primitives ---

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--obs-text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--obs-gold)' }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 text-sm rounded-lg"
        style={{
          background: 'var(--obs-raised)',
          color: 'var(--obs-text-primary)',
          border: '1px solid var(--obs-border-default)',
          fontFamily: 'var(--font-obsidian-body)',
        }}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, required, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; maxLength?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--obs-text-secondary)' }}>
          {label} {required && <span style={{ color: 'var(--obs-gold)' }}>*</span>}
        </label>
        {maxLength && (
          <span className="text-[10px] obs-mono" style={{ color: 'var(--obs-text-muted)' }}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="w-full px-4 py-2.5 text-sm rounded-lg resize-none"
        style={{
          background: 'var(--obs-raised)',
          color: 'var(--obs-text-primary)',
          border: '1px solid var(--obs-border-default)',
          fontFamily: 'var(--font-obsidian-body)',
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--obs-text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--obs-gold)' }}>*</span>}
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="text-xs px-3 py-1.5 rounded-full border capitalize transition-all"
            style={{
              background: value === opt ? 'rgba(201,168,76,0.1)' : 'var(--obs-raised)',
              borderColor: value === opt ? 'var(--obs-gold)' : 'var(--obs-border-default)',
              color: value === opt ? 'var(--obs-gold)' : 'var(--obs-text-secondary)',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipsField({ label, selected, onToggle, options }: { label: string; selected: string[]; onToggle: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--obs-text-secondary)' }}>
        {label}
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: active ? 'rgba(201,168,76,0.1)' : 'var(--obs-raised)',
                borderColor: active ? 'var(--obs-gold)' : 'var(--obs-border-default)',
                color: active ? 'var(--obs-gold)' : 'var(--obs-text-secondary)',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
