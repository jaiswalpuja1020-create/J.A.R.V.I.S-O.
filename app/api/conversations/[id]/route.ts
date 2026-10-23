// app/api/conversations/[id]/route.ts - Individual Conversation Operations

import { NextRequest, NextResponse } from 'next/server';
import {
  deleteConversation,
  clearConversationMessages,
  getConversation,
} from '@/services/conversation.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
  const conv = getConversation(sessionId, id);

  if (!conv) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.headers.get('x-session-id') || 'stark-command-session-default';
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'clear') {
    const cleared = clearConversationMessages(sessionId, id);
    return NextResponse.json({
      success: cleared,
      data: { message: cleared ? 'Conversation messages cleared.' : 'Conversation not found.' },
      error: cleared ? null : { code: 'NOT_FOUND', message: 'Conversation not found.' },
    });
  }

  const deleted = deleteConversation(sessionId, id);
  return NextResponse.json({
    success: deleted,
    data: { message: deleted ? 'Conversation purged from memory.' : 'Conversation not found.' },
    error: deleted ? null : { code: 'NOT_FOUND', message: 'Conversation not found.' },
  });
}
