// app/api/providers/route.ts - Providers Status Endpoint

import { NextResponse } from 'next/server';
import { APPROVED_PROVIDERS, SupportedProvider } from '@/config/ai-config';
import { isProviderConfigured, getConfig } from '@/config/env';

export async function GET() {
  const config = getConfig();

  const providers = (Object.keys(APPROVED_PROVIDERS) as SupportedProvider[]).map((id) => {
    const meta = APPROVED_PROVIDERS[id];
    const configured = isProviderConfigured(id);
    return {
      id: meta.id,
      name: meta.name,
      configured,
      defaultModel: meta.defaultModel,
      verifiedModels: meta.verifiedModels,
      description: meta.description,
      docsUrl: meta.docsUrl,
      isDefault: meta.id === config.defaultProvider,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      defaultProvider: config.defaultProvider,
      fallbackEnabled: config.fallbackEnabled,
      maxFallbackAttempts: config.maxFallbackAttempts,
      providers,
    },
    error: null,
  });
}
