import { describe, it, expect, beforeEach } from "vitest";
import type { TagDict, Character, Mission, Condition, Category } from "../types";
import {
  generateCombinations,
  checkLevelRequirements,
  interactsWith,
  findMissingTags,
  rankCombinations,
  findCombinations,
  type Combination,
} from "./combos";
import { buildBitmaskLookup, characterToBitmask } from "./bitmask";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestTagDict = (): TagDict => ({
  role: [
    { id: "role-001", ja: "Ðéóµü" },
    { id: "role-002", ja: "¢¿Ã«ü" },
    { id: "role-003", ja: "µÝü¿ü" },
  ],
  style: [
    { id: "style-001", ja: "’z¶" },
    { id: "style-002", ja: "ìu'" },
    { id: "style-003", ja: "ÎÆ¶" },
  ],
  faction: [
    { id: "faction-001", ja: "ò‡" },
    { id: "faction-002", ja: "àüÊïü¯¹" },
    { id: "faction-003", ja: "Öéó¯" },
  ],
  element: [
    { id: "element-001", ja: "4" },
    { id: "element-002", ja: "k" },
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

describe("Combination Search", () => {
  describe("generateCombinations", () => {
    it("generates all 1-character combinations", () => {
      const items = [1, 2, 3];
      const combos = generateCombinations(items, 1);

      expect(combos).toHaveLength(3);
      expect(combos).toContainEqual([1]);
      expect(combos).toContainEqual([2]);
      expect(combos).toContainEqual([3]);
    });

    it("generates all 1 and 2-character combinations", () => {
      const items = [1, 2, 3];
      const combos = generateCombinations(items, 2);

      // C(3,1) + C(3,2) = 3 + 3 = 6
      expect(combos).toHaveLength(6);
      expect(combos).toContainEqual([1]);
      expect(combos).toContainEqual([2]);
      expect(combos).toContainEqual([3]);
      expect(combos).toContainEqual([1, 2]);
      expect(combos).toContainEqual([1, 3]);
      expect(combos).toContainEqual([2, 3]);
    });

    it("generates all combinations up to size 3", () => {
      const items = [1, 2, 3, 4];
      const combos = generateCombinations(items, 3);

      // C(4,1) + C(4,2) + C(4,3) = 4 + 6 + 4 = 14
      expect(combos).toHaveLength(14);

      // Check some 3-character combinations exist
      expect(combos).toContainEqual([1, 2, 3]);
      expect(combos).toContainEqual([1, 2, 4]);
      expect(combos).toContainEqual([2, 3, 4]);
    });

    it("produces correct count for 5 items", () => {
      const items = [1, 2, 3, 4, 5];
      const combos = generateCombinations(items, 3);

      // C(5,1) + C(5,2) + C(5,3) = 5 + 10 + 10 = 25
      expect(combos).toHaveLength(25);
    });

    it("handles empty array", () => {
      const combos = generateCombinations([], 3);
      expect(combos).toHaveLength(0);
    });

    it("handles single item", () => {
      const combos = generateCombinations([1], 3);
      expect(combos).toHaveLength(1);
      expect(combos).toContainEqual([1]);
    });
  });

  describe("checkLevelRequirements", () => {
    it("identifies characters below required level", () => {
      const levels = {
        char1: 40,
        char2: 60,
        char3: 50,
      };

      const deficits = checkLevelRequirements(
        ["char1", "char2", "char3"],
        50,
        levels
      );

      expect(deficits).toEqual({ char1: 10 });
    });

    it("returns empty when all characters meet requirement", () => {
      const levels = {
        char1: 60,
        char2: 70,
        char3: 50,
      };

      const deficits = checkLevelRequirements(
        ["char1", "char2", "char3"],
        50,
        levels
      );

      expect(deficits).toEqual({});
    });

    it("assumes level 1 for missing character levels", () => {
      const levels = {
        char1: 50,
      };

      const deficits = checkLevelRequirements(
        ["char1", "char2"],
        50,
        levels
      );

      expect(deficits).toEqual({ char2: 49 });
    });

    it("handles characters at exact required level", () => {
      const levels = {
        char1: 50,
        char2: 50,
      };

      const deficits = checkLevelRequirements(["char1", "char2"], 50, levels);

      expect(deficits).toEqual({});
    });
  });

  describe("interactsWith", () => {
    it("returns true when character has relevant tag", () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter("char1", {
        role: ["role-001"],
      });
      const charMask = characterToBitmask(character, lookup);

      const baseConditions: Condition[] = [
        { category: "role", anyOf: ["role-001", "role-002"] },
      ];

      const result = interactsWith(charMask, baseConditions, undefined, lookup);

      expect(result).toBe(true);
    });

    it("returns false when character has no relevant tags", () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter("char1", {
        style: ["style-001"],
      });
      const charMask = characterToBitmask(character, lookup);

      const baseConditions: Condition[] = [
        { category: "role", anyOf: ["role-001", "role-002"] },
      ];

      const result = interactsWith(charMask, baseConditions, undefined, lookup);

      expect(result).toBe(false);
    });

    it("checks both base and bonus conditions", () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter("char1", {
        element: ["element-001"],
      });
      const charMask = characterToBitmask(character, lookup);

      const baseConditions: Condition[] = [
        { category: "role", anyOf: ["role-001"] },
      ];
      const bonusConditions: Condition[] = [
        { category: "element", anyOf: ["element-001"] },
      ];

      const result = interactsWith(
        charMask,
        baseConditions,
        bonusConditions,
        lookup
      );

      expect(result).toBe(true);
    });

    it("handles multiple conditions", () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter("char1", {
        faction: ["faction-002"],
      });
      const charMask = characterToBitmask(character, lookup);

      const baseConditions: Condition[] = [
        { category: "role", anyOf: ["role-001"] },
        { category: "faction", anyOf: ["faction-001", "faction-002"] },
      ];

      const result = interactsWith(charMask, baseConditions, undefined, lookup);

      expect(result).toBe(true);
    });
  });

  describe("findMissingTags", () => {
    it("identifies missing tags when no character satisfies condition", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const conditions: Condition[] = [
        { category: "role", anyOf: ["role-003"] },
      ];

      const missing = findMissingTags(conditions, characters);

      expect(missing).toContain("role-003");
    });

    it("returns empty when all conditions are satisfiable", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const conditions: Condition[] = [
        { category: "role", anyOf: ["role-001", "role-002"] },
      ];

      const missing = findMissingTags(conditions, characters);

      expect(missing).toHaveLength(0);
    });

    it("identifies multiple missing tags", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const conditions: Condition[] = [
        { category: "style", anyOf: ["style-001"] },
        { category: "faction", anyOf: ["faction-001"] },
      ];

      const missing = findMissingTags(conditions, characters);

      expect(missing).toContain("style-001");
      expect(missing).toContain("faction-001");
    });

    it("handles partially satisfied conditions", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { style: ["style-001"] }),
      ];

      const conditions: Condition[] = [
        { category: "role", anyOf: ["role-001"] }, // Satisfied
        { category: "faction", anyOf: ["faction-001"] }, // Not satisfied
      ];

      const missing = findMissingTags(conditions, characters);

      expect(missing).toHaveLength(1);
      expect(missing).toContain("faction-001");
    });
  });

  describe("rankCombinations", () => {
    it("prioritizes bonus conditions met", () => {
      const combos: Combination[] = [
        {
          characterIds: ["char1"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: {},
          contributingTags: [],
        },
        {
          characterIds: ["char2"],
          meetsBaseConditions: true,
          meetsBonusConditions: true,
          levelDeficits: {},
          contributingTags: [],
        },
      ];

      const ranked = rankCombinations(combos);

      expect(ranked[0].characterIds).toEqual(["char2"]);
      expect(ranked[1].characterIds).toEqual(["char1"]);
    });

    it("prioritizes lower level deficit", () => {
      const combos: Combination[] = [
        {
          characterIds: ["char1"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: { char1: 20 },
          contributingTags: [],
        },
        {
          characterIds: ["char2"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: { char2: 10 },
          contributingTags: [],
        },
      ];

      const ranked = rankCombinations(combos);

      expect(ranked[0].characterIds).toEqual(["char2"]);
      expect(ranked[1].characterIds).toEqual(["char1"]);
    });

    it("prioritizes fewer characters", () => {
      const combos: Combination[] = [
        {
          characterIds: ["char1", "char2"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: {},
          contributingTags: [],
        },
        {
          characterIds: ["char3"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: {},
          contributingTags: [],
        },
      ];

      const ranked = rankCombinations(combos);

      expect(ranked[0].characterIds).toEqual(["char3"]);
      expect(ranked[1].characterIds).toEqual(["char1", "char2"]);
    });

    it("uses lexicographic order for tiebreaker", () => {
      const combos: Combination[] = [
        {
          characterIds: ["char2"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: {},
          contributingTags: [],
        },
        {
          characterIds: ["char1"],
          meetsBaseConditions: true,
          meetsBonusConditions: false,
          levelDeficits: {},
          contributingTags: [],
        },
      ];

      const ranked = rankCombinations(combos);

      expect(ranked[0].characterIds).toEqual(["char1"]);
      expect(ranked[1].characterIds).toEqual(["char2"]);
    });
  });

  describe("findCombinations", () => {
    let tags: TagDict;
    let lookup: ReturnType<typeof buildBitmaskLookup>;

    beforeEach(() => {
      tags = createTestTagDict();
      lookup = buildBitmaskLookup(tags);
    });

    it("finds valid single-character combination", () => {
      const characters = [
        createTestCharacter("char1", {
          role: ["role-001"],
          style: ["style-001"],
        }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
        { category: "style", anyOf: ["style-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.satisfiable).toBe(true);
      expect(result.combinations.length).toBeGreaterThan(0);
      expect(
        result.combinations.some((c) =>
          c.characterIds.includes("char1") &&
          c.characterIds.length === 1
        )
      ).toBe(true);
    });

    it("finds valid multi-character combinations", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { style: ["style-001"] }),
      ];

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
        { category: "style", anyOf: ["style-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.satisfiable).toBe(true);
      expect(
        result.combinations.some((c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
        )
      ).toBe(true);
    });

    it("handles missions with no valid combinations", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-003"] }, // No character has this
      ]);

      const levels = { char1: 60 };

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.satisfiable).toBe(false);
      expect(result.combinations).toHaveLength(0);
      expect(result.missingForBase).toContain("role-003");
    });

    it("correctly identifies bonus conditions", () => {
      const characters = [
        createTestCharacter("char1", {
          role: ["role-001"],
          element: ["element-001"],
        }),
      ];

      const mission = createTestMission(
        "mission1",
        50,
        [{ category: "role", anyOf: ["role-001"] }],
        [{ category: "element", anyOf: ["element-001"] }]
      );

      const levels = { char1: 60 };

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.satisfiable).toBe(true);
      const combo = result.combinations.find((c) =>
        c.characterIds.includes("char1")
      );
      expect(combo?.meetsBonusConditions).toBe(true);
    });

    it("handles count-based requirements", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-002"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
        createTestCharacter("char3", { role: ["role-001"] }),
      ];

      // Mission requires 2 attackers (role-002) and 1 balancer (role-001)
      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-002", "role-001", "role-002"] },
      ]);

      const levels = { char1: 60, char2: 60, char3: 60 };

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.satisfiable).toBe(true);
      const validCombo = result.combinations.find(
        (c) =>
          c.characterIds.includes("char1") &&
          c.characterIds.includes("char2") &&
          c.characterIds.includes("char3")
      );
      expect(validCombo).toBeDefined();
    });

    it("tracks level deficits correctly", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 40 };

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.satisfiable).toBe(true);
      const combo = result.combinations[0];
      expect(combo.levelDeficits).toEqual({ char1: 10 });
    });

    it("limits best combinations to top 10", () => {
      // Create many characters to generate many combinations
      const characters = Array.from({ length: 15 }, (_, i) =>
        createTestCharacter(`char${i}`, { role: ["role-001"] })
      );

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = Object.fromEntries(
        characters.map((c) => [c.id, 60])
      );

      const result = findCombinations(mission, characters, levels, lookup);

      expect(result.combinations.length).toBeGreaterThan(10);
      expect(result.bestCombinations.length).toBeLessThanOrEqual(10);
    });

    it("applies interactsWith pruning", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { faction: ["faction-001"] }), // Irrelevant
      ];

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinations(mission, characters, levels, lookup);

      // char2 should be pruned, so no combination should include both
      const comboWithBoth = result.combinations.find(
        (c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
      );
      expect(comboWithBoth).toBeUndefined();
    });
  });
});
