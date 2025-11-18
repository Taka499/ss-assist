/**
 * Data Loading Layer
 *
 * Loads JSON data files, builds bitmask lookup tables, and provides
 * helper functions for tag resolution and data filtering.
 */

import type {
  TagDict,
  Character,
  Commission,
  Item,
  Category,
  Language,
} from "../types";
import { buildBitmaskLookup, type BitmaskLookup } from "./bitmask";

// ============================================================================
// Data Storage
// ============================================================================

let tagsData: TagDict | null = null;
let charactersData: Character[] | null = null;
let commissionsData: Commission[] | null = null;
let itemsData: Item[] | null = null;
let bitmaskLookup: BitmaskLookup | null = null;

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Load all data files and initialize bitmask lookup tables
 * @throws Error if data loading fails
 */
export async function loadData(): Promise<void> {
  try {
    // Dynamic imports for JSON files (Vite handles these efficiently)
    const [tagsModule, charactersModule, commissionsModule, itemsModule] = await Promise.all([
      import("../../data/tags.json"),
      import("../../data/characters.json"),
      import("../../data/commissions.json"),
      import("../../data/items.json"),
    ]);

    tagsData = tagsModule.default as TagDict;
    charactersData = charactersModule.default as Character[];
    commissionsData = commissionsModule.default as Commission[];
    itemsData = itemsModule.default as Item[];

    // Build bitmask lookup table from tags
    bitmaskLookup = buildBitmaskLookup(tagsData);
  } catch (error) {
    console.error("Failed to load data:", error);
    throw new Error("Failed to load game data. Please refresh the page.");
  }
}

/**
 * Get tags dictionary
 * @throws Error if data not loaded
 */
export function getTags(): TagDict {
  if (!tagsData) {
    throw new Error("Data not loaded. Call loadData() first.");
  }
  return tagsData;
}

/**
 * Get all characters
 * @throws Error if data not loaded
 */
export function getCharacters(): Character[] {
  if (!charactersData) {
    throw new Error("Data not loaded. Call loadData() first.");
  }
  return charactersData;
}

/**
 * Get all commissions
 * @throws Error if data not loaded
 */
export function getCommissions(): Commission[] {
  if (!commissionsData) {
    throw new Error("Data not loaded. Call loadData() first.");
  }
  return commissionsData;
}

/**
 * Get bitmask lookup table
 * @throws Error if data not loaded
 */
export function getBitmaskLookup(): BitmaskLookup {
  if (!bitmaskLookup) {
    throw new Error("Data not loaded. Call loadData() first.");
  }
  return bitmaskLookup;
}

/**
 * Get all items
 * @throws Error if data not loaded
 */
export function getItems(): Item[] {
  if (!itemsData) {
    throw new Error("Data not loaded. Call loadData() first.");
  }
  return itemsData;
}

/**
 * Check if data has been loaded
 */
export function isDataLoaded(): boolean {
  return !!(tagsData && charactersData && commissionsData && itemsData && bitmaskLookup);
}

// ============================================================================
// Tag Resolution
// ============================================================================

/**
 * Resolve a tag ID to its localized name
 * @param tagId Tag ID (e.g., "role-001")
 * @param lang Language code (defaults to "ja")
 * @returns Localized tag name or tag ID if not found
 */
export function resolveTagName(tagId: string, lang: Language = "ja"): string {
  if (!tagsData) {
    return tagId;
  }

  // Find which category the tag belongs to
  for (const category of Object.keys(tagsData) as Category[]) {
    const tag = tagsData[category].find((t) => t.id === tagId);
    if (tag) {
      // Return localized name, fallback to Japanese if not available
      return tag[lang] || tag.ja || tagId;
    }
  }

  return tagId;
}

/**
 * Get all tags in a category with localized names
 * @param category Tag category
 * @param lang Language code (defaults to "ja")
 * @returns Array of {id, name} objects
 */
export function getTagsInCategory(
  category: Category,
  lang: Language = "ja"
): Array<{ id: string; name: string }> {
  if (!tagsData) {
    return [];
  }

  return tagsData[category].map((tag) => ({
    id: tag.id,
    name: tag[lang] || tag.ja,
  }));
}

// ============================================================================
// Character Filtering
// ============================================================================

/**
 * Get characters that have a specific tag
 * @param tagId Tag ID to filter by
 * @returns Array of characters with the specified tag
 */
export function getCharactersByTag(tagId: string): Character[] {
  if (!charactersData) {
    return [];
  }

  return charactersData.filter((char) => {
    // Check all categories for the tag
    return Object.values(char.tags).some((tagArray) =>
      tagArray?.includes(tagId)
    );
  });
}

/**
 * Get characters by multiple tag IDs (AND logic - character must have all tags)
 * @param tagIds Array of tag IDs
 * @returns Array of characters with all specified tags
 */
export function getCharactersByTags(tagIds: string[]): Character[] {
  if (!charactersData || tagIds.length === 0) {
    return charactersData || [];
  }

  return charactersData.filter((char) => {
    return tagIds.every((tagId) =>
      Object.values(char.tags).some((tagArray) => tagArray?.includes(tagId))
    );
  });
}

/**
 * Get character by ID
 * @param charId Character ID
 * @returns Character or undefined if not found
 */
export function getCharacterById(charId: string): Character | undefined {
  if (!charactersData) {
    return undefined;
  }
  return charactersData.find((char) => char.id === charId);
}

// ============================================================================
// Commission Filtering
// ============================================================================

/**
 * Get commissions that require a specific tag
 * @param tagId Tag ID to filter by
 * @returns Array of commissions that require the specified tag
 */
export function getCommissionsByTag(tagId: string): Commission[] {
  if (!commissionsData) {
    return [];
  }

  return commissionsData.filter((commission) => {
    // Check both base and bonus conditions
    const allConditions = [
      ...commission.baseConditions,
      ...(commission.bonusConditions || []),
    ];

    return allConditions.some((condition) => condition.anyOf.includes(tagId));
  });
}

/**
 * Get commissions by required level range
 * @param minLevel Minimum required level (inclusive)
 * @param maxLevel Maximum required level (inclusive), optional
 * @returns Array of commissions within the level range
 */
export function getCommissionsByLevel(
  minLevel: number,
  maxLevel?: number
): Commission[] {
  if (!commissionsData) {
    return [];
  }

  return commissionsData.filter((commission) => {
    if (maxLevel !== undefined) {
      return (
        commission.requiredLevel >= minLevel && commission.requiredLevel <= maxLevel
      );
    }
    return commission.requiredLevel >= minLevel;
  });
}

/**
 * Get commission by ID
 * @param commissionId Commission ID
 * @returns Commission or undefined if not found
 */
export function getCommissionById(commissionId: string): Commission | undefined {
  if (!commissionsData) {
    return undefined;
  }
  return commissionsData.find((commission) => commission.id === commissionId);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get localized name for a character
 * @param character Character object
 * @param lang Language code (defaults to "ja")
 * @returns Localized character name
 */
export function getCharacterName(
  character: Character,
  lang: Language = "ja"
): string {
  return character.name[lang] || character.name.ja;
}

/**
 * Get localized name for a commission
 * @param commission Commission object
 * @param lang Language code (defaults to "ja")
 * @returns Localized commission name
 */
export function getCommissionName(commission: Commission, lang: Language = "ja"): string {
  return commission.name[lang] || commission.name.ja;
}

/**
 * Get item by ID
 * @param itemId Item ID
 * @returns Item or undefined if not found
 */
export function getItemById(itemId: string): Item | undefined {
  if (!itemsData) {
    return undefined;
  }
  return itemsData.find((item) => item.id === itemId);
}

/**
 * Reset all loaded data (useful for testing)
 */
export function resetData(): void {
  tagsData = null;
  charactersData = null;
  commissionsData = null;
  itemsData = null;
  bitmaskLookup = null;
}
