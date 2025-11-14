/*
  Warnings:

  - You are about to drop the column `clusterType` on the `skill_clusters` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."skill_clusters_clusterType_idx";

-- AlterTable
ALTER TABLE "public"."skill_clusters" DROP COLUMN "clusterType",
ADD COLUMN     "cluster_type" TEXT NOT NULL DEFAULT 'THEMATIC';

-- CreateIndex
CREATE INDEX "skill_clusters_cluster_type_idx" ON "public"."skill_clusters"("cluster_type");
