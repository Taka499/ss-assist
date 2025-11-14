# Icon Cropper GUI Configuration Tool

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md`.

## Purpose / Big Picture

Currently, users must manually edit `tools/icon-cropper/config.yaml` to define grid coordinates for cropping icons and OCR detection regions. This requires trial-and-error with pixel measurements, restarting the capture tool, and manually tweaking values. After this change, users will be able to launch a GUI tool that displays a captured game window screenshot, then visually draw rectangles to define crop grids and OCR regions using their mouse. The tool will automatically update the config.yaml file with the correct coordinates. Users can see their changes immediately by capturing a test screenshot and verifying the grid overlay matches the game UI perfectly.

This GUI makes the icon-cropper tool resilient to game UI changes (such as patches that move buttons or resize grids) and enables rapid setup of new page types (like item inventories or mission lists) without manually calculating pixel coordinates.

## Progress

- [x] Create the GUI configuration tool architecture *(2025-11-12)*
- [x] Implement screenshot display with zoom and pan capabilities *(2025-11-12)*
- [x] Add visual grid overlay editor with mouse interaction *(2025-11-12)*
- [x] Add OCR region editor with draggable rectangles *(2025-11-13)*
- [x] Refactor UX to Photoshop-like persistent overlay paradigm *(2025-11-13)*
- [x] Implement config.yaml serialization and deserialization *(2025-11-14)*
- [x] Add live preview mode showing cropped icons *(2025-11-14)*
- [x] Add "Load From Config" feature for loading saved configurations *(2025-11-14)*
- [ ] Add validation for grid configurations
- [ ] Write comprehensive tests
- [ ] Update main cropper.py to integrate with new config workflow

### Milestone 1: Basic GUI Framework ✅ COMPLETE (2025-11-12)

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
- ✅ Sidebar input widgets (Spinbox) for all grid parameters with up/down arrows:
  - Position: start_x, start_y
  - Cell size: cell_width, cell_height
  - Spacing: spacing_x, spacing_y
  - Grid size: columns, rows
  - Crop padding
- ✅ Real-time grid overlay updates when input fields change
- ✅ **Interactive resize handles (PowerPoint-like)**:
  - 8 handles total: 4 corners (TL, TR, BR, BL) + 4 edges (Top, Right, Bottom, Left)
  - No modifier: Resize with opposite edge/corner fixed
  - Shift: Maintain aspect ratio (proportional scaling)
  - Ctrl: Center-fixed scaling (corners: both dimensions, edges: along edge direction)
  - Visual feedback with crosshair cursor during resize
  - Handles appear as small blue circles at grid cell corners/edges
- ✅ Coordinate conversion between canvas and image space (handles zoom/pan/scroll)
- ✅ Mode buttons: "Edit Grid Layout", "Edit OCR Region" (disabled), "Exit Edit Mode"
- ✅ Instruction labels guide user through workflow
- ✅ Mouse interaction properly switches between pan mode and grid edit mode
- ✅ Screenshot buttons for quick access (Open/Capture)
- ✅ Cursor-centered zooming (Ctrl+Scroll zooms towards cursor position)
- ✅ Image centering on load/capture with extended scroll region for flexibility

**Bug Fixes**:
- Fixed coordinate misalignment when canvas is scrolled (using `canvasx()`/`canvasy()`)
- Fixed lambda closure bug causing only 3 handles to work (used default arguments)
- **Fixed critical circular dependency bug in Spinbox trace callbacks** (see Surprises & Discoveries)
- Fixed Shift+resize inverted scaling for top-right and bottom-left corners
- Fixed scroll region to include negative pan offsets and padding for full image accessibility

**UX Improvements**:
- Intuitive mouse wheel behavior (scroll vertically, Shift+scroll horizontally, Ctrl+scroll zoom)
- Cursor-centered zooming for precise navigation
- Spinbox widgets for precise value adjustments with arrow keys
- Crosshair cursor when entering grid edit mode for visual feedback
- Extended scroll region (half-canvas padding) allows centering any corner of the image

**Testing**: Grid editor fully tested with captured game screenshot. All interaction features (resize handles, modifier keys, spinboxes, scrolling, centering) working correctly.

### Milestone 3: OCR Region Editor ✅ COMPLETE (2025-11-13)

Implemented OCR region editing with full feature parity to grid editor:
- ✅ OCR editor module (`editor/ocr_editor.py`) - State machine for DEFINE → ADJUST workflow
- ✅ OCR region rendering with yellow rectangles and "OCR Region" label
- ✅ Click-and-drag region definition with drag preview
- ✅ 8 interactive resize handles (yellow, matching grid pattern)
- ✅ OCR resize controller (`editor/ocr_resize_controller.py`) - Handles resizing with performance optimization
- ✅ Sidebar input fields (X, Y, Width, Height) with bidirectional sync
- ✅ Tab-based UI (Grid Layout tab + OCR Region tab) to solve fixed panel width issue
- ✅ Mode switching (Grid ↔ OCR ↔ Pan/Zoom) with mutual exclusivity

**UX Refactoring - Photoshop-like Paradigm**:
- ✅ Changed from "Edit Mode" to "Draw Mode" paradigm
- ✅ Three modes: **🔲 Draw Grid Layout**, **📄 Draw OCR Region**, **🖱️ Pan/Zoom Mode**
- ✅ Persistent overlays (always visible after drawing, not hidden when switching modes)
- ✅ Clean canvas by default (no default grid/OCR shown until user draws)
- ✅ Handles appear only in appropriate mode after drawing (ADJUST step)
- ✅ Spinboxes always work after drawing (even in Pan/Zoom mode)
- ✅ Modes are mutually exclusive (switching automatically exits previous mode)

**Bug Fixes**:
- Fixed OCR drag not working (corrected `is_dragging()` logic to check only `drag_start`)
- Fixed OCR resize handles not responding (removed duplicate handle detection)
- Fixed mode switching confusion (Grid mode → OCR mode now properly exits Grid)
- Fixed left panel scrollability (added tabs to separate Grid and OCR parameters)
- Fixed default grid appearing during initial draw (conditional rendering based on edit step)
- Fixed handles appearing during SET_START/SET_CELL (only show in ADJUST step)
- Fixed red crosshair and orange preview disappearing (display overlay during active mode)

**Testing**: OCR region editor fully tested with game screenshots. All features (drag, resize, spinboxes, tabs, mode switching) working correctly with smooth, lag-free performance.

### Milestone 4: Config.yaml Serialization ✅ COMPLETE (2025-11-14)

Implemented comment-preserving YAML serialization with validation and backup:
- ✅ Config serializer module (`editor/config_serializer.py`) - Comment-preserving load/save using ruamel.yaml
- ✅ Automatic backup creation with timestamp (e.g., `config.yaml.backup.20251114_022359`)
- ✅ Grid configuration validation (bounds checking, positive dimensions, padding validation)
- ✅ OCR region validation (bounds checking, positive dimensions)
- ✅ Save functionality integrated into config_editor.py with user-friendly dialogs
- ✅ Save button added to UI sidebar (💾 Save Configuration)
- ✅ Keyboard shortcut added (Ctrl+S)
- ✅ File menu item added (File → Save Configuration)

**Validation Features**:
- Checks that grid fits within image bounds
- Validates positive cell dimensions and grid size
- Ensures crop padding doesn't exceed cell dimensions
- Validates OCR region is within image bounds
- Prevents saving without a loaded screenshot (needed for dimension validation)

**Save Workflow**:
1. User clicks Save button or presses Ctrl+S
2. System validates grid configuration (if drawn)
3. System validates OCR region (if drawn)
4. System creates timestamped backup of current config.yaml
5. System updates config with new values using ruamel.yaml (preserves comments)
6. System shows success dialog with details

**Testing**: Comprehensive test script (`test_config_serializer.py`) verifies:
- Config loading works correctly
- Comment preservation through save/load roundtrip
- Grid validation catches invalid configurations
- OCR validation catches invalid regions
- Backup creation works with timestamps
- All key comments preserved: "# Screenshot Cropper Configuration", "# Window detection settings", "# OCR settings for page detection", "# Grid layout for icon cropping"

**Bug Fixes**:
- Fixed tab content overflow - added scrollable frames for Grid Layout and OCR Region tabs
- Fixed "No Image" false positive - corrected image attribute check from `self.image` to `self.current_image`
- Added mousewheel scrolling to tab content (using Enter/Leave events to avoid conflicts with main canvas)

**Decision - Use ruamel.yaml Instead of pyyaml**:
- `pyyaml` does not preserve comments or formatting
- `ruamel.yaml` is designed for round-trip YAML editing
- Preserves comments, formatting, and structure
- Slightly larger dependency but essential for user-editable config files

### Milestone 5: Live Preview Mode ✅ COMPLETE (2025-11-14)

Implemented icon extraction preview with "Load From Config" feature:
- ✅ Preview controller module (`editor/preview_controller.py`) - Extracts icons from grid configuration
- ✅ Preview window module (`editor/preview_window.py`) - Displays icon thumbnails in grid layout
- ✅ Preview button with Ctrl+P keyboard shortcut
- ✅ Validation before preview (checks image loaded, grid drawn, dimensions valid)
- ✅ Thumbnail display with row/column labels and dimensions
- ✅ Scrollable preview window for large grids
- ✅ Load From Config feature (`load_from_config()`) - Loads saved grid and OCR from config.yaml
- ✅ Load From Config button with Ctrl+L keyboard shortcut
- ✅ Smart configuration detection (checks if grid/OCR have valid values before loading)
- ✅ User feedback dialogs showing what was loaded

**Preview Features**:
- Extracts all icons from current grid configuration
- Applies crop padding automatically
- Displays thumbnails (max 150×150) with aspect ratio preserved
- Labels each icon with "Row X, Col Y" and dimensions
- Supports scrolling for large icon grids
- Validates grid extends within image bounds before extraction

**Load From Config Features**:
- Reloads configuration from config.yaml on demand
- Loads both grid layout and OCR region
- Updates all spinbox inputs with loaded values
- Sets editor states to ADJUST mode (ready for handle interaction)
- Marks overlays as drawn for persistent display
- Shows confirmation dialog listing what was loaded (Grid layout, OCR region, or both)
- Handles missing/invalid configurations gracefully

**Bug Fixes**:
- Fixed preview window parent reference undefined error (added `self.parent = parent`)
- Fixed PhotoImage garbage collection causing blank thumbnails (added `label.image = photo`)
- Fixed ttk.Label not displaying images (changed to tk.Label)
- Fixed OCR overlay not showing after load (set `ocr_editor.edit_step = OCREditStep.ADJUST`)
- Changed thumbnail method from `.thumbnail()` to `.resize()` for better control

**Testing**: All features verified working correctly:
- Preview extracts icons correctly (verified with debug output showing 156×154px extraction)
- Thumbnails display properly in grid layout
- Load From Config successfully restores both grid and OCR overlays
- Resize handles appear after loading (ADJUST mode set correctly)

**Impact**: Major UX improvement - users no longer need to redraw grids from scratch after restarting the application. Combined with preview, users can now:
1. Load screenshot
2. Click "Load From Config" to apply saved configuration
3. Click "Preview Icons" to verify grid alignment
4. Make adjustments if needed
5. Save updates

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

### Circular Dependency in Spinbox Trace Callbacks (2025-11-12)

**Problem**: Interactive resize handles appeared to work initially (registering clicks, calculating new values), but the grid would not update visually. Only 3 left handles responded, and they only moved the grid horizontally without resizing. Investigation revealed all 8 handles DID register clicks and `do_resize()` DID calculate correct new values, but `draw_grid_overlay()` was reading old values from `self.grid_config`.

**Root Cause**: Spinbox widgets use Tkinter's `trace_add()` to automatically update `self.grid_config` when the user types or clicks the arrows. This created a circular dependency:
1. User drags resize handle
2. `do_resize()` calculates new value: `self.grid_config['cell_width'] = 134`
3. `do_resize()` updates spinbox to reflect change: `self.grid_inputs['cell_width'].set(134)`
4. `var.set()` triggers the trace callback → `on_grid_param_changed()`
5. `on_grid_param_changed()` reads ALL spinbox values (but spinbox still displays old value `135` due to timing)
6. `on_grid_param_changed()` overwrites `self.grid_config` with old values
7. `draw_grid_overlay()` reads old values and displays unchanged grid

**Evidence**:
- Debug output showed all handles registering clicks correctly
- Debug output showed `do_resize()` calculating correct new dimensions
- Debug output showed `draw_grid_overlay()` reading different (old) values
- The trace callback was executing after every `var.set()` call, even programmatic ones

**Solution**: Added a `self.updating_inputs_programmatically` flag to distinguish between user-initiated changes (type in spinbox, click arrows) and programmatic updates (from resize handles). The trace callback checks this flag and skips updating `self.grid_config` when the flag is True.

**Fix Applied**:
- Added flag in `__init__`: `self.updating_inputs_programmatically = False` (line 99)
- Check flag in trace callback `on_grid_param_changed()`: Return early if flag is True (lines 828-830)
- Set flag around programmatic updates in `do_resize()`: Wrap `var.set()` calls in try/finally block (lines 1164-1171)

**Code Pattern**:
```python
# In do_resize() after calculating new values:
self.updating_inputs_programmatically = True
try:
    for param, var in self.grid_inputs.items():
        if param in self.grid_config:
            var.set(self.grid_config[param])
finally:
    self.updating_inputs_programmatically = False
```

**Impact**: This was a critical blocker for the interactive resize feature. Without this fix, resize handles appeared to work but had no effect. The fix enables bidirectional synchronization: handles update spinboxes, spinboxes update handles, without infinite loops or stale data.

**Lesson Learned**: Tkinter variable traces fire on ALL value changes, including programmatic ones. When implementing two-way data binding (model ↔ UI), always use a flag to prevent circular updates. This pattern is common in GUI frameworks (React's `useEffect` deps, Angular's change detection guards, etc.).

### WinRT Initialization Fails in Tkinter Main Thread (2025-11-12)

**Problem**: When calling `capture_stella_sora()` directly from tkinter GUI, the Windows Graphics Capture API failed with error: `"Failed to initialize WinRT"`.

**Root Cause**: The Windows Graphics Capture API requires proper WinRT/COM initialization in a clean threading context. Tkinter's main thread has its own event loop and COM apartment state that conflicts with the WinRT initialization.

**Evidence**:
- Initial direct call from GUI: Failed with WinRT initialization error
- Threading approach with `pythoncom.CoInitialize()`: Still failed - COM apartment threading model conflicts
- Subprocess isolation approach: **SUCCESS** - Clean process environment allows proper WinRT initialization

**Impact**: Required refactoring the capture integration from direct function call to subprocess-based approach.

### libpng Color Profile Warnings (2025-11-12)

**Observation**: When displaying PNGs (both tkinter UI assets and game screenshots), libpng emits warnings: `"libpng warning: iCCP: known incorrect sRGB profile"`.

**Cause**: PNG files contain outdated or slightly incorrect sRGB ICC color profile metadata that doesn't match libpng's current specification.

**Impact**: None - warnings are harmless. Images display correctly as libpng automatically falls back to built-in sRGB profile. **Decision**: Leave warnings as-is, no action needed.

### Tab Content Overflow Issue (2025-11-14)

**Problem**: After implementing Milestone 4, the Grid Layout tab content exceeded the visible window height. All spinbox inputs were present but many were hidden below the fold, requiring users to resize the window to access bottom controls.

**Root Cause**: The tab frame used `pack()` without scrolling capability. As more input widgets were added (Position, Cell Size, Spacing, Grid Size, Padding - total 9 spinboxes + labels), the content height exceeded typical window sizes.

**Evidence**:
- User reported: "Grid Layout tab is exceeding the window"
- Tab content height: ~450px with all controls
- Typical left panel height: ~600px (but shared with Mode buttons, Save button, Instructions label)
- Available space for tab content: ~350px - causing overflow

**Solution**: Implemented scrollable frames for both Grid Layout and OCR Region tabs:
- Created `_create_scrollable_frame()` helper method in `ui_builder.py`
- Wraps tab content in Canvas with vertical scrollbar
- Mousewheel scrolling enabled when hovering (using Enter/Leave events)
- Avoids conflicts with main canvas zoom (Ctrl+Wheel)

**Impact**: Tab content now scrolls smoothly regardless of window size. Users can access all controls even on smaller screens.

### Save Validation Incorrect Image Check (2025-11-14)

**Problem**: Save configuration showed "No Image" warning even when screenshot was loaded and grid drawn. This blocked users from saving valid configurations.

**Root Cause**: Incorrect attribute name check in `save_config()` method. Code checked for `self.canvas_controller.image`, but the actual attribute is `self.canvas_controller.current_image`.

**Evidence**:
- User reported with screenshot: "Even if there's screenshot loaded and I finished drawing the grid, saving configuration shows up with no image pop up"
- Code inspection revealed mismatch:
  - `canvas_controller.py:34` defines: `self.current_image: Optional[Image.Image] = None`
  - `config_editor.py:667` checked: `self.canvas_controller.image` (wrong attribute)

**Solution**: Updated image check to use correct attribute:
```python
# Before (incorrect):
if not hasattr(self.canvas_controller, 'image') or self.canvas_controller.image is None:

# After (correct):
if self.canvas_controller.current_image is None:
```

**Impact**: Save functionality now works correctly when screenshot is loaded. Users can successfully save grid and OCR configurations.

**Lesson Learned**: When accessing attributes across modules, verify the actual attribute names in the source class definition rather than assuming naming conventions. This type of bug is easy to miss in manual testing if you always follow the happy path (load image first, then never test edge cases).

### PhotoImage Garbage Collection Issue (2025-11-14)

**Problem**: Preview window showed empty white rectangles instead of icon thumbnails, despite successful icon extraction (verified via debug output showing correct 156×154px images).

**Root Cause**: tkinter's PhotoImage objects were being garbage collected even though they were stored in `self.photo_images` list. tkinter requires the widget itself to maintain a reference to prevent premature garbage collection.

**Evidence**:
- Debug save showed icons extracted correctly (`debug_icon_0_0.png` displayed proper icon)
- Console output: `Debug: Image size: (156, 154), mode: RGB`
- Preview window showed blank spaces with correct dimensions labels
- Initial attempt with `ttk.Label` showed no images
- Storing in `self.photo_images` list was insufficient

**Solution**: Applied classic tkinter image reference pattern:
```python
# Convert to PhotoImage
photo = ImageTk.PhotoImage(thumbnail)
self.photo_images.append(photo)  # Keep reference in list (insufficient alone)

# Display thumbnail
label = tk.Label(icon_frame, image=photo)
label.image = photo  # CRITICAL: Keep reference on widget itself
label.pack()
```

**Additional Fixes**:
- Changed from `ttk.Label` to `tk.Label` (themed labels don't display images properly)
- Changed from `.thumbnail()` to `.resize()` for explicit size control
- Added RGB mode conversion for compatibility

**Impact**: Preview window now displays icon thumbnails correctly. Users can visually verify grid alignment before saving configuration.

**Lesson Learned**: In tkinter, PhotoImage objects must be referenced by the widget itself (`widget.image = photo`), not just stored in instance variables. This is a well-known tkinter gotcha that catches many developers. The themed `ttk` widgets also have limited image support compared to classic `tk` widgets.

### OCR Overlay Not Showing After Load From Config (2025-11-14)

**Problem**: After implementing "Load From Config" feature, the grid overlay displayed correctly but the OCR region (yellow rectangle) remained invisible after loading from config.yaml.

**Root Cause**: The `load_from_config()` method set `self.grid_editor.grid_edit_step = GridEditStep.ADJUST` for the grid but forgot to set `self.ocr_editor.edit_step = OCREditStep.ADJUST` for the OCR region. Without the ADJUST step flag, the overlay rendering logic didn't display the OCR rectangle.

**Evidence**:
- Grid layout loaded and displayed correctly after clicking "Load From Config"
- OCR config values loaded correctly into spinboxes (visible in OCR Region tab)
- OCR overlay remained invisible until user manually entered OCR draw mode
- `self.ocr_drawn` flag was set to True but overlay still didn't appear

**Solution**: Set OCR editor state to ADJUST mode when loading configuration:
```python
if has_ocr:
    # Update ocr_config values...
    # Update OCR input widgets...

    # Mark OCR as drawn and set to ADJUST step
    self.ocr_drawn = True
    self.ocr_editor.edit_step = OCREditStep.ADJUST  # Added this line
```

**Impact**: Both grid and OCR overlays now display correctly after loading from config. Users can immediately see and adjust both configurations without manual redrawing.

**Lesson Learned**: State consistency is critical in state machine architectures. When loading saved state, ensure ALL related state flags are set correctly, not just data values. The rendering logic relies on both the data (`ocr_config`) AND the state flags (`ocr_drawn`, `edit_step`) to determine what to display.

## Decision Log

### D1: Use Subprocess Isolation for Screenshot Capture (2025-11-12)

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

### D2: Use Tkinter for GUI Framework (2025-11-12)

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

### D3: Pan with Left Mouse Button, Not Middle Button (2025-11-12)

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

### D5: Interactive Resize Handles with Modifier Keys (2025-11-12)

**Context**: After implementing basic grid definition (click to set start, drag to define cell), users requested PowerPoint-like resize handles for more intuitive grid adjustment. Need to decide interaction model and modifier key behavior.

**Decision**: Implement 8 resize handles (4 corners + 4 edges) with modifier key support:
- **No modifier**: Resize with opposite edge/corner as fixed anchor point
- **Shift**: Maintain aspect ratio (proportional scaling)
- **Ctrl**: Center-fixed scaling (corners: scale both dimensions from center, edges: scale along edge direction from center)

**Rationale**:
- PowerPoint/Photoshop-style handles are highly discoverable and familiar to users
- 8 handles provide full control: corners for diagonal resize, edges for single-dimension resize
- Modifier keys match industry standards:
  - Shift for constrained (proportional) scaling is universal across design tools
  - Ctrl for center-fixed scaling matches Adobe/Figma conventions
- Visual handles (blue circles) provide clear affordance for interaction
- No modifier = simple resize is the most common operation, should be easiest

**Implementation Details**:
- Handles created as canvas circles (5px radius) at cell corners/edges
- Tag-based event binding: `canvas.tag_bind('resize_handle', '<Button-1>', handler)`
- Drag tracking: Store original config on press, calculate delta on motion, apply transform
- Modifier detection: Check `event.state & 0x0004` (Ctrl) and `event.state & 0x0001` (Shift)
- Performance optimization: Only redraw grid overlay during resize, not entire canvas

**Alternatives Considered**:
1. **Arrow keys only** - Too slow for large adjustments, poor discoverability
2. **Spinbox widgets only** - Implemented as complement, but lacks visual feedback during adjustment
3. **Single resize handle at bottom-right** - Too limited, common UX pattern is 8 handles
4. **Different modifier keys** - Alt could conflict with window manager, Shift+Ctrl too complex

**Trade-offs**:
- ✅ Pro: Highly intuitive and discoverable
- ✅ Pro: Matches user expectations from other tools
- ✅ Pro: Fast for large adjustments, precise with modifier keys
- ⚠️ Con: More complex event handling code (handle detection, modifier key logic)
- ⚠️ Con: Potential performance impact (mitigated by selective redrawing)

**Outcome**: Users found resize handles intuitive and powerful. Combined with spinboxes for fine-tuning, provides excellent UX for grid configuration.

### D6: Use ruamel.yaml for Comment-Preserving Serialization (2025-11-14)

**Context**: Need to save user-edited grid and OCR configurations back to config.yaml while preserving comments and structure. The config file is human-editable and contains important documentation comments.

**Options Considered**:
1. **pyyaml** - Standard Python YAML library (already in dependencies)
2. **ruamel.yaml** - Round-trip YAML library designed for preserving comments and formatting
3. **Manual file editing** - Parse YAML manually, edit values with regex/string manipulation
4. **JSON with comments** - Convert to JSON5 or similar format

**Decision**: Use ruamel.yaml (Option 2).

**Rationale**:
- **pyyaml limitation**: Strips all comments and formatting during load/dump cycle. Would make config.yaml unreadable after first save.
- **ruamel.yaml advantages**:
  - Designed specifically for round-trip editing (load → modify → save → preserves comments)
  - Preserves comment position, indentation, and structure
  - API compatible with pyyaml (easy migration)
  - Well-maintained and widely used for config file editing
- **Manual editing risks**: Error-prone, fragile to formatting changes, difficult to maintain
- **JSON limitation**: Would require migrating entire config format, breaking existing workflows

**Implementation Details**:
```python
from ruamel.yaml import YAML

yaml = YAML()
yaml.preserve_quotes = True
yaml.default_flow_style = False
yaml.width = 4096  # Prevent line wrapping
```

**Testing**: Test script (`test_config_serializer.py`) verifies all key comments preserved:
- "# Screenshot Cropper Configuration"
- "# Window detection settings"
- "# OCR settings for page detection"
- "# Grid layout for icon cropping"

**Trade-offs**:
- ✅ Pro: Perfect comment preservation
- ✅ Pro: Maintains human-readability of config file
- ✅ Pro: Users can safely edit config.yaml manually alongside GUI edits
- ⚠️ Con: Additional dependency (~500KB, acceptable for desktop tool)
- ⚠️ Con: Slightly slower than pyyaml (negligible for small config files)

**Outcome**: Successfully implemented. All tests pass with 100% comment preservation. Config file remains clean and readable after GUI edits.

## Outcomes & Retrospective

### Milestones 1-3 Retrospective (2025-11-13)

**What Was Achieved:**

Successfully implemented the core GUI framework and two complete editing modes (Grid and OCR) with full feature parity. The config editor now provides a Photoshop-like visual editing experience where users can:
- Capture or load game screenshots
- Pan and zoom with intuitive controls (drag to pan, Ctrl+scroll to zoom)
- Draw grid layouts with click-and-drag interface
- Draw OCR regions with identical interaction patterns
- Adjust both with 8-handle resize system and spinbox inputs
- Switch between modes without losing overlays

**Key Technical Achievements:**

1. **State Machine Architecture**: Implemented clean state machines for both Grid (SET_START → SET_CELL → ADJUST) and OCR (DEFINE → ADJUST) workflows. This pattern proved robust and extensible.

2. **Coordinate System Abstraction**: Successfully separated canvas coordinates (with zoom/pan/scroll) from image coordinates. The `coordinate_system.py` module makes all mouse interactions work correctly regardless of viewport state.

3. **Modular Architecture**: Breaking the monolith into specialized modules (`grid_editor.py`, `ocr_editor.py`, `grid_renderer.py`, `canvas_controller.py`, `ui_builder.py`, resize controllers) made the codebase maintainable and testable. Each module has a single, clear responsibility.

4. **Subprocess Isolation Pattern**: The WinRT/COM threading issue was elegantly solved by running screenshot capture in a subprocess. This pattern is now proven and can be reused for other WinRT API integrations.

5. **Bidirectional Data Binding**: Successfully implemented two-way sync between UI widgets (spinboxes) and internal state (config dictionaries) with circular dependency prevention using flags. This pattern works smoothly across both Grid and OCR editors.

6. **Performance Optimization**: Deferring spinbox updates during drag operations (updating only on mouse release) eliminated lag and created smooth, responsive resize interactions.

**UX Evolution - The Photoshop Paradigm Shift:**

The most significant design evolution was refactoring from "Edit Mode" to "Draw Mode" with persistent overlays. Initial implementation had confusing behavior:
- Overlays disappeared when exiting edit mode
- Users couldn't see both Grid and OCR simultaneously
- Mode switching felt fragmented and unpredictable

The Photoshop-like paradigm solved these issues:
- Overlays persist after drawing (always visible once created)
- Modes are mutually exclusive but non-destructive
- Clean canvas by default (no confusing default grid)
- Handles appear only when appropriate (in ADJUST step of active mode)
- Tab-based UI cleanly separates Grid and OCR parameters

This UX model proved far more intuitive in testing. Users could draw, adjust, switch modes, pan/zoom to verify, and iterate rapidly without confusion.

**Critical Bugs and Lessons:**

1. **Canvas Scroll Coordinate Bug**: Initially missed accounting for scroll position in coordinate conversion. Lesson: Always use `canvas.canvasx()`/`canvasy()` when converting widget-relative event coordinates.

2. **Circular Dependency in Traces**: Tkinter variable traces fire on ALL value changes (even programmatic ones), creating circular updates. Lesson: Always use a flag (`updating_inputs_programmatically`) to distinguish user input from programmatic updates.

3. **WinRT Threading Conflict**: Windows Graphics Capture API failed in tkinter's main thread. Lesson: When integrating Windows COM/WinRT APIs with GUI frameworks, prefer subprocess isolation over threading hacks.

4. **Handle Event Propagation**: Initial implementation had duplicate handle detection in both canvas binding and handle binding, causing conflicts. Lesson: Use `'break'` return value to stop event propagation, and avoid duplicate event handlers.

5. **Conditional Rendering Logic**: Default grid appeared during initial drawing because display logic didn't account for edit state. Lesson: Rendering must check both persistent state (`grid_drawn`) AND active editing state (`is_in_grid_edit_mode()`).

6. **Lambda Closure Bug**: Only 3 handles worked initially because lambda closures captured loop variables incorrectly. Lesson: Always use default arguments in lambdas to capture loop values: `lambda e, val=current_val: callback(val)`.

**What Remains:**

- **Milestone 4**: Config.yaml serialization/deserialization - Save edited configurations back to YAML file
- **Milestone 5**: Live preview mode - Show extracted icons to verify grid alignment
- **Milestone 6**: Validation and testing - Comprehensive validation, error handling, and automated tests

**Lessons for Future Milestones:**

1. **YAML Preservation**: When implementing config saving (Milestone 4), must preserve comments and structure. Consider using `ruamel.yaml` instead of `pyyaml` for comment-preserving round-trip serialization.

2. **Validation Strategy**: Grid validation should happen at multiple points: during editing (prevent invalid inputs), before saving (comprehensive checks), and at load time (detect corrupted configs).

3. **Testing Approach**: With the modular architecture in place, each component can be unit tested independently. Integration tests should verify the full workflow: capture → draw → adjust → save → load in main cropper.

4. **Performance Monitoring**: Current performance is excellent with small grids (3×4), but should test with larger grids (10×10) to ensure resize handles and overlay rendering remain responsive.

**Overall Assessment:**

The first three milestones exceeded expectations. The codebase is clean, maintainable, and well-architected. The UX is intuitive and matches professional design tools. The technical challenges (WinRT integration, coordinate systems, state machines) were solved elegantly with reusable patterns. The foundation is solid for completing the remaining milestones.

### Milestones 4-5 Retrospective (2025-11-14)

**What Was Achieved:**

Completed configuration persistence and preview functionality, making the tool fully functional for end-to-end workflow. Users can now:
- Save grid and OCR configurations to config.yaml with comment preservation
- Load saved configurations without redrawing from scratch
- Preview extracted icons to verify grid alignment
- Iterate on configurations with immediate visual feedback

**Key Technical Achievements:**

1. **Comment-Preserving Serialization**: Successfully integrated `ruamel.yaml` for round-trip YAML editing. All user comments and formatting preserved through save/load cycles. Automatic timestamped backups prevent data loss.

2. **Preview System Architecture**: Clean separation of concerns with `preview_controller.py` (extraction logic) and `preview_window.py` (display logic). Icon extraction applies crop padding correctly and validates boundaries.

3. **Load From Config Feature**: Intelligent configuration loading that detects valid values, updates UI state consistently (both data and state machine flags), and provides clear user feedback about what was loaded.

4. **Debug-Driven Development**: Added strategic debug output to diagnose PhotoImage display issue, leading to quick identification and resolution of garbage collection problem.

**Critical Bugs and Lessons:**

1. **PhotoImage Garbage Collection**: Most subtle bug encountered. Images extracted correctly but didn't display. Required widget-level reference (`label.image = photo`) in addition to instance list storage. Also learned `ttk.Label` doesn't support images - must use `tk.Label`.

2. **State Machine Consistency**: Initially forgot to set `ocr_editor.edit_step = OCREditStep.ADJUST` when loading config, causing OCR overlay to remain invisible. Lesson: When restoring state, update ALL related flags, not just data values.

3. **Parent Reference Bug**: Preview window referenced undefined `parent` variable. Simple fix but highlighted importance of storing constructor parameters as instance variables when needed later.

4. **Tab Scrollability**: Milestone 4 revealed UI overflow issue. Adding scrollable frames solved it elegantly while maintaining clean tabbed interface.

**UX Impact:**

The "Load From Config" feature eliminated the biggest pain point - having to redraw grids after every restart. Combined with preview, the workflow is now:
1. Start editor → Load screenshot → Click "Load From Config" (3 seconds)
2. Click "Preview Icons" to verify (instant)
3. Make minor adjustments if needed
4. Save

Previous workflow required complete redrawing (30-60 seconds of precise clicking/dragging). This is a **10-20x time savings** for iterative work.

**What Remains:**

- Additional grid validation (beyond basic bounds checking)
- Comprehensive test suite
- Integration with main cropper.py workflow
- Documentation for end users

**Technical Debt:**

- Debug save code in `preview_controller.py` (lines 75-84) should be removed or made conditional
- Preview window doesn't handle very large grids (>10×10) - may need pagination
- No error recovery if ruamel.yaml fails to parse corrupted config
- Load From Config hardcoded to `character_select` page (should support page selection)

**Lessons for Future Work:**

1. **tkinter Image Gotchas**: Always test image display early. PhotoImage requires widget-level references and classic `tk` widgets, not themed `ttk` widgets.

2. **State Machine Debugging**: When state-dependent features misbehave, verify ALL state flags are set correctly. Use debug output to log state machine transitions.

3. **User Feedback is Critical**: The user immediately identified the need for "Load From Config" - a feature not in original plan but essential for real-world usage. Stay flexible and responsive to user needs.

4. **Validation Strategy**: Preview feature provides excellent validation - users can visually confirm correctness. This is more effective than algorithmic validation for spatial alignment tasks.

**Overall Assessment:**

Milestones 4-5 completed successfully with high-quality implementations. The tool is now production-ready for basic use. The modular architecture made adding new features straightforward. All critical bugs were caught and fixed during testing. UX improvements (Load From Config, Preview) significantly exceeded original scope and provide substantial value. The codebase remains clean and maintainable.

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
