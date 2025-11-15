/**
 * normalize-taxonomy-category.ts
 *
 * Safe normalization using skillName + category
 *
 * Usage:
 *   npx ts-node scripts/normalize-taxonomy-category.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({ log: ["warn", "error"] });

/* ------------------- NORMALIZATION FUNCTION ------------------- */
function normalizeText(input: string): string {
  if (!input) return "";

  let s = input.toLowerCase();

  s = s.replace(/&/g, " and ");
  s = s.replace(/\+/g, " plus ");
  s = s.replace(/[./,–—-]/g, " ");
  s = s.replace(/\s+/g, "_");
  s = s.replace(/[^a-z0-9_]/g, "");
  s = s.replace(/_+/g, "_");
  s = s.replace(/^_+|_+$/g, "");

  return s;
}

function buildNormalizedName(skillName: string, category: string | null | undefined): string {
  if (category) {
    return normalizeText(`${skillName}_${category}`);
  }
  return normalizeText(skillName);
}

/* ------------------- MAIN SCRIPT ------------------- */
async function main() {
  console.log("=== START CATEGORY-BASED NORMALIZATION ===");

  /* -------------------------------------------------------
   * STEP 1: LOAD ALL SKILLS
   * ----------------------------------------------------- */
  console.log("🔍 Fetching taxonomy skills...");
  const skills = await prisma.skillTaxonomy.findMany({
    select: {
      id: true,
      skillName: true,
      category: true,
      normalizedName: true,
    },
  });

  console.log(`📦 Loaded ${skills.length} skills`);

  const taxonomyUpdates: { id: number; old: string; next: string }[] = [];
  const normalizedUsed = new Set<string>();

  // Track existing normalizedNames to avoid duplicates
  for (const s of skills) {
    if (s.normalizedName) normalizedUsed.add(s.normalizedName);
  }

  /* -------------------------------------------------------
   * STEP 2: Generate new normalized names
   * ----------------------------------------------------- */
  for (const s of skills) {
    let next = buildNormalizedName(s.skillName, s.category);

    // enforce uniqueness
    if (normalizedUsed.has(next) && next !== s.normalizedName) {
      let counter = 1;
      const base = next;
      while (normalizedUsed.has(next)) {
        next = `${base}_${counter++}`;
      }
    }

    normalizedUsed.add(next);

    if (next !== s.normalizedName) {
      taxonomyUpdates.push({
        id: s.id,
        old: s.normalizedName || "",
        next,
      });
    }
  }

  console.log(`🔁 Taxonomy rows needing update: ${taxonomyUpdates.length}`);

  /* -------------------------------------------------------
   * STEP 3: Apply taxonomy updates
   * ----------------------------------------------------- */
  let updatedTax = 0;

  for (const u of taxonomyUpdates) {
    try {
      await prisma.skillTaxonomy.update({
        where: { id: u.id },
        data: {
          normalizedName: u.next,
          needsEmbeddingUpdate: true,
        },
      });

      updatedTax++;
      if (updatedTax % 300 === 0) {
        console.log(`  • updated ${updatedTax} skills`);
      }
    } catch (err) {
      console.error(`❌ Failed updating taxonomy ID ${u.id}:`, err);
    }
  }

  /* -------------------------------------------------------
   * STEP 4: Update synonyms
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
        await prisma.skillSynonym.update({
          where: { id: syn.id },
          data: { normalizedForm: candidate },
        });
      } catch (err) {
        console.error(`❌ Synonym update failed (${syn.id}):`, err);
      }
    }
  }

  /* -------------------------------------------------------
   * DONE
   * ----------------------------------------------------- */

  console.log("=== SUMMARY ===");
  console.log(`✔ Updated taxonomy rows: ${updatedTax}`);
  console.log(`✔ Synonyms processed: ${synonyms.length}`);
  console.log("=== CATEGORY-BASED NORMALIZATION COMPLETE ===");

  await prisma.$disconnect();
}

/* ------------------- RUN SCRIPT ------------------- */
main().catch(async (err) => {
  console.error("❌ Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
