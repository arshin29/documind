import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage/storage.interface';
import { LocalStorageService } from './storage/local-storage.service';
import { PdfExtractorService } from './extraction/pdf-extractor.service';
import { DocxExtractorService } from './extraction/docx-extractor.service';
import { TxtExtractorService } from './extraction/txt-extractor.service';
import { TextExtractorService } from './extraction/text-extractor.service';
import { ChunkingService } from './chunking/chunking.service';

@Module({
  imports: [PrismaModule, EmbeddingsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: StorageService,
      useClass: LocalStorageService,
    },
    PdfExtractorService,
    DocxExtractorService,
    TxtExtractorService,
    TextExtractorService,
    ChunkingService,
  ],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}

