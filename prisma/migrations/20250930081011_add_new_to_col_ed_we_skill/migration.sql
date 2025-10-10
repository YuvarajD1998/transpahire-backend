-- DropIndex
DROP INDEX "public"."educations_profile_id_idx";

-- DropIndex
DROP INDEX "public"."work_experiences_profile_id_idx";

-- AlterTable
ALTER TABLE "public"."educations" ADD COLUMN     "resume_id" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'AI_EXTRACTED';

-- AlterTable
ALTER TABLE "public"."work_experiences" ADD COLUMN     "resume_id" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'AI_EXTRACTED';

-- CreateIndex
CREATE INDEX "educations_resume_id_idx" ON "public"."educations"("resume_id");

-- CreateIndex
CREATE INDEX "work_experiences_resume_id_idx" ON "public"."work_experiences"("resume_id");

-- AddForeignKey
ALTER TABLE "public"."work_experiences" ADD CONSTRAINT "work_experiences_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."educations" ADD CONSTRAINT "educations_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
