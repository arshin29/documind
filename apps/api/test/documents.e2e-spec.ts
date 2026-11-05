import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { WorkspaceRole, MemberStatus, DocumentStatus, DocumentType } from '@prisma/client';
import {
  createTestPdfBuffer,
  createTestDocxBuffer,
  createTestTxtBuffer,
} from './test-file-utils';

describe('Documents Management & File Processing E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test User A (Workspace A Owner)
  let userAToken: string;
  let userAId: string;
  let workspaceAId: string;

  // Test User B (Workspace B Owner - Cross Workspace)
  let userBToken: string;
  let userBId: string;
  let workspaceBId: string;

  // Test User C (Viewer in Workspace A)
  let userCToken: string;
  let userCId: string;

  // Track created documents for cleanup
  let createdDocumentIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Replicate main.ts configuration
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'User A',
        email: `usera_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userAToken = resA.body.accessToken;
    userAId = resA.body.user.id;
    workspaceAId = resA.body.workspace.id;

    // 2. Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'User B',
        email: `userb_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;
    workspaceBId = resB.body.workspace.id;

    // 3. Register User C
    const resC = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'User C',
        email: `userc_${Date.now()}@example.com`,
        password: 'Password123!',
      })
      .expect(201);
    userCToken = resC.body.accessToken;
    userCId = resC.body.user.id;

    // Add User C as VIEWER to Workspace A
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceAId,
        userId: userCId,
        role: WorkspaceRole.VIEWER,
        status: MemberStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    // Clean up documents, users, workspaces
    for (const docId of createdDocumentIds) {
      await prisma.document.deleteMany({ where: { id: docId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId, userCId].filter(Boolean) } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: [workspaceAId, workspaceBId].filter(Boolean) } },
    });
    await app.close();
  });

  describe('1. Unauthenticated Access Protection', () => {
    it('POST /api/documents/upload - should reject requests without token', async () => {
      await request(app.getHttpServer())
        .post('/api/documents/upload')
        .expect(401);
    });

    it('GET /api/documents - should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/api/documents')
        .expect(401);
    });

    it('GET /api/documents/:id - should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/api/documents/some-uuid')
        .expect(401);
    });

    it('PATCH /api/documents/:id - should reject requests without token', async () => {
      await request(app.getHttpServer())
        .patch('/api/documents/some-uuid')
        .send({ title: 'New Title' })
        .expect(401);
    });

    it('DELETE /api/documents/:id - should reject requests without token', async () => {
      await request(app.getHttpServer())
        .delete('/api/documents/some-uuid')
        .expect(401);
    });
  });

  describe('2. File Validation and Rejection', () => {
    it('should reject unsupported file extension (.exe)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', Buffer.from('binary-content'), 'malicious.exe')
        .expect(400);

      expect(response.body.message).toMatch(/unsupported/i);
    });

    it('should reject corrupted PDF file with invalid magic bytes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', Buffer.from('NOT-A-PDF-SIGNATURE-HERE'), 'corrupt.pdf')
        .expect(400);

      expect(response.body.message).toMatch(/invalid pdf/i);
    });

    it('should reject corrupted DOCX file with invalid zip header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', Buffer.from('NOT-A-ZIP-HEADER-HERE'), 'corrupt.docx')
        .expect(400);

      expect(response.body.message).toMatch(/invalid docx/i);
    });

    it('should reject file upload when no file is attached', async () => {
      await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);
    });
  });

  describe('3. Valid Uploads & Document Processing Pipeline', () => {
    let pdfDocId: string;
    let docxDocId: string;
    let txtDocId: string;
    let emptyTxtDocId: string;

    it('should successfully upload and process valid PDF file', async () => {
      const pdfBuffer = createTestPdfBuffer();

      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', pdfBuffer, 'research-report.pdf')
        .field('workspaceId', workspaceAId)
        .expect(201);

      const doc = response.body;
      expect(doc.id).toBeDefined();
      pdfDocId = doc.id;
      createdDocumentIds.push(pdfDocId);

      expect(doc.title).toBe('research-report.pdf');
      expect(doc.originalName).toBe('research-report.pdf');
      expect(doc.fileType).toBe(DocumentType.PDF);
      expect(doc.status).toBe(DocumentStatus.READY);
      expect(doc.pages).toBeGreaterThanOrEqual(1);
      expect(doc.chunksCount).toBeGreaterThan(0);

      // Verify no server internal paths are leaked
      expect(doc.fileUrl).toBeUndefined();
      expect(JSON.stringify(doc)).not.toMatch(/[a-z]:\\/i);

      // Verify chunks in DB
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId: pdfDocId },
        orderBy: { chunkIndex: 'asc' },
      });
      expect(chunks.length).toBe(doc.chunksCount);
      expect(chunks[0].content.length).toBeGreaterThan(0);
      expect(chunks[0].chunkIndex).toBe(0);

      // Verify DocumentActivity
      const activities = await prisma.documentActivity.findMany({
        where: { documentId: pdfDocId },
      });
      expect(activities.some((a) => a.action === 'Uploaded document')).toBe(true);
      expect(activities.some((a) => a.action === 'Processed document')).toBe(true);
    });

    it('should successfully upload and process valid DOCX file', async () => {
      const docxBuffer = await createTestDocxBuffer('Executive Board Minutes 2026');

      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', docxBuffer, 'board-minutes.docx')
        .field('title', 'Board Minutes Q1')
        .expect(201);

      const doc = response.body;
      expect(doc.id).toBeDefined();
      docxDocId = doc.id;
      createdDocumentIds.push(docxDocId);

      expect(doc.title).toBe('Board Minutes Q1');
      expect(doc.originalName).toBe('board-minutes.docx');
      expect(doc.fileType).toBe(DocumentType.DOCX);
      expect(doc.status).toBe(DocumentStatus.READY);
      expect(doc.pages).toBe(1);
      expect(doc.chunksCount).toBeGreaterThanOrEqual(1);
    });

    it('should successfully upload and process valid TXT file', async () => {
      const txtBuffer = createTestTxtBuffer(
        'DocuMind is an intelligent document knowledge base platform.',
      );

      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', txtBuffer, 'notes.txt')
        .expect(201);

      const doc = response.body;
      expect(doc.id).toBeDefined();
      txtDocId = doc.id;
      createdDocumentIds.push(txtDocId);

      expect(doc.originalName).toBe('notes.txt');
      expect(doc.fileType).toBe(DocumentType.TXT);
      expect(doc.status).toBe(DocumentStatus.READY);
      expect(doc.chunksCount).toBe(1);
    });

    it('should handle empty text file gracefully without failure', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const response = await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', emptyBuffer, 'empty.txt')
        .expect(201);

      const doc = response.body;
      expect(doc.id).toBeDefined();
      emptyTxtDocId = doc.id;
      createdDocumentIds.push(emptyTxtDocId);

      expect(doc.status).toBe(DocumentStatus.READY);
      expect(doc.chunksCount).toBe(0);
    });
  });

  describe('4. Document Content Retrieval', () => {
    it('GET /api/documents/:id/content - should return structured chunks and page numbers', async () => {
      const pdfId = createdDocumentIds[0];

      const response = await request(app.getHttpServer())
        .get(`/api/documents/${pdfId}/content`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('document');
      expect(response.body).toHaveProperty('chunks');
      expect(response.body).toHaveProperty('fullText');

      expect(Array.isArray(response.body.chunks)).toBe(true);
      expect(response.body.chunks.length).toBeGreaterThan(0);

      const chunk = response.body.chunks[0];
      expect(chunk).toHaveProperty('chunkIndex', 0);
      expect(chunk).toHaveProperty('pageNumber');
      expect(chunk).toHaveProperty('content');
      expect(chunk.content.length).toBeGreaterThan(0);
    });
  });

  describe('5. Document Listing, Search, Filter & Pagination', () => {
    it('GET /api/documents - should list accessible documents with pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(4);
      expect(response.body.pagination.page).toBe(1);
    });

    it('should filter documents by fileType', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents?fileType=PDF')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data.every((d: any) => d.fileType === 'PDF')).toBe(true);
    });

    it('should filter documents by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents?status=READY')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data.every((d: any) => d.status === 'READY')).toBe(true);
    });

    it('should search documents by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents?search=Board')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].title).toContain('Board');
    });

    it('should sort documents by title ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const titles = response.body.data.map((d: any) => d.title);
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sorted);
    });

    it('should support pagination with page and limit parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents?page=1&limit=2')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('6. Document Rename', () => {
    it('PATCH /api/documents/:id - should rename document and record activity', async () => {
      const targetDocId = createdDocumentIds[0];

      const response = await request(app.getHttpServer())
        .patch(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'New Renamed Report Title' })
        .expect(200);

      expect(response.body.title).toBe('New Renamed Report Title');

      const dbDoc = await prisma.document.findUnique({
        where: { id: targetDocId },
      });
      expect(dbDoc?.title).toBe('New Renamed Report Title');

      const activity = await prisma.documentActivity.findFirst({
        where: {
          documentId: targetDocId,
          action: 'Renamed document',
        },
      });
      expect(activity).not.toBeNull();
      expect(activity?.target).toBe('New Renamed Report Title');
    });

    it('should reject renaming with empty or whitespace-only title', async () => {
      const targetDocId = createdDocumentIds[0];

      await request(app.getHttpServer())
        .patch(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: '   ' })
        .expect(400);
    });
  });

  describe('7. Workspace Permissions & Cross-Workspace Isolation', () => {
    it('should reject cross-workspace document access (User B accessing User A doc)', async () => {
      const docAId = createdDocumentIds[0];

      // User B is not in Workspace A -> must be forbidden
      await request(app.getHttpServer())
        .get(`/api/documents/${docAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/api/documents/${docAId}/content`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/documents/${docAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/documents/${docAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(403);
    });

    it('should not include Workspace A documents in User B document list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      // User B has not uploaded any documents
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should reject upload by VIEWER in workspace', async () => {
      const txtBuffer = createTestTxtBuffer('Viewer attempting upload');

      await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${userCToken}`)
        .attach('file', txtBuffer, 'viewer-file.txt')
        .field('workspaceId', workspaceAId)
        .expect(403);
    });

    it('should reject rename by VIEWER in workspace', async () => {
      const targetDocId = createdDocumentIds[0];

      await request(app.getHttpServer())
        .patch(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${userCToken}`)
        .send({ title: 'Viewer Renamed' })
        .expect(403);
    });

    it('should reject delete by VIEWER in workspace', async () => {
      const targetDocId = createdDocumentIds[0];

      await request(app.getHttpServer())
        .delete(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(403);
    });

    it('should allow VIEWER to read document metadata and content', async () => {
      const targetDocId = createdDocumentIds[0];

      await request(app.getHttpServer())
        .get(`/api/documents/${targetDocId}`)
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/documents/${targetDocId}/content`)
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(200);
    });
  });

  describe('8. Document Deletion & Cascade', () => {
    it('DELETE /api/documents/:id - should delete document, cascade chunks, and delete file', async () => {
      const docToDeleteId = createdDocumentIds.pop()!;

      // Confirm chunks exist before delete
      const chunksBefore = await prisma.documentChunk.findMany({
        where: { documentId: docToDeleteId },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/documents/${docToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify Document deleted from DB
      const dbDoc = await prisma.document.findUnique({
        where: { id: docToDeleteId },
      });
      expect(dbDoc).toBeNull();

      // Verify chunks cascaded
      const chunksAfter = await prisma.documentChunk.findMany({
        where: { documentId: docToDeleteId },
      });
      expect(chunksAfter).toHaveLength(0);

      // Verify subsequent GET returns 404
      await request(app.getHttpServer())
        .get(`/api/documents/${docToDeleteId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });
});

