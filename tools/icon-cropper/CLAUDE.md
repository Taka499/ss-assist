# Icon Cropper Development Guidelines

This file provides guidance for working with the icon-cropper tool.

## Principles

1. **Always use `uv run`** to execute Python commands.
2. **During testing** (`uv run python ...`), wait for user feedback and do NOT kill the running shell.
3. **Follow ExecPlan methodology** for complex features (see `_docs/PLANS.md`).

## Architecture Overview

The icon-cropper has evolved into a **workspace-centric, tool-based GUI application** for configuring grid-based icon extraction from game screenshots.

### Workspace-Centric Design

Each workspace is a **self-contained project** with its own:
- `config.yaml` - Grid/OCR configuration
- `screenshots/` - Multiple screenshots for scrolling UIs
- `cropped/` - Future batch crop output
- `workspace.json` - Metadata (selected screenshot, timestamps)

```
workspaces/
├── character_select/    # Workspace 1
│   ├── config.yaml
│   ├── workspace.json
│   └── screenshots/
│       ├── 001.png
│       ├── 002.png
│       └── 003.png
└── item_inventory/      # Workspace 2
    ├── config.yaml
    ├── workspace.json
    └── screenshots/
```

**Why workspaces?**
- Each workspace = one complete cropping task
- Portable (can be zipped and shared)
- Multiple screenshots per workspace (for scrolling/pagination)
- Independent configurations
- No global config.yaml conflicts

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

**`editor/workspace_manager.py`**
- Creates/lists workspace directories
- Manages screenshots (add, delete, get, select)
- Handles workspace.json metadata
- **Key Methods:**
  - `create_workspace(name, clone_from=None)` - Creates workspace with config.yaml from template
  - `add_screenshot(workspace, image)` - Auto-numbered (001.png, 002.png, ...)
  - `delete_screenshot(workspace, filename)` - No last-screenshot protection
  - `get_screenshots(workspace)` - Returns list with metadata

**`editor/config_template.py`**
- Loads config_template.yaml
- Creates workspace configs (from template or clone)
- Replaces placeholders (workspace_name, output paths)

**`editor/config_serializer.py`**
- YAML load/save with comment preservation
- Accepts workspace-specific config path
- Validates grid/OCR configurations
- Creates timestamped backups

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
- Grid/OCR parameter spinboxes
- Mode buttons, menu bar

**`config_editor.py`** (main orchestrator)
- Initializes all controllers and managers
- Routes events to tool_manager
- Handles workspace switching
- Screenshot capture integration
- Load/save configuration

## Development Workflow

### Running the Tool

```bash
cd tools/icon-cropper
uv run python config_editor.py
```

### Testing Changes

1. Make code changes
2. Run `uv run python config_editor.py`
3. Test workflow:
   - Create workspace
   - Capture/load screenshots
   - Draw grid/OCR
   - Switch workspaces
   - Verify overlays clear/load correctly

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

### Workspace Switching

```python
# Always clear before loading new workspace
self.canvas_controller.clear()  # Resets image + overlays + zoom + pan

# Reload config serializer for new workspace
workspace_config_path = workspaces_root / workspace_name / "config.yaml"
self.config_serializer = ConfigSerializer(workspace_config_path)

# Load workspace config
self.config, error = self.config_serializer.load()

# Load screenshots
self._refresh_screenshot_list()
self._load_selected_screenshot()
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

1. **Workspace creation**: Create new workspace, verify config.yaml created
2. **Screenshot management**: Capture multiple, select, delete, verify list updates
3. **Workspace switching**: Switch workspaces, verify overlays clear/load correctly
4. **Multi-overlay**: Draw 2+ grids, verify independent configs and positions
5. **Tool switching**: Draw → auto-switch to Select → handles visible
6. **Handle resize**: Verify Ctrl/Shift modifiers work
7. **Config save/load**: Save config, reload, verify persistence

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

## References

- **ExecPlan**: See `_docs/execplan-icon-cropper-multipage-workspace.md`
- **PLANS.md**: See `_docs/PLANS.md` for ExecPlan methodology
- **README.md**: User-facing documentation and workflow guide 