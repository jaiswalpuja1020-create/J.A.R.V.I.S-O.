// providers/llm7Provider.ts - LLM7.io API Provider Adapter

import { NormalizedAIResponse, APPROVED_PROVIDERS } from '@/config/ai-config';

export async function callLlm7(
  prompt: string,
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
  systemInstruction?: string,
  model = APPROVED_PROVIDERS.llm7.defaultModel
): Promise<NormalizedAIResponse> {
  const apiKey = process.env.LLM7_API_KEY;
  if (!apiKey) {
    throw new Error('LLM7_API_KEY is not configured on the server');
  }

  const endpoint = APPROVED_PROVIDERS.llm7.endpoint!;
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
      throw new Error(`LLM7.io API error (${res.status}): ${errText.slice(0, 200)}`);
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
      provider: 'llm7',
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

export async function testLlm7(): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const apiKey = process.env.LLM7_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      latencyMs: 0,
      message: 'LLM7_API_KEY is not configured in environment secrets',
    };
  }

  const start = Date.now();
  try {
    const res = await callLlm7('Diagnostic ping. Confirm online status in 5 words.');
    return {
      success: true,
      latencyMs: Date.now() - start,
      message: res.text.trim() || 'LLM7 node operational.',
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      latencyMs: Date.now() - start,
      message: error.message || 'LLM7 API request failed',
    };
  }
}
