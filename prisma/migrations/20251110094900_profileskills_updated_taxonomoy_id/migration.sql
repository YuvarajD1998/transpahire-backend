-- AlterTable
ALTER TABLE "public"."profile_skills" ADD COLUMN     "skill_taxonomy_id" INTEGER;

-- CreateIndex
CREATE INDEX "profile_skills_skill_taxonomy_id_idx" ON "public"."profile_skills"("skill_taxonomy_id");

-- AddForeignKey
ALTER TABLE "public"."profile_skills" ADD CONSTRAINT "profile_skills_skill_taxonomy_id_fkey" FOREIGN KEY ("skill_taxonomy_id") REFERENCES "public"."skill_taxonomy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
