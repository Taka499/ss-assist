/**
 * Training Priority Scoring System
 *
 * Analyzes the impact of leveling characters and recommends which characters
 * to prioritize for maximum commission unlock potential.
 */

import type { Character, Commission, TagDict, Language, BlockedCombination, TrainingRecommendationNew } from "../types";
import { findCombinations } from "./combos";
import type { BitmaskLookup } from "./bitmask";

// ============================================================================
// Types
// ============================================================================

/**
 * Training recommendation for a specific character and target level
 */
export interface TrainingRecommendation {
  characterId: string;
  characterName: string; // For display
  currentLevel: number;
  targetLevel: number;
  score: number;
  impact: {
    baseConditionsUnlocked: number; // Commissions that become satisfiable
    bonusConditionsAdded: number; // Commissions where bonus becomes achievable
    affectedCommissions: string[]; // Commission IDs impacted
  };
}

/**
 * Weights for scoring formula
 */
export interface ScoringWeights {
  baseConditionWeight: number; // w1, default 3.0
  bonusConditionWeight: number; // w2, default 2.0
  levelGapPenalty: number; // w3, default 0.05
  rarityBonus: number; // w4, default 1.0
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default scoring weights
 * - Base condition unlock is most valuable (3.0)
 * - Bonus conditions are valuable (2.0)
 * - Level gap penalty is small to slightly favor closer milestones (0.05)
 * - Rare tags get a moderate bonus (1.0)
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  baseConditionWeight: 3.0,
  bonusConditionWeight: 2.0,
  levelGapPenalty: 0.05,
  rarityBonus: 1.0,
};

/**
 * Standard level milestones in the game (10, 20, 30, ..., 90)
 */
export const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90];

// ============================================================================
// Tag Rarity Functions
// ============================================================================

/**
 * Calculate rarity score for each tag based on how many characters have it
 *
 * Rarity score = 1.0 / (count + 1)
 * - If only 1 character has the tag: score = 0.5
 * - If 5 characters have the tag: score = 0.167
 * - Rare tags get higher scores
 *
 * @param characters Array of owned characters
 * @param tags Tag dictionary (not used in current implementation, but kept for future extensibility)
 * @returns Map of tag ID to rarity score
 */
export function calculateTagRarity(
  characters: Character[],
  _tags: TagDict
): Map<string, number> {
  const tagCounts = new Map<string, number>();

  // Count how many characters have each tag
  for (const character of characters) {
    for (const tagArray of Object.values(character.tags)) {
      if (tagArray) {
        for (const tagId of tagArray) {
          tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
        }
      }
    }
  }

  // Calculate rarity scores
  const rarityScores = new Map<string, number>();
  for (const [tagId, count] of tagCounts.entries()) {
    rarityScores.set(tagId, 1.0 / (count + 1));
  }

  return rarityScores;
}

/**
 * Calculate total rarity bonus for a character
 *
 * Sums the rarity scores for all of a character's tags.
 * Characters with rare tags get higher scores.
 *
 * @param character Character to evaluate
 * @param rarityMap Map of tag ID to rarity score
 * @returns Total rarity bonus for the character
 */
export function calculateCharacterRarity(
  character: Character,
  rarityMap: Map<string, number>
): number {
  let totalRarity = 0;

  for (const tagArray of Object.values(character.tags)) {
    if (tagArray) {
      for (const tagId of tagArray) {
        totalRarity += rarityMap.get(tagId) || 0;
      }
    }
  }

  return totalRarity;
}

// ============================================================================
// Training Impact Calculation
// ============================================================================

/**
 * Calculate the impact of training a character to a target level
 *
 * Simulates upgrading the character and compares commission outcomes before/after:
 * - Commissions that become satisfiable (base conditions unlock)
 * - Commissions where bonus becomes achievable
 *
 * @param characterId Character to evaluate
 * @param targetLevel Target level for training
 * @param commissions Array of commissions to evaluate against
 * @param ownedCharacters All owned characters
 * @param currentLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table for efficient validation
 * @returns Impact object with counts of unlocked commissions and affected commission IDs
 */
export function calculateTrainingImpact(
  characterId: string,
  targetLevel: number,
  commissions: Commission[],
  ownedCharacters: Character[],
  currentLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): TrainingRecommendation["impact"] {

  let baseConditionsUnlocked = 0;
  let bonusConditionsAdded = 0;
  const affectedCommissions: string[] = [];

  // Create upgraded levels map
  const upgradedLevels = { ...currentLevels, [characterId]: targetLevel };

  for (const commission of commissions) {
    // Run combination search with current levels
    const beforeResult = findCombinations(
      commission,
      ownedCharacters,
      currentLevels,
      bitmaskLookup
    );

    // Run combination search with upgraded level
    const afterResult = findCombinations(
      commission,
      ownedCharacters,
      upgradedLevels,
      bitmaskLookup
    );

    // A commission is "completable" if there's at least one combination with no level deficits
    const beforeCompletable = beforeResult.combinations.some(
      (c) => Object.keys(c.levelDeficits).length === 0
    );
    const afterCompletable = afterResult.combinations.some(
      (c) => Object.keys(c.levelDeficits).length === 0
    );

    // Check if commission became completable (base conditions unlock)
    if (!beforeCompletable && afterCompletable) {
      baseConditionsUnlocked++;
      affectedCommissions.push(commission.id);
      continue; // Don't double-count for bonus
    }

    // Check if bonus became achievable
    // A commission has bonus added if:
    // - It was completable before (has combinations with no level deficits)
    // - None of the completable combinations met bonus conditions before
    // - At least one completable combination meets bonus conditions after
    const beforeCompletableWithBonus = beforeResult.combinations.some(
      (c) => c.meetsBonusConditions && Object.keys(c.levelDeficits).length === 0
    );
    const afterCompletableWithBonus = afterResult.combinations.some(
      (c) => c.meetsBonusConditions && Object.keys(c.levelDeficits).length === 0
    );

    if (beforeCompletable && !beforeCompletableWithBonus && afterCompletableWithBonus) {
      bonusConditionsAdded++;
      affectedCommissions.push(commission.id);
    }
  }

  return {
    baseConditionsUnlocked,
    bonusConditionsAdded,
    affectedCommissions,
  };
}

// ============================================================================
// Main Training Priority Function
// ============================================================================

/**
 * Calculate training priority recommendations for all characters
 *
 * For each owned character, evaluates each level milestone above their current level
 * and calculates a score based on:
 * - How many commissions the training would unlock (base conditions)
 * - How many commissions would gain bonus conditions
 * - The level gap (penalizes expensive training slightly)
 * - Character's tag rarity (rewards rare tags)
 *
 * Score formula: score = w1 * baseUnlocked + w2 * bonusAdded - w3 * levelGap + w4 * rarityBonus
 *
 * @param commissions Array of commissions to evaluate
 * @param ownedCharacters Array of owned characters
 * @param currentLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table for efficient validation
 * @param tags Tag dictionary for rarity calculation
 * @param weights Scoring weights (uses DEFAULT_WEIGHTS if not provided)
 * @returns Array of training recommendations sorted by score (highest first)
 */
export function calculateTrainingPriority(
  commissions: Commission[],
  ownedCharacters: Character[],
  currentLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup,
  tags: TagDict,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): TrainingRecommendation[] {
  const recommendations: TrainingRecommendation[] = [];

  // Calculate tag rarity scores
  const rarityMap = calculateTagRarity(ownedCharacters, tags);

  // For each owned character
  for (const character of ownedCharacters) {
    const currentLevel = currentLevels[character.id] || 1;

    // For each level milestone above current level
    for (const targetLevel of LEVEL_MILESTONES) {
      if (targetLevel <= currentLevel) continue;

      // Calculate training impact
      const impact = calculateTrainingImpact(
        character.id,
        targetLevel,
        commissions,
        ownedCharacters,
        currentLevels,
        bitmaskLookup
      );

      // Calculate level gap
      const levelGap = targetLevel - currentLevel;

      // Calculate rarity bonus
      const rarityBonus = calculateCharacterRarity(character, rarityMap);

      // Calculate score using the formula
      const score =
        weights.baseConditionWeight * impact.baseConditionsUnlocked +
        weights.bonusConditionWeight * impact.bonusConditionsAdded -
        weights.levelGapPenalty * levelGap +
        weights.rarityBonus * rarityBonus;

      // Only include recommendations with positive score
      if (score > 0) {
        recommendations.push({
          characterId: character.id,
          characterName: character.name.ja, // Default to Japanese name
          currentLevel,
          targetLevel,
          score,
          impact,
        });
      }
    }
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
}

// ============================================================================
// Multi-Commission Training Priority (using Blocked Teams)
// ============================================================================

/**
 * Calculate training priority from blocked teams for unassigned commissions
 *
 * This function analyzes which characters, when leveled up, would unlock
 * currently unassigned commissions by satisfying their level requirements.
 *
 * Scoring formula:
 * - base-first: 1000.0 × commissionsUnlocked + 10.0 × bonusesAdded + 1.0 × rarity - 0.5 × levelGap
 * - bonus-first: 1000.0 × bonusesAdded + 100.0 × commissionsUnlocked + 1.0 × rarity - 0.5 × levelGap
 *
 * @param unassignedCommissions Commissions that could not be assigned in current state
 * @param blockedTeamsByCommission Map of commission ID to its blocked teams
 * @param characters All owned characters
 * @param characterLevels Current levels of all characters
 * @param strategy Assignment strategy ('base-first' or 'bonus-first')
 * @returns Array of training recommendations sorted by priority (highest first), limited to top 20
 */
export function calculateTrainingPriorityFromBlockedTeams(
  unassignedCommissions: Commission[],
  blockedTeamsByCommission: Map<string, BlockedCombination[]>,
  characters: Character[],
  characterLevels: Record<string, number>,
  strategy: import("../types").AssignmentStrategy = 'base-first'
): TrainingRecommendationNew[] {
  // Build a map of character -> commissions they could help unlock
  const characterToCommissions = new Map<string, Set<string>>();

  for (const commission of unassignedCommissions) {
    const blockedTeams = blockedTeamsByCommission.get(commission.id) || [];

    for (const team of blockedTeams) {
      // For each character in this blocked team, record that they could help unlock this commission
      for (const charId of team.characterIds) {
        if (!characterToCommissions.has(charId)) {
          characterToCommissions.set(charId, new Set());
        }
        characterToCommissions.get(charId)!.add(commission.id);
      }
    }
  }

  // For each character, determine level targets and calculate impact
  const recommendations: TrainingRecommendationNew[] = [];

  for (const character of characters) {
    const currentLevel = characterLevels[character.id] || 1;
    const potentialCommissions = characterToCommissions.get(character.id);

    if (!potentialCommissions || potentialCommissions.size === 0) {
      continue; // This character doesn't appear in any blocked teams
    }

    // Determine meaningful level targets for this character
    const levelTargets = new Set<number>();

    // Add commission required levels (exact levels needed)
    for (const commissionId of potentialCommissions) {
      const commission = unassignedCommissions.find(m => m.id === commissionId);
      if (commission && commission.requiredLevel > currentLevel) {
        levelTargets.add(commission.requiredLevel);
      }
    }

    if (levelTargets.size === 0) {
      continue; // This character is already at or above commission requirements
    }

    // Track best recommendation per unique commission set
    const impactMap = new Map<string, { targetLevel: number; commissionsUnlocked: string[]; bonusesAdded: string[]; priority: number }>();

    // For each target level, simulate the upgrade and check impact
    for (const targetLevel of levelTargets) {
      const commissionsUnlocked: string[] = [];
      const bonusesAdded: string[] = [];

      // Check each commission this character could help unlock
      for (const commissionId of potentialCommissions) {
        const commission = unassignedCommissions.find(m => m.id === commissionId);
        if (!commission) continue;

        const blockedTeams = blockedTeamsByCommission.get(commissionId) || [];

        // Check if there's a blocked team that includes this character
        for (const team of blockedTeams) {
          if (!team.characterIds.includes(character.id)) {
            continue; // This team doesn't include our character
          }

          // Check if this character has a level deficit in this team
          const deficit = team.levelDeficits[character.id] || 0;
          if (deficit === 0) {
            continue; // This character already meets level requirement
          }

          // This character needs training for this commission
          // Even if other characters also need training, we should recommend this one
          if (!commissionsUnlocked.includes(commissionId)) {
            if (team.meetsBaseConditions) {
              commissionsUnlocked.push(commissionId);
            }
            if (team.meetsBonusConditions) {
              bonusesAdded.push(commissionId);
            }
            break; // Only count this commission once
          }
        }
      }

      // Calculate score if this training would have any impact
      if (commissionsUnlocked.length > 0 || bonusesAdded.length > 0) {
        // Get character rarity from tags
        const rarityTag = character.tags.rarity?.[0];
        const rarity = rarityTag ? parseInt(rarityTag.split('-')[1], 10) : 0;

        // Calculate level gap (smaller gap = higher priority since cheaper to train)
        const levelGap = targetLevel - currentLevel;

        // Calculate priority based on strategy
        const priority = strategy === 'bonus-first'
          ? 1000.0 * bonusesAdded.length +
            100.0 * commissionsUnlocked.length +
            1.0 * rarity -
            0.5 * levelGap
          : 1000.0 * commissionsUnlocked.length +
            10.0 * bonusesAdded.length +
            1.0 * rarity -
            0.5 * levelGap;

        // Create a key based on which commissions are unlocked (sorted for consistency)
        const impactKey = [...commissionsUnlocked].sort().join(',') + '|' + [...bonusesAdded].sort().join(',');

        // Only keep the minimum level target for each unique impact
        const existing = impactMap.get(impactKey);
        if (!existing || targetLevel < existing.targetLevel) {
          impactMap.set(impactKey, {
            targetLevel,
            commissionsUnlocked,
            bonusesAdded,
            priority,
          });
        }
      }
    }

    // Add recommendations for this character (only minimum levels for each impact)
    for (const impact of impactMap.values()) {
      const rarityTag = character.tags.rarity?.[0];
      const rarity = rarityTag ? parseInt(rarityTag.split('-')[1], 10) : 0;

      recommendations.push({
        characterId: character.id,
        characterName: character.name,
        characterRarity: rarity,
        currentLevel,
        targetLevel: impact.targetLevel,
        impact: {
          commissionsUnlocked: impact.commissionsUnlocked,
          bonusesAdded: impact.bonusesAdded,
        },
        priority: impact.priority,
      });
    }
  }

  // Sort by priority descending and limit to top 20
  recommendations.sort((a, b) => b.priority - a.priority);
  return recommendations.slice(0, 20);
}

// ============================================================================
// Explanation Function
// ============================================================================

/**
 * Generate a human-readable explanation for a training recommendation
 *
 * @param recommendation Training recommendation to explain
 * @param commissions Array of all commissions
 * @param lang Language for commission names (defaults to Japanese)
 * @returns Human-readable explanation string
 */
export function explainRecommendation(
  recommendation: TrainingRecommendation,
  commissions: Commission[],
  lang: Language = "ja"
): string {
  const { characterName, targetLevel, impact } = recommendation;

  // Get commission names for affected commissions
  const affectedCommissionNames = impact.affectedCommissions
    .map((commissionId) => {
      const commission = commissions.find((m) => m.id === commissionId);
      return commission ? commission.name[lang] || commission.name.ja : commissionId;
    })
    .slice(0, 3); // Limit to first 3 commissions for readability

  // Build explanation parts
  const parts: string[] = [];

  if (impact.baseConditionsUnlocked > 0) {
    const commissionText =
      impact.baseConditionsUnlocked === 1 ? "commission" : "commissions";
    parts.push(`Unlocks ${impact.baseConditionsUnlocked} ${commissionText}`);
  }

  if (impact.bonusConditionsAdded > 0) {
    const commissionText =
      impact.bonusConditionsAdded === 1 ? "commission" : "commissions";
    parts.push(`adds bonus to ${impact.bonusConditionsAdded} ${commissionText}`);
  }

  const impactDescription = parts.join(", ");
  const commissionList =
    affectedCommissionNames.length > 0
      ? ` (${affectedCommissionNames.join(", ")}${impact.affectedCommissions.length > 3 ? ", ..." : ""})`
      : "";

  return `Level ${characterName} to ${targetLevel}: ${impactDescription}${commissionList}`;
}
