/**
 * normalize-taxonomy-and-synonyms-safe.ts
 *
 * Usage:
 *  npx ts-node scripts/normalize-taxonomy-and-synonyms-safe.ts
 *  npx ts-node scripts/normalize-taxonomy-and-synonyms-safe.ts --auto-resolve
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({ log: ["warn", "error"] });

/* ------------------- NORMALIZATION FUNCTION ------------------- */
function normalizeText(name: string): string {
  if (!name) return "";

  let s = name.toLowerCase();

  s = s.replace(/&/g, " and ");
  s = s.replace(/\+/g, " plus ");
  s = s.replace(/[./,–—-]/g, " ");
  s = s.replace(/\s+/g, "_");
  s = s.replace(/[^a-z0-9_]/g, "");
  s = s.replace(/_+/g, "_");
  s = s.replace(/^_+|_+$/g, "");

  return s;
}

/* ------------------- MAIN SCRIPT ------------------- */
async function main() {
  const autoResolve = process.argv.includes("--auto-resolve");

  console.log("=== START NORMALIZATION (SAFE MODE) ===");
  console.log("Auto-resolve:", autoResolve);

  /* -------------------------------------------------------
   * STEP 1: LOAD TAXONOMY SKILLS
   * ----------------------------------------------------- */
  console.log("🔍 Fetching taxonomy skills...");
  const skills = await prisma.skillTaxonomy.findMany({
    select: { id: true, skillName: true, normalizedName: true },
  });

  console.log(`📦 Loaded ${skills.length} skills`);

  /* -------------------------------------------------------
   * STEP 2: REGENERATE NORMALIZED NAME + DETECT COLLISIONS
   * ----------------------------------------------------- */

  const regenMap = new Map<number, string>(); // id -> regenerated
  const normalizedToIds = new Map<string, number[]>(); // regenerated -> ids[]

  for (const s of skills) {
    const regen = normalizeText(s.skillName);
    regenMap.set(s.id, regen);

    const arr = normalizedToIds.get(regen) || [];
    arr.push(s.id);
    normalizedToIds.set(regen, arr);
  }

  const collisionGroups: { normalized: string; ids: number[] }[] = [];
  for (const [norm, ids] of normalizedToIds.entries()) {
    if (ids.length > 1) {
      collisionGroups.push({ normalized: norm, ids });
    }
  }

  console.log(`🔎 Collisions found: ${collisionGroups.length}`);

  // Write collisions to CSV
  const collisionsFile = path.join(process.cwd(), "collisions-for-review.csv");
  const collisionRows = ["normalized,ids"];
  for (const c of collisionGroups) {
    collisionRows.push(`"${c.normalized}","${c.ids.join("|")}"`);
  }
  fs.writeFileSync(collisionsFile, collisionRows.join("\n"));
  console.log(`📄 Collision report: ${collisionsFile}`);

  /* -------------------------------------------------------
   * STEP 3: BUILD FINAL NORMALIZED VALUES
   * ----------------------------------------------------- */

  const usedNormalized = new Set<string>();
  for (const s of skills) usedNormalized.add(s.normalizedName);

  type TaxUpdateItem = { id: number; old: string; next: string };
  const taxonomyUpdates: TaxUpdateItem[] = [];

  for (const s of skills) {
    const regen = regenMap.get(s.id)!;
    const ids = normalizedToIds.get(regen) || [];

    let finalName = regen;

    if (ids.length > 1) {
      if (!autoResolve) {
        // Skip this update; collision will be manually reviewed.
        continue;
      } else {
        // Auto-resolve collision: append ID
        finalName = `${regen}_${s.id}`;
        let counter = 1;
        while (usedNormalized.has(finalName)) {
          finalName = `${regen}_${s.id}_${counter++}`;
        }
      }
    }

    if (finalName !== s.normalizedName) {
      taxonomyUpdates.push({ id: s.id, old: s.normalizedName, next: finalName });
      usedNormalized.add(finalName);
    }
  }

  console.log(`🔁 Taxonomy rows needing update: ${taxonomyUpdates.length}`);

  /* -------------------------------------------------------
   * STEP 4: APPLY TAXONOMY UPDATES
   * ----------------------------------------------------- */

  let updatedTax = 0;

  for (const item of taxonomyUpdates) {
    try {
      console.log(`📝 Updating SkillTaxonomy[${item.id}]: ${item.old} → ${item.next}`);
      await prisma.skillTaxonomy.update({
        where: { id: item.id },
        data: {
          normalizedName: item.next,
          needsEmbeddingUpdate: true,
        },
      });
      updatedTax++;
      if (updatedTax % 300 === 0) {
        console.log(`  • Updated ${updatedTax} taxonomy rows...`);
      }
    } catch (err) {
      console.error(`❌ Error updating taxonomy ID ${item.id}:`, err);
    }
  }

  /* -------------------------------------------------------
   * STEP 5: PROCESS SYNONYMS
   * ----------------------------------------------------- */

  console.log("🔍 Fetching synonyms...");
  const synonyms = await prisma.skillSynonym.findMany({
    select: {
      id: true,
      synonym: true,
      normalizedForm: true,
      skillTaxonomyId: true,
    },
  });

  console.log(`📦 Loaded ${synonyms.length} synonyms`);

  const perSkillSet = new Map<number, Set<string>>();

  for (const syn of synonyms) {
    const regen = normalizeText(syn.synonym);

    const set = perSkillSet.get(syn.skillTaxonomyId) || new Set<string>();

    let candidate = regen;
    if (set.has(candidate)) {
      candidate = `${regen}_${syn.id}`;
    }

    set.add(candidate);
    perSkillSet.set(syn.skillTaxonomyId, set);

    if (candidate !== syn.normalizedForm) {
      try {
        console.log(
          `📝 Synonym Update [${syn.id}]: ${syn.normalizedForm} → ${candidate}`
        );
        await prisma.skillSynonym.update({
          where: { id: syn.id },
          data: { normalizedForm: candidate },
        });
      } catch (err) {
        console.error(`❌ Error updating synonym ID ${syn.id}:`, err);
      }
    }
  }

  /* -------------------------------------------------------
   * DONE
   * ----------------------------------------------------- */

  console.log("=== SUMMARY ===");
  console.log(`✔ Taxonomy updated: ${updatedTax}`);
  console.log(`✔ Synonyms processed: ${synonyms.length}`);
  console.log(`✔ Collisions logged at: ${collisionsFile}`);
  console.log("=== NORMALIZATION COMPLETE ===");

  await prisma.$disconnect();
}

/* ------------------- RUN SCRIPT ------------------- */
main().catch(async (err) => {
  console.error("❌ Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
