import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmbeddingProvider,
  EmbeddingProviderConfig,
} from '../interfaces/embedding-provider.interface';
import {
  isPlaceholderApiKey,
  sanitizeErrorMessage,
} from '../../common/utils/api-key.utils';

interface OpenAiEmbeddingItem {
  object: string;
  index: number;
  embedding: number[];
}

interface OpenAiEmbeddingResponse {
  object: string;
  data: OpenAiEmbeddingItem[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);

  readonly providerName = 'openai';
  readonly modelName: string;
  readonly dimension: number;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;
  private readonly batchSize: number;

  constructor(
    private readonly configService: ConfigService,
    configOverrides?: Partial<EmbeddingProviderConfig>,
  ) {
    this.apiKey =
      configOverrides?.apiKey ||
      this.configService.get<string>('OPENAI_EMBEDDING_API_KEY') ||
      this.configService.get<string>('EMBEDDING_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY') ||
      '';

    if (isPlaceholderApiKey(this.apiKey)) {
      this.logger.warn(
        'OpenAI Embedding API key is missing or set to a placeholder. Set OPENAI_EMBEDDING_API_KEY, EMBEDDING_API_KEY, or OPENAI_API_KEY in apps/api/.env.',
      );
    }

    this.modelName =
      configOverrides?.model ||
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ||
      this.configService.get<string>('EMBEDDING_MODEL') ||
      'text-embedding-3-small';

    const configuredDim =
      configOverrides?.dimensions ||
      Number(this.configService.get<string>('OPENAI_EMBEDDING_DIMENSIONS')) ||
      Number(this.configService.get<string>('EMBEDDING_DIMENSIONS')) ||
      1536;
    this.dimension = Number.isInteger(configuredDim) && configuredDim > 0 ? configuredDim : 1536;

    this.baseUrl = (
      configOverrides?.baseUrl ||
      this.configService.get<string>('OPENAI_BASE_URL') ||
      'https://api.openai.com/v1'
    ).replace(/\/+$/, '');

    this.maxRetries =
      configOverrides?.maxRetries ??
      (Number(this.configService.get<string>('EMBEDDING_MAX_RETRIES')) || 3);

    this.retryDelayMs =
      configOverrides?.retryDelayMs ??
      (Number(this.configService.get<string>('EMBEDDING_RETRY_DELAY_MS')) || 1000);

    this.timeoutMs =
      configOverrides?.timeoutMs ??
      (Number(this.configService.get<string>('EMBEDDING_TIMEOUT_MS')) || 30000);

    this.batchSize =
      configOverrides?.batchSize ??
      (Number(this.configService.get<string>('EMBEDDING_BATCH_SIZE')) || 50);
  }

  /**
   * Generate vector embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const [result] = await this.generateEmbeddings([text]);
    if (!result) {
      throw new Error('Failed to generate embedding: empty result from provider');
    }
    return result;
  }

  /**
   * Generate vector embeddings for multiple texts, batching if needed
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (isPlaceholderApiKey(this.apiKey)) {
      throw new Error(
        'Embedding provider error: OPENAI_API_KEY is not configured in environment (or is set to a placeholder). Please configure a valid API key in apps/api/.env.',
      );
    }

    // Split into batches according to configured batchSize
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      batches.push(texts.slice(i, i + this.batchSize));
    }

    const allEmbeddings: number[][] = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchEmbeddings = await this.executeBatchWithRetry(batch, batchIdx);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Execute a single batch request with retry, timeout, rate-limit backoff, and dimension validation
   */
  private async executeBatchWithRetry(
    batch: string[],
    batchIndex: number,
  ): Promise<number[][]> {
    // Sanitize texts: replace empty or whitespace-only inputs with single space to avoid OpenAI 400
    const sanitizedInputs = batch.map((t) => {
      const trimmed = (t || '').trim();
      return trimmed.length > 0 ? trimmed : ' ';
    });

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const requestBody: Record<string, any> = {
          model: this.modelName,
          input: sanitizedInputs,
        };

        // If using text-embedding-3 models, pass explicit dimensions if configured
        if (this.modelName.includes('text-embedding-3')) {
          requestBody.dimensions = this.dimension;
        }

        const response = await fetch(`${this.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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
              'Embedding provider authentication failed (status 401). Verify that OPENAI_API_KEY or OPENAI_EMBEDDING_API_KEY is configured with a valid OpenAI key.',
            );
            throw new Error(
              'Embedding API error (status 401): Invalid API key or authentication failed. Please verify that a valid OpenAI API key is configured.',
            );
          }

          // 2. Billing / quota exhaustion (HTTP 429) - permanent until user adds credits
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
              'Embedding API credit balance exhausted (status 429). OpenAI billing account needs credits.',
            );
            throw new Error(
              'Embedding API error (status 429): OpenAI API credit quota exhausted. Please check your billing at https://platform.openai.com/settings/organization/billing/',
            );
          }

          // 3. Transient rate limits (429) or transient server errors (5xx)
          const isRateLimit = status === 429;
          const isServerError = status >= 500 && status < 600;

          if ((isRateLimit || isServerError) && attempt < this.maxRetries) {
            // Check Retry-After header if present
            const retryAfterHeader = response.headers.get('retry-after');
            let delayMs = this.retryDelayMs * Math.pow(2, attempt);
            if (retryAfterHeader) {
              const seconds = parseFloat(retryAfterHeader);
              if (!isNaN(seconds) && seconds > 0) {
                delayMs = Math.max(delayMs, seconds * 1000);
              }
            }
            // Add jitter
            delayMs += Math.random() * 200;

            this.logger.warn(
              `Embedding API returned status ${status} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }

          throw new Error(
            `Embedding API error (status ${status}): ${sanitizedRawError}`,
          );
        }

        const data: OpenAiEmbeddingResponse = await response.json();

        if (!data || !Array.isArray(data.data)) {
          throw new Error('Malformed response from embedding API: missing "data" array');
        }

        if (data.data.length !== batch.length) {
          throw new Error(
            `Embedding count mismatch: expected ${batch.length} embeddings, received ${data.data.length}`,
          );
        }

        // Sort items by index to ensure exact 1-to-1 ordering
        const sortedItems = [...data.data].sort((a, b) => a.index - b.index);

        // Validate vector dimensions for each embedding
        const validatedEmbeddings: number[][] = [];
        for (let i = 0; i < sortedItems.length; i++) {
          const item = sortedItems[i];
          const vector = item.embedding;

          if (!Array.isArray(vector)) {
            throw new Error(`Invalid embedding at index ${i}: vector is not an array`);
          }

          if (vector.length !== this.dimension) {
            throw new Error(
              `Invalid embedding dimension at index ${i}: expected ${this.dimension}, received ${vector.length}`,
            );
          }

          validatedEmbeddings.push(vector);
        }

        return validatedEmbeddings;
      } catch (error: any) {
        clearTimeout(timeoutHandle);

        const isAbortError = error.name === 'AbortError' || error.message?.includes('aborted');
        if (isAbortError && attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
          this.logger.warn(
            `Embedding API request timed out after ${this.timeoutMs}ms (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
          // Log without leaking text content or secrets
          this.logger.error(
            `Embedding generation failed for batch ${batchIndex} (${batch.length} items): ${sanitizeErrorMessage(error.message)}`,
          );
          throw error;
        }

        const delayMs = this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        this.logger.warn(
          `Retryable embedding error: ${sanitizeErrorMessage(error.message)} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
      }
    }

    throw new Error(`Embedding API request failed after ${this.maxRetries + 1} attempts`);
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
