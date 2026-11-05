import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { DocumentsService } from '../documents/documents.service';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { WorkspaceRole } from '@prisma/client';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;
  let embeddingService: EmbeddingService;
  let documentsService: DocumentsService;

  const mockUser: SafeUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    avatarColor: '#7185E8',
    avatarInitials: 'TU',
    bio: null,
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultDimension = 1536;
  const mockVector = new Array(defaultDimension).fill(0.05);

  const mockPrisma = {
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockEmbeddingService = {
    generateQueryEmbedding: jest.fn(),
  };

  const mockDocumentsService = {
    verifyWorkspaceAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EmbeddingService,
          useValue: mockEmbeddingService,
        },
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    documentsService = module.get<DocumentsService>(DocumentsService);

    jest.clearAllMocks();
  });

  describe('Validation & Access Control', () => {
    it('should reject empty or whitespace-only query', async () => {
      await expect(
        service.searchSemantic(mockUser, {
          workspaceId: 'ws-123',
          query: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject query exceeding 4000 characters', async () => {
      const longQuery = 'a'.repeat(4001);
      await expect(
        service.searchSemantic(mockUser, {
          workspaceId: 'ws-123',
          query: longQuery,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid limits (<= 0 or > 100)', async () => {
      await expect(
        service.searchSemantic(mockUser, {
          workspaceId: 'ws-123',
          query: 'test',
          limit: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.searchSemantic(mockUser, {
          workspaceId: 'ws-123',
          query: 'test',
          limit: 101,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce workspace isolation and reject non-members', async () => {
      mockDocumentsService.verifyWorkspaceAccess.mockRejectedValueOnce(
        new ForbiddenException('You do not have access to this workspace'),
      );

      await expect(
        service.searchSemantic(mockUser, {
          workspaceId: 'foreign-ws',
          query: 'secret document',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockDocumentsService.verifyWorkspaceAccess).toHaveBeenCalledWith(
        mockUser.id,
        'foreign-ws',
      );
      expect(mockEmbeddingService.generateQueryEmbedding).not.toHaveBeenCalled();
    });

    it('should reject when documentId is not found in specified workspace', async () => {
      mockDocumentsService.verifyWorkspaceAccess.mockResolvedValueOnce({
        role: WorkspaceRole.VIEWER,
      });

      // Document not found in this workspace
      mockPrisma.document.findMany.mockResolvedValueOnce([]);

      await expect(
        service.searchSemantic(mockUser, {
          workspaceId: 'ws-123',
          query: 'test',
          documentId: 'doc-other',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Semantic Retrieval & Ranking', () => {
    it('should return chunks ranked by similarity score with complete metadata', async () => {
      mockDocumentsService.verifyWorkspaceAccess.mockResolvedValueOnce({
        role: WorkspaceRole.EDITOR,
      });

      mockEmbeddingService.generateQueryEmbedding.mockResolvedValueOnce(mockVector);

      const mockRawResults = [
        {
          chunkId: 'c1',
          documentId: 'd1',
          chunkIndex: 0,
          pageNumber: 1,
          content: 'Most relevant chunk text',
          metadata: { pageNumber: 1 },
          title: 'Quarterly Report',
          originalFilename: 'report.pdf',
          similarityScore: 0.923456,
        },
        {
          chunkId: 'c2',
          documentId: 'd1',
          chunkIndex: 1,
          pageNumber: 1,
          content: 'Second most relevant chunk text',
          metadata: { pageNumber: 1 },
          title: 'Quarterly Report',
          originalFilename: 'report.pdf',
          similarityScore: 0.812345,
        },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(mockRawResults);

      const results = await service.searchSemantic(mockUser, {
        workspaceId: 'ws-123',
        query: 'financial report',
        limit: 5,
      });

      expect(results).toHaveLength(2);

      // Verify ordering
      expect(results[0].similarityScore).toBe(0.923456);
      expect(results[1].similarityScore).toBe(0.812345);
      expect(results[0].similarityScore).toBeGreaterThan(results[1].similarityScore);

      // Verify returned fields
      expect(results[0]).toMatchObject({
        chunkId: 'c1',
        id: 'c1',
        documentId: 'd1',
        title: 'Quarterly Report',
        originalFilename: 'report.pdf',
        originalName: 'report.pdf',
        pageNumber: 1,
        chunkIndex: 0,
        content: 'Most relevant chunk text',
        similarityScore: 0.923456,
        score: 0.923456,
      });

      expect(mockEmbeddingService.generateQueryEmbedding).toHaveBeenCalledWith(
        'financial report',
      );
    });

    it('should apply document-specific filtering when documentId is provided', async () => {
      mockDocumentsService.verifyWorkspaceAccess.mockResolvedValueOnce({
        role: WorkspaceRole.EDITOR,
      });

      mockPrisma.document.findMany.mockResolvedValueOnce([
        { id: 'doc-target' },
      ]);

      mockEmbeddingService.generateQueryEmbedding.mockResolvedValueOnce(mockVector);

      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          chunkId: 'c99',
          documentId: 'doc-target',
          chunkIndex: 3,
          pageNumber: 4,
          content: 'Target document chunk',
          metadata: {},
          title: 'Target Doc',
          originalFilename: 'target.txt',
          similarityScore: 0.89,
        },
      ]);

      const results = await service.searchSemantic(mockUser, {
        workspaceId: 'ws-123',
        query: 'specific query',
        documentId: 'doc-target',
      });

      expect(results).toHaveLength(1);
      expect(results[0].documentId).toBe('doc-target');
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['doc-target'] }, workspaceId: 'ws-123' },
        select: { id: true },
      });
    });

    it('should apply multi-document filtering when documentIds is provided', async () => {
      mockDocumentsService.verifyWorkspaceAccess.mockResolvedValueOnce({
        role: WorkspaceRole.EDITOR,
      });

      mockPrisma.document.findMany.mockResolvedValueOnce([
        { id: 'doc-1' },
        { id: 'doc-2' },
      ]);

      mockEmbeddingService.generateQueryEmbedding.mockResolvedValueOnce(mockVector);

      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          chunkId: 'c1',
          documentId: 'doc-1',
          chunkIndex: 0,
          pageNumber: 1,
          content: 'Doc 1 chunk',
          metadata: {},
          title: 'Doc 1',
          originalFilename: 'doc1.pdf',
          similarityScore: 0.95,
        },
        {
          chunkId: 'c2',
          documentId: 'doc-2',
          chunkIndex: 0,
          pageNumber: 2,
          content: 'Doc 2 chunk',
          metadata: {},
          title: 'Doc 2',
          originalFilename: 'doc2.pdf',
          similarityScore: 0.85,
        },
      ]);

      const results = await service.searchSemantic(mockUser, {
        workspaceId: 'ws-123',
        query: 'multi query',
        documentIds: ['doc-1', 'doc-2'],
      });

      expect(results).toHaveLength(2);
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['doc-1', 'doc-2'] }, workspaceId: 'ws-123' },
        select: { id: true },
      });
    });
  });
});
