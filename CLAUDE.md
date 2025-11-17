# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in `_docs/PLANS.md`) from design to implementation.

## Project Overview

**ステラソラ依頼アシスト (Stella Sora Request Assistant)** is a serverless SPA that helps players optimize character combinations for missions in the Stella Sora game. The application runs entirely client-side with no backend, deployed to GitHub Pages.

**Live:** https://taka499.github.io/ss-assist/

### Tech Stack

- **Frontend**: Vite + React 18 + TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS
- **State**: Zustand with localStorage persistence
- **Testing**: Vitest with co-located test files
- **Deployment**: GitHub Pages via GitHub Actions
- **Routing**: Hash-based routing (no React Router)

### Key Architecture Patterns

**1. Data Pipeline (CSV → JSON → React)**

The data flow is: Human-editable CSV → Generated JSON (gitignored) → React components

```
data-sources/*.csv  (source of truth, committed)
  ↓ npm run build:data
data/*.json         (generated, gitignored)
  ↓ src/lib/data.ts (singleton loader)
React components    (via useAppStore + lib functions)
```

**Why JSON files are gitignored:**
- CSV files are owned by game designers, not developers
- Prevents merge conflicts when multiple people edit game data
- GitHub Actions regenerates JSON automatically during deployment
- Treats generated data like compiled code (similar to `dist/`)

**2. Bitmask System for O(1) Tag Matching**

The most sophisticated optimization in the codebase. Each tag category (role, style, faction, element, rarity) uses a 32-bit integer where each bit represents a tag. This enables O(1) tag matching via bitwise AND operations.

Example:
```typescript
// Character has: role-001 (bit 0) and role-003 (bit 2)
characterMask = 0b0101 = 5

// Mission needs: role-001 OR role-002
conditionMask = 0b0011 = 3

// Check satisfaction with bitwise AND
(characterMask & conditionMask) !== 0  // → true (satisfied)
```

This is critical for performance: with 20 characters, there are 1,140 possible 3-character combinations. With 50 characters: 19,600 combinations. Bitmask checking makes validation blazingly fast.

See `src/lib/bitmask.ts` for implementation details.

**3. Hybrid Validation (Fast Pruning + Accurate Counting)**

The combination search uses a two-phase approach:

1. **Phase 1 - Pruning (fast)**: Use bitmasks to eliminate characters irrelevant to the mission
2. **Phase 2 - Validation (accurate)**: Use count-based checking to handle conditions like "2 Attackers and 1 Balancer"

Bitmasks can't verify counts (just presence/absence), so count-based validation is needed for accuracy.

See `src/lib/combos.ts::findCombinations()` and `src/lib/bitmask.ts::satisfiesConditionWithCounts()`.

**4. Hash-Based Routing Without React Router**

Uses browser hash routing (`#/page`) instead of a router library:

```typescript
// App.tsx
useEffect(() => {
  const handleHashChange = () => {
    const hash = window.location.hash.slice(1) || '/';
    const page = hash.replace('/', '') || 'home';
    setCurrentPage(page);
  };

  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []);

const navigate = (page: string) => {
  window.location.hash = `#/${page}`;
};
```

**Why this approach:**
- GitHub Pages compatibility (no server routing)
- No router library overhead
- Works completely offline (all data preloaded)

**5. Training Priority Scoring**

Calculates which characters to train for maximum mission unlock value:

```
score = 3.0 × baseConditionsUnlocked
      + 2.0 × bonusConditionsAdded
      - 0.05 × levelGap
      + 1.0 × rarityBonus
```

The algorithm simulates training each character to each level milestone (10, 20, ..., 90) and measures impact by running `findCombinations()` before and after to count newly unlocked missions and bonuses.

See `src/lib/scoring.ts::calculateTrainingPriority()`.

## Project Structure

```
src/
├── lib/                    # Core algorithms (pure functions)
│   ├── data.ts            # Singleton loader, caches JSON, builds bitmask lookup
│   ├── bitmask.ts         # Bitwise tag matching (O(1)), count-based validation
│   ├── combos.ts          # Combination search: prune → generate → validate → rank
│   └── scoring.ts         # Training priority calculator
├── store/                  # Zustand state management
│   ├── useAppStore.ts     # User selections (owned chars, levels, missions)
│   └── useLanguageStore.ts # Language preference (ja/zh-Hans/zh-Hant)
├── components/             # Reusable UI components
├── pages/                  # Full-page views (hash route handlers)
│   ├── Home.tsx           # Entry point
│   ├── RosterManagement.tsx
│   ├── LevelManagement.tsx
│   ├── MissionSelection.tsx
│   └── Results.tsx        # Main analysis view
└── types/                  # TypeScript type definitions

data-sources/               # Human-editable sources (CSV)
data/                       # Generated JSON (gitignored)
i18n/                       # Translation files
scripts/                    # Data processing utilities
  ├── csv-to-json.ts       # Converts CSV → JSON with validation
  ├── validate-data.ts     # Schema validation (AJV)
  └── slug.ts              # Slug generation utilities

_docs/                      # Design documents
  ├── PLANS.md             # ExecPlan methodology
  └── execplan-*.md        # Phase-by-phase implementation plans
```

## Development Workflow

### Essential Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run preview          # Preview production build locally

# Data Management
npm run build:data       # Generate JSON from CSV sources
npm run validate:data    # Validate JSON schemas and cross-references

# Code Quality
npm run type-check       # TypeScript type checking (no emit)
npm run lint             # ESLint

# Testing
npm test                 # Run all tests with Vitest
npm test -- src/lib/bitmask.test.ts  # Run single test file
npm test -- --coverage   # Run with coverage report
```

### Data Management Workflow

**IMPORTANT:** Never edit `data/*.json` files directly. They are gitignored and auto-generated.

**To update game data:**

1. Edit human-readable sources:
   - `data-sources/stellasora - characters.csv`
   - `data-sources/stellasora - missions.csv`
   - `data/tags.src.json`
   - `i18n/*.json` (translations)

2. Regenerate JSON:
   ```bash
   npm run build:data
   npm run validate:data
   ```

3. Test the changes:
   ```bash
   npm run dev
   # Verify changes in browser
   ```

**The data pipeline runs automatically in GitHub Actions before deployment.**

### Testing Strategy

Tests are co-located with source files (e.g., `bitmask.ts` → `bitmask.test.ts`). Run specific tests:

```bash
npm test -- src/lib/bitmask.test.ts
npm test -- src/lib/combos.test.ts
npm test -- src/lib/scoring.test.ts
```

Test files use realistic game data and validate:
- Bitmask operations (tag matching, count validation)
- Combination search (pruning, ranking, level requirements)
- Training priority scoring (impact calculation, rarity bonus)
- State management (Zustand store mutations, localStorage)

## Deployment

The app deploys automatically to GitHub Pages when version tags are pushed.

### Release Process

```bash
# 1. Create version tag
npm version patch   # Bug fixes (0.2.0 → 0.2.1)
npm version minor   # New features (0.2.0 → 0.3.0)
npm version major   # Breaking changes (0.2.0 → 1.0.0)

# 2. Push to trigger deployment
npm run release     # Pushes commits and tags
```

### GitHub Actions Pipeline

The `.github/workflows/pages.yml` workflow automatically:
1. Installs dependencies (`npm ci`)
2. Generates data from CSV sources (`npm run build:data`)
3. Validates data schemas (`npm run validate:data`)
4. Builds the application (`npm run build`)
5. Deploys to GitHub Pages

**Manual deployment:** You can also trigger deployment from the GitHub Actions tab without creating a version tag.

## Commit Discipline

- **Git-flow workflow:** Use `develop` for development, `main` for production
- **Small, frequent commits:** Better than large, infrequent ones
- **Only commit affected files:** Keep other files untracked
- **No Claude Code attribution:** Never add AI attribution to commits

## ExecPlans

When implementing complex features or significant refactors, use an ExecPlan (as described in `_docs/PLANS.md`).

**ExecPlans are living documents** that must be kept up-to-date with:
- Progress (with timestamps)
- Surprises & Discoveries (with evidence)
- Decision Log (rationale for choices)
- Outcomes & Retrospective (lessons learned)

See existing ExecPlans in `_docs/execplan-*.md` for examples.

## Key Implementation Details

### Data Types

**Character:**
```typescript
{
  id: "char-001",
  name: { ja: "セイナ", "zh-Hans": "尘沙" },
  icon: "assets/characters/001.png",
  tags: {
    role: ["role-002"],
    style: ["style-002"],
    faction: ["faction-005"],
    element: ["element-004"],
    rarity: ["rarity-004"]
  }
}
```

**Mission:**
```typescript
{
  id: "mission-01",
  name: { ja: "ミッション名", "zh-Hans": "任务名" },
  requiredLevel: 20,
  baseConditions: [
    { category: "role", anyOf: ["role-001", "role-002"] }
  ],
  bonusConditions: [
    { category: "role", anyOf: ["role-002", "role-002", "role-001"] }
  ],
  durations: [
    {
      hours: 8,
      rewards: [{ itemId: "dorra", amount: { min: 13200, max: 13200 } }],
      bonusRewards: [{ itemId: "prize_egg", amount: { min: 1, max: 2 } }]
    }
  ]
}
```

### State Management Patterns

**Zustand store with localStorage persistence:**

```typescript
// src/store/useAppStore.ts
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ownedCharacterIds: [],
      characterLevels: {},
      selectedMissionIds: [],

      toggleCharacter: (id: string) =>
        set((state) => ({
          ownedCharacterIds: state.ownedCharacterIds.includes(id)
            ? state.ownedCharacterIds.filter((cid) => cid !== id)
            : [...state.ownedCharacterIds, id],
        })),

      // ... other actions
    }),
    { name: 'ss-assist-storage' }
  )
);
```

Usage in components:
```typescript
const { ownedCharacterIds, toggleCharacter } = useAppStore();
```

### Multi-Language Support

The app supports three languages:
- Japanese (`ja`)
- Simplified Chinese (`zh-Hans`)
- Traditional Chinese (`zh-Hant`)

**Translation structure:**
```typescript
// In data/tags.json
{
  "role": [
    {
      "id": "role-001",
      "ja": "バランサー",
      "zh-Hans": "均衡",
      "zh-Hant": "均衡"
    }
  ]
}
```

**Usage in components:**
```typescript
const lang = useLanguageStore((state) => state.lang);
const displayName = character.name[lang] || character.name.ja;
```

## Performance Characteristics

- **Combination search**: O(n³) for generating combinations, but bitmask pruning typically reduces n by 50-70%
- **Bitmask matching**: O(1) per check
- **Count validation**: O(n·m) where n = combo size, m = conditions
- **Training priority**: O(characters × levels × missions × combinations)

**Typical performance:**
- 20 characters, 36 missions: Results in <100ms
- 50 characters, 36 missions: Results in <500ms

## Troubleshooting

**Problem: Data not showing up after CSV changes**
```bash
npm run build:data
npm run validate:data
# Restart dev server
npm run dev
```

**Problem: Type errors after data structure changes**
- Update `src/types/index.ts` to match new data structure
- Run `npm run type-check` to verify

**Problem: GitHub Pages deployment fails**
- Check GitHub Actions logs: `gh run list`
- Ensure GitHub Pages is enabled in repo settings
- Verify workflow has write permissions

**Problem: localStorage state causing issues**
- Clear browser localStorage: `localStorage.clear()` in console
- Or use browser DevTools → Application → Local Storage → Clear

## References

- **Live app**: https://taka499.github.io/ss-assist/
- **Repository**: https://github.com/Taka499/ss-assist
- **PLANS.md**: See `_docs/PLANS.md` for ExecPlan methodology
- **Existing ExecPlans**: See `_docs/execplan-*.md` for implementation examples