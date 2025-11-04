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
 * Amount can be a fixed number or a range (min~max)
 */
export interface RewardAmount {
  min: number;
  max: number;
}

/**
 * Item categories for organization and display
 */
export type ItemCategory =
  | "currency"          // dorra
  | "prize_egg"        // prize_egg
  | "exp_character"    // exp_trekkers_t1
  | "exp_disc"         // exp_discs_t1
  | "tier_character"   // tier-up_trekkers_*_t1
  | "tier_disc"        // tier-up_discs_*_t1
  | "skill_cartridge"   // skill_cartridge_*_t1
  | "skill_piece";        // skill_piece_t1

/**
 * Reward types (discriminated union)
 * All rewards use the same structure with an item ID and amount range
 */
export interface Reward {
  itemId: string;
  amount: RewardAmount;
  category?: ItemCategory; // Optional category for UI grouping/display
}

/**
 * Mission duration option with time and rewards
 */
export interface MissionDuration {
  hours: number;
  rewards: Reward[];
  bonusRewards: Reward[];
}

/**
 * Mission data structure
 */
export interface Mission {
  id: string;
  name: MultiLangString;
  requiredLevel: number;
  baseConditions: Condition[];
  bonusConditions?: Condition[];
  durations: MissionDuration[];
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
