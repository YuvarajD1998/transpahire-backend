/**
 * update-hierarchy-paths.ts
 *
 * Computes and fills hierarchyPath for all SkillTaxonomy records.
 * Example: /1/2/3/ for Frontend > React > Redux
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🧭 Building hierarchy paths for all skills...");

  // Fetch id + parentId for all skills
  const allSkills = await prisma.skillTaxonomy.findMany({
    select: { id: true, parentId: true },
  });

  // Build a lookup map
  const parentMap = new Map<number, number | null>();
  for (const skill of allSkills) parentMap.set(skill.id, skill.parentId);

  // Recursive cache to avoid recomputation
  const cache = new Map<number, string>();

  function buildPath(id: number): string {
    if (cache.has(id)) return cache.get(id)!;
    const parentId = parentMap.get(id);
    if (!parentId) {
      const path = `/${id}/`;
      cache.set(id, path);
      return path;
    }
    const path = `${buildPath(parentId)}${id}/`;
    cache.set(id, path);
    return path;
  }

  let updated = 0;

  // Batch updates to reduce DB writes
  const batchSize = 500;
  const updates: { id: number; path: string }[] = [];

  for (const skill of allSkills) {
    const path = buildPath(skill.id);
    updates.push({ id: skill.id, path });

    if (updates.length >= batchSize) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.skillTaxonomy.update({
            where: { id: u.id },
            data: { hierarchyPath: u.path },
          })
        )
      );
      updated += updates.length;
      console.log(`  • Updated ${updated}/${allSkills.length} paths...`);
      updates.length = 0; // clear batch
    }
  }

  // Commit remaining updates
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.skillTaxonomy.update({
          where: { id: u.id },
          data: { hierarchyPath: u.path },
        })
      )
    );
    updated += updates.length;
  }

  console.log(`✅ Hierarchy paths computed for ${updated} skills.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("❌ Error computing hierarchy paths:", err);
    prisma.$disconnect();
  });
