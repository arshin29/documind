import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { DocumentsService } from '../documents/documents.service';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { SemanticSearchDto } from './dto/semantic-search.dto';

export interface SemanticSearchResultItem {
  chunkId: string;
  id: string;
  documentId: string;
  title: string;
  originalFilename: string;
  originalName: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  metadata?: any;
  similarityScore: number;
  score: number;
}

interface RawSearchResult {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number | null;
  content: string;
  metadata: any;
  title: string;
  originalFilename: string;
  similarityScore: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly documentsService: DocumentsService,
  ) { }

  /**
   * Perform semantic vector similarity search within workspace
   */
  async searchSemantic(
    user: SafeUser,
    dto: SemanticSearchDto,
  ): Promise<SemanticSearchResultItem[]> {
    // 1. Validate query string
    const trimmedQuery = (dto.query || '').trim();
    if (!trimmedQuery) {
      throw new BadRequestException('Search query cannot be empty');
    }

    if (trimmedQuery.length > 4000) {
      throw new BadRequestException('Search query cannot exceed 4000 characters');
    }

    // 2. Validate limit
    const limit = dto.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Result limit must be an integer between 1 and 100');
    }

    // 3. Verify user active membership in workspace (Workspace isolation)
    await this.documentsService.verifyWorkspaceAccess(user.id, dto.workspaceId);

    // 4. Resolve and verify target document IDs (multi-document filtering)
    const rawDocIds = dto.documentIds && dto.documentIds.length > 0
      ? dto.documentIds
      : dto.documentId
        ? [dto.documentId]
        : [];
    const targetDocIds = Array.from(new Set(rawDocIds));

    if (targetDocIds.length > 0) {
      const validDocs = await this.prisma.document.findMany({
        where: {
          id: { in: targetDocIds },
          workspaceId: dto.workspaceId,
        },
        select: { id: true },
      });

      if (validDocs.length !== targetDocIds.length) {
        throw new NotFoundException(
          'One or more documents not found in the specified workspace',
        );
      }
    }

    // 5. Generate query vector embedding using the embedding provider
    const queryEmbedding =
      await this.embeddingService.generateQueryEmbedding(trimmedQuery);

    const vectorString = `[${queryEmbedding.join(',')}]`;

    // 6. Parameterized vector similarity search with pgvector
    // Uses cosine distance operator `<=>`
    // Cosine similarity is calculated as: 1 - cosine_distance
    const results = await this.prisma.$queryRaw<RawSearchResult[]>`
      SELECT
        c.id AS "chunkId",
        c.document_id AS "documentId",
        c.chunk_index AS "chunkIndex",
        c.page_number AS "pageNumber",
        c.content,
        c.metadata,
        d.title AS "title",
        d.original_name AS "originalFilename",
        ROUND((1 - (c.embedding <=> ${vectorString}::vector))::numeric, 6)::float AS "similarityScore"
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE d.workspace_id = ${dto.workspaceId}
        AND c.embedding IS NOT NULL
        ${targetDocIds.length === 1
        ? Prisma.sql`AND d.id = ${targetDocIds[0]}`
        : targetDocIds.length > 1
          ? Prisma.sql`AND d.id IN (${Prisma.join(targetDocIds)})`
          : Prisma.empty
      }
      ORDER BY c.embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit};
    `;

    const mapped = results.map((row) => ({
      chunkId: row.chunkId,
      id: row.chunkId,
      documentId: row.documentId,
      title: row.title,
      originalFilename: row.originalFilename,
      originalName: row.originalFilename,
      pageNumber: row.pageNumber,
      chunkIndex: row.chunkIndex,
      content: row.content,
      metadata: row.metadata,
      similarityScore: Number(row.similarityScore),
      score: Number(row.similarityScore),
    }));

    if (dto.threshold !== undefined && Number.isFinite(dto.threshold)) {
      return mapped.filter((item) => item.similarityScore >= dto.threshold!);
    }

    return mapped;
  }
}

