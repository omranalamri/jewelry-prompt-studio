import { AnalyzeResult, VisionResult, GeneratedPrompts, HistoryEntry } from './prompts';
import { PlatformId } from './platforms';

// Analyze
export interface AnalyzeRequest {
  referenceImage: File;
  assetImages: File[];
  context: string;
  outputType: 'still' | 'video' | 'both';
}

export interface AnalyzeResponse {
  success: true;
  data: AnalyzeResult;
  sessionId: string;
}

// Concept
export interface ConceptRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  sessionId?: string;
}

export interface ConceptResponse {
  success: true;
  data: {
    message: string;
    ready: boolean;
    concept?: string;
    prompts?: GeneratedPrompts;
    recommendation?: PlatformId;
    reason?: string;
  };
  sessionId: string;
}

// Vision
export interface VisionRequest {
  image: File;
  visionText: string;
  outputType: 'still' | 'video' | 'both';
}

export interface VisionResponse {
  success: true;
  data: VisionResult;
  sessionId: string;
}

// History
export interface HistoryResponse {
  success: true;
  data: HistoryEntry[];
  pagination: { page: number; total: number; hasMore: boolean };
}

// Error
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = T | ApiErrorResponse;
