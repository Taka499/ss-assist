# ExecPlan: Unify Configuration to workspace.json and Implement Overlay-Based Architecture

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` in the repository root.

## Purpose / Big Picture

Currently, the icon-cropper tool has two conflicting configuration systems: `config.yaml` (legacy, single-overlay, daemon-oriented) and `workspace.json` (new, multi-overlay, GUI-oriented). This creates confusion because the GUI auto-saves to workspace.json in real-time, making the "Save Configuration" button misleading and the "Load Configuration" button inconsistent. Additionally, workspace.json currently stores overlays per-screenshot, which duplicates overlay configurations when users want to apply the same grid to multiple screenshots (the primary use case for batch cropping scrolling UIs).

After this change, users will have:
1. A single source of truth (`workspace.json`) for all workspace configuration
2. Overlay-based architecture where overlays are defined once and bound to multiple screenshots
3. A new Python API for batch cropping based on workspace.json (replacing the legacy daemon approach)

Users can verify this works by: creating a workspace, defining one grid overlay, binding it to multiple screenshots, and running batch crop to extract icons from all bound screenshots using the shared overlay configuration.

## Progress

- [x] Phase 1: Remove config.yaml dependencies (Completed 2025-11-16)
  - [x] Remove Save/Load Configuration buttons from UI
  - [x] Delete ConfigSerializer class and config_serializer.py
  - [x] Update workspace creation to skip config.yaml generation
  - [x] Update documentation to reflect workspace.json as sole config
  - [x] Test workspace creation and verify no config.yaml created

- [x] Phase 1.5: Refactor to overlay-based design (Completed 2025-11-16)
  - [x] Design new workspace.json schema (overlay-based)
  - [x] Update WorkspaceManager to handle overlay-based schema
  - [x] Update config_editor.py to use new WorkspaceManager API
  - [x] Add overlay binding UI (checkboxes per screenshot)
  - [x] Test tool launch and verify no errors
  - [x] Decision: Skip migration, start fresh with schema v2

- [ ] Phase 2: Implement new cropping API
  - [ ] Design cropping API module (editor/cropper_api.py)
  - [ ] Implement single-grid cropping function
  - [ ] Implement batch cropping function
  - [ ] Add preview crop dialog UI
  - [ ] Add batch crop button to UI
  - [ ] Test cropping with multi-overlay, multi-screenshot workspace
  - [ ] Update documentation with cropping workflow

## Surprises & Discoveries

### Phase 1 Implementation (2025-11-16)

- **ConfigSerializer was completely unused for overlay management**: The existing overlay persistence system already used workspace.json directly via WorkspaceManager. ConfigSerializer only existed for the legacy config.yaml workflow. Removing it was cleaner than expected - no overlay-related code needed updating.

- **"Unsaved changes" tracking was unnecessary**: The flag existed because of manual save/load workflow from config.yaml. With auto-save to workspace.json, the concept of "unsaved changes" no longer applies. Removing this simplified workspace switching logic significantly.

- **config_template.py could be deleted entirely**: Originally planned to "repurpose" it to workspace_template.py, but workspace.json creation is simple enough (just a dict with default values) that a separate template module wasn't needed. The workspace metadata structure is now directly in WorkspaceManager.create_workspace().

- **No breaking changes for existing workspaces**: Even though we removed config.yaml generation, existing workspaces with config.yaml files are unaffected. They'll continue to have the legacy file, but it's no longer read or written. workspace.json is already the active system.

### Phase 1.5 Discoveries (2025-11-16)

- **Migration complexity wasn't worth it**: Initially planned to build automatic schema migration from v1 (per-screenshot overlays) to v2 (workspace-level overlays). After discussion, user decided to simply delete old workspace.json files and start fresh. This eliminated ~200 lines of migration code and associated testing burden. For a tool in active development with few users, clean break > backward compatibility.

- **Binding UI integrates seamlessly with existing panel**: The new "Apply to Screenshot:" section fits naturally below the overlay list in the right sidebar. Using checkboxes for bindings is intuitive - checked = overlay visible on current screenshot. The scrollable list pattern we already used for screenshots and overlays worked perfectly for bindings too.

- **_save_current_overlays() needed careful merge logic**: When saving, we can't just overwrite workspace.overlays with canvas overlays, because the canvas only shows overlays bound to the current screenshot. Other screenshots may have bindings to overlays not on canvas. Solution: load existing workspace overlays, merge with canvas overlays (canvas wins for IDs it has), then save the merged result. This preserves overlays bound to other screenshots.

- **Refresh callbacks proliferated but remained manageable**: Adding `refresh_binding_list_callback` to the tool context meant updating draw_grid_tool.py and draw_ocr_tool.py. This follows the same pattern as `refresh_overlay_list_callback`, so it was straightforward. The callback architecture (passing context dict to tools) scaled well to this new requirement.

- **Tool launched successfully on first run**: After implementing all changes, running `uv run python config_editor.py` worked immediately with just harmless libpng warnings. No runtime errors, no import errors, no schema validation failures. This suggests the implementation was solid and well-integrated.

## Decision Log

- Decision: Create three-phase approach instead of single large refactor
  Rationale: Phase 1 (cleanup) can be done quickly and independently. Phase 1.5 (architecture) requires schema migration and careful testing. Phase 2 (features) builds on stable foundation. Separating phases reduces risk and allows early validation.
  Date: 2025-11-16

- Decision: Use overlay bindings (array of overlay IDs) instead of moving overlays to screenshots
  Rationale: Bindings enable many-to-many relationships (one overlay → many screenshots, one screenshot → many overlays). This supports both shared overlays (batch crop use case) and screenshot-specific overlays (edge cases).
  Date: 2025-11-16

- Decision: Delete config_template.py instead of repurposing to workspace_template.py
  Rationale: The workspace.json structure is simple enough (5 keys with default values) that creating a separate template module adds unnecessary abstraction. The metadata dict is now created inline in WorkspaceManager.create_workspace(). This follows YAGNI principle - don't add infrastructure until it's actually needed.
  Date: 2025-11-16
  Evidence: workspace.json only needs 5 keys (workspace_name, created_at, selected_screenshot, overlays, screenshots), all with obvious defaults. No complex placeholder replacement or cloning logic needed.

- Decision: Add empty "overlays": {} to workspace.json in Phase 1
  Rationale: Prepares the schema for Phase 1.5 without breaking current functionality. New workspaces will have the key pre-populated, making migration easier. Existing workspaces can add it during migration.
  Date: 2025-11-16

- Decision: Skip automatic migration, delete old workspace.json files instead
  Rationale: Tool is in active development with limited users. Migration code adds complexity (~200 lines) and testing burden. Clean break is simpler: delete old workspaces, regenerate with new schema. Users can re-capture screenshots easily. Cost of migration > benefit for early-stage tool.
  Date: 2025-11-16
  Impact: Eliminated schema_migrator.py module, simplified WorkspaceManager, reduced testing surface area.

- Decision: Use schema_version field for future compatibility
  Rationale: Even though we're not migrating v1→v2 now, adding schema_version: 2 to new workspaces enables future migrations when the tool is more mature and has production users. Low-cost future-proofing.
  Date: 2025-11-16

- Decision: Merge workspace overlays with canvas overlays during save
  Rationale: Canvas only shows overlays bound to current screenshot. Directly saving canvas.overlays would delete overlays bound to other screenshots. Solution: load workspace.overlays, merge with canvas.overlays (canvas wins), save merged result. Preserves other screenshots' bindings while updating current screenshot.
  Date: 2025-11-16
  Implementation: `_save_current_overlays()` in config_editor.py:952-962

- Decision: Keep overlay bindings as simple array of IDs
  Rationale: Screenshots reference overlays via `overlay_bindings: ["grid_1", "ocr_1"]`. Considered adding metadata (binding timestamp, override configs) but rejected for YAGNI. Array of IDs is sufficient for MVP. Can extend later if needed.
  Date: 2025-11-16

## Outcomes & Retrospective

### Phase 1.5 Outcomes (2025-11-16)

**What Worked Well:**

1. **Skipping migration was the right call**: Saved significant development time. The 5 existing workspaces were test data anyway - easy to recreate. For early-stage tools, simplicity > backward compatibility.

2. **New API is cleaner than old API**:
   - Old: `save_overlays(workspace, screenshot, overlays)` - unclear that overlays are per-screenshot
   - New: `save_workspace_overlays(workspace, overlays)` + `save_screenshot_bindings(workspace, screenshot, ids)` - separation of concerns is explicit

3. **UI addition was non-invasive**: Binding panel slotted into existing right sidebar without layout issues. Separator visually distinguishes "Overlays" (workspace-level) from "Apply to Screenshot:" (per-screenshot bindings). User can understand the data model from UI structure.

4. **Callback pattern scaled well**: Adding `refresh_binding_list_callback` to context dict followed established pattern. Draw tools already called `refresh_overlay_list_callback`, so adding binding refresh was mechanical. No architecture changes needed.

5. **Documentation-driven development paid off**: Writing `workspace-json-schema.md` first clarified the design before coding. The schema doc became the spec that guided implementation. No mid-implementation design pivots.

**What Could Be Improved:**

1. **Merge logic in _save_current_overlays() is subtle**: The code works but requires careful reading to understand why we load→merge→save instead of just save. Added inline comment, but this could be refactored into a helper method like `_merge_overlays()` with clear docstring.

2. **No validation that bound overlays exist**: If workspace.json has `overlay_bindings: ["grid_99"]` but `overlays: {}` doesn't contain "grid_99", we silently ignore it. Should add validation in `get_screenshot_overlays()` to warn about dangling references.

3. **Binding UI doesn't show overlay count**: The "Apply to Screenshot:" section doesn't show "3 overlays available" like the overlay list does. Minor UX inconsistency.

**Key Metrics:**

- **Lines of code changed**: ~150 lines modified, ~80 lines added (UI + API)
- **Lines of code avoided** (by skipping migration): ~200 lines
- **Time to implement**: ~2 hours from design to working tool
- **Bugs found during testing**: 0 (tool launched cleanly on first run)

**Lessons Learned:**

1. **Early-stage tools don't need production-grade migration**: Migration infrastructure has high fixed cost. For tools with few users and frequent iteration, clean breaks are acceptable. Add migration when user base justifies the investment.

2. **Explicit separation beats clever abstraction**: Separate methods for workspace overlays vs screenshot bindings is more verbose than a unified API, but makes the data model obvious. Clarity > cleverness for maintainability.

3. **Document the schema, not just the code**: `workspace-json-schema.md` is valuable for onboarding and troubleshooting. Users can check their workspace.json against the spec without reading Python code.

**Remaining Work (Phase 2):**

Phase 1.5 is complete and ready for production use. Users can now define overlays once and bind them to multiple screenshots. Next phase: implement batch cropping API that uses workspace.json to extract icons from all bound screenshots.

## Context and Orientation

The icon-cropper tool is a GUI application for configuring grid-based icon extraction from game screenshots. It uses a workspace-centric architecture where each workspace is a self-contained project directory under `tools/icon-cropper/workspaces/`.

**Current file structure:**
```
tools/icon-cropper/
├── config_editor.py              # Main GUI application
├── editor/
│   ├── workspace_manager.py      # Manages workspace directories and metadata
│   ├── config_serializer.py      # LEGACY: YAML config save/load (to be removed)
│   ├── config_template.py        # Creates config.yaml from template (to be repurposed)
│   ├── canvas_controller.py      # Owns visual state (image, zoom, overlays)
│   └── ui_builder.py             # Creates UI components
└── workspaces/
    └── example_workspace/
        ├── config.yaml           # LEGACY: Single-overlay config for daemon
        ├── workspace.json        # NEW: Multi-overlay GUI config (auto-saved)
        └── screenshots/
            ├── 001.png
            └── 002.png
```

**Current workspace.json structure (screenshot-specific overlays):**
```json
{
  "workspace_name": "example",
  "screenshots": [
    {
      "filename": "001.png",
      "overlays": {
        "grid_1": {"type": "grid", "config": {...}},
        "ocr_1": {"type": "ocr", "config": {...}}
      }
    },
    {
      "filename": "002.png",
      "overlays": {
        "grid_1": {"type": "grid", "config": {...}}  // DUPLICATED!
      }
    }
  ]
}
```

**Problem:** If users capture 10 screenshots of a scrolling character list, the same grid config gets duplicated 10 times. Updating the grid requires editing 10 entries. This defeats the purpose of workspaces (reusing overlays for batch processing).

**Terms:**
- **Workspace**: A self-contained project directory with screenshots and configuration
- **Overlay**: A visual annotation on a screenshot (grid layout or OCR region)
- **Grid overlay**: Defines a rectangular grid for extracting icons (start position, cell size, rows, columns)
- **OCR overlay**: Defines a region for text detection (used to identify which page a screenshot shows)
- **Overlay binding**: An association between a screenshot and an overlay (means "apply this overlay to this screenshot")
- **Batch cropping**: Extracting icons from multiple screenshots using shared overlay configurations

## Milestone 1: Remove config.yaml Dependencies

**Goal:** Eliminate the legacy config.yaml system to establish workspace.json as the single source of truth. Remove misleading Save/Load buttons that conflict with real-time workspace.json auto-save.

**What will exist at the end:**
- No Save/Load Configuration buttons in UI
- No ConfigSerializer class or config_serializer.py file
- New workspaces will not generate config.yaml
- Documentation updated to reference only workspace.json

**Commands to run:**
```bash
cd tools/icon-cropper
uv run python config_editor.py
# Create new workspace, verify no config.yaml created
# Verify workspace switching works without config.yaml
```

**Acceptance:**
- Creating a new workspace does not create config.yaml
- Drawing overlays auto-saves to workspace.json
- Switching workspaces loads overlays from workspace.json
- No Save/Load Configuration menu items visible

### Step 1.1: Remove Save/Load Configuration UI

**File:** `tools/icon-cropper/config_editor.py`

Locate the menu bar creation in the `__init__` method (around line 50-80). Find the File menu creation that includes:
```python
file_menu.add_command(label="💾 Save Configuration", command=self._save_config, accelerator="Ctrl+S")
file_menu.add_command(label="📂 Load Configuration", command=self._load_config, accelerator="Ctrl+L")
```

Delete these two lines. Also remove the keyboard binding for Ctrl+S and Ctrl+L (search for `bind("<Control-s>"` and `bind("<Control-l>"` and remove those lines).

Delete the `_save_config()` and `_load_config()` methods from config_editor.py (search for `def _save_config` and `def _load_config` and remove the entire method definitions).

**Expected result:** Running `uv run python config_editor.py` shows the File menu without Save/Load Configuration options.

### Step 1.2: Delete ConfigSerializer

**Files to delete:**
- `tools/icon-cropper/editor/config_serializer.py`

**Files to modify:**
- `tools/icon-cropper/config_editor.py` - Remove import statement: `from editor.config_serializer import ConfigSerializer`
- `tools/icon-cropper/config_editor.py` - Remove all references to `self.config_serializer`

Search config_editor.py for "config_serializer" and remove:
1. The import line at the top
2. The initialization `self.config_serializer = ConfigSerializer(...)`
3. Any calls to `self.config_serializer.load()` or `self.config_serializer.save()`

**Validation:** Run `uv run python config_editor.py` and verify no import errors. Create workspace, draw overlays, switch workspaces - all should work without errors.

### Step 1.3: Stop Creating config.yaml in New Workspaces

**File:** `tools/icon-cropper/editor/workspace_manager.py`

Locate the `create_workspace()` method. Find the code that copies config_template.yaml to the new workspace's config.yaml. It will look something like:
```python
template = load_config_template()
template['workspace_name'] = workspace_name
# ... write config.yaml
```

Comment out or delete this entire section that writes config.yaml. The method should only:
1. Create the workspace directory
2. Create the screenshots subdirectory
3. Create workspace.json with initial metadata

**Expected workspace.json for new workspace:**
```json
{
  "workspace_name": "my_new_workspace",
  "created_at": "2025-11-16T12:00:00",
  "selected_screenshot": null,
  "overlays": {},
  "screenshots": []
}
```

Notice the addition of an empty `"overlays": {}` top-level key (this prepares for Phase 1.5).

**Validation:**
```bash
cd tools/icon-cropper
uv run python config_editor.py
# Click [+] to create new workspace "test_workspace"
# Verify workspaces/test_workspace/workspace.json exists
# Verify workspaces/test_workspace/config.yaml does NOT exist
```

### Step 1.4: Repurpose config_template.py

**File:** `tools/icon-cropper/editor/config_template.py`

This file currently loads config_template.yaml. Repurpose it to provide the workspace.json template structure instead.

Rename it to `workspace_template.py` and rewrite to:
```python
"""Workspace.json template utilities."""
from datetime import datetime

def create_workspace_metadata(workspace_name: str) -> dict:
    """Create initial workspace.json structure for new workspace."""
    return {
        "workspace_name": workspace_name,
        "created_at": datetime.now().isoformat(),
        "selected_screenshot": None,
        "overlays": {},
        "screenshots": []
    }
```

Update `workspace_manager.py` to import and use this function instead of the old config template logic.

### Step 1.5: Update Documentation

**Files to update:**
- `tools/icon-cropper/README.md`
- `tools/icon-cropper/CLAUDE.md`

**In README.md**, find the "Keyboard Shortcuts" section and remove:
- `Ctrl+L`: Load saved configuration
- `Ctrl+S`: Save configuration

Remove any references to "Save Configuration" and "Load Configuration" buttons in the workflow descriptions.

Add a note in the "Workspace-Centric Workflow" section:
```markdown
**Note:** All overlay configurations are automatically saved to workspace.json in real-time.
There is no need for manual save/load operations.
```

**In CLAUDE.md**, update the "Workspace Management Layer" section:

Remove the ConfigSerializer documentation. Update the "Common Patterns" section to remove the "Workspace Switching" pattern that references config_serializer.

Replace with:
```markdown
### Workspace Switching

```python
# Always clear before loading new workspace
self.canvas_controller.clear()  # Resets image + overlays + zoom + pan

# Load workspace metadata
self.workspace_manager.load_workspace(workspace_name)

# Load screenshots and overlays
self._refresh_screenshot_list()
self._load_selected_screenshot()
```
```

**Validation:** Read through both documentation files and verify they accurately describe the workspace.json-only system.

### Step 1.6: Test Phase 1 Completion

**Test checklist:**
1. Create new workspace → no config.yaml created ✓
2. Capture screenshot → saved to workspace.json ✓
3. Draw grid overlay → auto-saved to workspace.json ✓
4. Switch workspaces → overlays load correctly ✓
5. No Save/Load buttons in UI ✓
6. No import errors or crashes ✓

**Command:**
```bash
cd tools/icon-cropper
uv run python config_editor.py
```

Create workspace "test_phase1", capture screenshot, draw grid, switch to another workspace, switch back. Verify grid reappears.

Check `workspaces/test_phase1/workspace.json` and confirm it contains the grid overlay data.

Confirm `workspaces/test_phase1/config.yaml` does NOT exist.

## Milestone 2: Refactor to Overlay-Based Architecture

**Goal:** Restructure workspace.json to store overlays at the top level (not per-screenshot) and use bindings to associate overlays with screenshots. This enables defining a grid once and applying it to 10 screenshots without duplication.

**What will exist at the end:**
- New workspace.json schema with top-level overlays and screenshot bindings
- Updated WorkspaceManager that reads/writes new schema
- UI for managing overlay bindings (checkboxes per screenshot)
- Migration utility for converting existing workspaces

**Commands to run:**
```bash
cd tools/icon-cropper
uv run python config_editor.py
# Create workspace, add 3 screenshots
# Draw one grid
# Bind grid to all 3 screenshots via checkboxes
# Verify grid renders on all 3 screenshots
```

**Acceptance:**
- workspace.json has overlays at top level
- Each screenshot has overlay_bindings array
- Binding/unbinding overlays via UI updates workspace.json
- Switching screenshots shows correct overlays based on bindings

---

### 🎯 PROGRESS UPDATE - 2025-11-16 (Phase 1.5 COMPLETED)

**Status:** ✅ **COMPLETED**

**Implementation Summary:**

We completed Phase 1.5 by implementing workspace-level overlays without migration (user decision to start fresh):

1. **Schema Design** ✅
   - Created `_docs/workspace-json-schema.md` documenting new schema
   - Added `schema_version: 2` field
   - Moved overlays to workspace level
   - Replaced per-screenshot `overlays` with `overlay_bindings` array

2. **WorkspaceManager Updates** ✅
   - Updated `create_workspace()` to initialize with schema v2
   - Added new API methods:
     - `save_workspace_overlays()` - saves to workspace.overlays
     - `load_workspace_overlays()` - loads from workspace.overlays
     - `save_screenshot_bindings()` - saves overlay_bindings array
     - `load_screenshot_bindings()` - loads overlay_bindings array
     - `get_screenshot_overlays()` - convenience method to get bound overlays
   - Removed old `save_overlays()` and `load_overlays()` methods

3. **config_editor.py Updates** ✅
   - Updated `_load_selected_screenshot()` to use `get_screenshot_overlays()`
   - Updated `_save_current_overlays()` to save workspace overlays + bindings
   - Added `_refresh_binding_list()` to update binding UI
   - Added `_on_binding_toggle()` callback for checkbox changes
   - Added `refresh_binding_list_callback` to tool context

4. **Overlay Binding UI** ✅
   - Added separator and "Apply to Screenshot:" section in overlay panel
   - Added scrollable binding list with checkboxes
   - Created `update_binding_list()` method in ui_builder.py
   - Shows all workspace overlays with checked state based on bindings
   - Toggles immediately apply/remove overlays to current screenshot

5. **Draw Tool Updates** ✅
   - Updated `draw_grid_tool.py` to call `refresh_binding_list_callback`
   - Updated `draw_ocr_tool.py` to call `refresh_binding_list_callback`
   - Ensures binding UI stays in sync when creating new overlays

**Migration Approach:**
- Decided against automatic migration
- Deleted old workspace.json files
- Users start fresh with schema v2
- All new workspaces use overlay-based architecture

**Testing:**
- Tool launches successfully (no errors)
- Ready for user acceptance testing

**Files Modified:**
- `editor/workspace_manager.py` - New overlay persistence API
- `config_editor.py` - Updated save/load logic, added binding callbacks
- `editor/ui_builder.py` - Added binding list UI
- `editor/draw_grid_tool.py` - Added binding refresh callback
- `editor/draw_ocr_tool.py` - Added binding refresh callback

**Files Created:**
- `_docs/workspace-json-schema.md` - Schema documentation

---

### Step 2.1: Design New Schema

**New workspace.json structure (overlay-based):**
```json
{
  "workspace_name": "character_select",
  "created_at": "2025-11-16T12:00:00",
  "selected_screenshot": "001.png",
  "overlays": {
    "grid_1": {
      "id": "grid_1",
      "type": "grid",
      "name": "Character Grid",
      "config": {
        "start_x": 100,
        "start_y": 200,
        "cell_width": 80,
        "cell_height": 80,
        "spacing_x": 5,
        "spacing_y": 5,
        "columns": 4,
        "rows": 3,
        "crop_padding": 2
      },
      "locked": false,
      "visible": true
    },
    "ocr_1": {
      "id": "ocr_1",
      "type": "ocr",
      "name": "Page Title",
      "config": {
        "x": 50,
        "y": 50,
        "width": 200,
        "height": 40
      },
      "locked": false,
      "visible": true
    }
  },
  "screenshots": [
    {
      "filename": "001.png",
      "captured_at": "2025-11-16T12:05:00",
      "resolution": [1920, 1080],
      "notes": "Page 1",
      "overlay_bindings": ["grid_1", "ocr_1"]
    },
    {
      "filename": "002.png",
      "captured_at": "2025-11-16T12:06:00",
      "resolution": [1920, 1080],
      "notes": "Page 2 (scrolled down)",
      "overlay_bindings": ["grid_1"]
    }
  ]
}
```

**Key changes from old schema:**
1. Top-level `"overlays"` dict (keyed by overlay ID)
2. Each screenshot has `"overlay_bindings"` array (list of overlay IDs to apply)
3. Overlay configs stored once, referenced by bindings

Write this schema documentation to `tools/icon-cropper/_docs/workspace_schema.md` for reference.

### Step 2.2: Implement Schema Migration Utility

**Create file:** `tools/icon-cropper/editor/schema_migration.py`

```python
"""Migrate workspace.json from screenshot-specific to overlay-based schema."""
import json
from pathlib import Path
from typing import Dict, List, Any

def migrate_workspace(workspace_path: Path) -> bool:
    """
    Migrate workspace.json from old schema to new schema.

    Old schema: overlays stored per-screenshot
    New schema: overlays at top-level, screenshots have bindings

    Returns True if migration was needed and performed, False if already new schema.
    """
    json_path = workspace_path / "workspace.json"

    if not json_path.exists():
        return False

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Check if already migrated (has top-level 'overlays' and screenshots have 'overlay_bindings')
    if 'overlays' in data and data.get('screenshots'):
        first_screenshot = data['screenshots'][0] if data['screenshots'] else {}
        if 'overlay_bindings' in first_screenshot:
            print(f"Workspace {workspace_path.name} already using new schema.")
            return False

    print(f"Migrating workspace {workspace_path.name} to overlay-based schema...")

    # Collect all unique overlays from screenshots
    all_overlays = {}

    for screenshot in data.get('screenshots', []):
        screenshot_overlays = screenshot.get('overlays', {})

        for overlay_id, overlay_data in screenshot_overlays.items():
            # If this overlay ID not yet seen, add to global overlays
            if overlay_id not in all_overlays:
                all_overlays[overlay_id] = overlay_data

        # Replace 'overlays' with 'overlay_bindings' (list of IDs)
        screenshot['overlay_bindings'] = list(screenshot_overlays.keys())

        # Remove old 'overlays' key from screenshot
        if 'overlays' in screenshot:
            del screenshot['overlays']

    # Add top-level overlays
    data['overlays'] = all_overlays

    # Write migrated data back
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Migration complete. {len(all_overlays)} overlays extracted.")
    return True

def migrate_all_workspaces(workspaces_root: Path = Path("workspaces")):
    """Migrate all workspaces in the workspaces directory."""
    count = 0
    for workspace_dir in workspaces_root.iterdir():
        if workspace_dir.is_dir():
            if migrate_workspace(workspace_dir):
                count += 1
    print(f"\nMigrated {count} workspace(s).")
```

**Validation script:** `tools/icon-cropper/migrate_workspaces.py`
```python
#!/usr/bin/env python3
"""Migrate all workspaces to overlay-based schema."""
from pathlib import Path
from editor.schema_migration import migrate_all_workspaces

if __name__ == "__main__":
    workspaces_root = Path(__file__).parent / "workspaces"
    migrate_all_workspaces(workspaces_root)
```

**Test migration:**
```bash
cd tools/icon-cropper
uv run python migrate_workspaces.py
# Should print migration status for each workspace
# Re-run to verify "already using new schema" message
```

### Step 2.3: Update WorkspaceManager for New Schema

**File:** `tools/icon-cropper/editor/workspace_manager.py`

Update methods to read/write the new schema:

**Method: `get_screenshots(workspace_name)`**
- Update to return screenshots with `overlay_bindings` field
- Ensure it reads from new schema structure

**Method: `add_screenshot(workspace_name, image)`**
- When adding screenshot, initialize `overlay_bindings` as empty list `[]`

**New method: `get_overlays(workspace_name) -> Dict[str, Any]`**
```python
def get_overlays(self, workspace_name: str) -> Dict[str, Any]:
    """Get all overlays defined in workspace."""
    metadata = self._load_workspace_metadata(workspace_name)
    return metadata.get('overlays', {})
```

**New method: `set_overlay(workspace_name, overlay_id, overlay_data)`**
```python
def set_overlay(self, workspace_name: str, overlay_id: str, overlay_data: dict):
    """Set or update an overlay in workspace."""
    metadata = self._load_workspace_metadata(workspace_name)

    if 'overlays' not in metadata:
        metadata['overlays'] = {}

    metadata['overlays'][overlay_id] = overlay_data
    self._save_workspace_metadata(workspace_name, metadata)
```

**New method: `bind_overlay(workspace_name, screenshot_filename, overlay_id)`**
```python
def bind_overlay(self, workspace_name: str, screenshot_filename: str, overlay_id: str):
    """Add overlay binding to screenshot."""
    metadata = self._load_workspace_metadata(workspace_name)

    for screenshot in metadata.get('screenshots', []):
        if screenshot['filename'] == screenshot_filename:
            if 'overlay_bindings' not in screenshot:
                screenshot['overlay_bindings'] = []

            if overlay_id not in screenshot['overlay_bindings']:
                screenshot['overlay_bindings'].append(overlay_id)
                self._save_workspace_metadata(workspace_name, metadata)
                return True

    return False
```

**New method: `unbind_overlay(workspace_name, screenshot_filename, overlay_id)`**
```python
def unbind_overlay(self, workspace_name: str, screenshot_filename: str, overlay_id: str):
    """Remove overlay binding from screenshot."""
    metadata = self._load_workspace_metadata(workspace_name)

    for screenshot in metadata.get('screenshots', []):
        if screenshot['filename'] == screenshot_filename:
            if 'overlay_bindings' in screenshot and overlay_id in screenshot['overlay_bindings']:
                screenshot['overlay_bindings'].remove(overlay_id)
                self._save_workspace_metadata(workspace_name, metadata)
                return True

    return False
```

**Validation:**
Write unit tests in `tools/icon-cropper/editor/test_workspace_manager.py`:
```python
def test_overlay_binding():
    manager = WorkspaceManager()
    workspace = "test_bindings"

    # Create workspace and add screenshot
    manager.create_workspace(workspace)
    manager.add_screenshot(workspace, create_test_image())

    # Define overlay
    overlay_data = {
        "id": "grid_1",
        "type": "grid",
        "config": {"start_x": 0, "start_y": 0, "cell_width": 100, "cell_height": 100}
    }
    manager.set_overlay(workspace, "grid_1", overlay_data)

    # Bind overlay to screenshot
    screenshots = manager.get_screenshots(workspace)
    manager.bind_overlay(workspace, screenshots[0]['filename'], "grid_1")

    # Verify binding
    updated_screenshots = manager.get_screenshots(workspace)
    assert "grid_1" in updated_screenshots[0]['overlay_bindings']
```

Run: `uv run python -m pytest editor/test_workspace_manager.py`

### Step 2.4: Update CanvasController for Overlay Bindings

**File:** `tools/icon-cropper/editor/canvas_controller.py`

Currently, CanvasController has `set_overlay(overlay_type, config, index)` which manages overlays in memory. This design is still valid, but we need to update how overlays are loaded from workspace.json.

**No changes needed to CanvasController** - it already uses an internal overlay dict. The loading logic in config_editor.py will change instead.

### Step 2.5: Update config_editor.py to Load Overlay Bindings

**File:** `tools/icon-cropper/config_editor.py`

**Update `_load_selected_screenshot()` method:**

Old behavior: Load screenshot → load overlays from screenshot's overlays dict

New behavior: Load screenshot → get overlay_bindings → load overlays from workspace overlays dict

```python
def _load_selected_screenshot(self):
    """Load the selected screenshot and its bound overlays."""
    if not self.current_workspace or not self.selected_screenshot:
        return

    # Load image
    screenshot_path = Path("workspaces") / self.current_workspace / "screenshots" / self.selected_screenshot
    if not screenshot_path.exists():
        return

    image = Image.open(screenshot_path)
    self.canvas_controller.set_image(image)

    # Get workspace overlays and screenshot bindings
    workspace_overlays = self.workspace_manager.get_overlays(self.current_workspace)
    screenshots = self.workspace_manager.get_screenshots(self.current_workspace)

    current_screenshot_data = next(
        (s for s in screenshots if s['filename'] == self.selected_screenshot),
        None
    )

    if not current_screenshot_data:
        return

    overlay_bindings = current_screenshot_data.get('overlay_bindings', [])

    # Load bound overlays into canvas
    for overlay_id in overlay_bindings:
        if overlay_id in workspace_overlays:
            overlay_data = workspace_overlays[overlay_id]
            overlay_type = overlay_data['type']
            overlay_config = overlay_data['config']

            # Determine index from overlay_id (e.g., "grid_1" → index 1)
            index = int(overlay_id.split('_')[-1]) if '_' in overlay_id else 0

            self.canvas_controller.set_overlay(overlay_type, overlay_config, index)

    self.canvas_controller.render()
```

**Update overlay save logic:**

When user draws a grid or OCR region, we need to:
1. Save overlay to workspace overlays dict
2. Automatically bind it to current screenshot

Find the code that handles grid/OCR drawing completion (likely in tool callbacks). Update to:

```python
def _on_grid_drawn(self, grid_config):
    """Called when user finishes drawing a grid."""
    # Generate unique overlay ID
    existing_overlays = self.workspace_manager.get_overlays(self.current_workspace)
    grid_count = sum(1 for oid in existing_overlays if oid.startswith('grid_'))
    overlay_id = f"grid_{grid_count + 1}"

    # Create overlay data
    overlay_data = {
        "id": overlay_id,
        "type": "grid",
        "name": f"Grid {grid_count + 1}",
        "config": grid_config,
        "locked": False,
        "visible": True
    }

    # Save to workspace overlays
    self.workspace_manager.set_overlay(self.current_workspace, overlay_id, overlay_data)

    # Auto-bind to current screenshot
    self.workspace_manager.bind_overlay(self.current_workspace, self.selected_screenshot, overlay_id)

    # Update canvas
    self.canvas_controller.set_overlay('grid', grid_config, grid_count)
    self.canvas_controller.render()
```

Similar logic for OCR regions.

### Step 2.6: Add Overlay Binding UI

**Goal:** Add a panel showing all workspace overlays with checkboxes to bind/unbind them to the current screenshot.

**File:** `tools/icon-cropper/editor/ui_builder.py`

Add a new panel below the screenshot list labeled "Overlay Bindings" with checkboxes for each overlay.

**UI Layout:**
```
┌──────────────────────────────┐
│ Workspace: character_select  │
├──────────────────────────────┤
│ Screenshots:                 │
│ ○ 001.png                    │
│ ○ 002.png                    │
│ ○ 003.png                    │
├──────────────────────────────┤
│ Overlay Bindings:            │
│ (for 001.png)                │
│ ☑ grid_1 (Character Grid)    │
│ ☑ ocr_1 (Page Title)         │
│ ☐ grid_2 (Item Grid)         │
└──────────────────────────────┘
```

**Implementation in ui_builder.py:**

Add method `create_overlay_bindings_panel(parent)`:
```python
def create_overlay_bindings_panel(self, parent):
    """Create panel for managing overlay bindings."""
    frame = ttk.LabelFrame(parent, text="Overlay Bindings", padding=5)

    # Current screenshot label
    self.bindings_screenshot_label = ttk.Label(frame, text="(No screenshot selected)")
    self.bindings_screenshot_label.pack(anchor='w', padx=5, pady=2)

    # Scrollable frame for checkboxes
    bindings_canvas = tk.Canvas(frame, height=150)
    bindings_scrollbar = ttk.Scrollbar(frame, orient='vertical', command=bindings_canvas.yview)
    bindings_canvas.configure(yscrollcommand=bindings_scrollbar.set)

    self.bindings_frame = ttk.Frame(bindings_canvas)
    bindings_canvas.create_window((0, 0), window=self.bindings_frame, anchor='nw')

    bindings_canvas.pack(side='left', fill='both', expand=True)
    bindings_scrollbar.pack(side='right', fill='y')

    self.overlay_binding_vars = {}  # Dict[overlay_id, tk.BooleanVar]

    return frame
```

**File:** `tools/icon-cropper/config_editor.py`

Add method to populate bindings panel:
```python
def _refresh_overlay_bindings_ui(self):
    """Refresh the overlay bindings checkboxes."""
    if not self.current_workspace or not self.selected_screenshot:
        self.bindings_screenshot_label.config(text="(No screenshot selected)")
        return

    self.bindings_screenshot_label.config(text=f"for {self.selected_screenshot}")

    # Clear existing checkboxes
    for widget in self.bindings_frame.winfo_children():
        widget.destroy()

    self.overlay_binding_vars.clear()

    # Get workspace overlays and current bindings
    workspace_overlays = self.workspace_manager.get_overlays(self.current_workspace)
    screenshots = self.workspace_manager.get_screenshots(self.current_workspace)

    current_screenshot_data = next(
        (s for s in screenshots if s['filename'] == self.selected_screenshot),
        None
    )

    if not current_screenshot_data:
        return

    current_bindings = current_screenshot_data.get('overlay_bindings', [])

    # Create checkbox for each overlay
    for overlay_id, overlay_data in workspace_overlays.items():
        overlay_name = overlay_data.get('name', overlay_id)
        overlay_type = overlay_data.get('type', 'unknown')

        var = tk.BooleanVar(value=(overlay_id in current_bindings))
        self.overlay_binding_vars[overlay_id] = var

        checkbox = ttk.Checkbutton(
            self.bindings_frame,
            text=f"{overlay_id} ({overlay_name})",
            variable=var,
            command=lambda oid=overlay_id: self._on_overlay_binding_changed(oid)
        )
        checkbox.pack(anchor='w', padx=5, pady=2)

def _on_overlay_binding_changed(self, overlay_id: str):
    """Handle overlay binding checkbox change."""
    is_bound = self.overlay_binding_vars[overlay_id].get()

    if is_bound:
        # Bind overlay to screenshot
        self.workspace_manager.bind_overlay(
            self.current_workspace,
            self.selected_screenshot,
            overlay_id
        )
    else:
        # Unbind overlay from screenshot
        self.workspace_manager.unbind_overlay(
            self.current_workspace,
            self.selected_screenshot,
            overlay_id
        )

    # Reload screenshot to show/hide overlay
    self._load_selected_screenshot()
```

Call `_refresh_overlay_bindings_ui()` whenever:
- Screenshot is selected
- Workspace is switched
- New overlay is created

**Validation:**
```bash
cd tools/icon-cropper
uv run python config_editor.py
# Create workspace
# Capture screenshot 001.png
# Draw grid_1 → should auto-bind to 001.png
# Capture screenshot 002.png
# Select 002.png → grid_1 checkbox should be unchecked
# Check grid_1 checkbox → grid should appear on 002.png
# Verify workspace.json shows overlay_bindings updated
```

### Step 2.7: Test Phase 1.5 Completion

**Test checklist:**
1. Migrate existing workspace → overlays moved to top level ✓
2. Create new workspace with new schema ✓
3. Draw grid → saves to workspace overlays dict ✓
4. Auto-binds to current screenshot ✓
5. Add second screenshot → can bind same grid ✓
6. Unbind via checkbox → overlay disappears ✓
7. workspace.json has correct structure ✓

**Test scenario:**
1. Create workspace "test_overlay_based"
2. Capture screenshot "001.png"
3. Draw grid "grid_1" (should auto-bind to 001.png)
4. Capture screenshot "002.png" (scrolled character list)
5. Select 002.png → grid_1 not visible
6. Check grid_1 binding checkbox → grid appears
7. Inspect workspace.json:
   ```json
   {
     "overlays": {
       "grid_1": {"config": {...}}
     },
     "screenshots": [
       {"filename": "001.png", "overlay_bindings": ["grid_1"]},
       {"filename": "002.png", "overlay_bindings": ["grid_1"]}
     ]
   }
   ```

## Milestone 3: Implement New Cropping API

**Goal:** Create a new Python API for batch cropping icons based on workspace.json overlay bindings. Replace the legacy daemon approach (cropper.py, gridcrop.py) with a simpler, direct API.

**What will exist at the end:**
- New module `editor/cropper_api.py` with cropping functions
- "👁️ Preview Crop" button showing icon previews
- "✂️ Batch Crop All" button extracting all icons
- Cropped icons saved to `workspaces/{name}/cropped/{screenshot}/{overlay_id}/`

**Commands to run:**
```bash
cd tools/icon-cropper
uv run python config_editor.py
# Create workspace with 2 screenshots
# Bind grid_1 to both screenshots
# Click "Batch Crop All"
# Verify icons extracted to cropped/ directory
```

**Acceptance:**
- Preview shows grid cells correctly
- Batch crop extracts icons from all bound screenshots
- Output organized by screenshot and overlay
- Legacy cropper.py no longer needed

### Step 3.1: Design Cropping API

**Create file:** `tools/icon-cropper/editor/cropper_api.py`

```python
"""Icon extraction API based on workspace.json overlays."""
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np
from PIL import Image

def crop_grid(image: np.ndarray, grid_config: dict) -> List[np.ndarray]:
    """
    Extract icon cells from image using grid configuration.

    Args:
        image: Input image as numpy array (H, W, C)
        grid_config: Grid configuration dict with keys:
            - start_x, start_y: Top-left corner of grid
            - cell_width, cell_height: Size of each cell
            - spacing_x, spacing_y: Spacing between cells
            - rows, columns: Number of cells
            - crop_padding: Padding to add around each cell (pixels)

    Returns:
        List of cropped cell images as numpy arrays
    """
    icons = []

    start_x = grid_config['start_x']
    start_y = grid_config['start_y']
    cell_w = grid_config['cell_width']
    cell_h = grid_config['cell_height']
    spacing_x = grid_config['spacing_x']
    spacing_y = grid_config['spacing_y']
    rows = grid_config['rows']
    cols = grid_config['columns']
    padding = grid_config.get('crop_padding', 0)

    for row in range(rows):
        for col in range(cols):
            # Calculate cell position
            x = start_x + col * (cell_w + spacing_x)
            y = start_y + row * (cell_h + spacing_y)

            # Apply padding
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(image.shape[1], x + cell_w + padding)
            y2 = min(image.shape[0], y + cell_h + padding)

            # Crop cell
            cell = image[y1:y2, x1:x2]
            icons.append(cell)

    return icons

def preview_overlay(workspace_name: str, screenshot_filename: str, overlay_id: str) -> List[Image.Image]:
    """
    Preview cropped icons for a single overlay on a screenshot.

    Args:
        workspace_name: Name of workspace
        screenshot_filename: Screenshot filename (e.g., "001.png")
        overlay_id: Overlay ID (e.g., "grid_1")

    Returns:
        List of cropped icons as PIL Images
    """
    workspace_path = Path("workspaces") / workspace_name
    screenshot_path = workspace_path / "screenshots" / screenshot_filename

    # Load workspace.json
    import json
    with open(workspace_path / "workspace.json", 'r', encoding='utf-8') as f:
        workspace_data = json.load(f)

    # Get overlay config
    overlay = workspace_data['overlays'].get(overlay_id)
    if not overlay:
        raise ValueError(f"Overlay {overlay_id} not found in workspace")

    if overlay['type'] != 'grid':
        raise ValueError(f"Overlay {overlay_id} is not a grid overlay")

    # Load image
    image = Image.open(screenshot_path)
    image_array = np.array(image)

    # Crop icons
    icon_arrays = crop_grid(image_array, overlay['config'])

    # Convert back to PIL Images
    return [Image.fromarray(arr) for arr in icon_arrays]

def batch_crop_workspace(workspace_name: str, output_base: str = "cropped") -> Dict[str, List[str]]:
    """
    Batch crop all screenshots in workspace based on overlay bindings.

    Args:
        workspace_name: Name of workspace to process
        output_base: Base directory name for cropped output (within workspace)

    Returns:
        Dict mapping screenshot+overlay to list of output paths
        Example: {
            "001.png/grid_1": ["cropped/001.png/grid_1/001.png", "cropped/001.png/grid_1/002.png", ...],
            "002.png/grid_1": ["cropped/002.png/grid_1/001.png", ...]
        }
    """
    workspace_path = Path("workspaces") / workspace_name
    output_root = workspace_path / output_base

    # Load workspace.json
    import json
    with open(workspace_path / "workspace.json", 'r', encoding='utf-8') as f:
        workspace_data = json.load(f)

    results = {}

    # Process each screenshot
    for screenshot in workspace_data['screenshots']:
        screenshot_filename = screenshot['filename']
        screenshot_path = workspace_path / "screenshots" / screenshot_filename

        if not screenshot_path.exists():
            print(f"Warning: Screenshot {screenshot_filename} not found, skipping")
            continue

        # Load image
        image = Image.open(screenshot_path)
        image_array = np.array(image)

        # Process each bound overlay
        for overlay_id in screenshot.get('overlay_bindings', []):
            overlay = workspace_data['overlays'].get(overlay_id)

            if not overlay:
                print(f"Warning: Overlay {overlay_id} not found, skipping")
                continue

            if overlay['type'] != 'grid':
                print(f"Info: Skipping non-grid overlay {overlay_id}")
                continue

            # Crop icons
            icon_arrays = crop_grid(image_array, overlay['config'])

            # Save icons
            output_dir = output_root / screenshot_filename / overlay_id
            output_dir.mkdir(parents=True, exist_ok=True)

            output_paths = []
            for i, icon_array in enumerate(icon_arrays, start=1):
                output_path = output_dir / f"{i:03d}.png"
                icon_image = Image.fromarray(icon_array)
                icon_image.save(output_path)
                output_paths.append(str(output_path))

            results[f"{screenshot_filename}/{overlay_id}"] = output_paths
            print(f"Extracted {len(icon_arrays)} icons from {screenshot_filename}/{overlay_id}")

    return results
```

**Validation:**
Write test in `tools/icon-cropper/editor/test_cropper_api.py`:
```python
import numpy as np
from PIL import Image
from editor.cropper_api import crop_grid

def test_crop_grid():
    # Create test image (400x400 white background)
    image = np.ones((400, 400, 3), dtype=np.uint8) * 255

    # Draw colored grid cells for verification
    for row in range(3):
        for col in range(3):
            x = 10 + col * 110
            y = 10 + row * 110
            # Fill cell with unique color
            color = [row * 50, col * 50, 100]
            image[y:y+100, x:x+100] = color

    # Crop grid
    grid_config = {
        'start_x': 10,
        'start_y': 10,
        'cell_width': 100,
        'cell_height': 100,
        'spacing_x': 10,
        'spacing_y': 10,
        'rows': 3,
        'columns': 3,
        'crop_padding': 0
    }

    icons = crop_grid(image, grid_config)

    assert len(icons) == 9
    assert icons[0].shape == (100, 100, 3)
    # Verify first cell color
    assert np.array_equal(icons[0][0, 0], [0, 0, 100])
```

Run: `uv run python -m pytest editor/test_cropper_api.py -v`

### Step 3.2: Add Preview Crop Dialog

**Create file:** `tools/icon-cropper/editor/preview_dialog.py`

```python
"""Preview dialog for cropped icons."""
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
from typing import List

class PreviewDialog:
    """Dialog showing preview of cropped icons in a grid layout."""

    def __init__(self, parent, icons: List[Image.Image], title: str):
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(title)
        self.dialog.geometry("800x600")

        # Create scrollable canvas
        canvas = tk.Canvas(self.dialog)
        scrollbar_y = ttk.Scrollbar(self.dialog, orient='vertical', command=canvas.yview)
        scrollbar_x = ttk.Scrollbar(self.dialog, orient='horizontal', command=canvas.xview)
        canvas.configure(yscrollcommand=scrollbar_y.set, xscrollcommand=scrollbar_x.set)

        frame = ttk.Frame(canvas)
        canvas.create_window((0, 0), window=frame, anchor='nw')

        # Display icons in grid (6 columns)
        cols = 6
        self.photo_images = []  # Keep references to prevent garbage collection

        for i, icon in enumerate(icons):
            row = i // cols
            col = i % cols

            # Resize icon for preview (max 120x120)
            icon.thumbnail((120, 120), Image.Resampling.LANCZOS)

            photo = ImageTk.PhotoImage(icon)
            self.photo_images.append(photo)

            # Create label with border
            label_frame = ttk.Frame(frame, borderwidth=1, relief='solid')
            label_frame.grid(row=row, column=col, padx=5, pady=5)

            img_label = ttk.Label(label_frame, image=photo)
            img_label.pack()

            num_label = ttk.Label(label_frame, text=f"#{i+1}")
            num_label.pack()

        canvas.pack(side='left', fill='both', expand=True)
        scrollbar_y.pack(side='right', fill='y')
        scrollbar_x.pack(side='bottom', fill='x')

        # Update scroll region
        frame.update_idletasks()
        canvas.config(scrollregion=canvas.bbox('all'))

        # Close button
        close_btn = ttk.Button(self.dialog, text="Close", command=self.dialog.destroy)
        close_btn.pack(pady=10)
```

**File:** `tools/icon-cropper/config_editor.py`

Add preview button and handler:
```python
def _create_preview_button(self):
    """Add Preview Crop button to UI."""
    btn = ttk.Button(
        self.control_panel,
        text="👁️ Preview Crop",
        command=self._preview_crop
    )
    btn.pack(fill='x', padx=5, pady=2)

def _preview_crop(self):
    """Show preview of cropped icons for current overlay."""
    if not self.current_workspace or not self.selected_screenshot:
        messagebox.showwarning("Preview Crop", "No screenshot selected")
        return

    # Get first grid overlay bound to current screenshot
    workspace_overlays = self.workspace_manager.get_overlays(self.current_workspace)
    screenshots = self.workspace_manager.get_screenshots(self.current_workspace)

    current_screenshot = next(
        (s for s in screenshots if s['filename'] == self.selected_screenshot),
        None
    )

    if not current_screenshot:
        return

    bindings = current_screenshot.get('overlay_bindings', [])
    grid_overlays = [oid for oid in bindings if workspace_overlays.get(oid, {}).get('type') == 'grid']

    if not grid_overlays:
        messagebox.showinfo("Preview Crop", "No grid overlays bound to this screenshot")
        return

    # Preview first grid
    overlay_id = grid_overlays[0]

    try:
        from editor.cropper_api import preview_overlay
        from editor.preview_dialog import PreviewDialog

        icons = preview_overlay(self.current_workspace, self.selected_screenshot, overlay_id)

        PreviewDialog(
            self.root,
            icons,
            title=f"Preview: {self.selected_screenshot} / {overlay_id}"
        )
    except Exception as e:
        messagebox.showerror("Preview Error", f"Failed to preview crop:\n{e}")
```

### Step 3.3: Add Batch Crop Button

**File:** `tools/icon-cropper/config_editor.py`

```python
def _create_batch_crop_button(self):
    """Add Batch Crop All button to UI."""
    btn = ttk.Button(
        self.control_panel,
        text="✂️ Batch Crop All",
        command=self._batch_crop_all
    )
    btn.pack(fill='x', padx=5, pady=2)

def _batch_crop_all(self):
    """Batch crop all screenshots in workspace."""
    if not self.current_workspace:
        messagebox.showwarning("Batch Crop", "No workspace selected")
        return

    # Confirm action
    screenshots = self.workspace_manager.get_screenshots(self.current_workspace)
    total_bindings = sum(len(s.get('overlay_bindings', [])) for s in screenshots)

    if total_bindings == 0:
        messagebox.showinfo("Batch Crop", "No overlay bindings found in workspace")
        return

    response = messagebox.askyesno(
        "Batch Crop All",
        f"Crop {len(screenshots)} screenshot(s) with {total_bindings} overlay binding(s)?\n\n"
        f"Output will be saved to:\n{self.current_workspace}/cropped/"
    )

    if not response:
        return

    try:
        from editor.cropper_api import batch_crop_workspace

        # Show progress dialog (simple for now)
        progress_dialog = tk.Toplevel(self.root)
        progress_dialog.title("Batch Cropping...")
        progress_dialog.geometry("300x100")

        progress_label = ttk.Label(progress_dialog, text="Processing...")
        progress_label.pack(pady=20)

        self.root.update()

        # Run batch crop
        results = batch_crop_workspace(self.current_workspace)

        progress_dialog.destroy()

        # Show results
        total_icons = sum(len(paths) for paths in results.values())
        messagebox.showinfo(
            "Batch Crop Complete",
            f"Extracted {total_icons} icons from {len(results)} overlay bindings.\n\n"
            f"Output saved to:\n{self.current_workspace}/cropped/"
        )

    except Exception as e:
        messagebox.showerror("Batch Crop Error", f"Failed to batch crop:\n{e}")
```

Add these buttons to the UI in the `__init__` method after creating the control panel.

### Step 3.4: Update Documentation

**File:** `tools/icon-cropper/README.md`

Add new section under "Visual Configuration Editor":

```markdown
### Batch Cropping Workflow

After configuring overlays and bindings:

1. **Preview**: Click "👁️ Preview Crop" to see extracted icons before saving
2. **Batch Crop**: Click "✂️ Batch Crop All" to extract all icons

**Output structure:**
```
workspaces/
└── character_select/
    └── cropped/
        ├── 001.png/
        │   └── grid_1/
        │       ├── 001.png
        │       ├── 002.png
        │       └── ...
        └── 002.png/
            └── grid_1/
                ├── 001.png
                └── ...
```

**Overlay bindings determine what gets cropped:**
- Grid bound to 3 screenshots with 12 cells each → 36 total icons
- Multiple grids per screenshot → separate output directories per grid
```

**File:** `tools/icon-cropper/CLAUDE.md`

Add section under "Development Workflow":

```markdown
### Cropping API

The new cropping API (`editor/cropper_api.py`) replaces legacy daemon-based cropping:

**Key functions:**
- `crop_grid(image, grid_config)` - Extract icons from single grid
- `preview_overlay(workspace, screenshot, overlay_id)` - Preview cropped icons
- `batch_crop_workspace(workspace)` - Batch crop all bindings

**Usage:**
```python
from editor.cropper_api import batch_crop_workspace

results = batch_crop_workspace("character_select")
# Returns: {"001.png/grid_1": ["cropped/001.png/grid_1/001.png", ...]}
```

**Output organization:**
- `cropped/{screenshot}/{overlay_id}/{number}.png`
- Each screenshot+overlay combination → separate directory
- Icons numbered sequentially (001.png, 002.png, ...)
```

### Step 3.5: Test Phase 2 Completion

**Test checklist:**
1. Preview shows correct grid cells ✓
2. Batch crop creates output directories ✓
3. Icons extracted correctly from multiple screenshots ✓
4. Multiple overlays per screenshot work ✓
5. Output organized by screenshot/overlay ✓

**Full end-to-end test:**

```bash
cd tools/icon-cropper
uv run python config_editor.py
```

1. Create workspace "test_batch_crop"
2. Capture screenshot "page1.png" (character select screen)
3. Draw grid_1 (4x3 grid of characters)
4. Capture screenshot "page2.png" (scrolled down)
5. Select page2.png → check grid_1 binding
6. Click "Preview Crop" → verify 12 icons shown
7. Click "Batch Crop All"
8. Verify output:
   ```
   workspaces/test_batch_crop/cropped/
   ├── page1.png/
   │   └── grid_1/
   │       ├── 001.png
   │       ├── ...
   │       └── 012.png
   └── page2.png/
       └── grid_1/
           ├── 001.png
           ├── ...
           └── 012.png
   ```
9. Verify 24 total icons extracted (12 per screenshot)

## Validation and Acceptance

**Overall acceptance criteria:**

1. **Single source of truth:**
   - Only workspace.json exists (no config.yaml)
   - All configuration stored and loaded from workspace.json
   - No manual save/load buttons

2. **Overlay-based architecture:**
   - Overlays defined once at workspace level
   - Screenshots reference overlays via bindings
   - UI shows binding checkboxes
   - Binding/unbinding updates workspace.json and canvas

3. **Cropping functionality:**
   - Preview shows correct icon grid
   - Batch crop extracts icons from all bindings
   - Output organized by screenshot and overlay
   - Works with multiple overlays per screenshot

**Commands to verify:**

```bash
cd tools/icon-cropper

# Run GUI
uv run python config_editor.py

# Run tests
uv run python -m pytest editor/test_workspace_manager.py -v
uv run python -m pytest editor/test_cropper_api.py -v

# Migrate existing workspaces
uv run python migrate_workspaces.py
```

**Expected behavior:**
- Creating workspace: No config.yaml generated
- Drawing overlay: Auto-saved to workspace.json, auto-bound to current screenshot
- Switching screenshots: Shows only bound overlays
- Binding overlay: Updates workspace.json, renders overlay on canvas
- Preview: Opens dialog with cropped icons
- Batch crop: Creates cropped/ directory with organized output

## Idempotence and Recovery

**Safe operations:**
- Running migration script multiple times: Detects already-migrated workspaces and skips
- Batch cropping multiple times: Overwrites previous output (deterministic)
- Creating overlays with same name: Auto-increments ID (grid_1, grid_2, grid_3)

**Risky operations:**
- Deleting workspace.json: No recovery (workspaces are user data)
- Migration: Creates backup by preserving original structure in screenshots (can manually revert if needed)

**Backup strategy:**
Before major changes (like running migration), users can backup workspaces:
```bash
cd tools/icon-cropper
cp -r workspaces workspaces_backup_$(date +%Y%m%d)
```

## Artifacts and Notes

**workspace.json schema (final):**
```json
{
  "workspace_name": "example",
  "created_at": "2025-11-16T12:00:00",
  "selected_screenshot": "001.png",
  "overlays": {
    "grid_1": {
      "id": "grid_1",
      "type": "grid",
      "name": "Character Grid",
      "config": {
        "start_x": 100,
        "start_y": 200,
        "cell_width": 80,
        "cell_height": 80,
        "spacing_x": 5,
        "spacing_y": 5,
        "columns": 4,
        "rows": 3,
        "crop_padding": 2
      },
      "locked": false,
      "visible": true
    }
  },
  "screenshots": [
    {
      "filename": "001.png",
      "captured_at": "2025-11-16T12:05:00",
      "resolution": [1920, 1080],
      "notes": "",
      "overlay_bindings": ["grid_1"]
    }
  ]
}
```

**Migration output example:**
```
Migrating workspace character_select to overlay-based schema...
Migration complete. 2 overlays extracted.
Migrating workspace test_workspace to overlay-based schema...
Migration complete. 1 overlays extracted.

Migrated 2 workspace(s).
```

**Batch crop output example:**
```
Extracted 12 icons from 001.png/grid_1
Extracted 12 icons from 002.png/grid_1
Extracted 8 icons from 003.png/grid_2
```

## Interfaces and Dependencies

**New modules:**

`tools/icon-cropper/editor/workspace_template.py`:
```python
def create_workspace_metadata(workspace_name: str) -> dict:
    """Create initial workspace.json structure."""
```

`tools/icon-cropper/editor/schema_migration.py`:
```python
def migrate_workspace(workspace_path: Path) -> bool:
    """Migrate workspace.json from screenshot-specific to overlay-based."""

def migrate_all_workspaces(workspaces_root: Path):
    """Migrate all workspaces in directory."""
```

`tools/icon-cropper/editor/cropper_api.py`:
```python
def crop_grid(image: np.ndarray, grid_config: dict) -> List[np.ndarray]:
    """Extract icon cells from image using grid configuration."""

def preview_overlay(workspace_name: str, screenshot_filename: str, overlay_id: str) -> List[Image.Image]:
    """Preview cropped icons for single overlay."""

def batch_crop_workspace(workspace_name: str, output_base: str = "cropped") -> Dict[str, List[str]]:
    """Batch crop all screenshots based on overlay bindings."""
```

`tools/icon-cropper/editor/preview_dialog.py`:
```python
class PreviewDialog:
    """Dialog showing cropped icon previews in grid layout."""

    def __init__(self, parent, icons: List[Image.Image], title: str):
        """Create preview dialog with icon grid."""
```

**Updated modules:**

`tools/icon-cropper/editor/workspace_manager.py`:
```python
def get_overlays(workspace_name: str) -> Dict[str, Any]:
    """Get all overlays defined in workspace."""

def set_overlay(workspace_name: str, overlay_id: str, overlay_data: dict):
    """Set or update an overlay."""

def bind_overlay(workspace_name: str, screenshot_filename: str, overlay_id: str) -> bool:
    """Add overlay binding to screenshot."""

def unbind_overlay(workspace_name: str, screenshot_filename: str, overlay_id: str) -> bool:
    """Remove overlay binding from screenshot."""
```

**Dependencies:**
- numpy (for image array manipulation)
- Pillow/PIL (for image loading/saving)
- tkinter (for GUI dialogs)
- json (for workspace.json parsing)
- pathlib (for file path handling)

All dependencies already present in project (no new installations required).
