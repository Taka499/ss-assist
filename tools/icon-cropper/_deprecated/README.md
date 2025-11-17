# Deprecated Files

This directory contains files from the old automated daemon workflow that have been deprecated in favor of the workspace-based GUI approach.

## Deprecation Date

2025-01-18

## Why Deprecated?

The icon-cropper tool has evolved from an automated hotkey-based daemon to a **workspace-centric GUI application**. The old workflow had several limitations:

1. **Single screenshot limitation** - Could only process one screenshot at a time
2. **OCR dependency** - Required OCR for page detection, which was slow and error-prone
3. **Global configuration** - Single `config.yaml` made it hard to manage multiple cropping projects
4. **No visual feedback** - Users couldn't see grid alignment before cropping

The new workspace-based approach solves all these issues:
- Multiple screenshots per workspace (for scrolling/paginated UIs)
- Manual visual overlay drawing (no OCR needed)
- Per-workspace configurations with validation
- Real-time visual feedback with interactive grid editing
- Batch cropping across multiple screenshots

## Deprecated Files

### `cropper.py`
**Purpose:** Background daemon with global hotkey (F9) for real-time game capture
**Replaced by:** `config_editor.py` (GUI with manual workflow)
**Dependencies removed:** `keyboard`, `pystray`

### `detector.py`
**Purpose:** OCR-based page type detection
**Replaced by:** Manual overlay drawing in `config_editor.py`
**Dependencies removed:** `easyocr`

### `gridcrop.py`
**Purpose:** Grid-based cropping with deduplication
**Replaced by:** `editor/cropper_api.py` (workspace-based batch cropping)
**Dependencies removed:** `imagehash`

## Files Still in Use

- ✅ `capture.py` - Still used by `config_editor.py` for the "📷 Capture" button
- ✅ `utils.py` - `load_config()` still used (though `show_notification()` was removed)

## Migration Guide

If you were using the old daemon workflow:

### Old Workflow
```bash
# 1. Start daemon
python cropper.py

# 2. Open game, press F9
# (auto-detects page, auto-crops)

# 3. Run annotator
python annotator.py temp/20250118_120000/
```

### New Workflow
```bash
# 1. Launch GUI
uv run python config_editor.py

# 2. Create/select workspace
# 3. Click "📷 Capture" (or "📂 Open Screenshot")
# 4. Click "🔲 Draw Grid Layout" and draw grid visually
# 5. Click "👁️ Preview Icons" to verify alignment
# 6. Click "✂️ Batch Crop All" to extract icons
# 7. Click "🏷️ Annotate Icons" to assign names
```

### Benefits of Migration
- **Visual feedback** - See grid alignment before cropping
- **Multiple screenshots** - Handle scrolling UIs easily
- **Reusable configs** - Save grid layouts per workspace
- **Batch processing** - Crop all screenshots at once
- **No OCR dependency** - Faster and more reliable

## Recovery

If you need these files for reference or temporary use:
1. They are preserved in this `_deprecated/` folder
2. The git history retains all versions
3. You can restore them if absolutely needed (but we recommend migrating to the new workflow)

## Related Documentation

- Current workflow: See main `README.md` (Workspace-Centric Workflow section)
- Architecture: See `CLAUDE.md` (Workspace Management Layer section)
- Migration details: See `_docs/execplan-*.md` files
