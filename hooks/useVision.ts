'use client';

import { useReducer, useCallback } from 'react';
import { OutputType } from '@/types/platforms';
import { VisionResult } from '@/types/prompts';

interface VisionState {
  imageFile: File | null;
  imagePreview: string | null;
  visionText: string;
  outputType: OutputType;
  isLoading: boolean;
  result: VisionResult | null;
  error: string | null;
  sessionId: string | null;
}

type Action =
  | { type: 'SET_IMAGE'; file: File; preview: string }
  | { type: 'REMOVE_IMAGE' }
  | { type: 'SET_VISION_TEXT'; text: string }
  | { type: 'SET_OUTPUT_TYPE'; outputType: OutputType }
  | { type: 'START_LOADING' }
  | { type: 'SET_RESULT'; result: VisionResult; sessionId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: VisionState = {
  imageFile: null,
  imagePreview: null,
  visionText: '',
  outputType: 'both',
  isLoading: false,
  result: null,
  error: null,
  sessionId: null,
};

function reducer(state: VisionState, action: Action): VisionState {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...state, imageFile: action.file, imagePreview: action.preview, error: null };
    case 'REMOVE_IMAGE':
      return { ...state, imageFile: null, imagePreview: null };
    case 'SET_VISION_TEXT':
      return { ...state, visionText: action.text };
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

export function useVision() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setImage = useCallback(async (file: File) => {
    const preview = await generatePreview(file);
    dispatch({ type: 'SET_IMAGE', file, preview });
  }, []);

  const removeImage = useCallback(() => {
    dispatch({ type: 'REMOVE_IMAGE' });
  }, []);

  const setVisionText = useCallback((text: string) => {
    dispatch({ type: 'SET_VISION_TEXT', text });
  }, []);

  const setOutputType = useCallback((outputType: OutputType) => {
    dispatch({ type: 'SET_OUTPUT_TYPE', outputType });
  }, []);

  const generate = useCallback(async () => {
    if (!state.imageFile) {
      dispatch({ type: 'SET_ERROR', error: 'Please upload an image.' });
      return;
    }
    if (!state.visionText.trim()) {
      dispatch({ type: 'SET_ERROR', error: 'Please describe your creative vision.' });
      return;
    }

    dispatch({ type: 'START_LOADING' });

    const formData = new FormData();
    formData.append('image', state.imageFile);
    formData.append('visionText', state.visionText);
    formData.append('outputType', state.outputType);

    try {
      const res = await fetch('/api/vision', { method: 'POST', body: formData });
      const json = await res.json();

      if (!json.success) {
        dispatch({ type: 'SET_ERROR', error: json.error });
        return;
      }

      dispatch({ type: 'SET_RESULT', result: json.data, sessionId: json.sessionId });
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Network error. Please check your connection and try again.' });
    }
  }, [state.imageFile, state.visionText, state.outputType]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    ...state,
    setImage,
    removeImage,
    setVisionText,
    setOutputType,
    generate,
    reset,
  };
}
