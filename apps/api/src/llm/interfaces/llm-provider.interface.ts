export const LLM_PROVIDER_TOKEN = 'LLM_PROVIDER';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface LLMProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export interface LLMProvider {
  /**
   * Identification name of the provider (e.g. 'openai')
   */
  readonly providerName: string;

  /**
   * Model identifier in use (e.g. 'gpt-4o-mini', 'gpt-4o')
   */
  readonly modelName: string;

  /**
   * Generate a complete chat completion (non-streaming)
   */
  generateChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<string>;

  /**
   * Stream a chat completion yielding incremental text tokens
   */
  streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): AsyncIterable<string>;
}

