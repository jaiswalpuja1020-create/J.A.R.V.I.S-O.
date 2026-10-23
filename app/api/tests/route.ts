// app/api/tests/route.ts - Automated Test Execution Route

import { NextResponse } from 'next/server';
import { runAllTests } from '@/tests/jarvis.test';

export async function GET() {
  try {
    const results = await runAllTests();
    return NextResponse.json({
      success: results.failed === 0,
      data: results,
      error: results.failed > 0 ? { code: 'TESTS_FAILED', message: `${results.failed} tests failed` } : null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'EXECUTION_ERROR', message: error.message },
      },
      { status: 500 }
    );
  }
}
