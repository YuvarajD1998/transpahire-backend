-- CreateEnum
CREATE TYPE "public"."ParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."SkillSource" AS ENUM ('MANUAL', 'AI_EXTRACTED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "public"."ProficiencyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "privacy_mode" "public"."PrivacyMode" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "profile_completeness" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."resumes" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mimetype" TEXT NOT NULL,
    "parse_status" "public"."ParseStatus" NOT NULL DEFAULT 'PENDING',
    "confidence_score" DOUBLE PRECISION,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "parsed_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resume_critiques" (
    "id" SERIAL NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "sections" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_critiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."profile_skills" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "skill_name" TEXT NOT NULL,
    "category" TEXT,
    "proficiency_level" "public"."ProficiencyLevel",
    "years_experience" INTEGER,
    "source" "public"."SkillSource" NOT NULL DEFAULT 'AI_EXTRACTED',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_experiences" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "location" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "achievements" JSONB,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."educations" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "field" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "grade" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resumes_profile_id_is_primary_idx" ON "public"."resumes"("profile_id", "is_primary");

-- CreateIndex
CREATE INDEX "resumes_parse_status_idx" ON "public"."resumes"("parse_status");

-- CreateIndex
CREATE INDEX "profile_skills_profile_id_idx" ON "public"."profile_skills"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_skills_profile_id_skill_name_key" ON "public"."profile_skills"("profile_id", "skill_name");

-- CreateIndex
CREATE INDEX "work_experiences_profile_id_idx" ON "public"."work_experiences"("profile_id");

-- CreateIndex
CREATE INDEX "educations_profile_id_idx" ON "public"."educations"("profile_id");

-- AddForeignKey
ALTER TABLE "public"."resumes" ADD CONSTRAINT "resumes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resume_critiques" ADD CONSTRAINT "resume_critiques_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."profile_skills" ADD CONSTRAINT "profile_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_experiences" ADD CONSTRAINT "work_experiences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."educations" ADD CONSTRAINT "educations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
