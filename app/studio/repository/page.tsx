'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Plus, Trash2, Search, Tag, X, Upload, Gem, Palette, Camera, User, Sparkles, Image as ImageIcon, Play, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RepoItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[];
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: FolderOpen },
  { id: 'jewelry', label: 'Jewelry', icon: Gem },
  { id: 'reference', label: 'References', icon: Camera },
  { id: 'mood', label: 'Mood Boards', icon: Palette },
  { id: 'model', label: 'Models', icon: User },
  { id: 'generated', label: 'Generated', icon: Sparkles },
  { id: 'scene', label: 'Scenes', icon: ImageIcon },
];

export default function RepositoryPage() {
  const [items, setItems] = useState<RepoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RepoItem | null>(null);
  const [lightboxRating, setLightboxRating] = useState<number | null>(null);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('jewelry');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/repository?${params}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch { /* show empty */ }
    finally { setIsLoading(false); }
  }, [category, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleFileSelect = useCallback((file: File) => {
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
    setShowUpload(true);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error('Please provide a title and image.');
      return;
    }

    setIsUploading(true);
    try {
      // Upload image to blob
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('context', 'repository');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      const uploadJson = await uploadRes.json();

      if (!uploadJson.success) {
        toast.error('Image upload failed.');
        return;
      }

      // Save to repository
      const res = await fetch('/api/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: uploadCategory,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          imageUrl: uploadJson.url,
          tags: uploadTags.split(',').map((t: string) => t.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success('Added to repository');
        setShowUpload(false);
        setUploadTitle('');
        setUploadDescription('');
        setUploadTags('');
        setUploadPreview(null);
        setUploadFile(null);
        fetchItems();
      }
    } catch {
      toast.error('Failed to save.');
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, uploadTitle, uploadCategory, uploadDescription, uploadTags, fetchItems]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/repository/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast.success('Removed');
      }
    } catch { toast.error('Failed to delete.'); }
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gold-gradient flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Repository</h2>
            <p className="text-sm text-muted-foreground">Your library of references, jewelry, moods, and generated assets.</p>
          </div>
        </div>
        <Button onClick={() => { setShowUpload(true); fileInputRef.current?.click(); }} className="gold-gradient text-white border-0 hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="border-gold/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Add to Repository</h3>
                  <button onClick={() => setShowUpload(false)}><X className="h-4 w-4" /></button>
                </div>

                <div className="flex gap-4">
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="Preview" className="h-24 w-24 object-cover rounded-xl border" />
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="h-24 w-24 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-gold/40 transition-colors">
                      <Upload className="h-6 w-6" />
                    </button>
                  )}
                  <div className="flex-1 space-y-2">
                    <input type="text" placeholder="Title" value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-background" />
                    <input type="text" placeholder="Description (optional)" value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-background" />
                    <input type="text" placeholder="Tags (comma separated)" value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-background" />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                    <button key={cat.id} onClick={() => setUploadCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${uploadCategory === cat.id ? 'gold-gradient text-white border-transparent' : 'hover:border-gold/30'}`}>
                      {cat.label}
                    </button>
                  ))}
                </div>

                <Button onClick={handleUpload} disabled={isUploading || !uploadTitle.trim() || !uploadFile}
                  className="w-full gold-gradient text-white border-0 hover:opacity-90">
                  {isUploading ? 'Saving...' : 'Save to Repository'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search repository..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl bg-background" />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
                  category === cat.id ? 'gold-gradient text-white border-transparent shadow-sm' : 'bg-card hover:border-gold/30'
                }`}>
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="font-medium mb-1">Repository is empty</p>
            <p className="text-sm text-muted-foreground">Add jewelry photos, references, mood boards, and generated assets.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                <div className="group relative rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedItem(item)}>
                  <div className="aspect-square relative bg-black">
                    {item.image_url.includes('.mp4') || item.tags?.includes('video') ? (
                      <video src={item.image_url} muted loop className="w-full h-full object-cover"
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                    ) : (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {(item.image_url.includes('.mp4') || item.tags?.includes('video')) && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 flex items-center justify-center opacity-60 group-hover:opacity-0 transition-opacity">
                        <Play className="h-4 w-4 text-white ml-0.5" />
                      </div>
                    )}

                    {/* Overlay actions */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-medium truncate">{item.title}</p>
                    </div>

                    <button onClick={() => handleDelete(item.id)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>

                    {/* Category badge */}
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                    </span>
                  </div>

                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{item.title}</p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            <Tag className="h-2 w-2 inline mr-0.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => { setSelectedItem(null); setLightboxRating(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-card rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button onClick={() => { setSelectedItem(null); setLightboxRating(null); }}
                className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                <X className="h-4 w-4" />
              </button>

              {/* Image/Video */}
              <div className="flex-1 bg-black flex items-center justify-center min-h-0">
                {selectedItem.image_url.includes('.mp4') || selectedItem.tags?.includes('video') ? (
                  <video src={selectedItem.image_url} controls autoPlay loop className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                  <img src={selectedItem.image_url} alt={selectedItem.title} className="max-w-full max-h-[70vh] object-contain" />
                )}
              </div>

              {/* Info bar */}
              <div className="p-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{selectedItem.title}</h3>
                    {selectedItem.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedItem.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => window.open(selectedItem.image_url, '_blank')}
                      className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = selectedItem.image_url;
                      a.download = selectedItem.title + '.jpg';
                      a.click();
                    }}
                      className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-accent transition-colors">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { handleDelete(selectedItem.id); setSelectedItem(null); }}
                      className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-destructive hover:text-white transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {selectedItem.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
                {/* Rating — for generated items */}
                {selectedItem.category === 'generated' && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Rate this:</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star}
                          onClick={async () => {
                            setLightboxRating(star);
                            // Find matching generation by URL
                            try {
                              await fetch('/api/feedback', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ generationId: selectedItem.id, rating: star }),
                              });
                              toast.success(`Rated ${star}/5`);
                            } catch { /* */ }
                          }}
                          className={`text-base transition-all hover:scale-110 ${
                            lightboxRating && star <= lightboxRating ? 'text-gold' : 'text-muted-foreground/30 hover:text-gold/60'
                          }`}>★</button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(selectedItem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  {CATEGORIES.find(c => c.id === selectedItem.category)?.label || selectedItem.category}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
