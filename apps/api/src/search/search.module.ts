import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { DocumentsModule } from '../documents/documents.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, EmbeddingsModule, DocumentsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

