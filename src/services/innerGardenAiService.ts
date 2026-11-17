import {
  ExtractedThemeItem,
  InnerAiServerStatus,
  InnerEmotionItem,
} from '../types/garden';

async function postAiJson<T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  } & T;

  if (!res.ok) {
    throw new Error(
      data.error || `AI request to ${endpoint} failed (${res.status}).`
    );
  }

  return data;
}

export async function fetchAiServerStatus(): Promise<InnerAiServerStatus> {
  const res = await fetch('/api/ai/status');
  if (!res.ok) {
    return {
      configured: false,
      models: {
        transcription: 'gemini-3.5-transcribe',
        analysis: 'gemini-4-hydrogen',
      },
      trainingOptOutNote: 'AI status unavailable right now.',
    };
  }
  return (await res.json()) as InnerAiServerStatus;
}

export async function transcribeAudioWithGemini(params: {
  audioBase64: string;
  mimeType: string;
  aiConsent: boolean;
}): Promise<{ transcript: string }> {
  if (!params.aiConsent) {
    throw new Error(
      'Please enable AI Processing Consent before sending voice audio for transcription.'
    );
  }
  return postAiJson<{ transcript: string }>('/api/ai/transcribe', {
    audioBase64: params.audioBase64,
    mimeType: params.mimeType,
    aiConsent: true,
  });
}

export async function classifyEmotionWithGemini(params: {
  text: string;
  aiConsent: boolean;
}): Promise<{
  primaryEmotion: string;
  emotions: InnerEmotionItem[];
  interpretationNote: string;
  disclaimer: string;
}> {
  if (!params.aiConsent) {
    throw new Error(
      'Please enable AI Processing Consent before interpreting emotional tone.'
    );
  }
  return postAiJson('/api/ai/classify-emotion', {
    text: params.text,
    aiConsent: true,
  });
}

export async function summarizeJournalWithGemini(params: {
  text: string;
  title?: string;
  entryDate?: string;
  aiConsent: boolean;
}): Promise<{ summary: string; suggestedTitle: string }> {
  if (!params.aiConsent) {
    throw new Error(
      'Please enable AI Processing Consent before generating a journal summary.'
    );
  }
  return postAiJson('/api/ai/summarize-journal', {
    text: params.text,
    title: params.title || '',
    entryDate: params.entryDate || '',
    aiConsent: true,
  });
}

export async function extractThemesWithGemini(params: {
  entries: Array<{ id: string; date: string; text: string }>;
  aiConsent: boolean;
}): Promise<{ themes: ExtractedThemeItem[] }> {
  if (!params.aiConsent) {
    throw new Error(
      'Please enable AI Processing Consent before extracting recurring themes.'
    );
  }
  return postAiJson('/api/ai/extract-themes', {
    entries: params.entries,
    aiConsent: true,
  });
}

export async function generateReflectionWithGemini(params: {
  mode: 'entry' | 'weekly' | 'monthly';
  periodLabel?: string;
  singleText?: string;
  entries?: Array<{ id: string; date: string; title: string; text: string }>;
  aiConsent: boolean;
}): Promise<{
  title: string;
  reflectionText: string;
  recurringThemes: string[];
  gentleTakeaway: string;
}> {
  if (!params.aiConsent) {
    throw new Error(
      'Please enable AI Processing Consent before generating an AI reflection.'
    );
  }
  return postAiJson('/api/ai/generate-reflection', {
    mode: params.mode,
    periodLabel: params.periodLabel || '',
    singleText: params.singleText || '',
    entries: params.entries || [],
    aiConsent: true,
  });
}
