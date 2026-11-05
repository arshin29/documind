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

interface GeminiCandidate {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
    role?: string;
  };
  finishReason?: string;
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

@Injectable()
export class GeminiLlmProvider implements LLMProvider {
  private readonly logger = new Logger(GeminiLlmProvider.name);

  readonly providerName = 'gemini';
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
      this.configService.get<string>('GEMINI_CHAT_API_KEY') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('LLM_API_KEY') ||
      '';

    if (isPlaceholderApiKey(this.apiKey)) {
      this.logger.warn(
        'Gemini Chat API key is missing or set to a placeholder. Set GEMINI_CHAT_API_KEY or GEMINI_API_KEY in apps/api/.env.',
      );
    }

    this.modelName =
      configOverrides?.model ||
      this.configService.get<string>('GEMINI_CHAT_MODEL') ||
      this.configService.get<string>('LLM_MODEL') ||
      'gemini-3.5-flash-lite';

    this.baseUrl = (
      configOverrides?.baseUrl ||
      this.configService.get<string>('GEMINI_BASE_URL') ||
      'https://generativelanguage.googleapis.com/v1beta'
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

  private buildPayload(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Record<string, any> {
    const systemTexts = messages
      .filter((m) => m.role === 'system')
      .map((m) => (m.content || '').trim())
      .filter(Boolean);

    const nonSystem = messages.filter((m) => m.role !== 'system');
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of nonSystem) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = (msg.content || '').trim() || ' ';

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n\n' + text;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }

    // Fallback if contents is empty or starts with model
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    } else if (contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const payload: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
      },
    };

    if (systemTexts.length > 0) {
      payload.systemInstruction = {
        parts: [{ text: systemTexts.join('\n\n') }],
      };
    }

    if (options?.maxTokens) {
      payload.generationConfig.maxOutputTokens = options.maxTokens;
    }

    return payload;
  }

  private getFullModelName(): string {
    return this.modelName.startsWith('models/')
      ? this.modelName
      : `models/${this.modelName}`;
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
        'LLM provider error: GEMINI_API_KEY is not configured in environment (or is set to a placeholder). Please configure a valid API key in apps/api/.env.',
      );
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        const fullModelName = this.getFullModelName();
        const payload = this.buildPayload(messages, options);

        const url = `${this.baseUrl}/${fullModelName}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        if (!response.ok) {
          const status = response.status;
          let errorMessage = `HTTP ${status}`;
          let errorStatus = '';
          try {
            const errBody = await response.json();
            errorMessage = errBody?.error?.message || errorMessage;
            errorStatus = errBody?.error?.status || '';
          } catch {
            // non-json response body
          }

          const sanitizedRawError = sanitizeErrorMessage(errorMessage);

          // 1. Authentication / Invalid key errors
          const isAuthError =
            status === 401 ||
            status === 403 ||
            (status === 400 &&
              (sanitizedRawError.toLowerCase().includes('api key') ||
                sanitizedRawError.toLowerCase().includes('invalid_argument')));

          if (isAuthError && !sanitizedRawError.toLowerCase().includes('model')) {
            this.logger.error(
              `Gemini Chat provider authentication failed (status ${status}). Verify that GEMINI_API_KEY or GEMINI_CHAT_API_KEY is configured with a valid Google AI key.`,
            );
            throw new Error(
              `Gemini Chat API error (status ${status}): Invalid API key or authentication failed. Please verify that a valid GEMINI_API_KEY is configured.`,
            );
          }

          // 2. Quota exhaustion (HTTP 429 RESOURCE_EXHAUSTED)
          const isQuotaExhausted =
            status === 429 &&
            (errorStatus === 'RESOURCE_EXHAUSTED' ||
              sanitizedRawError.toLowerCase().includes('quota') ||
              sanitizedRawError.toLowerCase().includes('exhausted') ||
              sanitizedRawError.toLowerCase().includes('resource_exhausted'));

          if (isQuotaExhausted) {
            this.logger.error(
              'Gemini Chat API quota exhausted (status 429). Please check your Gemini rate limits or quota at https://aistudio.google.com/',
            );
            throw new Error(
              'Gemini Chat API error (status 429): Gemini API quota exhausted. Please check your Gemini rate limits or quota at https://aistudio.google.com/',
            );
          }

          const isRateLimit = status === 429;
          const isServerError = status >= 500 && status < 600;

          if ((isRateLimit || isServerError) && attempt < this.maxRetries) {
            const retryAfterHeader = response.headers?.get ? response.headers.get('retry-after') : null;
            let delayMs = this.retryDelayMs * Math.pow(2, attempt);
            if (retryAfterHeader) {
              const seconds = parseFloat(retryAfterHeader);
              if (!isNaN(seconds) && seconds > 0) {
                delayMs = Math.max(delayMs, seconds * 1000);
              }
            }
            delayMs += Math.random() * 200;

            this.logger.warn(
              `Gemini Chat API returned status ${status} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }

          throw new Error(`Gemini Chat API error (status ${status}): ${sanitizedRawError}`);
        }

        const data: GeminiGenerateContentResponse = await response.json();
        const candidate = data?.candidates?.[0];
        const parts = candidate?.content?.parts;

        if (!parts || parts.length === 0) {
          throw new Error('Malformed response from Gemini LLM API: missing candidates content');
        }

        return parts.map((p) => p.text || '').join('');
      } catch (error: any) {
        clearTimeout(timeoutHandle);

        const isAbortError =
          error.name === 'AbortError' || error.message?.includes('aborted');

        if (isAbortError && attempt < this.maxRetries && !options?.signal?.aborted) {
          const delayMs =
            this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
          this.logger.warn(
            `Gemini request timed out after ${this.timeoutMs}ms. Retrying in ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
          this.logger.error(`Gemini LLM completion failed: ${sanitizeErrorMessage(error.message)}`);
          throw error;
        }

        const delayMs =
          this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        this.logger.warn(
          `Retryable Gemini LLM error: ${sanitizeErrorMessage(error.message)}. Retrying in ${Math.round(delayMs)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
      }
    }

    throw new Error(`Gemini LLM completion request failed after ${this.maxRetries + 1} attempts`);
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
        'LLM provider error: GEMINI_API_KEY is not configured in environment (or is set to a placeholder). Please configure a valid API key in apps/api/.env.',
      );
    }

    const fullModelName = this.getFullModelName();
    const payload = this.buildPayload(messages, options);
    const url = `${this.baseUrl}/${fullModelName}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    let attempt = 0;
    let response: Response | null = null;

    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        if (!response.ok) {
          const status = response.status;
          let errorMessage = `HTTP ${status}`;
          let errorStatus = '';
          try {
            const errBody = await response.json();
            errorMessage = errBody?.error?.message || errorMessage;
            errorStatus = errBody?.error?.status || '';
          } catch {
            // non-json
          }
          const sanitizedRawError = sanitizeErrorMessage(errorMessage);

          // 1. Authentication / Invalid key errors
          const isAuthError =
            status === 401 ||
            status === 403 ||
            (status === 400 &&
              (sanitizedRawError.toLowerCase().includes('api key') ||
                sanitizedRawError.toLowerCase().includes('invalid_argument')));

          if (isAuthError && !sanitizedRawError.toLowerCase().includes('model')) {
            this.logger.error(
              `Gemini Chat streaming authentication failed (status ${status}). Verify that GEMINI_API_KEY or GEMINI_CHAT_API_KEY is configured with a valid Google AI key.`,
            );
            throw new Error(
              `Gemini Chat API error (status ${status}): Invalid API key or authentication failed. Please verify that a valid GEMINI_API_KEY is configured.`,
            );
          }

          // 2. Quota exhaustion
          const isQuotaExhausted =
            status === 429 &&
            (errorStatus === 'RESOURCE_EXHAUSTED' ||
              sanitizedRawError.toLowerCase().includes('quota') ||
              sanitizedRawError.toLowerCase().includes('exhausted') ||
              sanitizedRawError.toLowerCase().includes('resource_exhausted'));

          if (isQuotaExhausted) {
            this.logger.error(
              'Gemini Chat streaming quota exhausted (status 429). Please check your Gemini rate limits or quota at https://aistudio.google.com/',
            );
            throw new Error(
              'Gemini Chat API error (status 429): Gemini API quota exhausted. Please check your Gemini rate limits or quota at https://aistudio.google.com/',
            );
          }

          // 3. Transient server errors (5xx)
          const isServerError = status >= 500 && status < 600;
          if (isServerError && attempt < this.maxRetries) {
            let delayMs = this.retryDelayMs * Math.pow(2, attempt);
            delayMs += Math.random() * 200;
            this.logger.warn(
              `Gemini Chat streaming API returned status ${status} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }

          throw new Error(`Gemini Streaming API error (status ${status}): ${sanitizedRawError}`);
        }

        // Response is ok, break out of retry loop to process stream
        break;
      } catch (error: any) {
        clearTimeout(timeoutHandle);
        if (options?.signal?.aborted) {
          return;
        }

        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
          this.logger.warn(
            `Gemini streaming connection failed: ${error.message} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        this.logger.error(`Error during Gemini LLM streaming: ${sanitizeErrorMessage(error.message)}`);
        throw error;
      }
    }

    if (!response || !response.body) {
      throw new Error('No readable stream body returned from Gemini LLM streaming API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        if (options?.signal?.aborted) {
          await reader.cancel();
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const parsed: GeminiGenerateContentResponse = JSON.parse(dataStr);
              const textParts = parsed?.candidates?.[0]?.content?.parts;
              if (Array.isArray(textParts)) {
                for (const part of textParts) {
                  if (part.text) {
                    yield part.text;
                  }
                }
              }
            } catch {
              // Ignore malformed partial chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (options?.signal?.aborted) {
        return;
      }
      this.logger.error(`Error during Gemini LLM streaming: ${sanitizeErrorMessage(error.message)}`);
      throw error;
    } finally {
      try {
        reader.releaseLock();
      } catch { }
    }
  }

  private isRetryableError(error: any): boolean {
    const msg = error.message?.toLowerCase() || '';
    if (
      msg.includes('quota') ||
      msg.includes('credit') ||
      msg.includes('exhausted') ||
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
