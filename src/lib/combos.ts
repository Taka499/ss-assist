/**
 * Combination Search Algorithm
 *
 * Finds all valid character combinations for missions and ranks them by quality.
 * Uses hybrid validation: bitmasks for fast pruning, count-based checking for correctness.
 */

import type { Character, Mission, Condition } from "../types";
import {
  characterToBitmask,
  conditionToBitmask,
  satisfiesAllConditionsWithCounts,
  type BitmaskLookup,
  type CategoryBitmasks,
} from "./bitmask";

// ============================================================================
// Types
// ============================================================================

/**
 * A valid character combination for a mission
 */
export interface Combination {
  characterIds: string[];
  meetsBaseConditions: boolean;
  meetsBonusConditions: boolean;
  levelDeficits: Record<string, number>; // character ID -> levels needed
  contributingTags: string[]; // tag IDs that satisfied conditions
}

/**
 * Result of searching for combinations for a mission
 */
export interface CombinationSearchResult {
  missionId: string;
  satisfiable: boolean; // Are base conditions satisfiable with owned characters?
  combinations: Combination[]; // All valid combinations (base conditions met)
  bestCombinations: Combination[]; // Top-ranked combinations
  missingForBase: string[]; // Tag IDs needed to satisfy base (if not satisfiable)
  missingForBonus: string[]; // Tag IDs needed to add bonus on top of base
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate all combinations of items up to maxSize
 *
 * @param items Array of items to combine
 * @param maxSize Maximum combination size (should be 3 for this project)
 * @returns Array of all combinations of size 1, 2, and 3
 */
export function generateCombinations<T>(items: T[], maxSize: number): T[][] {
  const results: T[][] = [];

  // Size 1
  for (let i = 0; i < items.length; i++) {
    results.push([items[i]]);
  }

  // Size 2
  if (maxSize >= 2) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        results.push([items[i], items[j]]);
      }
    }
  }

  // Size 3
  if (maxSize >= 3) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        for (let k = j + 1; k < items.length; k++) {
          results.push([items[i], items[j], items[k]]);
        }
      }
    }
  }

  return results;
}

/**
 * Check level requirements and identify deficits
 *
 * @param characterIds Array of character IDs in the combination
 * @param requiredLevel Minimum level required by the mission
 * @param currentLevels Map of character ID to current level
 * @returns Map of character ID to level deficit (only includes characters below requirement)
 */
export function checkLevelRequirements(
  characterIds: string[],
  requiredLevel: number,
  currentLevels: Record<string, number>
): Record<string, number> {
  const deficits: Record<string, number> = {};

  for (const charId of characterIds) {
    const currentLevel = currentLevels[charId] || 1;
    if (currentLevel < requiredLevel) {
      deficits[charId] = requiredLevel - currentLevel;
    }
  }

  return deficits;
}

/**
 * Check if a character's tags interact with mission conditions (pruning optimization)
 *
 * A character "interacts with" a mission if at least one of its tags appears
 * in at least one mission condition. Uses bitmasks for O(1) checking.
 *
 * @param characterMask The character's bitmask
 * @param baseConditions Mission base conditions
 * @param bonusConditions Mission bonus conditions (optional)
 * @param lookup Bitmask lookup table
 * @returns true if character has at least one relevant tag
 */
export function interactsWith(
  characterMask: CategoryBitmasks,
  baseConditions: Condition[],
  bonusConditions: Condition[] | undefined,
  lookup: BitmaskLookup
): boolean {
  const allConditions = [
    ...baseConditions,
    ...(bonusConditions || []),
  ];

  // Check each condition - if character has any tag in any condition, they interact
  for (const condition of allConditions) {
    const conditionMask = conditionToBitmask(condition, lookup);
    const categoryMask = characterMask[condition.category];

    // Bitwise AND: if non-zero, character has at least one required tag
    if ((categoryMask & conditionMask) !== 0) {
      return true;
    }
  }

  return false;
}

/**
 * Identify which tags are missing to satisfy conditions
 *
 * @param conditions Array of conditions to analyze
 * @param ownedCharacters Characters the player owns
 * @returns Array of tag IDs that are missing (one representative tag per unsatisfiable condition)
 */
export function findMissingTags(
  conditions: Condition[],
  ownedCharacters: Character[]
): string[] {
  const missingTags: string[] = [];

  for (const condition of conditions) {
    // Check if any owned character has any of the required tags
    let conditionSatisfiable = false;

    for (const character of ownedCharacters) {
      const charTags = character.tags[condition.category];
      if (charTags) {
        // Check if character has any tag from the condition's anyOf array
        for (const tagId of condition.anyOf) {
          if (charTags.includes(tagId)) {
            conditionSatisfiable = true;
            break;
          }
        }
      }
      if (conditionSatisfiable) break;
    }

    // If no character satisfies this condition, report a missing tag
    if (!conditionSatisfiable && condition.anyOf.length > 0) {
      missingTags.push(condition.anyOf[0]); // Return first tag as representative
    }
  }

  return missingTags;
}

/**
 * Extract all unique tags from a combination of characters
 *
 * @param characters Array of characters in the combination
 * @returns Array of unique tag IDs
 */
function extractContributingTags(characters: Character[]): string[] {
  const tagSet = new Set<string>();

  for (const character of characters) {
    for (const tagArray of Object.values(character.tags)) {
      if (tagArray) {
        for (const tagId of tagArray) {
          tagSet.add(tagId);
        }
      }
    }
  }

  return Array.from(tagSet);
}

/**
 * Rank combinations by quality
 *
 * Sorting priority:
 * 1. Bonus conditions met (true first)
 * 2. Total level deficit (lower first)
 * 3. Number of characters (fewer first)
 * 4. Lexicographic by character IDs (for deterministic output)
 *
 * @param combinations Array of combinations to rank
 * @returns Sorted array of combinations
 */
export function rankCombinations(combinations: Combination[]): Combination[] {
  return [...combinations].sort((a, b) => {
    // 1. Bonus conditions (true > false)
    if (a.meetsBonusConditions !== b.meetsBonusConditions) {
      return a.meetsBonusConditions ? -1 : 1;
    }

    // 2. Total level deficit (lower is better)
    const deficitA = Object.values(a.levelDeficits).reduce((sum, d) => sum + d, 0);
    const deficitB = Object.values(b.levelDeficits).reduce((sum, d) => sum + d, 0);
    if (deficitA !== deficitB) {
      return deficitA - deficitB;
    }

    // 3. Number of characters (fewer is better)
    if (a.characterIds.length !== b.characterIds.length) {
      return a.characterIds.length - b.characterIds.length;
    }

    // 4. Lexicographic by character IDs (deterministic)
    const idsA = a.characterIds.join(",");
    const idsB = b.characterIds.join(",");
    return idsA.localeCompare(idsB);
  });
}

// ============================================================================
// Main Algorithm
// ============================================================================

/**
 * Find all valid character combinations for a mission
 *
 * Algorithm:
 * 1. Filter characters by level requirement
 * 2. Apply interactsWith pruning (eliminate irrelevant characters)
 * 3. Generate all 1-3 character combinations
 * 4. Validate each combination using count-based checking
 * 5. Check bonus conditions for valid combinations
 * 6. Rank results by quality
 *
 * @param mission The mission to find combinations for
 * @param ownedCharacters Characters the player owns
 * @param currentLevels Map of character ID to current level (default 1 if missing)
 * @param bitmaskLookup Bitmask lookup table from data loading
 * @returns Search result with valid combinations and recommendations
 */
export function findCombinations(
  mission: Mission,
  ownedCharacters: Character[],
  currentLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): CombinationSearchResult {
  // Step 1: Compute character bitmasks
  const characterBitmasks = new Map<string, CategoryBitmasks>();
  for (const char of ownedCharacters) {
    characterBitmasks.set(char.id, characterToBitmask(char, bitmaskLookup));
  }

  // Step 2: Pruning - filter characters that interact with mission conditions
  const relevantCharacters = ownedCharacters.filter((char) => {
    const mask = characterBitmasks.get(char.id);
    if (!mask) return false;
    return interactsWith(
      mask,
      mission.baseConditions,
      mission.bonusConditions,
      bitmaskLookup
    );
  });

  // Step 3: Generate all combinations (up to 3 characters)
  const candidateCombos = generateCombinations(relevantCharacters, 3);

  // Step 4: Validate combinations using count-based checking
  const validCombinations: Combination[] = [];

  for (const combo of candidateCombos) {
    // Check if base conditions are satisfied (using count-based validation)
    const meetsBase = satisfiesAllConditionsWithCounts(
      combo,
      mission.baseConditions
    );

    if (!meetsBase) continue;

    // Check if bonus conditions are satisfied
    const meetsBonus = mission.bonusConditions
      ? satisfiesAllConditionsWithCounts(combo, mission.bonusConditions)
      : false;

    // Check level requirements
    const levelDeficits = checkLevelRequirements(
      combo.map((c) => c.id),
      mission.requiredLevel,
      currentLevels
    );

    // Extract contributing tags
    const contributingTags = extractContributingTags(combo);

    validCombinations.push({
      characterIds: combo.map((c) => c.id),
      meetsBaseConditions: true,
      meetsBonusConditions: meetsBonus,
      levelDeficits,
      contributingTags,
    });
  }

  // Step 5: Rank combinations
  const rankedCombinations = rankCombinations(validCombinations);

  // Step 6: Determine satisfiability and missing tags
  const satisfiable = validCombinations.length > 0;
  const missingForBase = satisfiable
    ? []
    : findMissingTags(mission.baseConditions, ownedCharacters);
  const missingForBonus = mission.bonusConditions
    ? findMissingTags(mission.bonusConditions, ownedCharacters)
    : [];

  // Step 7: Select top combinations (top 10)
  const bestCombinations = rankedCombinations.slice(0, 10);

  return {
    missionId: mission.id,
    satisfiable,
    combinations: rankedCombinations,
    bestCombinations,
    missingForBase,
    missingForBonus,
  };
}
