/*
  Warnings:

  - You are about to alter the column `embedding` on the `skill_taxonomy` table. The data in that column could be lost. The data in that column will be cast from `JsonB` to `Unsupported("vector")`.
  - You are about to drop the `embeddings` table. If the table is not empty, all the data it contains will be lost.

*/

-- ✅ First: cast JSONB → vector using explicit USING clause
ALTER TABLE "public"."skill_taxonomy"
DROP COLUMN "embedding";

ALTER TABLE "public"."skill_taxonomy"
ADD COLUMN "embedding" vector;


-- Drop old embeddings table
DROP TABLE "public"."embeddings";

-- Create new candidate embeddings table
CREATE TABLE "public"."candidate_embeddings" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "job_id" INTEGER,
    "vector" vector,
    "dimension" INTEGER NOT NULL,
    "model_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_embeddings_pkey" PRIMARY KEY ("id")
);

-- Create new job embeddings table
CREATE TABLE "public"."job_embeddings" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "vector" vector,
    "dimension" INTEGER NOT NULL,
    "model_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_embeddings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "candidate_embeddings_candidate_id_idx" ON "public"."candidate_embeddings"("candidate_id");
CREATE INDEX "candidate_embeddings_type_idx" ON "public"."candidate_embeddings"("type");
CREATE INDEX "candidate_embeddings_job_id_idx" ON "public"."candidate_embeddings"("job_id");

CREATE INDEX "job_embeddings_job_id_idx" ON "public"."job_embeddings"("job_id");
CREATE INDEX "job_embeddings_type_idx" ON "public"."job_embeddings"("type");
