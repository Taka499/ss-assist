# Phase 4.3: Layout & Integration - AppLayout and Final Assembly

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` at the repository root.


## Purpose / Big Picture

After completing this ExecPlan, the Stella Sora Request Assistant will have a complete, production-ready layout with navigation, language switching, and cohesive visual design. Users will be able to access all features through an intuitive interface with a header (logo, navigation, language selector, data update date), main content area, and footer.

You can verify success by running `npm run dev` and navigating through the complete application: The header shows the app title and language selector. Navigation allows moving between Roster Management, Level Editor, Mission Selection, and Results pages. The layout is responsive across mobile, tablet, and desktop. All Phase 4.1 and 4.2 components are integrated into their respective pages. The dark mode toggle (optional) switches between light and dark themes. The footer displays credits and links.

The application will be fully functional end-to-end, with all state persisting to localStorage and full multi-language support throughout.


## Progress

- [x] Milestone 1: AppLayout Component
  - [x] Implement header with logo/title
  - [x] Add language selector dropdown/buttons
  - [x] Add navigation menu
  - [~] Display data update date (skipped - not critical for MVP)
  - [x] Implement responsive mobile menu (hamburger)
  - [x] Add footer with credits and links
  - [ ] Optional: Implement dark mode toggle (deferred - future enhancement)

- [x] Milestone 2: Page Components
  - [x] Create Home page with welcome message and quick start
  - [x] Create RosterManagement page (RosterSelector)
  - [x] Create LevelManagement page (LevelEditor - split from RosterManagement)
  - [x] Create MissionSelection page (MissionPicker)
  - [x] Create Results page with full combination analysis integration
  - [x] Integrate navigation between pages

- [x] Milestone 6: Results Page Full Integration (added 2025-11-09)
  - [x] (2025-11-09 14:45Z) Reconcile TrainingRecommendation type between lib/scoring.ts and types/index.ts
  - [x] (2025-11-09 14:50Z) Update TrainHint component to use reconciled types
  - [x] (2025-11-09 14:52Z) Update TrainRanking component to use reconciled types
  - [x] (2025-11-09 15:00Z) Integrate findCombinations() into Results page
  - [x] (2025-11-09 15:00Z) Integrate calculateTrainingPriority() into Results page
  - [x] (2025-11-09 15:05Z) Create transformation layer from Combination to Combo
  - [x] (2025-11-09 15:05Z) Wire up ComboCard for valid combinations
  - [x] (2025-11-09 15:05Z) Wire up TrainHint for unsatisfiable missions
  - [x] (2025-11-09 15:05Z) Wire up TrainRanking for cross-mission priorities
  - [x] (2025-11-09 15:10Z) Type-check and build verification

- [x] Milestone 3: App Entry & Routing
  - [x] Set up hash-based routing (GitHub Pages compatible)
  - [x] Implement route guards (e.g., LevelManagement checks for owned characters)
  - [x] Add loading state while data loads
  - [x] Handle data loading errors gracefully

- [x] Milestone 4: Final Polish
  - [~] Add smooth transitions between pages (basic transitions working)
  - [x] Implement scroll-to-top on navigation
  - [ ] Add keyboard shortcuts (optional - deferred)
  - [x] Optimize bundle size (173KB main bundle, 55KB gzipped)
  - [x] Add favicon and meta tags

- [x] Milestone 5: End-to-End Testing
  - [x] Test complete user workflow
  - [x] Verify all features work together
  - [~] Test on mobile devices (responsive design implemented, manual testing pending)
  - [~] Test in multiple browsers (Chrome tested, others pending)
  - [x] Verify build output
  - [ ] Test deployed version on GitHub Pages (deployment pending)


## Surprises & Discoveries

### Type System Conflicts (Discovered 2025-11-09, Resolved 2025-11-09)
The Results page integration revealed type mismatches between:
- `lib/scoring.ts::TrainingRecommendation` (impact: { baseConditionsUnlocked, bonusConditionsAdded, affectedMissions })
- `types/index.ts::TrainingRecommendation` (impact: { missionsUnlocked, bonusesAchieved })

Initially this prevented full integration. Resolution: Updated `types/index.ts` to match the implementation in `lib/scoring.ts`. This is the correct approach since the implementation was already complete and working. Components (TrainHint, TrainRanking) required minor updates to use the new field names.

Evidence: After type reconciliation, `npm run type-check` passed with zero errors, and production build succeeded at 183.65 KB (58.42 KB gzipped).

### Combination Type Mismatch (Discovered 2025-11-09)
The `lib/combos.ts::Combination` interface (characterIds array) differed from `types/index.ts::Combo` interface (characters array of Character objects). Created a transformation function `transformCombination()` in Results.tsx to map between these types. This adapter pattern kept both interfaces stable without breaking existing code.

Evidence: All 70 modules transformed successfully during build, ComboCard renders correctly with character data.

### Component Reuse Success
The Phase 4.1 and 4.2 components (TagPill, RewardChip, RosterSelector, LevelEditor, MissionPicker) integrated seamlessly into pages with zero modifications needed. The clear separation of concerns in component design paid off.

### User Experience Enhancement
Added "Clear Selection" button to MissionSelection page based on user feedback during testing - critical for recovering from test data states stored in localStorage.


## Decision Log

### Decision 1: Split Roster and Level Management Pages
**Date:** 2025-11-09
**Decision:** Create separate RosterManagement and LevelManagement pages instead of combining them.
**Rationale:** Clearer user flow, prevents overwhelming users with too many controls on one screen.
**Alternative Considered:** Single page with tabs - rejected for simplicity.

### Decision 2: Simplified Results Page for Phase 4.3
**Date:** 2025-11-09
**Decision:** Implement placeholder Results page without full combination analysis integration.
**Rationale:** Type conflicts between scoring library and component interfaces require careful reconciliation. Core workflow can be tested without this.
**Future Work:** Full integration of findCombinations() and calculateTrainingPriority() in future phase.

### Decision 3: Hash-based Routing over Library
**Date:** 2025-11-09
**Decision:** Implement custom hash-based routing instead of using React Router or similar library.
**Rationale:** Simple requirements (5 pages), no need for external dependency, GitHub Pages compatible.
**Trade-off:** Less features, but smaller bundle size and full control.

### Decision 4: Clear Selection Button Placement
**Date:** 2025-11-09
**Decision:** Place "Clear Selection" button in MissionSelection page header, only visible when missions are selected.
**Rationale:** User feedback indicated need to clear test data. Conditional rendering keeps UI clean.

### Decision 5: Type Reconciliation Strategy
**Date:** 2025-11-09
**Decision:** Update `types/index.ts` to match `lib/scoring.ts` implementation rather than creating adapters or changing the library.
**Rationale:** The implementation in `lib/scoring.ts` was complete, tested, and working. The `types/index.ts` version was a draft that hadn't been validated against the actual implementation. Updating the contract to match reality is cleaner than creating transformation layers.
**Alternative Considered:** Create adapter functions to map between the two - rejected as unnecessarily complex.
**Impact:** Required minor updates to TrainHint and TrainRanking components, but simplified long-term maintenance.

### Decision 6: Combination-to-Combo Transformation
**Date:** 2025-11-09
**Decision:** Create `transformCombination()` adapter in Results.tsx rather than modifying library interfaces.
**Rationale:** The library's `Combination` interface uses character IDs for efficiency in algorithms. The component's `Combo` interface uses full Character objects for display. Both designs are valid for their contexts. An adapter preserves both.
**Location:** Results.tsx lines 90-107
**Trade-off:** Small runtime cost for transformation, but maintains clean separation between algorithm and UI concerns.


## Outcomes & Retrospective

### What Went Well ✅
1. **Clean Component Architecture**: Phase 4.1/4.2 components integrated perfectly with zero changes
2. **Responsive Design**: Mobile-first approach with hamburger menu works smoothly
3. **Type Safety**: TypeScript caught errors early, all type checks passing
4. **Build Performance**: Production bundle under 500KB target (initial: 229KB → final: 240KB total, 62KB gzipped)
5. **User Flow**: Complete workflow from Home → Roster → Levels → Missions → Results functional
6. **Type Reconciliation**: Type system conflicts resolved in ~30 minutes with clear strategy
7. **Combination Analysis**: Integration of findCombinations() and calculateTrainingPriority() worked smoothly after type resolution
8. **Adapter Pattern**: Combination-to-Combo transformation successfully bridges library and component interfaces

### Challenges Encountered ⚠️
1. **Type Mismatches**: Scoring library and component types not aligned initially - resolved by updating types/index.ts to match implementation
2. **Test Data Issues**: User encountered issue with pre-existing localStorage data preventing mission selection - resolved with clear selection button
3. **Interface Divergence**: Combination vs Combo interfaces required transformation layer - resolved with adapter function
4. **Real-time Analysis**: Initial implementation ran analysis in useEffect, causing re-renders - resolved by gating on selectedMissionIds.length

### Lessons Learned 📚
1. **Early Type Alignment**: Should have validated type consistency between libraries and components in Phase 2. Would have caught the TrainingRecommendation mismatch earlier.
2. **Test Data Management**: Need better dev tools for clearing/resetting localStorage during development. Added clear selection button as interim solution.
3. **Incremental Integration**: Placeholder approach allowed shipping Phase 4.3 layout first, then integrating analysis logic separately. This unblocked progress while type issues were being debugged.
4. **Match Implementation**: When types diverge from implementation, update types to match reality rather than forcing implementation changes. The working code is the source of truth.
5. **Adapter Pattern Value**: Sometimes the best solution is a small transformation function rather than forcing unified interfaces when both designs are valid for their contexts.

### Remaining Work

**✅ COMPLETED (2025-11-09)** - All critical MVP work is now done. The Results page integration is complete with full combination analysis and training recommendations working.

**Optional Enhancements** (post-MVP, not blocking release):
- Dark mode toggle
- Data update date display in header
- Keyboard navigation shortcuts
- Comprehensive cross-browser testing (Firefox, Safari, Edge)
- Mobile device testing on physical devices (iOS Safari, Android Chrome)
- GitHub Pages deployment and verification

**Future Features** (beyond current scope, for later releases):
- Advanced page transitions and animations
- PWA offline support
- Share roster via compressed URL
- Export/import roster functionality
- Mission cooldown tracking
- Mission duration display
- Element affinity/compatibility system

### Summary

Phase 4.3 successfully delivers a **complete, production-ready MVP** with:
- Full-featured layout with responsive navigation (mobile hamburger menu, desktop horizontal nav)
- Multi-language support throughout (Japanese, Simplified Chinese, Traditional Chinese)
- Complete user workflow: Home → Roster Management → Level Setting → Mission Selection → Results
- **Working combination analysis** showing optimal 3-character teams for each mission
- **Working training recommendations** prioritizing which characters to level up
- All Phase 4.1 and 4.2 components successfully integrated
- Production build: 183.65 KB main bundle (58.42 KB gzipped), well under 500KB target
- All TypeScript type checks passing
- LocalStorage persistence for all user selections

**Actual time spent on Results integration**: Approximately 2.5 hours (better than 3-4 hour estimate).

The application is now **feature-complete for its core use case**: helping Stella Sora players find optimal character combinations for missions and providing data-driven training recommendations. All critical functionality is implemented and working. The optional enhancements can be added in future iterations without blocking deployment.


## Context and Orientation

You are completing the final UI layer for the Stella Sora Request Assistant. All component work is done; this phase focuses on layout, navigation, and final integration.

**Current State:**

Completed work:
- **Phase 1:** Data layer with type definitions and JSON loading
- **Phase 2:** Core algorithms for combination search and scoring
- **Phase 3:** Zustand stores with localStorage persistence
- **Phase 4.1:** Basic UI components (TagPill, RewardChip, CharacterAvatar)
- **Phase 4.2:** Feature components (RosterSelector, LevelEditor, MissionPicker, ComboCard, TrainHint, TrainRanking)

**What Phase 4.3 Adds:**

1. **AppLayout:** A wrapper component providing consistent header, navigation, and footer across all pages
2. **Page Components:** Full-page containers that compose feature components into coherent workflows
3. **Routing:** Hash-based navigation suitable for GitHub Pages static hosting
4. **Integration:** Connecting all pieces into a working application

**File Locations:**

- Layout: `src/components/AppLayout.tsx` (currently empty)
- Pages: `src/pages/*.tsx` (Home, RosterManagement, MissionSelection, Results - currently empty)
- App entry: `src/App.tsx` (basic structure exists, needs routing)
- Main: `src/main.tsx` (React root setup exists)

**Key Design Decisions:**

- Use hash-based routing (`#/roster`, `#/missions`, etc.) for GitHub Pages compatibility
- No external routing library needed (use simple state + hash change listener)
- Responsive design: Mobile-first with hamburger menu, expands to horizontal nav on desktop
- Language selector: Visible in header at all times
- Data loading: Show loading spinner until `loadData()` completes


## Plan of Work

### Milestone 1: AppLayout Component

The AppLayout provides the consistent structure for all pages: header with navigation and language selector, main content area, and footer.

**Implementation:**

Open `src/components/AppLayout.tsx`. The component accepts:
- `children`: React nodes to render in the main content area

The component will:
1. Render a header with:
   - App title/logo (left side)
   - Navigation menu (center) - Roster, Levels, Missions, Results
   - Language selector (right side)
   - Responsive: Collapse to hamburger menu on mobile
2. Render main content area with proper padding and max-width
3. Render footer with credits and GitHub link
4. Optional: Add dark mode toggle button

**Navigation Structure:**
- Home: Landing page with quick start guide
- Roster: Character selection (RosterSelector component)
- Levels: Level editor (LevelEditor component)
- Missions: Mission selection (MissionPicker component)
- Results: Combination results and training recommendations

**Responsive Behavior:**
- Desktop (≥768px): Horizontal nav in header
- Mobile (<768px): Hamburger menu that opens sidebar/dropdown

### Milestone 2: Page Components

Create full-page containers for each main feature area.

**Home Page** (`src/pages/Home.tsx`):
- Welcome message explaining the app's purpose
- Quick start instructions (numbered steps)
- Button to navigate to Roster Management
- Display sample screenshots or icons (optional)

**RosterManagement Page** (`src/pages/RosterManagement.tsx`):
- Page title
- RosterSelector component
- Continue button that navigates to Levels page
- Guidance text: "Select characters you own"

**LevelEditor Page** (rename from RosterManagement or create separate `src/pages/LevelManagement.tsx`):
- Page title
- LevelEditor component
- Back button to Roster, Continue button to Missions
- Guidance text: "Set character levels"

**MissionSelection Page** (`src/pages/MissionSelection.tsx`):
- Page title
- MissionPicker component
- Back button to Levels, Analyze button to Results
- Guidance text: "Choose up to 4 missions to analyze"
- Show warning if no missions selected

**Results Page** (`src/pages/Results.tsx`):
- Page title
- For each selected mission:
  - Mission name and requirements
  - List of valid combinations (ComboCard for each)
  - If no valid combinations: TrainHint showing how to unlock
- Overall training priority ranking (TrainRanking at bottom)
- Back button to Missions, Reset button to start over
- Loading state while calculating combinations

### Milestone 3: App Entry & Routing

Implement simple hash-based routing in `src/App.tsx`.

**Routing Logic:**
1. Listen to `window.location.hash`
2. Map hash to page components:
   - `#/` or `#/home` → Home
   - `#/roster` → RosterManagement
   - `#/levels` → LevelManagement
   - `#/missions` → MissionSelection
   - `#/results` → Results
3. Default route: Home
4. Use React state to track current page

**Data Loading:**
- Call `loadData()` in App component on mount
- Show loading spinner until data is ready
- Show error message if loading fails
- Don't render pages until data is loaded

**Navigation Helpers:**
- Create `navigate(path)` function that updates `window.location.hash`
- Pass navigation function to pages via context or direct calls

### Milestone 4: Final Polish

**Transitions:**
- Add fade-in animation when pages load
- Smooth scroll to top on navigation
- Loading spinners for async operations

**Optimization:**
- Check bundle size with `npm run build`
- Ensure no unnecessary re-renders (use React DevTools)
- Lazy load pages if needed (React.lazy + Suspense)

**Meta Tags:**
- Update `index.html` with proper title, description, favicon
- Add Open Graph tags for social sharing
- Ensure viewport meta tag for mobile

**Accessibility:**
- Add skip-to-content link
- Ensure proper heading hierarchy (h1 → h2 → h3)
- Add ARIA labels to navigation and interactive elements
- Test keyboard navigation (Tab, Enter, Escape)

### Milestone 5: End-to-End Testing

**Complete Workflow Test:**
1. Open app (should show Home page)
2. Navigate to Roster, select 3 characters
3. Navigate to Levels, set levels (e.g., Lv50, Lv30, Lv60)
4. Navigate to Missions, select 2 missions
5. Navigate to Results, verify:
   - Valid combinations show for possible missions
   - Training hints show for impossible missions
   - Training ranking shows overall priorities
6. Refresh page, verify all selections restored
7. Switch language, verify all text updates
8. Clear localStorage, verify app resets gracefully

**Cross-Browser Testing:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)
- Mobile browsers (iOS Safari, Android Chrome)

**Build Testing:**
1. Run `npm run build`
2. Run `npm run preview`
3. Test built version (should behave identically to dev)
4. Check console for errors or warnings


## Concrete Steps

### Step 1: Implement AppLayout

Edit `src/components/AppLayout.tsx`:

    import { useState } from 'react';
    import { useLanguageStore } from '../store/useLanguageStore';
    import type { Language } from '../types';

    interface AppLayoutProps {
      children: React.ReactNode;
      currentPage: string;
      onNavigate: (page: string) => void;
    }

    export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
      const { lang, setLanguage } = useLanguageStore();
      const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

      const pages = [
        { id: 'home', label: { ja: 'ホーム', 'zh-Hans': '首页', 'zh-Hant': '首頁' } },
        { id: 'roster', label: { ja: 'キャラ選択', 'zh-Hans': '选择角色', 'zh-Hant': '選擇角色' } },
        { id: 'levels', label: { ja: 'レベル設定', 'zh-Hans': '设置等级', 'zh-Hant': '設置等級' } },
        { id: 'missions', label: { ja: '依頼選択', 'zh-Hans': '选择委托', 'zh-Hant': '選擇委託' } },
        { id: 'results', label: { ja: '結果', 'zh-Hans': '结果', 'zh-Hant': '結果' } },
      ];

      const languages: { value: Language; label: string }[] = [
        { value: 'ja', label: '日本語' },
        { value: 'zh-Hans', label: '简体中文' },
        { value: 'zh-Hant', label: '繁體中文' },
      ];

      return (
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                {/* Logo/Title */}
                <button
                  onClick={() => onNavigate('home')}
                  className="text-xl font-bold text-blue-600 hover:text-blue-700"
                >
                  {lang === 'ja' ? 'ステラソラ依頼アシスト' :
                   lang === 'zh-Hans' ? 'Stella Sora 委托助手' : 'Stella Sora 委託助手'}
                </button>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => onNavigate(page.id)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === page.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page.label[lang] || page.label.ja}
                    </button>
                  ))}
                </nav>

                {/* Language Selector */}
                <div className="hidden md:flex items-center gap-2">
                  {languages.map((language) => (
                    <button
                      key={language.value}
                      onClick={() => setLanguage(language.value)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        lang === language.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-md hover:bg-gray-100"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Mobile Menu */}
              {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 py-2">
                  <nav className="flex flex-col gap-1">
                    {pages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => {
                          onNavigate(page.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium text-left ${
                          currentPage === page.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page.label[lang] || page.label.ja}
                      </button>
                    ))}
                  </nav>

                  <div className="flex gap-2 mt-3 px-4">
                    {languages.map((language) => (
                      <button
                        key={language.value}
                        onClick={() => setLanguage(language.value)}
                        className={`flex-1 px-3 py-1 rounded-md text-sm ${
                          lang === language.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {language.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-12">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-sm text-gray-600">
                <p>
                  {lang === 'ja' ? 'ステラソラ依頼アシスト' :
                   lang === 'zh-Hans' ? 'Stella Sora 委托助手' : 'Stella Sora 委託助手'}
                  {' | '}
                  <a
                    href="https://github.com/yourusername/ss-assist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    GitHub
                  </a>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {lang === 'ja' ? '非公式ファンツール' :
                   lang === 'zh-Hans' ? '非官方粉丝工具' : '非官方粉絲工具'}
                </p>
              </div>
            </div>
          </footer>
        </div>
      );
    }

### Step 2: Create Page Components

Create `src/pages/Home.tsx`:

    import { useLanguageStore } from '../store/useLanguageStore';

    interface HomeProps {
      onNavigate: (page: string) => void;
    }

    export function Home({ onNavigate }: HomeProps) {
      const lang = useLanguageStore((state) => state.lang);

      return (
        <div className="space-y-8 max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            {lang === 'ja' ? 'ステラソラ依頼アシスト' :
             lang === 'zh-Hans' ? 'Stella Sora 委托助手' : 'Stella Sora 委託助手'}
          </h1>

          <p className="text-lg text-gray-600">
            {lang === 'ja' ?
              '所持キャラクターから依頼の最適な組み合わせを見つけ、育成の優先度を提案します。' :
             lang === 'zh-Hans' ?
              '从您的角色中找到委托的最佳组合，并提供培养优先级建议。' :
              '從您的角色中找到委託的最佳組合，並提供培養優先級建議。'}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">
              {lang === 'ja' ? '使い方' : lang === 'zh-Hans' ? '使用方法' : '使用方法'}
            </h2>
            <ol className="space-y-2 text-gray-700">
              <li>
                <span className="font-bold text-blue-600">1.</span>{' '}
                {lang === 'ja' ? '所持キャラクターを選択' :
                 lang === 'zh-Hans' ? '选择您拥有的角色' : '選擇您擁有的角色'}
              </li>
              <li>
                <span className="font-bold text-blue-600">2.</span>{' '}
                {lang === 'ja' ? '各キャラクターのレベルを設定' :
                 lang === 'zh-Hans' ? '设置每个角色的等级' : '設置每個角色的等級'}
              </li>
              <li>
                <span className="font-bold text-blue-600">3.</span>{' '}
                {lang === 'ja' ? '分析したい依頼を最大4件選択' :
                 lang === 'zh-Hans' ? '选择最多4个要分析的委托' : '選擇最多4個要分析的委託'}
              </li>
              <li>
                <span className="font-bold text-blue-600">4.</span>{' '}
                {lang === 'ja' ? '最適な組み合わせと育成推奨を確認' :
                 lang === 'zh-Hans' ? '查看最佳组合和培养建议' : '查看最佳組合和培養建議'}
              </li>
            </ol>
          </div>

          <button
            onClick={() => onNavigate('roster')}
            className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            {lang === 'ja' ? '始める' : lang === 'zh-Hans' ? '开始' : '開始'}
          </button>
        </div>
      );
    }

Create `src/pages/RosterManagement.tsx`:

    import { useEffect } from 'react';
    import { loadData, isDataLoaded } from '../lib/data';
    import { useLanguageStore } from '../store/useLanguageStore';
    import { RosterSelector } from '../components/RosterSelector';

    interface RosterManagementProps {
      onNavigate: (page: string) => void;
    }

    export function RosterManagement({ onNavigate }: RosterManagementProps) {
      const lang = useLanguageStore((state) => state.lang);

      useEffect(() => {
        if (!isDataLoaded()) {
          loadData().catch(console.error);
        }
      }, []);

      if (!isDataLoaded()) {
        return (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="mt-4 text-gray-600">
              {lang === 'ja' ? '読み込み中...' : lang === 'zh-Hans' ? '加载中...' : '載入中...'}
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              {lang === 'ja' ? 'キャラクター選択' :
               lang === 'zh-Hans' ? '选择角色' : '選擇角色'}
            </h1>
            <button
              onClick={() => onNavigate('levels')}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {lang === 'ja' ? '次へ' : lang === 'zh-Hans' ? '下一步' : '下一步'}
            </button>
          </div>

          <RosterSelector />
        </div>
      );
    }

Create similar pages for Levels, MissionSelection, and Results following the same pattern.

### Step 3: Implement Routing in App.tsx

Edit `src/App.tsx`:

    import { useEffect, useState } from 'react';
    import { loadData, isDataLoaded } from './lib/data';
    import { AppLayout } from './components/AppLayout';
    import { Home } from './pages/Home';
    import { RosterManagement } from './pages/RosterManagement';
    // Import other pages...

    function App() {
      const [currentPage, setCurrentPage] = useState('home');
      const [isLoading, setIsLoading] = useState(true);

      // Load data on mount
      useEffect(() => {
        if (!isDataLoaded()) {
          loadData()
            .then(() => setIsLoading(false))
            .catch((error) => {
              console.error('Failed to load data:', error);
              setIsLoading(false);
            });
        } else {
          setIsLoading(false);
        }
      }, []);

      // Handle hash-based routing
      useEffect(() => {
        const handleHashChange = () => {
          const hash = window.location.hash.slice(1) || '/';
          const page = hash.replace('/', '') || 'home';
          setCurrentPage(page);
        };

        handleHashChange(); // Initial load
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
      }, []);

      const navigate = (page: string) => {
        window.location.hash = `#/${page}`;
        window.scrollTo(0, 0); // Scroll to top
      };

      if (isLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        );
      }

      const renderPage = () => {
        switch (currentPage) {
          case 'home':
            return <Home onNavigate={navigate} />;
          case 'roster':
            return <RosterManagement onNavigate={navigate} />;
          // Add other cases...
          default:
            return <Home onNavigate={navigate} />;
        }
      };

      return (
        <AppLayout currentPage={currentPage} onNavigate={navigate}>
          {renderPage()}
        </AppLayout>
      );
    }

    export default App;

### Step 4: Run and Verify

    npm run type-check
    npm run dev

Navigate through all pages, verify navigation works, test on mobile viewport.

### Step 5: Build and Deploy Test

    npm run build
    npm run preview

Test the production build locally before deploying to GitHub Pages.


## Validation and Acceptance

Phase 4.3 is complete when:

1. **AppLayout works correctly:**
   - Header displays on all pages
   - Navigation works (desktop and mobile)
   - Language selector changes language globally
   - Footer displays correctly

2. **All pages are functional:**
   - Home page displays welcome and instructions
   - Each page integrates its respective components
   - Navigation buttons work
   - Pages handle empty states gracefully

3. **Routing works correctly:**
   - Hash changes update page
   - Back/forward browser buttons work
   - Direct URLs work (e.g., `#/missions`)
   - Scroll resets on navigation

4. **Full workflow integration:**
   - User can complete entire flow without errors
   - State persists across navigation
   - Page refresh maintains state

5. **Responsive design:**
   - Works on mobile (320px width)
   - Works on tablet (768px)
   - Works on desktop (1024px+)

6. **Production build:**
   - `npm run build` succeeds
   - Preview works identically to dev
   - Bundle size is reasonable (<500KB)


## Idempotence and Recovery

All steps are idempotent. To reset:
- Clear localStorage: `localStorage.clear()`
- Rebuild: `npm run build`


## Artifacts and Notes

After completion, the app is production-ready for GitHub Pages deployment.


## Interfaces and Dependencies

**AppLayout Props:**
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}
```

**Page Props:**
```typescript
interface PageProps {
  onNavigate: (page: string) => void;
}
```

All dependencies from Phases 1-4.2 are complete and stable.
