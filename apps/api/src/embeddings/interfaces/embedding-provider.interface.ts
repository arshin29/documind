export const EMBEDDING_PROVIDER_TOKEN = 'EMBEDDING_PROVIDER';

export interface EmbeddingProviderConfig {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  baseUrl?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  batchSize?: number;
}

export interface EmbeddingProvider {
  /**
   * Identification name of the provider (e.g. 'openai', 'gemini')
   */
  readonly providerName: string;

  /**
   * The model identifier being used (e.g. 'text-embedding-3-small')
   */
  readonly modelName: string;

  /**
   * Dimensionality of output vectors (e.g. 1536)
   */
  readonly dimension: number;

  /**
   * Generate vector embeddings for an array of input texts.
   * Handles batching internally if texts exceed batch size.
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Generate vector embedding for a single text string.
   */
  generateEmbedding(text: string): Promise<number[]>;
}

