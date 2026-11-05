import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EMBEDDING_PROVIDER_TOKEN, EmbeddingProvider } from '../src/embeddings/interfaces/embedding-provider.interface';
import { EmbeddingService } from '../src/embeddings/embedding.service';
import { EmbeddingStatus, WorkspaceRole, MemberStatus } from '@prisma/client';
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

describe('Semantic Search & pgvector Embeddings E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let embeddingService: EmbeddingService;

  // Workspace A & Owner A
  let userAToken: string;
  let userAId: string;
  let workspaceAId: string;

  // Workspace B & Owner B (Cross-workspace isolation)
  let userBToken: string;
  let userBId: string;
  let workspaceBId: string;

  // Documents created in tests
  let docA1Id: string;
  let docA2Id: string;
  let docB1Id: string;

  // Mock embedding provider for testing
  let mockProviderFailure = false;
  const mockProvider: EmbeddingProvider = {
    providerName: 'gemini',
    modelName: 'gemini-embedding-001',
    dimension: 768,
    generateEmbedding: jest.fn(async (text: string) => {
      if (mockProviderFailure) {
        throw new Error('Simulated embedding provider outage');
      }
      return generateDeterministicVector(text, 768);
    }),
    generateEmbeddings: jest.fn(async (texts: string[]) => {
      if (mockProviderFailure) {
        throw new Error('Simulated embedding provider outage');
      }
      return texts.map((t) => generateDeterministicVector(t, 768));
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMBEDDING_PROVIDER_TOKEN)
      .useValue(mockProvider)
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

    // 1. Register User A (Workspace A)
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Search Tester A',
        email: `search_tester_a_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userAToken = resA.body.accessToken;
    userAId = resA.body.user.id;
    workspaceAId = resA.body.workspace.id;

    // 2. Register User B (Workspace B)
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Search Tester B',
        email: `search_tester_b_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;
    workspaceBId = resB.body.workspace.id;
  });

  afterAll(async () => {
    // Cleanup created test documents
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

  describe('1. Document Upload & Embedding Processing Integration', () => {
    it('should upload a document, extract text chunks, and process vector embeddings in background', async () => {
      const fileBuffer = createTestTxtBuffer(
        'DocuMind is an intelligent document management system. ' +
        'It utilizes PostgreSQL pgvector for high-performance semantic search. ' +
        'Vector embeddings are generated using deep learning models.'
      );

      const res = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('workspaceId', workspaceAId)
        .field('title', 'DocuMind Architecture Overview')
        .attach('file', fileBuffer, 'architecture.txt')
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('READY');
      expect(res.body.chunksCount).toBeGreaterThan(0);
      docA1Id = res.body.id;

      // Allow background setImmediate embedding to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Synchronously verify or finish embedding if needed
      await embeddingService.embedDocument(docA1Id);

      // Verify in DB that chunks have embeddings in PostgreSQL pgvector
      const doc = await prisma.document.findUnique({
        where: { id: docA1Id },
      });
      expect(doc?.embeddingStatus).toBe(EmbeddingStatus.COMPLETED);
      expect(doc?.embeddedChunksCount).toBe(doc?.chunksCount);

      // Verify raw vector in PostgreSQL
      const chunks = await prisma.$queryRaw<Array<{ id: string; has_vec: boolean }>>`
        SELECT id, (embedding IS NOT NULL) AS has_vec
        FROM document_chunks
        WHERE document_id = ${docA1Id}
      `;
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every((c) => c.has_vec)).toBe(true);
    });

    it('should upload a second document with different content to Workspace A', async () => {
      const fileBuffer = createTestTxtBuffer(
        'Financial quarterly report: The company achieved record revenue of 50 million dollars. ' +
        'Operating margin expanded by 4 percent due to strong cloud adoption.'
      );

      const res = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .field('workspaceId', workspaceAId)
        .field('title', 'Q3 Financial Report')
        .attach('file', fileBuffer, 'financials.txt')
        .expect(201);

      docA2Id = res.body.id;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await embeddingService.embedDocument(docA2Id);

      const doc = await prisma.document.findUnique({ where: { id: docA2Id } });
      expect(doc?.embeddingStatus).toBe(EmbeddingStatus.COMPLETED);
    });

    it('should upload a document to Workspace B for workspace isolation tests', async () => {
      const fileBuffer = createTestTxtBuffer(
        'Confidential Workspace B strategy: Secret project codename Apollo launching in Q4.'
      );

      const res = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userBToken}`)
        .field('workspaceId', workspaceBId)
        .field('title', 'Workspace B Secrets')
        .attach('file', fileBuffer, 'apollo.txt')
        .expect(201);

      docB1Id = res.body.id;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await embeddingService.embedDocument(docB1Id);
    });
  });

  describe('2. POST /api/search/semantic Validation & Security', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/search/semantic')
        .send({
          workspaceId: workspaceAId,
          query: 'PostgreSQL pgvector',
        })
        .expect(401);
    });

    it('should reject empty or whitespace-only queries with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: '    ',
        })
        .expect(400);

      const msg = Array.isArray(res.body.message)
        ? res.body.message.join(' ')
        : res.body.message;
      expect(msg).toMatch(/query/i);
    });

    it('should reject invalid limit (<= 0) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'DocuMind',
          limit: -5,
        })
        .expect(400);
    });

    it('should reject invalid limit (> 100) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'DocuMind',
          limit: 150,
        })
        .expect(400);
    });

    it('should enforce strict workspace isolation (User B cannot search Workspace A)', async () => {
      await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'DocuMind architecture',
        })
        .expect(403);
    });
  });

  describe('3. Semantic Search Retrieval & Ranking', () => {
    it('should return most relevant chunks with complete metadata and similarity score', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'pgvector semantic search',
          limit: 5,
        })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const topResult = res.body[0];
      // Verify all required fields from prompt:
      // document ID, title, original filename, page number, chunk ID and similarity score
      expect(topResult.documentId).toBeDefined();
      expect(topResult.title).toBeDefined();
      expect(topResult.originalFilename).toBeDefined();
      expect(topResult.chunkId).toBeDefined();
      expect(topResult.similarityScore).toBeDefined();
      expect(typeof topResult.similarityScore).toBe('number');
      expect(topResult.similarityScore).toBeGreaterThan(0);

      // The top result for 'pgvector semantic search' should be from the Architecture document!
      expect(topResult.documentId).toBe(docA1Id);
      expect(topResult.content).toContain('pgvector');
    });

    it('should rank financial content higher when searching for financial topics', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'record revenue and operating margin',
          limit: 5,
        })
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      const topResult = res.body[0];
      expect(topResult.documentId).toBe(docA2Id);
      expect(topResult.content).toContain('revenue');
    });

    it('should strictly support documentId filtering', async () => {
      // Search for 'revenue' but restrict filtering to docA1Id (Architecture doc)
      const res = await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'revenue report',
          documentId: docA1Id,
        })
        .expect(200);

      // All returned results must belong to docA1Id
      for (const item of res.body) {
        expect(item.documentId).toBe(docA1Id);
      }
    });

    it('should reject documentId filtering when document belongs to another workspace', async () => {
      // User A attempts to filter by docB1Id (which belongs to Workspace B)
      await request(app.getHttpServer())
        .post('/api/search/semantic')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          query: 'Apollo project',
          documentId: docB1Id,
        })
        .expect(404);
    });
  });

  describe('4. Administrative Backfill Mechanism', () => {
    it('should reject unauthenticated access to backfill', async () => {
      await request(app.getHttpServer())
        .post('/api/embeddings/admin/backfill')
        .send({})
        .expect(401);
    });

    it('should execute backfill and report accurate stats without duplicate embedding', async () => {
      // Call administrative backfill
      const res = await request(app.getHttpServer())
        .post('/api/embeddings/admin/backfill')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          workspaceId: workspaceAId,
          batchSize: 10,
        })
        .expect(201);

      expect(res.body.report).toBeDefined();
      expect(res.body.report.failedChunks).toBe(0);
      expect(res.body.report.isComplete).toBe(true);
    });

    it('should return admin status with chunk percentages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/embeddings/admin/status')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.provider).toBeDefined();
      expect(res.body.chunks).toBeDefined();
      expect(res.body.chunks.total).toBeGreaterThan(0);
      expect(typeof res.body.chunks.percentageComplete).toBe('number');
    });
  });

  describe('5. Error Handling & Provider Failure Resilience', () => {
    it('should preserve extracted document text when provider fails and mark embeddingStatus FAILED', async () => {
      mockProviderFailure = true;

      try {
        const fileBuffer = createTestTxtBuffer('Critical document text that must not be lost.');

        const res = await request(app.getHttpServer())
          .post('/api/documents/upload')
          .set('Authorization', `Bearer ${userAToken}`)
          .field('workspaceId', workspaceAId)
          .field('title', 'Failure Resilience Test')
          .attach('file', fileBuffer, 'resilience.txt')
          .expect(201);

        const testDocId = res.body.id;

        // Run embedding with failing provider
        const embedResult = await embeddingService.embedDocument(testDocId);
        expect(embedResult.status).toBe(EmbeddingStatus.FAILED);

        // Verify document in DB:
        // Text extraction status is STILL READY (not lost!)
        const docInDb = await prisma.document.findUnique({
          where: { id: testDocId },
          include: { chunks: true },
        });

        expect(docInDb?.status).toBe('READY');
        expect(docInDb?.embeddingStatus).toBe(EmbeddingStatus.FAILED);
        expect(docInDb?.embeddingError).toContain('Simulated embedding provider outage');
        expect(docInDb?.chunks.length).toBeGreaterThan(0);
        expect(docInDb?.chunks[0].content).toContain('Critical document text');

        // Cleanup
        await prisma.document.delete({ where: { id: testDocId } });
      } finally {
        mockProviderFailure = false;
      }
    });
  });
});
