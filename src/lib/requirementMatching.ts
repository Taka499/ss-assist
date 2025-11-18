/**
 * Requirement Matching Helper
 *
 * Analyzes which characters satisfy which mission conditions.
 * Used for displaying requirement satisfaction in the UI.
 */

import type { Character, Condition } from '../types';
import { buildConditionCounts } from './bitmask';

/**
 * Information about a single condition's satisfaction
 */
export interface ConditionSatisfaction {
  condition: Condition;
  satisfied: boolean;
  satisfyingCharacterIds: string[]; // Character IDs that contribute to this condition
  requiredTagIds: string[]; // Tag IDs from the condition's anyOf array
}

/**
 * Analyze which characters satisfy which conditions in a team
 *
 * For each condition, identifies which character(s) in the team have tags
 * that match the condition's anyOf array, and correctly handles count-based
 * requirements (e.g., need 2 Attackers).
 *
 * @param characters Array of characters in the team
 * @param conditions Array of conditions to check
 * @returns Array of ConditionSatisfaction objects
 */
export function analyzeConditionSatisfaction(
  characters: Character[],
  conditions: Condition[]
): ConditionSatisfaction[] {
  return conditions.map((condition) => {
    const satisfyingCharacterIds: string[] = [];

    // Check each character to see if they have any tag from the condition's anyOf array
    for (const character of characters) {
      const charTags = character.tags[condition.category];
      if (!charTags) continue;

      // Check if character has any tag from the condition's anyOf
      const hasMatchingTag = condition.anyOf.some(tagId => charTags.includes(tagId));

      if (hasMatchingTag) {
        satisfyingCharacterIds.push(character.id);
      }
    }

    // Check if count requirements are met
    // For example, if anyOf is ["role-002", "role-002", "role-001"],
    // we need at least 2 characters with role-002 AND at least 1 with role-001
    const requiredCounts = buildConditionCounts(condition);
    let satisfied = true;

    for (const [tagId, minCount] of requiredCounts) {
      let actualCount = 0;

      // Count how many characters have this specific tag
      for (const character of characters) {
        const charTags = character.tags[condition.category];
        if (charTags && charTags.includes(tagId)) {
          actualCount++;
        }
      }

      // If we don't have enough characters with this tag, condition is not satisfied
      if (actualCount < minCount) {
        satisfied = false;
        break;
      }
    }

    return {
      condition,
      satisfied,
      satisfyingCharacterIds,
      requiredTagIds: condition.anyOf,
    };
  });
}

/**
 * Count how many instances of a condition are satisfied
 *
 * This handles count-based validation: e.g., "2 Attackers and 1 Balancer"
 * returns how many characters in the team satisfy the condition.
 *
 * @param characters Array of characters in the team
 * @param condition Condition to check
 * @returns Number of characters that satisfy the condition
 */
export function countConditionSatisfaction(
  characters: Character[],
  condition: Condition
): number {
  let count = 0;

  for (const character of characters) {
    const charTags = character.tags[condition.category];
    if (!charTags) continue;

    // Check if character has any tag from the condition's anyOf
    const hasMatchingTag = condition.anyOf.some(tagId => charTags.includes(tagId));

    if (hasMatchingTag) {
      count++;
    }
  }

  return count;
}

/**
 * Get the first matching tag ID for a character from a condition
 *
 * Used for displaying which specific tag a character is contributing.
 *
 * @param character Character to check
 * @param condition Condition to check against
 * @returns Tag ID if found, undefined otherwise
 */
export function getMatchingTagForCharacter(
  character: Character,
  condition: Condition
): string | undefined {
  const charTags = character.tags[condition.category];
  if (!charTags) return undefined;

  // Return the first matching tag
  for (const tagId of condition.anyOf) {
    if (charTags.includes(tagId)) {
      return tagId;
    }
  }

  return undefined;
}
