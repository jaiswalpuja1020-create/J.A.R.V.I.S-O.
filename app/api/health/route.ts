// app/api/health/route.ts - System Health & Diagnostics Endpoint

import { NextResponse } from 'next/server';
import { isProviderConfigured, getConfig } from '@/config/env';

const startTime = Date.now();

export async function GET() {
  const config = getConfig();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const providers = {
    gemini: isProviderConfigured('gemini'),
    nvidia: isProviderConfigured('nvidia'),
    llm7: isProviderConfigured('llm7'),
    openrouter: isProviderConfigured('openrouter'),
  };

  return NextResponse.json({
    success: true,
    data: {
      status: 'OPERATIONAL',
      name: config.name,
      personality: config.personality,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      arcReactorOutput: '100% - SYNCHRONIZED',
      version: '4.2.0-MARK-LXXXV',
      defaultProvider: config.defaultProvider,
      providers,
      environment: config.nodeEnv,
    },
    error: null,
  });
}
