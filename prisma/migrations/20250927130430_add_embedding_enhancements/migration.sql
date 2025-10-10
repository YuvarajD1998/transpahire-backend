/*
  Warnings:

  - Added the required column `updated_at` to the `embeddings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."embeddings" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dimensions" INTEGER NOT NULL DEFAULT 1536,
ADD COLUMN     "model_name" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."jobs" ADD COLUMN     "embeddings_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "embeddings_version" INTEGER;

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "embeddings_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "embeddings_version" INTEGER;

-- CreateIndex
CREATE INDEX "embeddings_entity_type_idx" ON "public"."embeddings"("entity_type");

-- CreateIndex
CREATE INDEX "embeddings_entity_id_idx" ON "public"."embeddings"("entity_id");
