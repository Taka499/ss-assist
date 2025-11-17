/**
 * Training Priority Scoring System
 *
 * Analyzes the impact of leveling characters and recommends which characters
 * to prioritize for maximum mission unlock potential.
 */

import type { Character, Mission, TagDict, Language, BlockedCombination, TrainingRecommendationNew } from "../types";
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
// Multi-Mission Training Priority (using Blocked Teams)
// ============================================================================

/**
 * Calculate training priority from blocked teams for unassigned missions
 *
 * This function analyzes which characters, when leveled up, would unlock
 * currently unassigned missions by satisfying their level requirements.
 *
 * Scoring formula: 1000.0 × missionsUnlocked + 10.0 × bonusesAdded + 1.0 × rarity
 *
 * @param unassignedMissions Missions that could not be assigned in current state
 * @param blockedTeamsByMission Map of mission ID to its blocked teams
 * @param characters All owned characters
 * @param characterLevels Current levels of all characters
 * @returns Array of training recommendations sorted by priority (highest first), limited to top 20
 */
export function calculateTrainingPriorityFromBlockedTeams(
  unassignedMissions: Mission[],
  blockedTeamsByMission: Map<string, BlockedCombination[]>,
  characters: Character[],
  characterLevels: Record<string, number>
): TrainingRecommendationNew[] {
  // Build a map of character -> missions they could help unlock
  const characterToMissions = new Map<string, Set<string>>();

  for (const mission of unassignedMissions) {
    const blockedTeams = blockedTeamsByMission.get(mission.id) || [];

    for (const team of blockedTeams) {
      // For each character in this blocked team, record that they could help unlock this mission
      for (const charId of team.characterIds) {
        if (!characterToMissions.has(charId)) {
          characterToMissions.set(charId, new Set());
        }
        characterToMissions.get(charId)!.add(mission.id);
      }
    }
  }

  // For each character, determine level targets and calculate impact
  const recommendations: TrainingRecommendationNew[] = [];

  for (const character of characters) {
    const currentLevel = characterLevels[character.id] || 1;
    const potentialMissions = characterToMissions.get(character.id);

    if (!potentialMissions || potentialMissions.size === 0) {
      continue; // This character doesn't appear in any blocked teams
    }

    // Determine meaningful level targets for this character
    const levelTargets = new Set<number>();

    // Add mission required levels
    for (const missionId of potentialMissions) {
      const mission = unassignedMissions.find(m => m.id === missionId);
      if (mission && mission.requiredLevel > currentLevel) {
        levelTargets.add(mission.requiredLevel);
      }
    }

    // Add standard milestones above current level
    for (const milestone of LEVEL_MILESTONES) {
      if (milestone > currentLevel) {
        levelTargets.add(milestone);
      }
    }

    // For each target level, simulate the upgrade and check impact
    for (const targetLevel of levelTargets) {
      const missionsUnlocked: string[] = [];
      const bonusesAdded: string[] = [];

      // Check each mission this character could help unlock
      for (const missionId of potentialMissions) {
        const mission = unassignedMissions.find(m => m.id === missionId);
        if (!mission) continue;

        const blockedTeams = blockedTeamsByMission.get(missionId) || [];

        // Check if there's a blocked team that would become valid with this upgrade
        for (const team of blockedTeams) {
          if (!team.characterIds.includes(character.id)) {
            continue; // This team doesn't include our character
          }

          // Check if ALL characters in this team would meet level requirements
          // with our character upgraded to targetLevel
          let teamWouldBeValid = true;
          for (const charId of team.characterIds) {
            const currentLevel = characterLevels[charId] || 1;
            const deficit = team.levelDeficits[charId] || 0;
            const requiredLevel = currentLevel + deficit;
            const actualLevel = charId === character.id ? targetLevel : currentLevel;

            if (actualLevel < requiredLevel) {
              teamWouldBeValid = false;
              break;
            }
          }

          if (teamWouldBeValid) {
            // This mission would be unlocked
            if (!missionsUnlocked.includes(missionId)) {
              if (team.meetsBaseConditions) {
                missionsUnlocked.push(missionId);
              }
              if (team.meetsBonusConditions) {
                bonusesAdded.push(missionId);
              }
            }
            break; // Only count this mission once
          }
        }
      }

      // Calculate score if this training would have any impact
      if (missionsUnlocked.length > 0 || bonusesAdded.length > 0) {
        // Get character rarity from tags
        const rarityTag = character.tags.rarity?.[0];
        const rarity = rarityTag ? parseInt(rarityTag.split('-')[1], 10) : 0;

        const priority =
          1000.0 * missionsUnlocked.length +
          10.0 * bonusesAdded.length +
          1.0 * rarity;

        recommendations.push({
          characterId: character.id,
          characterName: character.name,
          characterRarity: rarity,
          currentLevel,
          targetLevel,
          impact: {
            missionsUnlocked,
            bonusesAdded,
          },
          priority,
        });
      }
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
