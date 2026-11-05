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

interface GeminiBatchEmbedResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger(GeminiEmbeddingProvider.name);

  readonly providerName = 'gemini';
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
      this.configService.get<string>('GEMINI_EMBEDDING_API_KEY') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('EMBEDDING_API_KEY') ||
      '';

    if (isPlaceholderApiKey(this.apiKey)) {
      this.logger.warn(
        'Gemini Embedding API key is missing or set to a placeholder. Set GEMINI_EMBEDDING_API_KEY or GEMINI_API_KEY in apps/api/.env.',
      );
    }

    this.modelName =
      configOverrides?.model ||
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
      this.configService.get<string>('EMBEDDING_MODEL') ||
      'gemini-embedding-001';

    const configuredDim =
      configOverrides?.dimensions ||
      Number(this.configService.get<string>('GEMINI_EMBEDDING_DIMENSIONS')) ||
      Number(this.configService.get<string>('EMBEDDING_DIMENSIONS')) ||
      768;
    this.dimension = Number.isInteger(configuredDim) && configuredDim > 0 ? configuredDim : 768;

    this.baseUrl = (
      configOverrides?.baseUrl ||
      this.configService.get<string>('GEMINI_BASE_URL') ||
      'https://generativelanguage.googleapis.com/v1beta'
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

  async generateEmbedding(text: string): Promise<number[]> {
    const [result] = await this.generateEmbeddings([text]);
    if (!result) {
      throw new Error('Failed to generate embedding: empty result from provider');
    }
    return result;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (isPlaceholderApiKey(this.apiKey)) {
      throw new Error(
        'Embedding provider error: GEMINI_API_KEY is not configured in environment (or is set to a placeholder). Please configure a valid API key in apps/api/.env.',
      );
    }

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

  private async executeBatchWithRetry(
    batch: string[],
    batchIndex: number,
  ): Promise<number[][]> {
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const fullModelName = this.modelName.startsWith('models/')
          ? this.modelName
          : `models/${this.modelName}`;

        const requests = batch.map((text) => ({
          model: fullModelName,
          content: {
            parts: [{ text: text && text.trim().length > 0 ? text : ' ' }],
          },
          outputDimensionality: this.dimension,
        }));

        const url = `${this.baseUrl}/${fullModelName}:batchEmbedContents?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
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
            // non-json response
          }

          const sanitizedRawError = sanitizeErrorMessage(errorMessage);

          // 1. Authentication / Invalid key errors (HTTP 400 with invalid key message, 401, or 403)
          const isAuthError =
            status === 401 ||
            status === 403 ||
            (status === 400 &&
              (sanitizedRawError.toLowerCase().includes('api key') ||
                sanitizedRawError.toLowerCase().includes('invalid_argument')));

          if (isAuthError && !sanitizedRawError.toLowerCase().includes('model')) {
            this.logger.error(
              `Gemini Embedding provider authentication failed (status ${status}). Verify that GEMINI_API_KEY or GEMINI_EMBEDDING_API_KEY is configured with a valid Google AI key.`,
            );
            throw new Error(
              `Gemini API error (status ${status}): Invalid API key or authentication failed. Please verify that a valid GEMINI_API_KEY is configured.`,
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
              'Gemini Embedding API quota exhausted (status 429). Please check your Gemini rate limits or quota at https://aistudio.google.com/',
            );
            throw new Error(
              'Gemini API error (status 429): Gemini API quota exhausted. Please check your Gemini rate limits or quota at https://aistudio.google.com/',
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
              `Gemini API returned status ${status} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }

          throw new Error(`Gemini API error (status ${status}): ${sanitizedRawError}`);
        }

        const data: GeminiBatchEmbedResponse = await response.json();

        if (!data || !Array.isArray(data.embeddings)) {
          throw new Error('Malformed response from Gemini API: missing "embeddings" array');
        }

        if (data.embeddings.length !== batch.length) {
          throw new Error(
            `Embedding count mismatch: expected ${batch.length} embeddings, received ${data.embeddings.length}`,
          );
        }

        const validatedEmbeddings: number[][] = [];
        for (let i = 0; i < data.embeddings.length; i++) {
          const item = data.embeddings[i];
          const vector = item?.values;

          if (!Array.isArray(vector)) {
            throw new Error(`Invalid embedding at index ${i}: vector is not an array`);
          }

          if (vector.length !== this.dimension) {
            throw new Error(
              `Invalid embedding dimension at index ${i}: expected ${this.dimension}, received ${vector.length}`,
            );
          }

          validatedEmbeddings.push(this.normalizeVector(vector));
        }

        return validatedEmbeddings;
      } catch (error: any) {
        clearTimeout(timeoutHandle);

        const isAbortError = error.name === 'AbortError' || error.message?.includes('aborted');
        if (isAbortError && attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
          this.logger.warn(
            `Gemini API request timed out after ${this.timeoutMs}ms (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }

        if (attempt >= this.maxRetries || !this.isRetryableError(error)) {
          this.logger.error(
            `Gemini embedding generation failed for batch ${batchIndex} (${batch.length} items): ${sanitizeErrorMessage(error.message)}`,
          );
          throw error;
        }

        const delayMs = this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        this.logger.warn(
          `Retryable Gemini error: ${sanitizeErrorMessage(error.message)} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayMs)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt++;
      }
    }

    throw new Error(`Gemini API request failed after ${this.maxRetries + 1} attempts`);
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0 || Math.abs(norm - 1.0) < 1e-5) {
      return vector;
    }
    return vector.map((val) => val / norm);
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
