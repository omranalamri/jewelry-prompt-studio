'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Palette, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrandPage() {
  const [name, setName] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');
  const [tone, setTone] = useState('');
  const [mood, setMood] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brand').then(r => r.json()).then(json => {
      if (json.success && json.data) {
        const d = json.data;
        setName(d.name || '');
        setColors(d.colors || []);
        setTone(d.tone || '');
        setMood(d.mood || '');
        setGuidelines(d.guidelines_text || '');
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colors, tone, mood, guidelinesText: guidelines }),
      });
      const json = await res.json();
      if (json.success) toast.success('Brand guidelines saved!');
      else toast.error('Failed to save.');
    } catch { toast.error('Failed to save.'); }
    finally { setIsSaving(false); }
  }, [name, colors, tone, mood, guidelines]);

  const addColor = useCallback(() => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors(prev => [...prev, newColor.trim()]);
      setNewColor('');
    }
  }, [newColor, colors]);

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-10 w-64 bg-muted rounded" /><div className="h-40 bg-muted rounded" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Palette className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Brand Guidelines</h2>
          <p className="text-sm text-muted-foreground">Set your brand identity — auto-applied to every generation.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Brand Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Brand Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your jewelry brand name"
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Brand Colors</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {colors.map((c, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full border bg-muted flex items-center gap-1.5">
                  {c}
                  <button onClick={() => setColors(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                placeholder="e.g. warm gold, deep black, blush pink"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-background" />
              <Button variant="outline" size="sm" onClick={addColor}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Brand Tone</label>
            <input type="text" value={tone} onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. luxury, approachable, modern, timeless"
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Default Mood</label>
            <div className="flex flex-wrap gap-2">
              {['Luxury Editorial', 'Romantic', 'Bold Modern', 'Minimal Clean', 'Dark Dramatic', 'Warm Lifestyle'].map(m => (
                <button key={m} onClick={() => setMood(m)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${mood === m ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Brand Guidelines / Notes</label>
            <textarea value={guidelines} onChange={(e) => setGuidelines(e.target.value)}
              placeholder="Any additional brand rules, photography style preferences, dos and don'ts..."
              rows={4}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background resize-none" />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full gold-gradient text-white border-0 hover:opacity-90">
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Brand Guidelines'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
