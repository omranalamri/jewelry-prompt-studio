'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Upload, Loader2, Download, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MODEL_PERSONAS } from '@/lib/creative/personas';

const JEWELRY_TYPES = [
  { id: 'ring', label: 'Ring', icon: '💍', desc: 'Show on finger' },
  { id: 'necklace', label: 'Necklace', icon: '📿', desc: 'Show on neck' },
  { id: 'earrings', label: 'Earrings', icon: '✨', desc: 'Show on ears' },
  { id: 'bracelet', label: 'Bracelet', icon: '⌚', desc: 'Show on wrist' },
  { id: 'pendant', label: 'Pendant', icon: '🔮', desc: 'Show on chest' },
  { id: 'watch', label: 'Watch', icon: '⏱️', desc: 'Show on wrist' },
];

const BACKGROUNDS = [
  { id: 'studio', label: 'Studio', desc: 'Professional soft lighting' },
  { id: 'lifestyle', label: 'Lifestyle', desc: 'Natural setting, warm light' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean neutral background' },
  { id: 'luxury', label: 'Luxury Dark', desc: 'Dark dramatic backdrop' },
];

export default function TryOnPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [jewelryType, setJewelryType] = useState('ring');
  const [personaId, setPersonaId] = useState('hands-elegant');
  const [background, setBackground] = useState('studio');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('context', 'tryon');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) setImageUrl(json.url);
    } catch { toast.error('Upload failed'); }
  }, []);

  const generate = useCallback(async () => {
    if (!imageUrl) { toast.error('Upload your jewelry first.'); return; }
    setIsLoading(true);

    const persona = MODEL_PERSONAS.find(p => p.id === personaId);
    const bg = BACKGROUNDS.find(b => b.id === background);

    try {
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jewelryImageUrl: imageUrl,
          jewelryType,
          modelPreference: persona?.promptFragment || 'elegant feminine hands',
          backgroundStyle: bg?.desc || 'professional studio lighting',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResults(prev => [json.data.resultUrl, ...prev]);
        toast.success(`Try-on generated! (${json.data.cost}, ${json.data.timeSeconds}s)`);
      } else {
        toast.error(json.error);
      }
    } catch { toast.error('Generation failed.'); }
    finally { setIsLoading(false); }
  }, [imageUrl, jewelryType, personaId, background]);

  const reset = useCallback(() => {
    setImageUrl(null); setImagePreview(null); setResults([]);
  }, []);

  const handPersonas = MODEL_PERSONAS.filter(p => p.category === 'hands-only' || p.category === 'female');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
          <Gem className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Virtual Try-On</h2>
          <p className="text-sm text-muted-foreground">See your jewelry on a hand, neck, or wrist — AI-powered.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-5">
          {/* Upload */}
          <Card className={`border-dashed border-2 cursor-pointer transition-colors ${imagePreview ? 'border-gold/40' : 'hover:border-gold/40'}`}
            onClick={() => fileInputRef.current?.click()}>
            <CardContent className="py-6 text-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Jewelry" className="h-32 w-32 object-cover rounded-xl mx-auto border" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Upload your jewelry piece</p>
                  <p className="text-xs text-muted-foreground">Click or drop an image</p>
                </>
              )}
            </CardContent>
          </Card>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }} />

          {/* Jewelry type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Jewelry Type</label>
            <div className="grid grid-cols-3 gap-2">
              {JEWELRY_TYPES.map(t => (
                <button key={t.id} onClick={() => setJewelryType(t.id)}
                  className={`p-2.5 rounded-lg border text-center transition-all text-xs ${jewelryType === t.id ? 'border-gold bg-gold/5' : 'hover:border-gold/30'}`}>
                  <span className="text-base block">{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model/hand */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hand / Model</label>
            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
              {handPersonas.map(p => (
                <button key={p.id} onClick={() => setPersonaId(p.id)}
                  className={`p-2 rounded-lg border text-left transition-all text-xs ${personaId === p.id ? 'border-gold bg-gold/5' : 'hover:border-gold/30'}`}>
                  <span className="text-base mr-1">{p.thumbnail}</span>
                  <span className="font-medium">{p.name}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.skinTone}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Background</label>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map(b => (
                <button key={b.id} onClick={() => setBackground(b.id)}
                  className={`p-2 rounded-lg border text-left transition-all text-xs ${background === b.id ? 'border-gold bg-gold/5' : 'hover:border-gold/30'}`}>
                  <span className="font-medium">{b.label}</span>
                  <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Button onClick={generate} disabled={isLoading || !imageUrl}
            className="w-full gold-gradient text-white border-0 hover:opacity-90 h-12 shadow-md">
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Try-On</>}
          </Button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Results</h3>
            {results.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs"><RotateCcw className="h-3 w-3 mr-1" /> Clear</Button>
            )}
          </div>

          {results.length === 0 && !isLoading && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Gem className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Generated try-ons will appear here</p>
              </CardContent>
            </Card>
          )}

          {isLoading && results.length === 0 && (
            <div className="aspect-square rounded-xl bg-muted/50 border flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Creating try-on...</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {results.map((url, i) => (
              <motion.div key={url} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="relative rounded-xl overflow-hidden border shadow-md group">
                  <img src={url} alt={`Try-on ${i + 1}`} className="w-full object-contain bg-black" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60">
                    <Button size="sm" variant="outline" className="flex-1 bg-white/90 text-black h-8 text-xs"
                      onClick={() => { const a = document.createElement('a'); a.href = url; a.download = `tryon-${i}.jpg`; a.click(); }}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                    <Button size="sm" variant="outline" className="bg-white/90 text-black h-8 text-xs"
                      onClick={() => { generate(); }}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
