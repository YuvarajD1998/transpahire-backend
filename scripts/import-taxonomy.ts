/**
 * import-taxonomy.ts
 *
 * Usage:
 *  ts-node import-taxonomy.ts ./enhanced_skills_taxonomy.csv
 *
 * Requirements:
 *  - Prisma client generated from your schema (import label below)
 *  - Install: npm i @prisma/client csv-parse fs-extra
 *
 * Notes:
 *  - This script uses two passes:
 *      1) Upsert SkillTaxonomy rows (no synonyms/relations)
 *      2) Create SkillSynonym and SkillRelation entries (resolves ids)
 *
 *  - SkillRelation creation expects related_skills to be an array of strings
 *    containing normalized_name or skill_name of the target. If target not found,
 *    relation is skipped (you can extend to create pending relations or NonTaxonomySkill).
 */

import { PrismaClient ,SkillType} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'] });

type CsvRow = {
  id?: string;
  skill_name?: string;
  normalized_name?: string;
  skill_code?: string;
  skill_type?: string;
  category?: string;
  subcategory?: string;
  parent_skill?: string | null;
  skill_level?: string;
  synonyms?: string;
  related_skills?: string;
  specializations?: string;
  base_weight?: string;
  technical_role_weight?: string;
  leadership_role_weight?: string;
  managerial_role_weight?: string;
  demand_score?: string;
  trending_score?: string;
  industry_relevance?: string;
  role_relevance?: string;
  esco_uri?: string;
  onet_code?: string;
  isco_code?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  source_file?: string;
};

async function importTaxonomy(csvFilePath: string) {
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📥 Found ${records.length} CSV rows`);

  // Map normalized_name -> prisma id
  const nameToId = new Map<string, number>();

  // First pass: upsert skills (without synonyms/relations)
  console.log("🔁 First pass: upserting skills (no synonyms/relations yet)...");
  let upserted = 0;
  for (const [idx, row] of records.entries()) {
    const normalized = (row.normalized_name || row.skill_name || '').trim().toLowerCase();
    if (!normalized) {
      console.warn(`Skipping row ${idx + 1} due to missing normalized_name/skill_name`);
      continue;
    }

    // parse numeric fields safely
    const skillLevel = row.skill_level ? parseInt(row.skill_level) : 0;
    const toFloat = (v?: string, fallback = 0.0) => {
      if (!v || v === '') return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const industryRelevance = row.industry_relevance ? JSON.parse(row.industry_relevance) : null;
    const roleRelevance = row.role_relevance ? JSON.parse(row.role_relevance) : null;

    try {
      // Upsert skillTaxonomy
      const upsertedSkill = await prisma.skillTaxonomy.upsert({
        where: { normalizedName: normalized },
        update: {
          skillName: row.skill_name || row.skill_name,
          skillCode: row.skill_code || undefined,
          skillType: (row.skill_type?.toUpperCase() as SkillType) || SkillType.TECHNICAL,
          category: row.category || undefined,
          subcategory: row.subcategory || undefined,
          skillLevel,
          baseWeight: toFloat(row.base_weight, 0.5),
          technicalRoleWeight: toFloat(row.technical_role_weight, 0.8),
          leadershipRoleWeight: toFloat(row.leadership_role_weight, 0.6),
          managerialRoleWeight: toFloat(row.managerial_role_weight, 0.7),
          demandScore: toFloat(row.demand_score, 0.5),
          trendingScore: toFloat(row.trending_score, 0.0),
          industryRelevance: industryRelevance || undefined,
          roleRelevance: roleRelevance || undefined,
          escoUri: row.esco_uri || undefined,
          onetCode: row.onet_code || undefined,
          iscoCode: row.isco_code || undefined,
          status: (row.status || 'ACTIVE') as any,
          updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
        },
        create: {
          skillName: row.skill_name || normalized,
          normalizedName: normalized,
          skillCode: row.skill_code || undefined,
          skillType: (row.skill_type?.toUpperCase() as SkillType) || SkillType.TECHNICAL,
          category: row.category || undefined,
          subcategory: row.subcategory || undefined,
          skillLevel,
          baseWeight: toFloat(row.base_weight, 0.5),
          technicalRoleWeight: toFloat(row.technical_role_weight, 0.8),
          leadershipRoleWeight: toFloat(row.leadership_role_weight, 0.6),
          managerialRoleWeight: toFloat(row.managerial_role_weight, 0.7),
          demandScore: toFloat(row.demand_score, 0.5),
          trendingScore: toFloat(row.trending_score, 0.0),
          industryRelevance: industryRelevance || undefined,
          roleRelevance: roleRelevance || undefined,
          escoUri: row.esco_uri || undefined,
          onetCode: row.onet_code || undefined,
          iscoCode: row.isco_code || undefined,
          status: (row.status || 'ACTIVE') as any,
          createdAt: row.created_at ? new Date(row.created_at) : undefined,
          updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        }
      });

      nameToId.set(normalized, upsertedSkill.id);
      upserted++;

      if (upserted % 500 === 0) console.log(`  • Upserted ${upserted} / ${records.length}`);
    } catch (err) {
      console.error(`Error upserting skill '${normalized}':`, err);
    }
  }

  console.log(`✅ Upsert pass complete. Upserted ${upserted} skills.`);

  // Second pass: create synonyms and relations and resolve parents
  console.log("🔁 Second pass: creating synonyms and relations and resolving parent links...");

  let synonymInserts = 0;
  let relationInserts = 0;
  let parentUpdates = 0;

  for (const [idx, row] of records.entries()) {
    const normalized = (row.normalized_name || row.skill_name || '').trim().toLowerCase();
    if (!normalized) continue;
    const sourceId = nameToId.get(normalized);
    if (!sourceId) continue;

    // 1) Synonyms
    try {
      if (row.synonyms) {
        const synArr: string[] = JSON.parse(row.synonyms);
        if (Array.isArray(synArr) && synArr.length > 0) {
          // prepare createMany payload
          const inserts = synArr.map(s => ({
            skillTaxonomyId: sourceId,
            synonym: typeof s === 'string' ? s : JSON.stringify(s),
            normalizedForm: (typeof s === 'string' ? s.trim().toLowerCase() : JSON.stringify(s)).toLowerCase(),
            locale: 'en',
            confidence: 1.0,
            source: 'CSV_IMPORT'
          }));
          // Prisma createMany with skipDuplicates
          await prisma.skillSynonym.createMany({
            data: inserts,
            skipDuplicates: true
          });
          synonymInserts += inserts.length;
        }
      }
    } catch (err) {
      console.warn(`Warning: failed to insert synonyms for ${normalized}:`, err);
    }

    // 2) Parent resolution: parent_skill may be normalized name or friendly name
    try {
      if (row.parent_skill) {
        const parentKey = (row.parent_skill || '').trim().toLowerCase();
        const parentId = nameToId.get(parentKey);
        if (parentId) {
          await prisma.skillTaxonomy.update({
            where: { id: sourceId },
            data: { parentId }
          });
          parentUpdates++;
        } else {
          // Try resolving by normalization of parent_skill in a fallback manner
          // If still not found, skip (could create NonTaxonomySkill or log)
        }
      }
    } catch (err) {
      console.warn(`Warning: failed to set parent for ${normalized}:`, err);
    }

    // 3) Related skills => SkillRelation edges
    try {
      if (row.related_skills) {
        const relatedArr: any[] = JSON.parse(row.related_skills);
        if (Array.isArray(relatedArr) && relatedArr.length > 0) {
          for (const maybeTarget of relatedArr) {
            const targetKey = (typeof maybeTarget === 'string' ? maybeTarget.trim().toLowerCase() : JSON.stringify(maybeTarget).toLowerCase());
            const targetId = nameToId.get(targetKey);
            if (!targetId) {
              // skip if target not present; optionally persist to NonTaxonomySkill table
              continue;
            }
            // upsert relation (avoid duplicates)
            // relationType unknown from CSV; default to COMMONLY_WITH
            try {
              await prisma.skillRelation.upsert({
  where: {
    sourceSkillId_targetSkillId_relationType: {
      sourceSkillId: sourceId,
      targetSkillId: targetId,
      relationType: 'COMMONLY_WITH'
    }
  },
  update: { strength: 0.5, bidirectional: true },
  create: {
    sourceSkillId: sourceId,
    targetSkillId: targetId,
    relationType: 'COMMONLY_WITH',
    strength: 0.5,
    bidirectional: true
  }
});

              relationInserts++;
            } catch (err) {
              // If upsert fails due to missing unique/index, attempt create & ignore duplicate errors
              try {
                await prisma.skillRelation.create({
                  data: {
                    sourceSkillId: sourceId,
                    targetSkillId: targetId,
                    relationType: 'COMMONLY_WITH',
                    strength: 0.5,
                    bidirectional: true
                  }
                });
                relationInserts++;
              } catch (err2) {
                // likely duplicate or constraint error; ignore
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Warning: failed to create relations for ${normalized}:`, err);
    }

    if ((idx + 1) % 500 === 0) {
      console.log(`  • Processed ${idx + 1}/${records.length} rows in second pass`);
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total CSV rows: ${records.length}`);
  console.log(`Skills upserted: ${upserted}`);
  console.log(`Synonym inserts (attempted): ${synonymInserts}`);
  console.log(`Relations created (attempted): ${relationInserts}`);
  console.log(`Parent updates applied: ${parentUpdates}`);

  await prisma.$disconnect();
}

const csvPath = process.argv[2] || path.join(process.cwd(), 'enhanced_skills_taxonomy.csv');

importTaxonomy(csvPath)
  .then(() => {
    console.log("Import finished");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal import error:", err);
    prisma.$disconnect().then(() => process.exit(1));
  });
