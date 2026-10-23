// app/api/conversations/route.ts - Conversation Management Endpoint

import { NextRequest, NextResponse } from 'next/server';
import {
  listConversations,
  createConversation,
  getConversation,
} from '@/services/conversation.service';

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
  const url = new URL(req.url);
  const convId = url.searchParams.get('id');

  if (convId) {
    const conv = getConversation(sessionId, convId);
    if (!conv) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { conversation: conv },
      error: null,
    });
  }

  const conversations = listConversations(sessionId);
  return NextResponse.json({
    success: true,
    data: { conversations },
    error: null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
    const body = await req.json().catch(() => ({}));
    const newConv = createConversation(sessionId, body.title);

    return NextResponse.json({
      success: true,
      data: { conversation: newConv },
      error: null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'CREATE_FAILED',
          message: error.message || 'Could not initialize new conversation',
        },
      },
      { status: 500 }
    );
  }
}
