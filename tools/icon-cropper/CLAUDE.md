# Icon Cropper Development Guidelines

This file provides guidance for working with the icon-cropper tool.

## Important Notice: Deprecated Files

As of 2025-01-18, the old daemon-based workflow has been deprecated in favor of the workspace-centric GUI approach. Deprecated files have been moved to `_deprecated/`:
- `cropper.py` - Old hotkey daemon (replaced by `config_editor.py` GUI)
- `detector.py` - OCR-based page detection (replaced by manual overlay drawing)
- `gridcrop.py` - Old cropping logic (replaced by `editor/cropper_api.py`)

See `_deprecated/README.md` for migration guide and rationale.

# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in `_docs/PLANS.md`) from design to implementation.

## Principles

1. **Always use `uv run`** to execute Python commands.
2. **During testing** (`uv run python ...`), wait for user feedback and do NOT kill the running shell.
3. **Follow ExecPlan methodology** for complex features (see `_docs/PLANS.md`).

## Architecture Overview

The icon-cropper has evolved into a **workspace-centric, tool-based GUI application** for configuring grid-based icon extraction from game screenshots.

### Workspace-Centric Design

Each workspace is a **self-contained project** with its own:
- `workspace.json` - Single source of truth for all configuration (overlays, screenshots, bindings)
- `screenshots/` - Multiple screenshots for scrolling UIs
- `cropped/` - Batch crop output (organized by screenshot and overlay)

```
workspaces/
├── character_select/    # Workspace 1
│   ├── workspace.json
│   ├── screenshots/
│   │   ├── 001.png
│   │   ├── 002.png
│   │   └── 003.png
│   └── cropped/         # Batch crop output
│       ├── 001.png/
│       │   └── grid_1/  # Icons from screenshot 001.png using grid_1
│       └── 002.png/
│           └── grid_1/
└── item_inventory/      # Workspace 2
    ├── workspace.json
    └── screenshots/
```

**Why workspaces?**
- Each workspace = one complete cropping task
- Portable (can be zipped and shared)
- Multiple screenshots per workspace (for scrolling/pagination)
- Independent configurations with runtime validation
- No global config.yaml conflicts

**Workspace Validation:**
All workspace.json files are validated using Pydantic models on every load and save:
- **Type safety**: Ensures all fields have correct types (int, str, list, etc.)
- **Constraint validation**: Enforces positive dimensions, reasonable limits
- **Cross-field validation**: Prevents dangling overlay references
- **User-friendly errors**: Shows exactly which field is invalid and why

See `editor/schema/__init__.py` for the full Pydantic model hierarchy.

### Complete Workflow

The typical workflow for extracting and naming icons:

1. **Create/Select Workspace**
   - Use workspace dropdown or [+] button to create new workspace
   - Each workspace is self-contained with its own screenshots and overlays

2. **Capture/Load Screenshots**
   - Click "📷 Capture" to capture from game window, or
   - Click "📂 Open Screenshot" to load from file
   - Add multiple screenshots for scrolling/paginated UIs

3. **Draw Grid Overlays**
   - Click "🔲 Draw Grid Layout" to enter drawing mode
   - Click to set start position, drag to define cell size
   - Adjust parameters (columns, rows, spacing, crop padding) in parameter panel
   - Can create multiple grids per workspace

4. **Preview Icons**
   - Click "👁️ Preview Icons" to verify grid alignment
   - Shows extracted icons in preview window

5. **Batch Crop All**
   - Click "✂️ Batch Crop All" to extract all icons
   - Preview dialog shows what will be cropped
   - Icons saved to `workspaces/{workspace}/cropped/{screenshot}/{overlay}/`
   - Organized as 001.png, 002.png, 003.png, etc.

6. **Annotate Icons** (NEW)
   - Click "🏷️ Annotate Icons" to assign names to cropped icons
   - Choose input mode:
     - **Manual Input**: Type names one per line (e.g., char-001, char-002, ...)
     - **CSV Import**: Import CSV and select column with names
   - Assign names to each icon from dropdowns
   - Select output directory
   - Click "Save" to export icons with proper filenames (e.g., `char-001.png`, `Seina.png`)

**Key Integration Points:**
- All three workflow actions available in left panel "Actions" section
- Also accessible via Tools menu and keyboard shortcuts (Ctrl+P, Ctrl+B, Ctrl+A)
- Pre-flight validation prevents errors (checks for cropped icons before annotation)

### Tool-Based UX (Photoshop-like)

Replaced mode-based workflow with tool selection system:

**Tools:**
- **SelectTool** (default): Pan, zoom, resize overlays via handles
- **DrawGridTool**: Draw new grid overlays
- **DrawOCRTool**: Draw new OCR regions

**Key Pattern:**
- Drawing tools auto-switch to SelectTool when complete
- Handles visible when overlay exists AND not currently drawing
- Tool selection independent of workflow state

**Why tools instead of modes?**
- Predictable behavior (handles always visible for existing overlays)
- Separation of concerns (tool selection vs drawing workflow)
- Extensible (easy to add new tools)
- Familiar UX pattern (matches Photoshop, GIMP, etc.)

### Multi-Overlay Support

Each workspace can have **multiple grids and OCR regions**:

```python
# Unified overlay system (dict-based)
canvas_controller.set_overlay('grid', grid_config, index=0)  # First grid
canvas_controller.set_overlay('grid', grid_config, index=1)  # Second grid
canvas_controller.set_overlay('ocr', ocr_config, index=0)    # First OCR region
```

**Why multi-overlay?**
- Complex game UIs may have multiple icon grids per screenshot
- Future-proof for annotation tools, measurement overlays, etc.
- Each overlay has independent configuration (no shared state)

## Module Responsibilities

### Workspace Management Layer

**`editor/schema/`**
- Pydantic models for workspace.json validation
- **Models:**
  - `WorkspaceMetadata` - Root model (schema v2)
  - `OverlayData` - Overlay definition (id, type, name, config, locked, visible)
  - `GridConfig` - Grid overlay configuration with constraints
  - `OCRConfig` - OCR region configuration
  - `ScreenshotMetadata` - Screenshot metadata with bindings
- **Validators:**
  - Field-level: Positive dimensions, valid formats, ID patterns
  - Cross-field: Overlay references, selected screenshot existence
- **Functions:**
  - `validate_workspace_file(path)` - Load and validate workspace.json
  - `generate_json_schema()` - Generate JSON Schema for IDE autocomplete

**`editor/workspace_manager.py`**
- Creates/lists workspace directories
- Manages screenshots (add, delete, get, select)
- Handles workspace.json metadata **with Pydantic validation**
- **Key Methods:**
  - `create_workspace(name, clone_from=None)` - Creates workspace with validated metadata
  - `add_screenshot(workspace, image)` - Auto-numbered (001.png, 002.png, ...), validates on save
  - `delete_screenshot(workspace, filename)` - No last-screenshot protection
  - `get_screenshots(workspace)` - Returns list with validated metadata
  - `_load_metadata(path)` - Loads and validates workspace.json with Pydantic
  - `_save_metadata(path, data)` - Validates before saving to prevent corrupt data

### Batch Cropping Layer

**`editor/cropper_api.py`**
- Core API for extracting icons from screenshots using workspace overlays
- **Functions:**
  - `crop_grid(image, grid_config)` - Extract icons from a single image using GridConfig
    - Handles crop padding (shrinks cells by removing edges)
    - Clips at image boundaries
    - Returns list of icon arrays (numpy) in row-major order
  - `preview_overlay(workspace, screenshot, overlay_id)` - Preview icons for one overlay
    - Validates workspace.json with Pydantic
    - Returns list of PIL Images for display
  - `batch_crop_workspace(workspace)` - Batch crop all screenshots with bindings
    - Processes all screenshots × bound overlays
    - Saves to `workspaces/{workspace}/cropped/{screenshot}/{overlay}/`
    - Returns dict mapping "{screenshot}/{overlay}" → list of output paths
  - `get_crop_statistics(workspace)` - Get statistics without cropping
    - Used by preview dialog to show counts and breakdown

**`editor/crop_preview_dialog.py`**
- Preview dialog before running batch crop
- **Features:**
  - Summary: Total screenshots, bindings, icons
  - Breakdown table: What will be cropped per screenshot/overlay
  - Icon preview: Shows first 9 icons from first overlay
  - Scrollable content with mousewheel support
  - Fixed Cancel/Proceed buttons at bottom
- **Returns:** Boolean (True if user clicked "Proceed")

**`editor/annotation_dialog.py`**
- Dialog for assigning names to cropped icons and saving to output directory
- **Features:**
  - **Dual input modes:**
    - **Manual Input (default)**: Type names one per line, click "Load Names"
    - **CSV Import**: Import CSV file, select column containing names
  - Icon grid display (4 columns) with thumbnails
  - Name selection dropdowns for each icon
  - Output directory selector (user-chosen location)
  - Comprehensive validation (names loaded, output dir selected, all icons assigned)
  - Duplicate name warnings (allows but warns)
  - Overwrite confirmation for existing files
- **Saves icons with selected names** (e.g., `char-001.png`, `Seina.png`)
- **Integration:**
  - Menu: Tools → Annotate Icons (Ctrl+A)
  - Left panel: "Actions" section button
  - Pre-flight check: Validates cropped icons exist before opening
- **Returns:** Boolean (True if icons saved, False if cancelled)

**Why separate cropping API?**
- Decouples icon extraction from GUI
- Enables future CLI/scripting use cases
- Testable in isolation (10 comprehensive tests)
- Pydantic validation ensures valid inputs

### Canvas & Visual Layer

**`editor/canvas_controller.py`**
- **Owns ALL visual state**: image, zoom, pan, overlays
- Unified overlay API: `set_overlay()`, `get_overlay()`, `has_overlay()`, `clear_overlay()`
- `clear()` automatically resets everything (image + overlays + zoom + pan)
- Cursor-centered zooming (1x-10x)
- Pan with middle mouse or Ctrl+drag

**Why CanvasController owns overlays?**
- Single source of truth for visual state
- Automatic cleanup on workspace switch (just call `clear()`)
- No manual flag synchronization needed
- Eliminates overlay persistence bugs

**`editor/grid_renderer.py`**
- Renders grid overlays with crop padding indicators
- Renders OCR region overlays
- Draws 8 resize handles (4 corners + 4 edges)
- Visual feedback during drawing

**`editor/coordinate_system.py`**
- Pure functions for canvas ↔ image coordinate transformations
- Handles zoom and pan offsets
- No state (stateless utility functions)

### Editing Workflow Layer

**`editor/grid_editor.py`**
- 3-step grid drawing workflow:
  1. SET_START - Click to set start position
  2. DEFINE_CELL - Drag to define cell size
  3. ADJUST - Adjust via spinboxes or handles
- State machine (GridEditStep enum)
- **Does NOT validate image existence** (controller's responsibility)

**`editor/ocr_editor.py`**
- OCR region drawing workflow (similar to grid)
- Symmetric design with grid_editor

**`editor/resize_controller.py`**
- Handles 8 resize handles (corner + edge)
- Modifier key support:
  - **Shift**: Maintain aspect ratio
  - **Ctrl**: Resize from center
  - **Ctrl+Shift**: Both
- Generic (works for grid and OCR overlays)

### Tool System Layer

**`editor/base_tool.py`**
- Abstract base class defining tool interface
- Methods: `on_activate()`, `on_deactivate()`, `on_mouse_press/move/release()`

**`editor/tool_manager.py`**
- Manages active tool selection
- Delegates mouse events to active tool
- Tool registry (`register_tool()`, `set_active_tool()`)

**`editor/select_tool.py`**
- Default tool (always active unless drawing)
- Handles pan, zoom, and resize via handles
- Delegates to ResizeController for handle interactions

**`editor/draw_grid_tool.py`**
- Wraps GridEditor for drawing workflow
- Auto-switches to SelectTool on completion
- Passes **config copy** to avoid shared state

**`editor/draw_ocr_tool.py`**
- Wraps OCREditor (symmetric with draw_grid_tool)
- Auto-switches to SelectTool on completion

### UI Layer

**`editor/ui_builder.py`**
- Creates all UI components
- Workspace selector dropdown with [+] button
- Screenshot list (radio selection)
- Canvas with scrollbars
- **Unified overlay list** (see Overlay Management UI below)
- Grid/OCR parameter spinboxes
- Mode buttons, menu bar

**`config_editor.py`** (main orchestrator)
- Initializes all controllers and managers
- Routes events to tool_manager
- Handles workspace switching
- Screenshot capture integration
- Load/save configuration

### Overlay Management UI

The tool uses a **unified overlay list** that shows ALL workspace overlays (not just bound ones). This replaced the old dual-panel system that had separate "Overlays" and "Apply to Screenshot" panels.

**UI Pattern:**
```
Overlays (3 overlays in workspace)

○ 🔲 Grid 1          [☑ Apply]  🗑️ Delete  🔒 Lock
● 📄 OCR Region 1    [☑ Apply]  🗑️ Delete  🔒 Lock
○ 🔲 Grid 2          [☐ Apply]  🗑️ Delete  🔒 Lock
```

**Components:**
- **Radio button (○/●)**: Selects which overlay to edit (shows parameter panel)
- **Icon + Name**: Visual identification of overlay type and name
- **Apply checkbox**: Binds/unbinds overlay to current screenshot
- **Delete button**: Permanently removes overlay from workspace
- **Lock button**: Toggles overlay lock state (prevents editing)

**Behavior:**

1. **Unified List Shows All Overlays:**
   - List displays ALL workspace overlays (from `workspace.json["overlays"]`)
   - Not limited to overlays bound to current screenshot
   - Count label shows total workspace overlays (e.g., "3 overlays in workspace")

2. **Apply Checkbox (Binding Toggle):**
   - Checked: Overlay is bound to current screenshot (visible on canvas)
   - Unchecked: Overlay exists in workspace but not bound (hidden from canvas)
   - Switching screenshots updates checkbox state based on that screenshot's bindings
   - Implementation: `_on_binding_toggle()` in config_editor.py

3. **Delete Button (Permanent Deletion):**
   - Removes overlay from workspace.json permanently
   - Automatically removes overlay from ALL screenshot bindings
   - Shows confirmation dialog listing affected screenshots (up to 5, then "... and N more")
   - Locked overlays cannot be deleted (warning shown)
   - Implementation: `_on_delete_overlay()` calls `workspace_manager.delete_overlay()`

4. **Parameter Panel Visibility:**
   - Only shows when overlay is bound (Apply checkbox checked)
   - Rationale: Unbound overlays aren't on canvas, so editing would be confusing
   - Workflow: Apply → Select → Edit

**Why Unified List?**
- Eliminates confusion between "bound" vs "all" overlays
- Clear separation: Apply checkbox = binding, Delete button = removal
- Users can see all workspace resources in one place
- Matches mental model: "overlays are workspace-level, bindings are screenshot-level"

**Implementation Details:**

```python
# config_editor.py: _refresh_overlay_list()
def _refresh_overlay_list(self):
    """Refresh overlay list (shows ALL workspace overlays)."""
    # Load ALL workspace overlays
    all_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)

    # Load bindings for current screenshot
    bound_ids = self.workspace_manager.load_screenshot_bindings(
        self.current_workspace, selected_screenshot
    )

    # Update UI with both overlay list and binding state
    self.ui_builder.update_overlay_list(
        list(all_overlays.values()),
        self.selected_overlay_id,
        bound_ids,  # Determines checkbox state
        self._on_overlay_selected,
        self._on_binding_toggle,  # Apply checkbox callback
        self._on_delete_overlay,
        self._on_lock_overlay
    )
```

```python
# workspace_manager.py: delete_overlay()
def delete_overlay(self, workspace: str, overlay_id: str):
    """Permanently delete overlay from workspace and all bindings."""
    # Remove from workspace-level overlays dict
    del metadata["overlays"][overlay_id]

    # Remove from all screenshot bindings
    for screenshot in metadata["screenshots"]:
        if overlay_id in screenshot["overlay_bindings"]:
            screenshot["overlay_bindings"].remove(overlay_id)

    self._save_metadata(metadata_path, metadata)
```

**Testing the Unified List:**

1. Create overlay in screenshot A → appears in list with Apply checked
2. Switch to screenshot B → overlay still in list but Apply unchecked
3. Check Apply on screenshot B → overlay appears on canvas
4. Uncheck Apply → overlay disappears but stays in list
5. Delete overlay → confirmation shows which screenshots use it
6. Confirm delete → overlay removed from workspace.json and all bindings

## Development Workflow

### Running the Tool

```bash
cd tools/icon-cropper
uv run python config_editor.py
```

### Testing

```bash
# Run all tests
uv run pytest

# Run schema validation tests specifically
uv run pytest tests/test_workspace_schema.py -v

# Run with coverage
uv run pytest --cov=editor --cov-report=term-missing
```

The test suite includes:
- **26+ schema validation tests** covering valid/invalid cases, edge cases, cross-field validation
- Coordinate system tests
- Preview controller tests
- Config serializer tests (legacy)

### Testing Changes

1. Make code changes
2. If modifying Pydantic models, run tests first:
   ```bash
   uv run pytest tests/test_workspace_schema.py -v
   ```
3. Run `uv run python config_editor.py`
4. Test workflow:
   - Create workspace
   - Capture/load screenshots
   - Draw grid/OCR
   - Switch workspaces
   - Verify overlays clear/load correctly
   - Try invalid data to test validation errors

### Updating Pydantic Models

When modifying `editor/schema/__init__.py`:

1. **Update the model** - Add/modify fields, validators
2. **Update tests** - Add test cases for new validation
3. **Run tests** - Ensure all tests pass:
   ```bash
   uv run pytest tests/test_workspace_schema.py -v
   ```
4. **Regenerate JSON Schema** - Update IDE autocomplete:
   ```bash
   uv run python scripts/generate_json_schema.py
   ```
5. **Test integration** - Verify validation works in GUI
6. **Update documentation** - Update CLAUDE.md and README.md if needed

### Adding New Validation Rules

Example: Add max limit to crop_padding:

```python
# In editor/schema/__init__.py
class GridConfig(BaseModel):
    crop_padding: int = Field(ge=0, le=50, description="...")  # Add le=50
```

Then add test:
```python
# In tests/test_workspace_schema.py
def test_excessive_crop_padding_rejected():
    with pytest.raises(ValidationError):
        GridConfig(..., crop_padding=51)  # Should fail
```

### Adding a New Tool

1. Create `editor/my_new_tool.py`:
```python
from editor.base_tool import BaseTool

class MyNewTool(BaseTool):
    def on_activate(self):
        # Tool selected
        pass

    def on_mouse_press(self, event, context):
        # Handle mouse press
        return True  # Consumed event

    # ... implement other methods
```

2. Register in `config_editor.py`:
```python
self.tool_manager.register_tool('my_tool', MyNewTool(...))
```

3. Add UI button:
```python
ttk.Button(frame, text="My Tool", command=lambda: self.tool_manager.set_active_tool('my_tool'))
```

### Adding a New Overlay Type

The overlay system is extensible:

```python
# Set overlay
canvas_controller.set_overlay('annotation', {
    'x': 100, 'y': 100,
    'text': 'Note here'
})

# Check existence
if canvas_controller.has_overlay('annotation'):
    overlay = canvas_controller.get_overlay('annotation')

# Clear specific overlay
canvas_controller.clear_overlay('annotation')
```

Update `grid_renderer.py` to render new overlay type in `draw_overlays()`.

## Common Patterns

### Workspace Switching (with Error Handling)

```python
# Always clear before loading new workspace
self.canvas_controller.clear()  # Resets image + overlays + zoom + pan

try:
    # Ensure workspace exists (creates workspace.json if needed)
    self.workspace_manager.create_workspace(workspace_name)

    # Load screenshots and overlays from workspace.json
    self._refresh_screenshot_list()
    self._load_selected_screenshot()  # This loads overlays (validated by Pydantic)

except ValueError as e:
    # Workspace validation failed
    messagebox.showerror(
        "Workspace Validation Error",
        f"Error loading workspace '{workspace_name}':\n\n{e}\n\n"
        "Please fix the workspace.json file or delete it to reset."
    )
    # Clear UI to prevent showing invalid data
    self.ui_builder.update_screenshot_list([], None, self._on_screenshot_selected)
```

### Creating Overlays (Avoid Shared State!)

```python
# WRONG - Shared reference
canvas_controller.set_overlay('grid', self.grid_config)  # All overlays share same dict!

# CORRECT - Independent copies
canvas_controller.set_overlay('grid', dict(self.grid_config))  # Each overlay gets copy
```

### Handle Visibility Logic

```python
def _should_show_grid_handles(self) -> bool:
    """Handles visible when overlay exists AND not currently drawing."""
    return (
        self.canvas_controller.has_overlay('grid') and
        not isinstance(self.tool_manager.active_tool, DrawGridTool)
    )
```

**Rule**: Visibility based on **data state** (overlay exists), not **workflow state** (edit_step).

### Suppressing Callbacks During Batch Updates

```python
# Set flag before batch updates
self._loading_workspace = True

# Update spinboxes (don't trigger callbacks)
for param, var in self.grid_inputs.items():
    var.set(values[param])

# Clear flag
self._loading_workspace = False

# In callback:
def _on_grid_param_changed(self, *args):
    if self._loading_workspace:
        return  # Skip during workspace load
    # ... normal handling
```

## Testing Guidelines

### Manual Testing Checklist

After making changes, test:

1. **Workspace creation**: Create new workspace, verify workspace.json created
2. **Screenshot management**: Capture multiple, select, delete, verify list updates
3. **Workspace switching**: Switch workspaces, verify overlays clear/load correctly
4. **Multi-overlay**: Draw 2+ grids, verify independent configs and positions
5. **Tool switching**: Draw → auto-switch to Select → handles visible
6. **Handle resize**: Verify Ctrl/Shift modifiers work
7. **Batch crop workflow**: Preview → Batch Crop → verify output in cropped/
8. **Annotation workflow**:
   - Try manual input mode (type names, assign to icons)
   - Try CSV import mode (import CSV, select column, assign names)
   - Verify output filenames match selected names (not sequential numbers)
   - Test duplicate name warnings and overwrite confirmation
9. **Config save/load**: Save config, reload, verify persistence

### Regression Testing

Watch for these common bugs:

- **Overlay persistence**: Switching workspaces shows old overlays
- **Shared config**: Multiple overlays render at same position
- **Handle visibility**: Handles disappear after workspace switch
- **Screenshot selection**: Deleting screenshot doesn't update selection

## Key Insights from Development

### Lessons Learned (from ExecPlan)

1. **Architectural bugs vs code bugs**: Handle visibility regression was actually an architectural issue (mode confusion), not a simple bug.

2. **Redundant validation is dangerous**: The `current_image is None` check in editors broke tool activation. Controller-level validation was sufficient.

3. **Python dict sharing gotcha**: Passing dicts by reference causes shared state bugs. Always pass copies for independent overlays.

4. **Separation of concerns prevents coupling**: Conflating "tool selection" with "workflow state" created invisible dependencies.

5. **Data state > workflow state for UI**: Visual elements should be based on data existence, not workflow position.

### Design Decisions

**Why workspace-centric?**
- Config editor evolved beyond "just editing config.yaml"
- Each workspace = complete cropping project (screenshots + config + output)
- Aligns with IMPLEMENTATION_PLAN.md vision

**Why tool system?**
- Mode system conflated "user intent" with "internal workflow steps"
- Tools separate concerns: SelectTool (intent: resize) vs DrawGridTool (workflow: 3 steps)
- Predictable UX: handles always visible unless actively drawing

**Why unified overlay state in CanvasController?**
- Single source of truth eliminates synchronization bugs
- Automatic cleanup on workspace switch
- Extensible for future overlay types

**Why unified overlay list UI?**
- Old dual-panel system was confusing (two lists showing different subsets)
- Users expected Delete to delete, not unbind
- Single list with Apply checkbox makes binding explicit and discoverable
- Clear mental model: overlays are workspace resources, bindings are screenshot-specific
- Delete button now does what users expect (permanent removal)

## References

- **ExecPlan (Annotator Integration)**: See `_docs/execplan-annotator-integration.md`
- **ExecPlan (Unified Overlay List)**: See `_docs/execplan-unified-overlay-list.md`
- **ExecPlan (Multipage Workspace)**: See `_docs/execplan-icon-cropper-multipage-workspace.md`
- **PLANS.md**: See `_docs/PLANS.md` for ExecPlan methodology
- **README.md**: User-facing documentation and workflow guide 