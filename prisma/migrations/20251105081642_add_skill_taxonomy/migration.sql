-- CreateTable
CREATE TABLE "public"."skill_taxonomy" (
    "id" SERIAL NOT NULL,
    "skill_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "parent_skill" TEXT,
    "skill_level" INTEGER NOT NULL,
    "synonyms" JSONB,
    "related_skills" JSONB,
    "specializations" JSONB,
    "industry_relevance" JSONB,
    "skill_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."non_taxonomy_skills" (
    "id" SERIAL NOT NULL,
    "skill_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" INTEGER,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_taxonomy_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_taxonomy_normalized_name_key" ON "public"."skill_taxonomy"("normalized_name");

-- CreateIndex
CREATE INDEX "skill_taxonomy_normalized_name_idx" ON "public"."skill_taxonomy"("normalized_name");

-- CreateIndex
CREATE INDEX "skill_taxonomy_skill_level_idx" ON "public"."skill_taxonomy"("skill_level");

-- CreateIndex
CREATE INDEX "skill_taxonomy_parent_skill_idx" ON "public"."skill_taxonomy"("parent_skill");

-- CreateIndex
CREATE INDEX "non_taxonomy_skills_normalized_name_idx" ON "public"."non_taxonomy_skills"("normalized_name");

-- CreateIndex
CREATE INDEX "non_taxonomy_skills_reviewed_idx" ON "public"."non_taxonomy_skills"("reviewed");

-- CreateIndex
CREATE UNIQUE INDEX "non_taxonomy_skills_normalized_name_source_source_id_key" ON "public"."non_taxonomy_skills"("normalized_name", "source", "source_id");
