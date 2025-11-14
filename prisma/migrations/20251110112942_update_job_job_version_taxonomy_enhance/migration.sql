/*
  Warnings:

  - The `type` column on the `jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `skill_weight` on the `skill_taxonomy` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'FILLED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "public"."RoleType" AS ENUM ('INDIVIDUAL_CONTRIBUTOR', 'TEAM_LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL');

-- CreateEnum
CREATE TYPE "public"."SeniorityLevel" AS ENUM ('INTERN', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'STAFF', 'PRINCIPAL', 'DISTINGUISHED');

-- CreateEnum
CREATE TYPE "public"."SkillImportance" AS ENUM ('CRITICAL', 'REQUIRED', 'PREFERRED', 'BONUS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."SkillType" ADD VALUE 'DOMAIN';
ALTER TYPE "public"."SkillType" ADD VALUE 'TOOL';
ALTER TYPE "public"."SkillType" ADD VALUE 'CERTIFICATION';
ALTER TYPE "public"."SkillType" ADD VALUE 'LANGUAGE';

-- AlterTable
ALTER TABLE "public"."job_versions" ADD COLUMN     "change_note" TEXT,
ADD COLUMN     "change_type" TEXT,
ADD COLUMN     "changed_by" INTEGER;

-- AlterTable
ALTER TABLE "public"."jobs" ADD COLUMN     "application_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "filled_at" TIMESTAMP(3),
ADD COLUMN     "hybrid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_experience" INTEGER,
ADD COLUMN     "min_experience" INTEGER,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "role_type" "public"."RoleType" NOT NULL DEFAULT 'INDIVIDUAL_CONTRIBUTOR',
ADD COLUMN     "seniority_level" "public"."SeniorityLevel" NOT NULL DEFAULT 'MID_LEVEL',
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "type",
ADD COLUMN     "type" "public"."JobType" NOT NULL DEFAULT 'FULL_TIME',
DROP COLUMN "status",
ADD COLUMN     "status" "public"."JobStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "public"."skill_taxonomy" DROP COLUMN "skill_weight",
ADD COLUMN     "base_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "embedding_dimension" INTEGER DEFAULT 768,
ADD COLUMN     "leadership_role_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
ADD COLUMN     "role_relevance" JSONB,
ADD COLUMN     "skill_type" "public"."SkillType" NOT NULL DEFAULT 'TECHNICAL',
ADD COLUMN     "technical_role_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.8;

-- CreateTable
CREATE TABLE "public"."job_required_skills" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "skill_taxonomy_id" INTEGER NOT NULL,
    "importance" "public"."SkillImportance" NOT NULL DEFAULT 'REQUIRED',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "years_required" INTEGER,
    "proficiency_required" "public"."ProficiencyLevel",
    "source" TEXT NOT NULL DEFAULT 'JD_PARSING',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "match_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_required_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_required_skills_job_id_idx" ON "public"."job_required_skills"("job_id");

-- CreateIndex
CREATE INDEX "job_required_skills_skill_taxonomy_id_idx" ON "public"."job_required_skills"("skill_taxonomy_id");

-- CreateIndex
CREATE INDEX "job_required_skills_importance_idx" ON "public"."job_required_skills"("importance");

-- CreateIndex
CREATE UNIQUE INDEX "job_required_skills_job_id_skill_taxonomy_id_key" ON "public"."job_required_skills"("job_id", "skill_taxonomy_id");

-- CreateIndex
CREATE INDEX "job_versions_job_id_idx" ON "public"."job_versions"("job_id");

-- CreateIndex
CREATE INDEX "jobs_org_id_idx" ON "public"."jobs"("org_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "public"."jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_type_idx" ON "public"."jobs"("type");

-- CreateIndex
CREATE INDEX "jobs_role_type_idx" ON "public"."jobs"("role_type");

-- CreateIndex
CREATE INDEX "jobs_seniority_level_idx" ON "public"."jobs"("seniority_level");

-- CreateIndex
CREATE INDEX "jobs_created_by_idx" ON "public"."jobs"("created_by");

-- CreateIndex
CREATE INDEX "jobs_published_at_idx" ON "public"."jobs"("published_at");

-- CreateIndex
CREATE INDEX "jobs_expires_at_idx" ON "public"."jobs"("expires_at");

-- CreateIndex
CREATE INDEX "skill_taxonomy_skill_type_idx" ON "public"."skill_taxonomy"("skill_type");

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_required_skills" ADD CONSTRAINT "job_required_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_required_skills" ADD CONSTRAINT "job_required_skills_skill_taxonomy_id_fkey" FOREIGN KEY ("skill_taxonomy_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_versions" ADD CONSTRAINT "job_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_embeddings" ADD CONSTRAINT "job_embeddings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
