import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatMessage,
  ChatCompletionOptions,
  LLMProvider,
  LLMProviderConfig,
} from '../interfaces/llm-provider.interface';
import {
  isPlaceholderApiKey,
  sanitizeErrorMessage,
} from '../../common/utils/api-key.utils';

interface OpenAiChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

@Injectable()
export class OpenAiLlmProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAiLlmProvider.name);

  readonly providerName = 'openai';
  readonly modelName: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    configOverrides?: Partial<LLMProviderConfig>,
  ) {
    this.apiKey =
      configOverrides?.apiKey ||
      this.configService.get<string>('OPENAI_CHAT_API_KEY') ||
      this.configService.get<string>('CHAT_API_KEY') ||
      this.configService.get<string>('LLM_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY') ||
      '';

    if (isPlaceholderApiKey(this.apiKey)) {
      this.logger.warn(
        'OpenAI Chat API key is missing or set to a placeholder. Set OPENAI_CHAT_API_KEY, LLM_API_KEY, or OPENAI_API_KEY in apps/api/.env.',
      );
    }

    this.modelName =
      configOverrides?.model ||
      this.configService.get<string>('OPENAI_CHAT_MODEL') ||
      this.configService.get<string>('LLM_MODEL') ||
      'gpt-4o-mini';

    this.baseUrl = (
      configOverrides?.baseUrl ||
      this.configService.get<string>('OPENAI_BASE_URL') ||
      'https://api.openai.com/v1'
    ).replace(/\/+$/, '');

    this.maxRetries =
      configOverrides?.maxRetries ??
      (Number(this.configService.get<string>('LLM_MAX_RETRIES')) || 3);

    this.retryDelayMs =
      configOverrides?.retryDelayMs ??
      (Number(this.configService.get<string>('LLM_RETRY_DELAY_MS')) || 1000);

    this.timeoutMs =
      configOverrides?.timeoutMs ??
      (Number(this.configService.get<string>('LLM_TIMEOUT_MS')) || 60000);
  }

  /**
   * Complete a chat conversation (non-streaming)
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<string> {
    if (isPlaceholderApiKey(this.apiKey)) {
      throw new Error(
        'LLM provider error: OPENAI_API_KEY is not configured in environment (or is set to a placeholder). Please configure a valid API key in apps/api/.env.',
      );
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

      // Link external abort signal if provided
      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        const payload: Record<string, any> = {
          model: this.modelName,
          messages,
          stream: false,
          temperature: options?.temperature ?? 0.2,
        };

        if (options?.maxTokens) {
          payload.max_tokens = options.maxTokens;
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        if (!response.ok) {
          const status = response.status;
          let errorMessage = `HTTP ${status}`;
          let errorCode = '';
          let errorType = '';
          try {
            const errBody = await response.json();
            errorMessage = errBody?.error?.message || errorMessage;
            errorCode = errBody?.error?.code || '';
            errorType = errBody?.error?.type || '';
          } catch {
            // non-json response body
          }

          const sanitizedRawError = sanitizeErrorMessage(errorMessage);

          // 1. Authentication failure (HTTP 401)
          if (status === 401) {
            this.logger.error(
              'OpenAI Chat provider authentication failed (status 401). Verify that OPENAI_API_KEY or OPENAI_CHAT_API_KEY is configured with a valid OpenAI key.',
            );
            throw new Error(
              'OpenAI Chat API error (status 401): Invalid API key or authentication failed. Please verify that a valid OpenAI API key is configured.',
            );
          }

          // 2. Billing / quota exhaustion (HTTP 429)
          const isQuotaExhausted =
            status === 429 &&
            (errorCode === 'insufficient_quota' ||
              errorCode === 'credit_balance_exhausted' ||
              errorType === 'insufficient_quota' ||
              sanitizedRawError.toLowerCase().includes('quota') ||
              sanitizedRawError.toLowerCase().includes('credit') ||
              sanitizedRawError.toLowerCase().includes('billing'));

          if (isQuotaExhausted) {
            this.logger.error(
              'OpenAI Chat API credit balance exhausted (status 429). OpenAI billing account needs credits.',
            );
            throw new Error(
              'OpenAI Chat API error (status 429): OpenAI API credit quota exhausted. Please check your billing at https://platform.openai.com/settings/organization/billing/',
            );
          }

          // 3. Transient rate limits or server errors
          const isRateLimit = status === 429;
          const isServerError = status >= 500 && status < 600;

          if ((isRateLimit || isServerError) && attempt < this.maxRetries) {
            const retryAfterHeader = response.headers.get('retry-after');
            let delayMs = this.retryDelayMs * Math.pow(2, attempt);
            if (retryAfterHeader) {
              const seconds = parseFloat(retryAfterHeader);
              if (!isNaN(seconds) && seconds > 0) {
                delayMs = Math.max(delayMs, seconds * 1000);
              }
            }
            delayMs += Math.random() * 200;

            this.logger.warn(
              `OpenAI Chat API returned status ${status} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }

          throw new Error(`OpenAI Chat API error (status ${status}): ${sanitizedRawError}`);
        }

        const data: OpenAiChatResponse = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (content === undefined || content === null) {
          throw new Error('Malformed response from LLM API: missing choices content');
        }

        return content;
      } catch (error: any) {
        clearTimeout(timeoutHandle);

        const isAbortError =
          error.name === 'AbortError' || error.message?.includes('aborted');

        if (isAbortError && attempt < this.maxRetries && !options?.signal?.aborted) {
          const delayMs =
            this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
          this.logger.warn(
            `OpenAI request timed out after ${this.timeoutMs}ms. Retrying in ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
          this.logger.error(`LLM completion failed: ${sanitizeErrorMessage(error.message)}`);
          throw error;
        }

        const delayMs =
          this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        this.logger.warn(
          `Retryable LLM error: ${sanitizeErrorMessage(error.message)}. Retrying in ${Math.round(delayMs)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
      }
    }

    throw new Error(`LLM completion request failed after ${this.maxRetries + 1} attempts`);
  }

  /**
   * Stream a chat completion yielding incremental text tokens
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): AsyncIterable<string> {
    if (isPlaceholderApiKey(this.apiKey)) {
      throw new Error(
        'LLM provider error: OPENAI_API_KEY is not configured in environment (or is set to a placeholder). Please configure a valid API key in apps/api/.env.',
      );
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const payload: Record<string, any> = {
        model: this.modelName,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.2,
      };

      if (options?.maxTokens) {
        payload.max_tokens = options.maxTokens;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        const status = response.status;
        let errorMessage = `HTTP ${status}`;
        let errorCode = '';
        let errorType = '';
        try {
          const errBody = await response.json();
          errorMessage = errBody?.error?.message || errorMessage;
          errorCode = errBody?.error?.code || '';
          errorType = errBody?.error?.type || '';
        } catch {
          // non-json
        }
        const sanitizedRawError = sanitizeErrorMessage(errorMessage);

        // 1. Authentication failure (HTTP 401)
        if (status === 401) {
          this.logger.error(
            'OpenAI Chat streaming authentication failed (status 401). Verify that OPENAI_API_KEY or OPENAI_CHAT_API_KEY is configured with a valid OpenAI key.',
          );
          throw new Error(
            'OpenAI Chat API error (status 401): Invalid API key or authentication failed. Please verify that a valid OpenAI API key is configured.',
          );
        }

        // 2. Billing / quota exhaustion (HTTP 429)
        const isQuotaExhausted =
          status === 429 &&
          (errorCode === 'insufficient_quota' ||
            errorCode === 'credit_balance_exhausted' ||
            errorType === 'insufficient_quota' ||
            sanitizedRawError.toLowerCase().includes('quota') ||
            sanitizedRawError.toLowerCase().includes('credit') ||
            sanitizedRawError.toLowerCase().includes('billing'));

        if (isQuotaExhausted) {
          this.logger.error(
            'OpenAI Chat streaming credit balance exhausted (status 429). OpenAI billing account needs credits.',
          );
          throw new Error(
            'OpenAI Chat API error (status 429): OpenAI API credit quota exhausted. Please check your billing at https://platform.openai.com/settings/organization/billing/',
          );
        }

        throw new Error(`OpenAI Streaming API error (status ${status}): ${sanitizedRawError}`);
      }

      if (!response.body) {
        throw new Error('No readable stream body returned from LLM streaming API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (options?.signal?.aborted) {
          await reader.cancel();
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // comments/empty lines

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                yield deltaContent;
              }
            } catch {
              // Ignore malformed chunk lines
            }
          }
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutHandle);
      if (options?.signal?.aborted) {
        return; // Normal client cancellation
      }
      this.logger.error(`Error during LLM streaming: ${sanitizeErrorMessage(error.message)}`);
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const msg = error.message?.toLowerCase() || '';
    if (
      msg.includes('quota') ||
      msg.includes('credit') ||
      msg.includes('invalid api key') ||
      msg.includes('authentication failed') ||
      msg.includes('unauthorized') ||
      msg.includes('not configured') ||
      msg.includes('placeholder')
    ) {
      return false;
    }
    return (
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('timeout') ||
      msg.includes('429') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504')
    );
  }
}

