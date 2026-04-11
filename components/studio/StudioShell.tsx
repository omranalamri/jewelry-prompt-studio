'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, MessageSquare, Wand2, Clapperboard, Layers, Film } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnalyzeTab } from './AnalyzeTab';
import { ConceptTab } from './ConceptTab';
import { VisionTab } from './VisionTab';
import { CreativeTab } from './CreativeTab';
import { CollectionTab } from './CollectionTab';
import { AdBuilderTab } from './AdBuilderTab';

export function StudioShell() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-12 p-1 bg-muted/50 backdrop-blur-sm">
          <TabsTrigger value="analyze" className="flex items-center gap-1 data-[state=active]:shadow-md data-[state=active]:bg-card h-full text-[11px] sm:text-sm">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analyze</span>
          </TabsTrigger>
          <TabsTrigger value="concept" className="flex items-center gap-1 data-[state=active]:shadow-md data-[state=active]:bg-card h-full text-[11px] sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Concept</span>
          </TabsTrigger>
          <TabsTrigger value="vision" className="flex items-center gap-1 data-[state=active]:shadow-md data-[state=active]:bg-card h-full text-[11px] sm:text-sm">
            <Wand2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vision</span>
          </TabsTrigger>
          <TabsTrigger value="creative" className="flex items-center gap-1 data-[state=active]:shadow-md data-[state=active]:bg-card h-full text-[11px] sm:text-sm">
            <Clapperboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Creative</span>
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex items-center gap-1 data-[state=active]:shadow-md data-[state=active]:bg-card h-full text-[11px] sm:text-sm">
            <Film className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ad Builder</span>
          </TabsTrigger>
          <TabsTrigger value="collection" className="flex items-center gap-1 data-[state=active]:shadow-md data-[state=active]:bg-card h-full text-[11px] sm:text-sm">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Collection</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analyze" className="mt-8"><AnalyzeTab /></TabsContent>
        <TabsContent value="concept" className="mt-8"><ConceptTab /></TabsContent>
        <TabsContent value="vision" className="mt-8"><VisionTab /></TabsContent>
        <TabsContent value="creative" className="mt-8"><CreativeTab /></TabsContent>
        <TabsContent value="ads" className="mt-8"><AdBuilderTab /></TabsContent>
        <TabsContent value="collection" className="mt-8"><CollectionTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
