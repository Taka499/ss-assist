# Integrate Icon Annotator into Main GUI Workflow

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md`.


## Purpose / Big Picture

Currently, the icon-cropper tool can extract icons from screenshots using grid overlays, but there is no way to assign character IDs to those icons within the GUI. Users must use a separate command-line tool (`annotator.py`) which expects a flat directory structure incompatible with the new workspace system.

After this change, users will be able to click a button in the main GUI to open an annotation dialog that:
1. Shows all cropped icons from the current workspace
2. Allows assigning character IDs via dropdown selection
3. Validates assignments against the character database
4. Saves annotated icons directly to the project asset directory

The user will see this working by: (1) running batch crop on a workspace, (2) clicking "Annotate Icons", (3) selecting character IDs from dropdowns, and (4) clicking "Save" to export icons to `../../assets/characters/` with proper filenames.


## Progress

- [ ] Research current annotator implementation and dependencies
- [ ] Design AnnotationDialog UI structure
- [ ] Create AnnotationDialog class with icon grid display
- [ ] Integrate character database (csv_loader.py) into main GUI
- [ ] Add character selection dropdowns to icon grid
- [ ] Implement save functionality (copy icons to project assets)
- [ ] Add "Annotate Icons" button to main GUI
- [ ] Test with real workspace data
- [ ] Update CLAUDE.md with new workflow


## Surprises & Discoveries

(To be filled during implementation)


## Decision Log

- Decision: Use dialog approach (Option B) instead of separate window (Option A)
  Rationale: Better UX, integrated workflow, no temp files needed
  Date: 2025-11-17
  Author: Claude (user-requested)


## Outcomes & Retrospective

(To be filled at completion)


## Context and Orientation

The icon-cropper tool has two main components that are currently separate:

1. **Workspace system** (`workspaces/` directory):
   - Each workspace (e.g., `character_select`) contains screenshots and grid configurations
   - Batch crop saves icons to: `workspaces/{workspace}/cropped/{screenshot}/{overlay}/NNN.png`
   - Example: `workspaces/character_select/cropped/003.png/grid_1/001.png`

2. **Annotator system** (`annotator.py`):
   - Standalone Tkinter application launched via command line
   - Expects flat directory: `temp/session/NNN.png`
   - Loads character database from `../../data-sources/stellasora - characters.csv`
   - Saves annotated icons to `../../assets/characters/NNN.png`

The main GUI is in `config_editor.py`, which uses `ui_builder.py` to create the interface. The batch crop functionality is in `editor/cropper_api.py` and uses a preview dialog in `editor/crop_preview_dialog.py`.

**Key files:**
- `annotator.py` - Current standalone annotator (will be refactored)
- `csv_loader.py` - Character database loader (will be reused)
- `utils.py` - Utility functions including filename formatting (will be reused)
- `config_editor.py` - Main GUI orchestrator (will add button and dialog launching)
- `ui_builder.py` - UI component builder (will add "Annotate" button)
- `editor/crop_preview_dialog.py` - Example dialog structure to follow


## Plan of Work

We will create a new `AnnotationDialog` class that integrates annotation functionality directly into the main GUI. The dialog will work with the workspace directory structure, eliminating the need for temporary flat directories.

**Phase 1: Create AnnotationDialog module**

Create `editor/annotation_dialog.py` based on the structure of `crop_preview_dialog.py`. The dialog will:
- Accept a workspace name and list of cropped icon directories
- Load the character database on initialization
- Display icons in a scrollable grid (4 columns)
- Show character selection dropdown for each icon
- Implement save functionality that copies icons to project assets

**Phase 2: Integrate character database**

Reuse existing `csv_loader.py` and `utils.py` modules:
- Import `CharacterDatabase` and `load_characters()` from `csv_loader.py`
- Import `format_filename()` from `utils.py`
- Load CSV path from project root: `../../data-sources/stellasora - characters.csv`

**Phase 3: Add UI integration**

Update `ui_builder.py` to add annotation button:
- Add button in Tools menu: "Annotate Icons..."
- Place near "Batch Crop All" button for workflow clarity

Update `config_editor.py` to handle annotation:
- Add callback `_on_annotate_icons()`
- Check if workspace has cropped icons before opening dialog
- Launch `AnnotationDialog` with workspace name
- Show success/error messages after save

**Phase 4: Handle workspace directory structure**

Create helper function to gather all cropped icons from workspace:
- Scan `workspaces/{workspace}/cropped/` for all `{screenshot}/{overlay}/` directories
- Collect icon paths into list: `[(icon_path, display_name), ...]`
- Display name format: "Screenshot 003 / Grid 1 / Icon 12"


## Concrete Steps

### Step 1: Create AnnotationDialog module

Create file `editor/annotation_dialog.py` with class structure:

```python
class AnnotationDialog:
    def __init__(self, parent, workspace_name, workspaces_root):
        # Initialize dialog
        # Load character database
        # Gather cropped icons
        # Build UI

    def _gather_cropped_icons(self):
        # Scan workspace cropped/ directory
        # Return list of (icon_path, display_label)

    def _build_ui(self):
        # Create scrollable icon grid
        # Add character dropdowns
        # Add Save/Cancel buttons

    def _on_save(self):
        # Copy annotated icons to project assets
        # Show success message
```

Working directory: `tools/icon-cropper/`

Run after creation:
```bash
uv run python -c "from editor.annotation_dialog import AnnotationDialog; print('Module loads successfully')"
```

Expected: No import errors


### Step 2: Add annotation button to GUI

Edit `editor/ui_builder.py` in the `create_menu_bar()` method:

Add menu item after "Batch Crop All":
```python
tools_menu.add_command(
    label="🏷️ Annotate Icons...",
    command=self.callbacks['annotate_icons'],
    accelerator="Ctrl+A"
)
```

Edit `config_editor.py` in `__init__()`:

Add callback to UIBuilder initialization:
```python
callbacks = {
    # ... existing callbacks ...
    'annotate_icons': self._on_annotate_icons,
}
```

Add callback method:
```python
def _on_annotate_icons(self):
    # Check if workspace has cropped icons
    # Launch AnnotationDialog
    # Show result message
```


### Step 3: Test with existing workspace

Working directory: `tools/icon-cropper/`

Run the GUI:
```bash
uv run python config_editor.py
```

Expected behavior:
1. GUI opens with "Tools" menu
2. Menu shows "🏷️ Annotate Icons..." option
3. Clicking it opens annotation dialog
4. Dialog shows cropped icons from current workspace
5. Character dropdowns show character list from CSV
6. Saving copies icons to `../../assets/characters/`


## Validation and Acceptance

**Acceptance criteria:**

1. **Icon discovery works correctly**
   - Open workspace with cropped icons
   - Click "Tools → Annotate Icons"
   - Dialog shows all icons from `cropped/{screenshot}/{overlay}/` directories
   - Each icon displays with label: "Screenshot {name} / {overlay} / Icon {N}"

2. **Character selection works**
   - Each icon has dropdown with character IDs
   - Dropdown shows display names: "セイナ (Seina) | ★4 | Balancer"
   - Selecting character updates annotation state
   - Duplicate assignments show warning dialog

3. **Save functionality works**
   - Click "Save" button
   - Icons copy to `../../assets/characters/{NNN}.png`
   - Existing files prompt for overwrite confirmation
   - Success message shows count: "Saved 12 icons to assets/characters/"

4. **Error handling works**
   - Empty workspace shows: "No cropped icons found. Run batch crop first."
   - Missing CSV shows: "Character database not found at {path}"
   - Save failures show specific error messages

**Test procedure:**

```bash
# 1. Prepare test workspace
cd tools/icon-cropper
uv run python config_editor.py

# 2. In GUI: Create workspace "test_annotation"
# 3. Add screenshot, draw grid, run batch crop
# 4. Click Tools → Annotate Icons
# 5. Assign character IDs to 3-4 icons
# 6. Click Save
# 7. Verify files in ../../assets/characters/

# 8. Re-open annotation dialog
# 9. Verify "Overwrite existing" checkboxes appear
# 10. Test overwrite functionality
```

Expected terminal output after save:
```
Saved 4 icons to C:\Work\GitRepos\ss-assist\assets\characters
  001.png (char-001)
  002.png (char-002)
  003.png (char-003)
  004.png (char-004)
```


## Idempotence and Recovery

The annotation dialog is safe to open multiple times:
- Reading cropped icons is read-only (no modifications)
- Character database loads from CSV (no state changes)
- Save operation prompts for overwrite (no accidental overwrites)

If dialog is closed without saving:
- No changes are made to workspace or project assets
- Re-opening dialog starts fresh (no annotation state persisted)

If save fails partway through:
- Successfully saved icons remain in assets/
- Failed icons stay in workspace cropped/
- Error message lists which icons failed
- User can retry save (idempotent operation)

Recovery from corrupted state:
- Delete icons from `../../assets/characters/` and re-annotate
- Workspace cropped/ directory is never modified (safe source)


## Interfaces and Dependencies

**New module: `editor/annotation_dialog.py`**

```python
class AnnotationDialog:
    """Dialog for annotating cropped icons with character IDs."""

    def __init__(
        self,
        parent: tk.Tk,
        workspace_name: str,
        workspaces_root: Path = Path("workspaces")
    ):
        """Initialize annotation dialog.

        Args:
            parent: Parent window
            workspace_name: Name of workspace to annotate
            workspaces_root: Root directory containing workspaces
        """

    def show(self) -> bool:
        """Show dialog and wait for user response.

        Returns:
            True if user clicked Save, False if cancelled
        """


def show_annotation_dialog(
    parent: tk.Tk,
    workspace_name: str,
    workspaces_root: Path = Path("workspaces")
) -> bool:
    """Show annotation dialog and return result.

    Args:
        parent: Parent window
        workspace_name: Name of workspace to annotate
        workspaces_root: Root directory containing workspaces

    Returns:
        True if icons were saved, False otherwise
    """
```

**Dependencies:**

Reuse existing modules:
- `csv_loader.CharacterDatabase` - Load character data from CSV
- `csv_loader.load_characters()` - Convenience function
- `utils.get_project_root()` - Get repository root for CSV path
- `utils.format_filename()` - Generate output filenames

New imports needed in `config_editor.py`:
```python
from editor.annotation_dialog import show_annotation_dialog
from csv_loader import load_characters, CharacterDatabase
from utils import get_project_root
```


## Artifacts and Notes

**Example icon gathering output:**

```python
# _gather_cropped_icons() returns:
[
    (Path("workspaces/character_select/cropped/003.png/grid_1/001.png"), "003.png / grid_1 / Icon 1"),
    (Path("workspaces/character_select/cropped/003.png/grid_1/002.png"), "003.png / grid_1 / Icon 2"),
    (Path("workspaces/character_select/cropped/004.png/grid_1/001.png"), "004.png / grid_1 / Icon 1"),
    # ... etc
]
```

**Example character dropdown data:**

```python
# CharacterDatabase.get_character_ids() returns:
["char-001", "char-002", "char-003", ...]

# CharacterDatabase.get_character_info() returns:
"セイナ (Seina) | ★4 | Balancer | Fire | Neo Arcadia"
```

**Example save operation:**

```python
# Source: workspaces/character_select/cropped/003.png/grid_1/001.png
# Character ID selected: char-001
# Destination: ../../assets/characters/001.png
# Operation: shutil.copy2(source, destination)
```


## Milestones

### Milestone 1: Create AnnotationDialog skeleton

**Goal:** Create basic dialog structure that displays cropped icons without annotation functionality.

**Work:**
1. Create `editor/annotation_dialog.py` with `AnnotationDialog` class
2. Implement `_gather_cropped_icons()` to scan workspace directory
3. Implement `_build_ui()` to show icon grid (no dropdowns yet)
4. Add scrollable canvas with mousewheel support

**Result:** Dialog opens and displays all cropped icons in a grid.

**Proof:**
```bash
uv run python -c "
from editor.annotation_dialog import AnnotationDialog
import tkinter as tk
root = tk.Tk()
dialog = AnnotationDialog(root, 'character_select')
print(f'Found {len(dialog.icons)} icons')
"
```

Expected output: `Found 12 icons` (or however many exist in workspace)

**Acceptance:**
- Dialog shows all icons from `workspaces/{workspace}/cropped/` recursively
- Icons display with labels showing screenshot/overlay/index
- Scrolling works with mousewheel


### Milestone 2: Add character selection functionality

**Goal:** Add character database integration and selection dropdowns.

**Work:**
1. Add character database loading in `__init__()`
2. Add dropdown to each icon in grid
3. Implement selection validation (check for duplicates)
4. Add character info display (shows role, rarity, etc.)

**Result:** Each icon has a dropdown to select character ID.

**Proof:**
```bash
# In GUI:
# 1. Open annotation dialog
# 2. Click any dropdown
# 3. Should see character list with display names
# 4. Select char-001
# 5. Info label updates: "セイナ (Seina) | ★4 | Balancer"
```

**Acceptance:**
- Dropdowns show all character IDs from CSV
- Selecting character updates info label
- Duplicate assignments show warning dialog
- Can select same character for multiple icons (with warning)


### Milestone 3: Implement save functionality

**Goal:** Save annotated icons to project assets directory.

**Work:**
1. Implement `_on_save()` method
2. Add filename formatting using `utils.format_filename()`
3. Add overwrite detection and confirmation
4. Add progress/status messages
5. Add error handling for failed copies

**Result:** Clicking Save copies icons to `../../assets/characters/`.

**Proof:**
```bash
# Before save:
ls ../../assets/characters/ | wc -l
# Output: 0

# After annotating 4 icons and clicking Save:
ls ../../assets/characters/
# Output: 001.png 002.png 003.png 004.png

# Check file contents match:
md5sum workspaces/character_select/cropped/003.png/grid_1/001.png
md5sum ../../assets/characters/001.png
# Both should have same hash
```

**Acceptance:**
- Icons copy to correct location with correct filenames
- Existing files show overwrite confirmation
- Success message shows count and destination
- Failed copies show error details


### Milestone 4: Integrate into main GUI

**Goal:** Add annotation button to main GUI and wire up workflow.

**Work:**
1. Add "Annotate Icons" to Tools menu in `ui_builder.py`
2. Add callback in `config_editor.py`
3. Add pre-flight checks (workspace has cropped icons)
4. Add keyboard shortcut (Ctrl+A)
5. Add status bar updates

**Result:** Users can annotate icons from main GUI workflow.

**Proof:**
```bash
# Full workflow test:
uv run python config_editor.py

# 1. Create workspace "test_char"
# 2. Add screenshot
# 3. Draw grid overlay
# 4. Run batch crop (Tools → Batch Crop All)
# 5. Click Tools → Annotate Icons (or Ctrl+A)
# 6. Assign character IDs
# 7. Click Save
# 8. Verify success message
# 9. Check assets/ directory
```

**Acceptance:**
- Menu item appears in Tools menu
- Keyboard shortcut (Ctrl+A) works
- Empty workspace shows helpful error
- Workflow completes without errors
- Icons appear in assets/ directory


## Design Decisions

**Why dialog instead of embedded panel?**
Annotation is a distinct workflow phase that happens after cropping. A modal dialog:
- Focuses user attention on annotation task
- Prevents accidental edits to workspace during annotation
- Matches pattern of existing CropPreviewDialog
- Easier to implement (less state management)

**Why copy instead of move?**
Workspace `cropped/` directory serves as source of truth. Copying preserves original icons so users can:
- Re-annotate if they make mistakes
- Use same icons for different projects
- Maintain workspace as complete record

**Why no persistence of annotation state?**
Annotation is typically one-time operation per workspace. Persisting state adds complexity:
- Need to store character_id in workspace.json
- Need to sync state when workspace changes
- Need to handle stale/invalid character IDs

Current approach is simpler: annotate once, save, done.

**Future enhancement:** Could add annotation state persistence to workspace.json if users request it.
