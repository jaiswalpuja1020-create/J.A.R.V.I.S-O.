// app/api/providers/test/route.ts - Test specific provider connectivity

import { NextRequest, NextResponse } from 'next/server';
import { SupportedProvider } from '@/config/ai-config';
import { testProviderConnectivity } from '@/services/ai-router';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider } = body;

    const allowed: SupportedProvider[] = ['gemini', 'nvidia', 'llm7', 'openrouter'];
    if (!provider || !allowed.includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_PROVIDER',
            message: `Provider must be one of: ${allowed.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    const testResult = await testProviderConnectivity(provider as SupportedProvider);

    return NextResponse.json({
      success: testResult.success,
      data: testResult,
      error: testResult.success
        ? null
        : {
            code: 'PROVIDER_TEST_FAILED',
            message: testResult.message,
          },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'Failed to execute provider test',
        },
      },
      { status: 500 }
    );
  }
}
