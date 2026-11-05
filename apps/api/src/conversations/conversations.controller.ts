import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) { }

  /**
   * POST /api/conversations
   * Create a new conversation thread
   */
  @Post()
  async create(
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(user, dto);
  }

  /**
   * GET /api/conversations
   * List conversations in workspace
   */
  @Get()
  async findAll(
    @CurrentUser() user: SafeUser,
    @Query() query: QueryConversationsDto,
  ) {
    return this.conversationsService.findAll(user, query);
  }

  /**
   * GET /api/conversations/:id
   * Get single conversation details with messages
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ) {
    return this.conversationsService.findOne(user, id);
  }

  /**
   * DELETE /api/conversations/:id
   * Delete conversation thread
   */
  @Delete(':id')
  async delete(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ) {
    return this.conversationsService.delete(user, id);
  }

  /**
   * POST /api/conversations/:id/messages
   * Send question and receive answer (supports SSE streaming and JSON fallback)
   */
  @Post(':id/messages')
  async sendMessage(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const isStreamRequested =
      dto.stream !== false &&
      (dto.stream === true ||
        req.headers.accept?.includes('text/event-stream') ||
        req.query.stream === 'true');

    if (!isStreamRequested) {
      const result = await this.conversationsService.sendMessageNonStreaming(
        user,
        id,
        dto.content,
      );
      return res.status(HttpStatus.OK).json(result);
    }

    // Set Server-Sent Events headers
    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      for await (const chunk of this.conversationsService.streamMessage(
        user,
        id,
        dto.content,
        { signal: abortController.signal },
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'Error generating AI response',
          })}\n\n`,
        );
      }
    } finally {
      res.end();
    }
  }
}
