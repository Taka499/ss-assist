import { describe, it, expect, beforeEach } from "vitest";
import type { TagDict, Character, Commission, Condition, Category } from "../types";
import {
  generateCombinations,
  checkLevelRequirements,
  interactsWith,
  findMissingTags,
  rankCombinations,
  findCombinations,
  findCombinationsForMultipleCommissions,
  findPerCommissionCandidates,
  findBestCommissionAssignment,
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

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
        { category: "style", anyOf: ["style-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinations(commission, characters, levels, lookup);

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

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
        { category: "style", anyOf: ["style-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinations(commission, characters, levels, lookup);

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

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-003"] }, // No character has this
      ]);

      const levels = { char1: 60 };

      const result = findCombinations(commission, characters, levels, lookup);

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

      const commission = createTestCommission(
        "commission1",
        50,
        [{ category: "role", anyOf: ["role-001"] }],
        [{ category: "element", anyOf: ["element-001"] }]
      );

      const levels = { char1: 60 };

      const result = findCombinations(commission, characters, levels, lookup);

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

      // Commission requires 2 attackers (role-002) and 1 balancer (role-001)
      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-002", "role-001", "role-002"] },
      ]);

      const levels = { char1: 60, char2: 60, char3: 60 };

      const result = findCombinations(commission, characters, levels, lookup);

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

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 40 };

      const result = findCombinations(commission, characters, levels, lookup);

      expect(result.satisfiable).toBe(true);
      const combo = result.combinations[0];
      expect(combo.levelDeficits).toEqual({ char1: 10 });
    });

    it("limits best combinations to top 10", () => {
      // Create many characters to generate many combinations
      const characters = Array.from({ length: 15 }, (_, i) =>
        createTestCharacter(`char${i}`, { role: ["role-001"] })
      );

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = Object.fromEntries(
        characters.map((c) => [c.id, 60])
      );

      const result = findCombinations(commission, characters, levels, lookup);

      expect(result.combinations.length).toBeGreaterThan(10);
      expect(result.bestCombinations.length).toBeLessThanOrEqual(10);
    });

    it("applies interactsWith pruning", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { faction: ["faction-001"] }), // Irrelevant
      ];

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinations(commission, characters, levels, lookup);

      // char2 should be pruned, so no combination should include both
      const comboWithBoth = result.combinations.find(
        (c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
      );
      expect(comboWithBoth).toBeUndefined();
    });
  });

  describe("findPerCommissionCandidates", () => {
    let tags: TagDict;
    let lookup: ReturnType<typeof buildBitmaskLookup>;

    beforeEach(() => {
      tags = createTestTagDict();
      lookup = buildBitmaskLookup(tags);
    });

    it("separates ready teams from blocked teams", () => {
      // Setup: Commission requires 2 Attackers, Level 30
      // Characters: A (Attacker, Lv25), B (Attacker, Lv35), C (Attacker, Lv40)
      const characters = [
        createTestCharacter("charA", { role: ["role-002"] }), // Attacker
        createTestCharacter("charB", { role: ["role-002"] }), // Attacker
        createTestCharacter("charC", { role: ["role-002"] }), // Attacker
      ];

      const commission = createTestCommission("commission1", 30, [
        { category: "role", anyOf: ["role-002", "role-002"] }, // Need 2 Attackers
      ]);

      const levels = {
        charA: 25,
        charB: 35,
        charC: 40,
      };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // Ready teams: [B,C] (both at level 30+)
      expect(result.readyTeams).toHaveLength(1);
      expect(result.readyTeams[0].characterIds).toContain("charB");
      expect(result.readyTeams[0].characterIds).toContain("charC");

      // Blocked teams: [A,B], [A,C], and [A,B,C] (A is below level 30)
      expect(result.blockedTeams).toHaveLength(3);

      const blockedAB = result.blockedTeams.find(
        (t) =>
          t.characterIds.includes("charA") && t.characterIds.includes("charB")
      );
      expect(blockedAB).toBeDefined();
      expect(blockedAB?.levelDeficits).toEqual({ charA: 5 });

      const blockedAC = result.blockedTeams.find(
        (t) =>
          t.characterIds.includes("charA") && t.characterIds.includes("charC")
      );
      expect(blockedAC).toBeDefined();
      expect(blockedAC?.levelDeficits).toEqual({ charA: 5 });
    });

    it("does not include teams with missing tags as blocked", () => {
      // Setup: Commission requires 2 Attackers
      // Characters: A (Attacker, Lv25), B (Supporter, Lv40)
      const characters = [
        createTestCharacter("charA", { role: ["role-002"] }), // Attacker
        createTestCharacter("charB", { role: ["role-003"] }), // Supporter
      ];

      const commission = createTestCommission("commission1", 30, [
        { category: "role", anyOf: ["role-002", "role-002"] }, // Need 2 Attackers
      ]);

      const levels = {
        charA: 25,
        charB: 40,
      };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // Ready teams: none (can't make 2 Attackers)
      expect(result.readyTeams).toHaveLength(0);

      // Blocked teams: none (A+B fails tag requirement, not just level)
      expect(result.blockedTeams).toHaveLength(0);
    });

    it("handles missions where bonus conditions affect blocking status", () => {
      // Setup: Commission with base (1 Attacker) and bonus (1 Supporter) conditions
      const characters = [
        createTestCharacter("charA", { role: ["role-002"] }), // Attacker, Lv25
        createTestCharacter("charB", { role: ["role-003"] }), // Supporter, Lv40
      ];

      const commission = createTestCommission(
        "commission1",
        30,
        [{ category: "role", anyOf: ["role-002"] }], // Base: 1 Attacker
        [{ category: "role", anyOf: ["role-003"] }]  // Bonus: 1 Supporter
      );

      const levels = {
        charA: 25,
        charB: 40,
      };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // Ready teams: none (charA below level, charB doesn't meet base)
      expect(result.readyTeams).toHaveLength(0);

      // Blocked teams: [charA] alone (meets base, blocked by level)
      // and [charA, charB] (meets base + bonus, blocked by charA's level)
      expect(result.blockedTeams).toHaveLength(2);

      const blockedCharAOnly = result.blockedTeams.find(
        (t) => t.characterIds.length === 1 && t.characterIds.includes("charA")
      );
      expect(blockedCharAOnly).toBeDefined();
      expect(blockedCharAOnly?.meetsBaseConditions).toBe(true);
      expect(blockedCharAOnly?.meetsBonusConditions).toBe(false);

      // Test combo: [charA, charB] should meet both base and bonus, but blocked by charA's level
      const comboAB = result.blockedTeams.find(
        (t) =>
          t.characterIds.includes("charA") && t.characterIds.includes("charB")
      );
      expect(comboAB).toBeDefined();
      expect(comboAB?.meetsBaseConditions).toBe(true);
      expect(comboAB?.meetsBonusConditions).toBe(true);
      expect(comboAB?.levelDeficits).toEqual({ charA: 5 });
    });

    it("populates levelDeficits correctly for multiple characters", () => {
      // Setup: Commission requires Lv50, team with chars at Lv30 and Lv40
      const characters = [
        createTestCharacter("char1", { role: ["role-002"] }), // Attacker
        createTestCharacter("char2", { role: ["role-001"] }), // Balancer
      ];

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-002"] }, // Attacker
        { category: "role", anyOf: ["role-001"] }, // Balancer
      ]);

      const levels = {
        char1: 30,
        char2: 40,
      };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // Ready teams: none (both below Lv50)
      expect(result.readyTeams).toHaveLength(0);

      // Blocked teams: [char1, char2] with both having deficits
      expect(result.blockedTeams).toHaveLength(1);
      expect(result.blockedTeams[0].characterIds).toContain("char1");
      expect(result.blockedTeams[0].characterIds).toContain("char2");
      expect(result.blockedTeams[0].levelDeficits).toEqual({
        char1: 20,
        char2: 10,
      });
    });

    it("handles missions with 1-character requirements", () => {
      // Setup: Commission requires 1 role
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }), // Lv20
        createTestCharacter("char2", { role: ["role-001"] }), // Lv30
        createTestCharacter("char3", { role: ["role-001"] }), // Lv50
      ];

      const commission = createTestCommission("commission1", 30, [
        { category: "role", anyOf: ["role-001"] }, // 1 Balancer
      ]);

      const levels = {
        char1: 20,
        char2: 30,
        char3: 50,
      };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // Ready teams: [char2] and [char3] (both at Lv30+)
      expect(result.readyTeams.length).toBeGreaterThanOrEqual(2);
      const readyChar2 = result.readyTeams.find(
        (t) => t.characterIds.length === 1 && t.characterIds.includes("char2")
      );
      const readyChar3 = result.readyTeams.find(
        (t) => t.characterIds.length === 1 && t.characterIds.includes("char3")
      );
      expect(readyChar2).toBeDefined();
      expect(readyChar3).toBeDefined();

      // Blocked teams: [char1] and any combo including char1
      const blockedChar1 = result.blockedTeams.find(
        (t) => t.characterIds.length === 1 && t.characterIds.includes("char1")
      );
      expect(blockedChar1).toBeDefined();
      expect(blockedChar1?.levelDeficits).toEqual({ char1: 10 });
    });

    it("sorts ready teams by size then bonus satisfaction", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-002"] }), // Attacker
        createTestCharacter("char2", { role: ["role-002"] }), // Attacker
        createTestCharacter("char3", { role: ["role-002"] }), // Attacker
      ];

      // Commission: 1 Attacker base, 2 Attackers bonus
      const commission = createTestCommission(
        "commission1",
        30,
        [{ category: "role", anyOf: ["role-002"] }], // 1 Attacker
        [{ category: "role", anyOf: ["role-002", "role-002"] }] // 2 Attackers
      );

      const levels = { char1: 50, char2: 50, char3: 50 };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // Should have 1-char teams (base only) and 2-char teams (base + bonus)
      // 1-char teams should come first (smaller size preferred)
      const firstTeam = result.readyTeams[0];
      expect(firstTeam.characterIds.length).toBe(1);

      // Among 2-char teams, those with bonus should rank higher
      // But since all 2-char teams satisfy bonus in this case, order doesn't matter much
    });

    it("sorts blocked teams by total level gap then size", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-002"] }), // Lv10 -> gap 40
        createTestCharacter("char2", { role: ["role-002"] }), // Lv30 -> gap 20
        createTestCharacter("char3", { role: ["role-002"] }), // Lv45 -> gap 5
      ];

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-002", "role-002"] }, // 2 Attackers
      ]);

      const levels = { char1: 10, char2: 30, char3: 45 };

      const result = findPerCommissionCandidates(
        commission,
        characters,
        levels,
        lookup
      );

      // All teams are blocked (none have 2 chars at Lv50+)
      expect(result.readyTeams).toHaveLength(0);

      // Blocked teams should be sorted by total gap
      // [char2, char3] gap = 20 + 5 = 25 (smallest)
      // [char1, char3] gap = 40 + 5 = 45
      // [char1, char2] gap = 40 + 20 = 60 (largest)
      const firstBlocked = result.blockedTeams[0];
      expect(firstBlocked.characterIds).toContain("char2");
      expect(firstBlocked.characterIds).toContain("char3");

      const totalGap = Object.values(firstBlocked.levelDeficits).reduce(
        (sum, d) => sum + d,
        0
      );
      expect(totalGap).toBe(25);
    });
  });

  describe("findCombinationsForMultipleCommissions", () => {
    let lookup: ReturnType<typeof buildBitmaskLookup>;

    beforeEach(() => {
      const tags = createTestTagDict();
      lookup = buildBitmaskLookup(tags);
    });

    it("handles empty commission list", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];
      const levels = { char1: 60 };

      const result = findCombinationsForMultipleCommissions(
        [],
        characters,
        levels,
        lookup
      );

      expect(result.assignments).toHaveLength(0);
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

      // Commission 1: Needs role-001
      const commission1 = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Commission 2: Needs role-002
      const commission2 = createTestCommission("commission2", 50, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleCommissions(
        [commission1, commission2],
        characters,
        levels,
        lookup
      );

      // Should find combination with both characters
      const universalCombo = result.assignments.find(
        (c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
      );

      expect(universalCombo).toBeDefined();
      if (universalCombo) {
        // Should satisfy both missions
        const commission1Coverage = universalCombo.commissionCoverage.find(
          (mc) => mc.commissionId === "commission1"
        );
        const commission2Coverage = universalCombo.commissionCoverage.find(
          (mc) => mc.commissionId === "commission2"
        );

        expect(commission1Coverage?.satisfiesBase).toBe(true);
        expect(commission1Coverage?.meetsLevelRequirement).toBe(true);
        expect(commission2Coverage?.satisfiesBase).toBe(true);
        expect(commission2Coverage?.meetsLevelRequirement).toBe(true);
      }
    });

    it("distinguishes between base-only and base+bonus satisfaction", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      // Commission with bonus conditions
      const commission = createTestCommission(
        "commission1",
        50,
        [{ category: "role", anyOf: ["role-001"] }],
        [
          { category: "role", anyOf: ["role-001"] },
          { category: "role", anyOf: ["role-002"] },
        ]
      );

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleCommissions(
        [commission],
        characters,
        levels,
        lookup
      );

      // Single-character combo: should satisfy base but not bonus
      const singleCombo = result.assignments.find(
        (c) => c.characterIds.length === 1 && c.characterIds.includes("char1")
      );

      expect(singleCombo).toBeDefined();
      if (singleCombo) {
        const coverage = singleCombo.commissionCoverage[0];
        expect(coverage.satisfiesBase).toBe(true);
        expect(coverage.satisfiesBonus).toBe(false);
      }

      // Two-character combo: should satisfy both base and bonus
      const dualCombo = result.assignments.find(
        (c) =>
          c.characterIds.includes("char1") && c.characterIds.includes("char2")
      );

      expect(dualCombo).toBeDefined();
      if (dualCombo) {
        const coverage = dualCombo.commissionCoverage[0];
        expect(coverage.satisfiesBase).toBe(true);
        expect(coverage.satisfiesBonus).toBe(true);
      }
    });

    it("handles missions with conflicting level requirements", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
      ];

      // Commission A: level 20 required
      const commissionA = createTestCommission("commissionA", 20, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Commission B: level 50 required
      const commissionB = createTestCommission("commissionB", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Character at level 30: satisfies A but not B
      const levels = { char1: 30 };

      const result = findCombinationsForMultipleCommissions(
        [commissionA, commissionB],
        characters,
        levels,
        lookup
      );

      const combo = result.assignments.find((c) =>
        c.characterIds.includes("char1")
      );

      expect(combo).toBeDefined();
      if (combo) {
        const coverageA = combo.commissionCoverage.find(
          (mc) => mc.commissionId === "commissionA"
        );
        const coverageB = combo.commissionCoverage.find(
          (mc) => mc.commissionId === "commissionB"
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

      // Commission A: Needs role-001
      const commissionA = createTestCommission("commissionA", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      // Commission B: Needs role-003 (which no character has)
      const commissionB = createTestCommission("commissionB", 50, [
        { category: "role", anyOf: ["role-003"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleCommissions(
        [commissionA, commissionB],
        characters,
        levels,
        lookup
      );

      // Should have combos that satisfy commissionA but not commissionB
      const partialCombo = result.assignments.find(
        (c) => c.characterIds.includes("char1")
      );

      expect(partialCombo).toBeDefined();
      if (partialCombo) {
        const coverageA = partialCombo.commissionCoverage.find(
          (mc) => mc.commissionId === "commissionA"
        );
        const coverageB = partialCombo.commissionCoverage.find(
          (mc) => mc.commissionId === "commissionB"
        );

        expect(coverageA?.satisfiesBase).toBe(true);
        expect(coverageB?.satisfiesBase).toBe(false);
      }

      // No combination should satisfy both missions
      const universalCombo = result.assignments.find((c) =>
        c.commissionCoverage.every((mc) => mc.satisfiesBase)
      );
      expect(universalCombo).toBeUndefined();
    });

    it("scores combinations correctly", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commission = createTestCommission(
        "commission1",
        50,
        [{ category: "role", anyOf: ["role-001"] }],
        [
          { category: "role", anyOf: ["role-001"] },
          { category: "role", anyOf: ["role-002"] },
        ]
      );

      const levels = { char1: 60, char2: 60 };

      const result = findCombinationsForMultipleCommissions(
        [commission],
        characters,
        levels,
        lookup
      );

      // Two-character combo with bonus should score higher than single-character
      const singleCombo = result.assignments.find(
        (c) => c.characterIds.length === 1
      );
      const dualCombo = result.assignments.find(
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

      const commission1 = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const commission2 = createTestCommission("commission2", 50, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 60, char2: 60, char3: 60 };

      const result = findCombinationsForMultipleCommissions(
        [commission1, commission2],
        characters,
        levels,
        lookup
      );

      // Top-ranked combo should satisfy both missions
      const topCombo = result.assignments[0];

      const commission1Coverage = topCombo.commissionCoverage.find(
        (mc) => mc.commissionId === "commission1"
      );
      const commission2Coverage = topCombo.commissionCoverage.find(
        (mc) => mc.commissionId === "commission2"
      );

      expect(commission1Coverage?.satisfiesBase).toBe(true);
      expect(commission2Coverage?.satisfiesBase).toBe(true);
    });

    it("applies pruning across multiple missions", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
        createTestCharacter("char3", { faction: ["faction-001"] }), // Irrelevant to both missions
      ];

      const commission1 = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const commission2 = createTestCommission("commission2", 50, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 60, char2: 60, char3: 60 };

      const result = findCombinationsForMultipleCommissions(
        [commission1, commission2],
        characters,
        levels,
        lookup
      );

      // char3 should be pruned
      expect(result.pruningStats.charactersPruned).toBe(1);
      expect(result.pruningStats.charactersRemaining).toBe(2);

      // No combination should include char3
      const comboWithChar3 = result.assignments.find((c) =>
        c.characterIds.includes("char3")
      );
      expect(comboWithChar3).toBeUndefined();
    });

    it("matches single-commission behavior for backward compatibility", () => {
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commission = createTestCommission("commission1", 50, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 60, char2: 60 };

      // Single-commission with old function
      const singleResult = findCombinations(commission, characters, levels, lookup);

      // Single-commission with new function
      const multiResult = findCombinationsForMultipleCommissions(
        [commission],
        characters,
        levels,
        lookup
      );

      // Should have same number of valid combinations
      expect(multiResult.assignments.length).toBe(
        singleResult.combinations.length
      );

      // All combos in single result should exist in multi result
      for (const singleCombo of singleResult.combinations) {
        const matchingMultiCombo = multiResult.assignments.find((mc) =>
          singleCombo.characterIds.every((id) => mc.characterIds.includes(id)) &&
          mc.characterIds.length === singleCombo.characterIds.length
        );
        expect(matchingMultiCombo).toBeDefined();
      }
    });
  });

  describe("findBestCommissionAssignment", () => {
    let lookup: ReturnType<typeof buildBitmaskLookup>;

    beforeEach(() => {
      const tags = createTestTagDict();
      lookup = buildBitmaskLookup(tags);
    });

    it("assigns disjoint teams with no character reuse", () => {
      // Setup: 2 commissions, 6 characters with different roles
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-001"] }),
        createTestCharacter("char3", { role: ["role-002"] }),
        createTestCharacter("char4", { role: ["role-002"] }),
        createTestCharacter("char5", { role: ["role-003"] }),
        createTestCharacter("char6", { role: ["role-003"] }),
      ];

      const commission1 = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const commission2 = createTestCommission("commission2", 10, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = {
        char1: 20,
        char2: 20,
        char3: 20,
        char4: 20,
        char5: 20,
        char6: 20,
      };

      const result = findBestCommissionAssignment(
        [commission1, commission2],
        characters,
        levels,
        lookup
      );

      // Both missions should be assigned
      expect(result.stats.commissionsAssigned).toBe(2);
      expect(result.stats.unassignedCommissionIds).toHaveLength(0);

      // Find the assignments
      const assignment1 = result.assignments.find(a => a.commissionId === "commission1");
      const assignment2 = result.assignments.find(a => a.commissionId === "commission2");

      expect(assignment1?.team).not.toBeNull();
      expect(assignment2?.team).not.toBeNull();

      // Verify no character reuse
      const chars1 = assignment1?.team?.characterIds || [];
      const chars2 = assignment2?.team?.characterIds || [];

      const overlap = chars1.filter(id => chars2.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it("prioritizes high-value missions (more base conditions)", () => {
      // Mission A has 3 base conditions (value 3)
      // Mission B has 1 base condition (value 1)
      // Only enough characters to assign one commission
      const characters = [
        createTestCharacter("char1", {
          role: ["role-001"],
          style: ["style-001"],
        }),
        createTestCharacter("char2", {
          role: ["role-002"],
          faction: ["faction-001"],
        }),
      ];

      const commissionA = createTestCommission("commissionA", 10, [
        { category: "role", anyOf: ["role-001"] },
        { category: "role", anyOf: ["role-002"] },
        { category: "style", anyOf: ["style-001"] },
      ]);

      const commissionB = createTestCommission("commissionB", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 20, char2: 20 };

      const result = findBestCommissionAssignment(
        [commissionA, commissionB],
        characters,
        levels,
        lookup
      );

      // Commission A (higher value) should be assigned
      const assignmentA = result.assignments.find(a => a.commissionId === "commissionA");

      expect(assignmentA?.team).not.toBeNull();
      expect(result.stats.totalCommissionValue).toBeGreaterThan(0);
    });

    it("minimizes total characters when commission values are equal", () => {
      // Two missions with same value (1 base condition each)
      // Multiple ways to assign, prefer using fewer total characters
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-001"] }),
        createTestCharacter("char3", { role: ["role-002"] }),
        createTestCharacter("char4", { role: ["role-002"] }),
      ];

      const commission1 = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const commission2 = createTestCommission("commission2", 10, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 20, char2: 20, char3: 20, char4: 20 };

      const result = findBestCommissionAssignment(
        [commission1, commission2],
        characters,
        levels,
        lookup
      );

      // Should assign both missions
      expect(result.stats.commissionsAssigned).toBe(2);

      // Should use 2 characters total (1 per commission), not more
      expect(result.stats.totalCharactersUsed).toBe(2);
    });

    it("prefers smaller teams per commission", () => {
      // Commission can be satisfied by 1 character or 2 characters
      // Should prefer 1-character team
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-001"] }),
      ];

      const commission = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const levels = { char1: 20, char2: 20 };

      const result = findBestCommissionAssignment(
        [commission],
        characters,
        levels,
        lookup
      );

      const assignment = result.assignments.find(a => a.commissionId === "commission1");
      expect(assignment?.team).not.toBeNull();

      // Should use only 1 character
      expect(assignment?.team?.characterIds.length).toBe(1);
    });

    it("handles partial coverage when resources insufficient", () => {
      // 4 commissions, only enough chars for 2
      // Should assign the highest value missions
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commission1 = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
        { category: "role", anyOf: ["role-002"] },
      ], [
        { category: "role", anyOf: ["role-001"] },
        { category: "role", anyOf: ["role-002"] },
      ]);

      const commission2 = createTestCommission("commission2", 10, [
        { category: "role", anyOf: ["role-001"] },
        { category: "role", anyOf: ["role-002"] },
      ]);

      const commission3 = createTestCommission("commission3", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const commission4 = createTestCommission("commission4", 10, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const levels = { char1: 20, char2: 20 };

      const result = findBestCommissionAssignment(
        [commission1, commission2, commission3, commission4],
        characters,
        levels,
        lookup
      );

      // Should assign at least one commission
      expect(result.stats.commissionsAssigned).toBeGreaterThan(0);
      expect(result.stats.commissionsAssigned).toBeLessThan(4);

      // Should have unassigned commissions
      expect(result.stats.unassignedCommissionIds.length).toBeGreaterThan(0);
    });

    it("tracks unassigned commissions correctly", () => {
      // 3 commissions, but commission3 cannot be satisfied
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", { role: ["role-002"] }),
      ];

      const commission1 = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const commission2 = createTestCommission("commission2", 10, [
        { category: "role", anyOf: ["role-002"] },
      ]);

      const commission3 = createTestCommission("commission3", 10, [
        { category: "role", anyOf: ["role-003"] }, // No character has role-003
      ]);

      const levels = { char1: 20, char2: 20 };

      const result = findBestCommissionAssignment(
        [commission1, commission2, commission3],
        characters,
        levels,
        lookup
      );

      // Should assign commission1 and commission2
      expect(result.stats.commissionsAssigned).toBe(2);

      // commission3 should be unassigned
      expect(result.stats.unassignedCommissionIds).toContain("commission3");
    });

    it("calculates commission value correctly", () => {
      const characters = [
        createTestCharacter("char1", {
          role: ["role-001"],
          style: ["style-001"],
        }),
      ];

      // Commission with 2 base conditions = value 2
      const commission = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
        { category: "style", anyOf: ["style-001"] },
      ]);

      const levels = { char1: 20 };

      const result = findBestCommissionAssignment(
        [commission],
        characters,
        levels,
        lookup
      );

      const assignment = result.assignments.find(a => a.commissionId === "commission1");
      expect(assignment?.commissionValue).toBe(2);
      expect(result.stats.totalCommissionValue).toBe(2);
    });

    it("prefers bonus-satisfying teams as tiebreaker", () => {
      // Commission with base and bonus conditions
      // Two possible teams: one satisfies bonus, one doesn't
      const characters = [
        createTestCharacter("char1", { role: ["role-001"] }),
        createTestCharacter("char2", {
          role: ["role-001"],
          style: ["style-001"], // This enables bonus
        }),
      ];

      const commission = createTestCommission(
        "commission1",
        10,
        [{ category: "role", anyOf: ["role-001"] }],
        [{ category: "style", anyOf: ["style-001"] }]
      );

      const levels = { char1: 20, char2: 20 };

      const result = findBestCommissionAssignment(
        [commission],
        characters,
        levels,
        lookup
      );

      const assignment = result.assignments.find(a => a.commissionId === "commission1");
      expect(assignment?.team).not.toBeNull();

      // Should prefer char2 because it satisfies bonus
      expect(assignment?.team?.satisfiesBonus).toBe(true);
    });

    it("returns empty assignment for no missions", () => {
      const characters = [createTestCharacter("char1", { role: ["role-001"] })];
      const levels = { char1: 20 };

      const result = findBestCommissionAssignment([], characters, levels, lookup);

      expect(result.assignments).toHaveLength(0);
      expect(result.stats.commissionsAssigned).toBe(0);
      expect(result.stats.commissionsTotal).toBe(0);
      expect(result.stats.totalCharactersUsed).toBe(0);
    });

    it("returns empty assignment for no characters", () => {
      const commission = createTestCommission("commission1", 10, [
        { category: "role", anyOf: ["role-001"] },
      ]);

      const result = findBestCommissionAssignment([commission], [], {}, lookup);

      expect(result.stats.commissionsAssigned).toBe(0);
      expect(result.stats.unassignedCommissionIds).toContain("commission1");
    });
  });
});
