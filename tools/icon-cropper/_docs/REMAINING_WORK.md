# Icon Cropper Config Editor - Remaining Work

This document tracks remaining tasks for the icon-cropper configuration editor GUI tool.

**Current Status**: Core functionality complete (Milestones 1-5). Tool is production-ready for basic use.

## High Priority Tasks (Milestone 6)

### 1. Enhanced Grid Validation

**Current State**: Basic Pydantic validation exists in `editor/schema/__init__.py` (positive dimensions, reasonable ranges)

**Needed**:
- Validate all grid cells fit within image bounds (not just first cell) - requires image context
- Warning for grids that extend beyond visible area
- Validate crop padding doesn't exceed cell dimensions (already checked: ge=0)
- Runtime validation during overlay drawing/adjustment

**Implementation Location**:
- `editor/schema/__init__.py` - Add custom validators for cross-field checks
- `editor/workspace_manager.py` - Add image-aware validation methods

**Impact**: Prevents user from saving invalid configurations that would cause cropping failures

**Note**: Basic constraints (positive dimensions, spacing ≥ 0, crop_padding ≥ 0) already enforced by Pydantic

---

### 2. Comprehensive Test Suite

**Unit Tests Needed** (or expand existing):
- ✅ `test_coordinate_system.py`: Canvas ↔ image coordinate transformations (25 tests - DONE)
- ✅ `test_workspace_schema.py`: Pydantic validation for workspace.json (26 tests - DONE)
- ✅ `test_cropper_api.py`: Batch cropping, preview, statistics (10 tests - DONE)
- ✅ `test_preview_controller.py`: Icon extraction logic (24 tests - DONE)
- ⏳ `test_grid_editor.py`: State machine transitions, spinbox synchronization, mode switching
- ⏳ `test_ocr_editor.py`: State machine transitions, drag/resize operations
- ⏳ `test_grid_renderer.py`: Overlay rendering at various zoom levels
- ⏳ `test_resize_controller.py`: Handle detection, modifier key behavior, edge cases

**Integration Tests Needed**:
- Full workflow: Open image → Draw grid → Adjust → Preview → Save
- Load From Config workflow: Load → Adjust overlays → Save changes
- Error handling: Missing image, corrupted config, invalid input values

**Test Framework**: Use pytest (already in project dependencies)

**Location**: `tools/icon-cropper/tests/` directory

**Impact**: Ensures reliability and prevents regressions during future changes

---

### 3. Main Cropper Integration

**Current State**: `cropper.py` uses `config.yaml` but doesn't reference config editor

**Needed**:
- Add instructions in `cropper.py` console output: "To adjust grid configuration, run: python config_editor.py"
- Consider adding `--configure` flag to launch editor from main tool
- Update workflow documentation in README.md with config editor section
- Add link between tools so users understand when to use editor vs. main cropper

**Implementation Location**:
- `tools/icon-cropper/cropper.py` - add help text
- `tools/icon-cropper/README.md` - add config editor usage section

**Impact**: Improves discoverability and user experience for new users

---

## Technical Debt (Lower Priority)

### 4. Remove Debug Code

**Location**: `editor/preview_controller.py` lines 75-84

**Issue**: Saves debug images to disk during preview (`debug_icon_0_0.png`, etc.)

**Fix**: Remove debug save code or make conditional on `DEBUG` environment variable

**Effort**: 5 minutes

---

### 5. Preview Window Pagination

**Issue**: Large grids (>10×10, 100+ icons) may cause performance issues and excessive memory usage

**Fix Options**:
- Add pagination (show 20 icons per page with Next/Previous buttons)
- Add virtual scrolling (only render visible icons)
- Add warning when grid exceeds reasonable size (e.g., >100 icons)

**Implementation Location**: `editor/preview_window.py`

**Effort**: 2-3 hours

---

### 6. Extract DEFAULT_WORKSPACE Constant

**Issue**: "character_select" hardcoded as default workspace in multiple places (6+ locations)

**Fix**:
- Extract to constant: `DEFAULT_WORKSPACE = "character_select"`
- Use constant throughout codebase for easier modification
- Improves maintainability if default needs to change

**Implementation Locations**:
- `config_editor.py` (lines 75, 79, 215, 216, 1059)
- `create_default_workspaces.py` (lines 13-18)
- `annotator.py` (line 248)

**Effort**: 30 minutes

**Note**: Multi-workspace support already implemented via workspace dropdown + [+] button

---

### 7. Documentation Enhancements

**Needed**:
- Add config editor section to `README.md` with screenshots
- Document all keyboard shortcuts (Ctrl+O, Ctrl+G, Ctrl+L, Ctrl+P, Ctrl+S, Ctrl+Q)
- Document mouse interactions (click, drag, resize handles, modifier keys)
- Add troubleshooting section for common issues
- Add workflow diagram showing when to use config editor vs. main cropper

**Implementation Location**: `tools/icon-cropper/README.md`

**Effort**: 2-3 hours

---

## Summary by Effort

**Quick Wins (< 1 hour)**:
- Remove debug code (Task 4)
- Extract DEFAULT_WORKSPACE constant (Task 6)
- Add cropper.py integration text (Task 3)

**Medium Effort (1-4 hours)**:
- Enhanced grid validation (Task 1)
- Preview window pagination (Task 5, if needed)
- Documentation enhancements (Task 7)

**Large Effort (> 4 hours)**:
- Comprehensive test suite (Task 2)

---

## Recommended Priority Order

1. **Remove debug code** (Task 4) - Quick cleanup
2. **Extract DEFAULT_WORKSPACE constant** (Task 6) - Quick maintainability win
3. **Enhanced grid validation** (Task 1) - Prevent data corruption
4. **Main cropper integration** (Task 3) - Improve UX and discoverability
5. **Comprehensive tests** (Task 2) - Ensure reliability (85 tests done, UI tests remaining)
6. **Documentation enhancements** (Task 7) - Help users understand workflow
7. **Preview pagination** (Task 5) - Only if performance issues arise

---

*Last Updated: 2025-11-18*
