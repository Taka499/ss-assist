# workspace.json Schema

## Phase 1.5: Overlay-Based Architecture

### Current Schema (Per-Screenshot Overlays - DEPRECATED)

```json
{
  "workspace_name": "character_select",
  "created_at": "2025-11-15T03:48:02.006050",
  "selected_screenshot": "002.png",
  "screenshots": [
    {
      "filename": "001.png",
      "captured_at": "2025-11-15T03:48:02.164638",
      "resolution": [1922, 1112],
      "notes": "",
      "overlays": {
        "grid_1": {
          "id": "grid_1",
          "type": "grid",
          "name": "Grid 1",
          "config": { ... },
          "locked": false,
          "visible": true
        }
      }
    }
  ]
}
```

**Problem**: When 10 screenshots share the same grid, the overlay config is duplicated 10 times.

---

### New Schema (Workspace-Level Overlays)

```json
{
  "workspace_name": "character_select",
  "created_at": "2025-11-15T03:48:02.006050",
  "selected_screenshot": "002.png",
  "schema_version": 2,

  "overlays": {
    "grid_1": {
      "id": "grid_1",
      "type": "grid",
      "name": "Grid 1",
      "config": {
        "start_x": 100,
        "start_y": 200,
        "cell_width": 80,
        "cell_height": 80,
        "rows": 5,
        "cols": 4,
        "padding_x": 10,
        "padding_y": 10,
        "crop_padding_top": 0,
        "crop_padding_bottom": 0,
        "crop_padding_left": 0,
        "crop_padding_right": 0
      },
      "locked": false,
      "visible": true
    },
    "ocr_1": {
      "id": "ocr_1",
      "type": "ocr",
      "name": "OCR Region 1",
      "config": {
        "x": 500,
        "y": 50,
        "width": 300,
        "height": 40
      },
      "locked": false,
      "visible": true
    }
  },

  "screenshots": [
    {
      "filename": "001.png",
      "captured_at": "2025-11-15T03:48:02.164638",
      "resolution": [1922, 1112],
      "notes": "",
      "overlay_bindings": ["grid_1", "ocr_1"]
    },
    {
      "filename": "002.png",
      "captured_at": "2025-11-15T07:51:54.072422",
      "resolution": [1922, 1112],
      "notes": "",
      "overlay_bindings": ["grid_1", "ocr_1"]
    }
  ]
}
```

**Benefits:**
- Grid defined once, referenced by multiple screenshots
- Easy to update: change grid_1 → all screenshots updated
- Smaller file size for large workspace
- Clearer separation: overlays (configuration) vs bindings (application)

---

## Migration Strategy

### Automatic Migration on Load

When loading a workspace.json:

1. **Check schema_version field**:
   - Missing or `1`: Old schema (per-screenshot overlays)
   - `2`: New schema (workspace-level overlays)

2. **If old schema detected**:
   - Collect all unique overlays from all screenshots
   - Deduplicate by overlay ID
   - Move to workspace-level `overlays` dict
   - Replace per-screenshot `overlays` with `overlay_bindings` (list of IDs)
   - Set `schema_version: 2`
   - Save migrated workspace.json

3. **If new schema**: Load normally

### Deduplication Logic

```python
def migrate_overlays(old_workspace: dict) -> dict:
    """Migrate from per-screenshot to workspace-level overlays."""

    # Collect all overlays from all screenshots
    all_overlays = {}
    for screenshot in old_workspace["screenshots"]:
        screenshot_overlays = screenshot.get("overlays", {})
        for overlay_id, overlay_data in screenshot_overlays.items():
            # First occurrence wins (assumes overlays with same ID are identical)
            if overlay_id not in all_overlays:
                all_overlays[overlay_id] = overlay_data

        # Build binding list (all overlay IDs that were on this screenshot)
        screenshot["overlay_bindings"] = list(screenshot_overlays.keys())

        # Remove old overlays field
        del screenshot["overlays"]

    # Add workspace-level overlays
    old_workspace["overlays"] = all_overlays
    old_workspace["schema_version"] = 2

    return old_workspace
```

### Edge Cases

**Case 1: Same overlay ID, different configs across screenshots**
- **Detection**: Compare overlay configs when collecting
- **Resolution**: Rename duplicates with suffix (grid_1 → grid_1_copy_1)
- **User notification**: Log warning about renamed overlays

**Case 2: Empty workspace (no screenshots)**
- **Behavior**: Initialize with empty overlays dict and schema_version=2

**Case 3: Workspace created before overlay system**
- **Behavior**: Initialize with empty overlays, schema_version=2

---

## API Changes

### WorkspaceManager

**Old API (DEPRECATED)**:
```python
# Per-screenshot overlay storage
manager.save_overlays(workspace, screenshot, overlays_dict)
manager.load_overlays(workspace, screenshot) -> Dict[str, Overlay]
```

**New API**:
```python
# Workspace-level overlay storage
manager.save_workspace_overlays(workspace, overlays_dict)
manager.load_workspace_overlays(workspace) -> Dict[str, Overlay]

# Per-screenshot bindings
manager.save_screenshot_bindings(workspace, screenshot, overlay_ids: List[str])
manager.load_screenshot_bindings(workspace, screenshot) -> List[str]

# Convenience: Get overlays bound to a screenshot
manager.get_screenshot_overlays(workspace, screenshot) -> Dict[str, Overlay]
```

---

## UI Changes

### Overlay Binding Panel

Add checkboxes to bind/unbind overlays to screenshots:

```
┌─ Screenshots ───────────────────────┐
│ ● 001.png                           │
│ ○ 002.png                           │
│ ○ 003.png                           │
└─────────────────────────────────────┘

┌─ Apply Overlays To Current Screenshot ─┐
│ ☑ Grid 1                               │
│ ☑ OCR Region 1                         │
│ ☐ Grid 2                               │
└────────────────────────────────────────┘
```

**Behavior**:
- Checkboxes show which overlays are bound to selected screenshot
- Checking box: adds overlay to screenshot's binding list
- Unchecking box: removes overlay from binding list
- Overlays are workspace-level, bindings are per-screenshot

### Workflow

1. **Create overlay** (Draw Grid / Draw OCR):
   - Creates overlay at workspace level
   - Automatically binds to current screenshot
   - Overlay visible on current screenshot

2. **Apply overlay to other screenshots**:
   - Select different screenshot
   - Check overlay in binding panel
   - Overlay now visible on that screenshot too

3. **Edit overlay**:
   - Changes apply to all screenshots using that overlay
   - Instant update across all bindings

---

## Backward Compatibility

- **Reading old workspaces**: Automatic migration on load
- **Writing**: Always write schema_version=2
- **No manual migration needed**: Transparent to users

---

## Future Extensions

### Multi-Selection

```
┌─ Apply Overlays To Screenshots ────────┐
│ [Grid 1]                               │
│   ☑ 001.png                            │
│   ☑ 002.png                            │
│   ☐ 003.png                            │
│                                        │
│ [OCR Region 1]                         │
│   ☑ 001.png                            │
│   ☐ 002.png                            │
│   ☐ 003.png                            │
└────────────────────────────────────────┘
```

Allows bulk binding management (not in Phase 1.5).
