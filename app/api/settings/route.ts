// app/api/settings/route.ts - Client Application Settings Endpoint

import { NextResponse } from 'next/server';
import { getConfig, isProviderConfigured } from '@/config/env';

export async function GET() {
  const config = getConfig();

  return NextResponse.json({
    success: true,
    data: {
      name: config.name,
      personality: config.personality,
      defaultLanguage: config.defaultLanguage,
      enableWebSearch: config.enableWebSearch,
      enableFileSearch: config.enableFileSearch,
      enableConversationMemory: config.enableConversationMemory,
      defaultProvider: config.defaultProvider,
      fallbackEnabled: config.fallbackEnabled,
      maxFallbackAttempts: config.maxFallbackAttempts,
      maxConversationMessages: config.maxConversationMessages,
      maxUploadSizeMb: config.maxUploadSizeMb,
      providers: {
        gemini: { configured: isProviderConfigured('gemini'), defaultModel: 'gemini-3.8-flash' },
        nvidia: { configured: isProviderConfigured('nvidia'), defaultModel: 'meta/llama-3.3-70b-instruct' },
        llm7: { configured: isProviderConfigured('llm7'), defaultModel: 'claude-3-5-sonnet' },
        openrouter: { configured: isProviderConfigured('openrouter'), defaultModel: 'meta-llama/llama-3.3-70b-instruct:free' },
      },
      searchConfigured: Boolean(process.env.SEARCH_API_KEY && process.env.SEARCH_PROVIDER),
    },
    error: null,
  });
}
