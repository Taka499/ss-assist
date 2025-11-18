# Implementation Roadmap - Stella Sora Request Assistant

## Current Status

**✅ Completed:**
- Project structure scaffolded (Vite + React + TypeScript + Tailwind)
- Development environment configured
- GitHub Actions deployment workflow set up
- Directory structure in place
- Documentation framework (CLAUDE.md, design docs)

**📝 Status:** All source files exist but are empty (0 lines implemented)

---

## Implementation Phases

### Phase 1: Foundation & Data Layer (Priority: CRITICAL)

#### 1.1 TypeScript Type Definitions
**File:** `src/types/index.ts`

Define core types:
```typescript
- Category types (role, style, faction, element, rarity)
- TagDict interface
- Character interface (with multi-language name support)
- Condition interface (anyOf support, extensible to allOf/noneOf)
- Reward types (gold, item, exp)
- Commission interface (baseConditions, bonusConditions, rewards)
- LocalStorage data structures
```

**Dependencies:** None
**Estimated effort:** 2-3 hours

#### 1.2 Data Schema & Validation
**File:** `scripts/validate-data.ts`

Implement JSON schema validation:
- Schema definitions for tags.json, characters.json, commissions.json
- Multi-language field validation (ja, zh-Hans, zh-Hant)
- Required field checks
- Type validation

**Dependencies:** 1.1
**Estimated effort:** 2-3 hours

#### 1.3 Slug Generation Utility
**File:** `scripts/slug.ts`

Implement Japanese text to slug conversion:
- Unicode normalization (NFC)
- Romanization (アタッカー → attacker)
- Duplicate resolution (attacker, attacker-2, etc.)
- Special character handling

**Dependencies:** None
**Estimated effort:** 2-4 hours

#### 1.4 CSV to JSON Converter
**File:** `scripts/csv-to-json.ts`

Implement data pipeline:
- Parse `data/tags.src.json` → generate slugs → output `data/tags.json`
- Parse `data-sources/characters.csv` → normalize tags (Japanese→ID) → output `data/characters.json`
- Parse `data-sources/commissions.csv` → normalize conditions → output `data/commissions.json`
- Merge translations from `i18n/*.json`
- Error handling for missing/invalid references

**Dependencies:** 1.1, 1.3
**Estimated effort:** 4-6 hours

#### 1.5 Sample Data Creation
**Files:**
- `data/tags.src.json`
- `data-sources/characters.csv`
- `data-sources/commissions.csv`
- `i18n/tags.zh-Hans.json`
- `i18n/tags.zh-Hant.json`

Create minimal viable dataset:
- 5-6 tag categories with 3-5 tags each
- 10-15 sample characters (including コハク, ミネルバ from design doc)
- 4-6 sample commissions with varying conditions
- Chinese translations for tags

**Dependencies:** 1.4
**Estimated effort:** 3-4 hours

**Phase 1 Total:** ~15-20 hours

---

### Phase 2: Core Logic & Algorithms (Priority: CRITICAL)

#### 2.1 Bitmask System
**File:** `src/lib/bitmask.ts`

Implement efficient tag matching:
- Category-wise bit allocation
- Character tag to bitmask conversion
- Condition (anyOf) to bitmask conversion
- Combo mask merging (bitwise OR)
- Fast condition checking (bitwise AND)

**Dependencies:** Phase 1
**Estimated effort:** 3-4 hours

#### 2.2 Data Loading & Processing
**File:** `src/lib/data.ts`

Implement data layer:
- Load JSON files (tags, characters, commissions)
- Build bitmask lookup tables
- Character filtering utilities
- Tag resolution (ID ↔ localized label)

**Dependencies:** 1.1, 2.1
**Estimated effort:** 3-4 hours

#### 2.3 Combination Search Algorithm
**File:** `src/lib/combos.ts`

Implement core search logic:
- Generate combinations (C(N,1) + C(N,2) + C(N,3))
- Level requirement checking
- Base condition validation (受注条件)
- Bonus condition validation (追加報酬条件)
- Pruning optimization (interactsWith check)
- Result ranking

**Key functions:**
```typescript
- findCombos(commission, ownedChars, levels): Combo[]
- satisfies(conditions, comboMask): boolean
- interactsWith(commission, character): boolean
- forEachComboUpTo3(candidates, callback)
```

**Dependencies:** 2.1, 2.2
**Estimated effort:** 5-7 hours

#### 2.4 Training Priority Scoring
**File:** `src/lib/scoring.ts`

Implement character training recommendations:
- Calculate training impact score per character
- Weight factors:
  - w1: Number of commissions unlocked (base conditions)
  - w2: Number of bonus conditions achieved
  - w3: Level gap cost
  - w4: Tag rarity bonus
- Cross-commission analysis
- Ranking algorithm

**Dependencies:** 2.3
**Estimated effort:** 4-5 hours

**Phase 2 Total:** ~15-20 hours

---

### Phase 3: State Management (Priority: HIGH)

#### 3.1 Language Store
**File:** `src/store/useLanguageStore.ts`

Implement Zustand store:
- Current language state (ja, zh-Hans, zh-Hant)
- Browser language detection (navigator.language)
- localStorage persistence ("ss-lang")
- Translation helper function t(key, fallback)

**Dependencies:** Phase 1
**Estimated effort:** 2-3 hours

#### 3.2 App Store
**File:** `src/store/useAppStore.ts`

Implement main application state:
- Owned characters (string[])
- Character levels (Record<id, level>)
- Selected commissions (string[], max 4)
- localStorage sync:
  - "ss-owned-characters"
  - "ss-levels"
  - "ss-selected-commissions"
- State update actions

**Dependencies:** Phase 1, Phase 2
**Estimated effort:** 3-4 hours

**Phase 3 Total:** ~5-7 hours

---

### Phase 4: UI Components (Priority: HIGH)

#### 4.1 Basic UI Components

**4.1.1 TagPill** (`src/components/TagPill.tsx`)
- Display tag with category color coding
- Support highlight state
- Responsive sizing

**4.1.2 RewardChip** (`src/components/RewardChip.tsx`)
- Display reward (gold/item/exp)
- Icon + amount
- Localized labels

**4.1.3 CharacterAvatar** (`src/components/CharacterAvatar.tsx`)
- Character icon display
- Dimmed/bright states (owned/not owned, level met/not met)
- Level badge overlay (e.g., "Lv+10")

**Dependencies:** 3.1
**Estimated effort:** 3-4 hours

#### 4.2 Feature Components

**4.2.1 RosterSelector** (`src/components/RosterSelector.tsx`)
- Grid layout with character avatars
- Toggle ownership on click
- Multi-filter system (role, style, faction, element, rarity)
- Responsive grid (mobile/desktop)

**4.2.2 LevelEditor** (`src/components/LevelEditor.tsx`)
- List owned characters
- Level button group (1, 10, 20, 30, 40, 50, 60, 70, 80, 90)
- Radio button behavior
- Bulk level operations (optional)

**4.2.3 CommissionPicker** (`src/components/CommissionPicker.tsx`)
- Commission card list
- Display: name, required level, rewards, conditions
- Selection toggle (max 4)
- Counter display

**4.2.4 ComboCard** (`src/components/ComboCard.tsx`)
- Display 3-character combination
- Badges: ✅受注達成, ✅追加報酬達成
- Highlight contributing tags
- Show level deficiencies

**4.2.5 TrainHint** (`src/components/TrainHint.tsx`)
- Display minimum training path for one commission
- Format: "キャラX を Lv50 まで上げれば受注達成"

**4.2.6 TrainRanking** (`src/components/TrainRanking.tsx`)
- Cross-commission training priority list
- Score display
- Impact summary (commissions unlocked, bonuses achieved)

**Dependencies:** 3.2, 4.1
**Estimated effort:** 8-12 hours

#### 4.3 Layout Components

**4.3.1 AppLayout** (`src/components/AppLayout.tsx`)
- Header with logo, language selector, data update date
- Navigation/routing
- Footer
- Dark/light mode toggle (optional)

**Dependencies:** 3.1
**Estimated effort:** 2-3 hours

**Phase 4 Total:** ~13-19 hours

---

### Phase 5: Pages & Routing (Priority: HIGH)

#### 5.1 Page Components

**5.1.1 Home** (`src/pages/Home.tsx`)
- Welcome screen
- Quick start guide
- Navigation to roster management

**5.1.2 RosterManagement** (`src/pages/RosterManagement.tsx`)
- Integrate RosterSelector component
- Integrate LevelEditor component
- Progress indicator
- Navigation to commission selection

**5.1.3 CommissionSelection** (`src/pages/CommissionSelection.tsx`)
- Integrate CommissionPicker component
- Selected commission preview
- Navigation to results

**5.1.4 Results** (`src/pages/Results.tsx`)
- Tab/accordion per selected commission
- Display combinations (ComboCard)
- Display training hints (TrainHint)
- Display cross-commission ranking (TrainRanking)
- Export/share functionality (optional)

**Dependencies:** Phase 3, Phase 4
**Estimated effort:** 6-8 hours

#### 5.2 App Entry & Routing

**5.2.1 Main** (`src/main.tsx`)
- React 18 root setup
- Provider setup (if needed)

**5.2.2 App** (`src/App.tsx`)
- Basic routing (hash-based for GitHub Pages)
- Layout integration
- Data loading on mount

**Dependencies:** 5.1
**Estimated effort:** 2-3 hours

**Phase 5 Total:** ~8-11 hours

---

### Phase 6: Integration & Testing (Priority: MEDIUM)

#### 6.1 Unit Tests

**Test files to create:**
- `src/lib/bitmask.test.ts` - Bitmask operations
- `src/lib/combos.test.ts` - Combination generation and validation
- `src/lib/scoring.test.ts` - Scoring algorithm
- `scripts/slug.test.ts` - Slug generation

**Test scenarios:**
- Edge cases (empty data, single character, all conditions met)
- Performance tests (100+ characters)
- Multi-language tag resolution

**Dependencies:** Phase 2
**Estimated effort:** 6-8 hours

#### 6.2 End-to-End Validation

- Full user flow testing
- localStorage persistence verification
- Multi-language switching
- Data pipeline (CSV → JSON → UI)
- Responsive design testing (mobile, tablet, desktop)

**Dependencies:** Phase 5
**Estimated effort:** 4-6 hours

**Phase 6 Total:** ~10-14 hours

---

### Phase 7: Polish & Optimization (Priority: LOW)

#### 7.1 UI/UX Refinements
- Animations and transitions
- Loading states
- Error boundaries
- Accessibility improvements (ARIA labels, keyboard navigation)
- Dark/light theme refinement

**Estimated effort:** 6-8 hours

#### 7.2 Performance Optimization
- Memo heavy computations
- Virtual scrolling for large lists (react-window)
- Code splitting
- Asset optimization (WebP images)

**Estimated effort:** 4-6 hours

#### 7.3 Documentation
- User guide (in-app help)
- Contribution guide (CSV data format)
- API documentation (JSDoc comments)

**Estimated effort:** 3-4 hours

**Phase 7 Total:** ~13-18 hours

---

## Summary

### Total Estimated Effort
- **Phase 1 (Foundation):** 15-20 hours - CRITICAL
- **Phase 2 (Core Logic):** 15-20 hours - CRITICAL
- **Phase 3 (State):** 5-7 hours - HIGH
- **Phase 4 (Components):** 13-19 hours - HIGH
- **Phase 5 (Pages):** 8-11 hours - HIGH
- **Phase 6 (Testing):** 10-14 hours - MEDIUM
- **Phase 7 (Polish):** 13-18 hours - LOW

**Total:** 79-109 hours (~2-3 weeks for one developer)

### Critical Path (MVP)
For a minimal viable product, focus on:
1. Phase 1 (Foundation & Data)
2. Phase 2 (Core Logic)
3. Phase 3 (State Management)
4. Phase 4.1-4.2 (Essential Components)
5. Phase 5.1.2-5.1.4 (Core Pages)

**MVP Estimate:** 50-70 hours (~1.5-2 weeks)

---

## Recommended Implementation Order

### Week 1: Data Foundation + Core Logic
1. Types & schemas (Phase 1.1-1.2)
2. Slug generation (Phase 1.3)
3. CSV converter (Phase 1.4)
4. Sample data (Phase 1.5)
5. Bitmask system (Phase 2.1)
6. Data loading (Phase 2.2)
7. Combination search (Phase 2.3)

**Deliverable:** Working algorithm that can find combinations from sample data

### Week 2: State + Basic UI
1. Language store (Phase 3.1)
2. App store (Phase 3.2)
3. Basic components (Phase 4.1)
4. Feature components (Phase 4.2.1-4.2.4)
5. Layout (Phase 4.3)
6. Roster & Mission pages (Phase 5.1.2-5.1.3)

**Deliverable:** Users can select characters, set levels, and pick missions

### Week 3: Results + Polish
1. Scoring system (Phase 2.4)
2. Training components (Phase 4.2.5-4.2.6)
3. Results page (Phase 5.1.4)
4. App entry & routing (Phase 5.2)
5. Basic testing (Phase 6.1-6.2)
6. UI refinements (Phase 7.1)

**Deliverable:** Fully functional MVP ready for deployment

---

## Risk Factors

### Technical Risks
1. **Bitmask complexity** - May need fallback to simpler string matching if bit operations prove buggy
2. **Performance with large datasets** - Need to validate performance with 100+ characters
3. **Multi-language font loading** - CJK fonts can be large; may need subsetting

### Mitigation Strategies
1. Start with simpler implementation, optimize later
2. Add performance benchmarks early
3. Use system fonts as fallback, load web fonts progressively

---

## Next Steps

**Immediate Actions:**
1. ✅ Create this roadmap document
2. Start Phase 1.1: Define TypeScript types
3. Set up Vitest for testing framework
4. Create sample data structure (tags, characters, missions)

**Before Starting Development:**
- Review and approve this roadmap
- Clarify any ambiguous requirements from design docs
- Set up task tracking (GitHub Projects or Issues)
- Define success criteria for MVP

---

## Maintenance & Future Enhancements

### Post-MVP Features (from design docs)
- Commission duration and cooldown tracking
- Element affinity/compatibility system
- PWA offline support
- Share roster via compressed URL
- Advanced filtering (AND/OR/NOT tag logic)
- Cloudflare Workers API option
- English localization

### Data Maintenance
- Regular character/commission data updates
- Translation crowdsourcing workflow
- Asset management (character icons)
- Version control for game updates
