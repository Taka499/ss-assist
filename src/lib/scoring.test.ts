import { describe, it, expect } from "vitest";
import type { TagDict, Character, Commission, Condition, Category, BlockedCombination } from "../types";
import {
  calculateTagRarity,
  calculateCharacterRarity,
  calculateTrainingImpact,
  calculateTrainingPriority,
  calculateTrainingPriorityFromBlockedTeams,
  explainRecommendation,
  DEFAULT_WEIGHTS,
  LEVEL_MILESTONES,
  type TrainingRecommendation,
  type ScoringWeights,
} from "./scoring";
import { buildBitmaskLookup } from "./bitmask";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestTagDict = (): TagDict => ({
  role: [
    { id: "role-001", ja: "バランサー" },
    { id: "role-002", ja: "アタッカー" },
    { id: "role-003", ja: "サポーター" },
  ],
  style: [
    { id: "style-001", ja: "収集者" },
    { id: "style-002", ja: "戦闘者" },
    { id: "style-003", ja: "探索者" },
  ],
  faction: [
    { id: "faction-001", ja: "空白" },
    { id: "faction-002", ja: "ステラソラ" },
    { id: "faction-003", ja: "深淵" },
  ],
  element: [
    { id: "element-001", ja: "火" },
    { id: "element-002", ja: "水" },
  ],
  rarity: [
    { id: "rarity-005", ja: "5" },
    { id: "rarity-004", ja: "4" },
  ],
});

const createTestCharacter = (
  id: string,
  tags: Partial<Record<Category, string[]>>
): Character => ({
  id,
  name: { ja: id },
  icon: `assets/characters/${id}.png`,
  tags,
});

const createTestCommission = (
  id: string,
  requiredLevel: number,
  baseConditions: Condition[],
  bonusConditions?: Condition[]
): Commission => ({
  id,
  name: { ja: id },
  requiredLevel,
  baseConditions,
  bonusConditions,
  durations: [],
});

// ============================================================================
// Tests
// ============================================================================

describe("Scoring System", () => {
  describe("calculateTagRarity", () => {
    it("calculates correct rarity scores for tags", () => {
      const tags = createTestTagDict();
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-001"] }),
        createTestCharacter("char3", { role: ["role-002"] }),
      ];

      const rarityMap = calculateTagRarity(characters, tags);

      // role-001 appears in 2 characters: rarity = 1/(2+1) = 0.333...
      expect(rarityMap.get("role-001")).toBeCloseTo(1 / 3, 3);

      // role-002 appears in 1 character: rarity = 1/(1+1) = 0.5
      expect(rarityMap.get("role-002")).toBeCloseTo(0.5, 3);

      // role-003 doesn't appear: not in map
      expect(rarityMap.has("role-003")).toBe(false);
    });

    it("handles characters with multiple tags", () => {
      const tags = createTestTagDict();
      const characters: Character[] = [
        createTestCharacter("char1", {
          role: ["role-001"],
          style: ["style-001"],
        }),
        createTestCharacter("char2", {
          role: ["role-001"],
          style: ["style-001"],
        }),
        createTestCharacter("char3", {
          role: ["role-002"],
          style: ["style-002"],
        }),
      ];

      const rarityMap = calculateTagRarity(characters, tags);

      // Both role-001 and style-001 appear in 2 characters
      expect(rarityMap.get("role-001")).toBeCloseTo(1 / 3, 3);
      expect(rarityMap.get("style-001")).toBeCloseTo(1 / 3, 3);

      // role-002 and style-002 appear in 1 character each
      expect(rarityMap.get("role-002")).toBeCloseTo(0.5, 3);
      expect(rarityMap.get("style-002")).toBeCloseTo(0.5, 3);
    });

    it("handles empty character array", () => {
      const tags = createTestTagDict();
      const characters: Character[] = [];

      const rarityMap = calculateTagRarity(characters, tags);

      expect(rarityMap.size).toBe(0);
    });
  });

  describe("calculateCharacterRarity", () => {
    it("sums rarity scores for all character tags", () => {
      const rarityMap = new Map<string, number>([
        ["role-001", 0.5],
        ["style-001", 0.333],
        ["faction-001", 0.25],
      ]);

      const character = createTestCharacter("char1", {
        role: ["role-001"],
        style: ["style-001"],
        faction: ["faction-001"],
      });

      const totalRarity = calculateCharacterRarity(character, rarityMap);

      // 0.5 + 0.333 + 0.25 = 1.083
      expect(totalRarity).toBeCloseTo(1.083, 3);
    });

    it("handles characters with multiple tags in same category", () => {
      const rarityMap = new Map<string, number>([
        ["role-001", 0.5],
        ["role-002", 0.333],
      ]);

      const character = createTestCharacter("char1", {
        role: ["role-001", "role-002"],
      });

      const totalRarity = calculateCharacterRarity(character, rarityMap);

      // 0.5 + 0.333 = 0.833
      expect(totalRarity).toBeCloseTo(0.833, 3);
    });

    it("returns 0 for characters with no tags in rarity map", () => {
      const rarityMap = new Map<string, number>([["role-001", 0.5]]);

      const character = createTestCharacter("char1", {
        style: ["style-001"], // Not in rarity map
      });

      const totalRarity = calculateCharacterRarity(character, rarityMap);

      expect(totalRarity).toBe(0);
    });
  });

  describe("calculateTrainingImpact", () => {
    it("detects missions unlocked by leveling", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 30, char2: 40 };

      // Training char1 to 50 should unlock mission1
      const impact = calculateTrainingImpact(
        "char1",
        50,
        commissions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(1);
      expect(impact.bonusConditionsAdded).toBe(0);
      expect(impact.affectedCommissions).toContain("commission1");
    });

    it("detects bonus conditions added by leveling", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission(
          "commission1",
          40,
          [{ category: "role", anyOf: ["role-001"] }],
          [{ category: "role", anyOf: ["role-002"] }]
        ),
      ];

      // char1 at 50 satisfies base, char2 at 30 doesn't meet level requirement for bonus
      const currentLevels = { char1: 50, char2: 30 };

      // Training char2 to 40 should enable bonus
      const impact = calculateTrainingImpact(
        "char2",
        40,
        commissions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(0);
      expect(impact.bonusConditionsAdded).toBe(1);
      expect(impact.affectedCommissions).toContain("commission1");
    });

    it("handles missions that require multiple characters", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
        createTestCharacter("char3", { role: ["role-002"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-002", "role-001", "role-002"] }, // Requires 2x role-002, 1x role-001
        ]),
      ];

      const currentLevels = { char1: 60, char2: 60, char3: 30 };

      // Training char3 to 50 should unlock mission1
      const impact = calculateTrainingImpact(
        "char3",
        50,
        commissions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(1);
    });

    it("returns zero impact when training doesn't help", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-003"] }, // Requires role-003, which no one has
        ]),
      ];

      const currentLevels = { char1: 30, char2: 40 };

      // Training char1 won't help because mission requires role-003
      const impact = calculateTrainingImpact(
        "char1",
        50,
        commissions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(0);
      expect(impact.bonusConditionsAdded).toBe(0);
      expect(impact.affectedCommissions).toHaveLength(0);
    });
  });

  describe("calculateTrainingPriority", () => {
    it("ranks characters by training impact", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestCommission("commission2", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestCommission("commission3", 50, [
          { category: "role", anyOf: ["role-002"] },
        ]),
      ];

      const currentLevels = { char1: 30, char2: 30 };

      const recommendations = calculateTrainingPriority(
        commissions,
        characters,
        currentLevels,
        bitmaskLookup,
        tags
      );

      // char1 should rank higher because it unlocks 2 missions vs char2's 1 mission
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].characterId).toBe("char1");
      expect(recommendations[0].impact.baseConditionsUnlocked).toBe(2);
    });

    it("generates recommendations for multiple level milestones", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 20 };

      const recommendations = calculateTrainingPriority(
        commissions,
        characters,
        currentLevels,
        bitmaskLookup,
        tags
      );

      // Should have recommendations for milestones: 30, 40, 50, 60, 70, 80, 90
      const char1Recs = recommendations.filter((r) => r.characterId === "char1");

      // At minimum, should recommend leveling to 50 (unlocks mission)
      const level50Rec = char1Recs.find((r) => r.targetLevel === 50);
      expect(level50Rec).toBeDefined();
      expect(level50Rec!.impact.baseConditionsUnlocked).toBe(1);
    });

    it("respects custom weights", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 40 };

      // With very high level gap penalty, should prefer smaller jumps
      const highPenaltyWeights: ScoringWeights = {
        baseConditionWeight: 3.0,
        bonusConditionWeight: 2.0,
        levelGapPenalty: 10.0, // Very high penalty
        rarityBonus: 1.0,
      };

      const recommendations = calculateTrainingPriority(
        commissions,
        characters,
        currentLevels,
        bitmaskLookup,
        tags,
        highPenaltyWeights
      );

      // The 50 level recommendation might have very low or negative score due to high penalty
      // But 60, 70, etc. should have even lower scores
      const sortedByLevel = recommendations
        .filter((r) => r.characterId === "char1")
        .sort((a, b) => a.targetLevel - b.targetLevel);

      if (sortedByLevel.length > 0) {
        // First recommendation should be for the smallest level jump
        expect(sortedByLevel[0].targetLevel).toBe(50);
      }
    });

    it("filters out zero-impact recommendations", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 30, [
          { category: "role", anyOf: ["role-002"] }, // char1 doesn't have this
        ]),
      ];

      const currentLevels = { char1: 20 };

      const recommendations = calculateTrainingPriority(
        commissions,
        characters,
        currentLevels,
        bitmaskLookup,
        tags
      );

      // Should have no recommendations because training char1 doesn't help with any mission
      const char1Recs = recommendations.filter((r) => r.characterId === "char1");
      expect(char1Recs).toHaveLength(0);
    });

    it("handles all characters at max level", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 90 }; // Max level

      const recommendations = calculateTrainingPriority(
        commissions,
        characters,
        currentLevels,
        bitmaskLookup,
        tags
      );

      // Should have no recommendations for char1 (already at max)
      const char1Recs = recommendations.filter((r) => r.characterId === "char1");
      expect(char1Recs).toHaveLength(0);
    });
  });

  describe("explainRecommendation", () => {
    it("generates explanation for unlocking missions", () => {
      const recommendation: TrainingRecommendation = {
        characterId: "char1",
        characterName: "コハク",
        currentLevel: 30,
        targetLevel: 50,
        score: 8.5,
        impact: {
          baseConditionsUnlocked: 2,
          bonusConditionsAdded: 0,
          affectedCommissions: ["commission1", "commission2"],
        },
      };

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, []),
        createTestCommission("commission2", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, commissions);

      expect(explanation).toContain("コハク");
      expect(explanation).toContain("50");
      expect(explanation).toContain("Unlocks 2 commissions");
      expect(explanation).toContain("commission1");
      expect(explanation).toContain("commission2");
    });

    it("generates explanation for adding bonus conditions", () => {
      const recommendation: TrainingRecommendation = {
        characterId: "char1",
        characterName: "ミネルバ",
        currentLevel: 40,
        targetLevel: 60,
        score: 5.0,
        impact: {
          baseConditionsUnlocked: 0,
          bonusConditionsAdded: 2,
          affectedCommissions: ["commission1", "commission2"],
        },
      };

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, []),
        createTestCommission("commission2", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, commissions);

      expect(explanation).toContain("ミネルバ");
      expect(explanation).toContain("60");
      expect(explanation).toContain("adds bonus to 2 commissions");
    });

    it("generates explanation for both unlocking and bonus", () => {
      const recommendation: TrainingRecommendation = {
        characterId: "char1",
        characterName: "エレン",
        currentLevel: 35,
        targetLevel: 50,
        score: 10.0,
        impact: {
          baseConditionsUnlocked: 1,
          bonusConditionsAdded: 1,
          affectedCommissions: ["commission1", "commission2"],
        },
      };

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, []),
        createTestCommission("commission2", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, commissions);

      expect(explanation).toContain("エレン");
      expect(explanation).toContain("50");
      expect(explanation).toContain("Unlocks 1 commission");
      expect(explanation).toContain("adds bonus to 1 commission");
    });

    it("limits commission list to 3 commissions", () => {
      const recommendation: TrainingRecommendation = {
        characterId: "char1",
        characterName: "コハク",
        currentLevel: 30,
        targetLevel: 50,
        score: 15.0,
        impact: {
          baseConditionsUnlocked: 5,
          bonusConditionsAdded: 0,
          affectedCommissions: [
            "commission1",
            "commission2",
            "commission3",
            "mission4",
            "mission5",
          ],
        },
      };

      const commissions: Commission[] = [
        createTestCommission("commission1", 50, []),
        createTestCommission("commission2", 50, []),
        createTestCommission("commission3", 50, []),
        createTestCommission("mission4", 50, []),
        createTestCommission("mission5", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, commissions);

      // Should show first 3 commissions and indicate there are more
      expect(explanation).toContain("commission1");
      expect(explanation).toContain("commission2");
      expect(explanation).toContain("commission3");
      expect(explanation).toContain("...");
    });
  });

  describe("Constants", () => {
    it("has correct default weights", () => {
      expect(DEFAULT_WEIGHTS.baseConditionWeight).toBe(3.0);
      expect(DEFAULT_WEIGHTS.bonusConditionWeight).toBe(2.0);
      expect(DEFAULT_WEIGHTS.levelGapPenalty).toBe(0.05);
      expect(DEFAULT_WEIGHTS.rarityBonus).toBe(1.0);
    });

    it("has correct level milestones", () => {
      expect(LEVEL_MILESTONES).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });
  });

  describe("calculateTrainingPriorityFromBlockedTeams", () => {
    it("heavily weights commission unlocks over bonuses", () => {
      // Setup: Char A unlocks 1 mission (score = 1000 + rarity)
      //        Char B adds 2 bonuses (score = 20 + rarity)
      const characters: Character[] = [
        createTestCharacter("charA", {
          role: ["role-001"],
          rarity: ["rarity-004"]  // rarity 4
        }),
        createTestCharacter("charB", {
          role: ["role-002"],
          rarity: ["rarity-004"]  // rarity 4
        }),
      ];

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestCommission("commission2", 50, [
          { category: "role", anyOf: ["role-002"] },
        ]),
      ];

      const currentLevels = { charA: 30, charB: 30 };

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        [
          "commission1",
          [
            {
              characterIds: ["charA"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { charA: 20 }, // needs to go from 30 to 50
            },
          ],
        ],
        [
          "commission2",
          [
            {
              characterIds: ["charB"],
              meetsBaseConditions: false, // not base unlock
              meetsBonusConditions: true, // but bonus unlock
              levelDeficits: { charB: 20 },
            },
            {
              characterIds: ["charB"],
              meetsBaseConditions: false,
              meetsBonusConditions: true,
              levelDeficits: { charB: 20 },
            },
          ],
        ],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      // Char A should rank higher despite only unlocking 1 mission
      const charARec = recommendations.find(r => r.characterId === "charA");
      const charBRec = recommendations.find(r => r.characterId === "charB");

      expect(charARec).toBeDefined();
      expect(charARec!.priority).toBeCloseTo(1000 + 4, 1); // 1000 × 1 mission + 4 rarity

      if (charBRec) {
        expect(charBRec.priority).toBeCloseTo(10 * 1 + 4, 1); // 10 × 1 bonus + 4 rarity (much lower)
        expect(charARec!.priority).toBeGreaterThan(charBRec.priority);
      }
    });

    it("includes character rarity in scoring", () => {
      // 5★ char and 3★ char both unlock 1 mission
      const characters: Character[] = [
        createTestCharacter("char5Star", {
          role: ["role-001"],
          rarity: ["rarity-005"], // 5★
        }),
        createTestCharacter("char4Star", {
          role: ["role-002"],
          rarity: ["rarity-004"], // 4★
        }),
      ];

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestCommission("commission2", 50, [
          { category: "role", anyOf: ["role-002"] },
        ]),
      ];

      const currentLevels = { char5Star: 30, char4Star: 30 };

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        [
          "commission1",
          [
            {
              characterIds: ["char5Star"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char5Star: 20 },
            },
          ],
        ],
        [
          "commission2",
          [
            {
              characterIds: ["char4Star"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char4Star: 20 },
            },
          ],
        ],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      const rec5Star = recommendations.find(r => r.characterId === "char5Star");
      const rec4Star = recommendations.find(r => r.characterId === "char4Star");

      expect(rec5Star).toBeDefined();
      expect(rec4Star).toBeDefined();

      // Both unlock 1 mission (1000 points), but 5★ has higher rarity
      expect(rec5Star!.priority).toBeCloseTo(1005, 1); // 1000 + 5
      expect(rec4Star!.priority).toBeCloseTo(1004, 1); // 1000 + 4
      expect(rec5Star!.priority).toBeGreaterThan(rec4Star!.priority);
    });

    it("recommends minimum level targets to unlock missions", () => {
      // Commission requires Lv30, char at Lv20
      const characters: Character[] = [
        createTestCharacter("char1", {
          role: ["role-001"],
          rarity: ["rarity-004"]
        }),
      ];

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 30, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 20 };

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        [
          "commission1",
          [
            {
              characterIds: ["char1"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char1: 10 }, // needs to go from 20 to 30
            },
          ],
        ],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      // Should have recommendation for level 30 (minimum to unlock)
      const rec30 = recommendations.find(
        r => r.characterId === "char1" && r.targetLevel === 30
      );
      expect(rec30).toBeDefined();
      expect(rec30!.impact.commissionsUnlocked).toContain("commission1");
    });

    it("aggregates impact across multiple commissions", () => {
      // Char appears in blocked teams for 3 missions
      const characters: Character[] = [
        createTestCharacter("char1", {
          role: ["role-001"],
          rarity: ["rarity-004"]
        }),
      ];

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestCommission("commission2", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestCommission("commission3", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 30 };

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        [
          "commission1",
          [
            {
              characterIds: ["char1"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char1: 20 },
            },
          ],
        ],
        [
          "commission2",
          [
            {
              characterIds: ["char1"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char1: 20 },
            },
          ],
        ],
        [
          "commission3",
          [
            {
              characterIds: ["char1"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char1: 20 },
            },
          ],
        ],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      const rec = recommendations.find(
        r => r.characterId === "char1" && r.targetLevel === 50
      );

      expect(rec).toBeDefined();
      expect(rec!.impact.commissionsUnlocked).toHaveLength(3);
      expect(rec!.impact.commissionsUnlocked).toContain("commission1");
      expect(rec!.impact.commissionsUnlocked).toContain("commission2");
      expect(rec!.impact.commissionsUnlocked).toContain("commission3");
      expect(rec!.priority).toBeCloseTo(3000 + 4, 1); // 1000 × 3 missions + 4 rarity
    });

    it("handles characters that unlock no commissions", () => {
      // Char not in any blocked teams
      const characters: Character[] = [
        createTestCharacter("char1", {
          role: ["role-001"],
          rarity: ["rarity-004"]
        }),
        createTestCharacter("char2", {
          role: ["role-002"],
          rarity: ["rarity-004"]
        }),
      ];

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 30, char2: 30 };

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        [
          "commission1",
          [
            {
              characterIds: ["char1"], // only char1 in blocked team
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { char1: 20 },
            },
          ],
        ],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      // char2 should not have any recommendations
      const char2Recs = recommendations.filter(r => r.characterId === "char2");
      expect(char2Recs).toHaveLength(0);

      // char1 should have recommendations
      const char1Recs = recommendations.filter(r => r.characterId === "char1");
      expect(char1Recs.length).toBeGreaterThan(0);
    });

    it("limits results to top 20 recommendations", () => {
      // Create many characters with many blocked missions
      const characters: Character[] = [];
      for (let i = 0; i < 30; i++) {
        characters.push(
          createTestCharacter(`char${i}`, {
            role: ["role-001"],
            rarity: ["rarity-004"]
          })
        );
      }

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels: Record<string, number> = {};
      const blockedTeams: BlockedCombination[] = [];

      for (let i = 0; i < 30; i++) {
        currentLevels[`char${i}`] = 30;
        blockedTeams.push({
          characterIds: [`char${i}`],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: { [`char${i}`]: 20 },
        });
      }

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        ["commission1", blockedTeams],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      // Should be limited to 20 recommendations
      expect(recommendations.length).toBeLessThanOrEqual(20);
    });

    it("handles teams with multiple characters", () => {
      // A blocked team requires leveling multiple characters
      const characters: Character[] = [
        createTestCharacter("charA", {
          role: ["role-001"],
          rarity: ["rarity-004"]
        }),
        createTestCharacter("charB", {
          role: ["role-002"],
          rarity: ["rarity-004"]
        }),
      ];

      const unassignedCommissions: Commission[] = [
        createTestCommission("commission1", 50, [
          { category: "role", anyOf: ["role-001", "role-002"] }, // needs both
        ]),
      ];

      const currentLevels = { charA: 30, charB: 30 };

      const blockedTeamsByMission = new Map<string, BlockedCombination[]>([
        [
          "commission1",
          [
            {
              characterIds: ["charA", "charB"],
              meetsBaseConditions: true,
              meetsBonusConditions: false,
              levelDeficits: { charA: 20, charB: 20 }, // both need leveling
            },
          ],
        ],
      ]);

      const recommendations = calculateTrainingPriorityFromBlockedTeams(
        unassignedCommissions,
        blockedTeamsByMission,
        characters,
        currentLevels
      );

      // Training either character alone won't unlock the mission
      // So no recommendations should indicate mission unlock unless BOTH are trained
      // This test verifies that individual character training doesn't falsely claim to unlock
      const recA = recommendations.find(
        r => r.characterId === "charA" && r.targetLevel === 50
      );

      // charA alone can't unlock because charB is still at 30
      if (recA) {
        expect(recA.impact.commissionsUnlocked).toHaveLength(0);
      }
    });
  });
});
