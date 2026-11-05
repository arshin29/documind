import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmbeddingProvider,
  EMBEDDING_PROVIDER_TOKEN,
} from './interfaces/embedding-provider.interface';
import { ActivityType, EmbeddingStatus } from '@prisma/client';

export interface ChunkToEmbed {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
}

export interface BackfillProgressReport {
  totalChunks: number;
  totalNeedingEmbedding: number;
  processedChunks: number;
  failedChunks: number;
  remainingChunks: number;
  affectedDocuments: number;
  isComplete: boolean;
}

export interface DocumentEmbeddingResult {
  documentId: string;
  totalChunks: number;
  embeddedChunks: number;
  failedChunks: number;
  status: EmbeddingStatus;
  error?: string;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly defaultBatchSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(EMBEDDING_PROVIDER_TOKEN)
    private readonly provider: EmbeddingProvider,
  ) {
    this.defaultBatchSize =
      Number(this.configService.get<string>('EMBEDDING_BATCH_SIZE')) || 25;
  }

  get providerInfo() {
    return {
      provider: this.provider.providerName,
      model: this.provider.modelName,
      dimension: this.provider.dimension,
    };
  }

  /**
   * Generate embedding for a search query string with dimension validation
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const vector = await this.provider.generateEmbedding(trimmed);
    if (!Array.isArray(vector) || vector.length !== this.provider.dimension) {
      throw new Error(
        `Invalid query embedding returned: expected dimension ${this.provider.dimension}, got ${vector?.length}`,
      );
    }

    return vector;
  }

  /**
   * Generate and store embeddings for all chunks of a specific document
   */
  async embedDocument(documentId: string): Promise<DocumentEmbeddingResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Set document status to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        embeddingStatus: EmbeddingStatus.PROCESSING,
        embeddingError: null,
      },
    });

    // Query chunks for this document that do NOT have embeddings yet (skips already embedded)
    const pendingChunks = await this.prisma.$queryRaw<
      Array<{
        id: string;
        document_id: string;
        chunk_index: number;
        page_number: number | null;
        content: string;
      }>
    >`
      SELECT id, document_id, chunk_index, page_number, content
      FROM document_chunks
      WHERE document_id = ${documentId} AND embedding IS NULL
      ORDER BY chunk_index ASC
    `;

    const totalChunksCount = await this.prisma.documentChunk.count({
      where: { documentId },
    });

    // If there are 0 chunks needing embeddings
    if (pendingChunks.length === 0) {
      const alreadyEmbedded = await this.countEmbeddedChunks(documentId);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          embeddingStatus: EmbeddingStatus.COMPLETED,
          embeddedChunksCount: alreadyEmbedded,
          embeddingError: null,
        },
      });

      return {
        documentId,
        totalChunks: totalChunksCount,
        embeddedChunks: alreadyEmbedded,
        failedChunks: 0,
        status: EmbeddingStatus.COMPLETED,
      };
    }

    let processedCount = 0;
    let failedCount = 0;

    try {
      // Process in batches
      for (let i = 0; i < pendingChunks.length; i += this.defaultBatchSize) {
        const batch = pendingChunks.slice(i, i + this.defaultBatchSize);
        const texts = batch.map((c) => c.content);

        const embeddings = await this.provider.generateEmbeddings(texts);

        if (embeddings.length !== batch.length) {
          throw new Error(
            `Embedding count mismatch: expected ${batch.length}, got ${embeddings.length}`,
          );
        }

        // Store embeddings in PostgreSQL using parameterized query
        await this.prisma.$transaction(
          batch.map((chunk, idx) => {
            const vectorString = `[${embeddings[idx].join(',')}]`;
            return this.prisma.$executeRaw`
              UPDATE document_chunks
              SET embedding = ${vectorString}::vector
              WHERE id = ${chunk.id}
            `;
          }),
        );

        processedCount += batch.length;

        // Observable progress update on Document
        const docCheck = await this.prisma.document.findUnique({
          where: { id: documentId },
          select: { id: true },
        });
        if (!docCheck) {
          return {
            documentId,
            totalChunks: totalChunksCount,
            embeddedChunks: 0,
            failedChunks: 0,
            status: EmbeddingStatus.FAILED,
            error: 'Document deleted during embedding',
          };
        }

        const currentEmbedded = await this.countEmbeddedChunks(documentId);
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            embeddedChunksCount: currentEmbedded,
          },
        });
      }

      const docCheckFinal = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true },
      });
      if (!docCheckFinal) {
        return {
          documentId,
          totalChunks: totalChunksCount,
          embeddedChunks: 0,
          failedChunks: 0,
          status: EmbeddingStatus.FAILED,
          error: 'Document deleted during embedding',
        };
      }

      const finalEmbedded = await this.countEmbeddedChunks(documentId);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          embeddingStatus: EmbeddingStatus.COMPLETED,
          embeddedChunksCount: finalEmbedded,
          embeddingError: null,
        },
      });

      // Record activity
      try {
        await this.prisma.documentActivity.create({
          data: {
            workspaceId: document.workspaceId,
            documentId: document.id,
            userId: document.userId,
            action: 'Generated embeddings',
            target: document.title,
            type: ActivityType.PROCESSED,
            metadata: {
              chunksEmbedded: processedCount,
              totalChunks: totalChunksCount,
              model: this.provider.modelName,
            },
          },
        });
      } catch {
        // non-critical activity log
      }

      return {
        documentId,
        totalChunks: totalChunksCount,
        embeddedChunks: finalEmbedded,
        failedChunks: 0,
        status: EmbeddingStatus.COMPLETED,
      };
    } catch (error: any) {
      failedCount = pendingChunks.length - processedCount;
      const currentEmbedded = await this.countEmbeddedChunks(documentId);

      this.logger.error(
        `Failed embedding document ${documentId}: ${error.message}`,
      );

      // Do not silently mark failed embeddings as successful!
      // Keep extraction status intact (status: READY), only set embeddingStatus to FAILED
      try {
        const docStillExists = await this.prisma.document.findUnique({
          where: { id: documentId },
          select: { id: true },
        });

        if (docStillExists) {
          await this.prisma.document.update({
            where: { id: documentId },
            data: {
              embeddingStatus: EmbeddingStatus.FAILED,
              embeddedChunksCount: currentEmbedded,
              embeddingError: error.message || 'Embedding generation failed',
            },
          });
        }
      } catch {
        // Document was deleted concurrently
      }

      return {
        documentId,
        totalChunks: totalChunksCount,
        embeddedChunks: currentEmbedded,
        failedChunks: failedCount,
        status: EmbeddingStatus.FAILED,
        error: error.message,
      };
    }
  }

  /**
   * Controlled backfill mechanism for existing document chunks without embeddings
   */
  async backfillExistingChunks(options?: {
    batchSize?: number;
    maxChunksToProcess?: number;
    delayBetweenBatchesMs?: number;
    workspaceId?: string;
  }): Promise<BackfillProgressReport> {
    const batchSize = options?.batchSize || this.defaultBatchSize;
    const maxChunks = options?.maxChunksToProcess || Number.MAX_SAFE_INTEGER;
    const delayMs = options?.delayBetweenBatchesMs ?? 100;
    const workspaceIdFilter = options?.workspaceId;

    // Get total chunks and un-embedded chunks
    const totalCountQuery = workspaceIdFilter
      ? await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count
          FROM document_chunks c
          JOIN documents d ON c.document_id = d.id
          WHERE d.workspace_id = ${workspaceIdFilter}
        `
      : await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count
          FROM document_chunks
        `;

    const pendingCountQuery = workspaceIdFilter
      ? await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count
          FROM document_chunks c
          JOIN documents d ON c.document_id = d.id
          WHERE d.workspace_id = ${workspaceIdFilter} AND c.embedding IS NULL
        `
      : await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count
          FROM document_chunks
          WHERE embedding IS NULL
        `;

    const totalChunks = Number(totalCountQuery[0]?.count || 0);
    const totalNeedingEmbedding = Number(pendingCountQuery[0]?.count || 0);

    let processedChunks = 0;
    let failedChunks = 0;
    const affectedDocIds = new Set<string>();

    this.logger.log(
      `Starting embedding backfill: ${totalNeedingEmbedding} chunks needing embeddings out of ${totalChunks} total`,
    );

    while (processedChunks < maxChunks) {
      const take = Math.min(batchSize, maxChunks - processedChunks);

      // Find next batch of chunks where embedding IS NULL (skips already embedded, resumes from failure)
      const batch = workspaceIdFilter
        ? await this.prisma.$queryRaw<
            Array<{
              id: string;
              document_id: string;
              chunk_index: number;
              page_number: number | null;
              content: string;
            }>
          >`
            SELECT c.id, c.document_id, c.chunk_index, c.page_number, c.content
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE d.workspace_id = ${workspaceIdFilter} AND c.embedding IS NULL
            ORDER BY c.document_id, c.chunk_index ASC
            LIMIT ${take}
          `
        : await this.prisma.$queryRaw<
            Array<{
              id: string;
              document_id: string;
              chunk_index: number;
              page_number: number | null;
              content: string;
            }>
          >`
            SELECT id, document_id, chunk_index, page_number, content
            FROM document_chunks
            WHERE embedding IS NULL
            ORDER BY document_id, chunk_index ASC
            LIMIT ${take}
          `;

      if (batch.length === 0) {
        break; // All done
      }

      try {
        const texts = batch.map((c) => c.content);
        const embeddings = await this.provider.generateEmbeddings(texts);

        if (embeddings.length !== batch.length) {
          throw new Error(
            `Mismatch: expected ${batch.length} embeddings, got ${embeddings.length}`,
          );
        }

        // Store embeddings in PostgreSQL
        await this.prisma.$transaction(
          batch.map((chunk, idx) => {
            const vectorString = `[${embeddings[idx].join(',')}]`;
            return this.prisma.$executeRaw`
              UPDATE document_chunks
              SET embedding = ${vectorString}::vector
              WHERE id = ${chunk.id}
            `;
          }),
        );

        processedChunks += batch.length;
        batch.forEach((c) => affectedDocIds.add(c.document_id));

        this.logger.log(
          `Backfill progress: processed batch of ${batch.length} chunks (${processedChunks}/${totalNeedingEmbedding})`,
        );

        // Optional throttling to respect rate limits
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        this.logger.error(
          `Backfill failed on batch of ${batch.length} chunks: ${error.message}`,
        );
        failedChunks += batch.length;
        // Stop batch loop on error to avoid infinite loop when failure is permanent
        break;
      }
    }

    // Update statuses for affected documents
    for (const docId of affectedDocIds) {
      await this.syncDocumentEmbeddingStatus(docId);
    }

    const remainingCountQuery = workspaceIdFilter
      ? await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count
          FROM document_chunks c
          JOIN documents d ON c.document_id = d.id
          WHERE d.workspace_id = ${workspaceIdFilter} AND c.embedding IS NULL
        `
      : await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count
          FROM document_chunks
          WHERE embedding IS NULL
        `;

    const remainingChunks = Number(remainingCountQuery[0]?.count || 0);

    return {
      totalChunks,
      totalNeedingEmbedding,
      processedChunks,
      failedChunks,
      remainingChunks,
      affectedDocuments: affectedDocIds.size,
      isComplete: remainingChunks === 0,
    };
  }

  /**
   * Helper to count embedded chunks for a document
   */
  async countEmbeddedChunks(documentId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count
      FROM document_chunks
      WHERE document_id = ${documentId} AND embedding IS NOT NULL
    `;
    return Number(result[0]?.count || 0);
  }

  /**
   * Sync a document's embedding_status and embedded_chunks_count based on chunk states
   */
  async syncDocumentEmbeddingStatus(documentId: string): Promise<void> {
    const totalChunks = await this.prisma.documentChunk.count({
      where: { documentId },
    });
    const embeddedChunks = await this.countEmbeddedChunks(documentId);

    let status: EmbeddingStatus = EmbeddingStatus.PENDING;
    if (totalChunks === 0 || embeddedChunks === totalChunks) {
      status = EmbeddingStatus.COMPLETED;
    } else if (embeddedChunks > 0 && embeddedChunks < totalChunks) {
      status = EmbeddingStatus.PROCESSING;
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        embeddedChunksCount: embeddedChunks,
        embeddingStatus: status,
      },
    });
  }

  /**
   * Reset existing embeddings for a document and generate fresh embeddings using the active provider
   */
  async reembedDocument(documentId: string): Promise<DocumentEmbeddingResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Reset embeddings for all chunks of this document
    await this.prisma.$executeRaw`
      UPDATE document_chunks
      SET embedding = NULL
      WHERE document_id = ${documentId}
    `;

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        embeddingStatus: EmbeddingStatus.PENDING,
        embeddedChunksCount: 0,
        embeddingError: null,
      },
    });

    return this.embedDocument(documentId);
  }

  /**
   * Reset embeddings across a workspace (or globally) to allow a complete migration to a new embedding model
   */
  async resetEmbeddingsForMigration(workspaceId?: string): Promise<{ affectedChunks: number; affectedDocuments: number }> {
    let affectedChunks = 0;
    if (workspaceId) {
      const result = await this.prisma.$executeRaw`
        UPDATE document_chunks c
        SET embedding = NULL
        FROM documents d
        WHERE c.document_id = d.id AND d.workspace_id = ${workspaceId}
      `;
      affectedChunks = Number(result);

      await this.prisma.document.updateMany({
        where: { workspaceId },
        data: {
          embeddingStatus: EmbeddingStatus.PENDING,
          embeddedChunksCount: 0,
          embeddingError: null,
        },
      });
    } else {
      const result = await this.prisma.$executeRaw`
        UPDATE document_chunks
        SET embedding = NULL
      `;
      affectedChunks = Number(result);

      await this.prisma.document.updateMany({
        data: {
          embeddingStatus: EmbeddingStatus.PENDING,
          embeddedChunksCount: 0,
          embeddingError: null,
        },
      });
    }

    const affectedDocsCount = workspaceId
      ? await this.prisma.document.count({ where: { workspaceId } })
      : await this.prisma.document.count();

    return {
      affectedChunks,
      affectedDocuments: affectedDocsCount,
    };
  }
}
