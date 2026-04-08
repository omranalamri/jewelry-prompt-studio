'use client';

import { useReducer, useCallback } from 'react';
import { OutputType } from '@/types/platforms';
import { AnalyzeResult } from '@/types/prompts';

interface AnalyzeState {
  referenceFile: File | null;
  referencePreview: string | null;
  assetFiles: File[];
  assetPreviews: string[];
  context: string;
  outputType: OutputType;
  isLoading: boolean;
  result: AnalyzeResult | null;
  error: string | null;
  sessionId: string | null;
}

type Action =
  | { type: 'SET_REFERENCE'; file: File; preview: string }
  | { type: 'REMOVE_REFERENCE' }
  | { type: 'SET_ASSETS'; files: File[]; previews: string[] }
  | { type: 'SET_CONTEXT'; context: string }
  | { type: 'SET_OUTPUT_TYPE'; outputType: OutputType }
  | { type: 'START_LOADING' }
  | { type: 'SET_RESULT'; result: AnalyzeResult; sessionId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: AnalyzeState = {
  referenceFile: null,
  referencePreview: null,
  assetFiles: [],
  assetPreviews: [],
  context: '',
  outputType: 'both',
  isLoading: false,
  result: null,
  error: null,
  sessionId: null,
};

function reducer(state: AnalyzeState, action: Action): AnalyzeState {
  switch (action.type) {
    case 'SET_REFERENCE':
      return { ...state, referenceFile: action.file, referencePreview: action.preview, error: null };
    case 'REMOVE_REFERENCE':
      return { ...state, referenceFile: null, referencePreview: null };
    case 'SET_ASSETS':
      return { ...state, assetFiles: action.files, assetPreviews: action.previews, error: null };
    case 'SET_CONTEXT':
      return { ...state, context: action.context };
    case 'SET_OUTPUT_TYPE':
      return { ...state, outputType: action.outputType };
    case 'START_LOADING':
      return { ...state, isLoading: true, error: null, result: null };
    case 'SET_RESULT':
      return { ...state, isLoading: false, result: action.result, sessionId: action.sessionId };
    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function generatePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useAnalyze() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setReference = useCallback(async (file: File) => {
    const preview = await generatePreview(file);
    dispatch({ type: 'SET_REFERENCE', file, preview });
  }, []);

  const removeReference = useCallback(() => {
    dispatch({ type: 'REMOVE_REFERENCE' });
  }, []);

  const setAssets = useCallback(async (files: File[]) => {
    const limited = files.slice(0, 3);
    const previews = await Promise.all(limited.map(generatePreview));
    dispatch({ type: 'SET_ASSETS', files: limited, previews });
  }, []);

  const setContext = useCallback((context: string) => {
    dispatch({ type: 'SET_CONTEXT', context });
  }, []);

  const setOutputType = useCallback((outputType: OutputType) => {
    dispatch({ type: 'SET_OUTPUT_TYPE', outputType });
  }, []);

  const analyze = useCallback(async () => {
    if (!state.referenceFile) {
      dispatch({ type: 'SET_ERROR', error: 'Please upload a reference image.' });
      return;
    }

    dispatch({ type: 'START_LOADING' });

    const formData = new FormData();
    formData.append('referenceImage', state.referenceFile);
    state.assetFiles.forEach((f) => formData.append('assetImages', f));
    formData.append('context', state.context);
    formData.append('outputType', state.outputType);

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const json = await res.json();

      if (!json.success) {
        dispatch({ type: 'SET_ERROR', error: json.error });
        return;
      }

      dispatch({ type: 'SET_RESULT', result: json.data, sessionId: json.sessionId });
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Network error. Please check your connection and try again.' });
    }
  }, [state.referenceFile, state.assetFiles, state.context, state.outputType]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    ...state,
    setReference,
    removeReference,
    setAssets,
    setContext,
    setOutputType,
    analyze,
    reset,
  };
}
