// services/conversation.service.ts - Isolated in-memory conversation storage

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
  toolCalls?: Array<{
    tool: string;
    result: unknown;
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

// Session isolation: Map<sessionId, Map<conversationId, Conversation>>
const sessionStore: Map<string, Map<string, Conversation>> = new Map();

function getSessionConversations(sessionId: string): Map<string, Conversation> {
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, new Map());
  }
  return sessionStore.get(sessionId)!;
}

export function listConversations(sessionId: string): Array<{ id: string; title: string; updatedAt: string; messageCount: number }> {
  const store = getSessionConversations(sessionId);
  const list = Array.from(store.values()).map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    messageCount: c.messages.length,
  }));
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getConversation(sessionId: string, conversationId: string): Conversation | null {
  const store = getSessionConversations(sessionId);
  return store.get(conversationId) || null;
}

export function createConversation(sessionId: string, title?: string): Conversation {
  const store = getSessionConversations(sessionId);
  const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newConv: Conversation = {
    id,
    title: title || 'New Tactical Session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'At your service, Sir. All Stark Industries defensive and tactical systems are online. How may J.A.R.V.I.S.-O assist you today?',
        timestamp: new Date().toISOString(),
        provider: 'gemini',
        model: 'gemini-3.8-flash',
      },
    ],
  };
  store.set(id, newConv);
  return newConv;
}

export function appendMessage(
  sessionId: string,
  conversationId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): ChatMessage {
  const store = getSessionConversations(sessionId);
  let conv = store.get(conversationId);
  if (!conv) {
    conv = createConversation(sessionId);
    conversationId = conv.id;
  }

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: message.role,
    content: message.content,
    timestamp: new Date().toISOString(),
    provider: message.provider,
    model: message.model,
    toolCalls: message.toolCalls,
  };

  conv.messages.push(newMsg);
  conv.updatedAt = new Date().toISOString();

  // Update title automatically if it's the first user message
  if (message.role === 'user' && conv.messages.filter((m) => m.role === 'user').length === 1) {
    conv.title = message.content.slice(0, 36) + (message.content.length > 36 ? '...' : '');
  }

  // Enforce max message limit (default 30)
  const maxMessages = Number(process.env.MAX_CONVERSATION_MESSAGES) || 30;
  if (conv.messages.length > maxMessages) {
    // Keep first greeting and recent messages
    const first = conv.messages[0];
    const rest = conv.messages.slice(conv.messages.length - (maxMessages - 1));
    conv.messages = [first, ...rest];
  }

  return newMsg;
}

export function deleteConversation(sessionId: string, conversationId: string): boolean {
  const store = getSessionConversations(sessionId);
  return store.delete(conversationId);
}

export function clearConversationMessages(sessionId: string, conversationId: string): boolean {
  const store = getSessionConversations(sessionId);
  const conv = store.get(conversationId);
  if (conv) {
    conv.messages = [
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Session buffer purged, Sir. Systems recalibrated and ready for instructions.',
        timestamp: new Date().toISOString(),
      },
    ];
    conv.updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}
