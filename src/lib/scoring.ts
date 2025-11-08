/**
 * Training Priority Scoring System
 *
 * Analyzes the impact of leveling characters and recommends which characters
 * to prioritize for maximum mission unlock potential.
 */

import type { Character, Mission, TagDict, Language } from "../types";
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
    baseConditionsUnlocked: number; // Missions that become satisfiable
    bonusConditionsAdded: number; // Missions where bonus becomes achievable
    affectedMissions: string[]; // Mission IDs impacted
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
 * Simulates upgrading the character and compares mission outcomes before/after:
 * - Missions that become satisfiable (base conditions unlock)
 * - Missions where bonus becomes achievable
 *
 * @param characterId Character to evaluate
 * @param targetLevel Target level for training
 * @param missions Array of missions to evaluate against
 * @param ownedCharacters All owned characters
 * @param currentLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table for efficient validation
 * @returns Impact object with counts of unlocked missions and affected mission IDs
 */
export function calculateTrainingImpact(
  characterId: string,
  targetLevel: number,
  missions: Mission[],
  ownedCharacters: Character[],
  currentLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): TrainingRecommendation["impact"] {

  let baseConditionsUnlocked = 0;
  let bonusConditionsAdded = 0;
  const affectedMissions: string[] = [];

  // Create upgraded levels map
  const upgradedLevels = { ...currentLevels, [characterId]: targetLevel };

  for (const mission of missions) {
    // Run combination search with current levels
    const beforeResult = findCombinations(
      mission,
      ownedCharacters,
      currentLevels,
      bitmaskLookup
    );

    // Run combination search with upgraded level
    const afterResult = findCombinations(
      mission,
      ownedCharacters,
      upgradedLevels,
      bitmaskLookup
    );

    // A mission is "completable" if there's at least one combination with no level deficits
    const beforeCompletable = beforeResult.combinations.some(
      (c) => Object.keys(c.levelDeficits).length === 0
    );
    const afterCompletable = afterResult.combinations.some(
      (c) => Object.keys(c.levelDeficits).length === 0
    );

    // Check if mission became completable (base conditions unlock)
    if (!beforeCompletable && afterCompletable) {
      baseConditionsUnlocked++;
      affectedMissions.push(mission.id);
      continue; // Don't double-count for bonus
    }

    // Check if bonus became achievable
    // A mission has bonus added if:
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
      affectedMissions.push(mission.id);
    }
  }

  return {
    baseConditionsUnlocked,
    bonusConditionsAdded,
    affectedMissions,
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
 * - How many missions the training would unlock (base conditions)
 * - How many missions would gain bonus conditions
 * - The level gap (penalizes expensive training slightly)
 * - Character's tag rarity (rewards rare tags)
 *
 * Score formula: score = w1 * baseUnlocked + w2 * bonusAdded - w3 * levelGap + w4 * rarityBonus
 *
 * @param missions Array of missions to evaluate
 * @param ownedCharacters Array of owned characters
 * @param currentLevels Map of character ID to current level
 * @param bitmaskLookup Bitmask lookup table for efficient validation
 * @param tags Tag dictionary for rarity calculation
 * @param weights Scoring weights (uses DEFAULT_WEIGHTS if not provided)
 * @returns Array of training recommendations sorted by score (highest first)
 */
export function calculateTrainingPriority(
  missions: Mission[],
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
        missions,
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
// Explanation Function
// ============================================================================

/**
 * Generate a human-readable explanation for a training recommendation
 *
 * @param recommendation Training recommendation to explain
 * @param missions Array of all missions
 * @param lang Language for mission names (defaults to Japanese)
 * @returns Human-readable explanation string
 */
export function explainRecommendation(
  recommendation: TrainingRecommendation,
  missions: Mission[],
  lang: Language = "ja"
): string {
  const { characterName, targetLevel, impact } = recommendation;

  // Get mission names for affected missions
  const affectedMissionNames = impact.affectedMissions
    .map((missionId) => {
      const mission = missions.find((m) => m.id === missionId);
      return mission ? mission.name[lang] || mission.name.ja : missionId;
    })
    .slice(0, 3); // Limit to first 3 missions for readability

  // Build explanation parts
  const parts: string[] = [];

  if (impact.baseConditionsUnlocked > 0) {
    const missionText =
      impact.baseConditionsUnlocked === 1 ? "mission" : "missions";
    parts.push(`Unlocks ${impact.baseConditionsUnlocked} ${missionText}`);
  }

  if (impact.bonusConditionsAdded > 0) {
    const missionText =
      impact.bonusConditionsAdded === 1 ? "mission" : "missions";
    parts.push(`adds bonus to ${impact.bonusConditionsAdded} ${missionText}`);
  }

  const impactDescription = parts.join(", ");
  const missionList =
    affectedMissionNames.length > 0
      ? ` (${affectedMissionNames.join(", ")}${impact.affectedMissions.length > 3 ? ", ..." : ""})`
      : "";

  return `Level ${characterName} to ${targetLevel}: ${impactDescription}${missionList}`;
}
