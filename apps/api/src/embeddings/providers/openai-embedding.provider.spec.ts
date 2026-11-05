import { ConfigService } from '@nestjs/config';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

describe('OpenAiEmbeddingProvider', () => {
  let provider: OpenAiEmbeddingProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let globalFetchMock: jest.Mock;

  const mockApiKey = 'sk-mock-test-key-12345';
  const defaultDimension = 1536;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return mockApiKey;
        if (key === 'OPENAI_EMBEDDING_MODEL') return 'text-embedding-3-small';
        if (key === 'OPENAI_EMBEDDING_DIMENSIONS') return '1536';
        if (key === 'EMBEDDING_BATCH_SIZE') return '2';
        if (key === 'EMBEDDING_MAX_RETRIES') return '2';
        if (key === 'EMBEDDING_RETRY_DELAY_MS') return '10'; // Fast retry for tests
        if (key === 'EMBEDDING_TIMEOUT_MS') return '500';
        return undefined;
      }),
    } as any;

    provider = new OpenAiEmbeddingProvider(mockConfigService);

    // Mock global fetch
    globalFetchMock = jest.fn();
    (global as any).fetch = globalFetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function createMockEmbeddingVector(dim: number = defaultDimension, fillVal: number = 0.1): number[] {
    return new Array(dim).fill(fillVal);
  }

  describe('Configuration & Initialization', () => {
    it('should initialize with correct provider name, model, and dimension', () => {
      expect(provider.providerName).toBe('openai');
      expect(provider.modelName).toBe('text-embedding-3-small');
      expect(provider.dimension).toBe(1536);
    });

    it('should throw an error when API key is missing', async () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;
      const noKeyProvider = new OpenAiEmbeddingProvider(emptyConfig);

      await expect(noKeyProvider.generateEmbeddings(['test text'])).rejects.toThrow(
        /OPENAI_API_KEY is not configured/,
      );
    });

    it('should reject placeholder API keys', async () => {
      const placeholderConfig = {
        get: jest.fn((k: string) => (k === 'OPENAI_API_KEY' ? 'your_openai_api_key_here' : undefined)),
      } as any;
      const placeholderProvider = new OpenAiEmbeddingProvider(placeholderConfig);

      await expect(placeholderProvider.generateEmbeddings(['test text'])).rejects.toThrow(
        /is set to a placeholder/,
      );
    });

    it('should prioritize OPENAI_EMBEDDING_API_KEY over OPENAI_API_KEY', async () => {
      const customConfig = {
        get: jest.fn((k: string) => {
          if (k === 'OPENAI_EMBEDDING_API_KEY') return 'sk-custom-embedding-key';
          if (k === 'OPENAI_API_KEY') return 'sk-default-key';
          return undefined;
        }),
      } as any;
      const customProvider = new OpenAiEmbeddingProvider(customConfig);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: createMockEmbeddingVector() }],
          model: 'text-embedding-3-small',
        }),
      });

      await customProvider.generateEmbedding('hello');
      const calledInit = globalFetchMock.mock.calls[0][1];
      expect(calledInit.headers.Authorization).toBe('Bearer sk-custom-embedding-key');
    });
  });

  describe('Embedding Generation & Dimension Validation', () => {
    it('should generate embeddings for multiple texts and preserve index ordering', async () => {
      const vec0 = createMockEmbeddingVector(1536, 0.1);
      const vec1 = createMockEmbeddingVector(1536, 0.2);

      // Return items in reverse order to test index sorting
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [
            { object: 'embedding', index: 1, embedding: vec1 },
            { object: 'embedding', index: 0, embedding: vec0 },
          ],
          model: 'text-embedding-3-small',
        }),
      });

      const results = await provider.generateEmbeddings(['First text', 'Second text']);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(vec0);
      expect(results[1]).toEqual(vec1);
      expect(globalFetchMock).toHaveBeenCalledTimes(1);

      // Verify request payload
      const [calledUrl, calledInit] = globalFetchMock.mock.calls[0];
      expect(calledUrl).toBe('https://api.openai.com/v1/embeddings');
      expect(calledInit.headers.Authorization).toBe(`Bearer ${mockApiKey}`);
      const body = JSON.parse(calledInit.body);
      expect(body.model).toBe('text-embedding-3-small');
      expect(body.dimensions).toBe(1536);
      expect(body.input).toEqual(['First text', 'Second text']);
    });

    it('should generate a single embedding via generateEmbedding', async () => {
      const vec = createMockEmbeddingVector(1536, 0.42);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: vec }],
          model: 'text-embedding-3-small',
        }),
      });

      const result = await provider.generateEmbedding('Single query text');
      expect(result).toEqual(vec);
      expect(result).toHaveLength(1536);
    });

    it('should reject when returned embedding has invalid dimension', async () => {
      // Mock returns 512 dimensions instead of expected 1536
      const invalidVec = createMockEmbeddingVector(512, 0.5);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: invalidVec }],
          model: 'text-embedding-3-small',
        }),
      });

      await expect(provider.generateEmbedding('Test text')).rejects.toThrow(
        /Invalid embedding dimension at index 0: expected 1536, received 512/,
      );
    });

    it('should reject when returned embedding is not an array', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: 'not-an-array' }],
          model: 'text-embedding-3-small',
        }),
      });

      await expect(provider.generateEmbedding('Test text')).rejects.toThrow(
        /vector is not an array/,
      );
    });
  });

  describe('Batch Processing', () => {
    it('should split inputs into batches when exceeding batchSize', async () => {
      // batchSize configured to 2, sending 5 items => 3 batches (2 + 2 + 1)
      const texts = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];

      const v1 = createMockEmbeddingVector(1536, 0.1);
      const v2 = createMockEmbeddingVector(1536, 0.2);
      const v3 = createMockEmbeddingVector(1536, 0.3);
      const v4 = createMockEmbeddingVector(1536, 0.4);
      const v5 = createMockEmbeddingVector(1536, 0.5);

      // Batch 1 (Item 1, 2)
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [
            { object: 'embedding', index: 0, embedding: v1 },
            { object: 'embedding', index: 1, embedding: v2 },
          ],
        }),
      });

      // Batch 2 (Item 3, 4)
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [
            { object: 'embedding', index: 0, embedding: v3 },
            { object: 'embedding', index: 1, embedding: v4 },
          ],
        }),
      });

      // Batch 3 (Item 5)
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: v5 }],
        }),
      });

      const results = await provider.generateEmbeddings(texts);

      expect(globalFetchMock).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(5);
      expect(results[0]).toEqual(v1);
      expect(results[1]).toEqual(v2);
      expect(results[2]).toEqual(v3);
      expect(results[3]).toEqual(v4);
      expect(results[4]).toEqual(v5);
    });
  });

  describe('Error Handling, Rate Limiting & Retries', () => {
    it('should retry on HTTP 429 rate limit and succeed after backoff', async () => {
      const vec = createMockEmbeddingVector(1536, 0.7);

      // First call returns 429 Rate Limit
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0.01' }),
        json: async () => ({
          error: { message: 'Rate limit reached. Please retry.' },
        }),
      });

      // Second call succeeds
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: vec }],
        }),
      });

      const result = await provider.generateEmbedding('Query after rate limit');
      expect(result).toEqual(vec);
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error and succeed', async () => {
      const vec = createMockEmbeddingVector(1536, 0.88);

      // First call returns 500 Internal Server Error
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({
          error: { message: 'Internal server error' },
        }),
      });

      // Second call succeeds
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ object: 'embedding', index: 0, embedding: vec }],
        }),
      });

      const result = await provider.generateEmbedding('Query after 500');
      expect(result).toEqual(vec);
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail immediately without retry on quota exhaustion (HTTP 429)', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        json: async () => ({
          error: {
            code: 'insufficient_quota',
            message: 'You have no credits remaining.',
          },
        }),
      });

      await expect(provider.generateEmbedding('Query')).rejects.toThrow(
        /OpenAI API credit quota exhausted/,
      );

      // Must not retry on quota exhaustion
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    it('should fail immediately without retry on non-retryable 401 error', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      });

      await expect(provider.generateEmbedding('Query')).rejects.toThrow(
        /Embedding API error \(status 401\): Invalid API key/,
      );

      // Must not retry on 401
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw error when provider remains unavailable', async () => {
      globalFetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers(),
        json: async () => ({
          error: { message: 'Service unavailable' },
        }),
      });

      await expect(provider.generateEmbedding('Query')).rejects.toThrow(
        /Embedding API error \(status 503\): Service unavailable/,
      );

      // Initial attempt + 2 retries = 3 total attempts
      expect(globalFetchMock).toHaveBeenCalledTimes(3);
    });
  });
});
