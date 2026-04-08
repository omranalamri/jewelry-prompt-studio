import { PlatformId, OutputType } from './platforms';

export interface GeneratedPrompts {
  midjourney: string | null;
  dalle: string | null;
  runway: string | null;
  kling: string | null;
}

export interface AnalyzeResult {
  analysis: {
    reference: string;
    assets: string;
    lighting: string;
    mood: string;
    strategy: string;
  };
  recommendation: {
    primary: PlatformId;
    secondary?: PlatformId;
    reason: string;
  };
  prompts: GeneratedPrompts;
  tips: string[];
}

export interface ConceptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  generatedPrompts?: GeneratedPrompts;
}

export interface ConceptState {
  messages: ConceptMessage[];
  isLoading: boolean;
  latestPrompts: GeneratedPrompts | null;
  refinedConcept: string | null;
}

export interface VisionResult {
  analysis: string;
  interpretation: string;
  approach: string;
  recommendation: PlatformId;
  reason: string;
  prompts: GeneratedPrompts;
  negative: string;
  tips: string[];
}

export interface HistoryEntry {
  id: string;
  module: 'analyze' | 'concept' | 'vision';
  title: string | null;
  input_context: string | null;
  output_type: OutputType | null;
  image_urls: string[];
  result: AnalyzeResult | VisionResult | GeneratedPrompts;
  is_saved: boolean;
  created_at: string;
}
