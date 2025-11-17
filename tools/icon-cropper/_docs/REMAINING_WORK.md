# Icon Cropper Config Editor - Remaining Work

This document tracks remaining tasks for the icon-cropper configuration editor GUI tool.

**Current Status**: Core functionality complete (Milestones 1-5). Tool is production-ready for basic use.

## High Priority Tasks (Milestone 6)

### 1. Comprehensive Grid Validation

**Current State**: Basic bounds checking exists in `config_serializer.py`

**Needed**:
- Validate all grid cells fit within image bounds (not just first cell)
- Check for reasonable spacing values (detect negative or excessive spacing)
- Prevent cell overlap due to negative spacing
- Validate crop padding doesn't exceed cell dimensions
- Warning for grids that extend beyond visible area
- Prevent saving configurations with zero or negative cell dimensions

**Implementation Location**: `editor/config_serializer.py` - enhance `validate_grid_config()`

**Impact**: Prevents user from saving invalid configurations that would cause cropping failures

---

### 2. Comprehensive Test Suite

**Unit Tests Needed**:
- `test_coordinate_system.py`: Canvas ↔ image coordinate transformations with zoom/pan/scroll
- `test_grid_editor.py`: State machine transitions, spinbox synchronization, mode switching
- `test_ocr_editor.py`: State machine transitions, drag/resize operations
- `test_config_serializer.py`: YAML round-trip, comment preservation, validation logic
- `test_grid_renderer.py`: Overlay rendering at various zoom levels
- `test_resize_controller.py`: Handle detection, modifier key behavior, edge cases

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

### 6. Corrupted YAML Recovery

**Issue**: No graceful handling if `ruamel.yaml` fails to parse corrupted config

**Fix**:
- Wrap YAML parsing in try/except in `config_serializer.py`
- Detect corruption and show user-friendly error dialog
- Offer to restore from backup (timestamped backups already exist)
- Offer to create fresh config from defaults

**Implementation Location**: `editor/config_serializer.py` - enhance `load()` method

**Effort**: 1-2 hours

---

### 7. Multi-Page Support in Load From Config

**Issue**: Currently hardcoded to `character_select` page in multiple places

**Fix**:
- Add page selector dropdown in UI (before or after Load From Config button)
- Update `load_from_config()` to accept page parameter
- Update `save_config()` to save to selected page
- Allow creating new page definitions

**Implementation Location**:
- `config_editor.py` - update `load_from_config()` and `save_config()`
- `editor/ui_builder.py` - add page selector widget

**Effort**: 3-4 hours

---

### 8. Documentation Enhancements

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
- Remove debug code
- Add cropper.py integration text

**Medium Effort (1-4 hours)**:
- Comprehensive validation
- Corrupted YAML recovery
- Multi-page support
- Documentation enhancements

**Large Effort (> 4 hours)**:
- Comprehensive test suite
- Preview window pagination (if needed)

---

## Recommended Priority Order

1. **Comprehensive validation** (prevent data corruption)
2. **Remove debug code** (clean up)
3. **Main cropper integration** (improve UX)
4. **Comprehensive tests** (ensure reliability)
5. **Documentation enhancements** (help users)
6. **Multi-page support** (feature enhancement)
7. **Corrupted YAML recovery** (edge case handling)
8. **Preview pagination** (only if performance issues arise)

---

*Last Updated: 2025-11-14*
