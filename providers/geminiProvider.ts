// providers/geminiProvider.ts - Gemini AI Provider Adapter using @google/genai

import { GoogleGenAI } from '@google/genai';
import { NormalizedAIResponse } from '@/config/ai-config';

let geminiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export async function callGemini(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
  systemInstruction?: string,
  model = 'gemini-3.8-flash'
): Promise<NormalizedAIResponse> {
  const ai = getClient();

  // Combine context history into contents or multi-turn prompt
  const contents = [
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction:
        systemInstruction ||
        'You are J.A.R.V.I.S.-O, the premier Stark Industries AI operating system and tactical command assistant created for Tony Stark. You speak with a calm, refined, intelligent, and subtly witty British tone. Respond in English, Hindi, or Hinglish seamlessly matching the user preference. Assist with tactical analytics, suit diagnostics, calculations, coding, and defense protocols.',
    },
  });

  const text = response.text || '';
  const usage = response.usageMetadata
    ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      }
    : null;

  return {
    success: true,
    provider: 'gemini',
    model,
    text,
    usage,
    requestId: response.responseId || null,
  };
}

export async function testGemini(): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping: J.A.R.V.I.S.-O diagnostic uplink test. Reply in 5 words.',
    });
    const latencyMs = Date.now() - start;
    return {
      success: true,
      latencyMs,
      message: res.text?.trim() || 'Online and operational, Sir.',
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      latencyMs: Date.now() - start,
      message: error.message || 'Gemini connectivity failed',
    };
  }
}
