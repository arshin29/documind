-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_document_id_fkey";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "document_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "document_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

