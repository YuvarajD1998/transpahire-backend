-- CreateEnum
CREATE TYPE "public"."SkillType" AS ENUM ('TECHNICAL', 'SOFT');

-- AlterTable
ALTER TABLE "public"."profile_skills" ADD COLUMN     "skill_type" "public"."SkillType" NOT NULL DEFAULT 'TECHNICAL';
