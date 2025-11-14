-- AlterTable
ALTER TABLE "public"."skill_taxonomy" ADD COLUMN     "embedding" JSONB,
ADD COLUMN     "embedding_model" TEXT,
ADD COLUMN     "embedding_updated_at" TIMESTAMP(3),
ADD COLUMN     "needs_embedding_update" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "skill_taxonomy_embedding_idx" ON "public"."skill_taxonomy"("embedding");
