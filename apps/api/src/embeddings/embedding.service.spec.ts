import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmbeddingProvider,
  EMBEDDING_PROVIDER_TOKEN,
} from './interfaces/embedding-provider.interface';
import { EmbeddingStatus } from '@prisma/client';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let prisma: PrismaService;
  let mockProvider: jest.Mocked<EmbeddingProvider>;

  const defaultDimension = 1536;
  const mockVector = new Array(defaultDimension).fill(0.05);

  const mockPrisma = {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    documentChunk: {
      count: jest.fn(),
    },
    documentActivity: {
      create: jest.fn().mockResolvedValue({}),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  beforeEach(async () => {
    mockProvider = {
      providerName: 'openai',
      modelName: 'text-embedding-3-small',
      dimension: defaultDimension,
      generateEmbeddings: jest.fn(),
      generateEmbedding: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'EMBEDDING_BATCH_SIZE') return '2';
              return undefined;
            }),
          },
        },
        {
          provide: EMBEDDING_PROVIDER_TOKEN,
          useValue: mockProvider,
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('generateQueryEmbedding', () => {
    it('should generate a validated vector embedding for a search query', async () => {
      mockProvider.generateEmbedding.mockResolvedValueOnce(mockVector);

      const result = await service.generateQueryEmbedding('machine learning');

      expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('machine learning');
      expect(result).toHaveLength(defaultDimension);
      expect(result).toEqual(mockVector);
    });

    it('should reject empty search query with BadRequestException', async () => {
      await expect(service.generateQueryEmbedding('   ')).rejects.toThrow(
        /Search query cannot be empty/,
      );
      expect(mockProvider.generateEmbedding).not.toHaveBeenCalled();
    });

    it('should reject when returned embedding has mismatched dimension', async () => {
      mockProvider.generateEmbedding.mockResolvedValueOnce(new Array(512).fill(0.1));

      await expect(service.generateQueryEmbedding('test query')).rejects.toThrow(
        /expected dimension 1536, got 512/,
      );
    });
  });

  describe('embedDocument', () => {
    const mockDoc = {
      id: 'doc-123',
      workspaceId: 'ws-123',
      userId: 'user-123',
      title: 'Sample Doc',
      status: 'READY',
      embeddingStatus: 'PENDING',
      embeddedChunksCount: 0,
      chunksCount: 2,
    };

    it('should successfully embed all pending chunks and mark document COMPLETED', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.document.update.mockResolvedValue(mockDoc);
      mockPrisma.documentChunk.count.mockResolvedValue(2);

      // Pending chunks query returns 2 chunks needing embeddings
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { id: 'c1', document_id: 'doc-123', chunk_index: 0, page_number: 1, content: 'Chunk one content' },
          { id: 'c2', document_id: 'doc-123', chunk_index: 1, page_number: 1, content: 'Chunk two content' },
        ])
        // countEmbeddedChunks inside loop
        .mockResolvedValueOnce([{ count: 2n }])
        // countEmbeddedChunks final
        .mockResolvedValueOnce([{ count: 2n }]);

      mockProvider.generateEmbeddings.mockResolvedValueOnce([mockVector, mockVector]);

      const result = await service.embedDocument('doc-123');

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          embeddingStatus: EmbeddingStatus.PROCESSING,
          embeddingError: null,
        },
      });

      expect(mockProvider.generateEmbeddings).toHaveBeenCalledWith([
        'Chunk one content',
        'Chunk two content',
      ]);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          embeddingStatus: EmbeddingStatus.COMPLETED,
          embeddedChunksCount: 2,
          embeddingError: null,
        },
      });

      expect(result.status).toBe(EmbeddingStatus.COMPLETED);
      expect(result.embeddedChunks).toBe(2);
      expect(result.failedChunks).toBe(0);
    });

    it('should skip chunks that already have embeddings (duplicate prevention)', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.document.update.mockResolvedValue(mockDoc);
      mockPrisma.documentChunk.count.mockResolvedValue(2);

      // Pending chunks query returns 0 chunks (all already have embeddings)
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // pendingChunks query
        .mockResolvedValueOnce([{ count: 2n }]); // countEmbeddedChunks

      const result = await service.embedDocument('doc-123');

      // Provider should NOT be called because chunks already have embeddings
      expect(mockProvider.generateEmbeddings).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          embeddingStatus: EmbeddingStatus.COMPLETED,
          embeddedChunksCount: 2,
          embeddingError: null,
        },
      });

      expect(result.status).toBe(EmbeddingStatus.COMPLETED);
    });

    it('should handle documents with 0 chunks gracefully', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        ...mockDoc,
        chunksCount: 0,
      });
      mockPrisma.document.update.mockResolvedValue(mockDoc);
      mockPrisma.documentChunk.count.mockResolvedValue(0);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // pendingChunks
        .mockResolvedValueOnce([{ count: 0n }]); // countEmbeddedChunks

      const result = await service.embedDocument('doc-123');

      expect(mockProvider.generateEmbeddings).not.toHaveBeenCalled();
      expect(result.totalChunks).toBe(0);
      expect(result.embeddedChunks).toBe(0);
      expect(result.status).toBe(EmbeddingStatus.COMPLETED);
    });

    it('should handle provider failure and mark document FAILED without silencing error', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.document.update.mockResolvedValue(mockDoc);
      mockPrisma.documentChunk.count.mockResolvedValue(2);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          { id: 'c1', document_id: 'doc-123', chunk_index: 0, page_number: 1, content: 'Chunk one' },
          { id: 'c2', document_id: 'doc-123', chunk_index: 1, page_number: 1, content: 'Chunk two' },
        ])
        .mockResolvedValueOnce([{ count: 0n }]); // countEmbeddedChunks on failure

      mockProvider.generateEmbeddings.mockRejectedValueOnce(
        new Error('Embedding API rate limit or outage'),
      );

      const result = await service.embedDocument('doc-123');

      // Do NOT silently mark as successful!
      expect(result.status).toBe(EmbeddingStatus.FAILED);
      expect(result.error).toBe('Embedding API rate limit or outage');
      expect(result.failedChunks).toBe(2);

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          embeddingStatus: EmbeddingStatus.FAILED,
          embeddedChunksCount: 0,
          embeddingError: 'Embedding API rate limit or outage',
        },
      });
    });
  });

  describe('backfillExistingChunks', () => {
    it('should process chunks in batches and report accurate statistics', async () => {
      // Mock queries
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 4n }]) // totalChunks
        .mockResolvedValueOnce([{ count: 4n }]) // totalNeedingEmbedding
        // Batch 1 (limit 2)
        .mockResolvedValueOnce([
          { id: 'c1', document_id: 'doc-1', chunk_index: 0, page_number: 1, content: 'Text 1' },
          { id: 'c2', document_id: 'doc-1', chunk_index: 1, page_number: 1, content: 'Text 2' },
        ])
        // Batch 2 (limit 2)
        .mockResolvedValueOnce([
          { id: 'c3', document_id: 'doc-2', chunk_index: 0, page_number: 1, content: 'Text 3' },
          { id: 'c4', document_id: 'doc-2', chunk_index: 1, page_number: 1, content: 'Text 4' },
        ])
        // Batch 3 (empty -> done)
        .mockResolvedValueOnce([])
        // countEmbeddedChunks for doc-1
        .mockResolvedValueOnce([{ count: 2n }])
        // countEmbeddedChunks for doc-2
        .mockResolvedValueOnce([{ count: 2n }])
        // remaining query
        .mockResolvedValueOnce([{ count: 0n }]);

      mockPrisma.documentChunk.count.mockResolvedValue(2);
      mockPrisma.document.update.mockResolvedValue({});

      // Mock provider returning vectors for batches
      mockProvider.generateEmbeddings
        .mockResolvedValueOnce([mockVector, mockVector])
        .mockResolvedValueOnce([mockVector, mockVector]);

      const report = await service.backfillExistingChunks({
        batchSize: 2,
        delayBetweenBatchesMs: 0,
      });

      expect(report.totalChunks).toBe(4);
      expect(report.totalNeedingEmbedding).toBe(4);
      expect(report.processedChunks).toBe(4);
      expect(report.failedChunks).toBe(0);
      expect(report.remainingChunks).toBe(0);
      expect(report.isComplete).toBe(true);
      expect(mockProvider.generateEmbeddings).toHaveBeenCalledTimes(2);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(4);
    });

    it('should support resuming failed backfills without duplicate processing', async () => {
      // Total chunks: 4, but only 2 chunks still need embeddings (resuming!)
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 4n }]) // totalChunks
        .mockResolvedValueOnce([{ count: 2n }]) // totalNeedingEmbedding
        // Batch 1: returns the remaining 2 un-embedded chunks
        .mockResolvedValueOnce([
          { id: 'c3', document_id: 'doc-2', chunk_index: 0, page_number: 1, content: 'Remaining 1' },
          { id: 'c4', document_id: 'doc-2', chunk_index: 1, page_number: 1, content: 'Remaining 2' },
        ])
        // Next query: returns empty
        .mockResolvedValueOnce([])
        // countEmbeddedChunks for doc-2
        .mockResolvedValueOnce([{ count: 2n }])
        // remaining query
        .mockResolvedValueOnce([{ count: 0n }]);

      mockPrisma.documentChunk.count.mockResolvedValue(2);
      mockPrisma.document.update.mockResolvedValue({});

      mockProvider.generateEmbeddings.mockResolvedValueOnce([mockVector, mockVector]);

      const report = await service.backfillExistingChunks({
        batchSize: 2,
        delayBetweenBatchesMs: 0,
      });

      expect(report.totalChunks).toBe(4);
      expect(report.totalNeedingEmbedding).toBe(2);
      expect(report.processedChunks).toBe(2);
      expect(report.remainingChunks).toBe(0);
      expect(report.isComplete).toBe(true);
      // Only 2 chunks were processed, chunks 1 & 2 were not re-embedded
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });
});
