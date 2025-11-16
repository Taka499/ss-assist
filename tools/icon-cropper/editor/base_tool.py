"""Base tool class for canvas interaction tools.

This module defines the abstract interface that all tools must implement.
Tools handle mouse events and determine how user interactions affect the canvas.

Tool examples:
- SelectTool: Pan, zoom, select/resize overlays
- DrawGridTool: Draw new grid overlays
- DrawOCRTool: Draw new OCR regions
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import tkinter as tk


class BaseTool(ABC):
    """Abstract base class for all canvas interaction tools.

    Tools encapsulate interaction behavior - how mouse events are interpreted
    and what actions are performed. Each tool has a lifecycle:

    1. on_activate() - Tool becomes active (cursor changes, status updates)
    2. Mouse events (on_mouse_press/move/release) - User interactions
    3. on_deactivate() - Tool becomes inactive (cleanup, reset cursor)
    """

    def on_activate(self, canvas: tk.Canvas, status_callback: Optional[callable] = None):
        """Called when this tool becomes the active tool.

        Use this to:
        - Set the appropriate cursor
        - Update status bar text
        - Initialize tool-specific state

        Args:
            canvas: The canvas widget
            status_callback: Optional callback to update status text (receives string)
        """
        pass

    def on_deactivate(self, canvas: tk.Canvas):
        """Called when this tool is deactivated (another tool becomes active).

        Use this to:
        - Reset cursor to default
        - Clean up temporary state
        - Exit any active modes

        Args:
            canvas: The canvas widget
        """
        pass

    @abstractmethod
    def on_mouse_press(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse button press event.

        Args:
            event: Tkinter mouse button press event
            context: Dictionary with shared state/callbacks:
                - canvas_controller: CanvasController instance
                - grid_config: Grid configuration dict
                - ocr_config: OCR configuration dict
                - grid_inputs: Grid input widgets
                - ocr_inputs: OCR input widgets
                - auto_switch_tool: Callback to switch tool (receives tool name string)
                - ... other app state as needed

        Returns:
            True if event was handled by this tool, False otherwise
        """
        pass

    @abstractmethod
    def on_mouse_move(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse move event.

        Args:
            event: Tkinter mouse motion event
            context: Dictionary with shared state/callbacks (see on_mouse_press)

        Returns:
            True if event was handled by this tool, False otherwise
        """
        pass

    @abstractmethod
    def on_mouse_release(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse button release event.

        Args:
            event: Tkinter mouse button release event
            context: Dictionary with shared state/callbacks (see on_mouse_press)

        Returns:
            True if event was handled by this tool, False otherwise
        """
        pass

    def get_cursor(self) -> str:
        """Get the cursor name to use when this tool is active.

        Returns:
            Tkinter cursor name (e.g., "", "crosshair", "hand2")
            Empty string means default cursor.
        """
        return ""

    def get_name(self) -> str:
        """Get the display name of this tool.

        Returns:
            Human-readable tool name for UI display
        """
        return self.__class__.__name__
