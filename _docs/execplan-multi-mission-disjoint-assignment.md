# Multi-Mission Disjoint Assignment Algorithm

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` at the repository root.


## Purpose / Big Picture

Currently, the application incorrectly finds single teams that can satisfy multiple missions simultaneously. This is wrong because in the actual game, each character can only be assigned to one mission at a time. If a user selects 4 missions and each requires 3 characters, they need up to 12 distinct characters total.

After this change, users will select multiple missions (typically 2-4) and the application will assign disjoint character teams to each mission. The primary purpose of this tool is to help users decide which characters to train (level up) to unlock more missions. The algorithm will show which characters are blocking mission completion due to insufficient levels, and recommend training priorities based on how many missions each character would unlock.

You can verify success by selecting 4 missions with different requirements, marking 15 characters as owned with varying levels, running the analysis, and seeing: (1) each mission assigned its own team with no character appearing in multiple teams, (2) missions grouped by whether they're assigned or blocked, (3) training recommendations showing which characters to level up to unlock blocked missions.


## Progress

- [x] Read and understand current implementation in `src/lib/combos.ts` and `src/lib/scoring.ts`
- [x] Design data structures for ready teams vs blocked teams
- [x] Implement `findPerMissionCandidates()` to separate ready and blocked teams
- [x] Write tests for ready vs blocked team separation
- [x] Implement mission value calculation based on base condition count
- [x] Implement DFS assignment algorithm with mission value objective
- [x] Write tests for DFS assignment optimality
- [x] Update training priority calculation to use blocked teams and rarity
- [x] Write tests for training priority scoring
- [ ] Update Results.tsx to display mission-by-mission assignments
- [ ] Add UI for training recommendations
- [ ] Run end-to-end tests with multiple missions
- [ ] Run full test suite and type checking
- [ ] Performance validation with realistic datasets


## Surprises & Discoveries

### Milestone 1 (2025-11-17)

**Blocked team combinatorics**: When implementing tests, discovered that blocked teams include ALL combinations where at least one character is below level requirement, not just pairs. For example, with 3 characters (A, B, C) where A is below level:
- [A,B] - blocked
- [A,C] - blocked
- [A,B,C] - also blocked (initially overlooked in test design)

This is correct behavior and important for training recommendations in Milestone 3, as it shows all possible team compositions that would unlock with character upgrades.

**Type imports**: Used `import("../types").PerMissionCandidates` inline type imports to avoid circular dependency issues between `combos.ts` and `types/index.ts`. This pattern works well with TypeScript's module resolution.

### Milestone 2 (2025-11-17)

**DFS exploration strategy**: The DFS algorithm explores assignments in two modes at each step: (1) skip the mission entirely, or (2) try each ready team. This ensures we find optimal partial coverage when resources are insufficient. Without the "skip" option, the algorithm would fail to find good solutions when some missions cannot be assigned.

**Score comparison semantics**: Implemented `compareScores()` to return positive when first argument is better. This follows the natural comparison pattern (a > b returns positive) and makes the DFS logic clearer when checking `if (compareScores(score, bestScore) > 0)` to update the best solution.

**Test coverage breadth**: Wrote 11 comprehensive test cases covering not just happy paths but edge cases (no missions, no characters), partial coverage scenarios, and all three tiers of the lexicographic objective function. This caught several potential issues early, including proper handling of empty inputs.

### Milestone 3 (2025-11-17)

**Level deficit semantics**: The `levelDeficits` field in `BlockedCombination` stores `(requiredLevel - currentLevel)` for each character. When simulating a character upgrade, we must calculate the required level from the **original** current level plus the deficit, not from the simulated target level. Initial implementation had this wrong, which caused all tests to fail until the logic was corrected to: `requiredLevel = currentLevels[charId] + deficit`.

**Team validation with partial upgrades**: When checking if training a single character would unlock a mission, the algorithm correctly validates that ALL characters in a blocked team must meet their level requirements. If a team requires [charA, charB] both at level 50, training only charA to 50 won't unlock the mission (charB is still below level). This prevents false positives in training recommendations.

**Scoring weight validation**: The 1000× weight for mission unlocks vs 10× for bonuses vs 1× for rarity is clearly visible in test results. A character unlocking 1 mission scores ~1004 (1000 + rarity), vastly higher than a character adding 2 bonuses scoring ~24 (20 + rarity). This ensures training recommendations prioritize mission unlocks as intended.


## Decision Log

### Milestone 1 (2025-11-17)

**D1.1 - Separation logic**: Decided to categorize combinations strictly: a team is "blocked" if and only if it satisfies all tag/role requirements (via count-based validation) but fails level requirements. Teams that fail tag/role validation are simply discarded, not categorized as blocked. This ensures blocked teams represent actionable training targets.

**D1.2 - Sorting priorities**: For ready teams, prioritized size (ascending) then bonus satisfaction (descending). This matches user expectations: prefer smaller, efficient teams, with bonus-satisfying teams ranked higher among same-size options. For blocked teams, prioritized total level gap (ascending) then size (ascending), surfacing the "easiest to fix" teams first.

**D1.3 - Reuse existing validation**: Chose to reuse `satisfiesAllConditionsWithCounts()` from existing `findCombinations()` rather than reimplementing validation logic. This ensures consistency and reduces code duplication.

### Milestone 2 (2025-11-17)

**D2.1 - Mission difficulty sorting**: Sort missions by number of ready teams (ascending) before DFS. This prioritizes hard-to-satisfy missions, reducing the search space by eliminating dead ends early. If we assigned easy missions first, we might use up characters needed for harder missions that have fewer valid teams.

**D2.2 - Lexicographic objective order**: Chose mission value > character count > bonuses, in that order. Mission value is primary because unlocking high-complexity missions is the user's main goal. Character count is secondary to encourage efficient resource usage. Bonuses are tertiary as they're nice-to-have but not essential.

**D2.3 - Rarity in display only**: Decided NOT to use character rarity during team assignment (Milestone 2). Rarity only matters for training recommendations (Milestone 3). This keeps the assignment algorithm focused on mission coverage optimization, not character value judgments. The user cares about "which missions can I complete?" not "which rare characters should I use?"

**D2.4 - DFS without pruning**: Implemented full exhaustive DFS without alpha-beta pruning or branch-and-bound optimizations. For typical use cases (2-4 missions, 10-50 characters), the search space is small enough (<10,000 nodes) that optimization isn't needed. This keeps the code simple and the results easy to reason about.


## Outcomes & Retrospective

(To be filled at completion)


## Context and Orientation

The application helps players optimize character combinations for missions in the Stella Sora game. The core algorithm is in `src/lib/combos.ts`, which currently has a function `findCombinations()` that finds valid character teams for a single mission. There is also a newer `findCombinationsForMultipleMissions()` (lines 380+) that incorrectly tries to find single teams that work across multiple missions.

**Key files:**

- `src/lib/combos.ts`: Contains combination search algorithms. The `findCombinations()` function (lines 269+) validates teams for a single mission using bitmask-based tag matching and count-based validation.
- `src/lib/scoring.ts`: Contains `calculateTrainingPriority()` (lines 250+) which recommends which characters to train.
- `src/pages/Results.tsx`: Displays analysis results to users.
- `src/types/index.ts`: Type definitions for Character, Mission, and result types.
- `src/lib/bitmask.ts`: Contains O(1) tag matching system using bitwise operations.

**Current data flow (WRONG):**

The current `findCombinationsForMultipleMissions()` generates all possible 1-3 character combinations and checks each one against all selected missions, scoring by how many missions the combination satisfies. This produces results like "Team [A, B, C] satisfies missions 1, 2, and 4" which is incorrect because it implies one team handles multiple missions simultaneously.

**Expected data flow (CORRECT):**

Users select missions → For each mission, generate valid teams → Use DFS to assign disjoint teams (no character reuse) → Maximize total mission value covered → For unassigned missions, analyze blocked teams (teams that would work except for level requirements) → Recommend training priorities.

**Key algorithms:**

The bitmask system uses 32-bit integers where each bit represents a tag (role, style, faction, element, rarity). This enables O(1) tag presence checking via bitwise AND. Count validation then confirms conditions like "2 Attackers and 1 Balancer" are satisfied. See `src/lib/bitmask.ts::satisfiesAllConditionsWithCounts()` for the count logic.

**Mission structure:**

Each mission has `baseConditions` (an array of required tag conditions) and optional `bonusConditions`. The number of base conditions determines mission value: missions requiring 3 distinct roles are more valuable than missions requiring only 1 or 2 roles. Missions also have a `requiredLevel` that all assigned characters must meet or exceed.


## Plan of Work

This plan implements a disjoint assignment algorithm that assigns separate character teams to each mission, ensuring no character is used in multiple missions. The work is divided into four milestones for incremental validation.

**Milestone 1** creates a function that generates two types of candidate teams for each mission: ready teams (satisfy all requirements including levels) and blocked teams (satisfy tag/role requirements but fail level checks). This separation is crucial because blocked teams reveal which characters need training.

The new function `findPerMissionCandidates()` will reuse the existing bitmask pruning and count validation logic from `findCombinations()`, but split the results into two categories based on level sufficiency. A blocked team is defined strictly: it must satisfy all tag and role requirements (as verified by bitmask operations and count checking) but have at least one character below the mission's required level. Teams that fail tag/role requirements are not considered blocked teams; they are simply invalid and discarded.

**Milestone 2** implements the assignment algorithm using depth-first search with backtracking. The objective function prioritizes mission value (calculated as the number of base conditions in a mission) first, then minimizes total characters used, then maximizes bonus conditions satisfied. Importantly, character rarity is NOT considered during team formation; it only matters for training recommendations.

The DFS algorithm will sort missions by difficulty (missions with fewer valid teams get assigned first, as they are hardest to satisfy) and explore all possible assignments, tracking which characters are already used to enforce the no-reuse constraint. The search maintains the best assignment found so far according to the lexicographic objective function.

**Milestone 3** updates the training priority calculation to use blocked teams. For missions that could not be assigned, the function examines their blocked teams to find which character level-ups would unlock those missions. The scoring formula heavily weights mission unlocks (coefficient 1000) compared to bonus additions (coefficient 10) or character rarity (coefficient 1). This ensures that training recommendations focus on unlocking new missions rather than optimizing bonuses or prioritizing rare characters.

**Milestone 4** updates the Results page UI to display mission-by-mission assignments instead of the current universal/partial team groupings. Each mission shows its assigned team (or indicates it is unassigned), with character icons dimmed if they are below the required level. A separate training recommendations section shows which characters to level up, sorted by priority score.


## Milestone 1: Per-Mission Candidate Generation

In this milestone, you will create a function that generates valid team candidates for a single mission, separating them into ready teams (can complete the mission now) and blocked teams (blocked only by level requirements). At the end, you will have a working `findPerMissionCandidates()` function with tests proving it correctly separates teams based on level sufficiency.

**Scope:**
- Create types for ready teams and blocked teams
- Implement candidate generation using existing bitmask logic
- Write tests covering tag satisfaction, level deficits, and blocked team definition

**Files to modify:**
- `src/types/index.ts`: Add `PerMissionCandidates` and `BlockedCombination` types
- `src/lib/combos.ts`: Add `findPerMissionCandidates()` function
- `src/lib/combos.test.ts`: Add test cases for ready vs blocked separation

**Implementation details:**

In `src/types/index.ts`, add new result types:

```typescript
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
  readyTeams: Combination[];        // Satisfy all requirements including levels
  blockedTeams: BlockedCombination[];  // Satisfy tags/roles but not levels
}
```

In `src/lib/combos.ts`, implement the new function:

```typescript
export function findPerMissionCandidates(
  mission: Mission,
  ownedCharacters: Character[],
  characterLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): PerMissionCandidates
```

The algorithm should:

1. **Pruning phase**: Reuse existing pruning logic from `findCombinations()` to identify characters whose tags interact with the mission's conditions. This eliminates characters that have no relevant tags.

2. **Combination generation**: Generate all possible 1-3 character combinations from the pruned character set, just like `findCombinations()` does.

3. **Dual validation**: For each candidate combination, perform two separate checks:
   - **Tag/role validation**: Use the existing `satisfiesAllConditionsWithCounts()` logic to check if base conditions are met. Also check bonus conditions separately.
   - **Level validation**: Check if all characters in the combination meet `mission.requiredLevel`.

4. **Categorization**:
   - If tag/role validation passes AND level validation passes: add to `readyTeams`.
   - If tag/role validation passes AND level validation FAILS: add to `blockedTeams` with `levelDeficits` populated for characters below required level.
   - If tag/role validation fails: discard (not ready, not blocked, just invalid).

5. **Sorting**:
   - Sort `readyTeams` by size (ascending), then by bonus satisfaction (descending).
   - Sort `blockedTeams` by total level gap (ascending), then by size (ascending).

**Testing strategy:**

Create test cases in `src/lib/combos.test.ts`:

```typescript
describe("findPerMissionCandidates", () => {
  it("separates ready teams from blocked teams", () => {
    // Setup: Mission requires 2 Attackers, Level 30
    // Characters: A (Attacker, Lv25), B (Attacker, Lv35), C (Attacker, Lv40)
    // Expected:
    //   readyTeams: [B,C]
    //   blockedTeams: [A,B] with A's deficit = 5, [A,C] with A's deficit = 5
  });

  it("does not include teams with missing tags as blocked", () => {
    // Setup: Mission requires 2 Attackers
    // Characters: A (Attacker, Lv25), B (Supporter, Lv40)
    // Expected:
    //   readyTeams: [] (no valid 2-Attacker team)
    //   blockedTeams: [] (A+B fails tag requirement, not just level)
  });

  it("handles missions where bonus conditions affect blocking status", () => {
    // Setup: Mission with base and bonus conditions
    // Verify: Blocked teams track both base and bonus satisfaction
  });

  it("populates levelDeficits correctly for multiple characters", () => {
    // Setup: Mission requires Lv50, team with chars at Lv30 and Lv40
    // Expected: levelDeficits = {char1: 20, char2: 10}
  });

  it("handles missions with 1-character requirements", () => {
    // Setup: Mission requires 1 role
    // Expected: 1-character ready and blocked teams
  });
});
```

**Acceptance criteria:**

Run `npm test -- src/lib/combos.test.ts` and all new per-mission candidate tests pass. The function correctly separates ready teams (level sufficient) from blocked teams (only level insufficient), and populates level deficits accurately.

**Commands:**

```bash
# After implementation
npm run type-check    # Verify no type errors
npm test -- src/lib/combos.test.ts    # Run combination tests
```


## Milestone 2: DFS Assignment Algorithm

In this milestone, you will implement the depth-first search algorithm that assigns disjoint character teams to missions. The algorithm maximizes total mission value (sum of base condition counts) while ensuring no character is used in multiple missions. At the end, you will have a working `findBestMissionAssignment()` function with tests proving it finds optimal assignments.

**Scope:**
- Calculate mission value based on base condition count
- Implement DFS with backtracking for assignment exploration
- Define lexicographic objective function (mission value > chars used > bonuses)
- Write tests for optimality and conflict avoidance

**Files to modify:**
- `src/types/index.ts`: Add `MissionAssignment` and `MultiMissionAssignmentResult` types
- `src/lib/combos.ts`: Add `getMissionValue()` and `findBestMissionAssignment()` functions
- `src/lib/combos.test.ts`: Add test cases for DFS assignment

**Implementation details:**

In `src/types/index.ts`, add result types:

```typescript
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

  trainingRecommendations: TrainingRecommendation[];  // Filled in Milestone 3

  debug: {
    candidatesGenerated: number;
    dfsNodesExplored: number;
  };
}

/**
 * Training recommendation (structure defined in Milestone 3)
 */
export interface TrainingRecommendation {
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
```

In `src/lib/combos.ts`, implement helper functions and the main algorithm:

```typescript
/**
 * Calculate mission value based on number of base conditions
 * Missions requiring more roles are more valuable
 */
function getMissionValue(mission: Mission): number {
  return mission.baseConditions.length;
}

/**
 * Score for comparing assignments lexicographically
 */
interface AssignmentScore {
  totalMissionValue: number;   // Primary: sum of assigned mission values
  totalCharacters: number;     // Secondary: negative (prefer fewer)
  bonusesSatisfied: number;    // Tertiary: count of bonuses met
}

function compareScores(a: AssignmentScore, b: AssignmentScore): number {
  if (a.totalMissionValue !== b.totalMissionValue) {
    return a.totalMissionValue - b.totalMissionValue;
  }
  if (a.totalCharacters !== b.totalCharacters) {
    return a.totalCharacters - b.totalCharacters;  // Lower is better
  }
  return a.bonusesSatisfied - b.bonusesSatisfied;
}

export function findBestMissionAssignment(
  missions: Mission[],
  ownedCharacters: Character[],
  characterLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): MultiMissionAssignmentResult
```

The algorithm should:

1. **Generate candidates**: Call `findPerMissionCandidates()` for each mission to get ready teams and blocked teams.

2. **Sort missions by difficulty**: Count the number of ready teams for each mission. Sort missions in ascending order by this count (missions with fewer options are hardest and should be assigned first to avoid dead ends).

3. **Pre-sort teams**: For each mission, sort its ready teams by:
   - Team size (ascending: prefer 1-character over 3-character teams)
   - Bonus satisfaction (descending: prefer teams that satisfy bonus)

4. **DFS exploration**: Implement depth-first search with backtracking:

   ```
   function dfs(missionIndex, currentAssignment, usedCharacters):
     if missionIndex == missions.length:
       score = evaluateAssignment(currentAssignment)
       if score > bestScore:
         bestScore = score
         bestAssignment = clone(currentAssignment)
       return

     mission = sortedMissions[missionIndex]

     // Option 1: Skip mission (explore partial coverage)
     dfs(missionIndex + 1, currentAssignment, usedCharacters)

     // Option 2: Try each ready team
     for team in candidatesByMission[mission.id].readyTeams:
       if no character in team.characterIds is in usedCharacters:
         newAssignment = [...currentAssignment, {mission, team}]
         newUsed = union(usedCharacters, team.characterIds)
         dfs(missionIndex + 1, newAssignment, newUsed)
   ```

5. **Evaluation**: The `evaluateAssignment()` function computes:
   - `totalMissionValue`: sum of `getMissionValue(mission)` for assigned missions
   - `totalCharacters`: count of distinct characters used (negative for comparison)
   - `bonusesSatisfied`: count of teams where `satisfiesBonus` is true

6. **Return**: Package the best assignment into `MultiMissionAssignmentResult` with stats and debug info.

**Testing strategy:**

Create test cases in `src/lib/combos.test.ts`:

```typescript
describe("findBestMissionAssignment", () => {
  it("assigns disjoint teams with no character reuse", () => {
    // Setup: 2 missions, 6 characters
    // Expected: Each mission gets its own team, no overlap
  });

  it("prioritizes high-value missions (more base conditions)", () => {
    // Setup: Mission A (3 roles, value=3), Mission B (1 role, value=1)
    //        Only enough characters to assign one mission
    // Expected: Mission A assigned, Mission B unassigned
  });

  it("minimizes total characters when mission values are equal", () => {
    // Setup: 2 missions with same value, multiple assignment options
    // Expected: Assignment using fewer total distinct characters
  });

  it("prefers smaller teams per mission", () => {
    // Setup: Mission with 1-char and 2-char ready teams
    // Expected: 1-char team assigned
  });

  it("handles partial coverage when resources insufficient", () => {
    // Setup: 4 missions, only enough chars for 2
    // Expected: Best 2 missions assigned (highest value)
  });

  it("tracks unassigned missions correctly", () => {
    // Setup: 3 missions, 1 cannot be satisfied
    // Expected: stats.unassignedMissionIds includes that mission
  });
});
```

**Acceptance criteria:**

Run `npm test -- src/lib/combos.test.ts` and all DFS assignment tests pass. The function correctly enforces no character reuse, prioritizes high-value missions, and minimizes character usage as secondary objective.

**Commands:**

```bash
npm run type-check
npm test -- src/lib/combos.test.ts
```


## Milestone 3: Training Priority with Blocked Teams

In this milestone, you will update the training priority calculation to analyze blocked teams from unassigned missions and recommend which characters to level up. The scoring formula heavily weights mission unlocks (1000×) compared to bonuses (10×) or rarity (1×). At the end, training recommendations will show actionable level-up suggestions tied to specific mission unlocks.

**Scope:**
- Analyze blocked teams from unassigned missions
- Calculate which level-ups unlock which missions
- Implement training scoring with 1000× weight for unlocks
- Integrate rarity (only here, not in team formation)
- Write tests for scoring formula and recommendations

**Files to modify:**
- `src/lib/scoring.ts`: Update `calculateTrainingPriority()` or create new function
- `src/lib/combos.ts`: Integrate training recommendations into `findBestMissionAssignment()` result
- `src/lib/scoring.test.ts`: Add test cases for training priority scoring

**Implementation details:**

In `src/lib/scoring.ts`, update or replace the training priority logic:

```typescript
interface TrainingImpact {
  missionsUnlocked: string[];     // Mission IDs that would become assignable
  bonusesAdded: string[];         // Mission IDs that would gain bonus
}

export function calculateTrainingPriorityFromBlockedTeams(
  unassignedMissions: Mission[],
  blockedTeamsByMission: Map<string, BlockedCombination[]>,
  characters: Character[],
  characterLevels: Record<string, number>
): TrainingRecommendation[]
```

The algorithm should:

1. **Build character-to-missions map**: For each unassigned mission, examine its blocked teams. For each character appearing in a blocked team, record which missions that character could help unlock at various level targets.

2. **Determine level targets**: For each character, identify meaningful level milestones:
   - The minimum level needed to unlock each mission (the mission's `requiredLevel`)
   - Common game milestones (levels 10, 20, 30, 40, 50, 60, 70, 80, 90)
   - Take the union and filter to levels above current level

3. **Simulate level-ups**: For each character at each target level:
   - Simulate the character being at that level
   - For each mission in the character's potential unlock set:
     - Check if there exists a blocked team for that mission where all characters (including this one upgraded) now meet level requirements
     - If yes, count that mission as unlocked
   - Also check if the character would enable bonus conditions on currently assigned missions

4. **Score recommendations**: For each character-level pair with nonzero impact:
   ```
   score = 1000.0 × missionsUnlocked.length
         + 10.0 × bonusesAdded.length
         + 1.0 × character.rarity
   ```
   Note: No level gap penalty. Unlocking 1 mission (score ≈1000) vastly outweighs unlocking 2 bonuses (score ≈20) or having 5★ rarity (score ≈5).

5. **Sort and return**: Sort recommendations by score descending, limit to top 20, and return with actionable data (current level, target level, missions unlocked).

**Integration into assignment result:**

In `src/lib/combos.ts`, update `findBestMissionAssignment()` to:

1. After finding the best assignment, collect unassigned missions.
2. For each unassigned mission, get its `blockedTeams` from the per-mission candidates.
3. Call `calculateTrainingPriorityFromBlockedTeams()` with unassigned missions and their blocked teams.
4. Include the training recommendations in the `MultiMissionAssignmentResult`.

**Testing strategy:**

Create test cases in `src/lib/scoring.test.ts`:

```typescript
describe("calculateTrainingPriorityFromBlockedTeams", () => {
  it("heavily weights mission unlocks over bonuses", () => {
    // Setup: Char A unlocks 1 mission, Char B adds 2 bonuses
    // Expected: Char A score ≈1000, Char B score ≈20, A ranked higher
  });

  it("includes character rarity in scoring", () => {
    // Setup: 5★ char and 3★ char both unlock 1 mission
    // Expected: 5★ char score = 1005, 3★ char score = 1003
  });

  it("recommends minimum level targets to unlock missions", () => {
    // Setup: Mission requires Lv30, char at Lv20
    // Expected: Recommendation target = 30 (not 40 or 50)
  });

  it("aggregates impact across multiple missions", () => {
    // Setup: Char appears in blocked teams for 3 missions
    // Expected: Training that char unlocks all 3 missions
  });

  it("handles characters that unlock no missions", () => {
    // Setup: Char not in any blocked teams
    // Expected: No recommendation for that char
  });
});
```

**Acceptance criteria:**

Run `npm test -- src/lib/scoring.test.ts` and all training priority tests pass. Recommendations correctly prioritize mission unlocks (coefficient 1000) over bonuses (coefficient 10) and include rarity as a minor factor.

**Commands:**

```bash
npm run type-check
npm test -- src/lib/scoring.test.ts
npm test -- src/lib/combos.test.ts  # Verify integration
```


## Milestone 4: UI Integration and End-to-End Testing

In this milestone, you will update the Results page to display mission-by-mission assignments and training recommendations. Users will see each mission with its assigned team (or indication it is unassigned), with character icons dimmed if below required level. Training recommendations appear in a separate section sorted by priority. At the end, the entire feature will work end-to-end.

**Scope:**
- Update Results.tsx to call new assignment function
- Display mission assignments instead of universal/partial groupings
- Show training recommendations with actionable level targets
- Test end-to-end with multiple realistic scenarios
- Validate performance with large datasets

**Files to modify:**
- `src/pages/Results.tsx`: Replace logic and update UI
- `src/components/MissionAssignmentCard.tsx`: New component (create)
- `src/components/TrainingRecommendationList.tsx`: New component (create)

**Implementation details:**

In `src/pages/Results.tsx`, update the analysis logic:

```typescript
// OLD (remove):
const result = findCombinationsForMultipleMissions(
  selectedMissions,
  ownedCharacters,
  characterLevels,
  bitmaskLookup
);

// NEW (replace with):
const assignmentResult = findBestMissionAssignment(
  selectedMissions,
  ownedCharacters,
  characterLevels,
  bitmaskLookup
);
```

Update state to store the new result type:

```typescript
const [assignmentResult, setAssignmentResult] =
  useState<MultiMissionAssignmentResult | null>(null);
```

Create `src/components/MissionAssignmentCard.tsx`:

```typescript
interface MissionAssignmentCardProps {
  assignment: MissionAssignment;
  mission: Mission;
  characterLevels: Record<string, number>;
}

export function MissionAssignmentCard({ assignment, mission, characterLevels }: MissionAssignmentCardProps) {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">
        {mission.name[lang]} (Value: {assignment.missionValue})
      </h3>

      {assignment.team ? (
        <div>
          {/* Display character avatars */}
          <div className="flex gap-2">
            {assignment.team.characterIds.map(charId => {
              const char = getCharacterById(charId);
              const level = characterLevels[charId] || 1;
              const dimmed = level < mission.requiredLevel;

              return (
                <CharacterAvatar
                  key={charId}
                  character={char}
                  dimmed={dimmed}
                  levelDeficit={dimmed ? mission.requiredLevel - level : 0}
                />
              );
            })}
          </div>

          {/* Status badges */}
          {assignment.team.satisfiesBonus && (
            <span className="badge-green">Base + Bonus</span>
          )}
        </div>
      ) : (
        <p className="text-amber-600">
          {lang === 'ja' ? '割り当て不可' : lang === 'zh-Hans' ? '无法分配' : '無法分配'}
        </p>
      )}
    </div>
  );
}
```

Create `src/components/TrainingRecommendationList.tsx`:

```typescript
interface TrainingRecommendationListProps {
  recommendations: TrainingRecommendation[];
}

export function TrainingRecommendationList({ recommendations }: TrainingRecommendationListProps) {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <div className="space-y-2">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
          <div className="font-semibold">
            {rec.characterName[lang]} ({rec.characterRarity}★)
          </div>
          <div className="text-sm text-gray-600">
            Lv{rec.currentLevel} → Lv{rec.targetLevel}
          </div>
          <div className="text-sm">
            {rec.impact.missionsUnlocked.length > 0 && (
              <span className="text-green-700">
                Unlocks {rec.impact.missionsUnlocked.length} mission(s)
              </span>
            )}
            {rec.impact.bonusesAdded.length > 0 && (
              <span className="text-blue-700">
                +{rec.impact.bonusesAdded.length} bonus(es)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Priority: {rec.priority.toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Update `src/pages/Results.tsx` display section:

```typescript
<div className="space-y-6">
  {/* Summary */}
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h2 className="text-lg font-semibold">
      {lang === 'ja' ? '概要' : lang === 'zh-Hans' ? '概要' : '概要'}
    </h2>
    <p>
      {assignmentResult.stats.missionsAssigned} / {assignmentResult.stats.missionsTotal}
      missions assigned
    </p>
    <p>
      Total mission value: {assignmentResult.stats.totalMissionValue}
    </p>
    <p>
      Using {assignmentResult.stats.totalCharactersUsed} characters
    </p>
  </div>

  {/* Mission Assignments */}
  <div>
    <h2 className="text-xl font-semibold mb-4">
      {lang === 'ja' ? '依頼割り当て' : lang === 'zh-Hans' ? '委托分配' : '委託分配'}
    </h2>
    <div className="space-y-3">
      {assignmentResult.assignments.map(assignment => {
        const mission = getMissionById(assignment.missionId);
        if (!mission) return null;

        return (
          <MissionAssignmentCard
            key={assignment.missionId}
            assignment={assignment}
            mission={mission}
            characterLevels={characterLevels}
          />
        );
      })}
    </div>
  </div>

  {/* Training Recommendations */}
  {assignmentResult.trainingRecommendations.length > 0 && (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {lang === 'ja' ? '育成推奨' : lang === 'zh-Hans' ? '培养推荐' : '培養推薦'}
      </h2>
      <TrainingRecommendationList
        recommendations={assignmentResult.trainingRecommendations}
      />
    </div>
  )}
</div>
```

**End-to-end testing scenarios:**

1. **Scenario A: Full coverage**
   - Select 2 missions, own 10 characters all at sufficient levels
   - Expected: Both missions assigned, no training recommendations

2. **Scenario B: Partial coverage**
   - Select 4 missions (values: 3, 2, 2, 1), own 8 characters sufficient for top 2
   - Expected: High-value missions (3, 2) assigned, others unassigned, training recommendations for unassigned

3. **Scenario C: Level-blocked missions**
   - Select 3 missions, own sufficient characters but some below required levels
   - Expected: Teams assigned but some chars dimmed, training recommendations show level-ups

4. **Scenario D: Rarity tiebreaker in training**
   - Select 2 missions, both unassigned, 5★ char and 3★ char both unlock 1 mission
   - Expected: 5★ char ranked higher in training recommendations

**Performance validation:**

Test with realistic large datasets:
- 50 owned characters
- 4 selected missions
- Measure time to compute assignments
- Expected: < 500ms for assignment, < 200ms for training priority

**Commands:**

```bash
# Type checking
npm run type-check

# Full test suite
npm test

# Run dev server and test manually
npm run dev
# Navigate to http://localhost:5173/ss-assist/
# Test scenarios A-D above
```

**Acceptance criteria:**

1. Results page displays mission-by-mission assignments with no character reuse
2. Mission value is visible in UI
3. Character icons are dimmed when below required level
4. Training recommendations sorted by priority (unlocks >> bonuses >> rarity)
5. All tests pass
6. Performance acceptable with 50 characters and 4 missions


## Validation and Acceptance

After completing all four milestones, the application will correctly assign disjoint character teams to missions and recommend training priorities.

**Final validation steps:**

1. Start the dev server: `npm run dev`
2. Navigate to the application in browser
3. Select 4 missions with different requirements:
   - Mission A: 3 base conditions (Attackers + Fire + Support)
   - Mission B: 2 base conditions (Supporters + Wind)
   - Mission C: 2 base conditions (Balancers + Earth)
   - Mission D: 1 base condition (Attackers)
4. Mark 12 characters as owned with varying levels and tags
5. Run analysis
6. Verify the results page shows:
   - Summary section with total mission value and characters used
   - Each mission with its assigned team (or unassigned indicator)
   - No character appearing in multiple teams
   - Character icons dimmed if level < required
   - Training recommendations sorted by priority
   - Recommendations show mission unlocks with 1000× weighting visible in scores
7. Run test suite: `npm test` (all tests pass)
8. Run type check: `npm run type-check` (no errors)

**Expected user experience:**

Before this change, users saw confusing results where single teams were evaluated against multiple missions, implying one team could handle everything simultaneously.

After this change, users see realistic assignments where each mission gets its own team with no character reuse. The primary value is clear training guidance: "Train Character X to level 35 to unlock Mission Y" with recommendations sorted by how many missions each training action would unlock, helping users make strategic training decisions.


## Idempotence and Recovery

This change is additive and testable at each milestone. If you need to pause or restart:

1. After Milestone 1: The new `findPerMissionCandidates()` function exists and is tested, but nothing calls it yet. The app still works with the old logic.
2. After Milestone 2: The new `findBestMissionAssignment()` function exists and is tested, but Results.tsx still uses the old logic. The app still works.
3. After Milestone 3: Training priority is updated but UI has not changed. The app still works.
4. After Milestone 4: UI uses new logic. If bugs appear, you can temporarily revert Results.tsx to the old implementation while fixing the algorithm.

To roll back completely: revert changes to `src/lib/combos.ts`, `src/lib/scoring.ts`, and `src/pages/Results.tsx`. All other code remains compatible.

No data migrations or state changes are needed. The localStorage state structure remains unchanged.


## Artifacts and Notes

(To be filled with implementation transcripts, test outputs, and performance measurements during execution)


## Interfaces and Dependencies

### New Types (src/types/index.ts)

```typescript
/**
 * A combination that is blocked only by level requirements
 */
export interface BlockedCombination {
  characterIds: string[];
  meetsBaseConditions: boolean;
  meetsBonusConditions: boolean;
  levelDeficits: Record<string, number>;
}

/**
 * Candidate teams for a single mission
 */
export interface PerMissionCandidates {
  missionId: string;
  readyTeams: Combination[];
  blockedTeams: BlockedCombination[];
}

/**
 * Assignment of a team to a mission
 */
export interface MissionAssignment {
  missionId: string;
  missionValue: number;
  team: {
    characterIds: string[];
    totalRarity: number;
    satisfiesBonus: boolean;
  } | null;
}

/**
 * Result of multi-mission disjoint assignment
 */
export interface MultiMissionAssignmentResult {
  assignments: MissionAssignment[];
  stats: {
    totalMissionValue: number;
    missionsAssigned: number;
    missionsTotal: number;
    totalCharactersUsed: number;
    totalRarity: number;
    unassignedMissionIds: string[];
  };
  trainingRecommendations: TrainingRecommendation[];
  debug: {
    candidatesGenerated: number;
    dfsNodesExplored: number;
  };
}

/**
 * Training recommendation
 */
export interface TrainingRecommendation {
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
```

### New Functions (src/lib/combos.ts)

```typescript
/**
 * Generate candidate teams for a single mission, separated by level sufficiency
 */
export function findPerMissionCandidates(
  mission: Mission,
  ownedCharacters: Character[],
  characterLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): PerMissionCandidates

/**
 * Assign disjoint character teams to missions, maximizing mission value
 */
export function findBestMissionAssignment(
  missions: Mission[],
  ownedCharacters: Character[],
  characterLevels: Record<string, number>,
  bitmaskLookup: BitmaskLookup
): MultiMissionAssignmentResult
```

### Algorithm Pseudocode

```
function findBestMissionAssignment(missions, characters, levels, lookup):
  # Phase 1: Generate candidates for each mission
  candidatesByMission = map()
  for mission in missions:
    candidatesByMission[mission.id] = findPerMissionCandidates(mission, characters, levels, lookup)

  # Phase 2: Sort missions by difficulty (fewest ready teams first)
  sortedMissions = sortBy(missions, m => candidatesByMission[m.id].readyTeams.length)

  # Phase 3: DFS to find best assignment
  bestAssignment = null
  bestScore = {totalMissionValue: 0, totalCharacters: Infinity, bonuses: 0}

  function dfs(missionIndex, currentAssignment, usedChars):
    if missionIndex == missions.length:
      score = evaluateAssignment(currentAssignment)
      if score > bestScore:
        bestScore = score
        bestAssignment = clone(currentAssignment)
      return

    mission = sortedMissions[missionIndex]

    # Option 1: Skip mission
    dfs(missionIndex + 1, currentAssignment, usedChars)

    # Option 2: Assign a team
    for team in candidatesByMission[mission.id].readyTeams:
      if not conflicts(team.characterIds, usedChars):
        newAssignment = [...currentAssignment, {mission, team}]
        newUsed = union(usedChars, team.characterIds)
        dfs(missionIndex + 1, newAssignment, newUsed)

  dfs(0, [], set())

  # Phase 4: Generate training recommendations from blocked teams
  unassignedMissions = missions where not in bestAssignment
  blockedTeams = map from unassignedMissions to candidatesByMission[m.id].blockedTeams
  recommendations = calculateTrainingPriorityFromBlockedTeams(unassignedMissions, blockedTeams, characters, levels)

  return {
    assignments: bestAssignment,
    stats: { ... },
    trainingRecommendations: recommendations,
    debug: { ... }
  }
```

### Updated Functions (src/lib/scoring.ts)

```typescript
/**
 * Calculate training priority from blocked teams
 * Scoring: 1000 × missionsUnlocked + 10 × bonuses + 1 × rarity
 */
export function calculateTrainingPriorityFromBlockedTeams(
  unassignedMissions: Mission[],
  blockedTeamsByMission: Map<string, BlockedCombination[]>,
  characters: Character[],
  characterLevels: Record<string, number>
): TrainingRecommendation[]
```

### New Components

```typescript
// src/components/MissionAssignmentCard.tsx
interface MissionAssignmentCardProps {
  assignment: MissionAssignment;
  mission: Mission;
  characterLevels: Record<string, number>;
}

export function MissionAssignmentCard(props: MissionAssignmentCardProps): JSX.Element

// src/components/TrainingRecommendationList.tsx
interface TrainingRecommendationListProps {
  recommendations: TrainingRecommendation[];
}

export function TrainingRecommendationList(props: TrainingRecommendationListProps): JSX.Element
```


## Dependencies and Constraints

**No new external dependencies needed.** This is a pure refactoring using existing libraries and patterns.

**Constraints:**
- Must maintain backward compatibility with existing localStorage state
- Must maintain or improve performance (target: <500ms for 4 missions, 50 characters)
- Must follow existing bitmask optimization patterns
- Must maintain TypeScript strict mode compliance
- Must pass all existing tests plus new multi-mission assignment tests

**Assumptions:**
- The existing `satisfiesAllConditionsWithCounts()` function correctly validates count-based conditions
- The existing bitmask pruning logic is sound and reusable
- Users typically select 2-4 missions at a time (not 10+)
- Character rarity is already present in character data as a numeric field (3, 4, or 5)
- Mission data structure remains stable during implementation
