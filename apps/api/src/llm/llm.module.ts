import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LLM_PROVIDER_TOKEN } from './interfaces/llm-provider.interface';
import { OpenAiLlmProvider } from './providers/openai-llm.provider';
import { GeminiLlmProvider } from './providers/gemini-llm.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LLM_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const providerName = (
          configService.get<string>('LLM_PROVIDER') || 'openai'
        ).toLowerCase();

        if (providerName === 'gemini') {
          return new GeminiLlmProvider(configService);
        }
        return new OpenAiLlmProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LLM_PROVIDER_TOKEN],
})
export class LlmModule {}

