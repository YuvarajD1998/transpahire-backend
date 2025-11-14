import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function detectCycles() {
  const all = await prisma.skillTaxonomy.findMany({
    select: { id: true, parentId: true },
  });

  const map = new Map<number, number | null>();
  for (const s of all) map.set(s.id, s.parentId);

  const visited = new Set<number>();
  const stack = new Set<number>();
  const cycles: number[][] = [];

  function dfs(id: number, path: number[] = []) {
    if (stack.has(id)) {
      const start = path.indexOf(id);
      const cycle = path.slice(start).concat(id);
      cycles.push(cycle);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    stack.add(id);
    const parentId = map.get(id);
    if (parentId) dfs(parentId, [...path, id]);
    stack.delete(id);
  }

  for (const id of map.keys()) dfs(id);

  if (cycles.length > 0) {
    console.log("⚠️ Cycles detected in taxonomy:");
    for (const c of cycles) console.log("  •", c.join(" → "));
  } else {
    console.log("✅ No cycles found.");
  }
}

detectCycles()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
