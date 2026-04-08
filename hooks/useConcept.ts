'use client';

import { useReducer, useCallback } from 'react';
import { PlatformId } from '@/types/platforms';
import { GeneratedPrompts } from '@/types/prompts';

interface ConceptMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConceptState {
  messages: ConceptMessage[];
  inputText: string;
  isLoading: boolean;
  latestPrompts: GeneratedPrompts | null;
  refinedConcept: string | null;
  recommendation: PlatformId | null;
  recommendationReason: string | null;
  sessionId: string | null;
}

type Action =
  | { type: 'SET_INPUT'; text: string }
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'ADD_ASSISTANT_MESSAGE'; content: string }
  | { type: 'SET_PROMPTS'; prompts: GeneratedPrompts; concept: string; recommendation: PlatformId; reason: string }
  | { type: 'START_LOADING' }
  | { type: 'STOP_LOADING' }
  | { type: 'SET_SESSION_ID'; sessionId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: ConceptState = {
  messages: [],
  inputText: '',
  isLoading: false,
  latestPrompts: null,
  refinedConcept: null,
  recommendation: null,
  recommendationReason: null,
  sessionId: null,
};

function reducer(state: ConceptState, action: Action): ConceptState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputText: action.text };
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'user', content: action.content }],
        inputText: '',
      };
    case 'ADD_ASSISTANT_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'assistant', content: action.content }],
      };
    case 'SET_PROMPTS':
      return {
        ...state,
        latestPrompts: action.prompts,
        refinedConcept: action.concept,
        recommendation: action.recommendation,
        recommendationReason: action.reason,
      };
    case 'START_LOADING':
      return { ...state, isLoading: true };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.sessionId };
    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        messages: [...state.messages, { role: 'assistant', content: action.error }],
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useConcept() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setInput = useCallback((text: string) => {
    dispatch({ type: 'SET_INPUT', text });
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || state.inputText;
    if (!messageText.trim()) return;

    dispatch({ type: 'ADD_USER_MESSAGE', content: messageText });
    dispatch({ type: 'START_LOADING' });

    const allMessages = [
      ...state.messages,
      { role: 'user' as const, content: messageText },
    ];

    try {
      const res = await fetch('/api/concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          sessionId: state.sessionId,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        dispatch({ type: 'SET_ERROR', error: json.error });
        return;
      }

      dispatch({ type: 'STOP_LOADING' });
      dispatch({ type: 'ADD_ASSISTANT_MESSAGE', content: json.data.message });
      dispatch({ type: 'SET_SESSION_ID', sessionId: json.sessionId });

      if (json.data.ready && json.data.prompts) {
        dispatch({
          type: 'SET_PROMPTS',
          prompts: json.data.prompts,
          concept: json.data.concept || '',
          recommendation: json.data.recommendation,
          reason: json.data.reason || '',
        });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Network error. Please try again.' });
    }
  }, [state.inputText, state.messages, state.sessionId]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    ...state,
    setInput,
    sendMessage,
    reset,
  };
}
