import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { SearchService, SemanticSearchResultItem } from '../search/search.service';
import {
  LLMProvider,
  LLM_PROVIDER_TOKEN,
  ChatMessage,
} from '../llm/interfaces/llm-provider.interface';
import { SafeUser } from '../auth/interfaces/auth-response.interface';

import { DocumentCitation, RagAnswerResult, RagStreamEvent } from './rag.interface';

describe('RagService', () => {
  let service: RagService;
  let searchService: SearchService;
  let mockLlmProvider: jest.Mocked<LLMProvider>;

  const mockUser: SafeUser = {
    id: 'user-1',
    email: 'tester@example.com',
    name: 'Test User',
    avatarColor: '#7185E8',
    avatarInitials: 'TU',
    bio: null,
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChunks: SemanticSearchResultItem[] = [
    {
      chunkId: 'chunk-1',
      id: 'chunk-1',
      documentId: 'doc-1',
      title: 'Company Policy 2026',
      originalFilename: 'policy.pdf',
      originalName: 'policy.pdf',
      pageNumber: 3,
      chunkIndex: 2,
      content:
        'Employees are entitled to 25 days of paid annual leave. Leave requests must be submitted 14 days in advance.',
      similarityScore: 0.91234,
      score: 0.91234,
    },
    {
      chunkId: 'chunk-2',
      id: 'chunk-2',
      documentId: 'doc-2',
      title: 'Remote Work Guidelines',
      originalFilename: 'remote.docx',
      originalName: 'remote.docx',
      pageNumber: 1,
      chunkIndex: 0,
      content:
        'Full-time remote workers receive a home office stipend of $500 upon commencement of employment.',
      similarityScore: 0.84567,
      score: 0.84567,
    },
  ];

  const mockSearchService = {
    searchSemantic: jest.fn(),
  };

  beforeEach(async () => {
    mockLlmProvider = {
      providerName: 'openai',
      modelName: 'gpt-4o-mini',
      generateChatCompletion: jest.fn(),
      streamChatCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: LLM_PROVIDER_TOKEN,
          useValue: mockLlmProvider,
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    searchService = module.get<SearchService>(SearchService);

    jest.clearAllMocks();
  });

  describe('Document-based Question Answering & Retrieval', () => {
    it('should retrieve context via SearchService and generate grounded answer with citations', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);
      mockLlmProvider.generateChatCompletion.mockResolvedValueOnce(
        'According to Company Policy 2026, employees receive 25 days of annual leave.',
      );

      const result = await service.answerQuestion(
        mockUser,
        'ws-1',
        'How many days of annual leave do employees get?',
        ['doc-1'],
      );

      expect(mockSearchService.searchSemantic).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          workspaceId: 'ws-1',
          query: 'How many days of annual leave do employees get?',
          documentIds: ['doc-1'],
        }),
      );

      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalledTimes(1);
      expect(result.answer).toContain('25 days of annual leave');
      expect(result.citations).toHaveLength(2);

      // Verify citation mapping to actual chunks (No hallucinated citations)
      expect(result.citations[0]).toMatchObject({
        documentId: 'doc-1',
        documentTitle: 'Company Policy 2026',
        originalFilename: 'policy.pdf',
        chunkId: 'chunk-1',
        pageNumber: 3,
        page: 3,
        similarityScore: 0.91234,
      });
      expect(result.citations[0].quote).toContain('25 days of paid annual leave');
    });

    it('should support multi-document retrieval across multiple document IDs', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);
      mockLlmProvider.generateChatCompletion.mockResolvedValueOnce(
        'Annual leave is 25 days and the remote work stipend is $500.',
      );

      const result = await service.answerQuestion(
        mockUser,
        'ws-1',
        'Summarise benefits from both documents',
        ['doc-1', 'doc-2'],
      );

      expect(mockSearchService.searchSemantic).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          workspaceId: 'ws-1',
          documentIds: ['doc-1', 'doc-2'],
        }),
      );

      expect(result.citations).toHaveLength(2);
      expect(result.citations.map((c) => c.documentId)).toEqual(['doc-1', 'doc-2']);
    });

    it('should handle no relevant context by returning clear statement and empty citations', async () => {
      // 0 chunks returned
      mockSearchService.searchSemantic.mockResolvedValueOnce([]);

      const result = await service.answerQuestion(
        mockUser,
        'ws-1',
        'What is the recipe for chocolate cake?',
        ['doc-1'],
      );

      expect(result.answer).toContain(
        'The available documents do not contain sufficient information to answer this question.',
      );
      expect(result.citations).toEqual([]);
      expect(result.retrievedChunksCount).toBe(0);
      // LLM call skipped because context was empty
      expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
    });

    it('should clear citations if LLM concludes available documents do not contain sufficient info', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);
      mockLlmProvider.generateChatCompletion.mockResolvedValueOnce(
        'The available documents do not contain sufficient information regarding health insurance coverage.',
      );

      const result = await service.answerQuestion(
        mockUser,
        'ws-1',
        'What is the dental health coverage limit?',
        ['doc-1'],
      );

      expect(result.answer).toContain('not contain sufficient information');
      expect(result.citations).toEqual([]);
    });

    it('should preserve conversation history in the prompt for follow-up questions', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);
      mockLlmProvider.generateChatCompletion.mockResolvedValueOnce('Yes, 14 days.');

      const history: ChatMessage[] = [
        { role: 'user', content: 'What is the leave notice policy?' },
        { role: 'assistant', content: 'Requests require advance submission.' },
      ];

      await service.answerQuestion(
        mockUser,
        'ws-1',
        'How many days specifically?',
        ['doc-1'],
        history,
      );

      const calledMessages: ChatMessage[] =
        mockLlmProvider.generateChatCompletion.mock.calls[0][0];

      // System prompt with context + 2 history messages + current question = 4 messages
      expect(calledMessages.length).toBe(4);
      expect(calledMessages[1]).toEqual(history[0]);
      expect(calledMessages[2]).toEqual(history[1]);
      expect(calledMessages[3].content).toBe('How many days specifically?');
    });
  });

  describe('Streaming Answer', () => {
    it('should yield incremental tokens and final structured citations', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);

      async function* mockStream() {
        yield 'Leave ';
        yield 'is ';
        yield '25 ';
        yield 'days.';
      }

      mockLlmProvider.streamChatCompletion.mockReturnValueOnce(mockStream());

      const events: RagStreamEvent[] = [];
      for await (const event of service.streamAnswer(
        mockUser,
        'ws-1',
        'What is leave allowance?',
        ['doc-1'],
      )) {
        events.push(event);
      }

      const tokenEvents = events.filter((e) => e.type === 'token');
      expect(tokenEvents.map((e: any) => e.token).join('')).toBe('Leave is 25 days.');

      const citationEvents = events.filter((e) => e.type === 'citations');
      expect(citationEvents).toHaveLength(1);
      expect((citationEvents[0] as any).citations).toHaveLength(2);

      const doneEvents = events.filter((e) => e.type === 'done');
      expect(doneEvents).toHaveLength(1);
      expect((doneEvents[0] as any).answer).toBe('Leave is 25 days.');
    });

    it('should yield insufficient info statement immediately when 0 chunks found in stream mode', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce([]);

      const events: RagStreamEvent[] = [];
      for await (const event of service.streamAnswer(
        mockUser,
        'ws-1',
        'Unrelated question',
      )) {
        events.push(event);
      }

      expect(events[0]).toMatchObject({
        type: 'token',
        token: expect.stringContaining('not contain sufficient information'),
      });
      expect(events[1]).toMatchObject({
        type: 'citations',
        citations: [],
      });
    });
  });

  describe('Gemini Provider Integration with RagService', () => {
    let geminiRagService: RagService;
    let mockGeminiProvider: jest.Mocked<LLMProvider>;

    beforeEach(async () => {
      mockGeminiProvider = {
        providerName: 'gemini',
        modelName: 'gemini-3.5-flash-lite',
        generateChatCompletion: jest.fn(),
        streamChatCompletion: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RagService,
          {
            provide: SearchService,
            useValue: mockSearchService,
          },
          {
            provide: LLM_PROVIDER_TOKEN,
            useValue: mockGeminiProvider,
          },
        ],
      }).compile();

      geminiRagService = module.get<RagService>(RagService);
    });

    it('should generate grounded answers and attach citations using Gemini chat completion', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);
      mockGeminiProvider.generateChatCompletion.mockResolvedValueOnce(
        'According to the policy, employees receive 25 days of paid annual leave.',
      );

      const result = await geminiRagService.answerQuestion(
        mockUser,
        'ws-1',
        'How many days of leave do employees receive?',
      );

      expect(result.answer).toContain('25 days of paid annual leave');
      expect(result.citations).toHaveLength(2);
      expect(result.citations[0].documentTitle).toBe('Company Policy 2026');
      expect(mockGeminiProvider.generateChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('should stream tokens from Gemini and output citations at the end', async () => {
      mockSearchService.searchSemantic.mockResolvedValueOnce(mockChunks);
      mockGeminiProvider.streamChatCompletion.mockImplementationOnce(
        async function* () {
          yield 'Employees ';
          yield 'receive ';
          yield '25 days.';
        },
      );

      const events: RagStreamEvent[] = [];
      for await (const event of geminiRagService.streamAnswer(
        mockUser,
        'ws-1',
        'What is the leave entitlement?',
      )) {
        events.push(event);
      }

      const tokenText = events
        .filter((e) => e.type === 'token')
        .map((e: any) => e.token)
        .join('');
      expect(tokenText).toBe('Employees receive 25 days.');

      const citationsEvent = events.find((e) => e.type === 'citations');
      expect(citationsEvent).toBeDefined();
      expect((citationsEvent as any).citations).toHaveLength(2);
    });
  });
});
