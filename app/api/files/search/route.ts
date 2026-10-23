// app/api/files/search/route.ts - Search indexed document chunks

import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments, listFiles } from '@/services/file.service';

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
    const body = await req.json();
    const { query, limit = 5 } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query is required.',
          },
        },
        { status: 400 }
      );
    }

    const matches = searchDocuments(sessionId, query.trim(), Number(limit) || 5);
    const totalFiles = listFiles(sessionId).length;

    return NextResponse.json({
      success: true,
      data: {
        query,
        matches,
        totalFilesIndexed: totalFiles,
      },
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
          message: error.message || 'File search failed.',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
  const files = listFiles(sessionId);
  return NextResponse.json({
    success: true,
    data: { files },
    error: null,
  });
}
