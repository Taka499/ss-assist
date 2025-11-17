// Core type definitions for Stella Sora Request Assistant

/**
 * Tag categories used in the game
 */
export type Category = "role" | "style" | "faction" | "element" | "rarity";

/**
 * Multi-language string support for Japanese, Simplified Chinese, Traditional Chinese, and English
 */
export interface MultiLangString {
  ja: string;
  "zh-Hans"?: string;
  "zh-Hant"?: string;
  en?: string;
}

/**
 * Tag entry with unique ID and multi-language labels
 */
export interface TagEntry {
  id: string;
  ja: string;
  "zh-Hans"?: string;
  "zh-Hant"?: string;
  en?: string;
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
 * Item data structure
 */
export interface Item {
  id: string;
  name: MultiLangString;
  tier: number;
  icon: string;
}

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
export type Language = "ja" | "zh-Hans" | "zh-Hant" | "en";

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
 * Bitmask lookup table for efficient tag matching
 */
export interface BitmaskLookup {
  tagToBit: Record<string, number>;
  categoryBitRanges: Record<Category, { start: number; count: number }>;
}

/**
 * Mission coverage for a single combination
 * Tracks which missions a combination satisfies and to what degree
 */
export interface MissionCoverage {
  missionId: string;
  satisfiesBase: boolean;
  satisfiesBonus: boolean;
  meetsLevelRequirement: boolean;
}

/**
 * Multi-mission combination search result
 * Contains combinations that are validated against multiple missions simultaneously
 */
export interface MultiMissionCombinationResult {
  combinations: Array<{
    characterIds: string[];
    missionCoverage: MissionCoverage[];
    score: number; // Overall score based on coverage breadth and depth
    contributingTags: string[]; // Tag IDs that satisfied conditions
  }>;
  totalCandidatesGenerated: number;
  totalCandidatesValidated: number;
  pruningStats: {
    charactersPruned: number;
    charactersRemaining: number;
  };
}

/**
 * A combination that is blocked only by level requirements
 * Must satisfy all tag/role conditions but have at least one character below required level
 */
export interface BlockedCombination {
  characterIds: string[];
  meetsBaseConditions: boolean;    // Always true for blocked teams
  meetsBonusConditions: boolean;   // May be true or false
  levelDeficits: Record<string, number>;  // characterId → (requiredLevel - currentLevel)
}

/**
 * Candidate teams for a single mission, separated by level sufficiency
 */
export interface PerMissionCandidates {
  missionId: string;
  readyTeams: Array<{
    characterIds: string[];
    meetsBaseConditions: boolean;
    meetsBonusConditions: boolean;
    contributingTags: string[];
  }>;
  blockedTeams: BlockedCombination[];
}

/**
 * Assignment of a team to a mission (or indication that mission is unassigned)
 */
export interface MissionAssignment {
  missionId: string;
  missionValue: number;         // Number of base conditions (1-3)
  team: {
    characterIds: string[];
    totalRarity: number;        // For display only
    satisfiesBonus: boolean;
  } | null;  // null = unassigned
  blockedTeam?: {               // Best blocked team (for unassigned missions)
    characterIds: string[];
    levelDeficits: Record<string, number>;  // characterId → level gap
    satisfiesBonus: boolean;
  };
}

/**
 * Result of multi-mission disjoint assignment
 */
export interface MultiMissionAssignmentResult {
  assignments: MissionAssignment[];

  stats: {
    totalMissionValue: number;    // Sum of assigned mission values
    missionsAssigned: number;
    missionsTotal: number;
    totalCharactersUsed: number;
    totalRarity: number;          // For display only
    unassignedMissionIds: string[];
  };

  trainingRecommendations: TrainingRecommendationNew[];  // Filled in Milestone 3

  debug: {
    candidatesGenerated: number;
    dfsNodesExplored: number;
  };
}

/**
 * Training recommendation (new structure for multi-mission disjoint assignment)
 */
export interface TrainingRecommendationNew {
  characterId: string;
  characterName: MultiLangString;
  characterRarity: number;
  currentLevel: number;
  targetLevel: number;
  impact: {
    missionsUnlocked: string[];
    bonusesAdded: string[];
  };
  priority: number;
}
