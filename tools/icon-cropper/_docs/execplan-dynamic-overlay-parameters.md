# ExecPlan: Refactor Spinbox UI to Dynamic Overlay Parameter Panel

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` in the repository root.

## Purpose / Big Picture

Currently, the icon-cropper configuration editor has a fixed two-tab spinbox design (Grid tab and OCR tab) that is always visible, even when no overlays exist. This design has two critical problems:

1. **Broken after overlay refactoring**: The spinboxes cannot adjust overlays because they were designed for a single overlay per type, but the new architecture supports multiple overlays (e.g., grid_1, grid_2, grid_3).

2. **Poor UX**: Fixed tabs are always visible even when there are no overlays, creating confusion about what is being edited.

After this change, users will have a **context-aware dynamic parameter panel** that:
- Shows an empty state message when no overlay is selected
- Displays grid parameters (9 spinboxes) when a grid overlay is selected
- Displays OCR parameters (4 spinboxes) when an OCR overlay is selected
- Updates the selected overlay's configuration in real-time as spinboxes change
- Synchronizes with resize handles (existing behavior)

Users can verify this works by: selecting an overlay from the overlay list → seeing the parameter panel populate with that overlay's values → changing a spinbox value → observing the overlay update on the canvas and the change persist to workspace.json.

## Progress

- [x] Phase 1: Load overlay values into spinboxes on selection (Completed 2025-11-16)
  - [x] Update _on_overlay_selected() to load selected overlay's config into spinboxes
  - [x] Add _load_overlay_into_spinboxes() helper method
  - [x] Test selecting different overlays loads their independent values
  - [x] Verify spinbox changes still update the selected overlay

- [ ] Phase 2: Create dynamic parameter panel
  - [ ] Remove existing tabbed parameter panel from ui_builder.py
  - [ ] Create _build_dynamic_parameter_panel() in ui_builder.py
  - [ ] Create _create_empty_state_panel() showing "No overlay selected"
  - [ ] Create _create_grid_params_panel() with 9 spinboxes
  - [ ] Create _create_ocr_params_panel() with 4 spinboxes
  - [ ] Add _update_parameter_panel() to swap panel content
  - [ ] Test panel swapping when selecting different overlay types

- [x] Phase 3: Wire spinbox callbacks to selected overlay (Completed 2025-11-16)
  - [x] Update _on_grid_param_changed() to read from selected_overlay_id
  - [x] Update _on_ocr_param_changed() to read from selected_overlay_id
  - [x] Update _save_current_overlays() to handle selected overlay (already handled)
  - [x] Add safety checks for None selection
  - [x] Test spinbox changes update correct overlay

- [ ] Phase 4: Integrate with drawing tools
  - [ ] Update DrawGridTool to auto-select newly created overlay
  - [ ] Update DrawOCRTool to auto-select newly created overlay
  - [ ] Test new overlay auto-selection workflow

- [ ] Phase 5: Integration testing and validation
  - [ ] Test complete workflow: draw grid → auto-select → adjust spinboxes → verify persistence
  - [ ] Test overlay switching: select grid_1 → adjust → select grid_2 → verify independent values
  - [ ] Test empty state: delete all overlays → verify "No overlay selected" message
  - [ ] Test resize handles still synchronize with spinboxes
  - [ ] Test workspace switching clears selection correctly
  - [ ] Update CLAUDE.md with new UI pattern

## Surprises & Discoveries

### Phase 1 & 3 Completed Together (2025-11-16)

During Phase 1 implementation, discovered that loading overlay values into spinboxes was only half the solution. User testing revealed spinbox changes weren't updating the selected overlay on canvas. This required implementing Phase 3 work immediately.

**Root cause**: The spinbox callbacks (`_on_grid_param_changed`, `_on_ocr_param_changed`) were only updating `self.grid_config` and `self.ocr_config` (which are used by the editors), but NOT updating the selected overlay's config in the canvas controller.

**Solution**: Updated both callbacks to:
1. Update local config (for editor state)
2. Find the selected overlay by ID
3. Copy config changes to the overlay's config dict
4. Save to workspace.json
5. Redraw canvas

**Evidence**: After changes, bidirectional sync works:
- Clicking overlay → spinboxes load that overlay's values ✓
- Adjusting spinbox → selected overlay updates on canvas ✓
- Multiple overlays maintain independent configurations ✓

This demonstrates the importance of user testing even during early phases - the bug would have been caught in Phase 3 testing anyway, but finding it in Phase 1 allowed immediate fixing.

## Decision Log

- Decision: Complete Phase 3 during Phase 1 implementation
  Rationale: User testing in Phase 1 revealed that spinbox callbacks weren't updating the selected overlay. Since the fix was straightforward (update callbacks to write to selected overlay's config), implemented Phase 3 immediately rather than deferring to later. This creates a complete, testable feature (bidirectional sync) rather than half-working functionality.
  Date: 2025-11-16
  Impact: Phases 1 and 3 completed together. Phase 2 (dynamic panel UI) remains as the next major UX improvement. The core functionality (spinbox ↔ overlay sync) now works correctly for existing two-tab UI.

- Decision: Overlay selection already uses radio buttons (no changes needed)
  Rationale: User corrected misunderstanding - overlay list already uses radio buttons (`ttk.Radiobutton` in ui_builder.py line 680). Checkboxes are for screenshot bindings, not overlay selection. This eliminates Phase 1 work originally planned for adding radio buttons.
  Date: 2025-11-16
  Impact: Simplified ExecPlan from 5 phases to 4 phases. Phase 1 now focuses on loading overlay values into spinboxes (the actual bug), not UI refactoring.

- Decision: Use dynamic panel swapping instead of show/hide tabs
  Rationale: Fixed tabs waste screen space when not relevant. Dynamic panel scales better to unlimited overlays and future overlay types. Simpler code (no tab management, just widget swapping).
  Date: 2025-11-16

- Decision: Keep auto-save behavior to workspace.json
  Rationale: Existing pattern works well. Every spinbox change immediately updates workspace.json via _save_current_overlays(). This prevents data loss and keeps workspace.json as single source of truth.
  Date: 2025-11-16

- Decision: Auto-select newly created overlays
  Rationale: After drawing a new grid/OCR region, the user's next action is typically to adjust it. Auto-selecting enables immediate adjustment without requiring manual selection from the list. Matches user intent flow.
  Date: 2025-11-16

## Outcomes & Retrospective

(To be filled at completion)

## Context and Orientation

The icon-cropper tool is a Tkinter GUI application for configuring grid-based icon extraction from game screenshots. The codebase is located in `tools/icon-cropper/`.

**Current Architecture:**

- **config_editor.py** (1335 lines): Main orchestrator that initializes all controllers and UI
- **editor/ui_builder.py** (720 lines): Creates all UI components including the parameter panel we're refactoring
- **editor/canvas_controller.py** (510 lines): Manages overlay state and rendering
- **editor/workspace_manager.py** (340 lines): Persists overlays to workspace.json
- **workspaces/{workspace_name}/workspace.json**: Single source of truth for all configuration

**Current Overlay Selection (Already Works):**

The overlay list already uses radio button selection (`ttk.Radiobutton`, line 680 in ui_builder.py):
- Single selection model with `self.overlay_selected_var`
- Calls `_on_overlay_selected(overlay_id)` when clicked (line 1134 in config_editor.py)
- Selection state stored in `self.selected_overlay_id` (line 85)

**Current Parameter Panel Design (Partially Broken):**

The existing parameter panel uses tkinter.ttk.Notebook (tabs) with two fixed tabs:
- "Grid Parameters" tab: 9 spinboxes (start_x, start_y, cell_width, cell_height, spacing_x, spacing_y, columns, rows, crop_padding)
- "OCR Parameters" tab: 4 spinboxes (x, y, width, height)

**The Two Problems:**
1. **Spinboxes don't load selected overlay's values**: When you click an overlay in the list, `_on_overlay_selected()` (line 1134-1139) only updates `selected_overlay_id` and refreshes the list. It does NOT load the overlay's config into the spinboxes!
2. **Fixed tabs always visible**: Tabs are always shown even when no overlay is selected, creating confusion about what is being edited.

**Overlay Data Model:**

Overlays are stored in workspace.json with this structure:

```json
{
  "overlays": {
    "grid_1": {
      "id": "grid_1",
      "type": "grid",
      "name": "Grid 1",
      "config": {
        "start_x": 1267,
        "start_y": 199,
        "cell_width": 160,
        "cell_height": 160,
        "spacing_x": 34,
        "spacing_y": 37,
        "columns": 3,
        "rows": 4,
        "crop_padding": 3
      },
      "locked": false,
      "visible": true
    },
    "ocr_1": {
      "id": "ocr_1",
      "type": "ocr",
      "name": "OCR Region 1",
      "config": {
        "x": 178,
        "y": 66,
        "width": 334,
        "height": 64
      },
      "locked": false,
      "visible": true
    }
  }
}
```

**Current Selection State:**

config_editor.py already has `self.selected_overlay_id` (line 85) but it's not consistently used. We'll make this the authoritative selection state.

**Key Files to Modify:**

1. `config_editor.py`: Add selection management, wire callbacks to selected overlay
2. `editor/ui_builder.py`: Replace tabbed panel with dynamic panel

## Plan of Work

We will fix the spinbox loading issue and replace the fixed two-tab design with a dynamic panel. The work is organized into 4 phases:

**Phase 1: Load Overlay Values on Selection**

Update `_on_overlay_selected()` in config_editor.py to load the selected overlay's configuration values into the spinboxes. Currently, this method only updates `selected_overlay_id` but doesn't populate the spinboxes with the overlay's values. We'll add a `_load_overlay_into_spinboxes()` helper that reads the overlay's config and updates the appropriate IntVars.

**Phase 2: Dynamic Parameter Panel**

Remove the tkinter.ttk.Notebook from ui_builder.py and replace it with a container frame that swaps its content. We'll create three panel variants:
- Empty state panel (label saying "Select an overlay to edit parameters")
- Grid parameters panel (9 spinboxes for grid config)
- OCR parameters panel (4 spinboxes for OCR config)

The `_update_parameter_panel()` method will destroy the current content and pack the appropriate panel based on `selected_overlay_id` and overlay type.

**Phase 3: Update Parameter Panel on Selection**

Connect the selection event to the parameter panel. When `_on_overlay_selected()` is called, in addition to loading values into spinboxes, we'll call `ui_builder.update_parameter_panel()` to swap the visible panel based on overlay type (empty/grid/ocr).

**Phase 4: Integration Testing**

Test the complete workflow end-to-end, including edge cases like empty workspaces, overlay deletion, and workspace switching. Verify that resize handles (the existing SelectTool resize functionality) still synchronize with spinbox values.

## Concrete Steps

All commands should be run from the `tools/icon-cropper/` directory.

**Before starting:**

1. Ensure the tool runs without errors:
   ```bash
   cd tools/icon-cropper
   uv run python config_editor.py
   ```

   Expected: GUI window opens, you can select workspace, load screenshot, create overlays. Spinboxes may not work (this is the bug we're fixing).

2. Run existing tests to establish baseline:
   ```bash
   uv run pytest
   ```

   Expected: 85 tests collected, all pass (or show current state).

**Phase 1: Load Overlay Values on Selection**

1. Open `config_editor.py` in editor

2. Locate the `_on_overlay_selected` method (line 1134-1139). Currently it looks like this:

   ```python
   def _on_overlay_selected(self, overlay_id: str):
       """Handle overlay selection from list."""
       self.selected_overlay_id = overlay_id
       self._refresh_overlay_list()
       # Redraw to highlight selected overlay (future enhancement)
       self.canvas_controller.display_image()
   ```

3. Add a new helper method `_load_overlay_into_spinboxes()` before `_on_overlay_selected`:

   ```python
   def _load_overlay_into_spinboxes(self, overlay_id: str):
       """Load overlay's config values into spinboxes.

       Args:
           overlay_id: ID of overlay to load
       """
       if not overlay_id:
           return

       # Get the overlay
       overlay = self.canvas_controller.get_overlay_by_id(overlay_id)
       if not overlay:
           return

       # Suppress spinbox callbacks while loading to prevent feedback loop
       self._loading_workspace = True

       try:
           # Load values based on overlay type
           if overlay.type == 'grid':
               self.grid_inputs['start_x'].set(overlay.config['start_x'])
               self.grid_inputs['start_y'].set(overlay.config['start_y'])
               self.grid_inputs['cell_width'].set(overlay.config['cell_width'])
               self.grid_inputs['cell_height'].set(overlay.config['cell_height'])
               self.grid_inputs['spacing_x'].set(overlay.config['spacing_x'])
               self.grid_inputs['spacing_y'].set(overlay.config['spacing_y'])
               self.grid_inputs['columns'].set(overlay.config['columns'])
               self.grid_inputs['rows'].set(overlay.config['rows'])
               self.grid_inputs['crop_padding'].set(overlay.config['crop_padding'])

           elif overlay.type == 'ocr':
               self.ocr_inputs['x'].set(overlay.config['x'])
               self.ocr_inputs['y'].set(overlay.config['y'])
               self.ocr_inputs['width'].set(overlay.config['width'])
               self.ocr_inputs['height'].set(overlay.config['height'])
       finally:
           self._loading_workspace = False
   ```

4. Update `_on_overlay_selected` to call the new helper:

   ```python
   def _on_overlay_selected(self, overlay_id: str):
       """Handle overlay selection from list."""
       self.selected_overlay_id = overlay_id

       # Load overlay's values into spinboxes
       self._load_overlay_into_spinboxes(overlay_id)

       self._refresh_overlay_list()
       self.canvas_controller.display_image()
   ```

5. Test this phase:
   ```bash
   uv run python config_editor.py
   ```

   - Load workspace with multiple overlays (grid_1, grid_2)
   - Click grid_1 → verify spinboxes show grid_1's values
   - Click grid_2 → verify spinboxes change to grid_2's values
   - Adjust a spinbox → verify the selected overlay updates on canvas

**Phase 2: Dynamic Parameter Panel**

1. Open `editor/ui_builder.py` in editor

2. Locate the `build_ui` method (around line 50-100). Find the section that creates the parameter panel. It currently creates a ttk.Notebook with two tabs. We'll replace this entire section.

3. Find the existing `_build_parameter_panel` method (or similar - may be inline in build_ui). Replace the entire parameter panel creation with:

   ```python
   def _build_parameter_panel(self, parent):
       """Create dynamic parameter panel that shows different controls based on selected overlay.

       Replaces the old fixed two-tab design with a container that swaps content.
       """
       # Container frame
       param_frame = ttk.LabelFrame(parent, text="Overlay Parameters", padding=10)

       # Content container that will swap its children
       self.param_content_container = ttk.Frame(param_frame)
       self.param_content_container.pack(fill="both", expand=True)

       # Create all three panel variants (will be packed/unpacked as needed)
       self.empty_state_panel = self._create_empty_state_panel()
       self.grid_params_panel = self._create_grid_params_panel()
       self.ocr_params_panel = self._create_ocr_params_panel()

       # Initially show empty state
       self.current_param_panel = None
       self._show_panel(self.empty_state_panel)

       return param_frame

   def _create_empty_state_panel(self):
       """Create empty state panel shown when no overlay is selected."""
       panel = ttk.Frame(self.param_content_container)

       message = ttk.Label(
           panel,
           text="No overlay selected\n\nSelect an overlay from the list above\nto edit its parameters",
           justify="center",
           foreground="gray"
       )
       message.pack(expand=True, pady=50)

       return panel

   def _create_grid_params_panel(self):
       """Create grid parameter spinboxes panel."""
       panel = ttk.Frame(self.param_content_container)

       # Grid parameters (9 spinboxes)
       grid_params = [
           ("start_x", "Start X:", 0, 10000),
           ("start_y", "Start Y:", 0, 10000),
           ("cell_width", "Cell Width:", 1, 1000),
           ("cell_height", "Cell Height:", 1, 1000),
           ("spacing_x", "Spacing X:", 0, 500),
           ("spacing_y", "Spacing Y:", 0, 500),
           ("columns", "Columns:", 1, 100),
           ("rows", "Rows:", 1, 100),
           ("crop_padding", "Crop Padding:", 0, 100),
       ]

       for i, (key, label, min_val, max_val) in enumerate(grid_params):
           row = ttk.Frame(panel)
           row.pack(fill="x", pady=2)

           ttk.Label(row, text=label, width=15).pack(side="left")

           # Create IntVar if not exists (shared with config_editor)
           if key not in self.grid_input_vars:
               self.grid_input_vars[key] = tk.IntVar(value=0)

           spinbox = ttk.Spinbox(
               row,
               from_=min_val,
               to=max_val,
               textvariable=self.grid_input_vars[key],
               width=10
           )
           spinbox.pack(side="left", padx=5)

       return panel

   def _create_ocr_params_panel(self):
       """Create OCR parameter spinboxes panel."""
       panel = ttk.Frame(self.param_content_container)

       # OCR parameters (4 spinboxes)
       ocr_params = [
           ("x", "X:", 0, 10000),
           ("y", "Y:", 0, 10000),
           ("width", "Width:", 0, 10000),
           ("height", "Height:", 0, 10000),
       ]

       for key, label, min_val, max_val in ocr_params:
           row = ttk.Frame(panel)
           row.pack(fill="x", pady=2)

           ttk.Label(row, text=label, width=15).pack(side="left")

           # Create IntVar if not exists
           if key not in self.ocr_input_vars:
               self.ocr_input_vars[key] = tk.IntVar(value=0)

           spinbox = ttk.Spinbox(
               row,
               from_=min_val,
               to=max_val,
               textvariable=self.ocr_input_vars[key],
               width=10
           )
           spinbox.pack(side="left", padx=5)

       return panel

   def _show_panel(self, panel):
       """Hide current panel and show the specified panel."""
       # Hide current panel
       if self.current_param_panel:
           self.current_param_panel.pack_forget()

       # Show new panel
       panel.pack(fill="both", expand=True)
       self.current_param_panel = panel

   def update_parameter_panel(self, overlay_id: Optional[str]):
       """Update parameter panel based on selected overlay.

       Called by config_editor when overlay selection changes.
       """
       if not overlay_id:
           self._show_panel(self.empty_state_panel)
           return

       # Get overlay from canvas controller
       # NOTE: This requires passing canvas_controller reference to ui_builder
       # or getting overlay type from config_editor
       # For now, we'll add a method parameter for overlay_type

       # This method will be called from config_editor with overlay type
       pass  # Implementation will be completed in Phase 3
   ```

4. Update `__init__` in ui_builder.py to initialize the new containers:

   ```python
   def __init__(self):
       # ... existing code ...

       # Storage for parameter panel variants
       self.param_content_container = None
       self.empty_state_panel = None
       self.grid_params_panel = None
       self.ocr_params_panel = None
       self.current_param_panel = None

       # IntVars for spinboxes (shared with config_editor callbacks)
       self.grid_input_vars = {}
       self.ocr_input_vars = {}
   ```

5. Back in config_editor.py, update the spinbox IntVar initialization to use ui_builder's vars:

   In `__init__` of ConfigEditorApp, after `self.ui_builder = UIBuilder()`, link the vars:

   ```python
   # Link spinbox IntVars from ui_builder
   self.grid_inputs = self.ui_builder.grid_input_vars
   self.ocr_inputs = self.ui_builder.ocr_input_vars
   ```

**Phase 3: Connect Parameter Panel to Selection**

1. In config_editor.py, update `_on_overlay_selected` to also swap the parameter panel:

   ```python
   def _on_overlay_selected(self, overlay_id: str):
       """Handle overlay selection from list."""
       self.selected_overlay_id = overlay_id

       # Load overlay's values into spinboxes
       self._load_overlay_into_spinboxes(overlay_id)

       # Update parameter panel to show appropriate controls
       overlay = self.canvas_controller.get_overlay_by_id(overlay_id)
       overlay_type = overlay.type if overlay else None
       self.ui_builder.update_parameter_panel(overlay_id, overlay_type)

       self._refresh_overlay_list()
       self.canvas_controller.display_image()
   ```

2. Test parameter panel swapping:
   ```bash
   uv run python config_editor.py
   ```

   - With no overlays: verify parameter panel shows empty state
   - Create grid overlay: verify panel shows grid spinboxes
   - Create OCR overlay: verify panel switches to OCR spinboxes
   - Click between overlays: verify panel swaps correctly

**Phase 4: Integration Testing**

Run the tool and test each scenario:

1. **Test empty state**:
   ```bash
   uv run python config_editor.py
   ```
   - Create new workspace
   - Verify parameter panel shows "No overlay selected" message
   - Parameter panel should be visible but showing placeholder content

2. **Test grid overlay creation and auto-selection**:
   - Click "Draw Grid Layout" button
   - Draw a grid (3-step workflow: click start, drag cell, complete)
   - Verify grid auto-selects (radio button checked)
   - Verify parameter panel switches to grid spinboxes
   - Verify spinboxes show the grid's current values

3. **Test spinbox adjustment**:
   - Change "Columns" spinbox from 3 to 5
   - Verify grid on canvas updates to show 5 columns
   - Close and reopen tool
   - Select the workspace and screenshot
   - Verify grid still has 5 columns (persistence test)

4. **Test overlay switching**:
   - Draw a second grid overlay (grid_2)
   - Adjust grid_2's parameters (e.g., set columns to 4)
   - Click grid_1 in overlay list
   - Verify spinboxes switch to grid_1's values (columns should be back to 5)
   - Click grid_2 again
   - Verify columns shows 4 again

5. **Test OCR overlay**:
   - Click "Draw OCR Region" button
   - Draw an OCR region
   - Verify parameter panel switches to OCR spinboxes (4 params: x, y, width, height)
   - Adjust width spinbox
   - Verify OCR region updates on canvas

6. **Test overlay deletion**:
   - Delete all overlays using delete buttons
   - Verify parameter panel returns to "No overlay selected" state
   - Verify no errors in console

7. **Test workspace switching**:
   - Switch to different workspace
   - Verify selection clears (selected_overlay_id = None)
   - Verify parameter panel shows empty state
   - Load a screenshot with overlays
   - Select an overlay
   - Verify panel populates correctly

8. **Test resize handle synchronization**:
   - Select a grid overlay
   - Drag a resize handle to change grid size
   - Verify spinboxes update to reflect new size
   - Change spinbox value
   - Verify handles move to new position

## Validation and Acceptance

**Acceptance Criteria:**

After completing all phases, the following must be true:

1. **Empty State**: Opening a workspace with no overlays shows "No overlay selected" message in parameter panel

2. **Auto-Selection**: Creating a new grid/OCR overlay automatically selects it and shows its parameters

3. **Spinbox Updates Overlay**: Changing a spinbox value (e.g., columns from 3 to 5) immediately updates the overlay on canvas and persists to workspace.json

4. **Independent Overlays**: Creating two grid overlays (grid_1, grid_2) and adjusting each shows independent configurations (grid_1 has columns=5, grid_2 has columns=4)

5. **Type-Safe Panel**: Selecting a grid overlay shows 9 grid spinboxes, selecting an OCR overlay shows 4 OCR spinboxes

6. **Handle Synchronization**: Resize handles still update spinboxes and vice versa (existing behavior preserved)

**Validation Commands:**

1. Run the tool:
   ```bash
   cd tools/icon-cropper
   uv run python config_editor.py
   ```

2. Run tests (no new tests required, but existing tests should still pass):
   ```bash
   uv run pytest
   ```

   Expected: 85 tests pass (same as before, no regressions)

3. Manual test checklist (perform all 8 tests from Phase 5 above)

**Expected Observable Behavior:**

Before:
- Fixed two tabs always visible
- Spinboxes don't update any overlay (broken)
- Confusing which overlay is being edited

After:
- Parameter panel empty when no overlay selected
- Clicking overlay shows its parameters
- Spinboxes update the selected overlay
- Creating new overlay auto-selects it for immediate editing
- Multiple overlays each have independent configurations

## Idempotence and Recovery

**Safe Execution:**

- All changes are additive code modifications, no data migration required
- workspace.json files are not modified (schema remains unchanged)
- Existing overlay data is read correctly by new code

**Recovery:**

If the refactoring causes issues, revert the changes:

```bash
cd tools/icon-cropper
git diff config_editor.py editor/ui_builder.py editor/draw_grid_tool.py editor/draw_ocr_tool.py
# Review changes

# If needed, revert:
git checkout config_editor.py editor/ui_builder.py editor/draw_grid_tool.py editor/draw_ocr_tool.py
```

**Rollback Safety:**

The workspace.json schema is not changing, so old code can still read new workspace files and vice versa. No backward compatibility issues.

**Testing Safety:**

Run `uv run pytest` after each phase to catch regressions early. If tests fail, fix before proceeding to next phase.

## Artifacts and Notes

**Key Code Locations:**

- Selection state: `config_editor.py` line 85 (`self.selected_overlay_id`)
- Selection handler: `config_editor.py` new method `_on_overlay_selected()`
- Parameter panel: `editor/ui_builder.py` method `_build_parameter_panel()`
- Grid spinbox callback: `config_editor.py` method `_on_grid_param_changed()`
- OCR spinbox callback: `config_editor.py` method `_on_ocr_param_changed()`
- Auto-selection: `editor/draw_grid_tool.py` and `editor/draw_ocr_tool.py` completion handlers

**Expected File Changes:**

- `config_editor.py`: ~150 lines added (selection management, callback updates)
- `editor/ui_builder.py`: ~100 lines modified (replace tabs with dynamic panel)
- `editor/draw_grid_tool.py`: ~5 lines added (auto-selection)
- `editor/draw_ocr_tool.py`: ~5 lines added (auto-selection)

**Console Output During Testing:**

When creating a grid overlay, you should see no errors. When adjusting spinboxes, console should remain quiet (no exceptions). When switching workspaces, you might see libpng warnings (harmless, known issue).

**Workspace.json Example After Testing:**

After creating grid_1 with columns=5 and grid_2 with columns=4:

```json
{
  "overlays": {
    "grid_1": {
      "id": "grid_1",
      "type": "grid",
      "name": "Grid 1",
      "config": {
        "columns": 5,
        "rows": 4,
        "... other params ..."
      }
    },
    "grid_2": {
      "id": "grid_2",
      "type": "grid",
      "name": "Grid 2",
      "config": {
        "columns": 4,
        "rows": 3,
        "... other params ..."
      }
    }
  }
}
```

## Interfaces and Dependencies

**No new dependencies required.** All functionality uses existing tkinter components and patterns from the codebase.

**Required Method Signatures:**

In `config_editor.py`:
```python
def _on_overlay_selected(self, overlay_id: str) -> None:
    """Handle overlay selection from UI."""

def _save_selected_overlay_values(self) -> None:
    """Save spinbox values to selected overlay."""

def _load_selected_overlay_values(self) -> None:
    """Load selected overlay values into spinboxes."""
```

In `editor/ui_builder.py`:
```python
def _build_parameter_panel(self, parent) -> ttk.Frame:
    """Create dynamic parameter panel."""

def _create_empty_state_panel(self) -> ttk.Frame:
    """Create empty state panel."""

def _create_grid_params_panel(self) -> ttk.Frame:
    """Create grid spinboxes panel."""

def _create_ocr_params_panel(self) -> ttk.Frame:
    """Create OCR spinboxes panel."""

def update_parameter_panel(self, overlay_id: Optional[str], overlay_type: Optional[str]) -> None:
    """Update panel content based on selection."""

def _show_panel(self, panel: ttk.Frame) -> None:
    """Swap visible panel."""
```

**Context Object for Drawing Tools:**

Drawing tools receive a context dict with callbacks:
```python
context = {
    'refresh_overlay_list_callback': Callable[[], None],
    'refresh_binding_list_callback': Callable[[], None],
    'on_overlay_selected': Callable[[str], None],  # NEW
}
```

---

*Plan created: 2025-11-16*
*Last updated: 2025-11-16*

## Revision History

**2025-11-16 - Major Revision After User Feedback:**

User corrected a fundamental misunderstanding about the current UI state. The overlay list already uses radio button selection (`ttk.Radiobutton`), not checkboxes. Checkboxes are for screenshot bindings, a completely different feature. This revelation required rewriting the entire ExecPlan.

**Changes Made:**
- Removed Phase 1 about "adding radio button selection" (already exists!)
- Rewrote Context section to accurately describe current state (radio buttons work, spinboxes don't load values)
- Identified the actual bugs: (1) `_on_overlay_selected()` doesn't load values into spinboxes, (2) fixed tabs always visible
- Simplified from 5 phases to 4 phases
- Rewrote all Concrete Steps to focus on actual fixes needed
- Updated Decision Log to document this correction

**Root Cause of Misunderstanding:**
Failed to read the actual code before writing the plan. Made assumptions based on the problem description instead of investigating the current implementation. This is a reminder to ALWAYS read the code first before designing solutions.
