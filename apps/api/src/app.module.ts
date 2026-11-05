import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { DocumentsModule } from "./documents/documents.module";
import { EmbeddingsModule } from "./embeddings/embeddings.module";
import { SearchModule } from "./search/search.module";
import { LlmModule } from "./llm/llm.module";
import { RagModule } from "./rag/rag.module";
import { ConversationsModule } from "./conversations/conversations.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    DocumentsModule,
    EmbeddingsModule,
    SearchModule,
    LlmModule,
    RagModule,
    ConversationsModule,
  ],
})
export class AppModule {}
