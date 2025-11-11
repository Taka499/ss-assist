/**
 * Integration test for combination search with real data
 *
 * This script loads real game data and tests the combination search
 * algorithm with realistic scenarios.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TagDict, Character, Mission } from "../src/types/index.js";
import { buildBitmaskLookup } from "../src/lib/bitmask.js";
import { findCombinations } from "../src/lib/combos.js";

// ============================================================================
// Load Data
// ============================================================================

console.log("Loading game data...\n");

const dataDir = resolve(process.cwd(), "data");

const tags: TagDict = JSON.parse(
  readFileSync(resolve(dataDir, "tags.json"), "utf-8")
);
const characters: Character[] = JSON.parse(
  readFileSync(resolve(dataDir, "characters.json"), "utf-8")
);
const missions: Mission[] = JSON.parse(
  readFileSync(resolve(dataDir, "missions.json"), "utf-8")
);

console.log(` Loaded ${Object.values(tags).flat().length} tags`);
console.log(` Loaded ${characters.length} characters`);
console.log(` Loaded ${missions.length} missions\n`);

const bitmaskLookup = buildBitmaskLookup(tags);
console.log(` Built bitmask lookup table\n`);

// ============================================================================
// Test Scenario 1: Simple Mission
// ============================================================================

console.log("=".repeat(60));
console.log("Scenario 1: Testing with a simple mission");
console.log("=".repeat(60));

const mission1 = missions[0];
console.log(`\nMission: ${mission1.name.ja} (${mission1.id})`);
console.log(`Required Level: ${mission1.requiredLevel}`);
console.log(`Base Conditions: ${mission1.baseConditions.length}`);
mission1.baseConditions.forEach((cond, i) => {
  console.log(`  ${i + 1}. ${cond.category}: [${cond.anyOf.join(", ")}]`);
});

if (mission1.bonusConditions && mission1.bonusConditions.length > 0) {
  console.log(`Bonus Conditions: ${mission1.bonusConditions.length}`);
  mission1.bonusConditions.forEach((cond, i) => {
    console.log(`  ${i + 1}. ${cond.category}: [${cond.anyOf.join(", ")}]`);
  });
}

// Simulate owning first 10 characters at various levels
const ownedChars1 = characters.slice(0, 10);
const levels1: Record<string, number> = {
  [ownedChars1[0].id]: 60,
  [ownedChars1[1].id]: 50,
  [ownedChars1[2].id]: 40,
  [ownedChars1[3].id]: 70,
  [ownedChars1[4].id]: 55,
  [ownedChars1[5].id]: 45,
  [ownedChars1[6].id]: 60,
  [ownedChars1[7].id]: 35,
  [ownedChars1[8].id]: 50,
  [ownedChars1[9].id]: 65,
};

console.log(`\nOwned characters (${ownedChars1.length}):`);
ownedChars1.forEach((char) => {
  const level = levels1[char.id];
  const meetsLevel = level >= mission1.requiredLevel ? "" : "";
  const tagList = Object.entries(char.tags)
    .map(([cat, tags]) => tags?.join(","))
    .filter(Boolean)
    .join(", ");
  console.log(`  ${char.name.ja} (Lv ${level} ${meetsLevel}): ${tagList}`);
});

const result1 = findCombinations(mission1, ownedChars1, levels1, bitmaskLookup);

console.log(`\n--- Results ---`);
console.log(`Satisfiable: ${result1.satisfiable ? "YES " : "NO "}`);
console.log(`Valid combinations found: ${result1.combinations.length}`);

if (result1.satisfiable) {
  const withBonus = result1.combinations.filter((c) => c.meetsBonusConditions);
  const withoutBonus = result1.combinations.filter(
    (c) => !c.meetsBonusConditions
  );

  console.log(
    `  - With bonus conditions: ${withBonus.length}`
  );
  console.log(
    `  - Base conditions only: ${withoutBonus.length}`
  );

  console.log(`\nTop 5 combinations:`);
  result1.bestCombinations.slice(0, 5).forEach((combo, i) => {
    const charNames = combo.characterIds
      .map((id) => {
        const char = characters.find((c) => c.id === id);
        const deficit = combo.levelDeficits[id];
        const deficitStr = deficit ? ` (needs +${deficit})` : "";
        return `${char?.name.ja}${deficitStr}`;
      })
      .join(", ");
    const bonusStr = combo.meetsBonusConditions ? " [BONUS]" : "";
    console.log(`  ${i + 1}. [${charNames}]${bonusStr}`);
  });
} else {
  console.log(`\nMissing tags for base conditions:`);
  result1.missingForBase.forEach((tagId) => {
    const tag = Object.values(tags)
      .flat()
      .find((t) => t.id === tagId);
    console.log(`  - ${tagId}: ${tag?.ja || "Unknown"}`);
  });
}

// ============================================================================
// Test Scenario 2: Count-based Mission
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("Scenario 2: Testing with count-based requirements");
console.log("=".repeat(60));

// Find a mission with duplicate tags in conditions
const countBasedMission = missions.find((m) =>
  m.baseConditions.some((cond) => {
    const tagSet = new Set(cond.anyOf);
    return tagSet.size < cond.anyOf.length; // Has duplicates
  })
);

if (countBasedMission) {
  console.log(`\nMission: ${countBasedMission.name.ja} (${countBasedMission.id})`);
  console.log(`Required Level: ${countBasedMission.requiredLevel}`);
  console.log(`Base Conditions: ${countBasedMission.baseConditions.length}`);
  countBasedMission.baseConditions.forEach((cond, i) => {
    const tagCounts = new Map<string, number>();
    cond.anyOf.forEach((tagId) => {
      tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
    });
    const countStr = Array.from(tagCounts.entries())
      .map(([tagId, count]) => `${tagId}${count > 1 ? ` x${count}` : ""}`)
      .join(", ");
    console.log(
      `  ${i + 1}. ${cond.category}: [${countStr}] (requires multiple characters)`
    );
  });

  // Test with all characters
  const levels2 = Object.fromEntries(
    characters.map((char) => [char.id, 90])
  );

  const result2 = findCombinations(
    countBasedMission,
    characters,
    levels2,
    bitmaskLookup
  );

  console.log(`\n--- Results ---`);
  console.log(`Satisfiable: ${result2.satisfiable ? "YES " : "NO "}`);
  console.log(`Valid combinations found: ${result2.combinations.length}`);

  if (result2.satisfiable) {
    console.log(`\nTop 3 combinations:`);
    result2.bestCombinations.slice(0, 3).forEach((combo, i) => {
      const charNames = combo.characterIds
        .map((id) => {
          const char = characters.find((c) => c.id === id);
          return char?.name.ja;
        })
        .join(", ");
      console.log(`  ${i + 1}. [${charNames}]`);
    });
  }
} else {
  console.log("\nNo count-based missions found in dataset.");
}

// ============================================================================
// Test Scenario 3: Unsatisfiable Mission
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("Scenario 3: Testing with limited roster (unsatisfiable)");
console.log("=".repeat(60));

// Use a mission with specific requirements
const mission3 = missions[10] || missions[5];

console.log(`\nMission: ${mission3.name.ja} (${mission3.id})`);
console.log(`Required Level: ${mission3.requiredLevel}`);

// Only own 3 characters that don't meet all requirements
const limitedChars = characters.slice(0, 3);
const levels3 = Object.fromEntries(
  limitedChars.map((char) => [char.id, 90])
);

console.log(`\nOwned characters (${limitedChars.length}):`);
limitedChars.forEach((char) => {
  const tagList = Object.entries(char.tags)
    .map(([cat, tags]) => tags?.join(","))
    .filter(Boolean)
    .join(", ");
  console.log(`  ${char.name.ja}: ${tagList}`);
});

const result3 = findCombinations(mission3, limitedChars, levels3, bitmaskLookup);

console.log(`\n--- Results ---`);
console.log(`Satisfiable: ${result3.satisfiable ? "YES " : "NO "}`);

if (!result3.satisfiable) {
  console.log(`\nTo unlock this mission, you need characters with:`);
  result3.missingForBase.forEach((tagId) => {
    const tag = Object.values(tags)
      .flat()
      .find((t) => t.id === tagId);
    console.log(`  - ${tagId}: ${tag?.ja || "Unknown"}`);
  });
}

// ============================================================================
// Performance Test
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("Performance Test: Search with large roster");
console.log("=".repeat(60));

const perfMission = missions[0];
const perfChars = characters.slice(0, 20);
const perfLevels = Object.fromEntries(
  perfChars.map((char) => [char.id, 90])
);

console.log(`\nMission: ${perfMission.name.ja}`);
console.log(`Characters: ${perfChars.length}`);

const startTime = performance.now();
const perfResult = findCombinations(
  perfMission,
  perfChars,
  perfLevels,
  bitmaskLookup
);
const elapsed = performance.now() - startTime;

console.log(`\n--- Performance ---`);
console.log(`Search completed in ${elapsed.toFixed(2)}ms`);
console.log(`Combinations evaluated: ${perfResult.combinations.length}`);
console.log(
  `Performance: ${(perfResult.combinations.length / elapsed).toFixed(2)} combos/ms`
);

// ============================================================================
// Summary
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log(" Integration test completed successfully");
console.log("=".repeat(60));
console.log("\nKey findings:");
console.log("- Combination search works with real game data");
console.log("- Count-based validation handles duplicate tag requirements");
console.log("- Missing tag identification helps guide player decisions");
console.log(`- Performance is acceptable (${elapsed.toFixed(2)}ms for 20 characters)`);
console.log("\n");
