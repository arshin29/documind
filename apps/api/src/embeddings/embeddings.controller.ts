import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { EmbeddingService } from './embedding.service';
import { BackfillEmbeddingsDto } from './dto/backfill-embeddings.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceRole, MemberStatus } from '@prisma/client';

@Controller('embeddings')
@UseGuards(JwtAuthGuard)
export class EmbeddingsController {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to verify administrative permissions
   */
  private async verifyAdminAccess(
    userId: string,
    workspaceId?: string,
  ): Promise<void> {
    if (workspaceId) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

      if (
        !membership ||
        membership.status !== MemberStatus.ACTIVE ||
        membership.role !== WorkspaceRole.OWNER
      ) {
        throw new ForbiddenException(
          'Administrative backfill requires Workspace OWNER role',
        );
      }
    } else {
      // For global backfill, verify the user is an active OWNER of at least one workspace
      const ownerMembership = await this.prisma.workspaceMember.findFirst({
        where: {
          userId,
          status: MemberStatus.ACTIVE,
          role: WorkspaceRole.OWNER,
        },
      });

      if (!ownerMembership) {
        throw new ForbiddenException(
          'Administrative operations require Workspace OWNER permissions',
        );
      }
    }
  }

  /**
   * POST /api/embeddings/admin/backfill
   * Trigger backfill of chunks missing embeddings
   */
  @Post('admin/backfill')
  async runBackfill(
    @CurrentUser() user: SafeUser,
    @Body() dto: BackfillEmbeddingsDto,
  ) {
    await this.verifyAdminAccess(user.id, dto.workspaceId);

    const report = await this.embeddingService.backfillExistingChunks({
      batchSize: dto.batchSize,
      maxChunksToProcess: dto.maxChunksToProcess,
      delayBetweenBatchesMs: dto.delayBetweenBatchesMs,
      workspaceId: dto.workspaceId,
    });

    return {
      message: report.isComplete
        ? 'Backfill completed successfully'
        : 'Backfill batch completed with remaining chunks',
      report,
    };
  }

  /**
   * POST /api/embeddings/admin/reembed
   * Force re-embedding of a document or all documents
   */
  @Post('admin/reembed')
  async runReembed(
    @CurrentUser() user: SafeUser,
    @Body() body: { documentId?: string; workspaceId?: string },
  ) {
    await this.verifyAdminAccess(user.id, body.workspaceId);

    if (body.documentId) {
      const result = await this.embeddingService.reembedDocument(body.documentId);
      return {
        message: `Document ${body.documentId} re-embedded successfully`,
        result,
      };
    }

    // Reset embeddings for target scope and run backfill
    const resetStats = await this.embeddingService.resetEmbeddingsForMigration(body.workspaceId);
    const report = await this.embeddingService.backfillExistingChunks({
      workspaceId: body.workspaceId,
    });

    return {
      message: 'Re-embedding initiated and completed',
      resetStats,
      report,
    };
  }

  /**
   * GET /api/embeddings/admin/status
   * Get vector embedding health and chunk stats
   */
  @Get('admin/status')
  async getStatus(@CurrentUser() user: SafeUser) {
    await this.verifyAdminAccess(user.id);

    const totalChunks = await this.prisma.documentChunk.count();
    const embeddedResult = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT count(*)::bigint AS count
      FROM document_chunks
      WHERE embedding IS NOT NULL
    `;
    const embeddedChunks = Number(embeddedResult[0]?.count || 0);

    return {
      provider: this.embeddingService.providerInfo,
      chunks: {
        total: totalChunks,
        embedded: embeddedChunks,
        pending: totalChunks - embeddedChunks,
        percentageComplete:
          totalChunks > 0
            ? Math.round((embeddedChunks / totalChunks) * 100)
            : 100,
      },
    };
  }
}

