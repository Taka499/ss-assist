"""Draw grid tool for creating new grid overlays.

This tool wraps the existing GridEditor to provide the 3-step workflow:
1. SET_START - Click to set grid origin
2. SET_CELL - Drag to define first cell dimensions
3. ADJUST - Fine-tune with handles/spinboxes (auto-switches to select tool)
"""

from typing import Dict, Any, Optional
import tkinter as tk
from .base_tool import BaseTool


class DrawGridTool(BaseTool):
    """Tool for drawing new grid overlays (3-step workflow)."""

    def __init__(self, grid_editor):
        """Initialize the draw grid tool.

        Args:
            grid_editor: GridEditor instance (existing state machine)
        """
        self.grid_editor = grid_editor

    def on_activate(self, canvas: tk.Canvas, status_callback: Optional[callable] = None):
        """Activate draw grid tool - enter grid editing mode.

        Args:
            canvas: Canvas widget
            status_callback: Callback to update status text
        """
        # Enter grid drawing mode (sets edit_mode, edit_step, cursor)
        self.grid_editor.enter_grid_edit_mode(canvas)

        if status_callback:
            status_callback("Grid tool: Click to set grid origin...")

    def on_deactivate(self, canvas: tk.Canvas):
        """Deactivate draw grid tool - exit grid editing mode.

        Note: This does NOT clear the grid overlay, just exits the drawing workflow.

        Args:
            canvas: Canvas widget
        """
        # Exit grid drawing mode (keeps overlay if drawn)
        self.grid_editor.exit_edit_mode(canvas)

    def on_mouse_press(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse press - delegate to GridEditor.

        Args:
            event: Mouse button press event
            context: Shared application state

        Returns:
            True (always handles event in grid drawing mode)
        """
        # Extract parameters that GridEditor.on_grid_click expects
        self.grid_editor.on_grid_click(
            event,
            context['canvas'],
            context['canvas_controller'].zoom_level,
            context['canvas_controller'].pan_offset,
            context['grid_inputs']
        )
        return True

    def on_mouse_move(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse move - delegate to GridEditor if dragging cell.

        Args:
            event: Mouse motion event
            context: Shared application state

        Returns:
            True if currently dragging cell, False otherwise
        """
        if self.grid_editor.is_dragging_cell():
            self.grid_editor.on_grid_drag(
                event,
                context['canvas'],
                context['canvas_controller'].zoom_level,
                context['canvas_controller'].pan_offset
            )
            return True

        return False

    def on_mouse_release(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse release - complete cell definition and auto-switch to select tool.

        This is the KEY BEHAVIOR CHANGE: After drawing completes, we automatically
        switch to the select tool so handles become immediately visible and usable.

        Args:
            event: Mouse button release event
            context: Shared application state

        Returns:
            True if was dragging cell, False otherwise
        """
        if self.grid_editor.is_dragging_cell():
            self.grid_editor.on_grid_release(
                event,
                context['canvas'],
                context['canvas_controller'].zoom_level,
                context['canvas_controller'].pan_offset,
                context['grid_inputs']
            )

            # Add new grid overlay (creates new overlay each time instead of replacing)
            # IMPORTANT: Pass a COPY of the config dict so each overlay has independent config
            overlay_id = context['canvas_controller'].add_overlay('grid', dict(context['grid_config']))

            # Auto-select the newly created overlay
            if 'set_selected_overlay_callback' in context and context['set_selected_overlay_callback']:
                context['set_selected_overlay_callback'](overlay_id)

            # Save overlays to workspace
            if 'save_overlays_callback' in context and context['save_overlays_callback']:
                context['save_overlays_callback']()

            # Refresh overlay list UI
            if 'refresh_overlay_list_callback' in context and context['refresh_overlay_list_callback']:
                context['refresh_overlay_list_callback']()

            # AUTO-SWITCH back to select tool after drawing completes
            # This makes handles immediately visible and allows user to adjust
            if 'auto_switch_tool' in context and context['auto_switch_tool']:
                context['auto_switch_tool']('select')

            return True

        return False

    def get_cursor(self) -> str:
        """Get cursor for draw grid tool.

        Returns:
            "crosshair" cursor to indicate drawing mode
        """
        return "crosshair"

    def get_name(self) -> str:
        """Get display name.

        Returns:
            "Draw Grid"
        """
        return "Draw Grid"
