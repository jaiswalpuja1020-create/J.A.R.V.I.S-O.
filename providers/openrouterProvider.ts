// providers/openrouterProvider.ts - OpenRouter API Provider Adapter

import { NormalizedAIResponse, APPROVED_PROVIDERS } from '@/config/ai-config';

export async function callOpenRouter(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
  systemInstruction?: string,
  model = APPROVED_PROVIDERS.openrouter.defaultModel
): Promise<NormalizedAIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server');
  }

  const endpoint = APPROVED_PROVIDERS.openrouter.endpoint!;
  const messages = [
    {
      role: 'system',
      content:
        systemInstruction ||
        'You are J.A.R.V.I.S.-O, a futuristic high-performance tactical intelligence assistant. Be calm, concise, professional, and intelligent.',
    },
    ...history.map((h) => ({
      role: h.role,
      content: h.content,
    })),
    {
      role: 'user',
      content: prompt,
    },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://jarvis-o.stark',
        'X-Title': 'J.A.R.V.I.S.-O Command Center',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : null;

    return {
      success: true,
      provider: 'openrouter',
      model: data.model || model,
      text,
      usage,
      requestId: data.id || null,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function testOpenRouter(): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      latencyMs: 0,
      message: 'OPENROUTER_API_KEY is not configured in environment secrets',
    };
  }

  const start = Date.now();
  try {
    const res = await callOpenRouter('Diagnostic ping. Confirm online status in 5 words.');
    return {
      success: true,
      latencyMs: Date.now() - start,
      message: res.text.trim() || 'OpenRouter gateway operational.',
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      latencyMs: Date.now() - start,
      message: error.message || 'OpenRouter API request failed',
    };
  }
}
