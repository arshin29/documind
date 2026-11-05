-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "document_chunks" ADD COLUMN     "embedding" vector(1536);

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "embedded_chunks_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "embedding_error" TEXT,
ADD COLUMN     "embedding_status" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "documents_embedding_status_idx" ON "documents"("embedding_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

