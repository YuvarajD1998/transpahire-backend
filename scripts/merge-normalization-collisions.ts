/**
 * merge-normalization-collisions.ts
 *
 * Fully stable merge script with:
 *  - Synonym merging
 *  - ProfileSkill merging
 *  - JobRequiredSkill merging
 *  - SkillRelation safe merge (deduping)
 *  - Parent/child fix
 *  - Duplicate skill deprecation
 *
 * Usage:
 *  npx ts-node scripts/merge-normalization-collisions.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({ log: ["warn", "error"] });

type CollisionRow = {
  normalized: string;
  ids: number[];
};

/* --------------------------------------------------------
 * LOAD COLLISIONS
 * ------------------------------------------------------*/
function loadCollisions(): CollisionRow[] {
  const filePath = path.join(process.cwd(), "collisions-for-review.csv");

  if (!fs.existsSync(filePath)) {
    throw new Error("collisions-for-review.csv not found");
  }

  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");

  const list: CollisionRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const [normalized, idsStr] = lines[i]
      .split(",")
      .map((x) => x.replace(/"/g, ""));

    if (!normalized || !idsStr) continue;

    list.push({
      normalized,
      ids: idsStr.split("|").map(Number),
    });
  }

  return list;
}

/* --------------------------------------------------------
 * PICK CANONICAL SKILL
 * ------------------------------------------------------*/
async function pickCanonicalSkill(ids: number[]) {
  const rows = await prisma.skillTaxonomy.findMany({
    where: { id: { in: ids } },
    orderBy: [
      { demandScore: "desc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  return rows[0] || null;
}

/* --------------------------------------------------------
 * MERGE DUPLICATE → CANONICAL
 * ------------------------------------------------------*/
async function mergeSkill(duplicateId: number, canonicalId: number) {
  console.log(`🔁 Merging ${duplicateId} → ${canonicalId}`);

  /* ----------------- 1. MOVE SYNONYMS ------------------ */
/* ----------------- 1. MOVE SYNONYMS SAFELY ------------------ */

const dupSynonyms = await prisma.skillSynonym.findMany({
  where: { skillTaxonomyId: duplicateId },
});

for (const syn of dupSynonyms) {
  // Check if canonical already has this synonym
  const exists = await prisma.skillSynonym.findFirst({
    where: {
      skillTaxonomyId: canonicalId,
      normalizedForm: syn.normalizedForm,
    },
  });

  if (exists) {
    // Canonical has same synonym → delete duplicate
    await prisma.skillSynonym.delete({
      where: { id: syn.id },
    });
  } else {
    // Move synonym to canonical
    await prisma.skillSynonym.update({
      where: { id: syn.id },
      data: { skillTaxonomyId: canonicalId },
    });
  }
}


  /* ----------------- 2. PROFILE SKILLS ------------------ */
  await prisma.profileSkill.updateMany({
    where: { skillTaxonomyId: duplicateId },
    data: { skillTaxonomyId: canonicalId },
  });

  /* ----------------- 3. JOB REQUIRED SKILLS ------------ */
  await prisma.jobRequiredSkill.updateMany({
    where: { skillTaxonomyId: duplicateId },
    data: { skillTaxonomyId: canonicalId },
  });

  /* --------------------------------------------------------
   * 4. MERGE RELATIONS SAFELY (NO UNIQUE VIOLATIONS)
   * ------------------------------------------------------*/

  // 4A. SOURCE relations where duplicate is the source
  const sourceRels = await prisma.skillRelation.findMany({
    where: { sourceSkillId: duplicateId },
  });

  for (const rel of sourceRels) {
    const exists = await prisma.skillRelation.findFirst({
      where: {
        sourceSkillId: canonicalId,
        targetSkillId: rel.targetSkillId,
        relationType: rel.relationType,
      },
    });

    if (exists) {
      // duplicate relation → delete
      await prisma.skillRelation.delete({ where: { id: rel.id } });
    } else {
      // move to canonical
      await prisma.skillRelation.update({
        where: { id: rel.id },
        data: { sourceSkillId: canonicalId },
      });
    }
  }

  // 4B. TARGET relations where duplicate is the target
  const targetRels = await prisma.skillRelation.findMany({
    where: { targetSkillId: duplicateId },
  });

  for (const rel of targetRels) {
    const exists = await prisma.skillRelation.findFirst({
      where: {
        sourceSkillId: rel.sourceSkillId,
        targetSkillId: canonicalId,
        relationType: rel.relationType,
      },
    });

    if (exists) {
      await prisma.skillRelation.delete({ where: { id: rel.id } });
    } else {
      await prisma.skillRelation.update({
        where: { id: rel.id },
        data: { targetSkillId: canonicalId },
      });
    }
  }

  /* ----------------- 5. UPDATE CHILDREN ------------------ */
  await prisma.skillTaxonomy.updateMany({
    where: { parentId: duplicateId },
    data: { parentId: canonicalId },
  });

  /* ----------------- 6. DEPRECATE DUPLICATE -------------- */
  await prisma.skillTaxonomy.update({
    where: { id: duplicateId },
    data: {
      status: "DEPRECATED",
      mergedIntoId: canonicalId,
    },
  });
}

/* --------------------------------------------------------
 * MAIN RUN
 * ------------------------------------------------------*/
async function main() {
  console.log("=== START SKILL MERGE TOOL ===");

  const collisions = loadCollisions();
  console.log(`📦 Loaded ${collisions.length} collision groups`);

  const reportLines = ["canonical_id,merged_id,normalized"];

  for (const group of collisions) {
    if (group.ids.length <= 1) continue;

    const { normalized, ids } = group;

    console.log(`\n🔎 Group: ${normalized}`);
    console.log(`   Skills: ${ids.join(", ")}`);

    const canonical = await pickCanonicalSkill(ids);
    if (!canonical) continue;

    console.log(`⭐ Canonical: ${canonical.id} (${canonical.skillName})`);

    const duplicates = ids.filter((id) => id !== canonical.id);

    for (const dup of duplicates) {
      await prisma.$transaction(async () => {
        await mergeSkill(dup, canonical.id);
      });

      reportLines.push(`${canonical.id},${dup},${normalized}`);
    }
  }

  const reportPath = path.join(process.cwd(), "merge-report.csv");
  fs.writeFileSync(reportPath, reportLines.join("\n"));

  console.log(`\n📄 Merge report saved: ${reportPath}`);
  console.log("🎉 MERGE COMPLETE");

  await prisma.$disconnect();
}

/* --------------------------------------------------------
 * START
 * ------------------------------------------------------*/
main().catch(async (err) => {
  console.error("❌ Fatal merge error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
