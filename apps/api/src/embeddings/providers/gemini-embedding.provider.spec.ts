import { ConfigService } from '@nestjs/config';
import { GeminiEmbeddingProvider } from './gemini-embedding.provider';

describe('GeminiEmbeddingProvider', () => {
  let provider: GeminiEmbeddingProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let globalFetchMock: jest.Mock;

  const mockApiKey = 'AIzaSyMockKeyForGeminiTest12345';
  const defaultDimension = 768;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return mockApiKey;
        if (key === 'GEMINI_EMBEDDING_MODEL') return 'gemini-embedding-001';
        if (key === 'GEMINI_EMBEDDING_DIMENSIONS') return '768';
        if (key === 'EMBEDDING_BATCH_SIZE') return '2';
        if (key === 'EMBEDDING_MAX_RETRIES') return '2';
        if (key === 'EMBEDDING_RETRY_DELAY_MS') return '10';
        if (key === 'EMBEDDING_TIMEOUT_MS') return '500';
        return undefined;
      }),
    } as any;

    provider = new GeminiEmbeddingProvider(mockConfigService);

    globalFetchMock = jest.fn();
    (global as any).fetch = globalFetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function createMockEmbeddingVector(
    dim: number = defaultDimension,
    index: number = 0,
  ): number[] {
    const arr = new Array(dim).fill(0);
    arr[index % dim] = 1.0;
    return arr;
  }

  describe('Configuration & Initialization', () => {
    it('should initialize with correct provider name, model, and dimension', () => {
      expect(provider.providerName).toBe('gemini');
      expect(provider.modelName).toBe('gemini-embedding-001');
      expect(provider.dimension).toBe(768);
    });

    it('should default to gemini-embedding-001 when model is not configured', () => {
      const emptyConfig = {
        get: jest.fn((k: string) => (k === 'GEMINI_API_KEY' ? mockApiKey : undefined)),
      } as any;
      const defaultProvider = new GeminiEmbeddingProvider(emptyConfig);
      expect(defaultProvider.modelName).toBe('gemini-embedding-001');
      expect(defaultProvider.dimension).toBe(768);
    });

    it('should throw an error when API key is missing', async () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;
      const noKeyProvider = new GeminiEmbeddingProvider(emptyConfig);

      await expect(noKeyProvider.generateEmbeddings(['test text'])).rejects.toThrow(
        /GEMINI_API_KEY is not configured/,
      );
    });

    it('should reject placeholder API keys', async () => {
      const placeholderConfig = {
        get: jest.fn((k: string) =>
          k === 'GEMINI_API_KEY' ? 'your_gemini_api_key_here' : undefined,
        ),
      } as any;
      const placeholderProvider = new GeminiEmbeddingProvider(placeholderConfig);

      await expect(
        placeholderProvider.generateEmbeddings(['test text']),
      ).rejects.toThrow(/is set to a placeholder/);
    });

    it('should prioritize GEMINI_EMBEDDING_API_KEY over GEMINI_API_KEY', async () => {
      const customConfig = {
        get: jest.fn((k: string) => {
          if (k === 'GEMINI_EMBEDDING_API_KEY') return 'AIzaSyCustomEmbedKey';
          if (k === 'GEMINI_API_KEY') return 'AIzaSyDefaultKey';
          return undefined;
        }),
      } as any;
      const customProvider = new GeminiEmbeddingProvider(customConfig);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          embeddings: [{ values: createMockEmbeddingVector(768) }],
        }),
      });

      await customProvider.generateEmbedding('hello');
      const calledUrl = globalFetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('key=AIzaSyCustomEmbedKey');
    });
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for multiple texts', async () => {
      const vec0 = createMockEmbeddingVector(768, 0.1);
      const vec1 = createMockEmbeddingVector(768, 0.2);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          embeddings: [{ values: vec0 }, { values: vec1 }],
        }),
      });

      const results = await provider.generateEmbeddings(['Text 1', 'Text 2']);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(vec0);
      expect(results[1]).toEqual(vec1);
      expect(globalFetchMock).toHaveBeenCalledTimes(1);

      const [calledUrl, calledInit] = globalFetchMock.mock.calls[0];
      expect(calledUrl).toContain('/models/gemini-embedding-001:batchEmbedContents');
      const body = JSON.parse(calledInit.body);
      expect(body.requests).toHaveLength(2);
      expect(body.requests[0].outputDimensionality).toBe(768);
    });

    it('should normalize unnormalized embeddings to unit length', async () => {
      // Vector with length sqrt(3^2 + 4^2) = 5
      const unnormalizedVec = new Array(768).fill(0);
      unnormalizedVec[0] = 3;
      unnormalizedVec[1] = 4;

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          embeddings: [{ values: unnormalizedVec }],
        }),
      });

      const [res] = await provider.generateEmbeddings(['Normalize me']);
      expect(res[0]).toBeCloseTo(0.6, 5); // 3 / 5
      expect(res[1]).toBeCloseTo(0.8, 5); // 4 / 5
      const norm = Math.sqrt(res.reduce((s, v) => s + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it('should reject when returned embedding has invalid dimension', async () => {
      const invalidVec = createMockEmbeddingVector(512);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          embeddings: [{ values: invalidVec }],
        }),
      });

      await expect(provider.generateEmbedding('Test')).rejects.toThrow(
        /Invalid embedding dimension at index 0: expected 768, received 512/,
      );
    });
  });

  describe('Error Handling & Quotas', () => {
    it('should fail immediately without retry on quota exhaustion (RESOURCE_EXHAUSTED / 429)', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 429,
            status: 'RESOURCE_EXHAUSTED',
            message: 'Resource has been exhausted (e.g. check quota).',
          },
        }),
      });

      await expect(provider.generateEmbedding('Query')).rejects.toThrow(
        /Gemini API quota exhausted/,
      );

      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    it('should fail immediately on invalid API key (400 / 401)', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 400,
            status: 'INVALID_ARGUMENT',
            message: 'API key not valid. Please pass a valid API key.',
          },
        }),
      });

      await expect(provider.generateEmbedding('Query')).rejects.toThrow(
        /Invalid API key or authentication failed/,
      );

      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient 500 server error and succeed', async () => {
      const vec = createMockEmbeddingVector(768, 0.42);

      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal error' } }),
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          embeddings: [{ values: vec }],
        }),
      });

      const res = await provider.generateEmbedding('Query');
      expect(res).toEqual(vec);
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

