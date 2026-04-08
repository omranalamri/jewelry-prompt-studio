'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyzeTab } from './AnalyzeTab';
import { ConceptTab } from './ConceptTab';
import { VisionTab } from './VisionTab';

export function StudioShell() {
  return (
    <Tabs defaultValue="analyze" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="analyze">Analyze & Generate</TabsTrigger>
        <TabsTrigger value="concept">Concept Studio</TabsTrigger>
        <TabsTrigger value="vision">Vision Engineer</TabsTrigger>
      </TabsList>
      <TabsContent value="analyze" className="mt-6">
        <AnalyzeTab />
      </TabsContent>
      <TabsContent value="concept" className="mt-6">
        <ConceptTab />
      </TabsContent>
      <TabsContent value="vision" className="mt-6">
        <VisionTab />
      </TabsContent>
    </Tabs>
  );
}
