import { describe, it, expect, beforeEach } from "vitest";
import type { TagDict, Character, Mission, Condition, Category } from "../types";
import {
  generateCombinations,
  checkLevelRequirements,
  interactsWith,
  findMissingTags,
  rankCombinations,
  findCombinations,
  findCombinationsForMultipleMissions,
  type Combination,
} from "./combos";
import { buildBitmaskLookup, characterToBitmask } from "./bitmask";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestTagDict = (): TagDict => ({
  role: [
    { id: "role-001", ja: "����" },
    { id: "role-002", ja: "��ë�" },
    { id: "role-003", ja: "�����" },
  ],
  style: [
    { id: "style-001", ja: "�z�" },
    { id: "style-002", ja: "�u'" },
    { id: "style-003", ja: "�ƶ" },
  ],
  faction: [
    { id: "faction-001", ja: "��" },
    { id: "faction-002", ja: "�������" },
    { id: "faction-003", ja: "���" },
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

  describe("findCombinationsForMultipleMissions", () => {
    let lookup: ReturnType<typeof buildBitmaskLookup>;

    beforeEach(() => {
      const tags = createTestTagDict();
      lookup = buildBitmaskLookup(tags);
    });

    it("handles empty mission list", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];
      const levels = { char1: 60 };

      const result = findCombinationsForMultipleMissions(
        [],
        characters,
        levels,
        lookup
      );

      expect(result.combinations).toHaveLength(0);
      expect(result.totalCandidatesGenerated).toBe(0);
    });

    it("finds combinations that satisfy all missions", () => {
      // Create characters that can satisfy both missions
      const characters = [
        createTestCharacter("char1", {
          role: ["role-001"],
          element: ["element-001"],
        }),
        createTestCharacter("char2", {
          role: ["role-002"],
          element: ["element-002"],
        }),
      ];

      // Mission 1: Needs role-001
      const mission1 = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Mission 2: Needs role-002
      const mission2 = createTestMission("mission2", 50, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleMissions(
        [mission1, mission2],
        characters,
        levels,
        lookup
      );

      // Should find combination with both characters
      const universalCombo = result.combinations.find(
        (c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
      );

      expect(universalCombo).toBeDefined();
      if (universalCombo) {
        // Should satisfy both missions
        const mission1Coverage = universalCombo.missionCoverage.find(
          (mc) => mc.missionId === "mission1"
        );
        const mission2Coverage = universalCombo.missionCoverage.find(
          (mc) => mc.missionId === "mission2"
        );

        expect(mission1Coverage?.satisfiesBase).toBe(true);
        expect(mission1Coverage?.meetsLevelRequirement).toBe(true);
        expect(mission2Coverage?.satisfiesBase).toBe(true);
        expect(mission2Coverage?.meetsLevelRequirement).toBe(true);
      }
    });

    it("distinguishes between base-only and base+bonus satisfaction", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      // Mission with bonus conditions
      const mission = createTestMission(
        "mission1",
        50,
        [{ category: "role", anyOf: ["role-001"] }],
        [
          { category: "role", anyOf: ["role-001"] },
          { category: "role", anyOf: ["role-002"] },
        ]
      );

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleMissions(
        [mission],
        characters,
        levels,
        lookup
      );

      // Single-character combo: should satisfy base but not bonus
      const singleCombo = result.combinations.find(
        (c) => c.characterIds.length === 1 && c.characterIds.includes("char1")
      );

      expect(singleCombo).toBeDefined();
      if (singleCombo) {
        const coverage = singleCombo.missionCoverage[0];
        expect(coverage.satisfiesBase).toBe(true);
        expect(coverage.satisfiesBonus).toBe(false);
      }

      // Two-character combo: should satisfy both base and bonus
      const dualCombo = result.combinations.find(
        (c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
      );

      expect(dualCombo).toBeDefined();
      if (dualCombo) {
        const coverage = dualCombo.missionCoverage[0];
        expect(coverage.satisfiesBase).toBe(true);
        expect(coverage.satisfiesBonus).toBe(true);
      }
    });

    it("handles missions with conflicting level requirements", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      // Mission A: level 20 required
      const missionA = createTestMission("missionA", 20, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Mission B: level 50 required
      const missionB = createTestMission("missionB", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Character at level 30: satisfies A but not B
      const levels = { char1: 30 };

      const result = findCombinationsForMultipleMissions(
        [missionA, missionB],
        characters,
        levels,
        lookup
      );

      const combo = result.combinations.find((c) =>
        c.characterIds.includes("char1")
      );

      expect(combo).toBeDefined();
      if (combo) {
        const coverageA = combo.missionCoverage.find(
          (mc) => mc.missionId === "missionA"
        );
        const coverageB = combo.missionCoverage.find(
          (mc) => mc.missionId === "missionB"
        );

        expect(coverageA?.satisfiesBase).toBe(true);
        expect(coverageA?.meetsLevelRequirement).toBe(true);
        expect(coverageB?.satisfiesBase).toBe(true);
        expect(coverageB?.meetsLevelRequirement).toBe(false); // Level insufficient
      }
    });

    it("returns partial coverage when no universal team exists", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }), // Only Attacker
        createTestCharacter("char2", { role: ["role-002"] }), // Only Supporter
      ];

      // Mission A: Needs role-001
      const missionA = createTestMission("missionA", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Mission B: Needs role-003 (which no character has)
      const missionB = createTestMission("missionB", 50, [
        { category: "role", anyOf: ["role-003"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleMissions(
        [missionA, missionB],
        characters,
        levels,
        lookup
      );

      // Should have combos that satisfy missionA but not missionB
      const partialCombo = result.combinations.find(
        (c) => c.characterIds.includes("char1")
      );

      expect(partialCombo).toBeDefined();
      if (partialCombo) {
        const coverageA = partialCombo.missionCoverage.find(
          (mc) => mc.missionId === "missionA"
        );
        const coverageB = partialCombo.missionCoverage.find(
          (mc) => mc.missionId === "missionB"
        );

        expect(coverageA?.satisfiesBase).toBe(true);
        expect(coverageB?.satisfiesBase).toBe(false);
      }

      // No combination should satisfy both missions
      const universalCombo = result.combinations.find((c) =>
        c.missionCoverage.every((mc) => mc.satisfiesBase)
      );
      expect(universalCombo).toBeUndefined();
    });

    it("scores combinations correctly", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const mission = createTestMission(
        "mission1",
        50,
        [{ category: "role", anyOf: ["role-001"] }],
        [
          { category: "role", anyOf: ["role-001"] },
          { category: "role", anyOf: ["role-002"] },
        ]
      );

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleMissions(
        [mission],
        characters,
        levels,
        lookup
      );

      // Two-character combo with bonus should score higher than single-character
      const singleCombo = result.combinations.find(
        (c) => c.characterIds.length === 1
      );
      const dualCombo = result.combinations.find(
        (c) => c.characterIds.length === 2
      );

      expect(singleCombo).toBeDefined();
      expect(dualCombo).toBeDefined();

      if (singleCombo && dualCombo) {
        // Dual combo satisfies bonus (+10) with 2 chars (-2) = 8
        // Single combo satisfies base only (+5) with 1 char (-1) = 4
        expect(dualCombo.score).toBeGreaterThan(singleCombo.score);
      }
    });

    it("ranks combinations by coverage score", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
        createTestCharacter("char3", { role: ["role-003"] }),
      ];

      const mission1 = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const mission2 = createTestMission("mission2", 50, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 60, char2: 60, char3: 60 };

      const result = findCombinationsForMultipleMissions(
        [mission1, mission2],
        characters,
        levels,
        lookup
      );

      // Top-ranked combo should satisfy both missions
      const topCombo = result.combinations[0];

      const mission1Coverage = topCombo.missionCoverage.find(
        (mc) => mc.missionId === "mission1"
      );
      const mission2Coverage = topCombo.missionCoverage.find(
        (mc) => mc.missionId === "mission2"
      );

      expect(mission1Coverage?.satisfiesBase).toBe(true);
      expect(mission2Coverage?.satisfiesBase).toBe(true);
    });

    it("applies pruning across multiple missions", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
        createTestCharacter("char3", { faction: ["faction-001"] }), // Irrelevant to both missions
      ];

      const mission1 = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const mission2 = createTestMission("mission2", 50, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 60, char2: 60, char3: 60 };

      const result = findCombinationsForMultipleMissions(
        [mission1, mission2],
        characters,
        levels,
        lookup
      );

      // char3 should be pruned
      expect(result.pruningStats.charactersPruned).toBe(1);
      expect(result.pruningStats.charactersRemaining).toBe(2);

      // No combination should include char3
      const comboWithChar3 = result.combinations.find((c) =>
        c.characterIds.includes("char3")
      );
      expect(comboWithChar3).toBeUndefined();
    });

    it("matches single-mission behavior for backward compatibility", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const mission = createTestMission("mission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      // Single-mission with old function
      const singleResult = findCombinations(mission, characters, levels, lookup);

      // Single-mission with new function
      const multiResult = findCombinationsForMultipleMissions(
        [mission],
        characters,
        levels,
        lookup
      );

      // Should have same number of valid combinations
      expect(multiResult.combinations.length).toBe(
        singleResult.combinations.length
      );

      // All combos in single result should exist in multi result
      for (const singleCombo of singleResult.combinations) {
        const matchingMultiCombo = multiResult.combinations.find((mc) =>
          singleCombo.characterIds.every((id) => mc.characterIds.includes(id)) &&
          mc.characterIds.length === singleCombo.characterIds.length
        );
        expect(matchingMultiCombo).toBeDefined();
      }
    });
  });
});
