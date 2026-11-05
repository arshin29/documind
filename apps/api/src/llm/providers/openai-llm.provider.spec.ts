import { ConfigService } from '@nestjs/config';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { ChatMessage } from '../interfaces/llm-provider.interface';

describe('OpenAiLlmProvider', () => {
  let provider: OpenAiLlmProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let globalFetchMock: jest.Mock;

  const mockApiKey = 'sk-mock-test-key-chat';

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return mockApiKey;
        if (key === 'OPENAI_CHAT_MODEL') return 'gpt-4o-mini';
        if (key === 'LLM_MAX_RETRIES') return '2';
        if (key === 'LLM_RETRY_DELAY_MS') return '10';
        if (key === 'LLM_TIMEOUT_MS') return '500';
        return undefined;
      }),
    } as any;

    provider = new OpenAiLlmProvider(mockConfigService);

    globalFetchMock = jest.fn();
    (global as any).fetch = globalFetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Non-streaming Chat Completion', () => {
    it('should generate completion using OpenAI Chat API', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'DocuMind uses pgvector for semantic search.',
              },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are an assistant.' },
        { role: 'user', content: 'What does DocuMind use?' },
      ];

      const result = await provider.generateChatCompletion(messages, {
        temperature: 0.2,
      });

      expect(result).toBe('DocuMind uses pgvector for semantic search.');
      expect(globalFetchMock).toHaveBeenCalledTimes(1);

      const [calledUrl, calledInit] = globalFetchMock.mock.calls[0];
      expect(calledUrl).toBe('https://api.openai.com/v1/chat/completions');
      expect(calledInit.headers.Authorization).toBe(`Bearer ${mockApiKey}`);
      const body = JSON.parse(calledInit.body);
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.messages).toEqual(messages);
      expect(body.stream).toBe(false);
    });

    it('should throw an error when API key is not configured', async () => {
      const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
      const noKeyProvider = new OpenAiLlmProvider(emptyConfig);

      await expect(
        noKeyProvider.generateChatCompletion([{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow(/OPENAI_API_KEY is not configured/);
    });

    it('should reject placeholder API keys', async () => {
      const placeholderConfig = {
        get: jest.fn((k: string) => (k === 'OPENAI_API_KEY' ? 'your_openai_api_key_here' : undefined)),
      } as any;
      const placeholderProvider = new OpenAiLlmProvider(placeholderConfig);

      await expect(
        placeholderProvider.generateChatCompletion([{ role: 'user', content: 'hi' }]),
      ).rejects.toThrow(/is set to a placeholder/);
    });

    it('should prioritize OPENAI_CHAT_API_KEY over OPENAI_API_KEY', async () => {
      const customConfig = {
        get: jest.fn((k: string) => {
          if (k === 'OPENAI_CHAT_API_KEY') return 'sk-custom-chat-key';
          if (k === 'OPENAI_API_KEY') return 'sk-default-key';
          return undefined;
        }),
      } as any;
      const customProvider = new OpenAiLlmProvider(customConfig);

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Custom response' } }],
        }),
      });

      await customProvider.generateChatCompletion([{ role: 'user', content: 'hi' }]);
      const calledInit = globalFetchMock.mock.calls[0][1];
      expect(calledInit.headers.Authorization).toBe('Bearer sk-custom-chat-key');
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

      await expect(
        provider.generateChatCompletion([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow(/OpenAI API credit quota exhausted/);

      // Must not retry on quota exhaustion
      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on HTTP 429 rate limit with backoff and succeed', async () => {
      // 1st call 429
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0.01' }),
        json: async () => ({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      // 2nd call success
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Recovered answer' } }],
        }),
      });

      const result = await provider.generateChatCompletion([
        { role: 'user', content: 'test' },
      ]);

      expect(result).toBe('Recovered answer');
      expect(globalFetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail immediately without retrying on 401 Unauthorized', async () => {
      globalFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({
          error: { message: 'Invalid API key provided' },
        }),
      });

      await expect(
        provider.generateChatCompletion([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow(/OpenAI Chat API error \(status 401\)/);

      expect(globalFetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Streaming Chat Completion', () => {
    it('should stream response tokens incrementally', async () => {
      const streamChunks = [
        'data: {"choices":[{"delta":{"content":"DocuMind"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" is"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" fast."}}]}\n\n',
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
        { role: 'user', content: 'tell me' },
      ])) {
        tokens.push(token);
      }

      expect(tokens).toEqual(['DocuMind', ' is', ' fast.']);
      expect(tokens.join('')).toBe('DocuMind is fast.');
    });

    it('should stop streaming when aborted by AbortSignal', async () => {
      const abortController = new AbortController();
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Token 1"}}]}\n\n'),
          );
        },
      });

      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: readableStream,
      });

      const tokens: string[] = [];
      const streamGen = provider.streamChatCompletion(
        [{ role: 'user', content: 'hi' }],
        { signal: abortController.signal },
      );

      for await (const token of streamGen) {
        tokens.push(token);
        abortController.abort(); // Client aborts after first token
      }

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe('Token 1');
    });
  });
});

