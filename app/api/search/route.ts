// app/api/search/route.ts - Web Search API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { executeWebSearch } from '@/services/search.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query cannot be empty.',
          },
        },
        { status: 400 }
      );
    }

    const searchResult = await executeWebSearch(query.trim());

    if (!searchResult.configured) {
      return NextResponse.json(
        {
          success: false,
          data: searchResult,
          error: {
            code: 'SEARCH_UNAVAILABLE',
            message: searchResult.error || 'Web search service is unconfigured.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: searchResult,
      error: null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'SEARCH_ERROR',
          message: error.message || 'Web search request failed.',
        },
      },
      { status: 500 }
    );
  }
}
