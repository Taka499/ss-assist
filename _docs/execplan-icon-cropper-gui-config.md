# Icon Cropper GUI Configuration Tool

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md`.

## Purpose / Big Picture

Currently, users must manually edit `tools/icon-cropper/config.yaml` to define grid coordinates for cropping icons and OCR detection regions. This requires trial-and-error with pixel measurements, restarting the capture tool, and manually tweaking values. After this change, users will be able to launch a GUI tool that displays a captured game window screenshot, then visually draw rectangles to define crop grids and OCR regions using their mouse. The tool will automatically update the config.yaml file with the correct coordinates. Users can see their changes immediately by capturing a test screenshot and verifying the grid overlay matches the game UI perfectly.

This GUI makes the icon-cropper tool resilient to game UI changes (such as patches that move buttons or resize grids) and enables rapid setup of new page types (like item inventories or mission lists) without manually calculating pixel coordinates.

## Progress

- [x] Create the GUI configuration tool architecture *(2025-01-12)*
- [x] Implement screenshot display with zoom and pan capabilities *(2025-01-12)*
- [x] Add visual grid overlay editor with mouse interaction *(2025-11-12)*
- [ ] Add OCR region editor with draggable rectangles
- [ ] Implement config.yaml serialization and deserialization
- [ ] Add live preview mode showing cropped icons
- [ ] Add validation for grid configurations
- [ ] Write comprehensive tests
- [ ] Update main cropper.py to integrate with new config workflow

### Milestone 1: Basic GUI Framework ✅ COMPLETE (2025-01-12)

Created `config_editor.py` with full basic functionality:
- ✅ Tkinter application structure with clean class-based design
- ✅ Menu bar (File: Open/Capture/Exit, View: Zoom controls, Help: About)
- ✅ Screenshot capture integration using subprocess isolation
- ✅ Scrollable canvas with horizontal and vertical scrollbars
- ✅ Pan controls (click and drag to move image)
- ✅ Zoom controls (mouse wheel, supports Windows/Mac/Linux)
- ✅ Status bar showing current state and zoom level
- ✅ Keyboard shortcuts (Ctrl+O, Ctrl+G, Ctrl+Q)

**Testing**: All features verified working correctly.

### Milestone 2: Grid Editor Mode ✅ COMPLETE (2025-11-12)

Implemented interactive grid editing with visual feedback:
- ✅ Edit mode state management (EditMode enum: NONE, GRID_EDIT, OCR_EDIT)
- ✅ Grid editing workflow (GridEditStep enum: SET_START, SET_CELL, ADJUST)
- ✅ Three-step grid definition process:
  1. Click to set grid start position (top-left of first icon)
  2. Drag to define cell dimensions (width and height)
  3. Adjust with input fields for fine-tuning
- ✅ Visual grid overlay with semi-transparent rectangles
  - Green outlines for cell boundaries
  - Yellow dashed lines for inner crop regions (with padding)
  - Red crosshair for start position marker
  - Orange semi-transparent rectangle during drag
- ✅ Sidebar input fields for all grid parameters:
  - Position: start_x, start_y
  - Cell size: cell_width, cell_height
  - Spacing: spacing_x, spacing_y
  - Grid size: columns, rows
  - Crop padding
- ✅ Real-time grid overlay updates when input fields change
- ✅ Coordinate conversion between canvas and image space (handles zoom/pan/scroll)
- ✅ Mode buttons: "Edit Grid Layout", "Edit OCR Region" (disabled), "Exit Edit Mode"
- ✅ Instruction labels guide user through workflow
- ✅ Mouse interaction properly switches between pan mode and grid edit mode
- ✅ Screenshot buttons for quick access (Open/Capture)
- ✅ Cursor-centered zooming (Ctrl+Scroll zooms towards cursor position)

**Bug Fixes**:
- Fixed coordinate misalignment when canvas is scrolled (using `canvasx()`/`canvasy()`)

**UX Improvements**:
- Intuitive mouse wheel behavior (scroll vertically, Shift+scroll horizontally, Ctrl+scroll zoom)
- Cursor-centered zooming for precise navigation

**Testing**: Grid editor tested with captured game screenshot. All interaction features working correctly.

## Surprises & Discoveries

### Canvas Scroll Position Not Accounted in Coordinate Conversion (2025-11-12)

**Problem**: When using scrollbars to navigate the canvas, mouse clicks during grid editing were misaligned with the cursor position. The grid start position and cell dimensions were calculated incorrectly when the canvas was scrolled.

**Root Cause**: The coordinate conversion from canvas widget coordinates to image coordinates wasn't accounting for the scroll position. Mouse event coordinates (`event.x`, `event.y`) are relative to the visible canvas widget, not the scrolled canvas content.

**Evidence**:
- Grid definition worked correctly when canvas was at scroll position (0, 0)
- Grid became misaligned when user scrolled horizontally or vertically
- Misalignment offset matched the scroll position

**Solution**: Use `canvas.canvasx()` and `canvas.canvasy()` to convert widget-relative coordinates to canvas coordinates that include scroll offset.

**Fix Applied**: Updated `canvas_to_image_coords()` in `config_editor.py:730-747` to properly convert coordinates:
```python
# Convert widget coordinates to canvas coordinates (accounting for scroll)
canvas_x_scrolled = self.canvas.canvasx(canvas_x)
canvas_y_scrolled = self.canvas.canvasy(canvas_y)

# Account for pan offset and zoom
img_x = (canvas_x_scrolled - self.pan_offset[0]) / self.zoom_level
img_y = (canvas_y_scrolled - self.pan_offset[1]) / self.zoom_level
```

**Impact**: Critical bug fix for usability. Grid editing now works correctly regardless of scroll position.

### WinRT Initialization Fails in Tkinter Main Thread (2025-01-12)

**Problem**: When calling `capture_stella_sora()` directly from tkinter GUI, the Windows Graphics Capture API failed with error: `"Failed to initialize WinRT"`.

**Root Cause**: The Windows Graphics Capture API requires proper WinRT/COM initialization in a clean threading context. Tkinter's main thread has its own event loop and COM apartment state that conflicts with the WinRT initialization.

**Evidence**:
- Initial direct call from GUI: Failed with WinRT initialization error
- Threading approach with `pythoncom.CoInitialize()`: Still failed - COM apartment threading model conflicts
- Subprocess isolation approach: **SUCCESS** - Clean process environment allows proper WinRT initialization

**Impact**: Required refactoring the capture integration from direct function call to subprocess-based approach.

### libpng Color Profile Warnings (2025-01-12)

**Observation**: When displaying PNGs (both tkinter UI assets and game screenshots), libpng emits warnings: `"libpng warning: iCCP: known incorrect sRGB profile"`.

**Cause**: PNG files contain outdated or slightly incorrect sRGB ICC color profile metadata that doesn't match libpng's current specification.

**Impact**: None - warnings are harmless. Images display correctly as libpng automatically falls back to built-in sRGB profile. **Decision**: Leave warnings as-is, no action needed.

## Decision Log

### D1: Use Subprocess Isolation for Screenshot Capture (2025-01-12)

**Context**: Windows Graphics Capture API failing with WinRT initialization errors when called from tkinter GUI.

**Options Considered**:
1. Direct function call from GUI main thread
2. Threading with COM initialization (`pythoncom.CoInitialize()`)
3. Subprocess isolation running `capture.py` as separate process

**Decision**: Use subprocess isolation (Option 3).

**Rationale**:
- Option 1 failed immediately with WinRT errors
- Option 2 still failed due to COM apartment threading conflicts with tkinter
- Option 3 succeeds because it gives WinRT a completely clean process environment
- Subprocess approach is more robust and isolated from GUI threading issues
- Performance impact is minimal (~1-2 second capture time, acceptable for user-initiated action)

**Trade-offs**:
- ✅ Pro: Completely isolated, no threading conflicts
- ✅ Pro: More robust error handling via subprocess return codes
- ⚠️ Con: Slightly slower than in-process call
- ⚠️ Con: Requires reading capture from temp file (capture.py saves to `test_capture.png`)

### D2: Use Tkinter for GUI Framework (2025-01-12)

**Context**: Need to choose GUI framework for config editor.

**Decision**: Use tkinter (Python standard library).

**Rationale**:
- Already included with Python, no new dependencies
- Sufficient for our needs (canvas, menus, mouse events)
- Lightweight and fast for our use case
- Well-documented and stable

**Alternatives Not Chosen**:
- PyQt/PySide: Too heavy, would add significant dependencies
- wxPython: Similar weight issue, overkill for our needs
- Custom web-based UI: Unnecessary complexity

### D3: Pan with Left Mouse Button, Not Middle Button (2025-01-12)

**Context**: Original plan specified middle mouse button for panning.

**Decision**: Use left mouse button click-and-drag for panning.

**Rationale**:
- More intuitive - matches common image viewer UX patterns
- Middle mouse button not available on all mice (especially laptops with touchpads)
- Left-click drag is easier to discover for users
- Can still use other mouse buttons for future editing modes (grid definition, region drawing)

### D4: Mouse Wheel Behavior with Modifier Keys (2025-11-12)

**Context**: Initial implementation bound mouse wheel directly to zoom in/out, which is anti-intuitive. Users expect scroll wheel to scroll the view, not zoom.

**Decision**: Use modifier keys to distinguish scroll vs zoom behavior:
- Mouse wheel alone: Scroll vertically
- Shift + mouse wheel: Scroll horizontally
- Ctrl + mouse wheel: Zoom in/out

**Rationale**:
- Matches standard image viewer UX (Photoshop, GIMP, Windows Photo Viewer, etc.)
- Scrolling is a more common operation than zooming
- Ctrl+Wheel for zoom is a well-established convention
- Shift+Wheel for horizontal scroll matches browser behavior
- More discoverable and intuitive for users

**Implementation**: Modified `on_mouse_wheel()` and `on_mouse_wheel_linux()` to check `event.state` for modifier key flags (0x0004 for Ctrl, 0x0001 for Shift).

## Outcomes & Retrospective

(To be filled in at completion)

## Context and Orientation

The icon-cropper tool is located in `tools/icon-cropper/` within this repository. It captures screenshots from the Stella Sora game window and extracts character icons arranged in a grid layout. The tool currently uses `config.yaml` to store page definitions, which include grid coordinates (start position, cell dimensions, spacing) and OCR detection regions (for identifying which page is currently displayed).

Key files in the current implementation:
- `tools/icon-cropper/config.yaml` - Configuration file with hardcoded pixel coordinates
- `tools/icon-cropper/capture.py` - Window capture logic using Windows Graphics Capture API
- `tools/icon-cropper/gridcrop.py` - Grid-based image cropping logic
- `tools/icon-cropper/detector.py` - OCR-based page detection
- `tools/icon-cropper/cropper.py` - Main orchestration script

The new GUI tool will be a standalone utility that users run separately from the main capture workflow. It will load an existing config.yaml, capture a screenshot from the game window, and allow visual editing of all coordinate-based settings through a graphical interface.

## Plan of Work

We will create a new Python script called `config_editor.py` in `tools/icon-cropper/` that provides an interactive GUI for editing the configuration file. The GUI will be built using tkinter (included with Python standard library) to avoid adding heavy dependencies like Qt or wxPython.

The editor will have three main modes:
1. **Grid Editor Mode** - Define the icon grid by clicking the top-left corner of the first icon, then setting cell dimensions and spacing by dragging to show the grid overlay
2. **OCR Region Mode** - Draw a rectangle around the area where page-identifying text appears (like "ホーム画面設定")
3. **Preview Mode** - Show extracted icons from the current grid configuration to verify correctness

The workflow will be:
1. User launches `config_editor.py` with a page name (e.g., `character_select`)
2. Tool captures a screenshot from the Stella Sora window using existing capture.py logic
3. Screenshot is displayed in a scrollable canvas with zoom controls
4. User enters Grid Editor Mode and clicks the top-left corner of the first icon
5. User drags to define cell width and height, sees live grid overlay
6. User adjusts spacing with arrow keys or input fields, sees grid update in real-time
7. User enters OCR Region Mode and draws a rectangle over the page title text
8. User clicks "Preview" to see extracted icons with current settings
9. User clicks "Save" to update config.yaml with new coordinates

The GUI will use a simple state machine to manage editing modes and will validate all inputs before saving to prevent invalid configurations.

## Concrete Steps

### Step 1: Create the GUI framework structure

Create a new file `tools/icon-cropper/config_editor.py` with the basic tkinter application structure. This will include a main window with a canvas for displaying the screenshot, a toolbar with mode buttons, and a sidebar with coordinate input fields.

    # tools/icon-cropper/config_editor.py
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog
    from PIL import Image, ImageTk, ImageDraw
    import yaml
    from typing import Optional, Tuple, Dict, Any
    from capture import capture_stella_sora
    from utils import load_config

The main application class will be called `ConfigEditor` and will inherit from `tk.Tk`. It will manage the application state, UI components, and coordinate tracking.

### Step 2: Implement screenshot loading and display

Add logic to capture a screenshot from the Stella Sora window on startup using the existing `capture_stella_sora()` function from `capture.py`. Display the screenshot on a tkinter Canvas widget with scrollbars for navigation.

The canvas will support:
- Panning with middle mouse button drag
- Zooming with mouse wheel (zoom in/out while keeping mouse position centered)
- Grid overlay rendering (when in Grid Editor Mode)
- Rectangle drawing for OCR regions

### Step 3: Implement Grid Editor Mode

Add interactive grid definition with three sub-steps:
1. Click to set grid start position (top-left corner of first icon)
2. Drag to define cell dimensions (width and height of one icon)
3. Use input fields or arrow keys to fine-tune spacing between cells

As the user interacts, draw a semi-transparent overlay showing where each icon will be cropped. Use different colors to indicate the current cell being edited (bright green) versus confirmed cells (light blue).

### Step 4: Implement OCR Region Mode

Add rectangle drawing for OCR regions. User clicks and drags to define a rectangular area. Display the cropped region content in a small preview window showing what text the OCR will see. This helps users verify they've captured the right area.

### Step 5: Implement Preview Mode

Extract all icons from the current grid configuration and display them in a separate preview window as a grid of thumbnails. This allows users to visually verify that the grid alignment is correct before saving.

### Step 6: Implement config.yaml serialization

Add save functionality that reads the current config.yaml, updates only the page being edited (preserving other pages and settings), and writes the file back with proper YAML formatting and comments preserved.

### Step 7: Add validation and error handling

Validate all coordinates before saving:
- Grid start position must be within screenshot bounds
- Cell dimensions must be positive integers
- Grid must not extend beyond screenshot edges
- OCR region must be within screenshot bounds
- No division by zero or negative spacing values

Show clear error messages if validation fails, and prevent saving invalid configurations.

## Validation and Acceptance

After implementation, run the configuration editor from the command line:

    cd tools/icon-cropper
    uv run python config_editor.py --page character_select

Expected behavior:
1. A window opens showing the captured Stella Sora screenshot
2. Toolbar buttons show: "Grid Editor", "OCR Region", "Preview", "Save", "Exit"
3. Clicking "Grid Editor" allows clicking the first icon's top-left corner
4. Dragging shows a rectangle with the cell dimensions
5. A grid overlay appears showing all cells based on column/row counts from config
6. Input fields in the sidebar show current coordinates and allow fine-tuning
7. Clicking "OCR Region" allows drawing a rectangle around the page title
8. Clicking "Preview" opens a new window showing all extracted icons as thumbnails
9. Clicking "Save" updates `config.yaml` and shows a success message
10. Running the main `cropper.py` tool with the updated config successfully crops icons

To verify the saved configuration works, capture a screenshot with the main tool:

    uv run python cropper.py

The tool should correctly identify the page using OCR (with the new OCR region) and crop icons using the new grid coordinates. All extracted icons should be cleanly cropped without borders or misalignment.

Run tests to verify the configuration loading and saving logic:

    uv run pytest tests/test_config_editor.py

All tests should pass, including tests for coordinate validation, YAML preservation, and grid calculation accuracy.

## Idempotence and Recovery

The configuration editor can be run multiple times safely. Each save operation creates a backup of the previous config.yaml as `config.yaml.backup` with a timestamp. If the user makes a mistake, they can restore from the backup file.

The editor does not modify any image files or affect the main capture workflow. If the GUI crashes or is closed without saving, no changes are persisted to config.yaml.

Users can edit multiple pages in sequence by running the tool with different `--page` arguments without conflicts.

## Artifacts and Notes

### Key data structures

The configuration editor will work with this YAML structure:

    pages:
      character_select:
        ocr_match: "ホーム画面設定"
        grid:
          columns: 3
          rows: 4
          start_x: 963
          start_y: 151
          cell_width: 146
          cell_height: 146
          spacing_x: 4
          spacing_y: 4
          crop_padding: 8
        output:
          category: "characters"
          target_dir: "public/assets/characters"

    ocr:
      detection_region: [140, 50, 300, 50]  # [x, y, width, height]

The grid overlay will be calculated as:

    for row in range(rows):
        for col in range(columns):
            x = start_x + col * (cell_width + spacing_x)
            y = start_y + row * (cell_height + spacing_y)
            # Draw rectangle at (x, y) with dimensions (cell_width, cell_height)

### UI Layout

The main window will have this structure:

    ┌─────────────────────────────────────────────────────────┐
    │ File  Edit  View  Help                                  │  Menu bar
    ├─────────────────────────────────────────────────────────┤
    │ [Grid Editor] [OCR Region] [Preview] [Save] [Exit]      │  Toolbar
    ├──────────────────────────────────┬──────────────────────┤
    │                                  │ Page: character_select│
    │                                  │                       │
    │                                  │ Grid Settings:        │
    │                                  │ Start X: [963    ]    │
    │                                  │ Start Y: [151    ]    │
    │                                  │ Cell W:  [146    ]    │
    │                                  │ Cell H:  [146    ]    │
    │      Screenshot Canvas           │ Spacing X: [4    ]    │
    │      (with scrollbars)           │ Spacing Y: [4    ]    │
    │                                  │ Columns: [3      ]    │
    │                                  │ Rows:    [4      ]    │
    │                                  │ Padding: [8      ]    │
    │                                  │                       │
    │                                  │ OCR Region:           │
    │                                  │ X: [140] Y: [50 ]     │
    │                                  │ W: [300] H: [50 ]     │
    │                                  │                       │
    │                                  │ Zoom: [100%]          │
    │                                  │ [+] [-] [Fit]         │
    └──────────────────────────────────┴──────────────────────┘

## Interfaces and Dependencies

The config editor will depend on:
- `tkinter` (Python standard library) - GUI framework
- `PIL/Pillow` (already in dependencies) - Image display and manipulation
- `pyyaml` (already in dependencies) - YAML parsing and serialization
- `capture.py` - Window capture functionality
- `utils.py` - Configuration loading utilities

Define a new class in `tools/icon-cropper/config_editor.py`:

    class ConfigEditor(tk.Tk):
        def __init__(self, config_path: str, page_name: str):
            """Initialize the configuration editor.

            Args:
                config_path: Path to config.yaml file
                page_name: Name of the page to edit (e.g., 'character_select')
            """

        def capture_screenshot(self) -> Image.Image:
            """Capture a screenshot from the Stella Sora window."""

        def setup_ui(self) -> None:
            """Create the GUI layout with canvas, toolbar, and sidebar."""

        def on_canvas_click(self, event: tk.Event) -> None:
            """Handle mouse clicks on the canvas for grid/region definition."""

        def on_canvas_drag(self, event: tk.Event) -> None:
            """Handle mouse drag for defining cell dimensions or OCR regions."""

        def draw_grid_overlay(self) -> None:
            """Draw the grid overlay on the canvas based on current settings."""

        def draw_ocr_region(self) -> None:
            """Draw the OCR region rectangle on the canvas."""

        def show_preview(self) -> None:
            """Open a preview window showing extracted icons."""

        def save_config(self) -> None:
            """Save the updated configuration to config.yaml."""

        def validate_config(self) -> bool:
            """Validate all coordinates before saving."""

Define a utility class for grid calculations in the same file:

    class GridCalculator:
        @staticmethod
        def calculate_cells(
            start_x: int, start_y: int,
            cell_width: int, cell_height: int,
            spacing_x: int, spacing_y: int,
            columns: int, rows: int
        ) -> list[tuple[int, int, int, int]]:
            """Calculate bounding boxes for all grid cells.

            Returns:
                List of (x, y, width, height) tuples for each cell
            """

Define an interface for coordinate validation:

    class CoordinateValidator:
        def __init__(self, image_width: int, image_height: int):
            """Initialize validator with screenshot dimensions."""

        def validate_grid(self, grid_config: dict) -> tuple[bool, Optional[str]]:
            """Validate grid configuration.

            Returns:
                (is_valid, error_message) tuple
            """

        def validate_ocr_region(self, region: list[int]) -> tuple[bool, Optional[str]]:
            """Validate OCR region coordinates.

            Returns:
                (is_valid, error_message) tuple
            """

## Milestones

### Milestone 1: Basic GUI Framework (Days 1-2)

Create the foundational GUI application with screenshot display and basic navigation. At the end of this milestone, users can launch the editor, see the captured game window, and pan/zoom around the image.

Acceptance: Running `uv run python config_editor.py --page character_select` opens a window displaying the Stella Sora screenshot. Users can zoom in/out with the mouse wheel and pan by dragging with the middle mouse button. The sidebar shows read-only coordinate values loaded from the existing config.yaml.

### Milestone 2: Grid Editor Mode (Days 3-4)

Implement interactive grid definition with visual feedback. At the end of this milestone, users can define grid coordinates by clicking and dragging on the screenshot, with a real-time overlay showing exactly where icons will be cropped.

Acceptance: Clicking the "Grid Editor" button enables grid editing mode. Clicking on the screenshot sets the grid start position (a small crosshair appears). Dragging from that point shows a rectangle for the cell dimensions. Releasing the mouse updates the sidebar input fields. A full grid overlay appears showing all cells based on the column/row counts from config. Using arrow keys or typing in the input fields updates the grid in real-time.

### Milestone 3: OCR Region Editor (Days 5)

Implement OCR region definition with preview capability. At the end of this milestone, users can draw a rectangle around the page title area and see a preview of what text will be extracted.

Acceptance: Clicking the "OCR Region" button enables OCR region editing mode. Clicking and dragging on the screenshot draws a yellow rectangle. A small preview window shows the cropped region content. Releasing the mouse updates the OCR region coordinates in the sidebar. The rectangle remains visible and can be adjusted by dragging its corners or edges.

### Milestone 4: Preview and Validation (Days 6)

Implement the preview mode that extracts icons using the current grid configuration and displays them as thumbnails. Add comprehensive validation for all coordinates before saving.

Acceptance: Clicking the "Preview" button opens a new window showing a grid of extracted icon thumbnails. Each thumbnail is labeled with its grid position (row/column). If the grid is misaligned, the thumbnails clearly show the problem (e.g., icons cut off or containing borders). The validator detects and reports errors like grids extending beyond image bounds, negative dimensions, or overlapping OCR regions with the grid.

### Milestone 5: Configuration Persistence (Days 7)

Implement saving the configuration to config.yaml with proper YAML formatting and backup creation. Ensure the saved configuration works correctly with the main cropper tool.

Acceptance: Clicking the "Save" button validates the configuration, creates a backup file `config.yaml.backup.<timestamp>`, and updates config.yaml with the new coordinates. Running `uv run python cropper.py` with the updated config successfully crops icons at the new positions. The YAML file retains its structure and comments.

### Milestone 6: Testing and Documentation (Days 8-9)

Write comprehensive tests for all components and update the README with usage instructions. Add error handling for edge cases like missing windows, invalid screenshots, or corrupted config files.

Acceptance: Running `uv run pytest tests/test_config_editor.py` shows 100% test coverage for the config editor module. Tests cover coordinate validation, grid calculation, YAML serialization, and UI state management. The README at `tools/icon-cropper/README.md` includes a new section explaining how to use the configuration editor with screenshots of the UI.

## Additional Considerations

### Handling Multiple Pages

The editor should support switching between different page types without restarting. Add a dropdown menu in the toolbar to select which page to edit (character_select, item_inventory, etc.). When switching pages, reload the screenshot if needed and update all UI elements to reflect the selected page's configuration.

### Future Enhancements

Consider these potential features for future iterations:
1. **Auto-detection** - Automatically detect grid parameters by analyzing the screenshot for repeating patterns
2. **Template matching** - Allow users to click on an icon and have the tool find all similar icons automatically
3. **Multi-page workflow** - Edit multiple pages in a single session with tabs
4. **Undo/Redo** - Track changes and allow reverting mistakes
5. **Export/Import** - Share configurations between users or game versions

### Error Recovery

If the Stella Sora window is not found, show a clear error message with instructions to launch the game and try again. If the screenshot capture fails, offer to load an existing screenshot from disk as a fallback.

If config.yaml is corrupted or missing required fields, show a warning and offer to create a new configuration from scratch using default values.

## Dependencies and Environment

The configuration editor requires:
- Windows 10 or later (for Windows Graphics Capture API)
- Python 3.13+
- Stella Sora game running in a window (not fullscreen)
- All dependencies from `tools/icon-cropper/pyproject.toml`

No additional dependencies beyond what's already in the project. Tkinter is included with Python on Windows.

## Testing Strategy

Create `tools/icon-cropper/tests/test_config_editor.py` with tests for:
1. Grid calculation accuracy (verify cell positions match expected values)
2. Coordinate validation (ensure invalid configurations are rejected)
3. YAML serialization (verify structure and comments are preserved)
4. Screenshot loading and display (test with various resolutions)
5. UI state management (test mode transitions and event handling)

Create `tools/icon-cropper/tests/test_grid_calculator.py` with tests for:
1. Edge cases (zero spacing, single row/column, maximum grid size)
2. Boundary conditions (grid extending beyond image bounds)
3. Rounding errors (ensure pixel-perfect alignment)

Use pytest fixtures to provide sample screenshots and configurations for testing without requiring the game to be running.
