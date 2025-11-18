/**
 * Combination Search Algorithm
 *
 * Finds all valid character combinations for commissions and ranks them by quality.
 * Uses hybrid validation: bitmasks for fast pruning, count-based checking for correctness.
 */

import type { Character, Commission, Condition, MultiCommissionAssignmentResult, CommissionCoverage } from "../types";
import {
  characterToBitmask,
  conditionToBitmask,
  satisfiesAllConditionsWithCounts,
  type BitmaskLookup,
  type CategoryBitmasks,
} from "./bitmask";
import { calculateTrainingPriorityFromBlockedTeams } from "./scoring";

// Re-export types for convenience
export type { MultiCommissionAssignmentResult, CommissionCoverage };

// ============================================================================
// Types
// ============================================================================

/**
 * A valid character combination for a commission
 */
export interface Combination {
  characterIds: string[];
  meetsBaseConditions: boolean;
  meetsBonusConditions: boolean;
  levelDeficits: Record<string, number>; // character ID -> levels needed
  contributingTags: string[]; // tag IDs that satisfied conditions
}

/**
 * Result of searching for combinations for a commission
 */
export interface CombinationSearchResult {
  commissionId: string;
  satisfiable: boolean; // Are base conditions satisfiable with owned characters?
  combinations: Combination[]; // All valid combinations (base conditions met)
  bestCombinations: Combination[]; // Top-ranked combinations
  missingForBase: string[]; // Tag IDs needed to satisfy base (if not satisfiable)
  missingForBonus: string[]; // Tag IDs needed to add bonus on top of base
}

/**
 * A validated combination with commission coverage information
 */
export interface ValidatedCombination {
  characterIds: string[];
  commissionCoverage: CommissionCoverage[];
  score: number;
  contributingTags: string[];
}

/**
 * Result of searching for combinations across multiple commissions
 */
export interface MultiCommissionCombinationResult {
  assignments: ValidatedCombination[];
  totalCandidatesGenerated: number;
  totalCandidatesValidated: number;
  pruningStats: {
    charactersPruned: number;
    charactersRemaining: number;
  };
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
 * @param requiredLevel Minimum level required by the commission
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
 * Check if a character's tags interact with commission conditions (pruning optimization)
 *
 * A character "interacts with" a commission if at least one of its tags appears
 * in at least one commission condition. Uses bitmasks for O(1) checking.
 *
 * @param characterMask The character's bitmask
 * @param baseConditions Commission base conditions
 * @param bonusConditions Commission bonus conditions (optional)
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
 * Find all valid character combinations for a commission
 *
 * Algorithm:
 * 1. Filter characters by level requirement
 * 2. Apply interactsWith pruning (eliminate irrelevant characters)
 * 3. Generate all 1-3 character combinations
 * 4. Validate each combination using count-based checking
 * 5. Check bonus conditions for valid combinations
 * 6. Rank results by quality
 *
 * @param commission The commission to find combinations for
 * @param ownedCharacters Characters the player owns
 * @param currentLevels Map of character ID to current level (default 1 if missing)
 * @param bitmaskLookup Bitmask lookup table from data loading
 * @returns Search result with valid combinations and recommendations
 */
export function findCombinations(
  commission: Commission,
  ownedCharacters: Character[],
  currentLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): CombinationSearchResult {
  // Step 1: Compute character bitmasks
  const characterBitmasks = new Map<string, CategoryBitmasks>();
  for (const char of ownedCharacters) {
    characterBitmasks.set(char.id, characterToBitmask(char, bitmaskLookup));
  }

  // Step 2: Pruning - filter characters that interact with commission conditions
  const relevantCharacters = ownedCharacters.filter((char) => {
    const mask = characterBitmasks.get(char.id);
    if (!mask) return false;
    return interactsWith(
      mask,
      commission.baseConditions,
      commission.bonusConditions,
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
      commission.baseConditions
    );

    if (!meetsBase) continue;

    // Check if bonus conditions are satisfied
    const meetsBonus = commission.bonusConditions
      ? satisfiesAllConditionsWithCounts(combo, commission.bonusConditions)
      : false;

    // Check level requirements
    const levelDeficits = checkLevelRequirements(
      combo.map((c) => c.id),
      commission.requiredLevel,
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
    : findMissingTags(commission.baseConditions, ownedCharacters);
  const missingForBonus = commission.bonusConditions
    ? findMissingTags(commission.bonusConditions, ownedCharacters)
    : [];

  // Step 7: Select top combinations (top 10)
  const bestCombinations = rankedCombinations.slice(0, 10);

  return {
    commissionId: commission.id,
    satisfiable,
    combinations: rankedCombinations,
    bestCombinations,
    missingForBase,
    missingForBonus,
  };
}

// ============================================================================
// Per-Commission Candidate Generation (Milestone 1)
// ============================================================================

/**
 * Find candidate teams for a single commission, separated by level sufficiency
 *
 * This function generates two types of teams:
 * - Ready teams: Satisfy all requirements including level
 * - Blocked teams: Satisfy tag/role requirements but fail level check
 *
 * Algorithm:
 * 1. Prune characters using bitmask interactsWith check
 * 2. Generate all 1-3 character combinations
 * 3. Validate each using count-based checking
 * 4. Separate into ready vs blocked based on level requirements
 * 5. Sort each category appropriately
 *
 * @param commission The commission to find candidates for
 * @param ownedCharacters Characters the player owns
 * @param characterLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table
 * @returns Per-commission candidates separated by level sufficiency
 */
export function findPerCommissionCandidates(
  commission: Commission,
  ownedCharacters: Character[],
  characterLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): import("../types").PerCommissionCandidates {
  // Step 1: Compute character bitmasks
  const characterBitmasks = new Map<string, CategoryBitmasks>();
  for (const char of ownedCharacters) {
    characterBitmasks.set(char.id, characterToBitmask(char, bitmaskLookup));
  }

  // Step 2: Pruning - filter characters that interact with commission conditions
  const relevantCharacters = ownedCharacters.filter((char) => {
    const mask = characterBitmasks.get(char.id);
    if (!mask) return false;
    return interactsWith(
      mask,
      commission.baseConditions,
      commission.bonusConditions,
      bitmaskLookup
    );
  });

  // Step 3: Generate all combinations (up to 3 characters)
  const candidateCombos = generateCombinations(relevantCharacters, 3);

  // Step 4 & 5: Validate and categorize
  const readyTeams: import("../types").PerCommissionCandidates["readyTeams"] = [];
  const blockedTeams: import("../types").BlockedCombination[] = [];

  for (const combo of candidateCombos) {
    // Phase 1: Tag/role validation
    const meetsBase = satisfiesAllConditionsWithCounts(
      combo,
      commission.baseConditions
    );

    // If doesn't meet base conditions, discard (not ready, not blocked, just invalid)
    if (!meetsBase) continue;

    // Check bonus conditions
    const meetsBonus = commission.bonusConditions
      ? satisfiesAllConditionsWithCounts(combo, commission.bonusConditions)
      : false;

    // Phase 2: Level validation
    const levelDeficits = checkLevelRequirements(
      combo.map((c) => c.id),
      commission.requiredLevel,
      characterLevels
    );

    const meetsLevelRequirement = Object.keys(levelDeficits).length === 0;

    // Extract contributing tags
    const contributingTags = extractContributingTags(combo);

    // Categorize: ready or blocked
    if (meetsLevelRequirement) {
      // Ready team
      readyTeams.push({
        characterIds: combo.map((c) => c.id),
        meetsBaseConditions: true,
        meetsBonusConditions: meetsBonus,
        contributingTags,
      });
    } else {
      // Blocked team (satisfies tag/role but not level)
      blockedTeams.push({
        characterIds: combo.map((c) => c.id),
        meetsBaseConditions: true,
        meetsBonusConditions: meetsBonus,
        levelDeficits,
      });
    }
  }

  // Step 6: Sort ready teams by size (ascending), then bonus satisfaction (descending)
  readyTeams.sort((a, b) => {
    // Prefer smaller teams
    if (a.characterIds.length !== b.characterIds.length) {
      return a.characterIds.length - b.characterIds.length;
    }

    // Prefer teams that satisfy bonus
    if (a.meetsBonusConditions !== b.meetsBonusConditions) {
      return a.meetsBonusConditions ? -1 : 1;
    }

    // Lexicographic by character IDs (deterministic)
    return a.characterIds.join(",").localeCompare(b.characterIds.join(","));
  });

  // Step 7: Sort blocked teams by total level gap (ascending), then size (ascending)
  blockedTeams.sort((a, b) => {
    // Prefer smaller total level gap
    const gapA = Object.values(a.levelDeficits).reduce((sum, d) => sum + d, 0);
    const gapB = Object.values(b.levelDeficits).reduce((sum, d) => sum + d, 0);
    if (gapA !== gapB) {
      return gapA - gapB;
    }

    // Prefer smaller teams
    if (a.characterIds.length !== b.characterIds.length) {
      return a.characterIds.length - b.characterIds.length;
    }

    // Lexicographic by character IDs (deterministic)
    return a.characterIds.join(",").localeCompare(b.characterIds.join(","));
  });

  return {
    commissionId: commission.id,
    readyTeams,
    blockedTeams,
  };
}

// ============================================================================
// Multi-Commission Combination Search
// ============================================================================

/**
 * Find character combinations that satisfy multiple commissions simultaneously
 *
 * This function validates combinations against ALL selected commissions at once,
 * unlike findCombinations() which handles a single commission.
 *
 * Algorithm:
 * 1. Create superset of relevant characters (union of characters relevant to any commission)
 * 2. Generate all 1-3 character combinations from the superset
 * 3. For each combination, validate against ALL commissions
 * 4. Calculate coverage score based on commissions satisfied
 * 5. Rank by score (more coverage = better)
 *
 * @param commissions Array of commissions to find combinations for
 * @param ownedCharacters Characters the player owns
 * @param currentLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table
 * @returns Multi-commission search result with combinations and coverage data
 */
export function findCombinationsForMultipleCommissions(
  commissions: Commission[],
  ownedCharacters: Character[],
  currentLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): MultiCommissionCombinationResult {
  // Handle edge case: no commissions selected
  if (commissions.length === 0) {
    return {
      assignments: [],
      totalCandidatesGenerated: 0,
      totalCandidatesValidated: 0,
      pruningStats: {
        charactersPruned: 0,
        charactersRemaining: 0,
      },
    };
  }

  // Step 1: Compute character bitmasks once
  const characterBitmasks = new Map<string, CategoryBitmasks>();
  for (const char of ownedCharacters) {
    characterBitmasks.set(char.id, characterToBitmask(char, bitmaskLookup));
  }

  // Step 2: Pruning - create superset of relevant characters
  // A character is relevant if it interacts with ANY commission's conditions
  const relevantCharacterSet = new Set<string>();

  for (const commission of commissions) {
    for (const char of ownedCharacters) {
      const mask = characterBitmasks.get(char.id);
      if (!mask) continue;

      if (interactsWith(
        mask,
        commission.baseConditions,
        commission.bonusConditions,
        bitmaskLookup
      )) {
        relevantCharacterSet.add(char.id);
      }
    }
  }

  const relevantCharacters = ownedCharacters.filter(char =>
    relevantCharacterSet.has(char.id)
  );

  const charactersPruned = ownedCharacters.length - relevantCharacters.length;

  // Step 3: Generate all combinations (up to 3 characters)
  const candidateCombos = generateCombinations(relevantCharacters, 3);
  const totalCandidatesGenerated = candidateCombos.length;

  // Step 4: Validate each combination against ALL commissions
  const validatedCombinations: ValidatedCombination[] = [];

  for (const combo of candidateCombos) {
    const commissionCoverage: CommissionCoverage[] = [];

    // Check this combination against each commission
    for (const commission of commissions) {
      const satisfiesBase = satisfiesAllConditionsWithCounts(
        combo,
        commission.baseConditions
      );

      const satisfiesBonus = commission.bonusConditions
        ? satisfiesAllConditionsWithCounts(combo, commission.bonusConditions)
        : false;

      // Check level requirements
      const levelDeficits = checkLevelRequirements(
        combo.map(c => c.id),
        commission.requiredLevel,
        currentLevels
      );
      const meetsLevelRequirement = Object.keys(levelDeficits).length === 0;

      commissionCoverage.push({
        commissionId: commission.id,
        satisfiesBase,
        satisfiesBonus,
        meetsLevelRequirement,
      });
    }

    // Calculate coverage score
    // +10 points: Satisfies base + bonus + level for a commission
    // +5 points: Satisfies base + level (but not bonus) for a commission
    // +2 points: Satisfies base only (level insufficient) for a commission
    // -1 point: Each character in the combination (prefer smaller teams)
    let score = 0;
    for (const coverage of commissionCoverage) {
      if (coverage.satisfiesBase && coverage.satisfiesBonus && coverage.meetsLevelRequirement) {
        score += 10;
      } else if (coverage.satisfiesBase && coverage.meetsLevelRequirement) {
        score += 5;
      } else if (coverage.satisfiesBase) {
        score += 2;
      }
    }
    score -= combo.length; // Prefer smaller combinations

    if (score <= 0) {
      // Discard combinations with non-positive score
      continue;
    }

    // Extract contributing tags
    const contributingTags = extractContributingTags(combo);

    validatedCombinations.push({
      characterIds: combo.map(c => c.id),
      commissionCoverage,
      score,
      contributingTags,
    });
  }

  // Step 5: Rank combinations by score (descending), then by size (ascending)
  const rankedCombinations = validatedCombinations.sort((a, b) => {
    // Higher score is better
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // Fewer characters is better (tiebreaker)
    if (a.characterIds.length !== b.characterIds.length) {
      return a.characterIds.length - b.characterIds.length;
    }

    // Lexicographic by character IDs (deterministic)
    return a.characterIds.join(',').localeCompare(b.characterIds.join(','));
  });

  return {
    assignments: rankedCombinations,
    totalCandidatesGenerated,
    totalCandidatesValidated: validatedCombinations.length,
    pruningStats: {
      charactersPruned,
      charactersRemaining: relevantCharacters.length,
    },
  };
}

// ============================================================================
// Multi-Commission Disjoint Assignment (Milestone 2)
// ============================================================================

/**
 * Calculate commission value based on number of base conditions
 * Commissions requiring more roles are more valuable
 */
function getCommissionValue(commission: Commission): number {
  return commission.baseConditions.length;
}

/**
 * Score for comparing assignments lexicographically
 */
interface AssignmentScore {
  totalCommissionValue: number;   // Primary: sum of assigned commission values
  totalCharacters: number;         // Secondary: negative (prefer fewer)
  bonusesSatisfied: number;        // Tertiary: count of bonuses met
}

/**
 * Compare two assignment scores lexicographically
 * Returns positive if a is better, negative if b is better, 0 if equal
 *
 * @param a First assignment score
 * @param b Second assignment score
 * @param strategy Assignment strategy ('base-first' or 'bonus-first')
 */
function compareScores(
  a: AssignmentScore,
  b: AssignmentScore,
  strategy: import("../types").AssignmentStrategy
): number {
  if (strategy === 'bonus-first') {
    // Bonus-first strategy: prioritize bonus satisfaction
    // Primary: more bonuses is better
    if (a.bonusesSatisfied !== b.bonusesSatisfied) {
      return a.bonusesSatisfied - b.bonusesSatisfied;
    }
    // Secondary: higher commission value is better
    if (a.totalCommissionValue !== b.totalCommissionValue) {
      return a.totalCommissionValue - b.totalCommissionValue;
    }
    // Tertiary: fewer characters is better
    return b.totalCharacters - a.totalCharacters;
  } else {
    // Base-first strategy (default): prioritize unlocking commissions
    // Primary: higher commission value is better
    if (a.totalCommissionValue !== b.totalCommissionValue) {
      return a.totalCommissionValue - b.totalCommissionValue;
    }
    // Secondary: fewer characters is better (so negate the comparison)
    if (a.totalCharacters !== b.totalCharacters) {
      return b.totalCharacters - a.totalCharacters;
    }
    // Tertiary: more bonuses is better
    return a.bonusesSatisfied - b.bonusesSatisfied;
  }
}

/**
 * Assign disjoint character teams to commissions, maximizing commission value
 *
 * Uses depth-first search with backtracking to explore all possible assignments.
 * Ensures no character is used in multiple commissions (disjoint constraint).
 *
 * Objective function (lexicographic priority):
 * - base-first: 1. Commission value → 2. Fewer characters → 3. Bonuses
 * - bonus-first: 1. Bonuses → 2. Commission value → 3. Fewer characters
 *
 * @param commissions Array of commissions to assign teams to
 * @param ownedCharacters Characters the player owns
 * @param characterLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table
 * @param strategy Assignment strategy ('base-first' or 'bonus-first')
 * @returns Multi-commission assignment result with disjoint teams
 */
export function findBestCommissionAssignment(
  commissions: Commission[],
  ownedCharacters: Character[],
  characterLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup,
  strategy: import("../types").AssignmentStrategy = 'base-first'
): import("../types").MultiCommissionAssignmentResult {
  // Phase 1: Generate candidates for each commission
  const candidatesByCommission = new Map<string, import("../types").PerCommissionCandidates>();
  let totalCandidatesGenerated = 0;

  for (const commission of commissions) {
    const candidates = findPerCommissionCandidates(
      commission,
      ownedCharacters,
      characterLevels,
      bitmaskLookup
    );
    candidatesByCommission.set(commission.id, candidates);
    totalCandidatesGenerated += candidates.readyTeams.length + candidates.blockedTeams.length;
  }

  // Phase 2: Sort commissions by difficulty (fewest ready teams first)
  // This ensures hard-to-satisfy commissions are assigned first, reducing dead ends
  const sortedCommissions = [...commissions].sort((a, b) => {
    const aReady = candidatesByCommission.get(a.id)?.readyTeams.length || 0;
    const bReady = candidatesByCommission.get(b.id)?.readyTeams.length || 0;
    return aReady - bReady;
  });

  // Phase 3: DFS to find best assignment
  interface Assignment {
    commissionId: string;
    team: import("../types").PerCommissionCandidates["readyTeams"][0];
  }

  let bestAssignment: Assignment[] = [];
  let bestScore: AssignmentScore = {
    totalCommissionValue: 0,
    totalCharacters: 0,
    bonusesSatisfied: 0,
  };
  let dfsNodesExplored = 0;

  function dfs(
    commissionIndex: number,
    currentAssignment: Assignment[],
    usedCharacters: Set<string>
  ): void {
    dfsNodesExplored++;

    // Base case: all commissions considered
    if (commissionIndex === sortedCommissions.length) {
      // Evaluate this assignment
      const score = evaluateAssignment(currentAssignment);

      if (compareScores(score, bestScore, strategy) > 0) {
        bestScore = score;
        bestAssignment = [...currentAssignment];
      }
      return;
    }

    const commission = sortedCommissions[commissionIndex];
    const candidates = candidatesByCommission.get(commission.id);
    if (!candidates) {
      // Skip this commission if no candidates
      dfs(commissionIndex + 1, currentAssignment, usedCharacters);
      return;
    }

    // Option 1: Skip this commission (explore partial coverage)
    dfs(commissionIndex + 1, currentAssignment, usedCharacters);

    // Option 2: Try each ready team
    for (const team of candidates.readyTeams) {
      // Check if any character in this team is already used
      const hasConflict = team.characterIds.some(charId => usedCharacters.has(charId));

      if (!hasConflict) {
        // Make assignment
        const newAssignment = [...currentAssignment, { commissionId: commission.id, team }];
        const newUsed = new Set(usedCharacters);
        team.characterIds.forEach(charId => newUsed.add(charId));

        // Recurse
        dfs(commissionIndex + 1, newAssignment, newUsed);
      }
    }
  }

  function evaluateAssignment(assignment: Assignment[]): AssignmentScore {
    let totalCommissionValue = 0;
    const allUsedCharacters = new Set<string>();
    let bonusesSatisfied = 0;

    for (const { commissionId, team } of assignment) {
      const commission = commissions.find(m => m.id === commissionId);
      if (commission) {
        totalCommissionValue += getCommissionValue(commission);
      }
      team.characterIds.forEach(charId => allUsedCharacters.add(charId));
      if (team.meetsBonusConditions) {
        bonusesSatisfied++;
      }
    }

    return {
      totalCommissionValue,
      totalCharacters: allUsedCharacters.size,
      bonusesSatisfied,
    };
  }

  // Start DFS
  dfs(0, [], new Set());

  // Phase 4: Package results
  const assignmentMap = new Map(bestAssignment.map(a => [a.commissionId, a.team]));

  // Collect all assigned characters to filter blocked teams
  const usedCharacters = new Set<string>();
  let totalRarity = 0;

  for (const { team } of bestAssignment) {
    team.characterIds.forEach(charId => usedCharacters.add(charId));
  }

  // Build assignments array, selecting disjoint blocked teams for unassigned commissions
  const assignments: import("../types").CommissionAssignment[] = [];

  // First pass: Create assignments for assigned commissions
  for (const commission of commissions) {
    const team = assignmentMap.get(commission.id);

    if (team) {
      // Calculate total rarity for display
      const teamRarity = team.characterIds.reduce((sum, charId) => {
        const char = ownedCharacters.find(c => c.id === charId);
        const rarityTag = char?.tags.rarity?.[0];
        const rarity = rarityTag ? parseInt(rarityTag.split('-')[1], 10) : 0;
        return sum + rarity;
      }, 0);

      totalRarity += teamRarity;

      assignments.push({
        commissionId: commission.id,
        commissionValue: getCommissionValue(commission),
        team: {
          characterIds: team.characterIds,
          totalRarity: teamRarity,
          satisfiesBonus: team.meetsBonusConditions,
        },
      });
    }
  }

  // Second pass: Select disjoint blocked teams for unassigned commissions
  // Sort unassigned commissions by the smallest level gap of their best available blocked team
  const unassignedCommissionsWithCandidates: Array<{
    commission: Commission;
    candidates: import("../types").PerCommissionCandidates;
  }> = [];

  for (const commission of commissions) {
    if (!assignmentMap.has(commission.id)) {
      const candidates = candidatesByCommission.get(commission.id);
      if (candidates && candidates.blockedTeams.length > 0) {
        unassignedCommissionsWithCandidates.push({ commission, candidates });
      }
    }
  }

  // Sort unassigned commissions based on strategy
  unassignedCommissionsWithCandidates.sort((a, b) => {
    if (strategy === 'bonus-first') {
      // Bonus-first: prioritize commissions with bonus-satisfying blocked teams
      const getMaxBonusScore = (candidates: import("../types").PerCommissionCandidates) => {
        const availableTeams = candidates.blockedTeams.filter(team =>
          team.characterIds.every(charId => !usedCharacters.has(charId))
        );
        if (availableTeams.length === 0) return -Infinity;
        // Count teams that satisfy bonus (higher is better)
        const bonusCount = availableTeams.filter(team => team.meetsBonusConditions).length;
        return bonusCount;
      };
      const scoreA = getMaxBonusScore(a.candidates);
      const scoreB = getMaxBonusScore(b.candidates);
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher bonus count first
      }
    }

    // Base-first or tiebreaker: sort by smallest available level gap
    const getMinGap = (candidates: import("../types").PerCommissionCandidates) => {
      const availableTeams = candidates.blockedTeams.filter(team =>
        team.characterIds.every(charId => !usedCharacters.has(charId))
      );
      if (availableTeams.length === 0) return Infinity;
      return Math.min(...availableTeams.map(team =>
        Object.values(team.levelDeficits).reduce((sum, gap) => sum + gap, 0)
      ));
    };
    return getMinGap(a.candidates) - getMinGap(b.candidates);
  });

  // Select blocked teams in order, avoiding character overlap
  for (const { commission, candidates } of unassignedCommissionsWithCandidates) {
    const availableBlockedTeams = candidates.blockedTeams.filter(team =>
      team.characterIds.every(charId => !usedCharacters.has(charId))
    );

    let blockedTeam: import("../types").CommissionAssignment['blockedTeam'];

    if (availableBlockedTeams.length > 0) {
      // Sort blocked teams based on strategy
      const sortedBlocked = [...availableBlockedTeams].sort((a, b) => {
        if (strategy === 'bonus-first') {
          // Bonus-first: prioritize teams that satisfy bonus conditions
          // Primary: bonus satisfaction (true first)
          if (a.meetsBonusConditions !== b.meetsBonusConditions) {
            return a.meetsBonusConditions ? -1 : 1;
          }
          // Secondary: smaller level gap
          const gapA = Object.values(a.levelDeficits).reduce((sum, gap) => sum + gap, 0);
          const gapB = Object.values(b.levelDeficits).reduce((sum, gap) => sum + gap, 0);
          return gapA - gapB;
        } else {
          // Base-first: prioritize teams with smallest level gap
          // Primary: smaller level gap
          const gapA = Object.values(a.levelDeficits).reduce((sum, gap) => sum + gap, 0);
          const gapB = Object.values(b.levelDeficits).reduce((sum, gap) => sum + gap, 0);
          if (gapA !== gapB) {
            return gapA - gapB;
          }
          // Tiebreaker: bonus satisfaction
          return a.meetsBonusConditions === b.meetsBonusConditions ? 0 : (a.meetsBonusConditions ? -1 : 1);
        }
      });

      const best = sortedBlocked[0];
      blockedTeam = {
        characterIds: best.characterIds,
        levelDeficits: best.levelDeficits,
        satisfiesBonus: best.meetsBonusConditions,
      };

      // Mark these characters as used for subsequent commissions
      best.characterIds.forEach(charId => usedCharacters.add(charId));
    }

    assignments.push({
      commissionId: commission.id,
      commissionValue: getCommissionValue(commission),
      team: null,
      blockedTeam,
    });
  }

  // Add any remaining unassigned commissions without blocked teams
  for (const commission of commissions) {
    if (!assignments.some(a => a.commissionId === commission.id)) {
      assignments.push({
        commissionId: commission.id,
        commissionValue: getCommissionValue(commission),
        team: null,
      });
    }
  }

  const unassignedCommissionIds = assignments
    .filter(a => a.team === null)
    .map(a => a.commissionId);

  // Phase 5: Calculate training recommendations from blocked teams
  // For training recommendations, use ALL available blocked teams (not just the one shown)
  // This ensures we suggest training for all viable paths across all unassigned commissions
  const unassignedCommissions = commissions.filter(m => unassignedCommissionIds.includes(m.id));
  const blockedTeamsByCommission = new Map<string, import("../types").BlockedCombination[]>();

  // Collect only the characters used in assigned commissions for filtering
  const assignedOnlyCharacters = new Set<string>();
  for (const { team } of bestAssignment) {
    team.characterIds.forEach(charId => assignedOnlyCharacters.add(charId));
  }

  // For each unassigned commission, provide ALL blocked teams that don't use assigned characters
  // (allow overlap between unassigned commissions for comprehensive recommendations)
  for (const commission of unassignedCommissions) {
    const candidates = candidatesByCommission.get(commission.id);
    if (candidates) {
      const availableBlockedTeams = candidates.blockedTeams.filter(team =>
        team.characterIds.every(charId => !assignedOnlyCharacters.has(charId))
      );
      blockedTeamsByCommission.set(commission.id, availableBlockedTeams);
    }
  }

  const trainingRecommendations = calculateTrainingPriorityFromBlockedTeams(
    unassignedCommissions,
    blockedTeamsByCommission,
    ownedCharacters,
    characterLevels,
    strategy
  );

  return {
    assignments,
    stats: {
      totalCommissionValue: bestScore.totalCommissionValue,
      commissionsAssigned: bestAssignment.length,
      commissionsTotal: commissions.length,
      totalCharactersUsed: bestAssignment.reduce((count, { team }) => count + team.characterIds.length, 0),
      totalRarity,
      unassignedCommissionIds,
    },
    trainingRecommendations,
    debug: {
      candidatesGenerated: totalCandidatesGenerated,
      dfsNodesExplored,
    },
  };
}
