import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { TagEntry } from "../types";
import {
  loadData,
  getTags,
  getCharacters,
  getMissions,
  getBitmaskLookup,
  isDataLoaded,
  resolveTagName,
  getTagsInCategory,
  getCharactersByTag,
  getCharactersByTags,
  getCharacterById,
  getMissionsByTag,
  getMissionsByLevel,
  getMissionById,
  getCharacterName,
  getMissionName,
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

    it("loads missions data", async () => {
      await loadData();
      const missions = getMissions();

      expect(missions).toBeDefined();
      expect(Array.isArray(missions)).toBe(true);
      expect(missions.length).toBeGreaterThan(0);

      // Check structure of first mission
      const mission = missions[0];
      expect(mission).toHaveProperty("id");
      expect(mission).toHaveProperty("name");
      expect(mission).toHaveProperty("requiredLevel");
      expect(mission).toHaveProperty("baseConditions");
      expect(mission).toHaveProperty("durations");
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

    it("getMissions throws error when data not loaded", () => {
      expect(() => getMissions()).toThrow("Data not loaded");
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

  describe("Mission Filtering", () => {
    beforeEach(async () => {
      await loadData();
    });

    it("gets missions by tag", () => {
      const missions = getMissionsByTag("role-001");

      expect(Array.isArray(missions)).toBe(true);
      expect(missions.length).toBeGreaterThan(0);

      // Verify all returned missions require the tag
      missions.forEach((mission) => {
        const allConditions = [
          ...mission.baseConditions,
          ...(mission.bonusConditions || []),
        ];
        const hasTag = allConditions.some((cond) =>
          cond.anyOf.includes("role-001")
        );
        expect(hasTag).toBe(true);
      });
    });

    it("gets missions by minimum level", () => {
      const missions = getMissionsByLevel(10);

      expect(Array.isArray(missions)).toBe(true);

      // Verify all returned missions have required level >= 10
      missions.forEach((mission) => {
        expect(mission.requiredLevel).toBeGreaterThanOrEqual(10);
      });
    });

    it("gets missions by level range", () => {
      const missions = getMissionsByLevel(1, 10);

      expect(Array.isArray(missions)).toBe(true);

      // Verify all returned missions are in range [1, 10]
      missions.forEach((mission) => {
        expect(mission.requiredLevel).toBeGreaterThanOrEqual(1);
        expect(mission.requiredLevel).toBeLessThanOrEqual(10);
      });
    });

    it("gets mission by ID", () => {
      const mission = getMissionById("m-001");

      expect(mission).toBeDefined();
      expect(mission?.id).toBe("m-001");
      expect(mission?.name.ja).toBe("資金獲得 初級");
    });

    it("returns undefined for unknown mission ID", () => {
      const mission = getMissionById("m-999");

      expect(mission).toBeUndefined();
    });

    it("gets localized mission name", () => {
      const mission = getMissionById("m-001");
      expect(mission).toBeDefined();

      const nameJa = getMissionName(mission!, "ja");
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

    it("can find missions that a character can participate in", () => {
      // Get a character
      const char = getCharacterById("char-001");
      expect(char).toBeDefined();

      // Get missions that require any of this character's tags
      const missions = getMissions().filter((mission) => {
        const allConditions = [
          ...mission.baseConditions,
          ...(mission.bonusConditions || []),
        ];

        return allConditions.some((condition) => {
          const charTagsInCategory = char!.tags[condition.category] || [];
          return condition.anyOf.some((tagId) =>
            charTagsInCategory.includes(tagId)
          );
        });
      });

      // Character should be able to participate in at least one mission
      expect(missions.length).toBeGreaterThan(0);
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
