import { ConfigService } from '@nestjs/config';
import { GeminiLlmProvider } from './gemini-llm.provider';
import { ChatMessage } from '../interfaces/llm-provider.interface';

describe('GeminiLlmProvider', () => {
  let provider: GeminiLlmProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let globalFetchMock: jest.Mock;

  const mockApiKey = 'AIzaSyMockChatKey12345';

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return mockApiKey;
        if (key === 'GEMINI_CHAT_MODEL') return 'gemini-3.5-flash-lite';
        if (key === 'LLM_MAX_RETRIES') return '2';
        if (key === 'LLM_RETRY_DELAY_MS') return '10';
        if (key === 'LLM_TIMEOUT_MS') return '500';
        return undefined;
      }),
    } as any;

    provider = new GeminiLlmProvider(mockConfigService);

    globalFetchMock = jest.fn();
    (global as any).fetch = globalFetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Configuration & Initialization', () => {
    it('should initialize with correct provider name and model', () => {
      expect(provider.providerName).toBe('gemini');
      expect(provider.modelName).toBe('gemini-3.5-flash-lite');
    });

    it('should default to gemini-3.5-flash-lite when model is not configured', () => {
      const emptyConfig = {
        get: jest.fn((k: string) => (k === 'GEMINI_API_KEY' ? mockApiKey : undefined)),
      } as any;
      const defaultProvider = new GeminiLlmProvider(emptyConfig);
      expect(defaultProvider.modelName).toBe('gemini-3.5-flash-lite');
    });

    it('should throw an error when API key is missing', async () => {
      const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
      const noKeyProvider = new GeminiLlmProvider(emptyConfig);

      await expect(
        noKeyProvider.generateChatCompletion([{ role: 'user', content: 'hello' }]),
      ).rejects.toThrow(/GEMINI_API_KEY is not configured/);
    });

    it('should reject placeholder API keys', async () => {
      const placeholderConfig = {
        get: jest.fn((k: string) =>
          k === 'GEMINI_API_KEY' ? 'your_gemini_api_key_here' : undefined,
        ),
      } as any;
      const placeholderProvider = new GeminiLlmProvider(placeholderConfig);

      await expect(
        placeholderProvider.generateChatCompletion([{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow(/is set to a placeholder/);
    });

    it('should prioritize GEMINI_CHAT_API_KEY over GEMINI_API_KEY', async () => {
      const customConfig = {
        get: jest.fn((k: string) => {
          if (k === 'GEMINI_CHAT_API_KEY') return 'AIzaSyCustomChatKey';
          if (k === 'GEMINI_API_KEY') return 'AIzaSyDefaultKey';
          return undefined;
        }),
      } as any;
      const customProvider = new GeminiLlmProvider(customConfig);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response' }], role: 'model' } }],
        }),
      });

      await customProvider.generateChatCompletion([{ role: 'user', content: 'hi' }]);
      const calledUrl = globalFetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('key=AIzaSyCustomChatKey');
    });
  });

  describe('Non-streaming Chat Completion', () => {
    it('should format systemInstruction and contents correctly and return model text', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'DocuMind is an AI document assistant.' }],
                role: 'model',
              },
            },
          ],
        }),
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are DocuMind.' },
        { role: 'user', content: 'What is DocuMind?' },
      ];

      const result = await provider.generateChatCompletion(messages, {
        temperature: 0.2,
      });

      expect(result).toBe('DocuMind is an AI document assistant.');
      expect(globalFetchMock).toHaveBeenCalledTimes(1);

      const [calledUrl, calledInit] = globalFetchMock.mock.calls[0];
      expect(calledUrl).toContain('/models/gemini-3.5-flash-lite:generateContent');
      const body = JSON.parse(calledInit.body);
      expect(body.systemInstruction.parts[0].text).toBe('You are DocuMind.');
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[0].parts[0].text).toBe('What is DocuMind?');
    });

    it('should merge consecutive messages of the same role for Gemini compatibility', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Combined answer' }],
                role: 'model',
              },
            },
          ],
        }),
      });

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Question 1' },
        { role: 'user', content: 'Question 2' },
      ];

      await provider.generateChatCompletion(messages);
      const [, calledInit] = globalFetchMock.mock.calls[0];
      const body = JSON.parse(calledInit.body);
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].parts[0].text).toBe('Question 1\n\nQuestion 2');
    });
  });

  describe('Streaming Chat Completion', () => {
    it('should stream response tokens incrementally from Gemini SSE stream', async () => {
      const streamChunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"DocuMind"}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" is"}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" ready."}]}}]}\n\n',
        'data: [DONE]\n\n',
      ];

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          for (const chunk of streamChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: readableStream,
      });

      const tokens: string[] = [];
      for await (const token of provider.streamChatCompletion([
        { role: 'user', content: 'hello' },
      ])) {
        tokens.push(token);
      }

      expect(tokens).toEqual(['DocuMind', ' is', ' ready.']);
      expect(tokens.join('')).toBe('DocuMind is ready.');
    });

    it('should cancel streaming when aborted by AbortSignal', async () => {
      const abortController = new AbortController();
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Token 1"}]}}]}\n\n',
            ),
          );
        },
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: readableStream,
      });

      const tokens: string[] = [];
      const stream = provider.streamChatCompletion(
        [{ role: 'user', content: 'hi' }],
        { signal: abortController.signal },
      );

      for await (const token of stream) {
        tokens.push(token);
        abortController.abort();
      }

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe('Token 1');
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
            message: 'Quota exceeded',
          },
        }),
      });

      await expect(
        provider.generateChatCompletion([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow(/Gemini API quota exhausted/);

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
            message: 'API key not valid.',
          },
        }),
      });

      await expect(
        provider.generateChatCompletion([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow(/Invalid API key or authentication failed/);

      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient 500 error and succeed', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Recovered' }], role: 'model' } }],
        }),
      });

      const result = await provider.generateChatCompletion([
        { role: 'user', content: 'test' },
      ]);
      expect(result).toBe('Recovered');
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

