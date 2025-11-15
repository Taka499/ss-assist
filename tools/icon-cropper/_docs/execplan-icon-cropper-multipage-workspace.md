# Icon Cropper Multi-Workspace Support

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md`.

## Purpose / Big Picture

Transform the icon-cropper config editor from a single-page tool into a **workspace-based cropping tool** where each workspace is a self-contained project for cropping icons from game screenshots.

Currently, the tool hardcodes all operations to one page (`character_select`), uses a global `config.yaml`, and overwrites screenshots. After this change, users will have:

1. **Independent workspaces** - Each workspace contains its own config.yaml, screenshots, and (future) cropped icons
2. **Multiple screenshot support** - Capture and manage multiple screenshots per workspace to handle scrolling/pagination
3. **Portable projects** - Workspaces can be zipped, shared, or archived as complete units
4. **Simple mental model** - One workspace = one cropping task (e.g., "character_select", "item_inventory")

**How to see it working:** Launch `uv run python config_editor.py` from `tools/icon-cropper/`. You see a workspace selector dropdown at the top. Select "character_select" workspace, capture multiple screenshots by scrolling through the game UI, draw the grid once, and all screenshots are preserved. Switch to "item_inventory" workspace - it has its own config, screenshots, and grid settings. Click [+] to create a new workspace with a fresh config from template.

**Why this matters:** The config editor GUI already implements the complete icon-cropping pipeline (screenshot → grid drawing → preview). Looking at the original IMPLEMENTATION_PLAN.md, the only missing piece is the cropping algorithm itself. Making workspaces self-contained transforms this from a "config editor" into a complete icon-cropping tool aligned with the original vision.

## Progress

### Phase 1: Initial Implementation (Config-Centric) - COMPLETED BUT WRONG ARCHITECTURE
- [x] (2025-11-15) Create workspace directory structure and management module
- [x] (2025-11-15) Implement workspace.json metadata schema
- [x] (2025-11-15) Add page selector dropdown UI with [+] create button
- [x] (2025-11-15) Add screenshot list widget (scrollable, radio button selection)
- [x] (2025-11-15) Update capture workflow to save numbered screenshots to workspace
- [x] (2025-11-15) Implement screenshot selection (click to display on canvas)
- [x] (2025-11-15) Implement delete screenshot with safety checks
- [x] (2025-11-15) Create "New Page" dialog with validation
- [x] (2025-11-15) Implement page switching with unsaved changes warning
- [x] (2025-11-15) Update load_from_config() to use selected page
- [x] (2025-11-15) Update save_config() to save to selected page in config.yaml
- [x] (2025-11-15) Add workspace state persistence (remember last page)
- [x] (2025-11-15) Migrate existing test_capture.png workflow to workspace model
- [x] (2025-11-15) Test multi-page workflow end-to-end - ISSUES FOUND, ARCHITECTURE WRONG

### Phase 2: Refactor to Workspace-Centric Architecture - COMPLETED WITH ISSUES
- [x] (2025-11-15) Create config.yaml template for new workspaces
- [x] (2025-11-15) Add editor/config_template.py module with create_workspace_config()
- [x] (2025-11-15) Refactor ConfigSerializer to support per-workspace config.yaml paths
- [x] (2025-11-15) Update WorkspaceManager.create_workspace() to create config.yaml from template
- [x] (2025-11-15) Refactor config_editor.py initialization to load workspace config
- [x] (2025-11-15) Update load_from_config() to read from workspace/config.yaml
- [x] (2025-11-15) Update save_config() to write to workspace/config.yaml
- [x] (2025-11-15) Remove "available_pages" concept - list workspaces from directories
- [x] (2025-11-15) Update page dropdown to show workspace names
- [x] (2025-11-15) Rename "Create New Page" to "Create New Workspace"
- [x] (2025-11-15) Fix bug: Remove last screenshot protection (allow empty lists)
- [x] (2025-11-15) Replace all self.current_page → self.current_workspace
- [x] (2025-11-15) Update preferences to use "last_workspace" instead of "last_page"
- [x] (2025-11-15) Create default workspaces (character_select, item_inventory) with configs
- [x] (2025-11-15) Add CanvasController.clear() method for state reset
- [x] (2025-11-15) Fix canvas clearing on workspace switch and screenshot delete
- [x] (2025-11-15) Fix: Grid/OCR overlays persist when switching workspaces (FIXED in Phase 3)
- [ ] Fix regression: Restore grid handles visibility
- [ ] Test workspace-centric workflow end-to-end
- [ ] Update documentation (README, CLAUDE.md)

### Phase 3: Refactor Overlay Management Architecture - COMPLETED
- [x] (2025-11-15) Implemented unified overlay management system in CanvasController
- [x] (2025-11-15) Added overlay API: set_overlay(), get_overlay(), has_overlay(), clear_overlay()
- [x] (2025-11-15) Updated clear() to automatically reset all overlays
- [x] (2025-11-15) Removed grid_drawn/ocr_drawn flags from config_editor.py
- [x] (2025-11-15) Updated all overlay checks to use has_overlay() API
- [x] (2025-11-15) Updated overlay setters to use set_overlay() API
- [x] (2025-11-15) Workspace switching now automatically clears all overlays

### Phase 4: Photoshop-like Tool System - COMPLETED
- [x] (2025-11-15 12:19Z) Created base_tool.py - Abstract interface for all tools
- [x] (2025-11-15 12:19Z) Created tool_manager.py - Tool selection and event delegation
- [x] (2025-11-15 12:19Z) Created select_tool.py - Default pan/zoom/resize tool
- [x] (2025-11-15 12:19Z) Created draw_grid_tool.py - Grid drawing tool (wraps GridEditor)
- [x] (2025-11-15 12:19Z) Created draw_ocr_tool.py - OCR drawing tool (wraps OCREditor)
- [x] (2025-11-15 12:19Z) Integrated ToolManager into ConfigEditorApp initialization
- [x] (2025-11-15 12:19Z) Fixed handle visibility logic - always show when overlay exists (not just ADJUST step)
- [x] (2025-11-15 12:19Z) Added _should_show_grid_handles() and _should_show_ocr_handles() methods
- [x] (2025-11-15 12:19Z) Updated event routing (on_mouse_press/move/release) to delegate to ToolManager
- [x] (2025-11-15 12:19Z) Updated mode entry methods to use tool switching
- [x] (2025-11-15 12:19Z) Added auto-switch to select tool after drawing completes
- [x] (2025-11-15 12:19Z) Application tested - runs without errors, handles visible as expected
- [ ] Update UI with radio buttons for visual tool selection feedback (optional)

### Phase 5: Multi-Overlay Support - COMPLETED
- [x] (2025-11-16) Fixed grid drawing activation bug - removed redundant image existence check
- [x] (2025-11-16) Fixed shared config reference bug - overlays now get independent config copies
- [x] (2025-11-16) Multiple grid overlays can now be created independently
- [x] (2025-11-16) Multiple OCR overlays can now be created independently
- [x] (2025-11-16) Each overlay maintains independent configuration
- [x] (2025-11-16) Verified resize handles work correctly (Phase 4 fix confirmed)
- [x] (2025-11-16) Verified resize targets correct overlay (config copy fix confirmed)
- [x] (2025-11-16) Verified grid resize modifier keys work (Ctrl/Shift functional)
- [x] (2025-11-16) Tested multi-overlay workflow - all critical features working

### Future Improvements (Not Part of This ExecPlan)
- [ ] Feature: Add Ctrl/Shift modifier key support to OCR resize (grid already has this)
- [ ] Fix: Preview icon page horizontal scrolling with Shift+scroll
- [ ] Implement actual cropping algorithm (complete IMPLEMENTATION_PLAN.md vision)
- [ ] Add overlay persistence per screenshot (currently per workspace)

## Surprises & Discoveries

### S1: New Page Creation Doesn't Persist to config.yaml (2025-11-15)

**Observation:** When creating a new page via the [+] button dialog, the page is added to the in-memory `self.config['pages']` dict and workspace is created, but the config.yaml file is never updated. When save_config() is later called, it fails with "Page 'gacha_detail' not found in config".

**Evidence:** Error dialog showing "Failed to save config: Page 'gacha_detail' not found in config"

**Root Cause:** The `create_new_page()` method modifies `self.config` but never calls `config_serializer.save()`. The ConfigSerializer.save() method reloads config.yaml from disk and expects the page to already exist.

**Impact:** Users cannot save configurations for newly created pages.

**Resolution:** This is a symptom of the config-centric architecture. In workspace-centric design, each workspace has its own config.yaml created from a template, eliminating this issue.

### S2: Cannot Delete Last Screenshot (2025-11-15)

**Observation:** The WorkspaceManager.delete_screenshot() method refuses to delete the last screenshot in a workspace, returning False when `len(screenshots) <= 1`.

**Evidence:** Error dialog "Cannot delete the last screenshot"

**Design Decision:** This was implemented as a safety check (Decision D4 in original plan), but user feedback indicates this is too restrictive. Users should be able to have workspaces with no screenshots.

**Impact:** Users cannot clear out all screenshots to start fresh, they must manually delete workspace directories.

**Fix Required:** Remove the `if len(metadata["screenshots"]) <= 1: return False` check.

### S3: Grid Handles Disappeared (2025-11-15)

**Observation:** After the UI refactoring, the 8 resize handles on the grid overlay are no longer visible. Grid can be drawn but not adjusted via handles.

**Evidence:** Visual inspection shows grid overlay renders but handles missing.

**Root Cause:** Likely a regression introduced during UI changes. The grid_renderer.draw_grid_overlay() or handle binding code may have been affected.

**Impact:** Users cannot resize grids interactively, must use spinboxes only.

**Investigation Needed:** Check grid_renderer and handle drawing logic.

### S4: OCR Region Drawing Erases Existing Region (2025-11-15)

**Observation:** When clicking "Draw OCR Region", any existing OCR region on canvas disappears. In contrast, "Draw Grid Layout" preserves the existing grid overlay.

**Evidence:** Visual behavior inconsistency between grid and OCR editing modes.

**Design Issue:** This is unrelated to workspace feature, but points to future requirement: users want to define multiple grid regions or OCR regions per page (e.g., for complex layouts with multiple icon grids).

**Impact:** Users cannot verify existing OCR region before re-drawing it.

**Note:** Out of scope for this ExecPlan.

### S5: Preview Icon Window Cannot Scroll Horizontally with Shift+Scroll (2025-11-15)

**Observation:** The preview icon window doesn't support Shift+scroll for horizontal scrolling, making it hard to navigate wide grids.

**Evidence:** User testing feedback.

**Note:** Unrelated to workspace feature, out of scope.

### S6: Workspace Architecture - Fundamental Design Error (2025-11-15)

**Observation:** User correctly identified that each workspace SHOULD have its own config.yaml file, not share a global one.

**Root Cause:** Initial implementation was "config-centric" (global config.yaml with multiple pages) instead of "workspace-centric" (each workspace is self-contained).

**Realization:** Looking at IMPLEMENTATION_PLAN.md, the original vision was a complete icon-cropping tool. The config editor GUI already has the complete pipeline: screenshot → grid drawing → preview. The only missing piece is the cropping algorithm itself. Therefore, workspaces should be the primary entity, not pages in a config file.

**Impact:** Requires architectural refactor from config-centric to workspace-centric design. See Decision D1 (REVISED).

**What This Means:**
- Each workspace = one complete cropping project
- Workspaces are portable (can be zipped/shared)
- No concept of "global available pages" - pages are just workspace directory names
- Simpler mental model for users
- Aligns with IMPLEMENTATION_PLAN.md vision

### S7: Overlay State Management - Architecture Issue (2025-11-15)

**Observation:** After implementing workspace-centric architecture, grid and OCR overlays from previous workspace persist when switching to a new workspace. The canvas shows the old overlays even though the config has been reloaded.

**Evidence:** User testing - switching from workspace A (with grid) to workspace B (without grid) still shows workspace A's grid overlay on the canvas.

**Root Cause:** Visual state is split across multiple concerns:
- `config_editor.py`: Owns `grid_drawn` and `ocr_drawn` flags
- `canvas_controller.py`: Owns image display state (current_image, zoom, pan)
- `grid_renderer.py`: Draws overlays based on flags from config_editor
- Manual synchronization required: Every `canvas_controller.clear()` must be followed by manually resetting `grid_drawn = False` and `ocr_drawn = False`

**Impact:**
- Hard to maintain: Multiple places need to be updated when clearing state
- Overlays persist across workspace switches because `display_image()` redraws them based on stale flags
- Violates single responsibility principle: visual state should be owned by the visual controller

**Solution:** Refactor to make CanvasController own ALL visual state:
```python
class CanvasController:
    def __init__(self, ...):
        self.current_image = None
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]
        self.grid_overlay = None      # NEW: owns grid state
        self.ocr_overlay = None        # NEW: owns OCR state

    def clear(self):
        """Clear canvas and ALL visual state."""
        self.canvas.delete("all")
        self.current_image = None
        self.grid_overlay = None       # Automatically resets
        self.ocr_overlay = None         # Automatically resets
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]
```

**Benefits:**
- Single source of truth for all visual state
- `clear()` automatically resets everything - no manual flag management needed
- Workspace switching becomes: `canvas_controller.clear()` → load new config → `canvas_controller.set_overlays(grid, ocr)` → `canvas_controller.display_image()`
- Eliminates coupling between config_editor and visual rendering

**Status:** Requires Phase 3 refactoring (see Phase 3 tasks above).

## Decision Log

### D1: Workspace-Centric Architecture - REVISED (2025-11-15)

**Original Decision (WRONG):** Use a global config.yaml with multiple pages, workspace directories only contain screenshots and metadata.

**Revised Decision:** Each workspace is self-contained with its own config.yaml. Workspaces are independent cropping projects.

**Rationale for Revision:**
- The config editor has evolved beyond "just editing config.yaml" - it's a complete icon cropping tool
- Looking at IMPLEMENTATION_PLAN.md, the only missing piece is the cropping algorithm itself
- Each workspace represents a complete "cropping project" (screenshots + grid settings + output config)
- Self-contained workspaces are portable - can be zipped/shared/archived independently
- Aligns with the original vision: workspaces are the primary entity, not pages in a config file
- Simpler mental model: "one workspace = one cropping task" vs "one config.yaml = many pages"
- Eliminates the concept of "available pages" - pages are just workspace names

**New Structure:**
```
tools/icon-cropper/
├── config.yaml                    # Template for new workspaces (no longer used at runtime)
├── workspaces/
│   ├── character_select/
│   │   ├── config.yaml           # Grid, OCR, output settings for THIS workspace
│   │   ├── screenshots/
│   │   │   ├── 001.png
│   │   │   ├── 002.png
│   │   │   └── 003.png
│   │   ├── cropped/              # Future: batch crop output
│   │   │   ├── 001/
│   │   │   └── 002/
│   │   └── workspace.json        # Metadata (selected screenshot, timestamps)
│   ├── item_inventory/
│   │   ├── config.yaml           # Different config for different workspace
│   │   ├── screenshots/
│   │   └── workspace.json
│   └── gacha_detail/             # User-created workspaces
│       ├── config.yaml
│       ├── screenshots/
│       └── workspace.json
```

**Migration Impact:**
- Global config.yaml becomes a template only
- ConfigSerializer must accept config path parameter (workspace-specific)
- Workspace selector dropdown lists directory names from `workspaces/`
- "Create new page" becomes "Create new workspace" - copies template to new directory
- Each workspace's config.yaml contains only that workspace's settings (no `pages:` section)

### D2: No Screenshot Preview Dialog (2025-11-15)

**Decision:** Captured screenshots display directly on the canvas without a preview dialog.

**Rationale:**
- Immediate visual feedback is faster than dialog flow
- Canvas is the primary workspace - seeing the screenshot there is most natural
- Users can immediately delete or retake if unhappy with capture
- Reduces UI complexity and clicks

### D3: Screenshot List with Radio Selection (2025-11-15)

**Decision:** Use a scrollable list widget with radio button selection in the sidebar.

**Rationale:**
- Only one screenshot can be displayed on canvas at a time
- Radio buttons make the selection model clear
- Shows all available screenshots at a glance
- Displays metadata (filename, resolution) for context
- Scrollable to handle 10+ screenshots for heavily paginated game UI

### D4: Auto-Numbered Screenshot Filenames (2025-11-15)

**Decision:** Use sequential numbering (001.png, 002.png, 003.png) instead of timestamps or user-provided names.

**Rationale:**
- Simple and predictable naming
- Easy to reference in cropped output directories
- Numbers sort naturally in file browsers
- Avoids filename collisions
- Users can add notes in workspace.json metadata if needed

### D5: Workspace Creation with Clone Option (2025-11-15)

**Decision:** New workspace dialog offers optional cloning from an existing workspace's config.yaml.

**Rationale:**
- Many game UIs have similar layouts (same grid, different content)
- Cloning saves time re-drawing identical grids
- Still allows creating from scratch (uses template)
- Users can pick any existing workspace as a source

**Updated from "Page Creation":** Now clones entire config.yaml, not just grid section from global config.

### D6: Preserve Overlays When Switching Screenshots (2025-11-15)

**Decision:** When user selects a different screenshot from the list, keep grid and OCR overlays visible.

**Rationale:**
- Same workspace configuration applies to all screenshots in the workspace
- User needs to verify grid alignment across all screenshots (especially for scrolling UI)
- Switching screenshots is primarily for verification, not configuration changes
- Grid/OCR are workspace-level settings, not screenshot-level

### D7: Allow Empty Screenshot Lists - REVISED (2025-11-15)

**Original Decision:** Protect last screenshot from deletion to prevent empty workspaces.

**Revised Decision:** Allow empty screenshot lists. Remove the `len(screenshots) <= 1` protection.

**Rationale:**
- User feedback: restriction is too rigid
- Empty workspaces are valid - users may configure grid first, capture later
- Simpler code - no special case handling
- UI can handle empty lists gracefully (show "No screenshots" message)
- Delete button can be disabled when list is empty (UI-level check, not data-level)

### D8: Overlay State Should Be Owned by CanvasController (2025-11-15)

**Decision:** Refactor overlay management so CanvasController owns all visual state, including grid and OCR overlays.

**Problem:** Current architecture splits visual state across multiple classes:
- `config_editor.py` owns `grid_drawn` and `ocr_drawn` flags
- `canvas_controller.py` owns image state
- Requires manual synchronization when clearing canvas

**New Design:**
- Move `grid_overlay` and `ocr_overlay` state into CanvasController
- `clear()` automatically resets all visual state (no manual flag management)
- Add `set_grid_overlay(grid_config)` and `set_ocr_overlay(ocr_config)` methods
- `display_image()` manages overlay rendering internally based on its own state

**Rationale:**
- **Single Responsibility:** Visual controller should own all visual state
- **Maintainability:** No manual synchronization needed when clearing
- **Correctness:** Eliminates bugs where overlays persist after workspace switch
- **Encapsulation:** config_editor doesn't need to track rendering state

**Implementation Path:**
1. Add overlay state fields to CanvasController
2. Add setter methods for grid/OCR overlays
3. Update `clear()` to reset overlay state
4. Update `display_image()` to render overlays from internal state
5. Remove `grid_drawn`/`ocr_drawn` from config_editor.py
6. Update all callers to use new API

**Status:** Planned for Phase 3 (see S7 for detailed analysis).

### D9: Photoshop-like Tool System for Handle Visibility (2025-11-15)

**Decision:** Implement a tool-based architecture instead of workflow-based mode system.

**Problem:** Resize handles were only visible during specific workflow steps (`edit_step == ADJUST`), causing handles to disappear unexpectedly after workspace switch, config load, or mode exit. This was actually an architectural issue, not a simple bug (see S8).

**New Architecture:**

**Tools** (persistent selections):
- `SelectTool` - Default tool for pan, zoom, and resizing overlays via handles
- `DrawGridTool` - Draw new grid overlays (3-step workflow), auto-switches to Select when done
- `DrawOCRTool` - Draw new OCR regions (1-step workflow), auto-switches to Select when done

**Tool Manager** coordinates tool selection and event delegation:
```python
class ToolManager:
    active_tool: BaseTool
    tools: Dict[str, BaseTool]

    def set_active_tool(name: str)  # Switch tools
    def on_mouse_press/move/release(event, context)  # Delegate to active tool
```

**Handle Visibility Rule** (data-based, not workflow-based):
```python
show_handles = (overlay_exists AND NOT currently_drawing)
```

**Benefits:**

1. **Predictable behavior**: Handles always visible when overlay exists (unless actively drawing new overlay)
2. **Separation of concerns**: Tool selection (user intent) vs workflow state (drawing steps) are now independent
3. **Auto-switch convenience**: After drawing grid, immediately switches to Select tool → handles visible → user can adjust
4. **Extensibility**: Easy to add new tools (ResizeTool, AnnotationTool, etc.) without changing handle logic
5. **Photoshop-like UX**: Users understand "select a tool, use it, switch tool" mental model

**Implementation:**
- Created 5 new files in `editor/`: `base_tool.py`, `tool_manager.py`, `select_tool.py`, `draw_grid_tool.py`, `draw_ocr_tool.py`
- Wrapped existing `GridEditor` and `OCREditor` (preserve their state machines)
- Updated event routing to delegate to `tool_manager.active_tool`
- Updated handle visibility checks to use `_should_show_grid_handles()` (checks data + tool state)

**Migration Path:**
- Phase 1: Add tool infrastructure (non-breaking)
- Phase 2: Change handle visibility logic (breaking - fixes S3)
- Phase 3: Update event routing to tool delegation
- Phase 4: Optional - Add radio buttons for visual tool selection feedback

**Rationale:**
The mode system was fundamentally confused about its purpose. "Grid Edit Mode" wasn't a tool - it was a multi-step drawing workflow. Users needed a way to say "I want to resize the existing grid" (Select tool) vs "I want to draw a new grid" (Draw Grid tool). The old system forced users through a workflow every time, even when they just wanted to resize.

**Alternative Considered:** Quick fix - just change handle visibility check to `if overlay_exists`. Rejected because it doesn't solve the underlying mode confusion and would make handles visible during drawing (confusing).

**Status:** Implemented in Phase 4. Application tested and working correctly.

## Outcomes & Retrospective

### Phase 2 Outcomes (2025-11-15)

**Achievements:**
- ✅ Successfully refactored from config-centric to workspace-centric architecture
- ✅ Each workspace is now self-contained with its own config.yaml
- ✅ Workspaces can be created, cloned, and switched independently
- ✅ Config files are automatically created from templates
- ✅ Empty screenshot lists are now allowed (better UX)
- ✅ Canvas clearing works correctly on workspace switch and screenshot delete

**Issues Discovered:**
- ❌ Grid/OCR overlays persist when switching workspaces (architecture issue)
- ❌ Visual state management is split across multiple classes (maintainability issue)
- ⚠️ Grid handles visibility regression (not yet investigated)

**Key Learnings:**

1. **Template-based config creation is essential:** Having `create_workspace()` always create a config.yaml from template eliminates error handling complexity and ensures consistency.

2. **State ownership matters:** Splitting visual state (grid_drawn, ocr_drawn) from visual controller (CanvasController) creates maintenance burden and bugs. Visual state should be owned by the visual controller.

3. **Clear before load pattern:** When switching contexts (workspaces), always clear ALL state first, then load new state. Order matters: clear → load config → load screenshots → display.

4. **User testing reveals architectural issues:** The overlay persistence bug was not caught during implementation - it only became apparent during actual workspace switching tests. Early and frequent testing is critical.

**Next Steps:**
- Phase 3: Refactor overlay management to fix the architecture issue (see S7 and D8)
- Fix grid handles visibility regression
- Comprehensive end-to-end testing
- Update documentation

### Phase 3 Outcomes (2025-11-15)

**Achievements:**
- ✅ Implemented unified overlay management system in CanvasController
- ✅ Created extensible overlay API (set_overlay, get_overlay, has_overlay, clear_overlay)
- ✅ Removed all grid_drawn/ocr_drawn flags from config_editor.py
- ✅ Fixed overlay persistence bug - overlays now clear automatically on workspace switch
- ✅ Fixed OCR overlay visibility - OCR regions now show correctly after workspace load
- ✅ Fixed OCR renderer consistency - OCR overlays now behave like grid overlays
- ✅ Removed legacy screenshot migration code

**Issues Fixed:**

1. **Overlay Persistence (S7)**: Overlays from previous workspace no longer persist after switching
   - Root cause: Split visual state between config_editor and CanvasController
   - Solution: Unified overlay state in CanvasController with automatic cleanup

2. **OCR Overlay Not Showing**: OCR regions weren't visible after workspace load or mode switching
   - Root cause 1: edit_step not set to ADJUST when loading existing OCR config
   - Root cause 2: OCR renderer hid overlay during DEFINE step (inconsistent with grid)
   - Solution: Set edit_step to ADJUST when overlay exists, fixed renderer to show overlay based on data existence

3. **Spinbox Callback Race Condition**: Workspace loading triggered premature redraws via spinbox callbacks
   - Root cause: var.set() during workspace load triggered _on_grid_param_changed callbacks
   - Solution: Added _loading_workspace flag to skip callbacks during workspace initialization

**Key Improvements:**

1. **Unified Overlay System**: All overlays now use dict-based system:
   ```python
   self.overlays = {'grid': [config], 'ocr': [config], ...}
   ```

2. **Clean API**: Simple, consistent methods:
   ```python
   canvas_controller.set_overlay('grid', config)
   canvas_controller.has_overlay('grid')
   canvas_controller.clear()  # Clears everything
   ```

3. **Automatic Cleanup**: Workspace switching is now safe:
   ```python
   self.canvas_controller.clear()  # Resets image, zoom, pan, AND overlays
   ```

4. **Extensibility**: Future overlay types require zero code changes:
   ```python
   canvas_controller.set_overlay('annotation', {...})
   canvas_controller.set_overlay('grid', config, 1)  # Multiple grids
   ```

5. **Renderer Consistency**: Both grid and OCR renderers now show overlays based on data existence, not workflow state

**Code Changes:**
- Modified `editor/canvas_controller.py`: Added overlay management (+65 lines)
- Modified `config_editor.py`: Removed grid_drawn/ocr_drawn, added overlay API usage (~20 locations)
- Modified `editor/grid_renderer.py`: Fixed OCR rendering logic for consistency
- Removed legacy migration code

**Testing Results:**
- ✅ Workspace switching clears overlays correctly
- ✅ Grid overlays show on first screenshot selection
- ✅ OCR overlays show on first screenshot selection
- ✅ Overlays persist within same workspace
- ✅ Mode switching (Grid → Pan → Grid) preserves overlays
- ✅ Mode switching (OCR → Pan → OCR) preserves overlays
- ⚠️ Resize handles not visible (pre-existing issue S3)

**Lessons Learned:**

1. **Extensible design prevents future refactors**: Dict-based overlay system allows unlimited overlay types without code changes

2. **Single source of truth eliminates synchronization bugs**: Moving overlay state into CanvasController eliminated all manual flag management

3. **Renderer should render data, not workflow state**: OCR renderer was hiding overlays based on edit_step instead of data existence - inconsistent with grid behavior

4. **Callback suppression during batch updates**: When programmatically updating UI elements (spinboxes), suppress callbacks to prevent race conditions

5. **Consistency between similar components**: Grid and OCR editors should behave identically - differences indicate design flaws

**Remaining Work:**
- Fix grid/OCR resize handles visibility (S3) - **FIXED IN PHASE 4**
- End-to-end testing of complete workspace workflow
- Update documentation (README, CLAUDE.md)

### Phase 4 Outcomes (2025-11-15)

**Achievements:**
- ✅ Implemented Photoshop-like tool system with 3 tools (Select, Draw Grid, Draw OCR)
- ✅ Fixed resize handle visibility regression (S3) - handles now always visible except during drawing
- ✅ Decoupled handle visibility from workflow state (edit_step) to data state (overlay exists)
- ✅ Auto-switch behavior - drawing tools automatically switch to Select tool when done
- ✅ Maintained backward compatibility - wrapped existing GridEditor and OCREditor state machines
- ✅ Application runs without errors, handles visible as expected
- ✅ All resize operations work correctly (grid and OCR handles)

**Issues Fixed:**

1. **Resize Handle Visibility (S3)**: Root cause was architectural - handle visibility was coupled to workflow state instead of data state
   - Solution: Tool-based architecture where handles are visible when overlay exists AND not drawing
   - Result: Handles now always visible after loading config, switching workspaces, or completing drawing

2. **Mode Confusion**: Old "mode system" conflated tool selection with drawing workflow state
   - Solution: Separate concerns - ToolManager handles tool selection, editors handle workflow
   - Result: Clear mental model - Select tool (default) vs Draw Grid tool vs Draw OCR tool

**Key Improvements:**

1. **Predictable UX**: Users can now resize grids immediately after:
   - Loading existing config
   - Switching workspaces
   - Drawing a new grid (auto-switches to Select tool)
   - No need to manually "enter" or "exit" modes

2. **Tool System Architecture**:
   ```python
   # Clean abstraction
   class BaseTool(ABC):
       def on_mouse_press/move/release(event, context) -> bool

   # Event delegation
   tool_manager.on_mouse_press(event, context)  # Routes to active tool

   # Data-based visibility
   show_handles = has_overlay('grid') and not isinstance(active_tool, DrawGridTool)
   ```

3. **Auto-Switch Pattern**: Drawing tools automatically switch to Select tool on completion
   - User draws grid → Release mouse → **Auto-switch to Select** → Handles immediately visible
   - Matches Photoshop behavior (shape tools auto-switch after drawing)
   - Eliminates extra "exit mode" step

4. **Extensibility**: Adding new tools is trivial:
   ```python
   class AnnotationTool(BaseTool):  # Future tool
       # ... implement mouse handlers

   tool_manager.register_tool('annotate', AnnotationTool())
   ```

**Code Changes:**
- Added 5 new files: `base_tool.py`, `tool_manager.py`, `select_tool.py`, `draw_grid_tool.py`, `draw_ocr_tool.py` (+600 lines)
- Modified `config_editor.py`: Added tool manager integration, updated event routing, updated handle visibility (~50 lines changed)
- No changes to existing editors (GridEditor, OCREditor) - wrapped, not rewritten

**Testing Results:**
- ✅ Load existing config → Handles visible immediately
- ✅ Draw new grid → Auto-switch to Select → Handles visible
- ✅ Switch workspace → Handles visible for loaded overlays
- ✅ Resize via handles → Grid adjusts correctly
- ✅ Draw OCR region → Auto-switch → OCR handles visible
- ✅ Pan/zoom work in Select tool mode
- ⚠️ Buttons don't show active tool visually (Phase 4 optional task - not critical)

**Lessons Learned:**

1. **Architectural bugs vs code bugs**: S3 looked like a simple visibility bug but was actually an architectural issue. The mode system was fundamentally confused about its purpose.

2. **Separation of concerns prevents coupling**: Conflating "tool selection" (user intent) with "workflow state" (internal steps) created invisible dependencies that caused bugs.

3. **Data state > workflow state for UI**: Visual elements (handles) should be visible based on **data existence** (overlay exists), not **workflow position** (edit_step).

4. **Wrapper pattern for migration**: Wrapping existing editors in tool classes allowed incremental refactor without rewriting proven code.

5. **Auto-switch improves UX**: Eliminating manual mode exit steps reduces cognitive load and clicks.

**Remaining Work:**
- ⚠️ Optional: Update UI with radio buttons for visual tool selection (not critical - tools work fine)
- End-to-end testing of complete workspace workflow
- Update documentation (README, CLAUDE.md)

### Phase 5 Outcomes (2025-11-16)

**Achievements:**
- ✅ Fixed critical grid/OCR drawing activation bug
- ✅ Fixed multi-overlay shared config reference bug
- ✅ Multi-overlay support now fully functional
- ✅ Removed architectural redundancy (image existence check)
- ✅ Improved separation of concerns (controller validates, not editor)

**Issues Fixed:**

1. **Drawing Tool Activation (S9, Bug 1)**: Grid and OCR drawing tools completely non-functional
   - Root cause: Redundant `current_image is None` check in editor, tools passed `None`
   - Solution: Removed unused parameter and check, rely on controller-level validation
   - Result: Drawing tools now activate correctly

2. **Shared Config References (S9, Bug 2)**: Multiple overlays rendered at same position
   - Root cause: Overlays shared same config dict by reference
   - Solution: Pass config copies using `dict()` constructor
   - Result: Each overlay has independent configuration

**Key Improvements:**

1. **Cleaner Architecture**: Removed redundant validation layer
   ```python
   # BEFORE (redundant):
   config_editor validates image → grid_editor validates image again

   # AFTER (clean):
   config_editor validates image → grid_editor trusts it
   ```

2. **Independent Overlays**: Config isolation prevents shared state bugs
   ```python
   # BEFORE (shared):
   overlay1.config → self.grid_config ← overlay2.config  # Same dict!

   # AFTER (isolated):
   overlay1.config → dict(grid_config)  # Copy 1
   overlay2.config → dict(grid_config)  # Copy 2
   ```

3. **Symmetric Tool Design**: Grid and OCR tools now perfectly symmetric
   - Same parameter signatures
   - Same activation flow
   - Same config copying pattern
   - Easier to maintain and understand

**Testing Results:**
- ✅ Draw Grid Layout button activates tool
- ✅ Draw OCR Region button activates tool
- ✅ Can create 3+ grid overlays with different positions
- ✅ Can create 3+ OCR overlays with different positions
- ✅ Each overlay selectable and independently visible
- ✅ Loaded overlays from workspace.json still work
- ✅ Resize handles show at correct positions (fixed in Phase 4)
- ✅ Adjusting first overlay doesn't affect second overlay (config copy fix)
- ✅ Ctrl/Shift modifiers work during grid resize
- ℹ️ OCR resize doesn't implement modifier keys (feature gap, not a bug)

**Lessons Learned:**

1. **User testing catches architectural issues early**: The grid tool being completely broken was caught immediately by user testing after tool system implementation.

2. **Symmetric design aids debugging**: User's insight that "grid and OCR should be symmetric" immediately pointed to the `current_image` parameter issue affecting both.

3. **Dict sharing is subtle**: Loaded overlays worked (JSON creates new dicts) but drawn overlays failed (reference sharing). Different code paths need testing.

4. **Defensive programming can break**: The `current_image is None` check was meant to be safe, but became a roadblock when tools couldn't provide the parameter.

5. **Separation of concerns prevents duplication**: Image validation belongs to the controller that manages images, not the editor that draws overlays.

**Remaining Work:**
- ✅ All critical bugs fixed!
- ⚠️ Optional: Add Ctrl/Shift modifier support to OCR resize (feature enhancement)
- End-to-end testing of complete multi-overlay workflow
- Update documentation (README, CLAUDE.md)

### S8: Resize Handle Visibility Architecture Issue (2025-11-15)

**Observation:** The resize handle visibility regression (S3) was not a simple bug - it revealed a fundamental architectural problem. Handle visibility was coupled to workflow state (`edit_step == ADJUST`) instead of data state (overlay exists).

**Root Cause Analysis:**
- Handle visibility checked `grid_editor.is_in_adjust_step()` which returns `edit_step == GridEditStep.ADJUST`
- When loading existing config or switching workspaces, `edit_step` might not be set to ADJUST
- When exiting edit mode, `edit_step` could reset to SET_START, hiding handles
- The "mode" system was actually a multi-step **drawing workflow**, not a **tool selection** system

**Evidence:**
```python
# OLD CODE (WRONG):
if self.grid_editor.is_in_adjust_step():  # Only shows in specific workflow step
    self.grid_renderer.draw_resize_handles(...)

# Symptom: Handles hidden unless:
# 1. Just finished drawing grid (edit_step == ADJUST), OR
# 2. Manually entered grid edit mode and completed workflow
```

**Impact:** Users couldn't resize existing grids after workspace switch, config load, or mode changes. Handles would randomly disappear based on internal workflow state the user couldn't see.

**Solution:** Implement Photoshop-like tool system where:
- Tools are persistent selections (Select, Draw Grid, Draw OCR)
- Handles visible when overlay exists AND not currently drawing
- Drawing tools auto-switch to Select tool when done
- Handle visibility independent of workflow state

```python
# NEW CODE (CORRECT):
if self._should_show_grid_handles():  # Checks data state, not workflow state
    self.grid_renderer.draw_resize_handles(...)

def _should_show_grid_handles(self) -> bool:
    return (
        self.canvas_controller.has_overlay('grid') and  # Data exists
        not isinstance(self.tool_manager.active_tool, DrawGridTool)  # Not drawing
    )
```

**Key Insight:** The mode system confusion stemmed from conflating **tool selection** (user intent: "I want to pan" vs "I want to draw grid") with **workflow state** (internal: "waiting for first click" vs "waiting for drag release"). These should be separate concerns.

**Resolution:** Phase 4 tool system (see Decision D9).

### S9: Multi-Overlay Architecture Bugs (2025-11-16)

**Observation:** After implementing the tool-based architecture, users reported two critical bugs when trying to create multiple overlays:
1. Grid drawing tool doesn't activate - clicking "Draw Grid Layout" shows no response
2. Creating a second grid/OCR overlay causes the first one to disappear from canvas, though both remain in the overlays list

**Evidence:**
- User testing showed grid tool completely non-functional
- OCR tool had same issue (symmetric design)
- Second overlay would render at same position as first, causing visual overlap
- Both overlay entries appeared in sidebar list, but only one visible on canvas

**Root Cause Analysis:**

**Bug 1: Grid Drawing Activation Failure**
- DrawGridTool.on_activate() called `grid_editor.enter_grid_edit_mode(canvas, None)`
- GridEditor.enter_grid_edit_mode() checked `if current_image is None: return False`
- This check was redundant - ConfigEditor already validates image existence before tool activation
- The `current_image` parameter was never actually used, only checked for None
- Passing `None` from tool caused immediate exit, preventing mode entry

**Bug 2: Shared Config Reference**
- DrawGridTool.on_mouse_release() called `add_overlay('grid', context['grid_config'])`
- This passed the dict **by reference**, not by value
- All overlays shared the same `self.grid_config` dict instance
- Drawing second grid modified `self.grid_config['start_x']` to new position
- First overlay's config pointed to same dict → both rendered at new position → visual overlap
- Loaded overlays worked fine because JSON deserialization creates new dict instances

**Impact:**
- Grid and OCR drawing tools completely broken (Bug 1)
- Multi-overlay feature unusable - all overlays share same config (Bug 2)
- Only pre-loaded overlays from workspace.json worked correctly

**Solution:**

**Fix 1: Remove Redundant Image Check**
- Removed `current_image` parameter from `enter_grid_edit_mode()` and `enter_ocr_edit_mode()`
- Removed `if current_image is None: return False` check
- Image existence validated at controller level (config_editor.py) - proper separation of concerns
- Tools now call `grid_editor.enter_grid_edit_mode(canvas)` without image parameter

**Fix 2: Deep Copy Config Dicts**
- Changed `add_overlay('grid', context['grid_config'])` to `add_overlay('grid', dict(context['grid_config']))`
- Each overlay now gets independent copy using `dict()` constructor
- Same fix applied to DrawOCRTool
- Overlays no longer share config references

**Files Modified:**
- `editor/grid_editor.py`: Removed `current_image` parameter (lines 63-82)
- `editor/ocr_editor.py`: Removed `current_image` parameter (lines 54-74)
- `editor/draw_grid_tool.py`: Updated call signature, added config copy (lines 33, 114)
- `editor/draw_ocr_tool.py`: Updated call signature, added config copy (lines 32, 112)

**Testing Results:**
- ✅ Grid drawing tool activates correctly
- ✅ OCR drawing tool activates correctly
- ✅ Multiple grid overlays can be created independently
- ✅ Multiple OCR overlays maintain separate positions/sizes
- ✅ Loaded overlays continue to work correctly
- ⚠️ Resize issues remain (handles at wrong position, modifying wrong overlay)

**Key Insights:**

1. **Redundant validation is dangerous**: The image existence check was "safety" code that actually broke functionality. Controller-level validation was sufficient.

2. **Python dict sharing gotcha**: Passing dicts by reference is Python's default behavior. Multi-instance systems need explicit copying to avoid shared state.

3. **Asymmetric testing reveals bugs**: Loaded overlays worked (new dicts from JSON) but newly drawn overlays failed (shared dict reference). Testing both code paths is essential.

4. **User-reported architecture insight**: User correctly identified that grid and OCR tools should be symmetric - this guided the investigation to find both had the same `current_image` check issue.

**Status:** Both bugs fixed in Phase 5. Multi-overlay support now fully functional.

## Context and Orientation

**What exists:** The icon-cropper tool at `tools/icon-cropper/` is a GUI application for configuring grid-based icon extraction from game screenshots. It was originally designed to edit a global `config.yaml` file with multiple page definitions.

**Current state (Phase 1 complete):**
- WorkspaceManager class exists, manages workspace directories and metadata
- UI has workspace selector dropdown, screenshot list, capture/delete buttons
- Screenshots save to `workspaces/{name}/screenshots/001.png`, etc.
- workspace.json tracks selected screenshot and metadata
- **Problem:** Still uses global config.yaml with `pages:` section
- **Problem:** ConfigSerializer hardcoded to global config path

**Key files:**
- `config_editor.py` - Main application (477 lines)
- `editor/workspace_manager.py` - Workspace directory management (Phase 1 implementation)
- `editor/config_serializer.py` - YAML load/save with comment preservation
- `editor/ui_builder.py` - UI component construction
- `editor/canvas_controller.py` - Screenshot display management
- `capture.py` - Screenshot capture from game window
- `config.yaml` - Currently global, will become template

**Terminology:**
- **Workspace** - A self-contained cropping project directory containing config.yaml, screenshots/, cropped/, and workspace.json
- **config.yaml** - Per-workspace configuration file defining grid layout, OCR region, output settings
- **workspace.json** - Metadata file tracking selected screenshot, capture timestamps, notes
- **Screenshot list** - Multiple numbered screenshots (001.png, 002.png, ...) for handling scrolling/pagination
- **Grid configuration** - Layout parameters (start position, cell size, spacing, columns, rows) for icon extraction
- **Template** - The global config.yaml will become a template for creating new workspace configs

**Current config.yaml structure (WRONG - will be changed):**
```yaml
pages:
  character_select:
    ocr_match: "ホーム画面設定"
    grid:
      columns: 3
      rows: 5
      start_x: 963
      # ... etc
    output:
      category: "characters"
      target_dir: "public/assets/characters"
```

**Target workspace config.yaml structure (CORRECT):**
```yaml
# No 'pages:' wrapper - this IS the workspace config
ocr_match: "ホーム画面設定"
workspace_name: "character_select"

grid:
  columns: 3
  rows: 5
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
  filename_pattern: "{number:03d}.png"

# OCR region can be per-workspace or use global detection_region
ocr:
  detection_region: [10, 10, 500, 100]  # [x, y, width, height]
```

## Plan of Work

We will refactor from config-centric to workspace-centric architecture. The work breaks into four main areas:

**1. Template Creation** - Convert the global config.yaml into a template structure. Extract a single page's config (e.g., character_select) as the baseline. Create a template that new workspaces will copy.

**2. WorkspaceManager Updates** - Add method to create config.yaml from template when creating new workspace. Update list_workspaces() to be the source of truth for workspace names (no more "available_pages" from config).

**3. ConfigSerializer Refactoring** - Remove hardcoded global config path. Accept config_path parameter. Update all load/save methods to work with workspace-specific paths. Preserve YAML comment handling.

**4. ConfigEditorApp Refactoring** - Load workspace config from `workspaces/{name}/config.yaml` instead of global. Update save_config() to write to workspace config. Update load_from_config() to read from workspace config. Remove "available_pages" - list from directories. Update initialization, page switching, and workspace creation flows.

**5. Bug Fixes** - Remove last screenshot protection. Restore grid handle visibility (regression fix). Update UI to handle empty screenshot lists.

## Concrete Steps

### Step 1: Create Workspace Config Template

Create `tools/icon-cropper/config_template.yaml`:

```yaml
# Workspace configuration template
# This file is copied when creating new workspaces

workspace_name: "WORKSPACE_NAME"  # Will be replaced
ocr_match: "WORKSPACE_NAME_identifier"  # Will be replaced

grid:
  columns: 3
  rows: 4
  start_x: 0
  start_y: 0
  cell_width: 100
  cell_height: 100
  spacing_x: 0
  spacing_y: 0
  crop_padding: 0

output:
  category: "WORKSPACE_NAME"  # Will be replaced
  target_dir: "output/WORKSPACE_NAME"  # Will be replaced
  filename_pattern: "{number:03d}.png"

ocr:
  detection_region: [0, 0, 0, 0]  # User will configure
```

Create `tools/icon-cropper/editor/config_template.py`:

```python
"""Config template utilities for workspace creation."""

from pathlib import Path
from typing import Dict, Any
import yaml

def load_template() -> Dict[str, Any]:
    """Load the config template.

    Returns:
        Template config dict
    """
    template_path = Path(__file__).parent.parent / "config_template.yaml"
    with open(template_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def create_workspace_config(workspace_name: str, clone_from_path: Path = None) -> Dict[str, Any]:
    """Create a new workspace config.

    Args:
        workspace_name: Name of the workspace
        clone_from_path: Optional path to existing workspace config to clone

    Returns:
        Config dict ready to save
    """
    if clone_from_path and clone_from_path.exists():
        # Clone existing workspace config
        with open(clone_from_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        # Update workspace-specific fields
        config['workspace_name'] = workspace_name
        config['output']['category'] = workspace_name
        config['output']['target_dir'] = f'output/{workspace_name}'
        return config
    else:
        # Create from template
        config = load_template()
        # Replace placeholders
        config['workspace_name'] = workspace_name
        config['ocr_match'] = f"{workspace_name}_identifier"
        config['output']['category'] = workspace_name
        config['output']['target_dir'] = f'output/{workspace_name}'
        return config
```

### Step 2: Update WorkspaceManager for Config Creation

Modify `tools/icon-cropper/editor/workspace_manager.py`:

Add imports:
```python
import yaml
from editor.config_template import create_workspace_config
```

Update `create_workspace()` method:
```python
def create_workspace(self, page_name: str, clone_from: str = None) -> Path:
    """Create a new workspace for a page.

    Args:
        page_name: Name of the workspace (e.g., "character_select")
        clone_from: Optional workspace name to clone config from

    Returns:
        Path to the created workspace directory
    """
    workspace_path = self.workspaces_root / page_name
    workspace_path.mkdir(parents=True, exist_ok=True)

    # Create subdirectories
    (workspace_path / "screenshots").mkdir(exist_ok=True)
    (workspace_path / "cropped").mkdir(exist_ok=True)

    # Create config.yaml from template (if doesn't exist)
    config_path = workspace_path / "config.yaml"
    if not config_path.exists():
        clone_from_path = None
        if clone_from:
            clone_from_path = self.workspaces_root / clone_from / "config.yaml"

        config = create_workspace_config(page_name, clone_from_path)

        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    # Create empty metadata if doesn't exist
    metadata_path = workspace_path / "workspace.json"
    if not metadata_path.exists():
        metadata = {
            "workspace_name": page_name,
            "created_at": datetime.now().isoformat(),
            "selected_screenshot": None,
            "screenshots": []
        }
        self._save_metadata(workspace_path, metadata)

    return workspace_path
```

Update `delete_screenshot()` to remove last screenshot protection:
```python
def delete_screenshot(self, page_name: str, filename: str) -> bool:
    """Delete a screenshot.

    Args:
        page_name: Name of the page
        filename: Screenshot filename to delete

    Returns:
        True if deleted, False if screenshot not found
    """
    workspace_path = self.get_workspace_path(page_name)
    metadata = self._load_metadata(workspace_path)

    # Find screenshot in metadata
    screenshot_found = any(s["filename"] == filename for s in metadata["screenshots"])
    if not screenshot_found:
        return False

    # Delete file
    filepath = workspace_path / "screenshots" / filename
    if filepath.exists():
        filepath.unlink()

    # Update metadata
    metadata["screenshots"] = [s for s in metadata["screenshots"] if s["filename"] != filename]

    # If we deleted the selected screenshot, select another (or None if list empty)
    if metadata["selected_screenshot"] == filename:
        metadata["selected_screenshot"] = metadata["screenshots"][-1]["filename"] if metadata["screenshots"] else None

    self._save_metadata(workspace_path, metadata)
    return True
```

### Step 3: Refactor ConfigSerializer for Per-Workspace Configs

Modify `tools/icon-cropper/editor/config_serializer.py`:

Change constructor to accept optional path:
```python
class ConfigSerializer:
    """Handles loading and saving config.yaml with comment preservation."""

    def __init__(self, config_path: Path = None):
        """Initialize serializer.

        Args:
            config_path: Path to config file. If None, uses global config.yaml (for template)
        """
        if config_path is None:
            # Default to global config (template)
            config_path = Path(__file__).parent.parent / "config.yaml"
        self.config_path = config_path
```

Update `load()` method:
```python
def load(self) -> Tuple[Dict[str, Any], Optional[str]]:
    """Load configuration from YAML file.

    Returns:
        Tuple of (config dict, error message if failed)
    """
    try:
        if not self.config_path.exists():
            return {}, f"Config file not found: {self.config_path}"

        with open(self.config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        if config is None:
            return {}, "Config file is empty"

        return config, None

    except yaml.YAMLError as e:
        return {}, f"YAML parse error: {e}"
    except Exception as e:
        return {}, f"Failed to load config: {e}"
```

Update `save()` method signature to be simpler (workspace config is flat, not nested):
```python
def save(self, config: Dict[str, Any], create_backup: bool = True) -> Tuple[bool, Optional[str]]:
    """Save configuration to YAML file.

    Args:
        config: Configuration dictionary
        create_backup: Whether to create timestamped backup

    Returns:
        Tuple of (success boolean, error message if failed)
    """
    try:
        # Create backup if requested
        if create_backup and self.config_path.exists():
            self._create_backup()

        # Save config
        with open(self.config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

        return True, None

    except Exception as e:
        return False, f"Failed to save config: {e}"
```

Simplify validation methods (no more page_name parameter):
```python
def validate_grid_config(self, grid_config: Dict[str, int], image_width: int, image_height: int) -> Tuple[bool, str]:
    """Validate grid configuration against image dimensions.

    Args:
        grid_config: Grid configuration dict
        image_width: Image width in pixels
        image_height: Image height in pixels

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Validation logic remains the same
    # ... (keep existing validation)
```

### Step 4: Refactor ConfigEditorApp Initialization

Modify `tools/icon-cropper/config_editor.py`:

Update imports:
```python
from editor.config_template import create_workspace_config
```

Update `__init__` to load workspace config:
```python
def __init__(self, root: tk.Tk):
    """Initialize the Config Editor application."""
    self.root = root
    self.root.title("Icon Cropper - Configuration Editor")
    self.root.geometry("1200x800")

    # Initialize workspace manager
    workspaces_root = Path(__file__).parent / "workspaces"
    self.workspace_manager = WorkspaceManager(workspaces_root)

    # Load preferences (last workspace)
    prefs = self._load_preferences()
    self.current_workspace = prefs.get("last_workspace", "character_select")

    # Ensure current workspace exists
    if not self.workspace_manager.workspace_exists(self.current_workspace):
        self.current_workspace = "character_select"
        self.workspace_manager.create_workspace(self.current_workspace)

    # Load config from current workspace
    workspace_config_path = workspaces_root / self.current_workspace / "config.yaml"
    self.config_serializer = ConfigSerializer(workspace_config_path)
    self.config, load_error = self.config_serializer.load()

    if load_error:
        messagebox.showerror("Config Load Error", f"Failed to load workspace config:\n{load_error}")
        # Create default config
        self.config = create_workspace_config(self.current_workspace)

    # Track unsaved changes
    self.unsaved_changes = False

    # Initialize grid configuration from workspace config
    grid = self.config.get('grid', {})
    self.grid_config = {
        'start_x': grid.get('start_x', 0),
        'start_y': grid.get('start_y', 0),
        'cell_width': grid.get('cell_width', 100),
        'cell_height': grid.get('cell_height', 100),
        'spacing_x': grid.get('spacing_x', 0),
        'spacing_y': grid.get('spacing_y', 0),
        'columns': grid.get('columns', 3),
        'rows': grid.get('rows', 4),
        'crop_padding': grid.get('crop_padding', 0),
    }

    # Initialize OCR configuration from workspace config
    ocr = self.config.get('ocr', {})
    ocr_region = ocr.get('detection_region', [0, 0, 0, 0])
    self.ocr_config = {
        'x': ocr_region[0] if len(ocr_region) >= 1 else 0,
        'y': ocr_region[1] if len(ocr_region) >= 2 else 0,
        'width': ocr_region[2] if len(ocr_region) >= 3 else 0,
        'height': ocr_region[3] if len(ocr_region) >= 4 else 0,
    }

    # Track whether user has drawn grid/OCR
    self.grid_drawn = bool(grid and any(grid.values()))
    self.ocr_drawn = bool(ocr_region and any(ocr_region))

    # Migrate legacy screenshots
    self._migrate_legacy_screenshots()

    # Build UI
    self._build_ui()

    # Initialize controllers (same as before)
    # ... rest of initialization
```

Update `_build_ui()` to populate workspace dropdown from directories:
```python
# After creating UI components:

# Initialize workspace dropdown with available workspaces
workspaces = self.workspace_manager.list_workspaces()
if not workspaces:
    # Create default workspaces
    self.workspace_manager.create_workspace("character_select")
    workspaces = ["character_select"]

ui_builder.page_dropdown['values'] = workspaces
ui_builder.page_var.set(self.current_workspace)

# Initialize screenshot list for current workspace
self._refresh_screenshot_list()
```

### Step 5: Update Workspace Switching Logic

Update `on_page_changed()` to reload config serializer:
```python
def on_page_changed(self, new_workspace: str):
    """Handle workspace selector dropdown change."""
    if new_workspace == self.current_workspace:
        return

    # Check for unsaved changes
    if self.unsaved_changes:
        choice = messagebox.askyesnocancel(
            "Unsaved Changes",
            f"Save changes to '{self.current_workspace}' before switching?"
        )
        if choice is True:  # Yes
            self.save_config()
        elif choice is None:  # Cancel
            # Revert dropdown
            self.ui_builder.page_var.set(self.current_workspace)
            return
        # else: No, discard changes

    # Switch workspace
    self.current_workspace = new_workspace
    self.unsaved_changes = False

    # Reload config serializer for new workspace
    workspace_config_path = Path(__file__).parent / "workspaces" / new_workspace / "config.yaml"
    self.config_serializer = ConfigSerializer(workspace_config_path)
    self.config, load_error = self.config_serializer.load()

    if load_error:
        messagebox.showerror("Config Load Error", f"Failed to load workspace config:\n{load_error}")
        self.config = create_workspace_config(new_workspace)

    # Load workspace configuration
    self._load_workspace_config()

    # Load screenshots from workspace
    self._refresh_screenshot_list()

    # Load selected screenshot (or clear canvas if none)
    screenshots = self.workspace_manager.get_screenshots(new_workspace)
    if screenshots:
        self._load_selected_screenshot()
    else:
        # No screenshots yet, clear canvas
        self.canvas_controller.clear()
        # Offer to capture
        choice = messagebox.askquestion(
            "No Screenshots",
            f"No screenshots found for '{new_workspace}'.\n\nCapture now?",
            icon='question'
        )
        if choice == 'yes':
            self.capture_screenshot()

    self.update_status(f"Switched to workspace: {new_workspace}")
```

Rename `_load_page_config()` to `_load_workspace_config()`:
```python
def _load_workspace_config(self):
    """Load grid and OCR configuration from workspace config.yaml."""
    # Load grid config
    grid = self.config.get('grid', {})
    self.grid_config.update({
        'start_x': grid.get('start_x', 0),
        'start_y': grid.get('start_y', 0),
        'cell_width': grid.get('cell_width', 100),
        'cell_height': grid.get('cell_height', 100),
        'spacing_x': grid.get('spacing_x', 0),
        'spacing_y': grid.get('spacing_y', 0),
        'columns': grid.get('columns', 3),
        'rows': grid.get('rows', 4),
        'crop_padding': grid.get('crop_padding', 0),
    })

    # Load OCR config
    ocr = self.config.get('ocr', {})
    ocr_region = ocr.get('detection_region', [0, 0, 0, 0])
    self.ocr_config.update({
        'x': ocr_region[0] if len(ocr_region) >= 1 else 0,
        'y': ocr_region[1] if len(ocr_region) >= 2 else 0,
        'width': ocr_region[2] if len(ocr_region) >= 3 else 0,
        'height': ocr_region[3] if len(ocr_region) >= 4 else 0,
    })

    # Update UI inputs
    for param, var in self.grid_inputs.items():
        if param in self.grid_config:
            var.set(self.grid_config[param])

    for param, var in self.ocr_inputs.items():
        if param in self.ocr_config:
            var.set(self.ocr_config[param])

    # Reset drawn flags
    self.grid_drawn = bool(grid and any(grid.values()))
    self.ocr_drawn = bool(ocr_region and any(ocr_region))

    # Redraw overlays if loaded
    if self.canvas_controller.current_image:
        self.canvas_controller.display_image()
```

### Step 6: Update save_config() and load_from_config()

Update `save_config()` to save to workspace config:
```python
def save_config(self):
    """Save configuration to workspace config.yaml."""
    try:
        # Validate current screenshot loaded
        if self.canvas_controller.current_image is None:
            messagebox.showwarning("No Image", "Please load a screenshot before saving configuration")
            return

        # Get image dimensions for validation
        img_width = self.canvas_controller.current_image.width
        img_height = self.canvas_controller.current_image.height

        # Validate grid if drawn
        if self.grid_drawn:
            is_valid, error = self.config_serializer.validate_grid_config(
                self.grid_config,
                img_width,
                img_height
            )
            if not is_valid:
                messagebox.showerror("Invalid Grid Configuration", f"Grid validation failed:\n\n{error}")
                return

        # Validate OCR if drawn
        if self.ocr_drawn:
            ocr_region = [
                self.ocr_config['x'],
                self.ocr_config['y'],
                self.ocr_config['width'],
                self.ocr_config['height']
            ]
            is_valid, error = self.config_serializer.validate_ocr_region(
                ocr_region,
                img_width,
                img_height
            )
            if not is_valid:
                messagebox.showerror("Invalid OCR Region", f"OCR region validation failed:\n\n{error}")
                return

        # Update grid in config
        if self.grid_drawn:
            self.config['grid'] = {
                'columns': self.grid_config['columns'],
                'rows': self.grid_config['rows'],
                'start_x': self.grid_config['start_x'],
                'start_y': self.grid_config['start_y'],
                'cell_width': self.grid_config['cell_width'],
                'cell_height': self.grid_config['cell_height'],
                'spacing_x': self.grid_config['spacing_x'],
                'spacing_y': self.grid_config['spacing_y'],
                'crop_padding': self.grid_config['crop_padding']
            }

        # Update OCR in config
        if self.ocr_drawn:
            if 'ocr' not in self.config:
                self.config['ocr'] = {}
            self.config['ocr']['detection_region'] = [
                self.ocr_config['x'],
                self.ocr_config['y'],
                self.ocr_config['width'],
                self.ocr_config['height']
            ]

        # Save to workspace config.yaml
        success, save_error = self.config_serializer.save(self.config, create_backup=True)

        if success:
            self.unsaved_changes = False
            messagebox.showinfo(
                "Configuration Saved",
                f"Configuration saved for workspace: {self.current_workspace}\n\n"
                f"Grid: {'Yes' if self.grid_drawn else 'No'}\n"
                f"OCR: {'Yes' if self.ocr_drawn else 'No'}"
            )
            self.update_status("Configuration saved")
        else:
            messagebox.showerror("Save Error", f"Failed to save config:\n{save_error}")
            self.update_status("Configuration save failed")

    except Exception as e:
        messagebox.showerror("Error", f"An unexpected error occurred:\n{str(e)}")
        self.update_status("Configuration save failed")
```

Update `load_from_config()`:
```python
def load_from_config(self):
    """Load configuration from workspace config.yaml and display overlays."""
    try:
        # Check if image is loaded
        if self.canvas_controller.current_image is None:
            messagebox.showinfo(
                "No Image Loaded",
                "Please load or capture a screenshot first.\n\n"
                "The configuration will be applied to the image."
            )
            return

        # Reload config from disk (in case it was edited externally)
        self.config, load_error = self.config_serializer.load()
        if load_error:
            messagebox.showerror("Load Error", f"Failed to reload config:\n{load_error}")
            return

        loaded_items = []

        # Load grid configuration
        grid = self.config.get('grid', {})
        if grid and any(grid.values()):
            # Update grid_config
            self.grid_config.update({
                'start_x': grid.get('start_x', 0),
                'start_y': grid.get('start_y', 0),
                'cell_width': grid.get('cell_width', 100),
                'cell_height': grid.get('cell_height', 100),
                'spacing_x': grid.get('spacing_x', 0),
                'spacing_y': grid.get('spacing_y', 0),
                'columns': grid.get('columns', 3),
                'rows': grid.get('rows', 4),
                'crop_padding': grid.get('crop_padding', 0),
            })

            # Update grid input widgets
            for param, var in self.grid_inputs.items():
                if param in self.grid_config:
                    var.set(self.grid_config[param])

            self.grid_drawn = True
            self.grid_editor.grid_edit_step = GridEditStep.ADJUST
            loaded_items.append("Grid layout")

        # Load OCR configuration
        ocr = self.config.get('ocr', {})
        ocr_region = ocr.get('detection_region', [0, 0, 0, 0])
        if ocr_region and any(ocr_region):
            # Update ocr_config
            self.ocr_config.update({
                'x': ocr_region[0],
                'y': ocr_region[1],
                'width': ocr_region[2],
                'height': ocr_region[3],
            })

            # Update OCR input widgets
            for param, var in self.ocr_inputs.items():
                if param in self.ocr_config:
                    var.set(self.ocr_config[param])

            self.ocr_drawn = True
            self.ocr_editor.edit_step = OCREditStep.ADJUST
            loaded_items.append("OCR region")

        # Display the overlays
        self.canvas_controller.display_image()

        # Provide feedback
        if loaded_items:
            messagebox.showinfo(
                "Configuration Loaded",
                f"Successfully loaded from workspace '{self.current_workspace}':\n\n"
                f"• {chr(10).join(loaded_items)}\n\n"
                f"You can now adjust the overlays using handles or spinboxes."
            )
            self.update_status(f"Loaded: {', '.join(loaded_items)}")
        else:
            messagebox.showwarning(
                "No Configuration Found",
                f"No grid or OCR configuration found in workspace '{self.current_workspace}'.\n\n"
                "Please draw the grid and OCR region manually."
            )
            self.update_status("No config to load")

    except Exception as e:
        messagebox.showerror("Load Error", f"Failed to load configuration:\n\n{str(e)}")
        self.update_status("Load failed")
```

### Step 7: Update create_new_page() to create_new_workspace()

Rename and update the dialog:
```python
def create_new_workspace(self):
    """Show dialog to create a new workspace."""
    dialog = tk.Toplevel(self.root)
    dialog.title("Create New Workspace")
    dialog.geometry("450x250")
    dialog.transient(self.root)
    dialog.grab_set()

    # Workspace name input
    ttk.Label(dialog, text="Workspace Name (lowercase with underscores):").pack(pady=5)
    name_var = tk.StringVar(value=self._generate_new_workspace_name())
    name_entry = ttk.Entry(dialog, textvariable=name_var, width=40)
    name_entry.pack(pady=5)
    name_entry.focus()

    # Clone option
    ttk.Label(dialog, text="Clone configuration from (optional):").pack(pady=5)
    clone_var = tk.StringVar(value="None")
    clone_dropdown = ttk.Combobox(dialog, textvariable=clone_var, width=37, state='readonly')
    available_workspaces = self.workspace_manager.list_workspaces()
    clone_dropdown['values'] = ["None"] + available_workspaces
    clone_dropdown.pack(pady=5)

    # Buttons
    button_frame = ttk.Frame(dialog)
    button_frame.pack(pady=20)

    def on_create():
        workspace_name = name_var.get().strip()

        # Validate
        if not workspace_name:
            messagebox.showerror("Invalid Name", "Workspace name cannot be empty", parent=dialog)
            return

        if not re.match(r'^[a-z_][a-z0-9_]*$', workspace_name):
            messagebox.showerror(
                "Invalid Name",
                "Workspace name must start with lowercase letter or underscore,\nand contain only lowercase letters, numbers, and underscores.",
                parent=dialog
            )
            return

        if self.workspace_manager.workspace_exists(workspace_name):
            messagebox.showerror("Duplicate Name", f"Workspace '{workspace_name}' already exists", parent=dialog)
            return

        # Create workspace (with optional cloning)
        clone_from = clone_var.get() if clone_var.get() != "None" else None
        self.workspace_manager.create_workspace(workspace_name, clone_from=clone_from)

        # Update dropdown
        workspaces = self.workspace_manager.list_workspaces()
        self.ui_builder.page_dropdown['values'] = workspaces

        # Switch to new workspace
        self.ui_builder.page_var.set(workspace_name)
        self.on_page_changed(workspace_name)

        dialog.destroy()

    ttk.Button(button_frame, text="Create", command=on_create, width=15).pack(side=tk.LEFT, padx=10)
    ttk.Button(button_frame, text="Cancel", command=dialog.destroy, width=15).pack(side=tk.LEFT, padx=10)

    # Enter key creates
    dialog.bind('<Return>', lambda e: on_create())
    dialog.bind('<Escape>', lambda e: dialog.destroy())

def _generate_new_workspace_name(self) -> str:
    """Generate a new workspace name like 'new_workspace_1'."""
    base = "new_workspace"
    counter = 1
    while self.workspace_manager.workspace_exists(f"{base}_{counter}"):
        counter += 1
    return f"{base}_{counter}"
```

Update callback in `_build_ui()`:
```python
callbacks = {
    # ...
    'create_new_page': self.create_new_workspace,  # Updated
    # ...
}
```

### Step 8: Update preferences to use "last_workspace"

Update `_load_preferences()` and `_save_preferences()`:
```python
def _load_preferences(self):
    """Load user preferences (last workspace, etc.)."""
    prefs_path = Path(__file__).parent / "editor_preferences.json"
    if prefs_path.exists():
        try:
            with open(prefs_path, 'r') as f:
                prefs = json.load(f)
                return prefs
        except:
            pass
    return {"last_workspace": "character_select"}

def _save_preferences(self):
    """Save user preferences."""
    prefs_path = Path(__file__).parent / "editor_preferences.json"
    prefs = {
        "last_workspace": self.current_workspace
    }
    with open(prefs_path, 'w') as f:
        json.dump(prefs, f, indent=2)
```

### Step 9: Fix Grid Handles Regression

This is separate from workspace refactor. Investigate `grid_renderer.py` and restore handle drawing.

Check if `draw_grid_overlay()` is calling handle drawing code. Verify that handles are being drawn and bound to events. This requires reading the grid_renderer code to diagnose.

(This step will be done after workspace refactor is complete)

### Step 10: Create Default Workspaces

Create migration script `tools/icon-cropper/create_default_workspaces.py`:

```python
"""Create default workspaces for icon-cropper."""

from pathlib import Path
from editor.workspace_manager import WorkspaceManager

def main():
    """Create default workspaces with configs."""
    workspaces_root = Path(__file__).parent / "workspaces"
    manager = WorkspaceManager(workspaces_root)

    # Create character_select workspace
    print("Creating character_select workspace...")
    manager.create_workspace("character_select")

    # Create item_inventory workspace
    print("Creating item_inventory workspace...")
    manager.create_workspace("item_inventory")

    print("Default workspaces created!")
    print(f"Location: {workspaces_root.absolute()}")

if __name__ == "__main__":
    main()
```

Run once:
```bash
cd tools/icon-cropper
uv run python create_default_workspaces.py
```

## Validation and Acceptance

After implementation, test the workspace-centric workflow:

**Test 1: Create New Workspace**
```bash
cd tools/icon-cropper
uv run python config_editor.py
```

1. Click [+] button
2. Enter "gacha_detail" as name
3. Select "None" for clone option
4. Click Create
5. **Expected:** Dropdown switches to "gacha_detail", screenshot list empty, canvas clear
6. **Expected:** Directory `workspaces/gacha_detail/` exists with:
   - `config.yaml` (from template)
   - `screenshots/` (empty)
   - `cropped/` (empty)
   - `workspace.json`
7. **Expected:** Can draw grid, save config, and it saves to `workspaces/gacha_detail/config.yaml`

**Test 2: Clone Workspace**
1. Click [+] button
2. Enter "gacha_detail_v2"
3. Select "gacha_detail" from clone dropdown
4. Click Create
5. **Expected:** New workspace has same grid settings as gacha_detail
6. **Expected:** config.yaml exists with cloned grid values
7. **Expected:** Can modify independently without affecting original

**Test 3: Workspace Isolation**
1. In character_select workspace: draw grid, capture 3 screenshots, save config
2. Switch to item_inventory workspace
3. **Expected:** Canvas clears, screenshot list empty, config loads from `workspaces/item_inventory/config.yaml`
4. Draw different grid, capture 2 screenshots, save config
5. Switch back to character_select
6. **Expected:** Original 3 screenshots restored, original grid visible, config unchanged

**Test 4: Empty Screenshot List**
1. In a workspace with 1 screenshot
2. Select it, click Delete
3. **Expected:** Screenshot deleted, list shows "No screenshots"
4. **Expected:** Canvas clears
5. **Expected:** Can capture new screenshot

**Test 5: Config Persistence**
1. Configure multiple workspaces
2. Close application
3. Delete `editor_preferences.json`
4. Relaunch
5. **Expected:** Defaults to "character_select" workspace
6. **Expected:** All workspace configs intact in their directories

**Test 6: Workspace Portability**
1. Configure gacha_detail workspace (grid + screenshots)
2. Zip the `workspaces/gacha_detail/` directory
3. Delete the workspace directory
4. Unzip to restore
5. Relaunch config_editor
6. **Expected:** gacha_detail appears in dropdown
7. **Expected:** All screenshots, config, and metadata restored

All tests should pass. Each workspace directory should contain its own `config.yaml` with workspace-specific settings (no `pages:` wrapper).

## Idempotence and Recovery

The workspace-centric system is designed to be safe and idempotent:

- **Multiple runs**: Can launch, capture, configure repeatedly without data loss
- **Screenshot numbering**: Automatically finds next available number (001, 002, ...), no overwrites
- **Metadata sync**: workspace.json always reflects current screenshot list
- **Config backups**: ConfigSerializer creates timestamped backups before each save
- **Empty workspaces**: Workspaces can have zero screenshots (no forced protection)
- **Unsaved changes**: Prompts before workspace switching or quitting
- **Self-contained**: Each workspace is independent - can be moved, zipped, shared

**Recovery scenarios:**

- **Corrupted workspace.json**: Will be recreated from directory on next access
- **Missing config.yaml**: Will be created from template
- **Missing screenshots directory**: Automatically created when adding first screenshot
- **Deleted preference file**: Defaults to "character_select" workspace
- **Corrupted workspace config.yaml**: Can be manually restored from backup or template

## Artifacts and Notes

### Workspace Directory Structure

```
workspaces/
├── character_select/
│   ├── config.yaml              # Workspace-specific config
│   ├── workspace.json           # Metadata
│   ├── screenshots/
│   │   ├── 001.png
│   │   └── 002.png
│   └── cropped/                 # Future use
│       ├── 001/
│       └── 002/
└── item_inventory/
    ├── config.yaml
    ├── workspace.json
    └── screenshots/
```

### workspace.json Schema

```json
{
  "workspace_name": "character_select",
  "created_at": "2025-11-15T10:00:00Z",
  "selected_screenshot": "002.png",
  "screenshots": [
    {
      "filename": "001.png",
      "captured_at": "2025-11-15T10:05:00Z",
      "resolution": [1920, 1080],
      "notes": ""
    },
    {
      "filename": "002.png",
      "captured_at": "2025-11-15T10:10:00Z",
      "resolution": [1920, 1080],
      "notes": "After scrolling down"
    }
  ]
}
```

### config.yaml Schema (Per-Workspace)

```yaml
workspace_name: "character_select"
ocr_match: "ホーム画面設定"

grid:
  columns: 3
  rows: 5
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
  filename_pattern: "{number:03d}.png"

ocr:
  detection_region: [10, 10, 500, 100]
```

### UI Layout (After Phase 2)

```
┌────────────────────────────────────┐
│ Workspace: [character_select ▼] [+]│
│ ───────────────────────────────    │
│ Screenshots:                       │
│ ☑ 001.png  1920×1080              │
│ ☐ 002.png  1920×1080              │
│ [📷 Capture] [🗑️ Delete]          │
│ ───────────────────────────────    │
│ [📂 Open Screenshot]               │
│ ───────────────────────────────    │
│ Mode Buttons                       │
│ Grid/OCR Tabs                      │
│ Preview/Save Buttons               │
└────────────────────────────────────┘
```

## Interfaces and Dependencies

### WorkspaceManager API (Updated)

```python
class WorkspaceManager:
    def __init__(self, workspaces_root: Path)

    # Workspace operations
    def create_workspace(self, page_name: str, clone_from: str = None) -> Path  # Updated
    def get_workspace_path(self, page_name: str) -> Path
    def workspace_exists(self, page_name: str) -> bool
    def list_workspaces(self) -> List[str]

    # Screenshot operations
    def add_screenshot(self, page_name: str, image: Image.Image) -> str
    def get_screenshots(self, page_name: str) -> List[Dict[str, Any]]
    def get_selected_screenshot(self, page_name: str) -> Optional[str]
    def set_selected_screenshot(self, page_name: str, filename: str)
    def delete_screenshot(self, page_name: str, filename: str) -> bool  # Updated (no protection)
    def get_screenshot_path(self, page_name: str, filename: str) -> Path
```

### ConfigSerializer API (Updated)

```python
class ConfigSerializer:
    def __init__(self, config_path: Path = None)  # Updated: accepts path

    def load(self) -> Tuple[Dict[str, Any], Optional[str]]
    def save(self, config: Dict[str, Any], create_backup: bool = True) -> Tuple[bool, Optional[str]]  # Simplified
    def validate_grid_config(self, grid_config: Dict, image_width: int, image_height: int) -> Tuple[bool, str]
    def validate_ocr_region(self, ocr_region: List[int], image_width: int, image_height: int) -> Tuple[bool, str]
```

### ConfigEditorApp Changes

```python
class ConfigEditorApp:
    # Updated attributes
    workspace_manager: WorkspaceManager
    current_workspace: str  # Renamed from current_page
    # Removed: available_pages (now from directories)
    unsaved_changes: bool
    config_serializer: ConfigSerializer  # Now workspace-specific

    # Updated methods
    def on_page_changed(self, new_workspace: str)  # Renamed, reloads ConfigSerializer
    def create_new_workspace(self)  # Renamed from create_new_page
    def _load_workspace_config(self)  # Renamed from _load_page_config
    def _generate_new_workspace_name(self) -> str

    # Unchanged methods (still work with new architecture)
    def delete_screenshot(self)
    def _refresh_screenshot_list(self)
    def _on_screenshot_selected(self, filename: str)
    def _load_selected_screenshot(self)
    def _load_preferences(self) -> dict
    def _save_preferences(self)
    def _migrate_legacy_screenshots(self)
```

---

**Revision Note (2025-11-15 08:00Z):** This ExecPlan was completely rewritten to reflect workspace-centric architecture after discovering the config-centric design was wrong. Phase 1 implemented a working but architecturally flawed system. Phase 2 refactors to the correct design where each workspace is self-contained with its own config.yaml.

**Revision Note (2025-11-15 12:19Z):** Added Phase 4 documenting the Photoshop-like tool system implementation. What appeared to be a simple resize handle visibility regression (S3) turned out to be a fundamental architectural issue - the mode system conflated tool selection with workflow state. Implemented tool-based architecture with SelectTool, DrawGridTool, and DrawOCRTool. Handles now visible based on data state (overlay exists) rather than workflow state (edit_step). Added S8 (Handle Visibility Architecture Issue), D9 (Tool System Decision), and Phase 4 Outcomes. All changes maintain backward compatibility by wrapping existing editor state machines. Application tested and working correctly - handles visible as expected.

**ExecPlan Status:** Phase 4 complete, optional UI improvements pending
**Estimated Effort:** Phase 4 completed in ~4 hours (design + implementation + testing)
