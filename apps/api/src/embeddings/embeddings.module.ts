import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingService } from './embedding.service';
import { EmbeddingsController } from './embeddings.controller';
import { EMBEDDING_PROVIDER_TOKEN } from './interfaces/embedding-provider.interface';
import { OpenAiEmbeddingProvider } from './providers/openai-embedding.provider';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [EmbeddingsController],
  providers: [
    EmbeddingService,
    {
      provide: EMBEDDING_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const providerName = (
          configService.get<string>('EMBEDDING_PROVIDER') || 'openai'
        ).toLowerCase();

        if (providerName === 'gemini') {
          return new GeminiEmbeddingProvider(configService);
        }
        return new OpenAiEmbeddingProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmbeddingService, EMBEDDING_PROVIDER_TOKEN],
})
export class EmbeddingsModule {}

