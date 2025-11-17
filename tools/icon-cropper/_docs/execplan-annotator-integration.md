# Integrate Icon Annotator into Main GUI Workflow

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md`.


## Purpose / Big Picture

Currently, the icon-cropper tool can extract icons from screenshots using grid overlays, but there is no way to assign names to those icons within the GUI. Users must use a separate command-line tool (`annotator.py`) which expects a flat directory structure incompatible with the new workspace system.

After this change, users will be able to click a button in the main GUI to open an annotation dialog that:
1. Shows all cropped icons from the current workspace
2. Allows importing a CSV file and selecting which column contains icon names
3. Allows assigning names to icons via dropdown selection
4. Validates assignments (checks for duplicates, ensures all icons have names)
5. Saves annotated icons to a user-selected output directory

The user will see this working by: (1) running batch crop on a workspace, (2) clicking "Annotate Icons", (3) importing a CSV file and selecting the name column, (4) selecting names from dropdowns for each icon, (5) choosing an output directory, and (6) clicking "Save" to export icons with proper filenames.


## Progress

- [x] Research current annotator implementation and dependencies (2025-11-17)
- [x] Design AnnotationDialog UI structure (2025-11-17)
- [x] Create AnnotationDialog class with icon grid display (2025-11-17)
- [x] Add CSV import UI (file picker + column selector) (2025-11-17)
- [x] Add name selection dropdowns to icon grid (2025-11-17)
- [x] Add output directory selector (2025-11-17)
- [x] Implement save functionality (copy icons to user-selected directory) (2025-11-17)
- [x] Add "Annotate Icons" button to main GUI (2025-11-17)
- [x] Add menu item (Tools → Annotate Icons) with Ctrl+A shortcut (2025-11-17)
- [x] Add action buttons to left panel (Preview, Batch Crop, Annotate) (2025-11-17)
- [x] Fix bug: Save was using sequential numbers instead of selected names (2025-11-17)
- [x] Test with real workspace data (2025-11-17)
- [x] Update CLAUDE.md with new workflow (2025-11-17)


## Surprises & Discoveries

**2025-11-17: Phase 1 completed faster than expected**
- Created complete AnnotationDialog in single implementation pass
- Followed crop_preview_dialog.py pattern closely for consistency
- Module structure:
  - 464 lines including full CSV import, icon grid, and save logic
  - Uses standard library only (csv, tkinter, PIL, shutil, pathlib)
  - 4-column icon grid with thumbnails and dropdowns
  - Comprehensive validation (CSV imported, column selected, output dir selected, all icons assigned)
  - Duplicate name warning (allows but warns user)
  - Overwrite confirmation for existing files
- Module loads successfully on first try

**2025-11-17: Added manual input mode as default option**
- User requested manual input be the default, with CSV import as optional
- Implemented dual-mode input system with radio buttons:
  - **Manual Input (default)**: ScrolledText widget where users type names (one per line), then click "Load Names" button
  - **CSV Import (optional)**: Original CSV import workflow with column selector
- UI dynamically shows/hides relevant widgets based on mode selection
- Final module: 585 lines, fully backward compatible with CSV workflow
- Validation logic updated to handle both input modes seamlessly

**2025-11-17: Integration into main GUI completed with bug fix**
- Added menu item, keyboard shortcut (Ctrl+A), and action buttons in left panel
- **Bug discovered during user testing**: Save function was using sequential filenames (001.png, 002.png) instead of selected names
  - Root cause: Lines 503 and 525 used `f"{i+1:03d}.png"` instead of `f"{name}.png"`
  - Fixed in 3 locations: overwrite check, actual save, and success message
  - Success message now shows example filenames (e.g., "char-001.png, char-002.png, ...")
- UI integration complete: Tools menu + left panel "Actions" section
- Pre-flight checks implemented: workspace validation, cropped icons check


## Decision Log

- Decision: Use dialog approach (Option B) instead of separate window (Option A)
  Rationale: Better UX, integrated workflow, no temp files needed
  Date: 2025-11-17
  Author: Claude (user-requested)

- Decision: Make annotation dialog general-purpose (CSV import + column selector + output directory selector)
  Rationale: Tool shouldn't be tied to specific project structure; users may have different CSV formats, different column names, different output paths
  Date: 2025-11-17
  Author: User-requested

- Decision: Manual input as default mode, CSV import as optional
  Rationale: Manual input is simpler for small datasets (no need to create CSV file first); CSV import still available for bulk operations
  Date: 2025-11-17
  Author: User-requested
  Implementation: Radio buttons to switch between modes, only one visible at a time

- Decision: Add workflow action buttons to left panel
  Rationale: Make the complete workflow more discoverable in the GUI (Preview → Batch Crop → Annotate)
  Date: 2025-11-17
  Author: User-requested
  Implementation: New "Actions" section in left panel with all three buttons, duplicating menu items for better UX


## Outcomes & Retrospective

**Completed: 2025-11-17**

### What Went Well

1. **Clean separation of concerns**: The AnnotationDialog is completely standalone and can be launched from anywhere with just `show_annotation_dialog(parent, workspace_name)`. No tight coupling to main GUI.

2. **Dual input modes**: Supporting both manual input (default) and CSV import (optional) made the tool flexible for different use cases without overcomplicating the UI.

3. **User testing caught critical bug early**: The sequential filename bug (001.png instead of actual names) was discovered during initial user testing, not in production.

4. **Left panel action buttons**: Adding Preview/Batch Crop/Annotate buttons to left panel significantly improved workflow discoverability. Users can now see the complete workflow at a glance.

5. **Validation everywhere**: Pre-flight checks (cropped icons exist), input validation (names loaded, directory selected), and Pydantic workspace validation all worked together to prevent errors.

### What Could Be Improved

1. **Earlier testing would have caught the filename bug**: The bug was in the initial implementation and only caught during integration testing. Unit tests for the save function could have caught this.

2. **Icon preview thumbnails could be larger**: Current 4-column grid shows small thumbnails. For some games with detailed icons, larger previews might be helpful.

3. **No undo for annotation**: Once icons are saved, there's no easy way to "undo" and reassign names. Users must delete output files and re-annotate.

### Lessons Learned

1. **User testing is essential**: The filename bug seemed obvious in hindsight, but wasn't caught during implementation because I was focused on the UI workflow, not the output format.

2. **Variable names matter**: Using `i` in the loop made it easy to accidentally use `i+1` instead of `name`. More explicit variable naming would have helped.

3. **Success messages should show examples**: The original success message ("Saved 35 icons") didn't show what the filenames looked like. Adding examples ("char-001.png, char-002.png, ...") made it much clearer.

4. **Discoverability > Minimalism**: Initially I only added the menu item. User requested action buttons in left panel, which makes the workflow much more discoverable for new users.

### Metrics

- **Implementation time**: ~4 hours (Phase 1: dialog creation, Phase 2: integration, Phase 3: bug fix + documentation)
- **Lines of code**: 585 lines (annotation_dialog.py)
- **Files modified**: 4 files (annotation_dialog.py [new], config_editor.py, ui_builder.py, CLAUDE.md)
- **Test coverage**: Manual testing with real workspace data (CSV import + manual input modes)

### Future Enhancements

1. **Annotation state persistence**: Save name assignments to workspace.json so users can resume annotation later
2. **Bulk rename**: Select multiple icons and assign sequential names (char-001, char-002, ...)
3. **Filename templates**: User-configurable templates like `{name}_{index}.png` or `icon_{name}.png`
4. **Preview output filenames**: Show what each icon will be named before saving
5. **Drag-and-drop CSV import**: More intuitive than file picker
6. **Export annotations to CSV**: Save name assignments for documentation/reference

### Impact

This feature completes the icon-cropper workflow. Users can now go from screenshot → cropped icons → properly named icons ready for use in projects, all within the same GUI. No need to switch to command-line tools or manually rename files.


## Context and Orientation

The icon-cropper tool has two main components that are currently separate:

1. **Workspace system** (`workspaces/` directory):
   - Each workspace (e.g., `character_select`) contains screenshots and grid configurations
   - Batch crop saves icons to: `workspaces/{workspace}/cropped/{screenshot}/{overlay}/NNN.png`
   - Example: `workspaces/character_select/cropped/003.png/grid_1/001.png`

2. **Annotator system** (`annotator.py`):
   - Standalone Tkinter application launched via command line
   - Expects flat directory: `temp/session/NNN.png`
   - Loads icon names from a CSV file
   - Saves annotated icons to a specified output directory

The main GUI is in `config_editor.py`, which uses `ui_builder.py` to create the interface. The batch crop functionality is in `editor/cropper_api.py` and uses a preview dialog in `editor/crop_preview_dialog.py`.

**Key files:**
- `annotator.py` - Current standalone annotator (reference for UI patterns)
- `config_editor.py` - Main GUI orchestrator (will add button and dialog launching)
- `ui_builder.py` - UI component builder (will add "Annotate" button)
- `editor/crop_preview_dialog.py` - Example dialog structure to follow


## Plan of Work

We will create a new `AnnotationDialog` class that integrates annotation functionality directly into the main GUI. The dialog will work with the workspace directory structure and allow flexible CSV import and output directory selection.

**Phase 1: Create AnnotationDialog module**

Create `editor/annotation_dialog.py` based on the structure of `crop_preview_dialog.py`. The dialog will:
- Accept a workspace name and list of cropped icon directories
- Display icons in a scrollable grid (4 columns)
- Provide UI for CSV import and column selection
- Show name selection dropdown for each icon
- Provide output directory selector
- Implement save functionality that copies icons to selected directory

**Phase 2: Add CSV import UI**

Create UI components for CSV import:
- "Import CSV" button that opens file picker (supports .csv files)
- Parse CSV using Python's `csv` module
- Column selector dropdown (shows all column headers from CSV)
- Name list display showing selected column values
- Validation: Check for empty names, duplicate names

**Phase 3: Add output directory selector**

Add directory selection UI:
- "Output Directory" field with Browse button
- Uses `tkinter.filedialog.askdirectory()`
- Shows selected path in entry field
- Validates directory exists (or creates if needed)
- Shows filename preview (e.g., "001.png, 002.png, ...")

**Phase 4: Add UI integration**

Update `ui_builder.py` to add annotation button:
- Add button in Tools menu: "Annotate Icons..."
- Place near "Batch Crop All" button for workflow clarity

Update `config_editor.py` to handle annotation:
- Add callback `_on_annotate_icons()`
- Check if workspace has cropped icons before opening dialog
- Launch `AnnotationDialog` with workspace name
- Show success/error messages after save


## Concrete Steps

### Step 1: Create AnnotationDialog module

Create file `editor/annotation_dialog.py` with class structure:

```python
class AnnotationDialog:
    def __init__(self, parent, workspace_name, workspaces_root):
        # Initialize dialog
        # Gather cropped icons
        # Build UI (CSV import, icon grid, output selector)

    def _gather_cropped_icons(self):
        # Scan workspace cropped/ directory
        # Return list of (icon_path, display_label)

    def _build_ui(self):
        # Create CSV import section (Import button + column selector)
        # Create scrollable icon grid with name dropdowns
        # Create output directory selector
        # Add Save/Cancel buttons

    def _on_import_csv(self):
        # Open file picker for CSV
        # Parse CSV and extract headers
        # Populate column selector dropdown

    def _on_column_selected(self):
        # Read selected column from CSV
        # Populate name dropdowns in icon grid
        # Validate names (no empties, warn on duplicates)

    def _on_browse_output(self):
        # Open directory picker
        # Update output path field

    def _on_save(self):
        # Validate: CSV imported, output directory selected, all icons assigned
        # Copy annotated icons to output directory
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
5. User clicks "Import CSV" and selects a CSV file
6. User selects which column contains icon names
7. Name dropdowns populate with values from selected column
8. User selects output directory
9. Saving copies icons to selected directory with proper filenames


## Validation and Acceptance

**Acceptance criteria:**

1. **Icon discovery works correctly**
   - Open workspace with cropped icons
   - Click "Tools → Annotate Icons"
   - Dialog shows all icons from `cropped/{screenshot}/{overlay}/` directories
   - Each icon displays with label: "Screenshot {name} / {overlay} / Icon {N}"

2. **CSV import works**
   - Click "Import CSV" button opens file picker
   - Selecting CSV file loads headers into column selector dropdown
   - Column selector shows all column names from CSV header row
   - Selecting a column populates name dropdowns with values from that column
   - Empty values in CSV show warning

3. **Name assignment works**
   - Each icon has dropdown showing imported names
   - Selecting name updates annotation state
   - Duplicate assignments show warning dialog (but allow if intentional)
   - Unassigned icons show placeholder: "(Select name)"

4. **Output directory selection works**
   - "Output Directory" field shows current selection
   - "Browse" button opens directory picker
   - Selected path displays in entry field
   - Invalid/non-existent paths show error

5. **Save functionality works**
   - Click "Save" button validates all requirements
   - Icons copy to selected directory with format: `{NNN}.png`
   - Existing files prompt for overwrite confirmation
   - Success message shows count and destination: "Saved 12 icons to C:\output\path"

6. **Error handling works**
   - Empty workspace shows: "No cropped icons found. Run batch crop first."
   - Save without CSV import shows: "Please import a CSV file first."
   - Save without output directory shows: "Please select an output directory."
   - Save with unassigned icons shows: "Please assign names to all icons."
   - Save failures show specific error messages

**Test procedure:**

```bash
# 1. Prepare test workspace
cd tools/icon-cropper
uv run python config_editor.py

# 2. In GUI: Create workspace "test_annotation"
# 3. Add screenshot, draw grid, run batch crop
# 4. Click Tools → Annotate Icons
# 5. Click "Import CSV" and select a test CSV file
# 6. Select a column from the dropdown (e.g., "id" or "name")
# 7. Assign names to 3-4 icons from dropdowns
# 8. Click "Browse" and select output directory
# 9. Click Save
# 10. Verify files in selected output directory

# 11. Re-open annotation dialog
# 12. Verify "Overwrite existing" checkboxes appear
# 13. Test overwrite functionality
```

Expected terminal output after save:
```
Saved 4 icons to C:\output\directory
  001.png (icon_name_1)
  002.png (icon_name_2)
  003.png (icon_name_3)
  004.png (icon_name_4)
```


## Idempotence and Recovery

The annotation dialog is safe to open multiple times:
- Reading cropped icons is read-only (no modifications)
- CSV import has no side effects (just reads file)
- Save operation prompts for overwrite (no accidental overwrites)

If dialog is closed without saving:
- No changes are made to workspace or output directory
- Re-opening dialog starts fresh (no annotation state persisted)

If save fails partway through:
- Successfully saved icons remain in output directory
- Failed icons stay in workspace cropped/
- Error message lists which icons failed
- User can retry save (idempotent operation)

Recovery from corrupted state:
- Delete icons from output directory and re-annotate
- Workspace cropped/ directory is never modified (safe source)


## Interfaces and Dependencies

**New module: `editor/annotation_dialog.py`**

```python
class AnnotationDialog:
    """Dialog for annotating cropped icons with names from CSV."""

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

    def _import_csv(self) -> None:
        """Import CSV file and extract column headers."""

    def _load_csv_column(self, column_name: str) -> List[str]:
        """Load values from selected CSV column."""


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

Standard library imports:
- `csv` - For parsing CSV files
- `tkinter.filedialog` - For file/directory pickers
- `pathlib.Path` - For path operations
- `shutil` - For copying icon files

New imports needed in `config_editor.py`:
```python
from editor.annotation_dialog import show_annotation_dialog
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

**Example CSV structure:**

```csv
id,name,rarity,role
char-001,Seina,4,Balancer
char-002,Dust,4,Attacker
char-003,Luna,5,Defender
```

**Example column selection:**
- User selects "id" column → dropdowns show: ["char-001", "char-002", "char-003"]
- User selects "name" column → dropdowns show: ["Seina", "Dust", "Luna"]

**Example save operation:**

```python
# Source: workspaces/character_select/cropped/003.png/grid_1/001.png
# Name selected: "char-001" (or "Seina", depending on column)
# Output directory: C:\output\icons
# Destination: C:\output\icons\001.png
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


### Milestone 2: Add CSV import and name selection functionality

**Goal:** Add CSV import UI and name selection dropdowns.

**Work:**
1. Add "Import CSV" button with file picker
2. Parse CSV and extract column headers
3. Add column selector dropdown
4. Populate name dropdowns from selected column
5. Implement selection validation (warn on duplicates, check for empties)

**Result:** Users can import CSV, select column, and assign names to icons.

**Proof:**
```bash
# In GUI:
# 1. Open annotation dialog
# 2. Click "Import CSV" button
# 3. Select a CSV file (e.g., characters.csv)
# 4. Column selector shows: ["id", "name", "rarity", "role"]
# 5. Select "name" column
# 6. Icon dropdowns populate with: ["Seina", "Dust", "Luna", ...]
# 7. Select name for an icon
# 8. Try selecting same name again → warning dialog
```

**Acceptance:**
- File picker opens and accepts .csv files
- Column selector shows all CSV headers
- Changing column updates all dropdowns
- Empty CSV values show warning
- Duplicate assignments show warning dialog (but allow)


### Milestone 3: Add output directory selector and save functionality

**Goal:** Allow user to select output directory and save annotated icons.

**Work:**
1. Add "Output Directory" field with Browse button
2. Implement directory picker using `tkinter.filedialog.askdirectory()`
3. Implement `_on_save()` method with validation
4. Add filename formatting (001.png, 002.png, ...)
5. Add overwrite detection and confirmation
6. Add progress/status messages
7. Add error handling for failed copies

**Result:** User selects output directory, clicks Save, icons copy to selected location.

**Proof:**
```bash
# Before save:
ls C:\output\directory | wc -l
# Output: 0 (or empty)

# After annotating 4 icons and clicking Save:
ls C:\output\directory
# Output: 001.png 002.png 003.png 004.png

# Check file contents match:
md5sum workspaces/character_select/cropped/003.png/grid_1/001.png
md5sum C:\output\directory\001.png
# Both should have same hash
```

**Acceptance:**
- Output directory field shows selected path
- Browse button opens directory picker
- Save validates: CSV imported, output dir selected, all icons assigned
- Icons copy to selected directory with correct filenames (001.png, 002.png, ...)
- Existing files show overwrite confirmation
- Success message shows count and destination path
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

# 1. Create workspace "test_annotation"
# 2. Add screenshot
# 3. Draw grid overlay
# 4. Run batch crop (Tools → Batch Crop All)
# 5. Click Tools → Annotate Icons (or Ctrl+A)
# 6. Import CSV and select column
# 7. Assign names to icons
# 8. Select output directory
# 9. Click Save
# 10. Verify success message
# 11. Check output directory
```

**Acceptance:**
- Menu item appears in Tools menu
- Keyboard shortcut (Ctrl+A) works
- Empty workspace shows helpful error: "No cropped icons found"
- Full workflow completes without errors
- Icons appear in selected output directory with correct names


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
- Use same icons for different output directories
- Maintain workspace as complete record

**Why CSV import instead of hardcoded database?**
Different users may have different data sources and formats:
- Character databases from different games
- Custom CSV exports from spreadsheets
- Different column naming conventions (id/name/label/etc.)
- Different languages and character sets

**Why column selector?**
CSV files may have multiple columns (id, name, display_name, label, etc.). Letting users choose:
- Accommodates different CSV structures
- Allows using numeric IDs or human-readable names
- Gives users control over naming scheme

**Why user-selected output directory?**
Tool shouldn't assume specific project structure:
- Users may want icons in different locations
- Different projects have different asset organization
- Some users may want to preview in temp directory first
- Allows batch exporting to multiple projects

**Why no persistence of annotation state?**
Annotation is typically one-time operation per workspace. Persisting state adds complexity:
- Need to store name assignments in workspace.json
- Need to sync state when workspace changes
- Need to handle stale/invalid names from CSV changes

Current approach is simpler: import CSV, annotate once, save, done.

**Future enhancement:** Could add annotation state persistence to workspace.json if users request it.
