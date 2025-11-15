"""Tool manager for managing active tool and event delegation.

The ToolManager acts as a coordinator between the UI (tool selection buttons)
and the canvas event handlers. It maintains the currently active tool and
routes mouse events to it.
"""

from typing import Dict, Optional, Any, Callable
import tkinter as tk
from .base_tool import BaseTool


class ToolManager:
    """Manages tool selection and delegates events to the active tool."""

    def __init__(self):
        """Initialize the tool manager with no active tool."""
        self.active_tool: Optional[BaseTool] = None
        self.tools: Dict[str, BaseTool] = {}
        self.default_tool_name: str = 'select'

    def register_tool(self, name: str, tool: BaseTool):
        """Register a tool with a unique name.

        Args:
            name: Tool identifier (e.g., 'select', 'draw_grid', 'draw_ocr')
            tool: Tool instance to register
        """
        self.tools[name] = tool

    def set_active_tool(
        self,
        name: str,
        canvas: tk.Canvas,
        status_callback: Optional[Callable[[str], None]] = None
    ):
        """Switch to a different tool.

        This will:
        1. Deactivate the current tool (if any)
        2. Activate the new tool
        3. Update the cursor

        Args:
            name: Name of the tool to activate
            canvas: Canvas widget
            status_callback: Optional callback to update status text

        Raises:
            KeyError: If tool name is not registered
        """
        if name not in self.tools:
            raise KeyError(f"Tool '{name}' is not registered. Available tools: {list(self.tools.keys())}")

        # Deactivate current tool
        if self.active_tool:
            self.active_tool.on_deactivate(canvas)

        # Activate new tool
        self.active_tool = self.tools[name]
        self.active_tool.on_activate(canvas, status_callback)

        # Update cursor
        canvas.config(cursor=self.active_tool.get_cursor())

    def get_active_tool_name(self) -> Optional[str]:
        """Get the name of the currently active tool.

        Returns:
            Tool name if a tool is active, None otherwise
        """
        if not self.active_tool:
            return None

        # Find the tool's registered name by reverse lookup
        for name, tool in self.tools.items():
            if tool is self.active_tool:
                return name

        return None

    def on_mouse_press(self, event, context: Dict[str, Any]) -> bool:
        """Delegate mouse press event to active tool.

        Args:
            event: Tkinter mouse button press event
            context: Shared application state/callbacks

        Returns:
            True if event was handled, False otherwise
        """
        if self.active_tool:
            return self.active_tool.on_mouse_press(event, context)
        return False

    def on_mouse_move(self, event, context: Dict[str, Any]) -> bool:
        """Delegate mouse move event to active tool.

        Args:
            event: Tkinter mouse motion event
            context: Shared application state/callbacks

        Returns:
            True if event was handled, False otherwise
        """
        if self.active_tool:
            return self.active_tool.on_mouse_move(event, context)
        return False

    def on_mouse_release(self, event, context: Dict[str, Any]) -> bool:
        """Delegate mouse release event to active tool.

        Args:
            event: Tkinter mouse button release event
            context: Shared application state/callbacks

        Returns:
            True if event was handled, False otherwise
        """
        if self.active_tool:
            return self.active_tool.on_mouse_release(event, context)
        return False
