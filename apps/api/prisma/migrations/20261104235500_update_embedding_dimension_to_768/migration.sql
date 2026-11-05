-- Drop existing HNSW index
DROP INDEX IF EXISTS "document_chunks_embedding_idx";

-- Clear any incompatible embeddings before changing dimension
UPDATE "document_chunks" SET "embedding" = NULL WHERE "embedding" IS NOT NULL AND vector_dims("embedding") != 768;

-- Update document embedding status for any chunks that were cleared
UPDATE "documents" SET "embedding_status" = 'PENDING', "embedded_chunks_count" = 0
WHERE id IN (
  SELECT DISTINCT "document_id" FROM "document_chunks" WHERE "embedding" IS NULL
);

-- Alter column to vector(768)
ALTER TABLE "document_chunks" ALTER COLUMN "embedding" TYPE vector(768);

-- Recreate HNSW index for vector(768)
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

