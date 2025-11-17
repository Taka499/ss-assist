# SS-Assist Multi-Mission Algorithm Review

## 1. Purpose of This Review

This document reviews the currently proposed multi-mission assignment algorithm (as discussed in the dialogue with Claude) against the actual requirements for the **ss-assist** project. It highlights where the proposal aligns with the goals, where it falls short, and provides a concrete redesign direction that better fits the codebase and the product intent.

---

## 2. Restated Requirements

Based on the discussion and clarifications, the effective requirements for the multi-mission feature are:

1. **Per-mission teams, no reuse**
   - Each mission must have its own distinct team of characters.
   - A character can be assigned to **at most one** mission in a given plan.

2. **Minimum characters per mission**
   - Each mission’s base conditions define how many roles are required (1–3).
   - For missions requiring 1 or 2 base roles, prefer teams with **the minimum number of characters** that satisfy base conditions (1 or 2), up to a maximum of 3.
   - For missions requiring 3 base roles, teams will necessarily have 3 characters.

3. **Best partial solution when resources are insufficient**
   - If owned characters cannot satisfy all selected missions simultaneously (under the no-reuse constraint), the algorithm should produce a **best partial assignment**:
     - Prefer plans that complete more missions and/or higher-value missions.
     - Avoid obviously suboptimal assignments (e.g., wasting a rare character on a low-value mission that blocks a high-value mission).

4. **Training priority as the main purpose**
   - The core value of this assist tool is to show **which characters should be trained** (leveled up) to unlock more missions.
   - Missions may be currently blocked only by level requirements; the system should surface these “almost-doable” missions and quantify required level increases.

5. **Up to N missions considered together (e.g., 4)**
   - The “up to 4 missions” remark is not arbitrary: it reflects a planning scenario where a user chooses a small set of missions, then the tool suggests a character schedule and training plan to handle those missions.

6. **Result presentation**
   - The UI should show, for each mission:
     - Assigned team of 1–3 characters (if possible), with characters below required level visually dimmed or indicated.
     - Missions that could not be assigned due to hard constraints.
   - Optionally, a separate training-priority view highlighting which characters and levels would unlock additional missions.

---

## 3. Summary of Claude’s Proposed Algorithm

Claude’s redesign can be summarized as:

1. **Phase 1: Generate valid combinations per mission**
   - For each mission, call an existing `findCombinations()` to enumerate valid 1–3 character teams.
   - Filter to keep only combinations that satisfy base conditions.
   - Group teams by size and prefer smaller teams.

2. **Phase 2: Greedy mission assignment with no reuse**
   - Sort missions by the number of available combinations (ascending; “hardest” missions first).
   - For each mission in that order:
     - Assign the smallest valid team that does not conflict with already-used characters.
     - Mark those characters as used.
   - If no non-conflicting combination is available for a mission, mark it as unsatisfiable and continue.

3. **Phase 3: Training priority**
   - Identify characters whose training would unlock currently unsatisfiable missions.
   - Score characters by mission unlock potential, level gaps, and rarity.

This is an improvement compared to the earlier “universal 3-character team that covers many missions” approach, but it is still not fully aligned with project requirements.

---

## 4. Where the Proposal Aligns with Requirements

Claude’s plan successfully addresses several previous misunderstandings:

1. **No character reuse across missions**
   - The greedy assignment step explicitly ensures that each character can only be used in one mission’s team.

2. **Per-mission teams of 1–3 characters**
   - The algorithm treats combinations on a mission-by-mission basis, with teams sized between 1 and 3 characters.

3. **Preference for smaller teams**
   - Grouping by size and picking smaller combinations first is consistent with the idea of using the minimum number of characters per mission.

4. **Explicit handling of unsatisfiable missions**
   - Missions for which no non-conflicting team can be found are marked unsatisfiable, which can be surfaced in the UI as “cannot complete with current roster under disjoint constraints.”

5. **Awareness of training priority**
   - The algorithm at least conceptually acknowledges training priority and the notion of characters unlocking unsatisfiable missions.

These are meaningful improvements over the original universal-team logic and move closer to the intended behavior.

---

## 5. Key Gaps and Mismatches

Despite the improvements, several important mismatches remain between the proposal and the actual requirements.

### 5.1 Objective Misalignment: “Minimize distinct characters” vs. “Best partial solution”

Claude’s framing emphasizes **minimizing total distinct characters across all missions** as a central objective. While using fewer characters can be desirable, it is not the true primary goal.

The actual priorities are:

1. **Maximize mission coverage or mission value**
   - We want to complete as many missions as possible (or maximize total reward/priority) given the no-reuse constraint.

2. **Secondarily, minimize characters and/or training cost**
   - Among equally good mission coverage solutions, prefer those using fewer characters or requiring less training.

A purely greedy strategy that picks the smallest available team for each mission in sequence can easily produce suboptimal outcomes, such as:

- Using a rare character in a small team for a low-value mission, preventing that character from being used in a high-value mission where they are essential.
- Completing fewer missions than possible under a more globally aware assignment.

This violates the “best partial solution” requirement and can produce surprising or unintuitive results for users.

### 5.2 Missing Explicit Optimization Over Mission Subsets

The original complaint about “up to 4 missions” hints that the system should **choose the best subset of missions** that can be completed with disjoint teams from owned characters.

Claude’s plan implicitly assumes a fixed mission set and never revisits the question of which subset of missions should be prioritized. There is no explicit optimization over subsets, such as:

- Selecting 3 high-value missions instead of attempting 4 and failing one.
- Evaluating alternative assignments that might sacrifice a low-value mission to enable two medium-value ones.

Without this, the algorithm cannot fully satisfy the planning aspect of the tool.

### 5.3 Training Priority Is Not Structurally Integrated

Claude’s Phase 3 is conceptually aligned with training priority, but is structurally underspecified:

- It does not clearly specify how `findCombinations()` should treat teams that **fail only level requirements** (i.e., “nearly valid” teams).
- It does not specify how to aggregate level deficits and compute a concrete priority ranking, such as:
  - “Raise Character A by 5 levels and Character B by 10 to unlock Missions X and Y.”

In the current codebase, level deficits and training logic must be integrated with the combination generation process. Simply post-processing unsatisfied missions without preserving near-valid team information will not produce robust or explainable training recommendations.

### 5.4 Greedy Algorithm vs. Feasible Exhaustive Search

Given that the number of missions considered at once is small (e.g., up to 4) and the number of candidate teams per mission is limited by bitmask pruning, the search space for assignments is relatively small.

In this regime, a proper **backtracking / DFS assignment search** is both feasible and more appropriate than a greedy one-pass algorithm. The proposed greedy strategy chooses convenience over optimality without clear necessity.

---

## 6. Recommended Redesign Aligned with the Repo and Requirements

This section proposes a redesign that is more consistent with the existing code structure (bitmasks, `findCombinations`, training-related fields) and the clarified requirements.

### 6.1 Per-Mission Candidate Generation (Reusing Existing Logic)

Introduce or extend a helper around the existing single-mission combinations logic to produce, for each mission:

- `readyTeams`: combinations that fully satisfy base conditions and level requirements.
- `blockedTeams`: combinations that satisfy tags and role counts, but fail level checks, with `levelDeficits` populated.

This may be accomplished either by:

- Refining `findCombinations(mission, characters, levels, bitmaskLookup)` to emit both types, or
- Adding a wrapper function that leverages the bitmask validation logic but separates results according to level sufficiency.

This preserves the existing bitmask-based pruning and `satisfiesAllConditionsWithCounts` behavior, while also exposing the crucial “almost valid” teams needed for training analysis.

### 6.2 Mission-Centric Assignment via Small DFS/Backtracking

Replace the greedy assignment with a small depth-first search (DFS) or backtracking algorithm:

1. For the selected missions, build:
   - `readyTeamsByMission[missionId]`: list of ready teams for that mission.
   - Optionally sort those teams by size (ascending) or by some quality score.

2. Sort the missions themselves by heuristic difficulty, e.g.:
   - Fewest `readyTeams` first (hardest missions first).
   - Break ties by mission priority if available.

3. Recursively assign teams to missions:

   - At each step, for the current mission:
     - Enumerate all `readyTeams` that do not conflict with already-used characters.
     - For each team:
       - Add it to the partial assignment.
       - Mark its characters as used.
       - Recurse to assign the next mission.
   - Also consider the option to “skip” a mission (i.e., assign no team) to allow exploration of different subsets.

4. Maintain a global best assignment according to an explicit objective:

   - Primary objective:
     - Maximize number of missions assigned, or alternatively maximize sum of mission values.
   - Secondary objective:
     - Minimize total number of characters used.
     - Optionally minimize some function of training cost if partially considering blocked teams.

The search space is small enough that this exhaustive exploration is practical and yields assignments that are consistent with the “best partial solution” requirement.

Return a data structure such as:

```ts
interface MultiMissionAssignment {
  assignments: {
    missionId: string;
    team: Combination | null; // null = unassigned
  }[];
  usedCharacterIds: string[];
}
```

This maps cleanly to the UI, where each mission can be displayed with either a team or an indication that it is currently unassigned.

### 6.3 Training Priority Based on Blocked Teams

For missions that remain unassigned in the best assignment:

1. Inspect `blockedTeams` for those missions to understand which combinations are “almost valid”.
2. For each blocked team, compute:
   - Total training cost (sum of positive level deficits across its characters).
   - Per-character contributions to that training cost.
3. From this, derive per-character training suggestions:
   - How many levels each character needs to gain to make specific missions feasible.
   - Which combinations of level-ups unlock which subset of missions.

This can either be integrated with or feed into the existing training priority logic (`calculateTrainingPriority`) to provide consistent scoring for:

- Characters that unlock the largest number of missions per unit of training.
- Characters whose training cost is low compared to the missions they unlock.

The UI can then display clear, actionable recommendations such as:

- “Train Character A from level 30 → 35 to unlock Mission X.”
- “Train Characters B (40 → 45) and C (20 → 25) to unlock Missions Y and Z.”

### 6.4 Optional: Explicit Mission Value / Priority

If the game design or UI supports it, consider assigning a **value** or priority to missions:

- Some missions might be more important due to rewards, player goals, or time-limited nature.
- Incorporating these values into the assignment objective function (e.g., maximizing total mission value) will make the planner feel more intelligent and aligned with player intent.

---

## 7. Implementation Impact and Feasibility

Given the current architecture of **ss-assist**:

- Bitmask-based validation and combinations logic already exist and can be extended.
- The number of missions considered at once is small (e.g., ≤ 4), and the pruned combination sets per mission should be modest.
- A DFS/backtracking assignment layer on top of per-mission combinations is straightforward to implement, test, and maintain.

Therefore, the recommended redesign is **feasible** within the existing performance and complexity constraints and will likely provide significantly more intuitive and useful results to players.

---

## 8. Conclusion

The proposed algorithm from Claude is a step in the right direction compared to the original universal-team approach, but it does **not fully satisfy** the clarified requirements for:

- Best partial mission coverage under no-reuse constraints.
- Integration of training priority as the central value proposition of the tool.

By:

1. Generating per-mission ready and blocked teams,
2. Using a mission-centric DFS/backtracking assignment to maximize mission coverage,
3. Leveraging blocked teams to compute training priorities,

the multi-mission feature can better match the game’s needs and provide players with clear, trustworthy guidance on both **which teams to use now** and **which characters to train next**.

