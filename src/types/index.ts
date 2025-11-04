// Core type definitions for Stella Sora Request Assistant

/**
 * Tag categories used in the game
 */
export type Category = "role" | "style" | "faction" | "element" | "rarity";

/**
 * Multi-language string support for Japanese, Simplified Chinese, and Traditional Chinese
 */
export interface MultiLangString {
  ja: string;
  "zh-Hans"?: string;
  "zh-Hant"?: string;
}

/**
 * Tag entry with unique ID and multi-language labels
 */
export interface TagEntry {
  id: string;
  ja: string;
  "zh-Hans"?: string;
  "zh-Hant"?: string;
}

/**
 * Tag dictionary organized by category
 */
export interface TagDict {
  role: TagEntry[];
  style: TagEntry[];
  faction: TagEntry[];
  element: TagEntry[];
  rarity: TagEntry[];
}

/**
 * Character data structure
 */
export interface Character {
  id: string;
  name: MultiLangString;
  icon: string;
  tags: Partial<Record<Category, string[]>>;
}

/**
 * Condition for mission requirements
 * Uses anyOf logic: at least one tag from the array must match
 */
export interface Condition {
  category: Category;
  anyOf: string[];
}

/**
 * Reward types (discriminated union)
 */
export type Reward =
  | { type: "gold"; amount: number }
  | { type: "item"; id: string; amount: number }
  | { type: "exp"; amount: number };

/**
 * Mission data structure
 */
export interface Mission {
  id: string;
  name: MultiLangString;
  requiredLevel: number;
  baseConditions: Condition[];
  bonusConditions?: Condition[];
  rewards: Reward[];
}

/**
 * LocalStorage data structures
 */
export interface AppState {
  ownedCharacters: string[];
  levels: Record<string, number>;
  selectedMissions: string[];
}

/**
 * Language options
 */
export type Language = "ja" | "zh-Hans" | "zh-Hant";

/**
 * Character combination result
 */
export interface Combo {
  characters: Character[];
  satisfiesBase: boolean;
  satisfiesBonus: boolean;
  mask: number;
}

/**
 * Training recommendation result
 */
export interface TrainingRecommendation {
  characterId: string;
  currentLevel: number;
  targetLevel: number;
  impact: {
    missionsUnlocked: number;
    bonusesAchieved: number;
  };
  score: number;
}

/**
 * Bitmask lookup table for efficient tag matching
 */
export interface BitmaskLookup {
  tagToBit: Record<string, number>;
  categoryBitRanges: Record<Category, { start: number; count: number }>;
}
