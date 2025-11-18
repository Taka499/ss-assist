# Mission → Commission Terminology Update

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` at the repository root.


## Purpose / Big Picture

The application currently uses the term "mission" throughout its codebase, UI, and documentation. However, the correct English terminology for Stella Sora's 依頼 (irai) feature is "commission". This terminology mismatch confuses English-speaking players who are familiar with the game's official localization.

After this change, all user-facing English text will correctly use "commission" instead of "mission", while the codebase will be systematically refactored to use commission-based naming internally. The work is split into two phases: Phase 1 delivers immediate user-facing fixes, while Phase 2 handles comprehensive internal refactoring.

You can verify Phase 1 success by switching the app to English language and observing that all UI text (navigation, buttons, headings, status messages) uses "commission" terminology. Phase 2 success is verified by confirming that TypeScript types, function names, variable names, file names, and documentation all consistently use commission terminology throughout the codebase.


## Progress

### Phase 1: User-Facing UI (Quick Fix)

- [x] (2025-11-18) Update i18n/locales/en.json with commission terminology
- [ ] Manual testing in dev server with English language selected
- [ ] Verify all UI screens show correct terminology
- [ ] Run type checking to ensure no regressions
- [ ] Commit Phase 1 changes

### Phase 2: Comprehensive Internal Refactoring

- [ ] Update TypeScript types in src/types/index.ts
  - [ ] Rename `Mission` interface to `Commission`
  - [ ] Rename `MissionDuration` to `CommissionDuration`
  - [ ] Rename `MissionAssignment` to `CommissionAssignment`
  - [ ] Rename `MultiMissionAssignmentResult` to `MultiCommissionAssignmentResult`
  - [ ] Rename `PerMissionCandidates` to `PerCommissionCandidates`
- [ ] Update core library files in src/lib/
  - [ ] data.ts: Rename getMissions() → getCommissions(), missions array
  - [ ] combos.ts: Update function names and parameters (~581 occurrences)
  - [ ] scoring.ts: Update training recommendation logic
  - [ ] analytics.ts: Update event tracking function names
- [ ] Update Zustand store in src/store/
  - [ ] useAppStore.ts: Rename selectedMissionIds → selectedCommissionIds
  - [ ] Update toggleMissionSelection → toggleCommissionSelection
  - [ ] Update clearSelectedMissions → clearSelectedCommissions
  - [ ] Update localStorage key if needed (migration consideration)
- [ ] Rename component files and update imports
  - [ ] MissionSelection.tsx → CommissionSelection.tsx
  - [ ] MissionPicker.tsx → CommissionPicker.tsx
  - [ ] MissionAssignmentCard.tsx → CommissionAssignmentCard.tsx
  - [ ] MissionCoverageIndicator.tsx → CommissionCoverageIndicator.tsx
  - [ ] Update all imports across the codebase
- [ ] Update data source files
  - [ ] Coordinate renaming stellasora - missions.csv → stellasora - commissions.csv
  - [ ] Update scripts/csv-to-json.ts to handle new filename
  - [ ] Update validate-data.ts schema references
  - [ ] Regenerate JSON files with npm run build:data
- [ ] Update test files
  - [ ] Rename test data fixtures (mission-001 → commission-001)
  - [ ] Update test assertions and expectations
  - [ ] Ensure all 156+ tests still pass
- [ ] Update documentation files
  - [ ] CLAUDE.md: Update all references from mission → commission
  - [ ] README.md: Update terminology
  - [ ] _docs/*.md: Update ExecPlans and design docs
  - [ ] Comment updates in code
- [ ] Final validation
  - [ ] Run npm run type-check
  - [ ] Run npm test (all tests passing)
  - [ ] Run npm run build:data (data generation works)
  - [ ] Run npm run build (production build succeeds)
  - [ ] Manual end-to-end testing in all languages
  - [ ] Performance validation (no regressions)
- [ ] Commit Phase 2 changes


## Surprises & Discoveries

(To be filled in during implementation)


## Decision Log

### Phase 1 (2025-11-18)

**D1.1 - Two-phase approach**: Decided to split the work into two phases: Phase 1 focuses on immediate user-facing fixes (i18n only), while Phase 2 handles comprehensive internal refactoring. This allows delivering visible corrections quickly while planning the larger refactoring carefully.

Rationale: Users see incorrect terminology immediately in the UI, so fixing that first provides immediate value. The internal refactoring is more complex (file renames, type changes, test updates) and requires careful coordination to avoid breaking changes. By separating the phases, we reduce risk and can validate each phase independently.

**D1.2 - UI translations only in Phase 1**: Chose to only modify i18n/locales/en.json in Phase 1, without changing any TypeScript code, component names, or internal references.

Rationale: Translation files are leaf nodes in the dependency graph - they have no dependents. Changing them is safe and has zero risk of breaking type checking or tests. This allows quick deployment of user-visible fixes while we plan the comprehensive refactoring.

**D1.3 - Keep Japanese and Chinese unchanged**: Only updating English translations, leaving Japanese (ja), Simplified Chinese (zh-Hans), and Traditional Chinese (zh-Hant) as-is.

Rationale: The Japanese term 依頼 (irai) and Chinese translations are already correct. This is purely an English terminology fix.


## Outcomes & Retrospective

(To be filled in at completion)


## Context and Orientation

The Stella Sora Commission Assistant (formerly "Mission Assistant") is a single-page application (SPA) built with React, TypeScript, and Vite. The app helps players find optimal character combinations for game commissions and provides training priority recommendations.

The term "mission" appears in approximately 700+ locations across the codebase, including:

1. **Translation files** (i18n/locales/en.json): User-facing strings displayed in the UI
2. **TypeScript types** (src/types/index.ts): Core data structures like `Mission`, `MissionDuration`, `MissionAssignment`
3. **Data files**:
   - Source: data-sources/stellasora - missions.csv (human-editable)
   - Generated: data/missions.json (gitignored, auto-generated from CSV)
4. **Core libraries** (src/lib/): Functions like `getMissions()`, `findCombinations()` with mission parameters
5. **State management** (src/store/useAppStore.ts): Store properties like `selectedMissionIds`, `toggleMissionSelection()`
6. **React components** (src/components/, src/pages/): Files named Mission*.tsx
7. **Tests** (*.test.ts files): Test data using "mission-001" IDs, test descriptions
8. **Documentation** (_docs/*.md, CLAUDE.md, README.md): Architecture explanations and guides

The data pipeline is CSV → JSON → React:
- Human editors modify data-sources/stellasora - missions.csv
- Build script (npm run build:data) generates data/missions.json
- React components load data via src/lib/data.ts singleton
- Zustand store tracks user selections (owned characters, levels, selected missions)
- Algorithm libraries process combinations and training priorities

Key architectural constraints:
- JSON files are gitignored (treated as build artifacts)
- CSV files are source of truth (checked into git)
- GitHub Actions regenerates JSON during deployment
- Hash-based routing (no React Router)
- All processing is client-side (serverless)


## Plan of Work

### Phase 1: User-Facing UI (Quick Fix)

The immediate goal is to fix the user-visible English terminology. This requires updating only the translation file at i18n/locales/en.json.

Open i18n/locales/en.json and replace all instances of "mission" with "commission" in the English translation strings. This includes:
- App title: "Stella Sora Mission Assistant" → "Stella Sora Commission Assistant"
- Navigation labels: "Missions" → "Commissions"
- Section headings: "Select Missions" → "Select Commissions"
- Status messages: "mission(s)" → "commission(s)"
- Descriptions mentioning missions
- Warnings and hints
- Button labels if applicable

Do NOT change translation keys (the left side of key-value pairs like `"missions": {...}`). Only change the string values (the right side).

After updating the file, start the dev server (npm run dev), switch the language to English in the app UI, and verify that all screens show "commission" instead of "mission". Test all pages: Home, Characters, Levels, Commissions (formerly Missions), and Results.

Run type checking (npm run type-check) to ensure no TypeScript errors were introduced. This should pass with no changes since we only modified JSON strings.

Commit the changes with a message like "fix: update English terminology from mission to commission (UI only)".

### Phase 2: Comprehensive Internal Refactoring

The comprehensive refactoring requires careful sequencing to maintain type safety and test coverage throughout. The order below minimizes breakage:

**Step 1 - Type definitions**: Start with the foundational types in src/types/index.ts. Rename interfaces:
- `Mission` → `Commission`
- `MissionDuration` → `CommissionDuration`
- `MissionAssignment` → `CommissionAssignment`
- `MultiMissionAssignmentResult` → `MultiCommissionAssignmentResult`
- `PerMissionCandidates` → `PerCommissionCandidates`

Update all JSDoc comments referencing missions. This will break type checking everywhere that imports these types, which is expected.

**Step 2 - Core data loading**: Update src/lib/data.ts:
- Rename the `missions` array variable to `commissions`
- Rename `getMissions()` function to `getCommissions()`
- Update the JSON import path if needed (after CSV rename)
- Update all references to Mission type to Commission

**Step 3 - Algorithm libraries**: Update src/lib/combos.ts and src/lib/scoring.ts:
- Rename all function parameters: `mission` → `commission`, `missions` → `commissions`
- Rename all local variables following the same pattern
- Update function JSDoc comments
- Update type annotations (Mission → Commission)
- This is the largest file by occurrence count (~581 in combos alone)

**Step 4 - State management**: Update src/store/useAppStore.ts:
- Rename store properties: `selectedMissionIds` → `selectedCommissionIds`
- Rename actions: `toggleMissionSelection` → `toggleCommissionSelection`, `clearSelectedMissions` → `clearSelectedCommissions`
- Update localStorage persistence key (consider migration for existing users)
- Update related test file useAppStore.test.ts

**Step 5 - Component files**: Rename and update component files:
- Rename files using git mv to preserve history:
  ```
  git mv src/pages/MissionSelection.tsx src/pages/CommissionSelection.tsx
  git mv src/components/MissionPicker.tsx src/components/CommissionPicker.tsx
  git mv src/components/MissionAssignmentCard.tsx src/components/CommissionAssignmentCard.tsx
  git mv src/components/MissionCoverageIndicator.tsx src/components/CommissionCoverageIndicator.tsx
  ```
- Update all imports across the codebase that reference these files
- Within each file, rename component functions, props interfaces, and internal variables
- Update JSDoc comments and inline comments

**Step 6 - Data source files**:
- Coordinate with data maintainers before renaming the CSV file
- Rename data-sources/stellasora - missions.csv → data-sources/stellasora - commissions.csv
- Update scripts/csv-to-json.ts to look for the new filename
- Update scripts/validate-data.ts schema references
- Run npm run build:data to regenerate data/commissions.json
- Update .gitignore if needed (data/missions.json → data/commissions.json)

**Step 7 - Test files**: Update all test files:
- Rename test data IDs: "mission-001" → "commission-001" (or keep for backward compatibility)
- Update test descriptions: "should handle missions" → "should handle commissions"
- Update assertions and mock data
- Run npm test frequently to catch regressions
- Ensure all 156+ tests still pass

**Step 8 - Documentation**: Update all documentation files:
- CLAUDE.md: Search and replace mission → commission in appropriate contexts
- README.md: Update terminology
- _docs/*.md files: Update ExecPlans, design docs, algorithm explanations
- Update inline code comments that mention "mission"
- Be careful not to change historical commit messages or Git history

**Step 9 - Analytics**: Update src/lib/analytics.ts:
- Rename event tracking functions if they reference missions
- Update event names sent to analytics if applicable
- Consider backward compatibility for historical analytics data

**Step 10 - Final validation**:
- Run npm run type-check → should pass with 0 errors
- Run npm test → should pass all tests
- Run npm run build:data → should successfully generate commissions.json
- Run npm run build → should build successfully
- Start dev server and test all workflows end-to-end
- Test in all four languages (ja, zh-Hans, zh-Hant, en)
- Verify localStorage migration works for existing users
- Check performance (no regressions)


## Concrete Steps

### Phase 1 Execution

Working directory: `/Users/ghensk/Developer/ss-assist`

1. Edit translation file (ALREADY COMPLETED):
   ```
   # Open i18n/locales/en.json and replace mission → commission
   # See the Progress section for confirmation
   ```

2. Test in dev server:
   ```bash
   npm run dev
   ```
   Expected: Dev server starts on http://localhost:5173
   Navigate to the app, click language selector, choose "English"
   Verify all pages show "commission" terminology

3. Type check:
   ```bash
   npm run type-check
   ```
   Expected output:
   ```
   vite v5.x.x building for production...
   ✓ x modules transformed.
   [No TypeScript errors]
   ```

4. Commit Phase 1:
   ```bash
   git add i18n/locales/en.json
   git commit -m "fix: update English terminology from mission to commission (UI only)"
   ```

### Phase 2 Execution

Phase 2 will be executed step-by-step following the Plan of Work sequence. Each step should be followed by running type-check and tests to catch issues early.

Example workflow for Step 1 (Types):
```bash
# 1. Edit src/types/index.ts manually or with find-replace
# 2. Run type check to see what broke
npm run type-check
# 3. Fix import errors in files that use these types
# 4. Repeat until type-check passes
# 5. Run tests
npm test
# 6. Commit when stable
git add src/types/index.ts [other files]
git commit -m "refactor: rename Mission types to Commission"
```

This incremental commit pattern should be repeated for each step in Phase 2.


## Validation and Acceptance

### Phase 1 Acceptance Criteria

1. **UI terminology check**:
   - Start dev server: `npm run dev`
   - Switch language to English
   - Navigate through all pages: Home → Characters → Levels → Commissions → Results
   - Verify ALL visible text uses "commission" (not "mission")
   - Specifically check:
     - Navigation menu: "Commissions" label
     - Page titles: "Select Commissions"
     - Counters: "Selected: X/4 commissions"
     - Warnings: "Please select at least one commission"
     - Results section: "Commission Assignments", "Commission Value"
     - Status badges: "Commission Unlock"

2. **Type safety check**:
   ```bash
   npm run type-check
   ```
   Expected: ✓ No TypeScript errors (exit code 0)

3. **No behavioral changes**:
   - App functionality remains identical
   - No console errors in browser DevTools
   - All features work (character selection, level setting, commission selection, analysis)

### Phase 2 Acceptance Criteria

1. **Type checking passes**:
   ```bash
   npm run type-check
   ```
   Expected: ✓ No errors

2. **All tests pass**:
   ```bash
   npm test
   ```
   Expected: ✓ 156+ tests passing (no failures, no skips)

3. **Data generation works**:
   ```bash
   npm run build:data
   npm run validate:data
   ```
   Expected: Successfully generates data/commissions.json and validates schemas

4. **Production build succeeds**:
   ```bash
   npm run build
   ```
   Expected: Build completes, dist/ folder populated

5. **End-to-end functionality**:
   - Start dev server
   - Test full workflow in all 4 languages
   - Select 10+ characters
   - Set varying levels
   - Select 4 commissions
   - Analyze and verify:
     - Commission assignments displayed correctly
     - Training recommendations shown
     - No console errors
     - Performance is normal (<500ms for analysis)

6. **Code consistency check**:
   ```bash
   # Verify no "mission" references remain in user-facing code
   grep -r "mission" src/components src/pages | grep -v test | grep -v ".tsx.map"
   # Should return minimal results (only comments or historical references)

   # Verify consistent commission terminology in types
   grep -r "Mission" src/types/
   # Should return zero results
   ```

7. **Git history preserved**:
   ```bash
   # Check that renamed files preserved their history
   git log --follow src/pages/CommissionSelection.tsx
   # Should show history from when it was MissionSelection.tsx
   ```


## Idempotence and Recovery

### Phase 1 Idempotence

The Phase 1 changes (i18n/locales/en.json edits) are completely idempotent. The file can be edited and re-saved multiple times without causing issues. To recover from errors:
- Revert changes: `git checkout i18n/locales/en.json`
- Or manually edit the JSON file (it's human-readable)
- No migration or data corruption risks

### Phase 2 Idempotence

Phase 2 involves file renames and code refactoring. To ensure safety:

**Before starting Phase 2**:
```bash
# Create a feature branch
git checkout -b refactor/commission-terminology
# Ensure clean working tree
git status
# Run full test suite to establish baseline
npm test
```

**During Phase 2**:
- Commit after each logical step (types → data loading → algorithms → etc.)
- Keep commits small and focused
- Run tests after each commit
- If a step fails, use `git reset --hard HEAD` to revert to last good state

**Recovery procedures**:
- If type checking fails: Review the TypeScript errors, fix imports and type annotations
- If tests fail: Check test data, ensure mock objects use new terminology
- If build fails: Check Vite config, ensure import paths are correct
- If data generation fails: Verify CSV filename, check scripts/csv-to-json.ts paths

**Safe rollback**:
```bash
# Rollback to before Phase 2
git checkout develop
git branch -D refactor/commission-terminology

# Or rollback specific commits
git revert <commit-hash>
```

**localStorage migration consideration**: If changing the Zustand persist key (from 'ss-assist-storage' to a new key), implement migration logic to preserve existing user data:
```typescript
// Example migration in useAppStore.ts
const migrateStorage = (persistedState: any) => {
  if (persistedState.selectedMissionIds) {
    persistedState.selectedCommissionIds = persistedState.selectedMissionIds;
    delete persistedState.selectedMissionIds;
  }
  return persistedState;
};
```


## Artifacts and Notes

### Phase 1 Artifacts

Example diff for i18n/locales/en.json (excerpt):
```diff
   "app": {
-    "title": "Stella Sora Mission Assistant",
+    "title": "Stella Sora Commission Assistant",
     "subtitle": "Unofficial Fan Tool"
   },
   "nav": {
     "home": "Home",
     "roster": "Characters",
     "levels": "Levels",
-    "missions": "Missions",
+    "missions": "Commissions",
     "results": "Results"
   },
```

Note: Translation keys (left side like `"missions":`) are NOT changed, only the values (right side) are updated. This is intentional - keys are internal references and changing them would require updating all t() function calls throughout the codebase.

### Phase 2 Artifacts

Example type rename in src/types/index.ts:
```diff
 /**
- * Mission data structure
+ * Commission data structure
  */
-export interface Mission {
+export interface Commission {
   id: string;
   name: MultiLangString;
   requiredLevel: number;
   baseConditions: Condition[];
   bonusConditions?: Condition[];
-  durations: MissionDuration[];
+  durations: CommissionDuration[];
 }
```

Example function rename in src/lib/data.ts:
```diff
-export function getMissions(): Mission[] {
+export function getCommissions(): Commission[] {
-  if (!missions.length) {
+  if (!commissions.length) {
     throw new Error('Data not loaded. Call loadData() first.');
   }
-  return missions;
+  return commissions;
 }
```

Example store rename in src/store/useAppStore.ts:
```diff
 interface AppState {
   ownedCharacterIds: string[];
   characterLevels: Record<string, number>;
-  selectedMissionIds: string[];
+  selectedCommissionIds: string[];

   toggleCharacter: (id: string) => void;
   setCharacterLevel: (id: string, level: number) => void;
-  toggleMissionSelection: (id: string) => void;
+  toggleCommissionSelection: (id: string) => void;
-  clearSelectedMissions: () => void;
+  clearSelectedCommissions: () => void;
 }
```

### Testing Evidence

After Phase 1 completion, expected test output:
```bash
$ npm test
✓ src/lib/bitmask.test.ts (35 tests)
✓ src/lib/combos.test.ts (56 tests)
✓ src/lib/scoring.test.ts (28 tests)
✓ src/store/useAppStore.test.ts (37 tests)

Test Files  4 passed (4)
     Tests  156 passed (156)
```

After Phase 2 completion, same test counts expected with updated terminology in test descriptions.


## Interfaces and Dependencies

### No external dependencies required

This refactoring does not introduce new npm packages or external dependencies. All changes are internal renaming and refactoring.

### Key interfaces to maintain

The following function signatures must be preserved (with renamed types):

**src/lib/data.ts**:
```typescript
export function getCommissions(): Commission[]
export function getCharacters(): Character[]
export function getTags(): TagsData
export function loadData(): Promise<void>
export function isDataLoaded(): boolean
```

**src/lib/combos.ts**:
```typescript
export function findCombinations(
  characters: Character[],
  commission: Commission,
  levels: Record<string, number>
): { ready: Combo[]; blocked: Combo[] }

export function findMultiCommissionAssignments(
  characters: Character[],
  commissions: Commission[],
  levels: Record<string, number>,
  strategy: AssignmentStrategy
): MultiCommissionAssignmentResult
```

**src/lib/scoring.ts**:
```typescript
export function calculateTrainingPriority(
  characters: Character[],
  commissions: Commission[],
  currentLevels: Record<string, number>,
  ownedCharacterIds: string[],
  strategy: AssignmentStrategy
): TrainingRecommendationNew[]
```

**src/store/useAppStore.ts**:
```typescript
interface AppState {
  ownedCharacterIds: string[];
  characterLevels: Record<string, number>;
  selectedCommissionIds: string[];  // Renamed from selectedMissionIds

  toggleCharacter: (id: string) => void;
  setCharacterLevel: (id: string, level: number) => void;
  toggleCommissionSelection: (id: string) => void;  // Renamed
  clearSelectedCommissions: () => void;  // Renamed
  resetRoster: () => void;
}
```

### Type hierarchy

After Phase 2, the type hierarchy should be:
```
Commission (main data structure)
  ├─ CommissionDuration (duration options with rewards)
  ├─ Condition (base/bonus requirements)
  └─ Reward (items and amounts)

Combo (character combination result)
  └─ Character[] (team members)

CommissionAssignment (team assigned to commission)
  ├─ commission: Commission
  ├─ team: Combo | null
  └─ status: 'assigned' | 'unassigned'

MultiCommissionAssignmentResult (analysis output)
  ├─ assignments: CommissionAssignment[]
  └─ stats: { totalCommissionValue, commissionsAssigned, ... }

TrainingRecommendationNew (training guidance)
  ├─ characterId: string
  ├─ targetLevel: number
  └─ impact: { baseConditionsUnlocked, bonusConditionsAdded, affectedCommissions }
```

All type definitions reside in src/types/index.ts. Algorithm libraries (src/lib/) import from types. Components import from both types and lib.


## Migration Considerations for Existing Users

### localStorage compatibility

The Zustand store persists user data (owned characters, levels, selected commissions) to browser localStorage under the key `'ss-assist-storage'`.

When renaming store properties (selectedMissionIds → selectedCommissionIds), existing users' localStorage data will contain the old property name. This requires migration logic:

**Option A - Automatic migration** (recommended):
```typescript
// In src/store/useAppStore.ts
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({ /* state and actions */ }),
    {
      name: 'ss-assist-storage',
      version: 1,  // Increment version
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrate from version 0 to version 1
          if (persistedState.selectedMissionIds) {
            persistedState.selectedCommissionIds = persistedState.selectedMissionIds;
            delete persistedState.selectedMissionIds;
          }
        }
        return persistedState;
      },
    }
  )
);
```

**Option B - Fresh start**:
Change the localStorage key from `'ss-assist-storage'` to `'ss-assist-storage-v2'`. This forces all users to start fresh (lose their selections). Simpler but worse UX.

**Recommendation**: Implement Option A with automatic migration to preserve user data.

### CSV file coordination

The CSV file `data-sources/stellasora - missions.csv` is the source of truth for commission data. Renaming it requires coordination:

1. **Check if file is actively edited by others**: Use `git log --follow "data-sources/stellasora - missions.csv"` to see recent activity
2. **Coordinate with data maintainers**: If others edit the CSV, notify them before renaming
3. **Use git mv for history preservation**: `git mv "data-sources/stellasora - missions.csv" "data-sources/stellasora - commissions.csv"`
4. **Update build scripts**: Ensure scripts/csv-to-json.ts references the new filename
5. **Update GitHub Actions**: Check .github/workflows/pages.yml for hardcoded paths

**Safe approach**: Rename the file in the same commit that updates all scripts referencing it, so the codebase is never in an inconsistent state.

### Analytics event names

If the app sends analytics events with names like "mission_selected" or "mission_analyzed", renaming them will break historical analytics dashboards.

**Options**:
1. **Keep old event names**: Leave analytics unchanged for continuity
2. **Send both old and new names**: Dual-track during transition period
3. **Rename and accept broken history**: Start fresh with new event names

**Recommendation**: Review src/lib/analytics.ts and decide based on whether analytics are actively used. If analytics are just placeholders, rename freely. If they're feeding production dashboards, keep old names or dual-track.


## Notes on Scope and Terminology Consistency

### What NOT to rename

Some references to "mission" may be intentionally kept:
- **Git commit history**: Never rewrite existing commit messages
- **Git branch names**: Historical branches keep their names
- **External URLs**: Links to game wikis or official sites use their terminology
- **Quoted game text**: If documenting official Japanese text, keep 依頼 → "commission (依頼, mission in some contexts)"

### Japanese terminology note

The Japanese term 依頼 (irai) can translate to "request", "commission", or "quest" depending on context. The official Stella Sora English localization uses "commission", so we follow that for consistency with the game.

### Code comment style

When updating inline comments, maintain technical clarity:
```typescript
// Good: "Find optimal character teams for each commission"
// Avoid: "Find optimal character teams for each commission (依頼)"
// Avoid: "Find optimal character teams for each mission/commission"
```

Keep comments concise and use the new terminology consistently.

### Documentation updates

When updating _docs/*.md files, check for:
- Algorithm explanations that reference "mission requirements"
- Architecture diagrams with "mission" labels
- ExecPlan titles and descriptions
- File path references (after file renames)
- Example code snippets

Use find-and-replace carefully - some historical context (like "this replaces the old mission-based algorithm") should remain for historical accuracy.
