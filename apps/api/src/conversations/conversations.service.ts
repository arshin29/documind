import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { RagService } from '../rag/rag.service';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { MessageSender, WorkspaceRole } from '@prisma/client';
import { ChatMessage } from '../llm/interfaces/llm-provider.interface';
import { DocumentCitation, RagStreamEvent } from '../rag/rag.interface';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    private readonly ragService: RagService,
  ) {}

  /**
   * Helper to verify and resolve target document IDs within a workspace
   */
  private async resolveDocumentIds(
    workspaceId: string,
    documentId?: string,
    documentIds?: string[],
  ): Promise<{ primaryDocId: string | null; allDocIds: string[] }> {
    const rawIds = [...(documentIds || []), ...(documentId ? [documentId] : [])];
    const uniqueIds = Array.from(new Set(rawIds.filter(Boolean)));

    if (uniqueIds.length > 0) {
      const validDocs = await this.prisma.document.findMany({
        where: {
          id: { in: uniqueIds },
          workspaceId,
        },
        select: { id: true },
      });

      if (validDocs.length !== uniqueIds.length) {
        throw new NotFoundException(
          'One or more specified documents were not found in this workspace',
        );
      }
    }

    const primaryDocId = documentId || uniqueIds[0] || null;
    return { primaryDocId, allDocIds: uniqueIds };
  }

  /**
   * Create a new conversation thread
   */
  async create(user: SafeUser, dto: CreateConversationDto) {
    // 1. Verify workspace access
    await this.documentsService.verifyWorkspaceAccess(user.id, dto.workspaceId);

    // 2. Validate and resolve documents
    const { primaryDocId, allDocIds } = await this.resolveDocumentIds(
      dto.workspaceId,
      dto.documentId,
      dto.documentIds,
    );

    const title = (dto.title?.trim() || 'New Conversation').trim();

    return this.prisma.conversation.create({
      data: {
        workspaceId: dto.workspaceId,
        userId: user.id,
        documentId: primaryDocId,
        documentIds: allDocIds,
        title,
        totalQuestions: 0,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            originalName: true,
            fileType: true,
            pages: true,
          },
        },
      },
    });
  }

  /**
   * List all conversations in workspace (with optional document filtering)
   */
  async findAll(user: SafeUser, dto: QueryConversationsDto) {
    await this.documentsService.verifyWorkspaceAccess(user.id, dto.workspaceId);

    const where: any = {
      workspaceId: dto.workspaceId,
    };

    if (dto.documentId) {
      where.OR = [
        { documentId: dto.documentId },
        { documentIds: { has: dto.documentId } },
      ];
    }

    return this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            originalName: true,
            fileType: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Get single conversation details with all historical messages and citations
   */
  async findOne(user: SafeUser, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            originalName: true,
            fileType: true,
            pages: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Workspace membership enforcement
    await this.documentsService.verifyWorkspaceAccess(
      user.id,
      conversation.workspaceId,
    );

    return conversation;
  }

  /**
   * Delete conversation thread
   */
  async delete(user: SafeUser, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, userId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Only OWNER, EDITOR, or creator can delete
    const { role } = await this.documentsService.verifyWorkspaceAccess(
      user.id,
      conversation.workspaceId,
    );

    if (
      conversation.userId !== user.id &&
      role !== WorkspaceRole.OWNER &&
      role !== WorkspaceRole.EDITOR
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this conversation',
      );
    }

    await this.prisma.conversation.delete({
      where: { id },
    });

    return { success: true, message: 'Conversation deleted successfully' };
  }

  /**
   * Helper to retrieve historical messages formatted for LLM context
   * Retrieves the most recent prior messages in chronological order,
   * excluding the current active user message to avoid duplication.
   */
  private async getHistoryForConversation(
    conversationId: string,
    excludeMessageId?: string,
  ): Promise<ChatMessage[]> {
    const historicalMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(excludeMessageId ? { id: { not: excludeMessageId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return historicalMessages.reverse().map((m) => ({
      role: m.sender === MessageSender.USER ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  /**
   * Send question and receive non-streaming answer
   */
  async sendMessageNonStreaming(
    user: SafeUser,
    conversationId: string,
    content: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.documentsService.verifyWorkspaceAccess(
      user.id,
      conversation.workspaceId,
    );

    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Question content cannot be empty');
    }

    // 1. Persist User Message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.USER,
        content: trimmed,
      },
    });

    // 2. Increment totalQuestions and update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        totalQuestions: { increment: 1 },
        title:
          conversation.title === 'New Conversation'
            ? trimmed.length > 35
              ? `${trimmed.slice(0, 35)}...`
              : trimmed
            : conversation.title,
      },
    });

    // 3. Gather conversation history (excluding current user message to prevent prompt duplication)
    const history = await this.getHistoryForConversation(
      conversationId,
      userMessage.id,
    );

    // 4. Resolve target documents for RAG
    const targetDocIds =
      conversation.documentIds && conversation.documentIds.length > 0
        ? conversation.documentIds
        : conversation.documentId
        ? [conversation.documentId]
        : undefined;

    // 5. Execute RAG
    const { answer, citations } = await this.ragService.answerQuestion(
      user,
      conversation.workspaceId,
      trimmed,
      targetDocIds,
      history,
    );

    // 6. Persist Assistant Message with Citations
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.ASSISTANT,
        content: answer,
        citations: citations as any,
      },
    });

    // 7. Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  /**
   * Send question and stream answer tokens via Server-Sent Events (SSE)
   */
  async *streamMessage(
    user: SafeUser,
    conversationId: string,
    content: string,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<RagStreamEvent & { messageId?: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.documentsService.verifyWorkspaceAccess(
      user.id,
      conversation.workspaceId,
    );

    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Question content cannot be empty');
    }

    // 1. Persist User Message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.USER,
        content: trimmed,
      },
    });

    // 2. Increment totalQuestions
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        totalQuestions: { increment: 1 },
        title:
          conversation.title === 'New Conversation'
            ? trimmed.length > 35
              ? `${trimmed.slice(0, 35)}...`
              : trimmed
            : conversation.title,
      },
    });

    const history = await this.getHistoryForConversation(
      conversationId,
      userMessage.id,
    );

    const targetDocIds =
      conversation.documentIds && conversation.documentIds.length > 0
        ? conversation.documentIds
        : conversation.documentId
        ? [conversation.documentId]
        : undefined;

    let fullAnswer = '';
    let finalCitations: DocumentCitation[] = [];
    let completedSuccessfully = false;

    try {
      for await (const event of this.ragService.streamAnswer(
        user,
        conversation.workspaceId,
        trimmed,
        targetDocIds,
        history,
        options,
      )) {
        if (event.type === 'token') {
          fullAnswer += event.token;
          yield event;
        } else if (event.type === 'citations') {
          finalCitations = event.citations;
          yield event;
        } else if (event.type === 'done') {
          fullAnswer = event.answer;
          finalCitations = event.citations;
          completedSuccessfully = true;
        }
      }

      // If client disconnected before completion, do not save incomplete message!
      if (!completedSuccessfully || options?.signal?.aborted) {
        this.logger.warn(
          `Streaming interrupted for conversation ${conversationId}. Incomplete answer discarded.`,
        );
        return;
      }

      // 3. Persist completed Assistant Message
      const assistantMessage = await this.prisma.message.create({
        data: {
          conversationId,
          sender: MessageSender.ASSISTANT,
          content: fullAnswer,
          citations: finalCitations as any,
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      yield {
        type: 'done',
        answer: fullAnswer,
        citations: finalCitations,
        messageId: assistantMessage.id,
      };
    } catch (error: any) {
      if (options?.signal?.aborted) {
        return; // Graceful exit on client abort
      }
      this.logger.error(`Error in streamMessage: ${error.message}`);
      throw error;
    }
  }
}

