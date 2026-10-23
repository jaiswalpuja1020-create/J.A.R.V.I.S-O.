// config/env.ts - Centralized environment validation and safe access

export interface AppConfig {
  name: string;
  personality: string;
  defaultLanguage: string;
  enableWebSearch: boolean;
  enableFileSearch: boolean;
  enableConversationMemory: boolean;
  defaultProvider: 'gemini' | 'nvidia' | 'llm7' | 'openrouter';
  fallbackEnabled: boolean;
  maxFallbackAttempts: number;
  port: number;
  nodeEnv: string;
  aiTimeoutMs: number;
  maxOutputTokens: number;
  maxConversationMessages: number;
  maxUploadSizeMb: number;
  sessionTtlMinutes: number;
  searchProvider?: string;
}

export function getConfig(): AppConfig {
  return {
    name: process.env.JARVIS_O_NAME || 'J.A.R.V.I.S.-O',
    personality:
      process.env.JARVIS_O_PERSONALITY ||
      'futuristic, professional, helpful, intelligent, calm and precise',
    defaultLanguage: process.env.JARVIS_DEFAULT_LANGUAGE || 'auto',
    enableWebSearch: process.env.ENABLE_WEB_SEARCH !== 'false',
    enableFileSearch: process.env.ENABLE_FILE_SEARCH !== 'false',
    enableConversationMemory: process.env.ENABLE_CONVERSATION_MEMORY !== 'false',
    defaultProvider: (['gemini', 'nvidia', 'llm7', 'openrouter'].includes(
      process.env.AI_DEFAULT_PROVIDER || ''
    )
      ? process.env.AI_DEFAULT_PROVIDER
      : 'gemini') as AppConfig['defaultProvider'],
    fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false',
    maxFallbackAttempts: Number(process.env.AI_MAX_FALLBACK_ATTEMPTS) || 2,
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    aiTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000,
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS) || 2048,
    maxConversationMessages:
      Number(process.env.MAX_CONVERSATION_MESSAGES) || 30,
    maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 10,
    sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES) || 60,
    searchProvider: process.env.SEARCH_PROVIDER || undefined,
  };
}

export function isProviderConfigured(
  provider: 'gemini' | 'nvidia' | 'llm7' | 'openrouter'
): boolean {
  switch (provider) {
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    case 'nvidia':
      return Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim().length > 0);
    case 'llm7':
      return Boolean(process.env.LLM7_API_KEY && process.env.LLM7_API_KEY.trim().length > 0);
    case 'openrouter':
      return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
    default:
      return false;
  }
}
