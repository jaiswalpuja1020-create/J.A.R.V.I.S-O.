// config/ai-config.ts - Approved providers specifications

export type SupportedProvider = 'gemini' | 'nvidia' | 'llm7' | 'openrouter';

export interface ProviderMetadata {
  id: SupportedProvider;
  name: string;
  defaultModel: string;
  verifiedModels: string[];
  endpoint?: string;
  authHeader: string;
  description: string;
  docsUrl: string;
}

export const APPROVED_PROVIDERS: Record<SupportedProvider, ProviderMetadata> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-3.8-flash',
    verifiedModels: ['gemini-3.8-flash'],
    authHeader: 'GEMINI_API_KEY',
    description: 'Default primary intelligence core for J.A.R.V.I.S.-O with high-speed reasoning and tool orchestration.',
    docsUrl: 'https://ai.google.dev',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM API',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    verifiedModels: [
      'meta/llama-3.3-70b-instruct',
      'mistralai/mixtral-8x7b-instruct-v0.1',
      'nvidia/nemotron-4-340b-instruct',
    ],
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    authHeader: 'Bearer NVIDIA_API_KEY',
    description: 'NVIDIA accelerated AI inference microservices for complex tactical compute.',
    docsUrl: 'https://build.nvidia.com',
  },
  llm7: {
    id: 'llm7',
    name: 'LLM7.io API',
    defaultModel: 'claude-3-5-sonnet',
    verifiedModels: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-2.0-flash'],
    endpoint: 'https://api.llm7.io/v1/chat/completions',
    authHeader: 'Bearer LLM7_API_KEY',
    description: 'High-performance OpenAI-compatible unified proxy routing.',
    docsUrl: 'https://llm7.io',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter API',
    defaultModel: 'nvidia/nemotron-3.5-lightning:free',
    verifiedModels: [
      'nvidia/nemotron-3.5-lightning:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'recursive/flint-v1.0:free',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-72b-instruct',
    ],
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authHeader: 'Bearer OPENROUTER_API_KEY',
    description: 'OpenRouter gateway with access to verified free and community open weights.',
    docsUrl: 'https://openrouter.ai',
  },
};

export interface NormalizedAIResponse {
  success: boolean;
  provider: SupportedProvider;
  model: string;
  text: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | null;
  requestId: string | null;
}
