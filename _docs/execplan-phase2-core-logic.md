# Phase 2: Core Logic & Algorithms - ExecPlan

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `/Users/ghensk/Developer/ss-assist/_docs/PLANS.md` which is checked into the repository.


## Purpose / Big Picture

After completing this phase, the Stella Sora Request Assistant will have a working algorithm that can analyze a player's character roster and find all valid character combinations for selected missions. A developer will be able to import the core logic modules, pass in character ownership data and mission requirements, and receive back a list of valid 1-3 character combinations that satisfy mission conditions, along with recommendations for which characters to prioritize leveling up to unlock more missions.

The demonstrable outcome is: Create a Node.js test script that loads real mission data, simulates a player owning 10 characters at various levels, runs the combination search algorithm, and outputs a list of valid character combinations with clear indicators showing which combinations meet base conditions (受注条件) and which also meet bonus conditions (追加報酬条件). The script will also output training recommendations showing "Level Character X to 50 to unlock N missions."


## Progress

- [x] Milestone 1: Implement bitmask system for efficient tag matching (✅ Completed 2025-11-05)
  - [x] Create `src/lib/bitmask.ts` with bit allocation functions
  - [x] Implement tag-to-bitmask conversion
  - [x] Implement condition-to-bitmask conversion
  - [x] Implement combination mask merging (bitwise OR)
  - [x] Implement condition checking (bitwise AND)
  - [x] Implement count-based validation functions (buildConditionCounts, satisfiesConditionWithCounts, satisfiesAllConditionsWithCounts)
  - [x] Write comprehensive unit tests (27 tests covering both bitmask and count-based validation)
  - [x] All tests passing (100% pass rate)

- [x] Milestone 2: Build data loading and processing layer (✅ Completed 2025-11-06)
  - [x] Create `src/lib/data.ts` with JSON loading functions
  - [x] Implement bitmask lookup table builder
  - [x] Implement tag resolution (ID to localized label)
  - [x] Implement character filtering utilities
  - [x] Write unit tests for data operations (29 tests)
  - [x] Verify data loading with real JSON files

- [x] Milestone 3: Implement combination search algorithm (✅ Completed 2025-11-07)
  - [x] Create `src/lib/combos.ts` with combination generator
  - [x] Implement level requirement checking
  - [x] Implement base condition validation
  - [x] Implement bonus condition validation
  - [x] Implement pruning optimization (interactsWith check)
  - [x] Implement result ranking and formatting
  - [x] Write unit tests with edge cases (30 tests)
  - [x] Test with real mission data (integration test script)

- [x] Milestone 4: Build training priority scoring system (✅ Completed 2025-11-07)
  - [x] Create `src/lib/scoring.ts` with scoring functions
  - [x] Implement impact calculation (missions unlocked)
  - [x] Implement bonus achievement calculation
  - [x] Implement level gap cost calculation
  - [x] Implement tag rarity bonus calculation
  - [x] Implement cross-mission ranking algorithm
  - [x] Write unit tests for scoring logic (21 tests)
  - [x] Test with realistic scenarios (integration test script)


## Surprises & Discoveries

### Count-Based Conditions Discovery (2025-11-05)

**Observation:** While reviewing the real mission data in `data-sources/stellasora - missions.csv`, we discovered that some missions require **multiple characters with the same tag**. For example, mission m-003 (資金獲得 上級) has:
```
base_role: アタッカー|バランサー|アタッカー
```
This means: "Dispatch 2 Attackers and 1 Balancer" - a **counting requirement**, not just presence/absence.

**Problem:** The initial bitmask-only design cannot handle this. Bitmasks track presence (yes/no) but not counts. When merging:
- Character A (Attacker): bitmask `0b010`
- Character B (Attacker): bitmask `0b010`
- Merged: `0b010` ← **The duplicate is lost!**

Bitwise OR operations collapse duplicates. We cannot distinguish between "1 Attacker" and "2 Attackers" using bitmasks alone.

**Evidence:** Approximately 9 missions (m-003, m-006, m-009, m-012, m-015, m-018, m-021, m-024, m-027) in the dataset require duplicate role tags, all for "上級" (advanced) difficulty missions.

**Impact:** This requires a fundamental redesign of the condition validation approach. We cannot rely solely on bitmasks for correctness.


### "Satisfiable" vs "Completable" Semantics (2025-11-07)

**Observation:** During Milestone 4 implementation, discovered that `findCombinations().satisfiable` only checks whether tag conditions can be met, not whether characters meet level requirements. A mission could be "satisfiable" (has valid tag combinations) but not "completable" (all combinations have level deficits preventing actual mission execution).

**Example:** Mission requires level 50. Player has a character with correct tags at level 30. The combination search marks this as "satisfiable" because tags match, but the combination has a level deficit of 20, making it not actually completable.

**Impact:** The training impact calculation in `calculateTrainingImpact()` needed to distinguish between:
- Satisfiable: Tag requirements can be met (may have level deficits)
- Completable: At least one combination has no level deficits

**Solution:** Added logic to check `Object.keys(levelDeficits).length === 0` to determine if a combination is truly completable without any training required.


## Decision Log

### Decision: Hybrid Bitmask + Count-Based Validation (2025-11-05)

**Problem:** Bitmasks alone cannot handle missions requiring multiple characters with the same tag.

**Decision:** Implement a **hybrid approach**:
1. **Bitmasks for pruning** - Keep bitmask operations for the `interactsWith` optimization to quickly eliminate irrelevant characters
2. **Count-based validation** - After generating combinations, validate using actual tag counts from the character array

**Rationale:**
- Bitmasks remain valuable for performance (O(1) pruning checks)
- Count validation is only needed for the final validation step (already O(N) where N ≤ 3)
- Hybrid approach maintains most of the performance benefit while ensuring correctness

**Implementation Changes:**
- Update `Condition` type to track required counts: `Map<tagId, minCount>`
- CSV parser must detect duplicates in pipe-separated lists
- Add `satisfiesConditionWithCounts()` function for final validation
- Keep `satisfiesCondition()` bitmask function for pruning only


### Decision: Dependency Injection for Scoring Functions (2025-11-07)

**Problem:** Initial implementation of `calculateTrainingImpact()` and `calculateTrainingPriority()` used `getBitmaskLookup()` from the data module to access global state. This created testing difficulties because tests needed to set up the entire data loading system before they could test scoring logic in isolation.

**Decision:** Refactor scoring functions to accept `BitmaskLookup` as a parameter rather than importing from global state.

**Rationale:**
- Pure functions with explicit dependencies are easier to test (no global state setup required)
- Dependency injection makes the function contracts clearer
- Enables unit tests to run faster by creating minimal test fixtures instead of loading full data files
- Follows functional programming best practices

**Implementation:**
- Changed `calculateTrainingImpact()` signature to include `bitmaskLookup: BitmaskLookup` parameter
- Changed `calculateTrainingPriority()` signature to include `bitmaskLookup: BitmaskLookup` parameter
- Updated all test files to build `BitmaskLookup` from test fixtures using `buildBitmaskLookup()`
- No changes to public API needed in data module

**Date:** 2025-11-07


## Outcomes & Retrospective

### Milestone 1 Retrospective (2025-11-05)

**Status:** ✅ Completed successfully

**What Was Achieved:**

Milestone 1 delivered a complete hybrid validation system that combines bitmask optimization with count-based validation. The implementation successfully handles both simple tag presence requirements and complex counting requirements (e.g., "2 Attackers + 1 Balancer").

**Key Accomplishments:**

1. **Bitmask Infrastructure** - Implemented complete bitmask system with:
   - `buildBitmaskLookup()` - Assigns unique bit positions per category (max 32 tags each)
   - `characterToBitmask()` - Converts character tags to category-wise bitmasks
   - `conditionToBitmask()` - Converts anyOf arrays to bitmasks (deduplicating)
   - `mergeBitmasks()` - Combines character bitmasks via bitwise OR
   - `satisfiesCondition()` and `satisfiesAllConditions()` - Fast O(1) checking for pruning

2. **Count-Based Validation** - Implemented accurate validation functions:
   - `buildConditionCounts()` - Parses anyOf arrays counting duplicates (e.g., `["role-002", "role-001", "role-002"]` → `{role-002: 2, role-001: 1}`)
   - `satisfiesConditionWithCounts()` - Validates character combinations meet count requirements
   - `satisfiesAllConditionsWithCounts()` - Main validation function for final combination checking

3. **Comprehensive Testing** - Created 27 unit tests covering:
   - Bitmask operations (bit allocation, conversion, merging, checking)
   - Count-based validation (single counts, duplicates, insufficient counts, mixed tags)
   - Edge cases (empty tags, empty conditions, no relevant tags)
   - All tests passing with 100% success rate

**Demonstrable Outcomes:**

Running `npx vitest run src/lib/bitmask.test.ts` produces:
```
✓ src/lib/bitmask.test.ts  (27 tests) 3ms
Test Files  1 passed (1)
Tests      27 passed (27)
```

The hybrid system correctly handles:
- Simple missions: "Need 1 Attacker OR 1 Balancer" → bitmask checking works
- Count-based missions: "Need 2 Attackers + 1 Balancer" → count validation works
- Performance: Bitmasks enable O(1) pruning in interactsWith checks (Milestone 3)

**Challenges Encountered:**

1. **File Encoding Issues** - The Write tool initially created test files with incorrect encoding (binary/Shift-JIS) causing Japanese characters to render incorrectly. Solution: Used bash heredoc to ensure proper UTF-8 encoding.

2. **Critical Design Discovery** - During implementation, discovered that ~9 missions (all 上級 difficulty) require duplicate tags. This fundamentally changed the design from pure bitmask to hybrid approach. The discovery was caught early by reviewing real mission data.

**What Worked Well:**

- Early validation with real data prevented late-stage architectural changes
- Clear separation of concerns: bitmasks for performance, counts for correctness
- Comprehensive test coverage caught edge cases (e.g., characters with multiple tags in same category)
- JSDoc documentation makes the hybrid approach clear to future developers

**Lessons Learned:**

1. **Validate Assumptions with Real Data Early** - Reviewing the actual mission CSV before implementing revealed the count requirement that pure bitmask couldn't handle
2. **Hybrid Approaches Are Valid** - Don't force a single technique; combining bitmasks (performance) + counts (correctness) gives best of both worlds
3. **File Encoding Matters in Multi-Language Projects** - Always verify UTF-8 encoding when working with CJK characters
4. **Test Edge Cases Explicitly** - Tests for "all same tag" and "mixed tags" scenarios caught subtle bugs in count validation

**Next Steps:**

Milestone 1 provides a solid foundation. Next milestone (Data Loading) will use these validation functions to process real game data from Phase 1.


### Milestone 2 Retrospective (2025-11-06)

**Status:** ✅ Completed successfully

**What Was Achieved:**

Milestone 2 delivered a complete data loading and processing layer that connects the JSON data files from Phase 1 to the bitmask validation system from Milestone 1. The implementation provides a clean, type-safe API for loading game data, resolving localized tag names, and filtering characters and missions.

**Key Accomplishments:**

1. **Data Loading Infrastructure** - Implemented complete data loading system with:
   - `loadData()` - Async function using dynamic imports for efficient JSON loading
   - `getTags()`, `getCharacters()`, `getMissions()`, `getBitmaskLookup()` - Getters with error handling
   - `isDataLoaded()` - Status check function
   - `resetData()` - Testing utility for clean test isolation

2. **Tag Resolution System** - Implemented i18n-aware tag utilities:
   - `resolveTagName(tagId, lang)` - Resolves tag IDs to localized labels (ja, zh-Hans, zh-Hant)
   - `getTagsInCategory(category, lang)` - Returns all tags in a category with localized names
   - Automatic fallback to Japanese when translation missing

3. **Character Filtering** - Implemented flexible character query functions:
   - `getCharactersByTag(tagId)` - Find characters with a specific tag
   - `getCharactersByTags(tagIds)` - Find characters with ALL specified tags (AND logic)
   - `getCharacterById(charId)` - Direct character lookup
   - `getCharacterName(character, lang)` - Get localized character name

4. **Mission Filtering** - Implemented mission query functions:
   - `getMissionsByTag(tagId)` - Find missions requiring a specific tag (checks both base and bonus conditions)
   - `getMissionsByLevel(minLevel, maxLevel?)` - Find missions in level range
   - `getMissionById(missionId)` - Direct mission lookup
   - `getMissionName(mission, lang)` - Get localized mission name

5. **Comprehensive Testing** - Created 29 unit tests covering:
   - Data loading and initialization
   - Error handling when data not loaded
   - Tag resolution in multiple languages (Japanese, Simplified Chinese)
   - Character filtering (single tag, multiple tags, by ID)
   - Mission filtering (by tag, by level, by ID)
   - Integration tests verifying data consistency
   - All tests passing with 100% success rate

**Demonstrable Outcomes:**

Running `npx vitest run src/lib/data.test.ts` produces:
```
✓ src/lib/data.test.ts  (29 tests) 21ms
Test Files  1 passed (1)
Tests      29 passed (29)
```

Running all lib tests together (`npx vitest run src/lib/`) shows:
```
✓ src/lib/bitmask.test.ts  (27 tests) 3ms
✓ src/lib/data.test.ts     (29 tests) 22ms
Test Files  2 passed (2)
Tests      56 passed (56)
```

**Challenges Encountered:**

1. **Type Definition Mismatch** - Initial implementation imported `BitmaskLookup` type from `types/index.ts`, but this conflicted with the more detailed type defined in `bitmask.ts` (using `Map<string, BitPosition>` vs. `Record<string, number>`). Solution: Import the `BitmaskLookup` type directly from `bitmask.ts` to use the actual implementation's type.

2. **TypeScript Inference in Tests** - `Object.values(tags)` in test code didn't infer the correct type, causing implicit `any` errors. Solution: Add explicit type annotation `Object.values(tags).forEach((tagArray: TagEntry[])`.

**What Worked Well:**

- Module boundaries are clean: data.ts only depends on bitmask.ts and types, no circular dependencies
- Error handling prevents accessing data before it's loaded with clear error messages
- Integration tests verify consistency between tags, characters, and missions
- Test isolation using beforeEach/afterEach with resetData() ensures clean test state
- Real data validation: tests load actual JSON files (26 characters, 36 missions, 32 tags)

**Lessons Learned:**

1. **Import Type from Implementation, Not Spec** - When a module defines a complex type that differs from a simplified specification, import the implementation's type to avoid mismatches
2. **Test with Real Data Early** - Loading actual JSON files in tests (not just mocks) catches data structure mismatches and validates the full pipeline
3. **Explicit Type Annotations Help Inference** - When TypeScript can't infer types from `Object.values()` on dictionary types, explicit annotations make the code clearer anyway

**Next Steps:**

Milestone 2 provides complete data access infrastructure. Next milestone (Combination Search) will use these functions to load mission requirements and character rosters, then generate valid combinations using the hybrid bitmask + count validation from Milestone 1.


### Milestone 3 Retrospective (2025-11-07)

**Status:** ✅ Completed successfully

**What Was Achieved:**

Milestone 3 delivered a complete combination search algorithm that efficiently finds all valid character combinations for missions. The implementation successfully combines bitmask optimization for pruning with count-based validation for correctness, achieving excellent performance while handling complex requirements.

**Key Accomplishments:**

1. **Core Algorithm Implementation** - Implemented complete combination search with:
   - `findCombinations()` - Main algorithm that orchestrates the entire search process
   - `generateCombinations()` - Generates all 1-3 character combinations using nested loops
   - `checkLevelRequirements()` - Identifies level deficits for each character
   - `rankCombinations()` - Sorts results by bonus conditions, level deficits, and efficiency

2. **Pruning Optimization** - Implemented efficient character filtering:
   - `interactsWith()` - O(1) bitmask check to eliminate irrelevant characters
   - Reduces search space significantly (e.g., 20 characters → ~5-10 relevant → fewer combinations)
   - Uses bitwise AND operations on category-wise bitmasks

3. **Missing Tag Analysis** - Implemented helper for unsatisfiable missions:
   - `findMissingTags()` - Identifies which tags player needs to acquire
   - Helps guide player decisions about character acquisition
   - Returns representative tag IDs for each unsatisfied condition

4. **Comprehensive Testing** - Created 30 unit tests covering:
   - Combination generation (edge cases: empty, single item, various sizes)
   - Level requirement checking (deficits, exact matches, missing levels)
   - interactsWith pruning (relevant/irrelevant characters, base/bonus conditions)
   - Missing tag identification (partial satisfaction, multiple conditions)
   - Ranking logic (bonus priority, level deficits, character count, deterministic ordering)
   - Full integration tests (single/multi-character, count-based, unsatisfiable missions)
   - All tests passing with 100% success rate

5. **Integration Testing** - Created comprehensive integration test script:
   - `tests/test-combos.ts` - Tests with real game data (26 characters, 36 missions)
   - 4 test scenarios: simple mission, count-based requirements, unsatisfiable mission, performance test
   - Performance: 0.70ms for 20 characters (~1350 combinations evaluated = 325 combos/ms)
   - Successfully validates the entire pipeline from data loading to result ranking

**Demonstrable Outcomes:**

Running `npx vitest run src/lib/` produces:
```
✓ src/lib/bitmask.test.ts  (27 tests) 4ms
✓ src/lib/combos.test.ts   (30 tests) 12ms
✓ src/lib/data.test.ts     (29 tests) 25ms
Test Files  3 passed (3)
Tests      86 passed (86)
```

Running `npx tsx tests/test-combos.ts` demonstrates:
- ✓ Scenario 1: Found 40 valid combinations for simple mission (26 with bonus, 14 base only)
- ✓ Scenario 2: Found 360 valid combinations for count-based mission requiring "2 Attackers + 1 Balancer"
- ✓ Scenario 3: Correctly identified unsatisfiable mission and reported missing tags
- ✓ Performance: 0.70ms for 20 characters (excellent performance)

**Challenges Encountered:**

1. **File Write Requirement** - Initial attempt to write combos.ts failed because the file existed but was empty. Solution: Read the file first, then write. This is a tool constraint we need to work with.

2. **Test Complexity Management** - With 30 tests covering many scenarios, organization was critical. Solution: Used clear describe blocks and focused test names to maintain clarity.

**What Worked Well:**

- Algorithm design from ExecPlan was sound and required no major revisions
- Hybrid validation approach (bitmasks for pruning, counts for correctness) proved effective
- Type safety caught several potential bugs during implementation
- Comprehensive test coverage gave confidence in correctness
- Integration test with real data validated the entire pipeline

**Lessons Learned:**

1. **Bitmask Pruning is Highly Effective** - The interactsWith optimization significantly reduces search space. In typical scenarios, it cuts the candidate pool by 50-75%, leading to much faster overall search.

2. **Count-Based Validation is Essential** - About 9 missions in the dataset require duplicate tags (e.g., "2 Attackers + 1 Balancer"). The hybrid approach correctly handles these while maintaining performance.

3. **Performance Exceeds Requirements** - With 0.70ms for 20 characters, the algorithm is orders of magnitude faster than needed. This leaves room for UI responsiveness even on slower devices.

4. **Integration Tests Validate Design** - Running with real data (26 characters, 36 missions) proved the algorithm works correctly with actual game requirements, not just contrived test cases.

5. **Ranking Logic Matters for UX** - Prioritizing bonus conditions and level-ready combinations in the results makes the output immediately useful to players.

**Next Steps:**

Milestone 3 provides a working combination search engine. Next milestone (Training Priority Scoring) will analyze the impact of leveling characters and recommend which characters to prioritize for maximum mission unlock potential.


### Milestone 4 Retrospective (2025-11-07)

**Status:** ✅ Completed successfully

**What Was Achieved:**

Milestone 4 delivered a complete training priority scoring system that recommends which characters to level up for maximum mission unlock potential. The implementation successfully analyzes the impact of character training across multiple missions and provides actionable recommendations ranked by value.

**Key Accomplishments:**

1. **Tag Rarity System** - Implemented rarity calculation that rewards rare tags:
   - `calculateTagRarity()` - Computes rarity score as `1.0 / (count + 1)` for each tag
   - `calculateCharacterRarity()` - Sums rarity scores across all character tags
   - Rare characters get higher priority in recommendations

2. **Training Impact Analysis** - Implemented simulation-based impact calculation:
   - `calculateTrainingImpact()` - Runs combination search before/after training upgrade
   - Detects missions that become "completable" (have at least one combo with no level deficits)
   - Distinguishes between base condition unlocks and bonus condition additions
   - Tracks all affected missions for each training recommendation

3. **Comprehensive Scoring Algorithm** - Implemented weighted scoring formula:
   - Formula: `score = w1 * baseUnlocked + w2 * bonusAdded - w3 * levelGap + w4 * rarityBonus`
   - Default weights: base=3.0, bonus=2.0, levelGap=0.05, rarity=1.0
   - Evaluates all level milestones (10, 20, 30, ..., 90) above current level
   - Filters out zero-impact recommendations automatically

4. **Human-Readable Explanations** - Implemented explanation generator:
   - `explainRecommendation()` - Creates user-friendly training suggestions
   - Shows mission names and impact counts
   - Limits to 3 missions for readability

5. **Comprehensive Testing** - Created 21 unit tests covering:
   - Tag rarity calculation (single tags, multiple tags, empty cases)
   - Character rarity summation
   - Training impact detection (unlocks, bonus additions, count-based, zero-impact)
   - Training priority ranking (impact, weights, filtering, edge cases)
   - Explanation generation
   - All tests passing with 100% success rate

6. **Integration Testing** - Created comprehensive integration test script:
   - `tests/test-scoring.ts` - Tests with real game data (26 characters, 36 missions)
   - 4 test scenarios: basic recommendations, locked missions, bonus opportunities, performance
   - Performance: 128ms for 15 characters × 10 missions (0.34 recommendations/ms)
   - Successfully validates the entire pipeline from data loading to explanation generation

**Demonstrable Outcomes:**

Running `npx vitest run src/lib/` produces:
```
✓ src/lib/bitmask.test.ts  (27 tests) 3ms
✓ src/lib/scoring.test.ts  (21 tests) 5ms
✓ src/lib/combos.test.ts   (30 tests) 14ms
✓ src/lib/data.test.ts     (29 tests) 24ms
Test Files  4 passed (4)
Tests      107 passed (107)
```

Running `npx tsx tests/test-scoring.ts` demonstrates:
- ✓ Correctly identifies training recommendations for mission unlocks
- ✓ Distinguishes between base condition unlocks (higher priority) and bonus additions
- ✓ Rarity-based scoring rewards characters with rare tags
- ✓ Performance is acceptable (128ms for realistic scenarios)

**Challenges Encountered:**

1. **Dependency Injection Design** - Initial implementation used global state (`getBitmaskLookup()` from data module), which made testing difficult. Solution: Refactored functions to accept `BitmaskLookup` as parameter for clean dependency injection.

2. **"Satisfiable" vs "Completable" Semantics** - Discovered that `findCombinations().satisfiable` only checks tag conditions, not level requirements. A mission could be "satisfiable" (has valid tag combos) but not "completable" (all combos have level deficits). Solution: Added logic to check `Object.keys(levelDeficits).length === 0` to determine if a combination is truly completable.

**What Worked Well:**

- Simulation-based impact calculation is accurate and comprehensive
- Weighted scoring formula is flexible and tunable for different player preferences
- Dependency injection makes tests clean and fast (no global state)
- Integration test scenarios cover realistic player situations
- Explanation function makes recommendations immediately actionable

**Lessons Learned:**

1. **Simulate Don't Calculate** - For complex systems like training impact, simulation (running actual combination searches) is more reliable than trying to calculate impact analytically.

2. **Semantics Matter** - The difference between "satisfiable" (can meet tag requirements) and "completable" (can meet both tag and level requirements) was subtle but critical. Clear terminology prevents bugs.

3. **Dependency Injection in Pure Functions** - Passing dependencies as parameters (rather than importing from global state) makes functions more testable and composable.

4. **Performance is Acceptable for N×M×L** - Even with O(characters × missions × milestones) complexity, the algorithm runs in ~130ms for realistic scenarios. No further optimization needed.

5. **Default Weights Are Sufficient** - The default weight formula (base=3.0, bonus=2.0, gap=0.05, rarity=1.0) produces intuitive recommendations without tuning.

**Next Steps:**

Milestone 4 completes Phase 2! All four core modules are now implemented and tested. Phase 2 provides a complete algorithmic foundation:
- ✅ Bitmask validation system (27 tests)
- ✅ Data loading layer (29 tests)
- ✅ Combination search algorithm (30 tests)
- ✅ Training priority scoring (21 tests)
- **Total: 107 tests passing**

Next phase (Phase 3) will integrate these modules into the React UI, building the actual user-facing application.


## Context and Orientation

This is Phase 2 of the Stella Sora Request Assistant project. Phase 1 has been completed and delivered a working data pipeline that converts CSV files containing character and mission data into optimized JSON files. The JSON files are now available in the `data/` directory and contain 26 characters, 36 missions, and 32 tags across 5 categories.

The project is a serverless web application built with React, TypeScript, and Vite that will be deployed to GitHub Pages. The application helps players of the game Stella Sora determine which characters to assign to missions and which characters to prioritize leveling up.

Key concepts in this domain:

**Character (巡游者)**: A game unit that players collect. Each character has tags (role, style, faction, element, rarity) and a level (1-90). Characters are stored in `data/characters.json`.

**Mission (依頼)**: A task that requires dispatching 1-3 characters. Each mission has base conditions (受注条件, minimum requirements to accept the mission) and optional bonus conditions (追加報酬条件, requirements for additional rewards). Missions also have a required level (all dispatched characters must meet this level). Missions are stored in `data/missions.json`.

**Tag**: A categorical attribute that characters possess. Tags are organized into categories (role, style, faction, element, rarity). Each tag has a unique ID like "role-001" or "style-002". Tags are stored in `data/tags.json`.

**Condition**: A requirement that must be satisfied by the set of dispatched characters. Conditions specify a category and an anyOf array (list of tag IDs) from the JSON data. However, the anyOf array can contain **duplicates** to express counting requirements. For example:
- Simple: `anyOf: ["role-001", "role-002"]` means "at least one character with role-001 OR role-002"
- Count-based: `anyOf: ["role-002", "role-001", "role-002"]` means "at least 2 characters with role-002 AND at least 1 with role-001"

When processing conditions, we parse the anyOf array to build a count requirement map: `{ "role-002": 2, "role-001": 1 }`. All mission conditions must be satisfied for a combination to be valid.

**Bitmask**: A performance optimization technique where each tag is assigned a bit position in an integer, allowing tag presence to be checked using fast bitwise operations instead of array/set operations. For example, if role-001 is bit 0 and role-002 is bit 1, a character with role-001 has bitmask 0b01 (decimal 1), and a character with role-002 has bitmask 0b10 (decimal 2). A character with both would have 0b11 (decimal 3). This allows checking "does this character combination include role-001 OR role-002" with a single bitwise AND operation.

**Combination (組み合わせ)**: A set of 1-3 characters dispatched to a mission. The combination's tags are the union of all constituent characters' tags.

Phase 2 will implement four core modules:

1. `src/lib/bitmask.ts` - Converts tags to bitmasks for fast pruning; implements count-based validation for correctness
2. `src/lib/data.ts` - Loads JSON files and builds lookup tables (both bitmask and count-based)
3. `src/lib/combos.ts` - Finds all valid character combinations for a mission using hybrid validation
4. `src/lib/scoring.ts` - Recommends which characters to level up to unlock missions

All modules will export pure functions (no side effects) and will be thoroughly unit tested. The TypeScript types are already defined in `src/types/index.ts` from Phase 1.

The tech stack includes Node.js 18+, TypeScript 5, and Vitest for testing. The project uses ES modules (`"type": "module"` in package.json).


## Plan of Work

The work proceeds in four sequential milestones, each building on the previous. All code will use TypeScript with strict typing and will be tested using Vitest.

**Milestone 1: Bitmask System** - We will create a new file `src/lib/bitmask.ts` that implements a **hybrid validation system** combining bitmask optimization for pruning with count-based validation for correctness.

The key insight is that each tag category (role, style, faction, element, rarity) has its own independent bitmask space. Bitmasks enable O(1) checks for "does this character have ANY relevant tags?" which is used in the `interactsWith` pruning step. However, bitmasks alone cannot handle count requirements (e.g., "need 2 Attackers"), so we also implement count-based validation.

We will implement several functions:
- **Bitmask functions** (for pruning): `buildBitmaskLookup` creates tag-to-bit mappings, `characterToBitmask` converts character tags to bitmasks, `conditionToBitmask` converts anyOf arrays to bitmasks (deduplicating), `mergeBitmasks` combines character bitmasks via bitwise OR, `satisfiesCondition` checks presence via bitwise AND.
- **Count-based functions** (for validation): `buildConditionCounts` parses an anyOf array to create a `Map<tagId, minCount>`, `satisfiesConditionWithCounts` validates that a character combination has the required count of each tag.

The bitmask system will be validated with unit tests covering both approaches. We will verify that bitmask operations correctly identify presence and that count-based validation correctly handles duplicate tag requirements.

**Milestone 2: Data Loading** - We will create `src/lib/data.ts` that loads the three JSON files (tags, characters, missions) from the `data/` directory. This module will depend on the bitmask module to build optimized lookup tables at load time.

The main function will be `loadGameData` which reads all JSON files, validates basic structure, builds the tag ID to bit position mapping for each category, and builds bitmask representations for all characters and mission conditions. It will return a `GameData` object containing all loaded data plus the bitmask lookup tables.

We will also implement helper functions for tag resolution (`getTagLabel` which converts a tag ID like "role-001" to a localized label like "アタッカー" based on the current language) and character filtering (`filterCharactersByTags` for UI filter implementations in future phases).

This module will be validated by loading the real data files generated in Phase 1 and verifying that the bitmask tables are correctly constructed.

**Milestone 3: Combination Search** - We will create `src/lib/combos.ts` that implements the core algorithm for finding valid character combinations. This is the most complex module in Phase 2.

The main function will be `findCombinations` which takes a mission, a list of owned characters, and a level mapping (character ID to current level). It will return an array of valid combinations sorted by quality.

The algorithm works as follows: First, filter out characters below the mission's required level. Second, apply the `interactsWith` bitmask optimization which eliminates characters whose tags have zero overlap with any mission condition (they cannot possibly contribute). Third, generate all possible combinations of 1, 2, and 3 characters from the filtered candidates. Fourth, for each combination, validate using **count-based checking** - for each base condition, verify that the combination has the required number of characters with each required tag. If base conditions are satisfied, also check bonus conditions. Fifth, rank the results prioritizing combinations that meet bonus conditions, have all characters at sufficient level, and use fewer characters.

Note: We use bitmasks only for the `interactsWith` pruning step (step 2), not for final validation (step 4). Final validation uses count-based checking to handle missions requiring multiple characters with the same tag.

We will implement the combination generation using a simple nested loop approach (not full recursion) since the maximum combination size is only 3. For 1-character combinations, iterate through all candidates. For 2-character combinations, use nested loops ensuring i < j to avoid duplicates. For 3-character combinations, use triple nested loops ensuring i < j < k.

The pruning optimization (`interactsWith`) is critical for performance. A character "interacts with" a mission if at least one of its tags appears in at least one mission condition. We will use bitmasks to check this efficiently: for each category, if (characterMask & missionRequiredMask) is nonzero in any category, the character interacts.

**Milestone 4: Training Scoring** - We will create `src/lib/scoring.ts` that implements the training priority recommendation system. This helps players decide which character to level up next.

The main function will be `calculateTrainingPriority` which takes an array of missions, owned characters, current levels, and returns a ranked list of training recommendations. Each recommendation includes a character ID, target level, and a score indicating the benefit of that training.

The scoring algorithm evaluates each character at each potential level milestone (10, 20, 30, 40, 50, 60, 70, 80, 90) that is above their current level. For each candidate (character + target level), we run the combination search for all missions twice: once with current levels and once with the hypothetical upgraded level. We count how many missions change from "not satisfiable" to "satisfiable" (base condition impact) and how many change from "base only" to "base + bonus" (bonus impact).

The score formula is: `score = w1 * baseImpact + w2 * bonusImpact - w3 * levelGap + w4 * rarityBonus`. Default weights will be w1=3.0 (unlocking missions is most valuable), w2=2.0 (bonus rewards are valuable), w3=0.05 (penalize expensive training slightly), w4=1.0 (rare tags are valuable). The level gap is (targetLevel - currentLevel). The rarity bonus is calculated by counting how many owned characters have each tag; characters with rare tags get higher scores.

We will validate the scoring system by testing scenarios like "player has 5 characters, 2 missions are locked" and verifying that the algorithm correctly identifies which character to level up.


## Concrete Steps

All commands are run from the repository root directory `/Users/ghensk/Developer/ss-assist` unless otherwise specified.


### Milestone 1: Implement Bitmask System

**Step 1.1:** Create the bitmask module file:

    touch src/lib/bitmask.ts

**Step 1.2:** Open `src/lib/bitmask.ts` and implement the core bitmask functionality. The file will export several types and functions:

**Types:**

    // Category-specific bitmask (one number per category)
    export interface CategoryBitmasks {
      role: number;
      style: number;
      faction: number;
      element: number;
      rarity: number;
    }

    // Mapping from tag ID to bit position within its category
    export interface BitPosition {
      tagId: string;
      category: Category;
      bit: number;
    }

    // Complete bitmask lookup table
    export interface BitmaskLookup {
      tagToBit: Map<string, BitPosition>;
      categoryBits: Record<Category, number>; // Number of bits used per category
    }

**Functions to implement:**

`buildBitmaskLookup(tags: TagDict): BitmaskLookup` - Iterates through all tags in the tag dictionary and assigns each tag a unique bit position within its category. Returns the lookup table. Role tags get bits 0, 1, 2, ..., style tags get bits 0, 1, 2, ... (separate namespace per category). The maximum number of tags per category is 32 (JavaScript bitwise operations use 32-bit integers). Throw an error if any category exceeds 32 tags.

`characterToBitmask(character: Character, lookup: BitmaskLookup): CategoryBitmasks` - Converts a character's tags to category-wise bitmasks. For each category in the character's tags object, iterate through the tag IDs, look up the bit position, and set that bit using bitwise OR. Return a CategoryBitmasks object with one number per category.

`conditionToBitmask(condition: Condition, lookup: BitmaskLookup): number` - Converts a mission condition's anyOf array to a single bitmask. For each tag ID in the anyOf array, look up its bit position and set that bit. Return a single number representing "any of these tags".

`mergeBitmasks(masks: CategoryBitmasks[]): CategoryBitmasks` - Combines multiple characters' bitmasks using bitwise OR. This represents "the union of all tags in this combination". Iterate through each category and OR all the corresponding masks.

`satisfiesCondition(comboMask: number, conditionMask: number): boolean` - Checks if a combination's merged bitmask satisfies a condition's requirement. Use bitwise AND: `(comboMask & conditionMask) !== 0` means "at least one required tag is present".

`satisfiesAllConditions(comboMasks: CategoryBitmasks, conditions: Condition[], lookup: BitmaskLookup): boolean` - Checks if a combination satisfies all conditions in an array. For each condition, convert it to a bitmask, extract the appropriate category mask from comboMasks, and check satisfaction. Return true only if all conditions are satisfied. **Note: This function is for pruning only and does not handle count requirements correctly. Use count-based validation for final checks.**

**Count-based validation functions:**

`buildConditionCounts(condition: Condition): Map<string, number>` - Parses a condition's anyOf array to count how many times each tag ID appears. For example, `["role-002", "role-001", "role-002"]` returns `Map{ "role-002": 2, "role-001": 1 }`. This map represents "need at least 2 characters with role-002 AND at least 1 with role-001".

`satisfiesConditionWithCounts(characters: Character[], condition: Condition, category: Category): boolean` - Validates that a character combination meets count requirements. Build the condition counts map, then for each required tag ID and count, count how many characters in the combination have that tag. Return true only if all count requirements are met.

`satisfiesAllConditionsWithCounts(characters: Character[], conditions: Condition[]): boolean` - Validates all conditions using count-based checking. For each condition, call `satisfiesConditionWithCounts`. Return true only if all conditions pass.

**Step 1.3:** Create a test file:

    touch src/lib/bitmask.test.ts

**Step 1.4:** Open `src/lib/bitmask.test.ts` and write comprehensive unit tests. Import the necessary types from `src/types/index.ts` and the bitmask functions. Create test fixtures:

Create a minimal tag dictionary with 3 role tags, 2 style tags, and 2 faction tags. Create sample characters with various tag combinations. Create sample conditions testing single tags, multiple tags (anyOf), and empty conditions.

Write test cases:

**Test: buildBitmaskLookup assigns unique bits per category** - Verify that role-001 gets bit 0, role-002 gets bit 1, etc., and that style-001 also gets bit 0 (separate namespace).

**Test: characterToBitmask correctly sets bits** - Create a character with role-001 and style-002. Verify the resulting bitmask has role bit 0 set and style bit 1 set.

**Test: conditionToBitmask handles anyOf** - Create a condition with anyOf ["role-001", "role-002"]. Verify the bitmask has bits 0 and 1 set.

**Test: mergeBitmasks combines multiple characters** - Create two characters, one with role-001 and one with role-002. Merge their bitmasks and verify the result has bits 0 and 1 set.

**Test: satisfiesCondition detects matches** - Create a combo with role-001 (bit 0) and a condition requiring role-001 OR role-002. Verify satisfaction.

**Test: satisfiesCondition detects mismatches** - Create a combo with style-001 and a condition requiring role-001. Verify non-satisfaction.

**Test: satisfiesAllConditions requires all to pass** - Create a combo and multiple conditions, verify that all must be satisfied.

**Test: handles edge cases** - Test empty tags, empty conditions, characters with no relevant tags, etc.

**Count-based validation tests:**

**Test: buildConditionCounts correctly counts duplicates** - Create a condition with `anyOf: ["role-002", "role-001", "role-002"]`. Verify the map returns `{ "role-002": 2, "role-001": 1 }`.

**Test: satisfiesConditionWithCounts validates counts** - Create 3 characters: 2 with role-002 (Attacker), 1 with role-001 (Balancer). Create a condition requiring 2 Attackers and 1 Balancer. Verify the combination satisfies the condition.

**Test: satisfiesConditionWithCounts detects insufficient counts** - Create 2 characters: 1 with role-002, 1 with role-001. Test against a condition requiring 2 role-002. Verify it fails validation.

**Test: satisfiesAllConditionsWithCounts validates all conditions** - Create a combination and multiple count-based conditions. Verify all must pass.

**Step 1.5:** Run the tests:

    npm run test

Expected output:

    PASS  src/lib/bitmask.test.ts
      Bitmask System
        ✓ buildBitmaskLookup assigns unique bits per category (3 ms)
        ✓ characterToBitmask correctly sets bits (1 ms)
        ✓ conditionToBitmask handles anyOf (1 ms)
        ✓ mergeBitmasks combines multiple characters (1 ms)
        ✓ satisfiesCondition detects matches (1 ms)
        ✓ satisfiesCondition detects mismatches (1 ms)
        ✓ satisfiesAllConditions requires all to pass (2 ms)
        ✓ handles edge cases (1 ms)
      Count-based Validation
        ✓ buildConditionCounts correctly counts duplicates (1 ms)
        ✓ satisfiesConditionWithCounts validates counts (2 ms)
        ✓ satisfiesConditionWithCounts detects insufficient counts (1 ms)
        ✓ satisfiesAllConditionsWithCounts validates all conditions (2 ms)

    Test Suites: 1 passed, 1 total
    Tests:       12 passed, 12 total

If tests fail, review the implementation and fix any logic errors. Pay special attention to bit indexing (0-based) and bitwise operations (use >>> 0 for unsigned operations if needed).

**Step 1.6:** Test with real data by creating a small verification script:

    touch scripts/verify-bitmask.ts

Open the file and write a script that loads the real tags.json, builds a bitmask lookup, and prints statistics (number of bits per category, total tags processed). Run with:

    npx tsx scripts/verify-bitmask.ts

Expected output:

    Bitmask lookup built successfully
    Category 'role': 3 tags, 3 bits used
    Category 'style': 5 tags, 5 bits used
    Category 'faction': 16 tags, 16 bits used
    Category 'element': 6 tags, 6 bits used
    Category 'rarity': 2 tags, 2 bits used
    Total: 32 tags across 5 categories

If any category exceeds 32 tags, the implementation should throw a clear error. Our current data has 32 tags total, well within limits.


### Milestone 2: Build Data Loading and Processing Layer

**Step 2.1:** Create the data module:

    touch src/lib/data.ts

**Step 2.2:** Open `src/lib/data.ts` and implement the data loading layer. Import types from `src/types/index.ts` and bitmask utilities from `src/lib/bitmask.ts`. Import Node.js `fs` and `path` modules for file loading.

**Types to define:**

    export interface GameData {
      tags: TagDict;
      characters: Character[];
      missions: Mission[];
      bitmaskLookup: BitmaskLookup;
      characterBitmasks: Map<string, CategoryBitmasks>; // character ID -> bitmasks
      missionBitmasks: Map<string, MissionBitmasks>; // mission ID -> condition bitmasks
    }

    export interface MissionBitmasks {
      baseConditions: Array<{ category: Category; mask: number }>;
      bonusConditions: Array<{ category: Category; mask: number }>;
    }

**Functions to implement:**

`loadGameData(dataDir: string = 'data'): GameData` - Main loading function. Read tags.json, characters.json, and missions.json from the specified directory using `fs.readFileSync` and `JSON.parse`. Build the bitmask lookup from tags. For each character, compute its bitmask and store in characterBitmasks map. For each mission, convert all base and bonus conditions to bitmasks and store in missionBitmasks map. Return the complete GameData object. If any file is missing or malformed, throw a descriptive error.

`getTagLabel(tagId: string, tags: TagDict, lang: 'ja' | 'zh-Hans' | 'zh-Hant' = 'ja'): string` - Helper function to resolve a tag ID to its localized label. First determine which category the tag belongs to by checking the tag ID prefix (e.g., "role-001" belongs to "role"). Search the corresponding category array in tags for an entry with matching ID. Return the label in the specified language, falling back to Japanese if the requested language is missing. If the tag ID is not found, return the ID itself as a fallback.

`filterCharactersByTags(characters: Character[], filters: Partial<Record<Category, string[]>>): Character[]` - Helper function for UI filtering. Returns characters that match all specified filters. For each filter category, check if the character has at least one tag in the filter's array. This will be useful in Phase 4 for the roster selector component.

`getCharactersByTags(characters: Character[], category: Category, tagId: string): Character[]` - Returns all characters that have a specific tag. Useful for counting tag rarity.

**Step 2.3:** Create a test file:

    touch src/lib/data.test.ts

**Step 2.4:** Write unit tests for the data module. Use Vitest mocking to create in-memory test data rather than reading real files. Test cases:

**Test: loadGameData successfully loads valid data** - Mock fs.readFileSync to return minimal valid JSON. Verify GameData structure is correct and bitmask lookups are populated.

**Test: loadGameData throws on missing files** - Mock fs.readFileSync to throw ENOENT. Verify loadGameData throws a descriptive error.

**Test: getTagLabel resolves Japanese labels** - Create a minimal tag dict and verify label resolution works.

**Test: getTagLabel falls back correctly** - Request a language that doesn't exist, verify fallback to Japanese.

**Test: filterCharactersByTags filters correctly** - Create characters with various tags, apply filters, verify correct subset is returned.

**Test: getCharactersByTags finds matching characters** - Verify that characters with a specific tag are found.

**Step 2.5:** Run the tests:

    npm run test

Expected output should show all data.test.ts tests passing.

**Step 2.6:** Test with real data by updating the verification script:

    # scripts/verify-bitmask.ts already exists, we'll extend it

Open `scripts/verify-bitmask.ts` and add a call to `loadGameData()`. Print statistics about loaded data (number of characters, missions, tags). Run:

    npx tsx scripts/verify-bitmask.ts

Expected output:

    Loading game data from data/...
    ✓ Loaded 32 tags across 5 categories
    ✓ Loaded 26 characters
    ✓ Loaded 36 missions
    ✓ Built bitmask lookup (32 tag mappings)
    ✓ Computed bitmasks for 26 characters
    ✓ Computed condition masks for 36 missions (72 base conditions, 27 bonus conditions)
    Game data loaded successfully!

If loading fails, the error message should clearly indicate which file or data structure is problematic.


### Milestone 3: Implement Combination Search Algorithm

**Step 3.1:** Create the combos module:

    touch src/lib/combos.ts

**Step 3.2:** Open `src/lib/combos.ts` and implement the combination search algorithm. Import types and previous modules.

**Types to define:**

    export interface Combination {
      characterIds: string[];
      meetsBaseConditions: boolean;
      meetsBonusConditions: boolean;
      levelDeficits: Record<string, number>; // character ID -> levels needed
      contributingTags: string[]; // tag IDs that satisfied conditions
    }

    export interface CombinationSearchResult {
      missionId: string;
      satisfiable: boolean; // Are base conditions satisfiable with owned characters?
      combinations: Combination[]; // All valid combinations (base conditions met)
      bestCombinations: Combination[]; // Top-ranked combinations
      missingForBase: string[]; // Tag IDs needed to satisfy base (if not satisfiable)
      missingForBonus: string[]; // Tag IDs needed to add bonus on top of base
    }

**Functions to implement:**

`interactsWith(character: Character, mission: Mission, bitmaskLookup: BitmaskLookup, characterMask: CategoryBitmasks, missionMasks: MissionBitmasks): boolean` - Pruning optimization. Returns true if the character has at least one tag that appears in at least one mission condition. For each category, check if (characterMask[category] & anyConditionMask[category]) is nonzero where anyConditionMask is the bitwise OR of all base and bonus condition masks in that category.

`generateCombinations<T>(items: T[], maxSize: number): T[][]` - Generic combination generator. For this project, maxSize will always be 3. Returns all combinations of size 1, 2, and 3. Use nested loops:

    const results: T[][] = [];
    // Size 1
    for (let i = 0; i < items.length; i++) {
      results.push([items[i]]);
    }
    // Size 2
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        results.push([items[i], items[j]]);
      }
    }
    // Size 3
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        for (let k = j + 1; k < items.length; k++) {
          results.push([items[i], items[j], items[k]]);
        }
      }
    }
    return results;

`checkLevelRequirements(characterIds: string[], requiredLevel: number, currentLevels: Record<string, number>): Record<string, number>` - Returns a map of character IDs to level deficits (required - current). If a character meets the requirement, they are not included in the result. If currentLevels doesn't have an entry for a character, assume level 1.

`findCombinations(mission: Mission, ownedCharacters: Character[], currentLevels: Record<string, number>, gameData: GameData): CombinationSearchResult` - Main algorithm. Steps:

1. Filter out characters that don't interact with the mission (pruning).
2. Generate all combinations up to size 3.
3. For each combination:
   a. Merge the bitmasks of all characters in the combination.
   b. Check if merged mask satisfies all base conditions using `satisfiesAllConditions`.
   c. If base conditions are satisfied, also check bonus conditions.
   d. Check level requirements for all characters.
   e. Build a Combination object with all metadata.
4. Filter combinations to only those meeting base conditions (these are "valid" combinations).
5. If no valid combinations exist, analyze what tags are missing for base conditions.
6. Rank combinations: bonus met > bonus not met, all levels met > some deficits, fewer characters > more characters.
7. Return CombinationSearchResult with all combinations and top N (e.g., top 10).

`findMissingTags(conditions: Condition[], ownedCharacters: Character[], bitmaskLookup: BitmaskLookup): string[]` - Helper to identify which specific tags are needed to satisfy conditions. For each condition, check if any owned character has any of the required tags. If no character satisfies a condition, return one of the tags from that condition's anyOf array (prefer the first one as representative).

`rankCombinations(combinations: Combination[]): Combination[]` - Sorting logic. Compare by:
1. meetsBonusConditions (true first)
2. total level deficit (lower first)
3. number of characters (fewer first)
4. lexicographic by character IDs (for deterministic output)

**Step 3.3:** Create a test file:

    touch src/lib/combos.test.ts

**Step 3.4:** Write comprehensive unit tests. Create test fixtures with a few characters and missions. Test cases:

**Test: interactsWith correctly identifies relevant characters** - Create a mission requiring role-001 and a character with role-001. Verify interactsWith returns true. Create a character with no relevant tags, verify false.

**Test: generateCombinations produces correct count** - For 5 items, verify it returns C(5,1) + C(5,2) + C(5,3) = 5 + 10 + 10 = 25 combinations.

**Test: checkLevelRequirements identifies deficits** - Create characters at levels 40 and 60, mission requires 50, verify only the level 40 character has a deficit of 10.

**Test: findCombinations finds valid combinations** - Create a mission with simple conditions, owned characters that satisfy them, verify combinations are found and correctly marked.

**Test: findCombinations handles no valid combinations** - Create a mission requiring tags that no owned character has, verify satisfiable is false and missingForBase is populated.

**Test: findCombinations correctly identifies bonus** - Create a mission with base and bonus conditions, characters that satisfy base but not bonus, verify combinations are marked correctly.

**Test: rankCombinations orders by priority** - Create combinations with different properties, verify ranking is correct.

**Test: handles edge cases** - Single character missions, missions with no bonus, characters at exact required level, etc.

**Step 3.5:** Run the tests:

    npm run test

Expected output should show all combos.test.ts tests passing.

**Step 3.6:** Create an integration test script with real data:

    touch tests/test-combos.ts

Open the file and write a script that:

1. Loads game data using `loadGameData()`.
2. Selects one or two real missions from the data.
3. Simulates owned characters (e.g., "player owns characters at indices 0-9 at various levels").
4. Calls `findCombinations` for each mission.
5. Prints the results in a human-readable format showing valid combinations and training recommendations.

Run:

    npx tsx tests/test-combos.ts

Expected output:

    Testing combination search with real data...

    Mission: 旧遺跡の調査 (m-001)
    Required Level: 50
    Base Conditions: style:collector, faction:blank
    Bonus Conditions: role:attacker

    Owned characters (10 total):
    - kohaku (Lv 60): role-002, style-004, faction-005 ✓
    - minerva (Lv 40): role-001, style-003, faction-008 ✗ (needs +10)
    ...

    Valid combinations found: 15

    Top combinations meeting bonus conditions:
    1. [kohaku] - All conditions met, all levels sufficient
    2. [kohaku, char_x] - Bonus met, 1 deficit (char_x needs +5)
    ...

    Top combinations meeting base only:
    1. [char_y] - Base met, no bonus
    ...

    Mission cannot be satisfied if: (none - mission is satisfiable)

    ✓ Combination search working correctly

If the script produces reasonable output and finds expected combinations, the algorithm is working.


### Milestone 4: Build Training Priority Scoring System

**Step 4.1:** Create the scoring module:

    touch src/lib/scoring.ts

**Step 4.2:** Open `src/lib/scoring.ts` and implement the training priority system. Import previous modules.

**Types to define:**

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

    export interface ScoringWeights {
      baseConditionWeight: number; // w1, default 3.0
      bonusConditionWeight: number; // w2, default 2.0
      levelGapPenalty: number; // w3, default 0.05
      rarityBonus: number; // w4, default 1.0
    }

**Constants:**

    export const DEFAULT_WEIGHTS: ScoringWeights = {
      baseConditionWeight: 3.0,
      bonusConditionWeight: 2.0,
      levelGapPenalty: 0.05,
      rarityBonus: 1.0,
    };

    export const LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90];

**Functions to implement:**

`calculateTagRarity(characters: Character[], tags: TagDict): Map<string, number>` - For each tag ID, count how many owned characters have it. Return a map of tag ID to rarity score. Rarity score is calculated as: `score = 1.0 / (count + 1)`. So if only 1 character has a tag, score is 0.5. If 5 characters have it, score is 0.167. This rewards rare tags.

`calculateCharacterRarity(character: Character, rarityMap: Map<string, number>): number` - Sum the rarity scores for all of a character's tags. This gives a "rare tags bonus" for the character.

`calculateTrainingImpact(characterId: string, targetLevel: number, missions: Mission[], ownedCharacters: Character[], currentLevels: Record<string, number>, gameData: GameData): TrainingRecommendation['impact']` - Simulate upgrading characterId to targetLevel. For each mission, run findCombinations twice: once with original levels and once with the upgraded level. Compare results:

- If before: not satisfiable, after: satisfiable → increment baseConditionsUnlocked
- If before: satisfiable without bonus, after: satisfiable with bonus → increment bonusConditionsAdded
- Track which missions were affected

Return the impact object.

`calculateTrainingPriority(missions: Mission[], ownedCharacters: Character[], currentLevels: Record<string, number>, gameData: GameData, weights: ScoringWeights = DEFAULT_WEIGHTS): TrainingRecommendation[]` - Main scoring function. For each owned character, for each level milestone above their current level:

1. Calculate training impact using `calculateTrainingImpact`.
2. Calculate level gap: `targetLevel - currentLevel`.
3. Calculate rarity bonus using `calculateCharacterRarity`.
4. Compute score: `score = w1 * baseUnlocked + w2 * bonusAdded - w3 * levelGap + w4 * rarityBonus`.
5. Build a TrainingRecommendation object.

Collect all recommendations, sort by score descending, and return the top N (e.g., top 20). Skip recommendations with score <= 0.

`explainRecommendation(recommendation: TrainingRecommendation, missions: Mission[], gameData: GameData, lang: 'ja' | 'zh-Hans' | 'zh-Hant' = 'ja'): string` - Generate a human-readable explanation string like: "Level コハク to 50 to unlock 2 missions (旧遺跡の調査, 素材収集) and add bonus rewards to 1 mission."

**Step 4.3:** Create a test file:

    touch src/lib/scoring.test.ts

**Step 4.4:** Write unit tests. Test cases:

**Test: calculateTagRarity computes correct scores** - Create characters with various tag distributions, verify rarity scores.

**Test: calculateCharacterRarity sums tag rarities** - Verify character rarity is sum of tag rarities.

**Test: calculateTrainingImpact detects mission unlocks** - Create a scenario where leveling a character unlocks a mission, verify baseConditionsUnlocked is incremented.

**Test: calculateTrainingImpact detects bonus additions** - Create a scenario where leveling enables bonus conditions, verify bonusConditionsAdded is incremented.

**Test: calculateTrainingPriority ranks correctly** - Create characters at various levels, missions with different requirements, verify the top recommendation is the one with highest impact.

**Test: calculateTrainingPriority respects weights** - Change weights dramatically (e.g., set w3 very high), verify rankings change appropriately.

**Test: handles edge cases** - All characters at max level (no recommendations), no missions (no impact), etc.

**Step 4.5:** Run the tests:

    npm run test

Expected output should show all scoring.test.ts tests passing.

**Step 4.6:** Create a comprehensive integration test script:

    touch tests/test-scoring.ts

Open the file and write a script that:

1. Loads game data.
2. Simulates a realistic scenario: player owns 10 characters, half are at low levels (20-40), half at medium levels (50-60), 4 missions are selected (2 satisfiable, 2 not).
3. Calls `calculateTrainingPriority` with all selected missions.
4. Prints the top 5 recommendations with explanations.

Run:

    npx tsx tests/test-scoring.ts

Expected output:

    Testing training priority scoring with realistic scenario...

    Selected missions:
    1. 旧遺跡の調査 (m-001) - Satisfiable
    2. 素材収集依頼 (m-002) - Satisfiable
    3. 深層探査 (m-010) - NOT satisfiable (missing faction-003)
    4. 遺物調査 (m-015) - NOT satisfiable (characters too low level)

    Current roster:
    - kohaku Lv 60 (role-002, style-004)
    - minerva Lv 40 (role-001, style-003)
    - char_x Lv 30 (faction-003, element-001)
    ...

    Top 5 training recommendations:

    1. [Score: 8.7] Level char_x to 50
       Impact: Unlocks 2 missions (深層探査, 遺物調査), adds bonus to 0 missions
       Reasoning: char_x has rare faction-003 tag needed for locked missions

    2. [Score: 6.2] Level minerva to 50
       Impact: Unlocks 1 mission (遺物調査), adds bonus to 1 mission (素材収集依頼)
       Reasoning: Enables bonus conditions for satisfiable missions

    3. [Score: 4.5] Level char_y to 40
       Impact: Unlocks 1 mission, adds bonus to 0 missions

    ...

    ✓ Scoring system working correctly

If the recommendations make intuitive sense (prioritizing characters that unlock missions over those that just add bonuses, favoring rare tags, etc.), the scoring system is working.


## Validation and Acceptance

Phase 2 is complete when all four milestones pass the following validation checks:

**1. All unit tests pass**: Running `npm run test` executes all test files (bitmask.test.ts, data.test.ts, combos.test.ts, scoring.test.ts) and all tests pass with no errors.

**2. Integration scripts demonstrate correct behavior**: Running the verification scripts with real data:

    npx tsx tests/test-combos.ts
    npx tsx tests/test-scoring.ts

Both integration test scripts execute successfully and produce reasonable output showing the algorithms working with the 26-character, 36-mission dataset from Phase 1.

**3. Manual test scenario**: Create a simple Node.js script that imports all four modules and runs through a complete scenario:

    touch scripts/manual-test.ts

Write a script that:
- Loads game data
- Simulates owning 5 specific characters at specific levels
- Selects 2 specific missions
- Runs combination search for both missions
- Runs training priority for both missions
- Prints all results

Run the script and manually verify the output makes logical sense. For example, if a mission requires role-001 and you own a character with role-001 at sufficient level, that character should appear in the valid combinations. If a character is 10 levels below requirement, the training recommendation should suggest leveling them to the required level.

**4. Type checking passes**: Running `npm run type-check` produces no TypeScript errors, confirming all types are correctly defined and used.

**5. Performance is acceptable**: The combination search for a single mission with 20 owned characters should complete in under 100ms. Test this by adding timing measurements to the test-combos.ts script:

    const startTime = performance.now();
    const result = findCombinations(mission, ownedChars, levels, gameData);
    const elapsed = performance.now() - startTime;
    console.log(`Search took ${elapsed.toFixed(2)}ms`);

With 20 characters, there are C(20,1) + C(20,2) + C(20,3) = 20 + 190 + 1140 = 1350 combinations to check. With bitmask optimization, this should be very fast (well under 100ms).

**6. Code quality**: All code follows TypeScript best practices, uses strict typing, has clear function names, and includes JSDoc comments for exported functions.

The acceptance criteria is met when an independent developer can clone the repository, run the test suite and integration scripts, and observe the core logic working correctly with real game data, producing sensible character combinations and training recommendations.


## Idempotence and Recovery

All steps in Phase 2 are idempotent and can be run multiple times safely:

- Creating files: If files already exist, they will be overwritten with new content.
- Running tests: Tests are read-only and can be run repeatedly.
- Running verification scripts: Scripts are read-only and produce the same output given the same input data.

If a step fails partway through:

- If implementation has bugs: Fix the code and re-run tests. Tests are designed to catch logic errors.
- If integration scripts fail: Check that Phase 1 data files exist and are valid. Re-run `npm run build:data` if needed. Review error messages to identify the issue.
- If performance is poor: Review the implementation for missing optimizations. The bitmask approach should be very fast; if it's slow, there may be unnecessary loops or repeated computations.

To reset Phase 2 completely and start fresh:

    rm -rf src/lib/*.ts src/lib/*.test.ts scripts/verify-*.ts scripts/test-*.ts

Then follow the concrete steps from the beginning. The Phase 1 data files in `data/` and type definitions in `src/types/index.ts` will not be affected and will remain available.

If you need to debug bitmask operations, add console.log statements showing the binary representation:

    console.log(`Mask: ${mask.toString(2).padStart(8, '0')}`);

This prints the mask in binary (e.g., "00000101") making it easy to see which bits are set.


## Artifacts and Notes

### Example Bitmask Operation (from bitmask.ts)

Given tags:
- role-001 (アタッカー) → bit 0
- role-002 (バランサー) → bit 1
- role-003 (サポーター) → bit 2

Character A has role-001: mask = 0b001 (decimal 1)
Character B has role-002: mask = 0b010 (decimal 2)
Combination [A, B]: merged mask = 0b001 | 0b010 = 0b011 (decimal 3)

Condition requires "role-001 OR role-002": condition mask = 0b011 (decimal 3)
Check: (0b011 & 0b011) !== 0 → true, condition satisfied


### Example Test Output (from combos.test.ts)

    PASS  src/lib/combos.test.ts
      Combination Search
        ✓ interactsWith correctly identifies relevant characters (2 ms)
        ✓ generateCombinations produces correct count (1 ms)
        ✓ checkLevelRequirements identifies deficits (1 ms)
        ✓ findCombinations finds valid combinations (5 ms)
        ✓ findCombinations handles no valid combinations (3 ms)
        ✓ findCombinations correctly identifies bonus (4 ms)
        ✓ rankCombinations orders by priority (2 ms)
        ✓ handles edge cases (3 ms)

    Test Suites: 1 passed, 1 total
    Tests:       8 passed, 8 total


### Example Integration Script Output (from test-scoring.ts)

    Testing training priority scoring...

    Scenario: 10 owned characters, 4 missions
    - 2 missions satisfiable with current roster
    - 2 missions require leveling

    Top 3 recommendations:

    1. [Score: 8.7] Level エレン to 50
       Current: Lv 35
       Impact: Unlocks 2 missions, adds bonus to 0
       Affected missions: 深層探査, 遺物調査
       Reasoning: エレン has rare tag faction-003 (only 1 owned character)

    2. [Score: 6.2] Level ミネルバ to 50
       Current: Lv 40
       Impact: Unlocks 1 mission, adds bonus to 1
       Affected missions: 遺物調査, 素材収集依頼

    3. [Score: 4.5] Level カイ to 60
       Current: Lv 45
       Impact: Unlocks 0 missions, adds bonus to 2
       Affected missions: 旧遺跡の調査, 素材収集依頼

    ✓ Recommendations are logical and prioritize high-impact training


## Interfaces and Dependencies

### src/lib/bitmask.ts exports

    export interface CategoryBitmasks {
      role: number;
      style: number;
      faction: number;
      element: number;
      rarity: number;
    }

    export interface BitPosition {
      tagId: string;
      category: Category;
      bit: number;
    }

    export interface BitmaskLookup {
      tagToBit: Map<string, BitPosition>;
      categoryBits: Record<Category, number>;
    }

    // Build the bitmask lookup table from tag dictionary
    export function buildBitmaskLookup(tags: TagDict): BitmaskLookup;

    // Convert a character's tags to category-wise bitmasks
    export function characterToBitmask(
      character: Character,
      lookup: BitmaskLookup
    ): CategoryBitmasks;

    // Convert a condition's anyOf to a bitmask
    export function conditionToBitmask(
      condition: Condition,
      lookup: BitmaskLookup
    ): number;

    // Merge multiple characters' bitmasks (bitwise OR)
    export function mergeBitmasks(masks: CategoryBitmasks[]): CategoryBitmasks;

    // Check if a combination satisfies a condition
    export function satisfiesCondition(
      comboMask: number,
      conditionMask: number
    ): boolean;

    // Check if a combination satisfies all conditions (bitmask-based, for pruning only)
    export function satisfiesAllConditions(
      comboMasks: CategoryBitmasks,
      conditions: Condition[],
      lookup: BitmaskLookup
    ): boolean;

    // Count-based validation functions (for correctness)

    // Parse a condition's anyOf array to count required tags
    export function buildConditionCounts(
      condition: Condition
    ): Map<string, number>;

    // Check if characters satisfy a condition with count requirements
    export function satisfiesConditionWithCounts(
      characters: Character[],
      condition: Condition,
      category: Category
    ): boolean;

    // Check if characters satisfy all conditions with count requirements
    export function satisfiesAllConditionsWithCounts(
      characters: Character[],
      conditions: Condition[]
    ): boolean;


### src/lib/data.ts exports

    export interface GameData {
      tags: TagDict;
      characters: Character[];
      missions: Mission[];
      bitmaskLookup: BitmaskLookup;
      characterBitmasks: Map<string, CategoryBitmasks>;
      missionBitmasks: Map<string, MissionBitmasks>;
    }

    export interface MissionBitmasks {
      baseConditions: Array<{ category: Category; mask: number }>;
      bonusConditions: Array<{ category: Category; mask: number }>;
    }

    // Load all game data and build lookup tables
    export function loadGameData(dataDir?: string): GameData;

    // Resolve tag ID to localized label
    export function getTagLabel(
      tagId: string,
      tags: TagDict,
      lang?: 'ja' | 'zh-Hans' | 'zh-Hant'
    ): string;

    // Filter characters by tag criteria
    export function filterCharactersByTags(
      characters: Character[],
      filters: Partial<Record<Category, string[]>>
    ): Character[];

    // Get characters that have a specific tag
    export function getCharactersByTags(
      characters: Character[],
      category: Category,
      tagId: string
    ): Character[];


### src/lib/combos.ts exports

    export interface Combination {
      characterIds: string[];
      meetsBaseConditions: boolean;
      meetsBonusConditions: boolean;
      levelDeficits: Record<string, number>;
      contributingTags: string[];
    }

    export interface CombinationSearchResult {
      missionId: string;
      satisfiable: boolean;
      combinations: Combination[];
      bestCombinations: Combination[];
      missingForBase: string[];
      missingForBonus: string[];
    }

    // Find all valid character combinations for a mission
    export function findCombinations(
      mission: Mission,
      ownedCharacters: Character[],
      currentLevels: Record<string, number>,
      gameData: GameData
    ): CombinationSearchResult;

    // Check if a character's tags interact with mission conditions
    export function interactsWith(
      character: Character,
      mission: Mission,
      bitmaskLookup: BitmaskLookup,
      characterMask: CategoryBitmasks,
      missionMasks: MissionBitmasks
    ): boolean;

    // Generate all combinations up to maxSize
    export function generateCombinations<T>(
      items: T[],
      maxSize: number
    ): T[][];

    // Rank combinations by quality
    export function rankCombinations(
      combinations: Combination[]
    ): Combination[];


### src/lib/scoring.ts exports

    export interface TrainingRecommendation {
      characterId: string;
      characterName: string;
      currentLevel: number;
      targetLevel: number;
      score: number;
      impact: {
        baseConditionsUnlocked: number;
        bonusConditionsAdded: number;
        affectedMissions: string[];
      };
    }

    export interface ScoringWeights {
      baseConditionWeight: number;
      bonusConditionWeight: number;
      levelGapPenalty: number;
      rarityBonus: number;
    }

    export const DEFAULT_WEIGHTS: ScoringWeights;
    export const LEVEL_MILESTONES: number[];

    // Calculate training priority for all characters
    export function calculateTrainingPriority(
      missions: Mission[],
      ownedCharacters: Character[],
      currentLevels: Record<string, number>,
      gameData: GameData,
      weights?: ScoringWeights
    ): TrainingRecommendation[];

    // Calculate tag rarity scores
    export function calculateTagRarity(
      characters: Character[],
      tags: TagDict
    ): Map<string, number>;

    // Generate human-readable explanation
    export function explainRecommendation(
      recommendation: TrainingRecommendation,
      missions: Mission[],
      gameData: GameData,
      lang?: 'ja' | 'zh-Hans' | 'zh-Hant'
    ): string;


### Package dependencies

No new dependencies are required for Phase 2. All functionality can be implemented using:

- Node.js built-in modules: `fs`, `path`
- TypeScript standard library
- Vitest (already installed in Phase 1)
- Types from `src/types/index.ts` (already defined in Phase 1)

The bitmask operations use standard JavaScript bitwise operators (&, |, ^, ~, <<, >>, >>>). No external bit manipulation libraries are needed.


### Performance considerations

The bitmask optimization is crucial for performance. With N characters and M missions:

- Naive approach: O(C(N,3) * M * T) where T is average tags per condition, checking involves array/set operations
- Bitmask approach: O(C(N,3) * M) with O(1) condition checking via bitwise AND

For N=20, M=4: naive has ~1350 * 4 * 3 = ~16,200 expensive operations, bitmask has ~1350 * 4 = ~5,400 cheap operations. The speedup factor is roughly 10-100x depending on the cost of array operations vs bitwise operations.

The interactsWith pruning further reduces the search space by eliminating characters that cannot possibly contribute to any condition. In practice, this can reduce the candidate pool from 20 characters to ~5-10 relevant characters, reducing combinations from 1350 to ~175.

With these optimizations, the entire Phase 2 algorithm should handle 50+ characters and 10+ missions in under 1 second on modern hardware.

---

## Revision History

### Revision: Milestone 4 Completion (2025-11-07)

**Changes Made:**
- Marked Milestone 4 as completed in Progress section
- Added Milestone 4 Retrospective to Outcomes & Retrospective section
- Added "Satisfiable" vs "Completable" Semantics discovery to Surprises & Discoveries section
- Added Dependency Injection design decision to Decision Log section
- Updated test count totals (now 107 tests total across all 4 modules)

**Reason:**
Milestone 4 (Training Priority Scoring System) was completed on 2025-11-07. All implementation work is done:
- Created `src/lib/scoring.ts` with complete scoring algorithm
- Created `src/lib/scoring.test.ts` with 21 unit tests (all passing)
- Created `tests/test-scoring.ts` integration test
- All 107 tests across Phase 2 modules passing
- Performance validated: 128ms for 15 characters × 10 missions

This completes Phase 2 entirely. All four milestones delivered:
1. ✅ Bitmask validation system (27 tests)
2. ✅ Data loading layer (29 tests)
3. ✅ Combination search (30 tests)
4. ✅ Training priority scoring (21 tests)

Key discoveries during Milestone 4 (satisfiable vs completable semantics, dependency injection benefits) were significant enough to warrant inclusion in the living document sections (Surprises & Discoveries, Decision Log) in addition to the retrospective, ensuring future implementers understand the design rationale.

Phase 2 now provides a complete algorithmic foundation ready for UI integration in Phase 3.

### Revision: File Organization - Tests Directory (2025-11-07)

**Changes Made:**
- Created new `tests/` directory for integration tests
- Moved `scripts/test-combos.ts` → `tests/test-combos.ts`
- Moved `scripts/test-scoring.ts` → `tests/test-scoring.ts`
- Removed `scripts/debug-impact.ts` (temporary debug script, no longer needed)
- Updated all references in ExecPlan to reflect new file locations

**Reason:**
The `scripts/` directory is intended for build and data processing utilities (csv-to-json.ts, validate-data.ts, slug.ts). Integration test files don't align with this purpose and were cluttering the directory.

Creating a dedicated `tests/` directory provides better project organization:
- Clear separation between build utilities and test scripts
- Standard convention across many projects
- Makes it obvious where to find integration/end-to-end tests vs unit tests (which remain in `src/lib/*.test.ts`)

All test commands have been updated in the ExecPlan to use the new paths (e.g., `npx tsx tests/test-combos.ts`).
