---
  Architecture Design

  1. Tool System Components

  New Base Tool Class:
  # editor/base_tool.py
  class BaseTool(ABC):
      """Base class for all canvas interaction tools."""

      def on_activate(self, canvas, status_callback):
          """Called when tool becomes active."""
          pass

      def on_deactivate(self, canvas):
          """Called when tool is deactivated."""
          pass

      @abstractmethod
      def on_mouse_press(self, event, context) -> bool:
          """Handle mouse press. Return True if handled."""
          pass

      @abstractmethod
      def on_mouse_move(self, event, context) -> bool:
          """Handle mouse move. Return True if handled."""
          pass

      @abstractmethod
      def on_mouse_release(self, event, context) -> bool:
          """Handle mouse release. Return True if handled."""
          pass

      def get_cursor(self) -> str:
          """Return cursor name for this tool."""
          return ""

  Tool Manager:
  # editor/tool_manager.py
  class ToolManager:
      """Manages tool selection and event delegation."""

      def __init__(self):
          self.active_tool: Optional[BaseTool] = None
          self.tools: Dict[str, BaseTool] = {}
          self.default_tool_name: str = 'select'

      def register_tool(self, name: str, tool: BaseTool):
          self.tools[name] = tool

      def set_active_tool(self, name: str, canvas, status_callback):
          """Switch to a different tool."""
          if self.active_tool:
              self.active_tool.on_deactivate(canvas)

          self.active_tool = self.tools[name]
          self.active_tool.on_activate(canvas, status_callback)
          canvas.config(cursor=self.active_tool.get_cursor())

      def on_mouse_press(self, event, context) -> bool:
          if self.active_tool:
              return self.active_tool.on_mouse_press(event, context)
          return False

  2. Concrete Tools

  Select Tool (Default):
  # editor/select_tool.py
  class SelectTool(BaseTool):
      """Default tool: pan, zoom, and select overlays for resizing."""

      def __init__(self, canvas_controller):
          self.canvas_controller = canvas_controller
          self.is_panning = False

      def on_mouse_press(self, event, context):
          # Check if clicking on a resize handle
          # (Handles have higher priority via tag_bind returning 'break')

          # TODO: Check if clicking on an overlay (future: selection)

          # Default: Start panning
          self.canvas_controller.start_pan(event)
          self.is_panning = True
          return True

      def on_mouse_move(self, event, context):
          if self.is_panning:
              self.canvas_controller.update_pan(event)
              return True
          return False

      def on_mouse_release(self, event, context):
          if self.is_panning:
              self.canvas_controller.end_pan(event)
              self.is_panning = False
              return True
          return False

      def get_cursor(self):
          return ""  # Default cursor

  Draw Grid Tool:
  # editor/draw_grid_tool.py
  class DrawGridTool(BaseTool):
      """Tool for drawing grid overlays (3-step workflow)."""

      def __init__(self, grid_editor):
          self.grid_editor = grid_editor

      def on_activate(self, canvas, status_callback):
          # Enter grid drawing mode
          self.grid_editor.enter_grid_edit_mode(canvas, None)
          status_callback("Click to set grid origin...")

      def on_deactivate(self, canvas):
          # Exit grid drawing mode (but keep overlay)
          self.grid_editor.exit_edit_mode(canvas)

      def on_mouse_press(self, event, context):
          self.grid_editor.on_grid_click(event, context)
          return True

      def on_mouse_move(self, event, context):
          if self.grid_editor.is_dragging_cell():
              self.grid_editor.on_grid_drag(event, context)
              return True
          return False

      def on_mouse_release(self, event, context):
          if self.grid_editor.is_dragging_cell():
              self.grid_editor.on_grid_release(event, context)

              # AUTO-SWITCH back to select tool after drawing completes
              # (This is the key behavior change!)
              if context['auto_switch_tool']:
                  context['auto_switch_tool']('select')

              return True
          return False

      def get_cursor(self):
          return "crosshair"

  Draw OCR Tool:
  # editor/draw_ocr_tool.py
  class DrawOCRTool(BaseTool):
      """Tool for drawing OCR regions (1-step workflow)."""

      def __init__(self, ocr_editor):
          self.ocr_editor = ocr_editor

      def on_activate(self, canvas, status_callback):
          self.ocr_editor.enter_ocr_edit_mode(canvas, None)
          status_callback("Drag to define OCR region...")

      def on_deactivate(self, canvas):
          self.ocr_editor.exit_ocr_edit_mode(canvas)

      def on_mouse_press(self, event, context):
          self.ocr_editor.on_ocr_click(event, context)
          return True

      def on_mouse_move(self, event, context):
          if self.ocr_editor.is_dragging():
              self.ocr_editor.on_ocr_drag(event, context)
              return True
          return False

      def on_mouse_release(self, event, context):
          if self.ocr_editor.is_dragging():
              self.ocr_editor.on_ocr_release(event, context)

              # AUTO-SWITCH back to select tool
              if context['auto_switch_tool']:
                  context['auto_switch_tool']('select')

              return True
          return False

      def get_cursor(self):
          return "crosshair"

  3. Handle Visibility Rules

  New Logic (Simple & Clear):
  def should_show_grid_handles(self) -> bool:
      """Grid handles visible when overlay exists AND not drawing."""
      return (
          self.canvas_controller.has_overlay('grid') and
          not isinstance(self.tool_manager.active_tool, DrawGridTool)
      )

  def should_show_ocr_handles(self) -> bool:
      """OCR handles visible when overlay exists AND not drawing."""
      return (
          self.canvas_controller.has_overlay('ocr') and
          not isinstance(self.tool_manager.active_tool, DrawOCRTool)
      )

  Updated Draw Methods:
  def draw_grid_overlay(self):
      if self.canvas_controller.current_image is None:
          return

      # Always draw grid if exists
      if self.canvas_controller.has_overlay('grid'):
          self.grid_renderer.draw_grid_overlay(...)

          # Show handles unless currently drawing
          if self.should_show_grid_handles():
              self.grid_renderer.draw_resize_handles(...)

  4. Button Integration

  Update UI to Show Active Tool:
  # ui_builder.py - Tool selection buttons
  def create_tool_buttons(parent, callbacks):
      frame = ttk.LabelFrame(parent, text="Tools", padding=10)

      # Radio button style (visual feedback for active tool)
      tool_var = tk.StringVar(value='select')

      ttk.Radiobutton(
          frame, text="🖱️ Select/Pan",
          variable=tool_var, value='select',
          command=lambda: callbacks['set_active_tool']('select')
      ).pack(fill='x', pady=2)

      ttk.Radiobutton(
          frame, text="🔲 Draw Grid",
          variable=tool_var, value='draw_grid',
          command=lambda: callbacks['set_active_tool']('draw_grid')
      ).pack(fill='x', pady=2)

      ttk.Radiobutton(
          frame, text="📄 Draw OCR",
          variable=tool_var, value='draw_ocr',
          command=lambda: callbacks['set_active_tool']('draw_ocr')
      ).pack(fill='x', pady=2)

      return frame, tool_var

  5. Migration Strategy (Phased)

  Phase 1: Add Tool Infrastructure (Non-Breaking)
  - Create BaseTool, ToolManager
  - Create SelectTool, DrawGridTool, DrawOCRTool
  - Add tool manager to ConfigEditorApp (alongside existing mode system)
  - No behavior changes yet - just infrastructure

  Phase 2: Change Handle Visibility (Breaking Change)
  - Update draw_grid_overlay() and draw_ocr_overlay() to use tool checks
  - Test that handles appear/disappear correctly

  Phase 3: Update Event Routing
  - Change on_mouse_press/move/release to delegate to tool_manager
  - Add fallback to old mode system for compatibility
  - Test all workflows

  Phase 4: Update UI
  - Replace buttons with radio buttons
  - Add visual feedback for active tool
  - Test mode switching

  Phase 5: Cleanup
  - Remove old enter_grid_edit_mode() / enter_pan_mode() methods
  - Remove mode-specific event routing
  - Update tests

  ---
  Key Design Decisions

  Decision 1: Auto-Switch After Drawing

  Problem: Should drawing tools stay active or auto-switch to select tool?

  Decision: Auto-switch to select tool after drawing completes.

  Rationale:
  - Matches Photoshop behavior (shape tools auto-switch after drawing)
  - Prevents accidental re-drawing when clicking again
  - Immediately allows handle adjustment without mode change
  - Users can click "Draw Grid" again if they want to draw another

  Decision 2: Resize Handles Use Existing Controllers

  Problem: Should resize be a separate tool or part of select tool?

  Decision: Part of select tool - handles are always clickable when visible.

  Rationale:
  - Simpler mental model (one default tool)
  - Matches Photoshop (Move tool can resize selections)
  - Leverages existing ResizeController and OCRResizeController
  - No need for separate "Resize Grid" tool

  Decision 3: Single vs. Multiple Overlay Selection

  Problem: Can user have both grid AND OCR handles visible simultaneously?

  Decision: Show both if both overlays exist (unless drawing).

  Rationale:
  - Grid and OCR don't overlap conceptually
  - Simpler implementation (no selection state needed)
  - Can be refined later if it causes confusion

  Decision 4: Keep Existing Editors

  Problem: Rewrite GridEditor and OCREditor or wrap them?

  Decision: Wrap them - Tools delegate to existing editors.

  Rationale:
  - Minimizes code changes
  - Editors already have solid state machine logic
  - Editors can be refactored incrementally later
  - Faster implementation

  ---
  Implementation Plan

  Now I'll present the complete plan for approval using ExitPlanMode.

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Implement Photoshop-like Tool System for Icon-Cropper

 Goal

 Make resize handles always visible when overlays exist (except during active drawing), by implementing a tool-based architecture instead of the current workflow-based mode system.

 Approach

 Phased migration that adds tool infrastructure while maintaining compatibility, then incrementally replaces mode-based logic.

 Phases

 Phase 1: Create Tool Infrastructure (No Breaking Changes)

 1. Create editor/base_tool.py - Abstract base class for tools
 2. Create editor/tool_manager.py - Tool selection and event delegation
 3. Create editor/select_tool.py - Default pan/zoom tool
 4. Create editor/draw_grid_tool.py - Wraps existing GridEditor
 5. Create editor/draw_ocr_tool.py - Wraps existing OCREditor
 6. Add ToolManager to ConfigEditorApp.__init__()
 7. Register all tools with manager

 Phase 2: Fix Handle Visibility (Breaking Change)

 1. Update draw_grid_overlay() - Show handles when has_overlay('grid') AND not drawing grid
 2. Update draw_ocr_overlay() - Show handles when has_overlay('ocr') AND not drawing OCR
 3. Remove is_in_adjust_step() checks from handle visibility logic
 4. Test: Handles visible after loading config, after drawing, after workspace switch

 Phase 3: Update Event Routing

 1. Modify on_mouse_press/move/release to delegate to tool_manager.active_tool
 2. Keep fallback to old mode system for compatibility during testing
 3. Add auto-switch to select tool after drawing completes
 4. Test all workflows: draw grid, draw OCR, resize, pan/zoom

 Phase 4: Update UI with Visual Feedback

 1. Replace mode buttons with radio buttons in ui_builder.py
 2. Add tool selection state (currently selected tool highlighted)
 3. Update button callbacks to call tool_manager.set_active_tool()
 4. Test button behavior and visual feedback

 Phase 5: Cleanup & Documentation

 1. Remove old mode entry/exit methods if no longer used
 2. Update execplan with implementation notes
 3. Update README with new tool system
 4. Mark S3 (resize handle regression) as resolved

 Key Behavior Changes

 Before:
 - Click "Draw Grid" → Enter 3-step workflow → Must click "Pan Mode" to exit
 - Handles only visible in ADJUST step
 - Exiting edit mode hides handles

 After:
 - Click "Draw Grid" → Auto-switch to select tool after drawing
 - Handles always visible (unless actively drawing)
 - Select tool is default (pan, zoom, resize handles)

 Testing Checklist

 - Load config with grid → Handles visible immediately
 - Draw new grid → Auto-switch to select tool → Handles visible
 - Switch workspace → Handles visible for loaded overlays
 - Click resize handle → Grid adjusts correctly
 - Draw OCR region → Auto-switch → OCR handles visible
 - Both grid and OCR handles can be visible simultaneously
 - Pan/zoom work in select tool mode
 - Button shows currently selected tool

 Estimated Scope

 - New files: 5 (base_tool, tool_manager, select_tool, draw_grid_tool, draw_ocr_tool)
 - Modified files: 3 (config_editor.py, ui_builder.py, execplan doc)
 - Lines of new code: ~400-500
 - Risk: Medium (changes event routing, but keeps existing editors)