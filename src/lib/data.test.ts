import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TagEntry } from "../types";
import {
  loadData,
  getTags,
  getCharacters,
  getCommissions,
  getBitmaskLookup,
  isDataLoaded,
  resolveTagName,
  getTagsInCategory,
  getCharactersByTag,
  getCharactersByTags,
  getCharacterById,
  getCommissionsByTag,
  getCommissionsByLevel,
  getCommissionById,
  getCharacterName,
  getCommissionName,
  resetData,
} from "./data";

describe("Data Loading Layer", () => {
  // Reset data before and after each test
  beforeEach(() => {
    resetData();
  });

  afterEach(() => {
    resetData();
  });

  describe("loadData", () => {
    it("loads all data successfully", async () => {
      expect(isDataLoaded()).toBe(false);

      await loadData();

      expect(isDataLoaded()).toBe(true);
    });

    it("loads tags data", async () => {
      await loadData();
      const tags = getTags();

      expect(tags).toBeDefined();
      expect(tags.role).toBeDefined();
      expect(tags.style).toBeDefined();
      expect(tags.faction).toBeDefined();
      expect(tags.element).toBeDefined();
      expect(tags.rarity).toBeDefined();

      // Check that we have some tags
      expect(tags.role.length).toBeGreaterThan(0);
      expect(tags.style.length).toBeGreaterThan(0);
    });

    it("loads characters data", async () => {
      await loadData();
      const characters = getCharacters();

      expect(characters).toBeDefined();
      expect(Array.isArray(characters)).toBe(true);
      expect(characters.length).toBeGreaterThan(0);

      // Check structure of first character
      const char = characters[0];
      expect(char).toHaveProperty("id");
      expect(char).toHaveProperty("name");
      expect(char).toHaveProperty("icon");
      expect(char).toHaveProperty("tags");
    });

    it("loads commissions data", async () => {
      await loadData();
      const commissions = getCommissions();

      expect(commissions).toBeDefined();
      expect(Array.isArray(commissions)).toBe(true);
      expect(commissions.length).toBeGreaterThan(0);

      // Check structure of first commission
      const commission = commissions[0];
      expect(commission).toHaveProperty("id");
      expect(commission).toHaveProperty("name");
      expect(commission).toHaveProperty("requiredLevel");
      expect(commission).toHaveProperty("baseConditions");
      expect(commission).toHaveProperty("durations");
    });

    it("builds bitmask lookup table", async () => {
      await loadData();
      const lookup = getBitmaskLookup();

      expect(lookup).toBeDefined();
      expect(lookup.tagToBit).toBeDefined();
      expect(lookup.categoryBits).toBeDefined();

      // Check that some tags are mapped
      expect(lookup.tagToBit.size).toBeGreaterThan(0);
    });
  });

  describe("Error handling when data not loaded", () => {
    it("getTags throws error when data not loaded", () => {
      expect(() => getTags()).toThrow("Data not loaded");
    });

    it("getCharacters throws error when data not loaded", () => {
      expect(() => getCharacters()).toThrow("Data not loaded");
    });

    it("getCommissions throws error when data not loaded", () => {
      expect(() => getCommissions()).toThrow("Data not loaded");
    });

    it("getBitmaskLookup throws error when data not loaded", () => {
      expect(() => getBitmaskLookup()).toThrow("Data not loaded");
    });
  });

  describe("Tag Resolution", () => {
    beforeEach(async () => {
      await loadData();
    });

    it("resolves tag name in Japanese", () => {
      const name = resolveTagName("role-001", "ja");
      expect(name).toBe("バランサー");
    });

    it("resolves tag name in Simplified Chinese", () => {
      const name = resolveTagName("role-001", "zh-Hans");
      expect(name).toBe("均衡");
    });

    it("returns tag ID for unknown tag", () => {
      const name = resolveTagName("unknown-tag", "ja");
      expect(name).toBe("unknown-tag");
    });

    it("gets all tags in a category", () => {
      const tags = getTagsInCategory("role", "ja");

      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toHaveProperty("id");
      expect(tags[0]).toHaveProperty("name");

      // Check for known role tags
      const balancer = tags.find((t) => t.id === "role-001");
      expect(balancer).toBeDefined();
      expect(balancer?.name).toBe("バランサー");
    });

    it("gets tags in category with Chinese localization", () => {
      const tags = getTagsInCategory("role", "zh-Hans");

      const balancer = tags.find((t) => t.id === "role-001");
      expect(balancer?.name).toBe("均衡");
    });
  });

  describe("Character Filtering", () => {
    beforeEach(async () => {
      await loadData();
    });

    it("gets characters by single tag", () => {
      const balancers = getCharactersByTag("role-001");

      expect(Array.isArray(balancers)).toBe(true);
      expect(balancers.length).toBeGreaterThan(0);

      // Verify all returned characters have the tag
      balancers.forEach((char) => {
        const hasTag = char.tags.role?.includes("role-001");
        expect(hasTag).toBe(true);
      });
    });

    it("gets characters by multiple tags (AND logic)", () => {
      // Find characters with both role-001 (Balancer) and element-001 (Water)
      const chars = getCharactersByTags(["role-001", "element-001"]);

      expect(Array.isArray(chars)).toBe(true);

      // Verify all returned characters have both tags
      chars.forEach((char) => {
        const hasRole = char.tags.role?.includes("role-001");
        const hasElement = char.tags.element?.includes("element-001");
        expect(hasRole).toBe(true);
        expect(hasElement).toBe(true);
      });
    });

    it("returns all characters when empty tag array provided", () => {
      const chars = getCharactersByTags([]);

      const allChars = getCharacters();
      expect(chars.length).toBe(allChars.length);
    });

    it("gets character by ID", () => {
      const char = getCharacterById("char-001");

      expect(char).toBeDefined();
      expect(char?.id).toBe("char-001");
      expect(char?.name.ja).toBe("セイナ");
    });

    it("returns undefined for unknown character ID", () => {
      const char = getCharacterById("char-999");

      expect(char).toBeUndefined();
    });

    it("gets localized character name", () => {
      const char = getCharacterById("char-001");
      expect(char).toBeDefined();

      const nameJa = getCharacterName(char!, "ja");
      expect(nameJa).toBe("セイナ");

      const nameZh = getCharacterName(char!, "zh-Hans");
      expect(nameZh).toBe("尘沙");
    });
  });

  describe("Commission Filtering", () => {
    beforeEach(async () => {
      await loadData();
    });

    it("gets commissions by tag", () => {
      const commissions = getCommissionsByTag("role-001");

      expect(Array.isArray(commissions)).toBe(true);
      expect(commissions.length).toBeGreaterThan(0);

      // Verify all returned commissions require the tag
      commissions.forEach((commission) => {
        const allConditions = [
          ...commission.baseConditions,
          ...(commission.bonusConditions || []),
        ];
        const hasTag = allConditions.some((cond) =>
          cond.anyOf.includes("role-001")
        );
        expect(hasTag).toBe(true);
      });
    });

    it("gets commissions by minimum level", () => {
      const commissions = getCommissionsByLevel(10);

      expect(Array.isArray(commissions)).toBe(true);

      // Verify all returned commissions have required level >= 10
      commissions.forEach((commission) => {
        expect(commission.requiredLevel).toBeGreaterThanOrEqual(10);
      });
    });

    it("gets commissions by level range", () => {
      const commissions = getCommissionsByLevel(1, 10);

      expect(Array.isArray(commissions)).toBe(true);

      // Verify all returned commissions are in range [1, 10]
      commissions.forEach((commission) => {
        expect(commission.requiredLevel).toBeGreaterThanOrEqual(1);
        expect(commission.requiredLevel).toBeLessThanOrEqual(10);
      });
    });

    it("gets commission by ID", () => {
      const commission = getCommissionById("m-001");

      expect(commission).toBeDefined();
      expect(commission?.id).toBe("m-001");
      expect(commission?.name.ja).toBe("資金獲得 初級");
    });

    it("returns undefined for unknown commission ID", () => {
      const commission = getCommissionById("m-999");

      expect(commission).toBeUndefined();
    });

    it("gets localized commission name", () => {
      const commission = getCommissionById("m-001");
      expect(commission).toBeDefined();

      const nameJa = getCommissionName(commission!, "ja");
      expect(nameJa).toBe("資金獲得 初級");
    });
  });

  describe("Integration Tests", () => {
    beforeEach(async () => {
      await loadData();
    });

    it("can filter characters and resolve their tags", () => {
      // Get all Balancers
      const balancers = getCharactersByTag("role-001");
      expect(balancers.length).toBeGreaterThan(0);

      // Get the localized tag name
      const roleName = resolveTagName("role-001", "ja");
      expect(roleName).toBe("バランサー");

      // Verify the tag appears in the first character
      const firstChar = balancers[0];
      expect(firstChar.tags.role).toContain("role-001");
    });

    it("can find commissions that a character can participate in", () => {
      // Get a character
      const char = getCharacterById("char-001");
      expect(char).toBeDefined();

      // Get commissions that require any of this character's tags
      const commissions = getCommissions().filter((commission) => {
        const allConditions = [
          ...commission.baseConditions,
          ...(commission.bonusConditions || []),
        ];

        return allConditions.some((condition) => {
          const charTagsInCategory = char!.tags[condition.category] || [];
          return condition.anyOf.some((tagId) =>
            charTagsInCategory.includes(tagId)
          );
        });
      });

      // Character should be able to participate in at least one commission
      expect(commissions.length).toBeGreaterThan(0);
    });

    it("verifies data consistency between tags and characters", () => {
      const tags = getTags();
      const characters = getCharacters();

      // Collect all tag IDs used by characters
      const usedTagIds = new Set<string>();
      characters.forEach((char) => {
        Object.values(char.tags).forEach((tagArray) => {
          tagArray?.forEach((tagId) => usedTagIds.add(tagId));
        });
      });

      // Verify all used tag IDs exist in tags dictionary
      const allTagIds = new Set<string>();
      Object.values(tags).forEach((tagArray: TagEntry[]) => {
        tagArray.forEach((tag) => allTagIds.add(tag.id));
      });

      usedTagIds.forEach((tagId) => {
        expect(allTagIds.has(tagId)).toBe(true);
      });
    });
  });
});
