'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, MessageSquare, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnalyzeTab } from './AnalyzeTab';
import { ConceptTab } from './ConceptTab';
import { VisionTab } from './VisionTab';

export function StudioShell() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 p-1.5 bg-muted/50 backdrop-blur-sm">
          <TabsTrigger value="analyze" className="flex items-center gap-2 data-[state=active]:shadow-md data-[state=active]:bg-card h-full">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Analyze & Generate</span>
            <span className="sm:hidden">Analyze</span>
          </TabsTrigger>
          <TabsTrigger value="concept" className="flex items-center gap-2 data-[state=active]:shadow-md data-[state=active]:bg-card h-full">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Concept Studio</span>
            <span className="sm:hidden">Concept</span>
          </TabsTrigger>
          <TabsTrigger value="vision" className="flex items-center gap-2 data-[state=active]:shadow-md data-[state=active]:bg-card h-full">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Vision Engineer</span>
            <span className="sm:hidden">Vision</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analyze" className="mt-8">
          <AnalyzeTab />
        </TabsContent>
        <TabsContent value="concept" className="mt-8">
          <ConceptTab />
        </TabsContent>
        <TabsContent value="vision" className="mt-8">
          <VisionTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
