/**
 * normalize-taxonomy-and-synonyms-safe.ts
 *
 * Regenerates normalizedName for ALL skills.
 * Appends stable hash for duplicates.
 *
 * Usage:
 *  npx ts-node scripts/normalize-taxonomy-and-synonyms-safe.ts
 *  npx ts-node scripts/normalize-taxonomy-and-synonyms-safe.ts --auto
 */

import { PrismaClient } from "@prisma/client";
import * as murmur from "murmurhash3js";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({ log: ["warn", "error"] });

/* ------------------- NORMALIZE TEXT ------------------- */
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

/* ------------------- HASH BUILDER ------------------- */
function buildHash(skill: any): string {
  const ctx = [
    skill.skillType ?? "",
    skill.category ?? "",
    skill.subcategory ?? "",
    skill.skillName ?? ""
  ].join("|");

  const h = murmur.x86.hash32(ctx).toString(16);
  return h.slice(0, 7); // 7-char stable hash
}

/* ------------------- MAIN SCRIPT ------------------- */
async function main() {
  console.log("=== START FULL NORMALIZATION (HASH-BASED) ===");

  const auto = process.argv.includes("--auto");

  /* ------------------- LOAD SKILLS ------------------- */
  console.log("🔍 Fetching taxonomy skills...");

  const skills = await prisma.skillTaxonomy.findMany({
    select: {
      id: true,
      skillName: true,
      normalizedName: true,
      skillType: true,
      category: true,
      subcategory: true,
    },
  });

  console.log(`📦 Loaded ${skills.length} skills.`);

  /* ------------------- STEP 1: Generate base normalized names ------------------- */
  const baseMap = new Map<number, string>();
  const buckets = new Map<string, number[]>(); // base_normalized → [ids]

  for (const sk of skills) {
    const base = normalizeText(sk.skillName);
    baseMap.set(sk.id, base);

    const arr = buckets.get(base) || [];
    arr.push(sk.id);
    buckets.set(base, arr);
  }

  /* ------------------- STEP 2: Identify duplicates ------------------- */
  const duplicates: { base: string; ids: number[] }[] = [];
  for (const [base, ids] of buckets.entries()) {
    if (ids.length > 1) {
      duplicates.push({ base, ids });
    }
  }

  console.log(`⚠ Found ${duplicates.length} duplicate groups.`);

  const collisionsFile = path.join(process.cwd(), "normalized-collisions.csv");
  const rows = ["base_normalized,ids"];
  for (const d of duplicates) rows.push(`"${d.base}","${d.ids.join("|")}"`);
  fs.writeFileSync(collisionsFile, rows.join("\n"));
  console.log(`📄 Collision CSV generated: ${collisionsFile}`);

  /* ------------------- STEP 3: Build final normalizedName ------------------- */
  const finalUpdates: { id: number; final: string; old: string }[] = [];
  const used = new Set<string>();

  for (const sk of skills) used.add(sk.normalizedName);

  for (const sk of skills) {
    const base = baseMap.get(sk.id)!;
    const isDup = (buckets.get(base) || []).length > 1;

    let finalNorm = base;

    if (isDup) {
      if (!auto) continue; // manual review mode

      const hash = buildHash(sk);
      finalNorm = `${base}__${hash}`;

      while (used.has(finalNorm)) {
        finalNorm = `${finalNorm}_${Math.floor(Math.random() * 1000)}`;
      }
    }

    if (finalNorm !== sk.normalizedName) {
      finalUpdates.push({
        id: sk.id,
        old: sk.normalizedName,
        final: finalNorm,
      });
      used.add(finalNorm);
    }
  }

  console.log(`🔁 Taxonomy skills needing update: ${finalUpdates.length}`);

  /* ------------------- STEP 4: Apply updates ------------------- */
  let updated = 0;

  for (const upd of finalUpdates) {
    console.log(`📝 Updating Skill[${upd.id}]: ${upd.old} → ${upd.final}`);

    await prisma.skillTaxonomy.update({
      where: { id: upd.id },
      data: {
        normalizedName: upd.final,
        needsEmbeddingUpdate: true,
      },
    });

    updated++;
    if (updated % 300 === 0) {
      console.log(`  • ${updated} updates applied...`);
    }
  }

  /* ------------------- STEP 5: Normalize synonyms ------------------- */
  console.log("🔍 Normalizing synonyms...");

  const synonyms = await prisma.skillSynonym.findMany({
    select: {
      id: true,
      synonym: true,
      normalizedForm: true,
      skillTaxonomyId: true,
    },
  });

  const perSkill = new Map<number, Set<string>>();

  for (const syn of synonyms) {
    const regen = normalizeText(syn.synonym);
    const set = perSkill.get(syn.skillTaxonomyId) || new Set<string>();

    let candidate = regen;
    if (set.has(candidate)) candidate = `${regen}_${syn.id}`;

    set.add(candidate);
    perSkill.set(syn.skillTaxonomyId, set);

    if (candidate !== syn.normalizedForm) {
      console.log(`📝 Synonym[${syn.id}]: ${syn.normalizedForm} → ${candidate}`);
      await prisma.skillSynonym.update({
        where: { id: syn.id },
        data: { normalizedForm: candidate },
      });
    }
  }

  /* ------------------- DONE ------------------- */
  console.log("=== SUMMARY ===");
  console.log(`✔ Taxonomy updated: ${updated}`);
  console.log(`✔ Synonyms processed: ${synonyms.length}`);
  console.log(`✔ Collisions: ${duplicates.length}`);
  console.log("=== NORMALIZATION COMPLETE ===");

  await prisma.$disconnect();
}

/* ------------------- EXEC ------------------- */
main().catch(async (err) => {
  console.error("❌ Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
