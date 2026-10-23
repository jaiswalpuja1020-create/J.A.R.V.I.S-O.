// app/api/chat/route.ts - Main Multi-turn Chat Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { routeChatRequest } from '@/services/ai-router';
import {
  getConversation,
  createConversation,
  appendMessage,
} from '@/services/conversation.service';
import { SupportedProvider } from '@/config/ai-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      conversationId: clientConvId,
      provider = 'gemini',
      enableFallback = true,
      maxFallbackAttempts = 2,
      language = 'auto',
    } = body;

    // Session identification
    const sessionId =
      req.headers.get('x-session-id') ||
      body.sessionId ||
      'stark-command-session-default';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_INPUT',
            message: 'Message cannot be empty.',
          },
        },
        { status: 400 }
      );
    }

    // Retrieve or create conversation
    let conv = clientConvId ? getConversation(sessionId, clientConvId) : null;
    if (!conv) {
      conv = createConversation(sessionId);
    }
    const conversationId = conv.id;

    // Append user message to memory
    appendMessage(sessionId, conversationId, {
      role: 'user',
      content: message.trim(),
    });

    // Prepare message history for router
    const history = conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Route request
    const routerResult = await routeChatRequest({
      sessionId,
      preferredProvider: provider as SupportedProvider,
      messages: history,
      enableFallback: Boolean(enableFallback),
      maxFallbackAttempts: Number(maxFallbackAttempts) || 2,
      language,
    });

    if (!routerResult.success || !routerResult.data) {
      const errMessage =
        routerResult.error?.message ||
        'The selected AI provider is unavailable. Recalibrating sensors...';

      // Still record assistant warning in conversation so history remains coherent
      const errorMsg = appendMessage(sessionId, conversationId, {
        role: 'assistant',
        content: `⚠️ [SYSTEM ALERT: ${routerResult.error?.code || 'PROVIDER_UNAVAILABLE'}]\n${errMessage}`,
      });

      return NextResponse.json(
        {
          success: false,
          data: {
            conversationId,
            message: errorMsg,
          },
          error: routerResult.error,
        },
        { status: 502 }
      );
    }

    // Success - Append assistant response to memory
    const savedAssistantMsg = appendMessage(sessionId, conversationId, {
      role: 'assistant',
      content: routerResult.data.text,
      provider: routerResult.data.provider,
      model: routerResult.data.model,
      toolCalls: routerResult.toolInvocations,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        message: savedAssistantMsg,
        provider: routerResult.data.provider,
        model: routerResult.data.model,
        usage: routerResult.data.usage,
        requestId: routerResult.data.requestId,
        fallbackOccurred: routerResult.fallbackOccurred,
        attemptedProviders: routerResult.attemptedProviders,
        toolInvocations: routerResult.toolInvocations,
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
          code: 'SERVER_ERROR',
          message: error.message || 'Internal J.A.R.V.I.S.-O routing error',
        },
      },
      { status: 500 }
    );
  }
}
