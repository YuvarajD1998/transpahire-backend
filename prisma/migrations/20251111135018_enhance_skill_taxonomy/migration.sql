/*
  Warnings:

  - You are about to drop the column `parent_skill` on the `skill_taxonomy` table. All the data in the column will be lost.
  - You are about to drop the column `related_skills` on the `skill_taxonomy` table. All the data in the column will be lost.
  - You are about to drop the column `specializations` on the `skill_taxonomy` table. All the data in the column will be lost.
  - You are about to drop the column `synonyms` on the `skill_taxonomy` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[candidate_id,type,job_id,version]` on the table `candidate_embeddings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[job_id,type,version]` on the table `job_embeddings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[skill_code]` on the table `skill_taxonomy` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[esco_uri]` on the table `skill_taxonomy` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."SkillStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'MERGED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "public"."SkillRelationType" AS ENUM ('REQUIRES', 'ENABLES', 'SIMILAR_TO', 'SPECIALIZATION_OF', 'COMMONLY_WITH', 'PROGRESSION');

-- DropIndex
DROP INDEX "public"."skill_taxonomy_parent_skill_idx";

-- AlterTable
ALTER TABLE "public"."candidate_embeddings" ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "token_count" INTEGER;

-- AlterTable
ALTER TABLE "public"."job_embeddings" ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "token_count" INTEGER;

-- AlterTable
ALTER TABLE "public"."job_required_skills" ADD COLUMN     "avg_candidate_years" DOUBLE PRECISION,
ADD COLUMN     "context_snippet" TEXT;

-- AlterTable
ALTER TABLE "public"."profile_skills" ADD COLUMN     "endorsement_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."skill_taxonomy" DROP COLUMN "parent_skill",
DROP COLUMN "related_skills",
DROP COLUMN "specializations",
DROP COLUMN "synonyms",
ADD COLUMN     "demand_score" DOUBLE PRECISION DEFAULT 0.5,
ADD COLUMN     "embedding_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "esco_uri" TEXT,
ADD COLUMN     "hierarchy_path" TEXT,
ADD COLUMN     "isco_code" TEXT,
ADD COLUMN     "last_trend_update" TIMESTAMP(3),
ADD COLUMN     "managerial_role_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ADD COLUMN     "merged_into_id" INTEGER,
ADD COLUMN     "onet_code" TEXT,
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "skill_code" TEXT,
ADD COLUMN     "status" "public"."SkillStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "trending_score" DOUBLE PRECISION DEFAULT 0.0;

-- CreateTable
CREATE TABLE "public"."skill_endorsements" (
    "id" SERIAL NOT NULL,
    "profile_skill_id" INTEGER NOT NULL,
    "endorsed_by" INTEGER,
    "endorserType" TEXT NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skill_synonyms" (
    "id" SERIAL NOT NULL,
    "skill_taxonomy_id" INTEGER NOT NULL,
    "synonym" TEXT NOT NULL,
    "normalized_form" TEXT NOT NULL,
    "locale" TEXT DEFAULT 'en',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skill_relations" (
    "id" SERIAL NOT NULL,
    "source_skill_id" INTEGER NOT NULL,
    "target_skill_id" INTEGER NOT NULL,
    "relation_type" "public"."SkillRelationType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "bidirectional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skill_clusters" (
    "id" SERIAL NOT NULL,
    "cluster_name" TEXT NOT NULL,
    "description" TEXT,
    "clusterType" TEXT NOT NULL DEFAULT 'THEMATIC',
    "embedding" vector,
    "embedding_model" TEXT,
    "embedding_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skill_cluster_members" (
    "id" SERIAL NOT NULL,
    "cluster_id" INTEGER NOT NULL,
    "skill_taxonomy_id" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_core_skill" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "skill_cluster_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skill_ontology_versions" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "esco_version" TEXT,
    "onet_version" TEXT,
    "description" TEXT,
    "skill_count" INTEGER NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_ontology_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_endorsements_profile_skill_id_idx" ON "public"."skill_endorsements"("profile_skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_endorsements_profile_skill_id_endorsed_by_key" ON "public"."skill_endorsements"("profile_skill_id", "endorsed_by");

-- CreateIndex
CREATE INDEX "skill_synonyms_normalized_form_idx" ON "public"."skill_synonyms"("normalized_form");

-- CreateIndex
CREATE INDEX "skill_synonyms_skill_taxonomy_id_idx" ON "public"."skill_synonyms"("skill_taxonomy_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_synonyms_skill_taxonomy_id_normalized_form_key" ON "public"."skill_synonyms"("skill_taxonomy_id", "normalized_form");

-- CreateIndex
CREATE INDEX "skill_relations_source_skill_id_idx" ON "public"."skill_relations"("source_skill_id");

-- CreateIndex
CREATE INDEX "skill_relations_target_skill_id_idx" ON "public"."skill_relations"("target_skill_id");

-- CreateIndex
CREATE INDEX "skill_relations_relation_type_idx" ON "public"."skill_relations"("relation_type");

-- CreateIndex
CREATE INDEX "skill_relations_strength_idx" ON "public"."skill_relations"("strength");

-- CreateIndex
CREATE UNIQUE INDEX "skill_relations_source_skill_id_target_skill_id_relation_ty_key" ON "public"."skill_relations"("source_skill_id", "target_skill_id", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "skill_clusters_cluster_name_key" ON "public"."skill_clusters"("cluster_name");

-- CreateIndex
CREATE INDEX "skill_clusters_clusterType_idx" ON "public"."skill_clusters"("clusterType");

-- CreateIndex
CREATE INDEX "skill_cluster_members_cluster_id_idx" ON "public"."skill_cluster_members"("cluster_id");

-- CreateIndex
CREATE INDEX "skill_cluster_members_skill_taxonomy_id_idx" ON "public"."skill_cluster_members"("skill_taxonomy_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_cluster_members_cluster_id_skill_taxonomy_id_key" ON "public"."skill_cluster_members"("cluster_id", "skill_taxonomy_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_ontology_versions_version_key" ON "public"."skill_ontology_versions"("version");

-- CreateIndex
CREATE INDEX "skill_ontology_versions_is_active_idx" ON "public"."skill_ontology_versions"("is_active");

-- CreateIndex
CREATE INDEX "candidate_embeddings_version_idx" ON "public"."candidate_embeddings"("version");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_embeddings_candidate_id_type_job_id_version_key" ON "public"."candidate_embeddings"("candidate_id", "type", "job_id", "version");

-- CreateIndex
CREATE INDEX "job_embeddings_version_idx" ON "public"."job_embeddings"("version");

-- CreateIndex
CREATE UNIQUE INDEX "job_embeddings_job_id_type_version_key" ON "public"."job_embeddings"("job_id", "type", "version");

-- CreateIndex
CREATE INDEX "job_required_skills_confidence_idx" ON "public"."job_required_skills"("confidence");

-- CreateIndex
CREATE INDEX "profile_skills_verified_idx" ON "public"."profile_skills"("verified");

-- CreateIndex
CREATE INDEX "profile_skills_last_used_at_idx" ON "public"."profile_skills"("last_used_at");

-- CreateIndex
CREATE UNIQUE INDEX "skill_taxonomy_skill_code_key" ON "public"."skill_taxonomy"("skill_code");

-- CreateIndex
CREATE UNIQUE INDEX "skill_taxonomy_esco_uri_key" ON "public"."skill_taxonomy"("esco_uri");

-- CreateIndex
CREATE INDEX "skill_taxonomy_parent_id_idx" ON "public"."skill_taxonomy"("parent_id");

-- CreateIndex
CREATE INDEX "skill_taxonomy_category_idx" ON "public"."skill_taxonomy"("category");

-- CreateIndex
CREATE INDEX "skill_taxonomy_status_idx" ON "public"."skill_taxonomy"("status");

-- CreateIndex
CREATE INDEX "skill_taxonomy_hierarchy_path_idx" ON "public"."skill_taxonomy"("hierarchy_path");

-- CreateIndex
CREATE INDEX "skill_taxonomy_esco_uri_idx" ON "public"."skill_taxonomy"("esco_uri");

-- CreateIndex
CREATE INDEX "skill_taxonomy_onet_code_idx" ON "public"."skill_taxonomy"("onet_code");

-- CreateIndex
CREATE INDEX "skill_taxonomy_demand_score_idx" ON "public"."skill_taxonomy"("demand_score");

-- AddForeignKey
ALTER TABLE "public"."skill_endorsements" ADD CONSTRAINT "skill_endorsements_profile_skill_id_fkey" FOREIGN KEY ("profile_skill_id") REFERENCES "public"."profile_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_taxonomy" ADD CONSTRAINT "skill_taxonomy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."skill_taxonomy" ADD CONSTRAINT "skill_taxonomy_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."skill_synonyms" ADD CONSTRAINT "skill_synonyms_skill_taxonomy_id_fkey" FOREIGN KEY ("skill_taxonomy_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_relations" ADD CONSTRAINT "skill_relations_source_skill_id_fkey" FOREIGN KEY ("source_skill_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_relations" ADD CONSTRAINT "skill_relations_target_skill_id_fkey" FOREIGN KEY ("target_skill_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_cluster_members" ADD CONSTRAINT "skill_cluster_members_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."skill_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_cluster_members" ADD CONSTRAINT "skill_cluster_members_skill_taxonomy_id_fkey" FOREIGN KEY ("skill_taxonomy_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
