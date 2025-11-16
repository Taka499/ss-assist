"""Select tool for pan, zoom, and selecting/resizing overlays.

This is the default tool that users interact with most of the time.
It provides:
- Pan (drag to move canvas)
- Zoom (Ctrl+wheel)
- Resize overlays via handles (handles are clickable, events handled via tag_bind)
"""

from typing import Dict, Any, Optional
import tkinter as tk
from .base_tool import BaseTool


class SelectTool(BaseTool):
    """Default tool for canvas navigation and overlay manipulation."""

    def __init__(self, canvas_controller):
        """Initialize the select tool.

        Args:
            canvas_controller: CanvasController instance for pan/zoom operations
        """
        self.canvas_controller = canvas_controller
        self.is_panning = False

    def on_activate(self, canvas: tk.Canvas, status_callback: Optional[callable] = None):
        """Activate select tool - set status message.

        Args:
            canvas: Canvas widget
            status_callback: Callback to update status text
        """
        if status_callback:
            status_callback("Select/Pan mode: Drag to pan, Ctrl+wheel to zoom, click handles to resize")

    def on_deactivate(self, canvas: tk.Canvas):
        """Deactivate select tool - reset panning state.

        Args:
            canvas: Canvas widget
        """
        if self.is_panning:
            self.canvas_controller.end_pan(None)
            self.is_panning = False

    def on_mouse_press(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse press - start panning.

        Note: Resize handle clicks are handled via tag_bind in grid_renderer.py,
        which return 'break' to prevent this handler from being called.

        Args:
            event: Mouse button press event
            context: Shared application state

        Returns:
            True (always handles event - starts panning)
        """
        # Resize handles have higher priority via tag_bind returning 'break'
        # If we reach here, user clicked on empty canvas or image

        # Future: Check if clicking on an overlay boundary (for selection)

        # Default: Start panning
        self.canvas_controller.start_pan(event)
        self.is_panning = True
        return True

    def on_mouse_move(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse move - update panning if active.

        Args:
            event: Mouse motion event
            context: Shared application state

        Returns:
            True if panning, False otherwise
        """
        if self.is_panning:
            self.canvas_controller.update_pan(event)
            return True
        return False

    def on_mouse_release(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse release - end panning if active.

        Args:
            event: Mouse button release event
            context: Shared application state

        Returns:
            True if was panning, False otherwise
        """
        if self.is_panning:
            self.canvas_controller.end_pan(event)
            self.is_panning = False
            return True
        return False

    def get_cursor(self) -> str:
        """Get cursor for select tool.

        Returns:
            Empty string (default cursor)
        """
        return ""

    def get_name(self) -> str:
        """Get display name.

        Returns:
            "Select/Pan"
        """
        return "Select/Pan"
