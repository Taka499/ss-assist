import { describe, it, expect } from "vitest";
import type { TagDict, Character, Mission, Condition, Category } from "../types";
import {
  calculateTagRarity,
  calculateCharacterRarity,
  calculateTrainingImpact,
  calculateTrainingPriority,
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

const createTestMission = (
  id: string,
  requiredLevel: number,
  baseConditions: Condition[],
  bonusConditions?: Condition[]
): Mission => ({
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

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 30, char2: 40 };

      // Training char1 to 50 should unlock mission1
      const impact = calculateTrainingImpact(
        "char1",
        50,
        missions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(1);
      expect(impact.bonusConditionsAdded).toBe(0);
      expect(impact.affectedMissions).toContain("mission1");
    });

    it("detects bonus conditions added by leveling", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const missions: Mission[] = [
        createTestMission(
          "mission1",
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
        missions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(0);
      expect(impact.bonusConditionsAdded).toBe(1);
      expect(impact.affectedMissions).toContain("mission1");
    });

    it("handles missions that require multiple characters", () => {
      const tags = createTestTagDict();
      const bitmaskLookup = buildBitmaskLookup(tags);
      const characters: Character[] = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
        createTestCharacter("char3", { role: ["role-002"] }),
      ];

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
          { category: "role", anyOf: ["role-002", "role-001", "role-002"] }, // Requires 2x role-002, 1x role-001
        ]),
      ];

      const currentLevels = { char1: 60, char2: 60, char3: 30 };

      // Training char3 to 50 should unlock mission1
      const impact = calculateTrainingImpact(
        "char3",
        50,
        missions,
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

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
          { category: "role", anyOf: ["role-003"] }, // Requires role-003, which no one has
        ]),
      ];

      const currentLevels = { char1: 30, char2: 40 };

      // Training char1 won't help because mission requires role-003
      const impact = calculateTrainingImpact(
        "char1",
        50,
        missions,
        characters,
        currentLevels,
        bitmaskLookup
      );

      expect(impact.baseConditionsUnlocked).toBe(0);
      expect(impact.bonusConditionsAdded).toBe(0);
      expect(impact.affectedMissions).toHaveLength(0);
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

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestMission("mission2", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
        createTestMission("mission3", 50, [
          { category: "role", anyOf: ["role-002"] },
        ]),
      ];

      const currentLevels = { char1: 30, char2: 30 };

      const recommendations = calculateTrainingPriority(
        missions,
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

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 20 };

      const recommendations = calculateTrainingPriority(
        missions,
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

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
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
        missions,
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

      const missions: Mission[] = [
        createTestMission("mission1", 30, [
          { category: "role", anyOf: ["role-002"] }, // char1 doesn't have this
        ]),
      ];

      const currentLevels = { char1: 20 };

      const recommendations = calculateTrainingPriority(
        missions,
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

      const missions: Mission[] = [
        createTestMission("mission1", 50, [
          { category: "role", anyOf: ["role-001"] },
        ]),
      ];

      const currentLevels = { char1: 90 }; // Max level

      const recommendations = calculateTrainingPriority(
        missions,
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
          affectedMissions: ["mission1", "mission2"],
        },
      };

      const missions: Mission[] = [
        createTestMission("mission1", 50, []),
        createTestMission("mission2", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, missions);

      expect(explanation).toContain("コハク");
      expect(explanation).toContain("50");
      expect(explanation).toContain("Unlocks 2 missions");
      expect(explanation).toContain("mission1");
      expect(explanation).toContain("mission2");
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
          affectedMissions: ["mission1", "mission2"],
        },
      };

      const missions: Mission[] = [
        createTestMission("mission1", 50, []),
        createTestMission("mission2", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, missions);

      expect(explanation).toContain("ミネルバ");
      expect(explanation).toContain("60");
      expect(explanation).toContain("adds bonus to 2 missions");
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
          affectedMissions: ["mission1", "mission2"],
        },
      };

      const missions: Mission[] = [
        createTestMission("mission1", 50, []),
        createTestMission("mission2", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, missions);

      expect(explanation).toContain("エレン");
      expect(explanation).toContain("50");
      expect(explanation).toContain("Unlocks 1 mission");
      expect(explanation).toContain("adds bonus to 1 mission");
    });

    it("limits mission list to 3 missions", () => {
      const recommendation: TrainingRecommendation = {
        characterId: "char1",
        characterName: "コハク",
        currentLevel: 30,
        targetLevel: 50,
        score: 15.0,
        impact: {
          baseConditionsUnlocked: 5,
          bonusConditionsAdded: 0,
          affectedMissions: [
            "mission1",
            "mission2",
            "mission3",
            "mission4",
            "mission5",
          ],
        },
      };

      const missions: Mission[] = [
        createTestMission("mission1", 50, []),
        createTestMission("mission2", 50, []),
        createTestMission("mission3", 50, []),
        createTestMission("mission4", 50, []),
        createTestMission("mission5", 50, []),
      ];

      const explanation = explainRecommendation(recommendation, missions);

      // Should show first 3 missions and indicate there are more
      expect(explanation).toContain("mission1");
      expect(explanation).toContain("mission2");
      expect(explanation).toContain("mission3");
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
});
