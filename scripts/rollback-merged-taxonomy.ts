/**
 * Rollback merged taxonomy skills
 *
 * Uses merge-report.csv to reverse the merge:
 *  - Restore duplicate skills to ACTIVE
 *  - Move synonyms back to duplicate
 *  - Move profileSkills back
 *  - Move jobRequiredSkills back
 *  - Restore relations
 *  - Restore parentId
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({ log: ["error", "warn"] });

type MergeRow = {
  canonical: number;
  duplicate: number;
  normalized: string;
};

function loadMergeReport(): MergeRow[] {
  const filePath = path.join(process.cwd(), "merge-report.csv");
  if (!fs.existsSync(filePath)) throw new Error("merge-report.csv not found");

  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  const rows: MergeRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const [canonicalStr, dupStr, normalized] = lines[i]
      .split(",")
      .map((x) => x.trim());

    if (!canonicalStr || !dupStr) continue;

    rows.push({
      canonical: Number(canonicalStr),
      duplicate: Number(dupStr),
      normalized,
    });
  }

  return rows;
}

async function rollbackSkill(canonicalId: number, duplicateId: number) {
  console.log(`🔄 Rolling back: ${duplicateId} ⬅ canonical ${canonicalId}`);

  /* ----------------- 1. Restore duplicate skill ------------------ */
  await prisma.skillTaxonomy.update({
    where: { id: duplicateId },
    data: {
      status: "ACTIVE",
      mergedIntoId: null,
    },
  });

  /* ----------------- 2. Move synonyms back ------------------ */
  const syns = await prisma.skillSynonym.findMany({
    where: { skillTaxonomyId: canonicalId },
  });

  for (const syn of syns) {
    // The original belongs to duplicate if synonym text contains duplicateId or was a conflict
    if (syn.synonym.includes(`${duplicateId}`)) {
      await prisma.skillSynonym.update({
        where: { id: syn.id },
        data: { skillTaxonomyId: duplicateId },
      });
    }
  }

  /* ----------------- 3. Move profile skills back ------------------ */
  await prisma.profileSkill.updateMany({
    where: { skillTaxonomyId: canonicalId },
    data: { skillTaxonomyId: duplicateId },
  });

  /* ----------------- 4. Move job required skills back ------------------ */
  await prisma.jobRequiredSkill.updateMany({
    where: { skillTaxonomyId: canonicalId },
    data: { skillTaxonomyId: duplicateId },
  });

  /* ----------------- 5. Restore relations ------------------ */
  const srcRels = await prisma.skillRelation.findMany({
    where: { sourceSkillId: canonicalId },
  });

  for (const rel of srcRels) {
    if (rel.strength === 0.5) {
      await prisma.skillRelation.update({
        where: { id: rel.id },
        data: { sourceSkillId: duplicateId },
      });
    }
  }

  const tgtRels = await prisma.skillRelation.findMany({
    where: { targetSkillId: canonicalId },
  });

  for (const rel of tgtRels) {
    if (rel.strength === 0.5) {
      await prisma.skillRelation.update({
        where: { id: rel.id },
        data: { targetSkillId: duplicateId },
      });
    }
  }

  /* ----------------- 6. Restore children ------------------ */
  await prisma.skillTaxonomy.updateMany({
    where: { parentId: canonicalId },
    data: { parentId: duplicateId },
  });
}

async function main() {
  console.log("=== ROLLBACK STARTING ===");

  const rows = loadMergeReport();
  console.log(`Loaded ${rows.length} merged entries`);

  for (const r of rows) {
    await prisma.$transaction(async () => {
      await rollbackSkill(r.canonical, r.duplicate);
    });
  }

  console.log("🎉 ALL MERGES SUCCESSFULLY ROLLED BACK!");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ ROLLBACK ERROR:", err);
  await prisma.$disconnect();
  process.exit(1);
});
