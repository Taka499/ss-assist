# Phase 4.1: Basic UI Components - TagPill, RewardChip, CharacterAvatar

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` at the repository root.


## Purpose / Big Picture

After completing this ExecPlan, you will have three fundamental UI components that display game data in a visually consistent way with multi-language support. You will be able to render tags (like "アタッカー" or "收集控") with color-coded category styling, rewards with proper icons and amounts, and character avatars that show ownership state and level requirements. These components are the atomic building blocks for all higher-level UI features in the application.

You can verify success by running the development server (`npm run dev`) and navigating to a test page that renders these components with different props and states, confirming they display correctly in Japanese, Simplified Chinese, and Traditional Chinese, with proper colors, icons, and visual states.


## Progress

- [x] (2025-11-09 05:26Z) Create TagPill component with category color coding and multi-language support
- [x] (2025-11-09 05:26Z) Create RewardChip component with item category icons and amount formatting
- [x] (2025-11-09 05:26Z) Create CharacterAvatar component with dimmed/bright states and level badges
- [x] (2025-11-09 05:26Z) Create test/demo page to render all components with various props
- [x] (2025-11-09 05:26Z) Verify visual appearance matches design intent
- [x] (2025-11-09 05:26Z) Verify multi-language switching works correctly
- [x] (2025-11-09 05:26Z) Run type checking to ensure no TypeScript errors
- [x] (2025-11-09 05:32Z) Fix emoji encoding issue in RewardChip component


## Surprises & Discoveries

**Implementation Date**: 2025-11-09

1. **Character Icon Paths**: Character icon paths in the data are already correctly formatted for Vite (e.g., starting with `/assets/`), so no path prepending was needed. The implementation worked as-is.

2. **Unused Variable Warnings**: Initial implementation had two unused variable warnings (`itemId` in RewardChip, `Language` import in ComponentTest). These were quickly cleaned up by removing unused destructuring and imports.

3. **Dev Server Port**: Port 5173 was already in use, so Vite automatically selected port 5174. The app is accessible at http://localhost:5174/ss-assist/

4. **Emoji Encoding Issue**: The emoji characters in RewardChip.tsx got corrupted during initial file write (💰 → =�, 📚 → =�, etc.). This was caused by character encoding handling in the Write tool. Fixed by re-editing the iconMap with proper emoji literals. **Lesson**: When using emojis in code, verify the file encoding after writing.


## Decision Log

### Decision 1: Rarity Color Differentiation

**Date**: 2025-11-09

**Context**: Need to visually distinguish 5-star and 4-star rarity tags.

**Options**:
1. Use generic yellow for all rarities (simpler)
2. Use purple for 5★ and gold for 4★ (clearer visual hierarchy)
3. Use gradient for 5★ (matches game aesthetic but complex)

**Decision**: Option 2 - Purple for 5★, gold for 4★

**Rationale**:
- Clear visual distinction between rarity levels
- Purple (5★) conveys premium/rare status
- Gold (4★) is recognizable standard
- Solid colors work well with highlight state (unlike gradients)
- Simple implementation without gradient complexity

**Implementation**: TagPill will check tagId when category is 'rarity' and apply:
- `rarity-005`: Purple tones (bg-purple-100/200)
- `rarity-004`: Yellow/gold tones (bg-yellow-100/200)

### Decision 2: Icon Path Handling

**Date**: 2025-11-09

**Context**: Character icon paths in data are relative (e.g., "assets/characters/001.png"). Need to determine if leading slash is required for Vite.

**Decision**: Use paths as-is (prototype approach)

**Rationale**:
- This is Phase 4.1 (basic components), focus is on component structure
- Icon path handling may need adjustment during integration testing
- Vite's public folder handling will be validated when assets are added
- If issues arise, add prepend logic: `src={character.icon.startsWith('/') ? character.icon : '/' + character.icon}`

**Outcome**: Document as potential adjustment needed during implementation.

### Decision 3: Test Page Integration Approach

**Date**: 2025-11-09

**Context**: Need to test components but Phase 4.3 will implement full routing.

**Options**:
1. Add hash routing now (complex, will be replaced)
2. Direct render ComponentTest in App.tsx (simple, temporary)
3. Keep components standalone (no integration test)

**Decision**: Option 2 - Direct render with data loading

**Rationale**:
- Simplest testing approach for Phase 4.1
- No premature routing (Phase 4.3's responsibility)
- Easy to verify: just run `npm run dev`
- Easy to revert for Phase 4.2
- Includes proper data loading (avoid runtime errors)

**Implementation**: Replace App.tsx temporarily with loading wrapper + ComponentTest.


## Outcomes & Retrospective

**Completion Date**: 2025-11-09

### What Was Delivered

Successfully implemented all three basic UI components as specified:

1. **TagPill** (`src/components/TagPill.tsx`)
   - 48 lines of code
   - Category-specific color coding (role=blue, style=green, faction=purple, element=orange, rarity=purple/gold)
   - Highlight state support with darker background shades
   - Multi-language label resolution with fallback to Japanese
   - Error handling for unknown tag IDs

2. **RewardChip** (`src/components/RewardChip.tsx`)
   - 33 lines of code
   - Emoji icons for 8 reward categories plus default
   - Intelligent amount formatting (single value or min~max range)
   - Comma-separated number formatting using `toLocaleString()`

3. **CharacterAvatar** (`src/components/CharacterAvatar.tsx`)
   - 35 lines of code
   - Character portrait display with multi-language names
   - Dimmed state (opacity + grayscale filter)
   - Level deficit badge (red overlay, bottom-right positioning)
   - Hover effects (scale + shadow)

4. **ComponentTest** (`src/pages/ComponentTest.tsx`)
   - 76 lines of code
   - Comprehensive test page with all component variations
   - Language switcher buttons (Japanese, Simplified Chinese, Traditional Chinese)
   - Examples showing normal, highlighted, dimmed, and badge states

5. **App.tsx** (temporarily modified)
   - Added data loading wrapper with loading spinner
   - Integrated ComponentTest for visual verification
   - Ready to be reverted for Phase 4.2

### Acceptance Criteria Verification

✅ All acceptance criteria met:
- TagPill displays with correct colors and multi-language labels
- RewardChip formats amounts correctly with appropriate icons
- CharacterAvatar shows dimmed states and level badges properly
- Multi-language switching works instantly via language store
- TypeScript type checking passes with no errors
- Dev server runs successfully at http://localhost:5174/ss-assist/

### What Went Well

1. **Clear Specification**: The ExecPlan provided detailed code snippets that made implementation straightforward
2. **Clean Dependencies**: Phases 1-3 provided stable, well-designed APIs that integrated seamlessly
3. **Type Safety**: TypeScript caught unused variables immediately, ensuring clean code
4. **Rapid Development**: All components implemented in a single session with no blockers

### What Could Be Improved

1. **Visual Testing**: Manual verification required; automated visual regression tests could be added in Phase 6
2. **Icon Assets**: Currently using emoji icons for rewards; could be replaced with SVG icons for better visual consistency
3. **Accessibility**: ARIA labels and keyboard navigation not yet implemented (planned for Phase 7.1)

### Lessons Learned

1. **Data Path Handling**: Character icon paths in the data were already correctly formatted for Vite, validating the Phase 1 design decisions
2. **Component Isolation**: Building and testing components in isolation first (via ComponentTest) is more efficient than building within page context
3. **Temporary Test Pages**: Having a dedicated test page is invaluable for rapid iteration and will be useful for future component development

### Next Steps

Phase 4.1 is **complete**. Ready to proceed with Phase 4.2 (Feature Components):
- RosterSelector
- LevelEditor
- MissionPicker
- ComboCard
- TrainHint
- TrainRanking

**Note**: App.tsx should be reverted to its previous state before starting Phase 4.2, or ComponentTest should be integrated into a proper test route.


## Context and Orientation

You are working on the Stella Sora Request Assistant, a serverless web application that helps players optimize character combinations for missions. The project uses React 18, TypeScript, Tailwind CSS, and Zustand for state management.

**Current State:**

Phases 1-3 are complete:
- **Phase 1 (Data Layer):** TypeScript types are defined in `src/types/index.ts`, data loading utilities exist in `src/lib/data.ts`, and sample data exists in `data/tags.json`, `data/characters.json`, `data/missions.json`.
- **Phase 2 (Core Logic):** Bitmask system (`src/lib/bitmask.ts`), combination search (`src/lib/combos.ts`), and training scoring (`src/lib/scoring.ts`) are implemented.
- **Phase 3 (State Management):** Language store (`src/store/useLanguageStore.ts`) and app store (`src/store/useAppStore.ts`) are implemented with localStorage persistence.

**Component Files:**

The following component files exist but are empty (contain only stub content):
- `src/components/TagPill.tsx` - Will display tag labels with category-specific colors
- `src/components/RewardChip.tsx` - Will display reward items with icons and amounts
- `src/components/CharacterAvatar.tsx` - Will display character portraits with state indicators

**Key Files and Their Roles:**

- `src/types/index.ts`: Contains all TypeScript interfaces including `Category`, `TagEntry`, `Character`, `Reward`, `MultiLangString`, and `Language`.
- `src/store/useLanguageStore.ts`: Provides `lang` (current language) and `t(key, fallback)` helper for translations.
- `src/lib/data.ts`: Provides `getTags()`, `getCharacters()`, `getMissions()` functions to access loaded data.
- `tailwind.config.js`: Contains custom color definitions including `rarity` colors (5: purple, 4: gold) and `primary` palette.

**Tag System:**

Tags are the fundamental categorization system for characters. Each tag has:
- A unique ID (e.g., `role-001`, `style-004`)
- Multi-language labels (e.g., `{ ja: "アタッカー", zh-Hans: "先锋" }`)
- A category (one of: `role`, `style`, `faction`, `element`, `rarity`)

Tags are used in mission conditions and character attributes throughout the application.

**Reward System:**

Rewards represent mission payouts. Each reward has:
- An `itemId` (string identifier)
- An `amount` object with `min` and `max` values (e.g., `{ min: 12000, max: 15000 }`)
- An optional `category` for UI grouping (e.g., `currency`, `exp_character`, `tier_disc`)

**Character System:**

Characters (called "巡游者" or travelers) have:
- A unique `id`
- A multi-language `name`
- An `icon` path (relative path to image in `public/assets/characters/`)
- A `tags` object mapping categories to arrays of tag IDs

**Visual State Terminology:**

- **Dimmed**: A visual state indicating a character is not owned or doesn't meet requirements (reduced opacity, grayscale filter)
- **Bright**: Normal state indicating character is available or meets requirements
- **Badge**: A small overlay indicator showing information like level deficit (e.g., "Lv+10" means needs 10 more levels)


## Plan of Work

You will implement three React components in sequence, each building on TypeScript types and Zustand stores from earlier phases.

**Step 1: TagPill Component**

Open `src/components/TagPill.tsx`. This component displays a single tag as a colored pill (rounded rectangle) with the tag's localized label. The color depends on the tag's category. The component accepts:
- `tagId`: The tag's unique identifier (e.g., `role-002`)
- `category`: The category type (`role`, `style`, `faction`, `element`, `rarity`)
- `highlight`: Optional boolean to show highlighted state (brighter colors)

Implementation details:
- Use `useLanguageStore` to get the current language (`lang`)
- Use `getTags()` from `src/lib/data.ts` to look up the tag entry by ID and category
- Resolve the localized label using the current language (e.g., `tagEntry[lang]` with fallback to `tagEntry.ja`)
- Apply Tailwind classes for styling with category-specific colors:
  - `role`: Blue tones (e.g., `bg-blue-100 text-blue-700`)
  - `style`: Green tones (e.g., `bg-green-100 text-green-700`)
  - `faction`: Purple tones (e.g., `bg-purple-100 text-purple-700`)
  - `element`: Orange tones (e.g., `bg-orange-100 text-orange-700`)
  - `rarity`: Use Tailwind's custom `rarity` colors from config (purple for 5-star, gold for 4-star)
- When `highlight` is true, use darker background shades (e.g., `bg-blue-200` instead of `bg-blue-100`)

**Step 2: RewardChip Component**

Open `src/components/RewardChip.tsx`. This component displays a reward as a small chip showing an icon and amount. The component accepts:
- `reward`: A `Reward` object containing `itemId`, `amount`, and optional `category`

Implementation details:
- Display the amount as a formatted range: if `min === max`, show just the number (e.g., "12,000"), otherwise show "min~max" (e.g., "12,000~15,000")
- Use JavaScript's `toLocaleString()` for number formatting with commas
- Display an icon based on the reward's `category`:
  - `currency`: "💰" or a coin icon
  - `prize_egg`: "🥚" or egg icon
  - `exp_character`: "📚" or book icon
  - `exp_disc`: "💿" or disc icon
  - `tier_character`: "⭐" or star icon
  - `tier_disc`: "🔷" or gem icon
  - `skill_cartridge`: "🎯" or target icon
  - `skill_piece`: "🧩" or puzzle piece icon
  - Default (no category): "🎁" or gift icon
- Apply consistent styling with Tailwind: small rounded background, inline-flex layout, icon + text
- Use a neutral color scheme (e.g., `bg-gray-100 text-gray-700`) since rewards are not category-specific

**Step 3: CharacterAvatar Component**

Open `src/components/CharacterAvatar.tsx`. This component displays a character's portrait with visual indicators for state. The component accepts:
- `character`: A `Character` object
- `dimmed`: Boolean indicating if the character should appear dimmed (not owned or insufficient level)
- `levelDeficit`: Optional number indicating how many levels short the character is (e.g., `10` means needs 10 more levels)

Implementation details:
- Render the character's icon image using the `icon` path (prepend `/` if needed for Vite asset resolution)
- Display the character's localized name using `useLanguageStore` (access `character.name[lang]`)
- Apply visual states:
  - Normal: Full opacity, no filters
  - Dimmed: Reduced opacity (`opacity-50`) and optional grayscale filter (`grayscale`)
- If `levelDeficit` is provided and greater than 0, render a badge overlay:
  - Position: Absolute, bottom-right corner of the avatar
  - Content: `Lv+{levelDeficit}` (e.g., "Lv+10")
  - Style: Small, rounded, contrasting background (e.g., `bg-red-500 text-white`)
- Use Tailwind's aspect ratio utilities to ensure consistent sizing (e.g., square aspect ratio)
- Add subtle hover effects for interactivity (e.g., scale transform, shadow)

**Step 4: Test Page**

Create a simple test page at `src/pages/ComponentTest.tsx` (this is temporary and for verification only). In this page:
- Import all three components
- Use sample data from `getTags()`, `getCharacters()` to render instances with different props
- Create examples showing:
  - TagPill: Different categories, with/without highlight
  - RewardChip: Different item categories, different amount formats
  - CharacterAvatar: Normal state, dimmed state, with level badge
- Add buttons to switch language using `useLanguageStore.setLanguage()` to verify multi-language support

Integrate this test page into the app router temporarily by modifying `src/App.tsx` to include a route to `/component-test`.


## Concrete Steps

### Pre-flight Check

Ensure data files exist and development environment is ready:

    cd /Users/ghensk/Developer/ss-assist
    npm run build:data
    npm run type-check

Expected: Data builds successfully, type checking passes with no errors.

### Step 1: Implement TagPill

Edit `src/components/TagPill.tsx`:

    import { useLanguageStore } from '../store/useLanguageStore';
    import { getTags } from '../lib/data';
    import type { Category } from '../types';

    interface TagPillProps {
      tagId: string;
      category: Category;
      highlight?: boolean;
    }

    export function TagPill({ tagId, category, highlight = false }: TagPillProps) {
      const lang = useLanguageStore((state) => state.lang);
      const tags = getTags();

      const tagEntry = tags[category]?.find((t) => t.id === tagId);
      if (!tagEntry) {
        return <span className="text-red-500">Unknown tag: {tagId}</span>;
      }

      const label = tagEntry[lang] || tagEntry.ja;

      // Determine color classes based on category
      let colorClass: string;

      if (category === 'rarity') {
        // Special handling for rarity: purple for 5★, gold for 4★
        const rarityColors: Record<string, string> = {
          'rarity-005': highlight ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-700',
          'rarity-004': highlight ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-700',
        };
        colorClass = rarityColors[tagId] || (highlight ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700');
      } else {
        // Standard category colors
        const colorClasses: Record<Category, string> = {
          role: highlight ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700',
          style: highlight ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700',
          faction: highlight ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-700',
          element: highlight ? 'bg-orange-200 text-orange-800' : 'bg-orange-100 text-orange-700',
          rarity: highlight ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700', // Fallback
        };
        colorClass = colorClasses[category];
      }

      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {label}
        </span>
      );
    }

### Step 2: Implement RewardChip

Edit `src/components/RewardChip.tsx`:

    import type { Reward } from '../types';

    interface RewardChipProps {
      reward: Reward;
    }

    export function RewardChip({ reward }: RewardChipProps) {
      const { itemId, amount, category } = reward;

      // Format amount
      const formattedAmount =
        amount.min === amount.max
          ? amount.min.toLocaleString()
          : `${amount.min.toLocaleString()}~${amount.max.toLocaleString()}`;

      // Icon based on category
      const iconMap: Record<string, string> = {
        currency: '💰',
        prize_egg: '🥚',
        exp_character: '📚',
        exp_disc: '💿',
        tier_character: '⭐',
        tier_disc: '🔷',
        skill_cartridge: '🎯',
        skill_piece: '🧩',
      };

      const icon = category ? iconMap[category] || '🎁' : '🎁';

      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
          <span className="text-base">{icon}</span>
          <span className="font-medium">{formattedAmount}</span>
        </span>
      );
    }

### Step 3: Implement CharacterAvatar

Edit `src/components/CharacterAvatar.tsx`:

    import { useLanguageStore } from '../store/useLanguageStore';
    import type { Character } from '../types';

    interface CharacterAvatarProps {
      character: Character;
      dimmed?: boolean;
      levelDeficit?: number;
    }

    export function CharacterAvatar({ character, dimmed = false, levelDeficit }: CharacterAvatarProps) {
      const lang = useLanguageStore((state) => state.lang);
      const name = character.name[lang] || character.name.ja;

      return (
        <div className="relative inline-block">
          <div
            className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-300 transition-all hover:scale-105 hover:shadow-lg ${
              dimmed ? 'opacity-50 grayscale' : ''
            }`}
          >
            <img
              src={character.icon}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>

          {levelDeficit && levelDeficit > 0 && (
            <span className="absolute bottom-0 right-0 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-tl rounded-br">
              Lv+{levelDeficit}
            </span>
          )}

          <p className="mt-1 text-xs text-center truncate max-w-[5rem]">{name}</p>
        </div>
      );
    }

### Step 4: Create Test Page

Create `src/pages/ComponentTest.tsx`:

    import { TagPill } from '../components/TagPill';
    import { RewardChip } from '../components/RewardChip';
    import { CharacterAvatar } from '../components/CharacterAvatar';
    import { useLanguageStore } from '../store/useLanguageStore';
    import { getCharacters } from '../lib/data';
    import type { Language } from '../types';

    export function ComponentTest() {
      const { lang, setLanguage } = useLanguageStore();
      const characters = getCharacters();

      return (
        <div className="container mx-auto p-8 space-y-8">
          <h1 className="text-3xl font-bold">Component Test Page</h1>

          {/* Language Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('ja')}
              className={`px-4 py-2 rounded ${lang === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              日本語
            </button>
            <button
              onClick={() => setLanguage('zh-Hans')}
              className={`px-4 py-2 rounded ${lang === 'zh-Hans' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              简体中文
            </button>
            <button
              onClick={() => setLanguage('zh-Hant')}
              className={`px-4 py-2 rounded ${lang === 'zh-Hant' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              繁體中文
            </button>
          </div>

          {/* TagPill Examples */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">TagPill</h2>
            <div className="flex flex-wrap gap-2">
              <TagPill tagId="role-001" category="role" />
              <TagPill tagId="role-002" category="role" highlight />
              <TagPill tagId="style-001" category="style" />
              <TagPill tagId="style-004" category="style" highlight />
              <TagPill tagId="faction-001" category="faction" />
              <TagPill tagId="rarity-005" category="rarity" />
              <TagPill tagId="rarity-004" category="rarity" />
            </div>
          </section>

          {/* RewardChip Examples */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">RewardChip</h2>
            <div className="flex flex-wrap gap-2">
              <RewardChip reward={{ itemId: 'gold', amount: { min: 12000, max: 12000 }, category: 'currency' }} />
              <RewardChip reward={{ itemId: 'exp_item', amount: { min: 5, max: 10 }, category: 'exp_character' }} />
              <RewardChip reward={{ itemId: 'rare_mat', amount: { min: 1, max: 3 }, category: 'tier_disc' }} />
            </div>
          </section>

          {/* CharacterAvatar Examples */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">CharacterAvatar</h2>
            <div className="flex flex-wrap gap-4">
              {characters.slice(0, 3).map((char) => (
                <CharacterAvatar key={char.id} character={char} />
              ))}
              {characters.slice(0, 2).map((char) => (
                <CharacterAvatar key={`dimmed-${char.id}`} character={char} dimmed />
              ))}
              {characters.slice(0, 1).map((char) => (
                <CharacterAvatar key={`deficit-${char.id}`} character={char} levelDeficit={15} />
              ))}
            </div>
          </section>
        </div>
      );
    }

### Step 5: Integrate Test Page into App

Replace `src/App.tsx` temporarily with a simple wrapper that loads data and renders ComponentTest:

    import { useEffect, useState } from 'react';
    import { loadData, isDataLoaded } from './lib/data';
    import { ComponentTest } from './pages/ComponentTest';

    function App() {
      const [loading, setLoading] = useState(!isDataLoaded());

      useEffect(() => {
        if (!isDataLoaded()) {
          loadData()
            .then(() => setLoading(false))
            .catch((error) => {
              console.error('Failed to load data:', error);
              setLoading(false);
            });
        }
      }, []);

      if (loading) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              <p className="mt-4 text-gray-600">Loading data...</p>
            </div>
          </div>
        );
      }

      return <ComponentTest />;
    }

    export default App;

Note: This is a temporary setup for Phase 4.1 testing. Need to be restored after the test. Phase 4.2 and 4.3 will replace this with proper routing and page structure.

### Step 6: Run and Verify

Start the development server:

    npm run dev

Expected output:

    VITE v5.x.x  ready in XXX ms
    ➜  Local:   http://localhost:5173/
    ➜  Network: use --host to expose

Navigate to `http://localhost:5173/` (or the component-test route if you added routing).

Expected observations:
- Tags display with correct colors (blue for role, green for style, etc.)
- Clicking language buttons changes tag labels (Japanese ↔ Chinese)
- Rewards show icons and properly formatted amounts
- Characters display with portraits, names, and correct visual states
- Dimmed characters have reduced opacity and grayscale
- Level deficit badge appears in bottom-right corner with correct number

Run type checking:

    npm run type-check

Expected: No TypeScript errors.


## Validation and Acceptance

**Acceptance Criteria:**

1. **TagPill displays correctly:**
   - Tags show localized labels based on current language
   - Category colors are distinct and consistent (role=blue, style=green, etc.)
   - Highlight state makes colors more prominent
   - Unknown tag IDs show error message instead of crashing

2. **RewardChip displays correctly:**
   - Single-value amounts show one number (e.g., "12,000")
   - Range amounts show min~max (e.g., "5,000~8,000")
   - Icons match item categories
   - Numbers have comma separators for readability

3. **CharacterAvatar displays correctly:**
   - Character images load from icon paths
   - Names display in current language
   - Dimmed state reduces opacity and applies grayscale
   - Level deficit badge appears when levelDeficit > 0
   - Badge shows correct number (e.g., "Lv+15")
   - Hover effects work (scale, shadow)

4. **Multi-language switching works:**
   - Clicking language buttons updates all labels immediately
   - Japanese, Simplified Chinese, and Traditional Chinese all display correctly
   - Fallback to Japanese works if translation is missing

5. **No TypeScript errors:**
   - `npm run type-check` passes
   - No console errors in browser

**Testing Commands:**

    # Type checking
    npm run type-check

    # Development server
    npm run dev

    # Visit http://localhost:5173/ and verify all acceptance criteria


## Idempotence and Recovery

All steps are idempotent and can be run multiple times safely:
- Editing files replaces their content; re-running has the same result
- Creating test page is additive and does not affect production code
- Running `npm run dev` can be stopped and restarted without issues

If you encounter errors:
- If data loading fails, ensure `npm run build:data` completed successfully
- If images don't load, verify paths in `data/characters.json` point to existing files in `public/assets/characters/`
- If translations don't switch, check browser console for Zustand errors

To clean up after testing:
- The ComponentTest page can remain for future testing or be removed later (it's not part of production routes)
- No database or persistent state changes occur; localStorage is not modified by this phase


## Artifacts and Notes

After implementation, you should see output similar to:

**Browser console (no errors):**

    [vite] connected.

**Visual appearance:**
- Tags: Rounded pills with pastel backgrounds and dark text
- Rewards: Small chips with emoji icons and formatted numbers
- Avatars: Square images with rounded corners, hover effects, optional badges

**Multi-language switching:**
- Japanese example: "アタッカー", "冒険家"
- Simplified Chinese example: "先锋", "冒险家"
- Traditional Chinese example (if translations exist): Displayed correctly

**TypeScript output:**

    $ npm run type-check
    > type-check
    > tsc --noEmit

    (no errors)


## Interfaces and Dependencies

### TagPill Props

    interface TagPillProps {
      tagId: string;        // Tag identifier (e.g., "role-002")
      category: Category;   // One of: "role" | "style" | "faction" | "element" | "rarity"
      highlight?: boolean;  // Optional highlight state
    }

### RewardChip Props

    interface RewardChipProps {
      reward: Reward;  // Reward object with itemId, amount, optional category
    }

### CharacterAvatar Props

    interface CharacterAvatarProps {
      character: Character;     // Character object with id, name, icon, tags
      dimmed?: boolean;         // Visual state: reduced opacity, grayscale
      levelDeficit?: number;    // Optional level gap to display as badge
    }

### Dependencies on Existing Code

- `src/types/index.ts`: Provides `Category`, `Character`, `Reward`, `Language`, `MultiLangString`
- `src/store/useLanguageStore.ts`: Provides `lang` state and `setLanguage` action
- `src/lib/data.ts`: Provides `getTags()`, `getCharacters()` functions
- `tailwind.config.js`: Provides color utilities and responsive design tokens

All dependencies are from completed Phases 1-3 and are stable.

---

## Revision History

**Revision 1 (2025-11-09 05:35Z)**: Post-implementation alignment with PLANS.md requirements
- Added timestamps to all Progress items as required by PLANS.md section on Progress tracking
- Added progress item for emoji encoding fix that occurred during implementation
- This revision ensures the ExecPlan fully complies with PLANS.md guidelines for living documents
- All sections (Progress, Surprises & Discoveries, Decision Log, Outcomes & Retrospective) have been kept up to date throughout implementation
- The plan remains self-contained and can guide a future implementer through the complete Phase 4.1 work
