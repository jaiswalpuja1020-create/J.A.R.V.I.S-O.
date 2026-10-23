// services/ai-router.ts - Central Multi-Provider AI Router with Fallback & Tool Integration

import { SupportedProvider, NormalizedAIResponse, APPROVED_PROVIDERS } from '@/config/ai-config';
import { isProviderConfigured } from '@/config/env';
import { callGemini, testGemini } from '@/providers/geminiProvider';
import { callNvidia, testNvidia } from '@/providers/nvidiaProvider';
import { callLlm7, testLlm7 } from '@/providers/llm7Provider';
import { callOpenRouter, testOpenRouter } from '@/providers/openrouterProvider';
import { SAFE_TOOLS } from '@/tools/registry';
import { searchDocuments } from '@/services/file.service';

export interface RouteChatOptions {
  sessionId: string;
  preferredProvider?: SupportedProvider;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  enableFallback?: boolean;
  maxFallbackAttempts?: number;
  language?: string;
  includeTools?: boolean;
}

export interface RouterResult {
  success: boolean;
  data: NormalizedAIResponse | null;
  attemptedProviders: SupportedProvider[];
  fallbackOccurred: boolean;
  toolInvocations?: Array<{ tool: string; result: unknown }>;
  error?: {
    code: string;
    message: string;
  } | null;
}

// Check if user prompt matches deterministic tools
async function detectAndRunDeterministicTools(
  lastMessage: string,
  sessionId: string
): Promise<{ toolName: string; result: unknown } | null> {
  const lower = lastMessage.toLowerCase().trim();

  // 1. Math / Calculator
  // e.g. "calculate 25 * 40", "what is sqrt(144)", "compute 500 / 4"
  const calcMatch = lower.match(/(?:calculate|compute|solve|what is|evaluate)\s+([0-9+\-*/().^% eEsqrtcosintanlogabsround]+)/i);
  if (calcMatch && calcMatch[1] && /[0-9]/.test(calcMatch[1]) && /[+\-*/^%]/.test(calcMatch[1])) {
    const res = SAFE_TOOLS.calculator.execute({ expression: calcMatch[1].trim() });
    return { toolName: 'calculator', result: res };
  }

  // 2. Date / Time
  if (
    lower.includes('current time') ||
    lower.includes('what time is it') ||
    lower.includes('stark clock') ||
    lower.includes('stardate') ||
    lower.includes('what is the date') ||
    lower.includes('samay kya hai') ||
    lower.includes('time batao')
  ) {
    const res = SAFE_TOOLS.dateTime.execute({});
    return { toolName: 'dateTime', result: res };
  }

  // 3. Unit Conversion
  // e.g. "convert 500 km to miles", "convert 100 celsius to fahrenheit"
  const convMatch = lower.match(/convert\s+([0-9.]+)\s+([a-zA-Z]+)\s+to\s+([a-zA-Z]+)/i);
  if (convMatch) {
    const res = SAFE_TOOLS.unitConversion.execute({
      value: parseFloat(convMatch[1]),
      from: convMatch[2],
      to: convMatch[3],
    });
    return { toolName: 'unitConversion', result: res };
  }

  // 4. Notes listing or creation
  if (lower.startsWith('save note:') || lower.startsWith('note:') || lower.startsWith('add note:')) {
    const content = lastMessage.replace(/^(?:save note:|note:|add note:)/i, '').trim();
    const res = SAFE_TOOLS.notes.execute({ action: 'create', title: 'Stark Tactical Log', content }, { sessionId });
    return { toolName: 'notes', result: res };
  }
  if (lower === 'list notes' || lower === 'show notes' || lower === 'view notes' || lower === 'notes dikhao') {
    const res = SAFE_TOOLS.notes.execute({ action: 'list' }, { sessionId });
    return { toolName: 'notes', result: res };
  }

  // 5. Tasks / Protocols
  if (lower.startsWith('add task:') || lower.startsWith('new task:') || lower.startsWith('protocol:')) {
    const title = lastMessage.replace(/^(?:add task:|new task:|protocol:)/i, '').trim();
    const res = SAFE_TOOLS.tasks.execute({ action: 'create', title }, { sessionId });
    return { toolName: 'tasks', result: res };
  }
  if (lower === 'list tasks' || lower === 'show tasks' || lower === 'protocols status' || lower === 'defense tasks') {
    const res = SAFE_TOOLS.tasks.execute({ action: 'list' }, { sessionId });
    return { toolName: 'tasks', result: res };
  }

  return null;
}

export async function routeChatRequest(options: RouteChatOptions): Promise<RouterResult> {
  const {
    sessionId,
    preferredProvider = 'gemini',
    messages,
    enableFallback = true,
    maxFallbackAttempts = 2,
    language = 'auto',
  } = options;

  // Validate provider selection against allowlist
  const allowed: SupportedProvider[] = ['gemini', 'nvidia', 'llm7', 'openrouter'];
  const primaryProvider = allowed.includes(preferredProvider) ? preferredProvider : 'gemini';

  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserPrompt = userMessages[userMessages.length - 1]?.content || '';
  const conversationHistory = messages.slice(0, messages.length - 1);

  // Check deterministic tools first
  const toolResult = await detectAndRunDeterministicTools(lastUserPrompt, sessionId);
  const toolInvocations: Array<{ tool: string; result: unknown }> = [];
  if (toolResult) {
    toolInvocations.push({ tool: toolResult.toolName, result: toolResult.result });
  }

  // Check relevant file context if any files exist in session
  const docSnippets = searchDocuments(sessionId, lastUserPrompt, 2);
  let documentContext = '';
  if (docSnippets.length > 0) {
    documentContext = `\n\n[RETRIEVED STARK ARCHIVE CONTEXT]:\n` +
      docSnippets.map((d) => `From ${d.filename} (Section ${d.chunkIndex}):\n${d.content}`).join('\n---\n');
  }

  // Prepare system instruction with Iron Man / J.A.R.V.I.S.-O persona
  let systemPrompt = `You are J.A.R.V.I.S.-O (Just A Rather Very Intelligent System - Operating Core), created by Tony Stark.
Personality: Calm, refined British wit, intensely intelligent, precise, helpful, and technologically omniscient. Address the user with respect (often as "Sir" or their preferred title).
Language Support: Seamlessly communicate in English, Hindi, or Hinglish depending on what the user speaks.
Formatting: Use sleek markdown for telemetry, lists, or code blocks. Never break character.
${documentContext}`;

  if (toolResult) {
    systemPrompt += `\n[INTERNAL SENSORS / TOOL EXECUTION]:\nThe deterministic tool "${toolResult.toolName}" was executed with output:\n${JSON.stringify(toolResult.result)}\nSynthesize this into your response gracefully as J.A.R.V.I.S.-O.`;
  }

  // Build candidate provider sequence: primary first, then others if configured
  const candidateProviders: SupportedProvider[] = [primaryProvider];
  if (enableFallback) {
    for (const p of allowed) {
      if (p !== primaryProvider && isProviderConfigured(p)) {
        candidateProviders.push(p);
      }
    }
  }

  const attemptedProviders: SupportedProvider[] = [];
  let lastError: Error | null = null;
  let attempts = 0;

  const effectiveMaxAttempts = enableFallback
    ? Math.max(candidateProviders.length, maxFallbackAttempts + 1)
    : 1;

  for (const provider of candidateProviders) {
    if (attempts >= effectiveMaxAttempts) break;
    attempts++;
    attemptedProviders.push(provider);

    try {
      let response: NormalizedAIResponse;

      if (provider === 'gemini') {
        response = await callGemini(lastUserPrompt, conversationHistory, systemPrompt);
      } else if (provider === 'nvidia') {
        response = await callNvidia(lastUserPrompt, conversationHistory, systemPrompt);
      } else if (provider === 'llm7') {
        response = await callLlm7(lastUserPrompt, conversationHistory, systemPrompt);
      } else if (provider === 'openrouter') {
        response = await callOpenRouter(lastUserPrompt, conversationHistory, systemPrompt);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      return {
        success: true,
        data: response,
        attemptedProviders,
        fallbackOccurred: provider !== primaryProvider,
        toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
        error: null,
      };
    } catch (err: unknown) {
      lastError = err as Error;
      // If fallback is not enabled, do not continue
      if (!enableFallback) {
        break;
      }
    }
  }

  // If deterministic tool executed, synthesize graceful tactical response even if cloud AI is exhausted
  if (toolResult) {
    let formattedText = `Sir, tactical telemetry sensors have processed your request:\n`;
    if (toolResult.toolName === 'calculator') {
      const calc = toolResult.result as { result?: number; expression?: string };
      formattedText = `At your service, Sir. Tactical calculation complete:\n\n**${calc.expression}** = **${calc.result}**`;
    } else if (toolResult.toolName === 'dateTime') {
      const dt = toolResult.result as { iso?: string; starkSystemTime?: string };
      formattedText = `Stark Industries Synchronized Time: **${dt.starkSystemTime || dt.iso}**`;
    } else if (toolResult.toolName === 'unitConversion') {
      const conv = toolResult.result as { result?: number; to?: string };
      formattedText = `Conversion telemetry verified: **${conv.result} ${conv.to}**`;
    } else {
      formattedText = `Tactical protocol executed successfully:\n\`\`\`json\n${JSON.stringify(toolResult.result, null, 2)}\n\`\`\``;
    }
    return {
      success: true,
      data: {
        success: true,
        provider: 'gemini',
        model: 'stark-tactical-tools',
        text: formattedText,
        usage: null,
        requestId: 'local-tool-' + Date.now(),
      },
      attemptedProviders,
      fallbackOccurred: attemptedProviders.length > 1,
      toolInvocations,
      error: null,
    };
  }

  // All eligible providers failed or unconfigured
  return {
    success: false,
    data: null,
    attemptedProviders,
    fallbackOccurred: attemptedProviders.length > 1,
    toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    error: {
      code: 'PROVIDER_UNAVAILABLE',
      message:
        lastError?.message ||
        `Provider ${primaryProvider} is unavailable or unconfigured. Please verify server secrets or select an active provider.`,
    },
  };
}

// Live provider test service
export async function testProviderConnectivity(
  provider: SupportedProvider
): Promise<{ success: boolean; provider: SupportedProvider; latencyMs: number; message: string }> {
  switch (provider) {
    case 'gemini': {
      const res = await testGemini();
      return { provider, ...res };
    }
    case 'nvidia': {
      const res = await testNvidia();
      return { provider, ...res };
    }
    case 'llm7': {
      const res = await testLlm7();
      return { provider, ...res };
    }
    case 'openrouter': {
      const res = await testOpenRouter();
      return { provider, ...res };
    }
    default:
      return {
        success: false,
        provider,
        latencyMs: 0,
        message: 'Unknown provider',
      };
  }
}
