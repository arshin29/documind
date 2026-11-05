import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  Document,
  DocumentStatus,
  DocumentType,
  MemberStatus,
  WorkspaceRole,
  ActivityType,
  EmbeddingStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { StorageService } from './storage/storage.interface';
import { TextExtractorService } from './extraction/text-extractor.service';
import { ChunkingService } from './chunking/chunking.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { RenameDocumentDto } from './dto/rename-document.dto';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export type SafeDocument = Omit<Document, 'fileUrl'>;

export interface DocumentListingResult {
  data: SafeDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DocumentContentResult {
  document: SafeDocument;
  fullText: string;
  chunks: {
    id: string;
    chunkIndex: number;
    pageNumber: number | null;
    content: string;
    metadata: any;
  }[];
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly textExtractor: TextExtractorService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Helper to sanitize document objects, stripping internal storage path
   */
  private sanitizeDocument(document: Document): SafeDocument {
    const { fileUrl: _fileUrl, ...safeDoc } = document;
    return safeDoc;
  }

  /**
   * Helper to verify user membership and role in a workspace
   */
  async verifyWorkspaceAccess(
    userId: string,
    workspaceId: string,
    requiredRoles?: WorkspaceRole[],
  ): Promise<{ role: WorkspaceRole }> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException(
        'You do not have access to this workspace or membership is inactive',
      );
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(
          'You do not have sufficient permissions to perform this action in this workspace',
        );
      }
    }

    return { role: membership.role };
  }

  /**
   * Helper to record document activity
   */
  private async recordActivity(params: {
    workspaceId: string;
    documentId: string | null;
    userId: string | null;
    action: string;
    target: string;
    type: ActivityType;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.documentActivity.create({
        data: {
          workspaceId: params.workspaceId,
          documentId: params.documentId,
          userId: params.userId,
          action: params.action,
          target: params.target,
          type: params.type,
          metadata: params.metadata ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record activity for document ${params.documentId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Validate uploaded file content (extension, MIME type, magic bytes)
   */
  private validateFile(file: Express.Multer.File): {
    documentType: DocumentType;
  } {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(
        `File size exceeds the 20MB limit (uploaded: ${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
      );
    }

    const originalName = file.originalname || '';
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      throw new BadRequestException(
        'File must have a valid extension (.pdf, .docx, or .txt)',
      );
    }

    const extension = originalName.substring(lastDotIndex).toLowerCase();
    const buffer = file.buffer;

    switch (extension) {
      case '.pdf': {
        // PDF Magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
        if (buffer && buffer.length >= 5) {
          const magic = buffer.subarray(0, 5).toString('ascii');
          if (!magic.startsWith('%PDF-')) {
            throw new BadRequestException(
              'Invalid PDF file: corrupted or invalid file signature',
            );
          }
        } else if (buffer && buffer.length > 0 && buffer.length < 5) {
          throw new BadRequestException(
            'Invalid PDF file: corrupted or truncated header',
          );
        }
        return { documentType: DocumentType.PDF };
      }

      case '.docx': {
        // DOCX Magic bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
        if (buffer && buffer.length >= 4) {
          const isZip =
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04;
          if (!isZip) {
            throw new BadRequestException(
              'Invalid DOCX file: corrupted or invalid zip archive signature',
            );
          }
        } else if (buffer && buffer.length > 0 && buffer.length < 4) {
          throw new BadRequestException(
            'Invalid DOCX file: corrupted or truncated header',
          );
        }
        return { documentType: DocumentType.DOCX };
      }

      case '.txt': {
        // Plain text validation: check for binary null bytes in preview
        if (buffer && buffer.length > 0) {
          const checkLen = Math.min(buffer.length, 1024);
          for (let i = 0; i < checkLen; i++) {
            if (buffer[i] === 0) {
              throw new BadRequestException(
                'Invalid TXT file: binary data detected',
              );
            }
          }
        }
        return { documentType: DocumentType.TXT };
      }

      default:
        throw new BadRequestException(
          `Unsupported file extension "${extension}". Only .pdf, .docx, and .txt files are supported.`,
        );
    }
  }

  /**
   * Upload and process a new document
   */
  async upload(
    user: SafeUser,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<SafeDocument> {
    // 1. Validate file format and magic bytes
    const { documentType } = this.validateFile(file);

    // 2. Resolve and verify workspace permissions
    let targetWorkspaceId = dto.workspaceId;
    if (targetWorkspaceId) {
      await this.verifyWorkspaceAccess(user.id, targetWorkspaceId, [
        WorkspaceRole.OWNER,
        WorkspaceRole.EDITOR,
      ]);
    } else {
      // Find first accessible workspace where user is OWNER or EDITOR
      const membership = await this.prisma.workspaceMember.findFirst({
        where: {
          userId: user.id,
          status: MemberStatus.ACTIVE,
          role: { in: [WorkspaceRole.OWNER, WorkspaceRole.EDITOR] },
        },
        orderBy: { joinedAt: 'asc' },
      });

      if (!membership) {
        throw new ForbiddenException(
          'No accessible workspace found with upload permissions (Editor or Owner required)',
        );
      }
      targetWorkspaceId = membership.workspaceId;
    }

    // 3. Save physical file via StorageService
    let storedFile: { storageKey: string; size: number } | null = null;
    try {
      storedFile = await this.storageService.saveFile(file, targetWorkspaceId);
    } catch (error) {
      this.logger.error(`File storage failed: ${(error as Error).message}`);
      throw error;
    }

    // 4. Create initial Document record with PENDING status
    const docTitle = (dto.title?.trim() || file.originalname).trim();
    let createdDocument: Document;

    try {
      createdDocument = await this.prisma.document.create({
        data: {
          workspaceId: targetWorkspaceId,
          userId: user.id,
          title: docTitle,
          originalName: file.originalname,
          fileType: documentType,
          fileSize: file.size,
          fileUrl: storedFile.storageKey,
          status: DocumentStatus.PENDING,
          embeddingStatus: EmbeddingStatus.PENDING,
          embeddedChunksCount: 0,
          pages: 1,
          chunksCount: 0,
          summary: null,
          keyTopics: [],
        },
      });

      // Record UPLOAD activity
      await this.recordActivity({
        workspaceId: targetWorkspaceId,
        documentId: createdDocument.id,
        userId: user.id,
        action: 'Uploaded document',
        target: createdDocument.title,
        type: ActivityType.UPLOAD,
        metadata: {
          originalName: file.originalname,
          fileSize: file.size,
          fileType: documentType,
        },
      });
    } catch (error) {
      // Clean up physical file if database record creation fails
      if (storedFile) {
        await this.storageService.deleteFile(storedFile.storageKey);
      }
      this.logger.error(
        `Failed to create document record: ${(error as Error).message}`,
      );
      throw error;
    }

    // 5. Update status to PROCESSING
    await this.prisma.document.update({
      where: { id: createdDocument.id },
      data: { status: DocumentStatus.PROCESSING },
    });

    // 6. Text Extraction & Chunking Pipeline
    try {
      const extracted = await this.textExtractor.extract(
        file.buffer,
        documentType,
      );
      const chunksData = this.chunkingService.chunk(extracted);

      // 7. Save chunks and transition to READY
      const updatedDoc = await this.prisma.$transaction(async (tx) => {
        if (chunksData.length > 0) {
          await tx.documentChunk.createMany({
            data: chunksData.map((chunk) => ({
              documentId: createdDocument.id,
              chunkIndex: chunk.chunkIndex,
              pageNumber: chunk.pageNumber,
              content: chunk.content,
              metadata: chunk.metadata,
            })),
          });
        }

        const readyDoc = await tx.document.update({
          where: { id: createdDocument.id },
          data: {
            pages: Math.max(extracted.totalPages, 1),
            chunksCount: chunksData.length,
            status: DocumentStatus.READY,
            embeddingStatus:
              chunksData.length > 0
                ? EmbeddingStatus.PENDING
                : EmbeddingStatus.COMPLETED,
            embeddedChunksCount: 0,
          },
        });

        await tx.documentActivity.create({
          data: {
            workspaceId: targetWorkspaceId,
            documentId: createdDocument.id,
            userId: user.id,
            action: 'Processed document',
            target: createdDocument.title,
            type: ActivityType.PROCESSED,
            metadata: {
              pages: Math.max(extracted.totalPages, 1),
              chunksCount: chunksData.length,
            },
          },
        });

        return readyDoc;
      });

      // 8. Trigger background embedding generation (non-blocking)
      if (chunksData.length > 0) {
        this.triggerBackgroundEmbedding(updatedDoc.id);
      }

      return this.sanitizeDocument(updatedDoc);
    } catch (error) {
      this.logger.error(
        `Text processing failed for document ${createdDocument.id}: ${(error as Error).message}`,
      );

      // Transition to FAILED status
      const failedDoc = await this.prisma.document.update({
        where: { id: createdDocument.id },
        data: { status: DocumentStatus.FAILED },
      });

      await this.recordActivity({
        workspaceId: targetWorkspaceId,
        documentId: createdDocument.id,
        userId: user.id,
        action: 'Processing failed',
        target: createdDocument.title,
        type: ActivityType.PROCESSED,
        metadata: { error: (error as Error).message },
      });

      return this.sanitizeDocument(failedDoc);
    }
  }

  /**
   * List and filter documents with workspace access control
   */
  async findAll(
    user: SafeUser,
    query: QueryDocumentsDto,
  ): Promise<DocumentListingResult> {
    let workspaceIds: string[] = [];

    if (query.workspaceId) {
      // Verify user is an active member in the requested workspace
      await this.verifyWorkspaceAccess(user.id, query.workspaceId);
      workspaceIds = [query.workspaceId];
    } else {
      // Find all workspaces where user is an active member
      const memberships = await this.prisma.workspaceMember.findMany({
        where: {
          userId: user.id,
          status: MemberStatus.ACTIVE,
        },
        select: { workspaceId: true },
      });
      workspaceIds = memberships.map((m) => m.workspaceId);
    }

    if (workspaceIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: query.limit || 10,
          totalPages: 0,
        },
      };
    }

    const where: any = {
      workspaceId: { in: workspaceIds },
    };

    if (query.fileType) {
      where.fileType = query.fileType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { originalName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Sort order & field
    const allowedSortFields = ['createdAt', 'title', 'fileSize'];
    const sortField = allowedSortFields.includes(query.sortBy || '')
      ? query.sortBy!
      : 'createdAt';
    const sortDirection =
      query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents.map((doc) => this.sanitizeDocument(doc)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find document by ID, enforcing workspace access
   */
  async findOne(user: SafeUser, documentId: string): Promise<SafeDocument> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Enforce workspace membership
    await this.verifyWorkspaceAccess(user.id, document.workspaceId);

    return this.sanitizeDocument(document);
  }

  /**
   * Get document content and structured chunks
   */
  async getContent(
    user: SafeUser,
    documentId: string,
  ): Promise<DocumentContentResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Enforce workspace membership
    await this.verifyWorkspaceAccess(user.id, document.workspaceId);

    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    const fullText = chunks.map((c) => c.content).join('\n\n');

    return {
      document: this.sanitizeDocument(document),
      fullText,
      chunks: chunks.map((c) => ({
        id: c.id,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        content: c.content,
        metadata: c.metadata,
      })),
    };
  }

  /**
   * Rename a document
   */
  async rename(
    user: SafeUser,
    documentId: string,
    dto: RenameDocumentDto,
  ): Promise<SafeDocument> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Only OWNER or EDITOR can rename documents
    await this.verifyWorkspaceAccess(user.id, document.workspaceId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.EDITOR,
    ]);

    const newTitle = dto.title.trim();
    if (!newTitle) {
      throw new BadRequestException('Document title cannot be empty');
    }

    const oldTitle = document.title;
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { title: newTitle },
    });

    await this.recordActivity({
      workspaceId: document.workspaceId,
      documentId: document.id,
      userId: user.id,
      action: 'Renamed document',
      target: newTitle,
      type: ActivityType.PROCESSED,
      metadata: { oldTitle, newTitle },
    });

    return this.sanitizeDocument(updated);
  }

  /**
   * Delete a document and its storage file
   */
  async delete(
    user: SafeUser,
    documentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Only OWNER or EDITOR can delete documents
    await this.verifyWorkspaceAccess(user.id, document.workspaceId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.EDITOR,
    ]);

    // Record activity before deletion
    await this.recordActivity({
      workspaceId: document.workspaceId,
      documentId: null,
      userId: user.id,
      action: 'Deleted document',
      target: document.title,
      type: ActivityType.PROCESSED,
      metadata: {
        deletedDocumentId: document.id,
        originalName: document.originalName,
        fileType: document.fileType,
      },
    });

    // Delete record from database (cascades chunks)
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    // Safely delete physical file from storage
    if (document.fileUrl) {
      await this.storageService.deleteFile(document.fileUrl);
    }

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * Trigger background embedding generation without blocking HTTP response
   */
  private triggerBackgroundEmbedding(documentId: string): void {
    setImmediate(async () => {
      try {
        await this.embeddingService.embedDocument(documentId);
      } catch (error) {
        this.logger.error(
          `Background embedding generation failed for document ${documentId}: ${(error as Error).message}`,
        );
      }
    });
  }

  /**
   * Explicitly trigger or retry embedding generation for a document
   */
  async processEmbeddings(documentId: string) {
    return this.embeddingService.embedDocument(documentId);
  }
}

