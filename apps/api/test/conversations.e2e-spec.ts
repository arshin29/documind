import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EMBEDDING_PROVIDER_TOKEN, EmbeddingProvider } from '../src/embeddings/interfaces/embedding-provider.interface';
import { LLM_PROVIDER_TOKEN, LLMProvider, ChatMessage } from '../src/llm/interfaces/llm-provider.interface';
import { EmbeddingService } from '../src/embeddings/embedding.service';
import { createTestTxtBuffer } from './test-file-utils';

function generateDeterministicVector(text: string, dim: number = 1536): number[] {
  const vec = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [text];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) & 0x7fffffff;
    }
    const idx = hash % dim;
    vec[idx] += 1.0;
  }
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1.0;
  return vec.map((v) => Number((v / magnitude).toFixed(6)));
}

describe('Conversations & RAG Assistant E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let embeddingService: EmbeddingService;

  let userAToken: string;
  let userAId: string;
  let workspaceAId: string;

  let userBToken: string;
  let userBId: string;
  let workspaceBId: string;

  let docA1Id: string;
  let docA2Id: string;
  let docB1Id: string;

  const mockEmbeddingProvider: EmbeddingProvider = {
    providerName: 'gemini',
    modelName: 'gemini-embedding-001',
    dimension: 768,
    generateEmbedding: jest.fn(async (text: string) => generateDeterministicVector(text, 768)),
    generateEmbeddings: jest.fn(async (texts: string[]) => texts.map((t) => generateDeterministicVector(t, 768))),
  };

  const mockLlmProvider: LLMProvider = {
    providerName: 'openai',
    modelName: 'gpt-4o-mini',
    generateChatCompletion: jest.fn(async (messages: ChatMessage[]) => {
      const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
      if (lastUserMsg.toLowerCase().includes('annual leave')) {
        return 'Employees receive 25 days of paid annual leave as documented in the company policy.';
      }
      if (lastUserMsg.toLowerCase().includes('remote stipend')) {
        return 'Full-time remote workers are provided a $500 home office stipend.';
      }
      return 'Based on the documents, here is the answer to your query.';
    }),
    streamChatCompletion: jest.fn(async function* (messages: ChatMessage[]) {
      yield 'DocuMind ';
      yield 'AI ';
      yield 'Assistant ';
      yield 'answer.';
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMBEDDING_PROVIDER_TOKEN)
      .useValue(mockEmbeddingProvider)
      .overrideProvider(LLM_PROVIDER_TOKEN)
      .useValue(mockLlmProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    embeddingService = app.get<EmbeddingService>(EmbeddingService);

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Conversations Tester A',
        email: `conv_tester_a_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userAToken = resA.body.accessToken;
    userAId = resA.body.user.id;
    workspaceAId = resA.body.workspace.id;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Conversations Tester B',
        email: `conv_tester_b_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;
    workspaceBId = resB.body.workspace.id;

    // Upload Document A1: Company Policy
    const fileA1 = createTestTxtBuffer(
      'DocuMind Company Policy 2026: Full-time employees are entitled to 25 days of paid annual leave. ' +
      'Leave requests must be submitted at least 14 days in advance.'
    );
    const resDocA1 = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('workspaceId', workspaceAId)
      .field('title', 'Company Policy 2026')
      .attach('file', fileA1, 'policy.txt')
      .expect(201);
    docA1Id = resDocA1.body.id;
    await embeddingService.embedDocument(docA1Id);

    // Upload Document A2: Benefits Guide
    const fileA2 = createTestTxtBuffer(
      'DocuMind Remote Benefits: Eligible remote employees receive a remote stipend of $500 for home office setup.'
    );
    const resDocA2 = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('workspaceId', workspaceAId)
      .field('title', 'Remote Benefits Guide')
      .attach('file', fileA2, 'benefits.txt')
      .expect(201);
    docA2Id = resDocA2.body.id;
    await embeddingService.embedDocument(docA2Id);

    // Upload Document B1: Workspace B
    const fileB1 = createTestTxtBuffer('Workspace B confidential internal strategy.');
    const resDocB1 = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${userBToken}`)
      .field('workspaceId', workspaceBId)
      .field('title', 'Workspace B Strategy')
      .attach('file', fileB1, 'strategy.txt')
      .expect(201);
    docB1Id = resDocB1.body.id;
    await embeddingService.embedDocument(docB1Id);
  });

  afterAll(async () => {
    const docIds = [docA1Id, docA2Id, docB1Id].filter(Boolean);
    if (docIds.length > 0) {
      await prisma.document.deleteMany({ where: { id: { in: docIds } } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId].filter(Boolean) } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceAId, workspaceBId].filter(Boolean) } },
    });
    await app.close();
  });

  describe('1. Conversation Lifecycle & Multi-Document Support', () => {
    let createdConvId: string;

    it('should create a conversation linked to a single document', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          documentId: docA1Id,
          title: 'Policy Discussion',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Policy Discussion');
      expect(res.body.documentId).toBe(docA1Id);
      expect(res.body.totalQuestions).toBe(0);
      createdConvId = res.body.id;
    });

    it('should create a multi-document conversation linked to multiple documents', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          documentIds: [docA1Id, docA2Id],
          title: 'Cross-Document Synthesis',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.documentIds).toEqual(expect.arrayContaining([docA1Id, docA2Id]));
    });

    it('should create a workspace-wide conversation when no document filter is supplied', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Conversation');
    });

    it('should list conversations in workspace', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/conversations?workspaceId=${workspaceAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should get conversation details by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/conversations/${createdConvId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdConvId);
      expect(res.body.messages).toEqual([]);
    });

    it('should delete a conversation and cascade', async () => {
      const tempRes = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          title: 'Temporary Thread',
        })
        .expect(201);

      const tempId = tempRes.body.id;

      await request(app.getHttpServer())
        .delete(`/api/conversations/${tempId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/conversations/${tempId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });

  describe('2. Question Answering (Non-streaming RAG & Citations)', () => {
    let convId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          documentId: docA1Id,
        })
        .expect(201);
      convId = res.body.id;
    });

    it('should send a question, generate grounded answer, attach citations and update totalQuestions', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          content: 'How many days of annual leave do employees get?',
          stream: false,
        })
        .expect(200);

      expect(res.body.userMessage).toBeDefined();
      expect(res.body.userMessage.content).toBe('How many days of annual leave do employees get?');
      expect(res.body.userMessage.sender).toBe('USER');

      expect(res.body.assistantMessage).toBeDefined();
      expect(res.body.assistantMessage.sender).toBe('ASSISTANT');
      expect(res.body.assistantMessage.content).toContain('25 days of paid annual leave');

      // Citations validation
      expect(Array.isArray(res.body.assistantMessage.citations)).toBe(true);
      expect(res.body.assistantMessage.citations.length).toBeGreaterThan(0);
      const citation = res.body.assistantMessage.citations[0];
      expect(citation.documentId).toBe(docA1Id);
      expect(citation.documentTitle).toBe('Company Policy 2026');
      expect(citation.chunkId).toBeDefined();
      expect(citation.quote).toContain('25 days');

      // Verify conversation record updated in DB
      const updatedConv = await prisma.conversation.findUnique({
        where: { id: convId },
      });
      expect(updatedConv?.totalQuestions).toBe(1);
    });

    it('should maintain conversation history for follow-up questions', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          content: 'What about the remote stipend?',
          stream: false,
        })
        .expect(200);

      expect(res.body.assistantMessage).toBeDefined();

      const conv = await prisma.conversation.findUnique({
        where: { id: convId },
        include: { messages: true },
      });
      expect(conv?.totalQuestions).toBe(2);
      expect(conv?.messages).toHaveLength(4); // 2 User + 2 Assistant
    });
  });

  describe('3. Streaming Question Answering (SSE)', () => {
    let convId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          documentId: docA1Id,
        })
        .expect(201);
      convId = res.body.id;
    });

    it('should stream AI response tokens with SSE and persist completed answer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          content: 'Explain the policy',
          stream: true,
        })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const bodyText = res.text;
      expect(bodyText).toContain('data: {"type":"token"');
      expect(bodyText).toContain('DocuMind');
      expect(bodyText).toContain('data: {"type":"done"');

      // Verify message is persisted in PostgreSQL
      const conv = await prisma.conversation.findUnique({
        where: { id: convId },
        include: { messages: true },
      });
      expect(conv?.totalQuestions).toBe(1);
      expect(conv?.messages).toHaveLength(2); // User + Assistant
      const asstMsg = conv?.messages.find((m) => m.sender === 'ASSISTANT');
      expect(asstMsg?.content).toBe('DocuMind AI Assistant answer.');
    });
  });

  describe('4. Workspace Isolation & Security', () => {
    let convAId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          title: 'Private Thread A',
        })
        .expect(201);
      convAId = res.body.id;
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/conversations?workspaceId=${workspaceAId}`)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/conversations/${convAId}/messages`)
        .send({ content: 'test' })
        .expect(401);
    });

    it('should prevent User B from accessing Workspace A conversations (Workspace Isolation)', async () => {
      // User B tries to view Workspace A's conversation
      await request(app.getHttpServer())
        .get(`/api/conversations/${convAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);

      // User B tries to send message to Workspace A's conversation
      await request(app.getHttpServer())
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ content: 'cross-workspace intrusion' })
        .expect(403);

      // User B tries to delete Workspace A's conversation
      await request(app.getHttpServer())
        .delete(`/api/conversations/${convAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);
    });

    it('should reject empty question with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ content: '   ' })
        .expect(400);
    });
  });
});

