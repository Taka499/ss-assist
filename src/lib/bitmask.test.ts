import { describe, it, expect } from 'vitest';
import type { TagDict, Character, Condition, Category } from '../types/index.js';
import {
  buildBitmaskLookup,
  characterToBitmask,
  conditionToBitmask,
  mergeBitmasks,
  satisfiesCondition,
  satisfiesAllConditions,
  buildConditionCounts,
  satisfiesConditionWithCounts,
  satisfiesAllConditionsWithCounts,
} from './bitmask.js';

// Test fixtures
const createTestTagDict = (): TagDict => ({
  role: [
    { id: 'role-001', ja: 'バランサー' },
    { id: 'role-002', ja: 'アタッカー' },
    { id: 'role-003', ja: 'サポーター' },
  ],
  style: [
    { id: 'style-001', ja: '冒険家' },
    { id: 'style-002', ja: '独創性' },
  ],
  faction: [
    { id: 'faction-001', ja: '雲笈文化' },
    { id: 'faction-002', ja: 'ムーナワークス' },
  ],
  element: [
    { id: 'element-001', ja: '水' },
  ],
  rarity: [
    { id: 'rarity-005', ja: '5' },
  ],
});

const createTestCharacter = (
  id: string,
  tags: Partial<Record<Category, string[]>>
): Character => ({
  id,
  name: { ja: id },
  icon: 'assets/characters/' + id + '.png',
  tags,
});

describe('Bitmask System', () => {
  describe('buildBitmaskLookup', () => {
    it('assigns unique bits per category', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);

      expect(lookup.tagToBit.get('role-001')?.bit).toBe(0);
      expect(lookup.tagToBit.get('role-002')?.bit).toBe(1);
      expect(lookup.tagToBit.get('role-003')?.bit).toBe(2);

      expect(lookup.tagToBit.get('style-001')?.bit).toBe(0);
      expect(lookup.tagToBit.get('style-002')?.bit).toBe(1);

      expect(lookup.categoryBits.role).toBe(3);
      expect(lookup.categoryBits.style).toBe(2);
      expect(lookup.categoryBits.faction).toBe(2);
      expect(lookup.categoryBits.element).toBe(1);
      expect(lookup.categoryBits.rarity).toBe(1);
    });

    it('throws error if category exceeds 32 tags', () => {
      const tags: TagDict = {
        role: Array.from({ length: 33 }, (_, i) => ({
          id: 'role-' + String(i + 1).padStart(3, '0'),
          ja: 'Role ' + (i + 1),
        })),
        style: [],
        faction: [],
        element: [],
        rarity: [],
      };

      expect(() => buildBitmaskLookup(tags)).toThrow(/exceeding the maximum of 32/);
    });
  });

  describe('characterToBitmask', () => {
    it('correctly sets bits for character tags', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter('test', {
        role: ['role-001'],
        style: ['style-002'],
      });

      const bitmask = characterToBitmask(character, lookup);

      expect(bitmask.role).toBe(1);
      expect(bitmask.style).toBe(2);
      expect(bitmask.faction).toBe(0);
      expect(bitmask.element).toBe(0);
      expect(bitmask.rarity).toBe(0);
    });

    it('handles multiple tags in same category', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter('test', {
        role: ['role-001', 'role-003'],
      });

      const bitmask = characterToBitmask(character, lookup);
      expect(bitmask.role).toBe(5);
    });

    it('handles empty tags', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const character = createTestCharacter('test', {});

      const bitmask = characterToBitmask(character, lookup);
      expect(bitmask.role).toBe(0);
      expect(bitmask.style).toBe(0);
    });
  });

  describe('conditionToBitmask', () => {
    it('handles anyOf with multiple tags', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const condition: Condition = {
        category: 'role',
        anyOf: ['role-001', 'role-002'],
      };

      const mask = conditionToBitmask(condition, lookup);
      expect(mask).toBe(3);
    });

    it('deduplicates tags in anyOf', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-001', 'role-002'],
      };

      const mask = conditionToBitmask(condition, lookup);
      expect(mask).toBe(3);
    });
  });

  describe('mergeBitmasks', () => {
    it('combines multiple character bitmasks using OR', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const char1 = createTestCharacter('char1', { role: ['role-001'] });
      const char2 = createTestCharacter('char2', { role: ['role-002'] });

      const mask1 = characterToBitmask(char1, lookup);
      const mask2 = characterToBitmask(char2, lookup);
      const merged = mergeBitmasks([mask1, mask2]);

      expect(merged.role).toBe(3);
    });

    it('handles empty array', () => {
      const merged = mergeBitmasks([]);
      expect(merged.role).toBe(0);
      expect(merged.style).toBe(0);
    });
  });

  describe('satisfiesCondition', () => {
    it('detects matches with bitwise AND', () => {
      expect(satisfiesCondition(5, 3)).toBe(true);
    });

    it('detects mismatches', () => {
      expect(satisfiesCondition(4, 3)).toBe(false);
    });

    it('handles exact match', () => {
      expect(satisfiesCondition(3, 3)).toBe(true);
    });
  });

  describe('satisfiesAllConditions', () => {
    it('requires all conditions to pass', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const char = createTestCharacter('test', {
        role: ['role-001'],
        style: ['style-001'],
      });
      const bitmask = characterToBitmask(char, lookup);

      const conditions: Condition[] = [
        { category: 'role', anyOf: ['role-001', 'role-002'] },
        { category: 'style', anyOf: ['style-001'] },
      ];

      expect(satisfiesAllConditions(bitmask, conditions, lookup)).toBe(true);
    });

    it('fails if any condition is not satisfied', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const char = createTestCharacter('test', {
        role: ['role-001'],
      });
      const bitmask = characterToBitmask(char, lookup);

      const conditions: Condition[] = [
        { category: 'role', anyOf: ['role-001'] },
        { category: 'style', anyOf: ['style-001'] },
      ];

      expect(satisfiesAllConditions(bitmask, conditions, lookup)).toBe(false);
    });

    it('returns true for empty conditions', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const char = createTestCharacter('test', {});
      const bitmask = characterToBitmask(char, lookup);

      expect(satisfiesAllConditions(bitmask, [], lookup)).toBe(true);
    });
  });

  describe('handles edge cases', () => {
    it('works with characters having no relevant tags', () => {
      const tags = createTestTagDict();
      const lookup = buildBitmaskLookup(tags);
      const char = createTestCharacter('test', {
        faction: ['faction-001'],
      });
      const bitmask = characterToBitmask(char, lookup);

      const condition: Condition = {
        category: 'role',
        anyOf: ['role-001'],
      };

      expect(satisfiesAllConditions(bitmask, [condition], lookup)).toBe(false);
    });
  });
});

describe('Count-based Validation', () => {
  describe('buildConditionCounts', () => {
    it('correctly counts duplicates', () => {
      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-001', 'role-002'],
      };

      const counts = buildConditionCounts(condition);
      expect(counts.get('role-002')).toBe(2);
      expect(counts.get('role-001')).toBe(1);
      expect(counts.size).toBe(2);
    });

    it('handles single tag', () => {
      const condition: Condition = {
        category: 'style',
        anyOf: ['style-001'],
      };

      const counts = buildConditionCounts(condition);
      expect(counts.get('style-001')).toBe(1);
      expect(counts.size).toBe(1);
    });

    it('handles all same tag', () => {
      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-002', 'role-002'],
      };

      const counts = buildConditionCounts(condition);
      expect(counts.get('role-002')).toBe(3);
      expect(counts.size).toBe(1);
    });
  });

  describe('satisfiesConditionWithCounts', () => {
    it('validates count requirements', () => {
      const char1 = createTestCharacter('char1', { role: ['role-002'] });
      const char2 = createTestCharacter('char2', { role: ['role-002'] });
      const char3 = createTestCharacter('char3', { role: ['role-001'] });

      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-001', 'role-002'],
      };

      expect(
        satisfiesConditionWithCounts([char1, char2, char3], condition, 'role')
      ).toBe(true);
    });

    it('detects insufficient counts', () => {
      const char1 = createTestCharacter('char1', { role: ['role-002'] });
      const char2 = createTestCharacter('char2', { role: ['role-001'] });

      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-002'],
      };

      expect(
        satisfiesConditionWithCounts([char1, char2], condition, 'role')
      ).toBe(false);
    });

    it('accepts excess characters', () => {
      const char1 = createTestCharacter('char1', { role: ['role-002'] });
      const char2 = createTestCharacter('char2', { role: ['role-002'] });
      const char3 = createTestCharacter('char3', { role: ['role-002'] });

      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-002'],
      };

      expect(
        satisfiesConditionWithCounts([char1, char2, char3], condition, 'role')
      ).toBe(true);
    });

    it('handles mixed tags correctly', () => {
      const char1 = createTestCharacter('char1', { role: ['role-001', 'role-002'] });
      const char2 = createTestCharacter('char2', { role: ['role-002'] });

      const condition: Condition = {
        category: 'role',
        anyOf: ['role-002', 'role-001', 'role-002'],
      };

      expect(
        satisfiesConditionWithCounts([char1, char2], condition, 'role')
      ).toBe(true);
    });
  });

  describe('satisfiesAllConditionsWithCounts', () => {
    it('validates all conditions', () => {
      const char1 = createTestCharacter('char1', {
        role: ['role-002'],
        style: ['style-001'],
      });
      const char2 = createTestCharacter('char2', {
        role: ['role-001'],
        style: ['style-002'],
      });

      const conditions: Condition[] = [
        { category: 'role', anyOf: ['role-002', 'role-001'] },
        { category: 'style', anyOf: ['style-001'] },
      ];

      expect(satisfiesAllConditionsWithCounts([char1, char2], conditions)).toBe(
        true
      );
    });

    it('fails if any condition is not satisfied', () => {
      const char1 = createTestCharacter('char1', {
        role: ['role-002'],
        style: ['style-001'],
      });

      const conditions: Condition[] = [
        { category: 'role', anyOf: ['role-002', 'role-002'] },
        { category: 'style', anyOf: ['style-001'] },
      ];

      expect(satisfiesAllConditionsWithCounts([char1], conditions)).toBe(false);
    });

    it('returns true for empty conditions', () => {
      const char = createTestCharacter('test', {});
      expect(satisfiesAllConditionsWithCounts([char], [])).toBe(true);
    });

    it('handles complex count requirements', () => {
      const char1 = createTestCharacter('char1', { role: ['role-002'] });
      const char2 = createTestCharacter('char2', { role: ['role-002'] });
      const char3 = createTestCharacter('char3', { role: ['role-001'] });

      const conditions: Condition[] = [
        { category: 'role', anyOf: ['role-002', 'role-001', 'role-002'] },
      ];

      expect(
        satisfiesAllConditionsWithCounts([char1, char2, char3], conditions)
      ).toBe(true);
    });
  });
});
