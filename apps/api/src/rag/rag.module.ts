import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { LlmModule } from '../llm/llm.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RagService } from './rag.service';

@Module({
  imports: [SearchModule, LlmModule, PrismaModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}

