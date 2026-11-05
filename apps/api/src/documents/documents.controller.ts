import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { RenameDocumentDto } from './dto/rename-document.dto';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * POST /api/documents/upload
   * Upload and process a new PDF, DOCX, or TXT document
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  async upload(
    @CurrentUser() user: SafeUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('A file must be uploaded with field name "file"');
    }
    return this.documentsService.upload(user, file, dto);
  }

  /**
   * GET /api/documents
   * List, search, filter, and paginate documents
   */
  @Get()
  async findAll(
    @CurrentUser() user: SafeUser,
    @Query() query: QueryDocumentsDto,
  ) {
    return this.documentsService.findAll(user, query);
  }

  /**
   * GET /api/documents/:id
   * Get document metadata and processing details
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ) {
    return this.documentsService.findOne(user, id);
  }

  /**
   * GET /api/documents/:id/content
   * Get extracted text and structured chunks
   */
  @Get(':id/content')
  async getContent(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ) {
    return this.documentsService.getContent(user, id);
  }

  /**
   * PATCH /api/documents/:id
   * Rename document title
   */
  @Patch(':id')
  async rename(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: RenameDocumentDto,
  ) {
    return this.documentsService.rename(user, id, dto);
  }

  /**
   * DELETE /api/documents/:id
   * Delete document, chunks, and physical file safely
   */
  @Delete(':id')
  async delete(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ) {
    return this.documentsService.delete(user, id);
  }
}

