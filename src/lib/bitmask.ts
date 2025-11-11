/**
 * Bitmask System for Efficient Tag Matching
 *
 * This module implements a bitmask-based optimization for checking whether character
 * combinations satisfy mission conditions. Each tag within a category is assigned a
 * unique bit position, allowing set operations (union, intersection) to be performed
 * using fast bitwise operations instead of array/set manipulations.
 *
 * Key concepts:
 * - Each category (role, style, faction, element, rarity) has an independent 32-bit space
 * - Tags within a category are assigned bits 0, 1, 2, ... up to 31 (max 32 tags per category)
 * - Character tags are represented as bitmasks with bits set to 1 for each possessed tag
 * - Mission conditions (anyOf arrays) are also represented as bitmasks
 * - Combination checking is O(1) using bitwise AND: (combo & condition) !== 0
 */

import type { TagDict, Character, Condition, Category } from '../types/index.js';

/**
 * Category-specific bitmasks
 * Each category has its own independent bitmask (32-bit integer)
 */
export interface CategoryBitmasks {
  role: number;
  style: number;
  faction: number;
  element: number;
  rarity: number;
}

/**
 * Mapping from a tag ID to its bit position within its category
 */
export interface BitPosition {
  tagId: string;
  category: Category;
  bit: number;
}

/**
 * Complete bitmask lookup table
 * Maps tag IDs to bit positions and tracks how many bits are used per category
 */
export interface BitmaskLookup {
  tagToBit: Map<string, BitPosition>;
  categoryBits: Record<Category, number>; // Number of bits used per category
}

/**
 * Maximum number of tags allowed per category (JavaScript bitwise operations use 32 bits)
 */
const MAX_TAGS_PER_CATEGORY = 32;

/**
 * Build a bitmask lookup table from the tag dictionary
 *
 * Assigns each tag a unique bit position within its category. For example:
 * - role-001 � bit 0
 * - role-002 � bit 1
 * - style-001 � bit 0 (separate namespace)
 *
 * @param tags - The tag dictionary from tags.json
 * @returns A lookup table mapping tag IDs to bit positions
 * @throws Error if any category has more than 32 tags
 */
export function buildBitmaskLookup(tags: TagDict): BitmaskLookup {
  const tagToBit = new Map<string, BitPosition>();
  const categoryBits: Record<Category, number> = {
    role: 0,
    style: 0,
    faction: 0,
    element: 0,
    rarity: 0,
  };

  // Process each category
  for (const category of Object.keys(tags) as Category[]) {
    const categoryTags = tags[category];

    if (!categoryTags) continue;

    // Check tag count limit
    if (categoryTags.length > MAX_TAGS_PER_CATEGORY) {
      throw new Error(
        `Category '${category}' has ${categoryTags.length} tags, ` +
        `exceeding the maximum of ${MAX_TAGS_PER_CATEGORY}`
      );
    }

    // Assign bit positions
    categoryTags.forEach((tag, index) => {
      tagToBit.set(tag.id, {
        tagId: tag.id,
        category,
        bit: index,
      });
    });

    categoryBits[category] = categoryTags.length;
  }

  return { tagToBit, categoryBits };
}

/**
 * Convert a character's tags to category-wise bitmasks
 *
 * For each category, creates a bitmask with bits set for each tag the character possesses.
 * For example, if a character has role-001 (bit 0) and role-003 (bit 2):
 * role bitmask = 0b00000101 (decimal 5)
 *
 * @param character - The character whose tags to convert
 * @param lookup - The bitmask lookup table
 * @returns Category-wise bitmasks representing the character's tags
 */
export function characterToBitmask(
  character: Character,
  lookup: BitmaskLookup
): CategoryBitmasks {
  const bitmasks: CategoryBitmasks = {
    role: 0,
    style: 0,
    faction: 0,
    element: 0,
    rarity: 0,
  };

  // Process each category
  for (const category of Object.keys(character.tags) as Category[]) {
    const tagIds = character.tags[category];

    if (!tagIds || tagIds.length === 0) continue;

    // Set bits for each tag
    for (const tagId of tagIds) {
      const bitPos = lookup.tagToBit.get(tagId);

      if (!bitPos) {
        console.warn(`Tag ID '${tagId}' not found in lookup table (character: ${character.id})`);
        continue;
      }

      // Set the bit using bitwise OR
      bitmasks[category] |= (1 << bitPos.bit);
    }
  }

  return bitmasks;
}

/**
 * Convert a mission condition's anyOf array to a bitmask
 *
 * Creates a bitmask with bits set for each tag in the anyOf array.
 * This represents "at least one of these tags must be present".
 *
 * @param condition - The mission condition to convert
 * @param lookup - The bitmask lookup table
 * @returns A bitmask representing the condition's anyOf tags
 */
export function conditionToBitmask(
  condition: Condition,
  lookup: BitmaskLookup
): number {
  let mask = 0;

  for (const tagId of condition.anyOf) {
    const bitPos = lookup.tagToBit.get(tagId);

    if (!bitPos) {
      console.warn(`Tag ID '${tagId}' not found in lookup table (condition)`);
      continue;
    }

    // Set the bit using bitwise OR
    mask |= (1 << bitPos.bit);
  }

  return mask;
}

/**
 * Merge multiple characters' bitmasks using bitwise OR
 *
 * Combines the tags of all characters in a combination.
 * For example, if Character A has role-001 and Character B has role-002:
 * - A: 0b01
 * - B: 0b10
 * - Merged: 0b11 (combination has both role-001 and role-002)
 *
 * @param masks - Array of character bitmasks to merge
 * @returns A single bitmask representing the union of all tags
 */
export function mergeBitmasks(masks: CategoryBitmasks[]): CategoryBitmasks {
  const merged: CategoryBitmasks = {
    role: 0,
    style: 0,
    faction: 0,
    element: 0,
    rarity: 0,
  };

  for (const mask of masks) {
    merged.role |= mask.role;
    merged.style |= mask.style;
    merged.faction |= mask.faction;
    merged.element |= mask.element;
    merged.rarity |= mask.rarity;
  }

  return merged;
}

/**
 * Check if a combination's bitmask satisfies a condition's bitmask
 *
 * Uses bitwise AND to check for overlap. If the result is non-zero,
 * at least one required tag is present.
 *
 * Example:
 * - Combo has role-001 and role-003: 0b0101
 * - Condition requires role-001 OR role-002: 0b0011
 * - AND result: 0b0101 & 0b0011 = 0b0001 (non-zero, satisfied!)
 *
 * @param comboMask - The combination's bitmask for a category
 * @param conditionMask - The condition's bitmask for the same category
 * @returns true if the condition is satisfied, false otherwise
 */
export function satisfiesCondition(
  comboMask: number,
  conditionMask: number
): boolean {
  return (comboMask & conditionMask) !== 0;
}

/**
 * Check if a combination satisfies all conditions in an array
 *
 * Iterates through each condition, converts it to a bitmask, and checks
 * if the combination's bitmask for that category satisfies it.
 * All conditions must be satisfied for the function to return true.
 *
 * **IMPORTANT:** This function uses bitmask-based checking and is suitable
 * for pruning (interactsWith optimization), but it DOES NOT handle count
 * requirements correctly. For final validation, use satisfiesAllConditionsWithCounts.
 *
 * @param comboMasks - The combination's category-wise bitmasks
 * @param conditions - Array of conditions to check
 * @param lookup - The bitmask lookup table
 * @returns true if all conditions are satisfied, false otherwise
 */
export function satisfiesAllConditions(
  comboMasks: CategoryBitmasks,
  conditions: Condition[],
  lookup: BitmaskLookup
): boolean {
  // Empty conditions array means no requirements (always satisfied)
  if (!conditions || conditions.length === 0) {
    return true;
  }

  // Check each condition
  for (const condition of conditions) {
    const conditionMask = conditionToBitmask(condition, lookup);
    const categoryMask = comboMasks[condition.category];

    // If any condition is not satisfied, return false immediately
    if (!satisfiesCondition(categoryMask, conditionMask)) {
      return false;
    }
  }

  // All conditions satisfied
  return true;
}

// ============================================================================
// Count-based Validation Functions
// ============================================================================

/**
 * Parse a condition's anyOf array to count how many times each tag ID appears
 *
 * This handles count-based requirements. For example:
 * - anyOf: ["role-002", "role-001", "role-002"]
 * - Returns: Map { "role-002" => 2, "role-001" => 1 }
 * - Meaning: Need at least 2 characters with role-002 AND at least 1 with role-001
 *
 * @param condition - The condition whose anyOf array to parse
 * @returns A map from tag ID to minimum required count
 */
export function buildConditionCounts(condition: Condition): Map<string, number> {
  const counts = new Map<string, number>();

  for (const tagId of condition.anyOf) {
    const currentCount = counts.get(tagId) || 0;
    counts.set(tagId, currentCount + 1);
  }

  return counts;
}

/**
 * Check if a character combination satisfies a condition with count requirements
 *
 * This is the correct validation function that handles missions requiring
 * multiple characters with the same tag (e.g., "2 Attackers and 1 Balancer").
 *
 * @param characters - The characters in the combination
 * @param condition - The condition to validate
 * @param category - The category of the condition (used to look up character tags)
 * @returns true if the combination meets all count requirements, false otherwise
 */
export function satisfiesConditionWithCounts(
  characters: Character[],
  condition: Condition,
  category: Category
): boolean {
  const requiredCounts = buildConditionCounts(condition);

  // For each required tag and its count, verify the combination has enough characters
  for (const [tagId, minCount] of requiredCounts) {
    let actualCount = 0;

    // Count how many characters have this tag
    for (const character of characters) {
      const charTags = character.tags[category];
      if (charTags && charTags.includes(tagId)) {
        actualCount++;
      }
    }

    // If we don't have enough characters with this tag, fail
    if (actualCount < minCount) {
      return false;
    }
  }

  // All count requirements satisfied
  return true;
}

/**
 * Check if a character combination satisfies all conditions with count requirements
 *
 * This is the main validation function to use for final combination checking.
 * It correctly handles count-based requirements.
 *
 * @param characters - The characters in the combination
 * @param conditions - Array of conditions to validate
 * @returns true if all conditions are satisfied with correct counts, false otherwise
 */
export function satisfiesAllConditionsWithCounts(
  characters: Character[],
  conditions: Condition[]
): boolean {
  // Empty conditions array means no requirements (always satisfied)
  if (!conditions || conditions.length === 0) {
    return true;
  }

  // Check each condition
  for (const condition of conditions) {
    if (!satisfiesConditionWithCounts(characters, condition, condition.category)) {
      return false;
    }
  }

  // All conditions satisfied
  return true;
}
