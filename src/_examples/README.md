# Test & Example Pages

This directory contains test pages created during development phases. These are **not part of the production application** but are preserved as reference and documentation.

## Files

### ComponentTest.tsx

**Phase:** 4.1 - Basic UI Components
**Purpose:** Test page for atomic UI components (TagPill, RewardChip, CharacterAvatar)
**Created:** Phase 4.1 implementation
**Status:** Reference only - superseded by FeatureTest.tsx

**What it demonstrates:**
- TagPill component with different categories and highlight states
- RewardChip component displaying various reward types (gold, item, exp)
- CharacterAvatar component in different states (dimmed, level deficit)
- Multi-language switching for basic components

**To run:** Change `src/App.tsx` to import and render `ComponentTest` instead of current routing.

### FeatureTest.tsx

**Phase:** 4.2 - Feature Components
**Purpose:** Integration test page for feature-level components
**Created:** Phase 4.2 implementation
**Status:** Reference only - superseded by Phase 4.3 routing implementation

**What it demonstrates:**
- RosterSelector: Character grid with multi-category filtering
- LevelEditor: Level selection interface for owned characters
- MissionPicker: Mission selection with 4-mission limit
- Complete workflow: select characters → set levels → pick missions
- State persistence via Zustand stores
- Multi-language support across all feature components

**To run:** Change `src/App.tsx` to import and render `FeatureTest` instead of current routing.

## Usage

These files are kept for:
1. **Reference** - Example implementations of testing patterns
2. **Documentation** - Demonstrating how components were tested during development
3. **Debugging** - Can be temporarily re-enabled if component issues arise
4. **Onboarding** - Help new developers understand component capabilities

## Related Documentation

- Phase 4.1 ExecPlan: `_docs/execplan-phase4.1-basic-components.md`
- Phase 4.2 ExecPlan: `_docs/execplan-phase4.2-feature-components.md`
- Implementation Roadmap: `_docs/IMPLEMENTATION_ROADMAP.md`
