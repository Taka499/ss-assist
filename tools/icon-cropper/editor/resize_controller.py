"""Resize controller for interactive resize handle logic.

This module handles resize operations with 8 handles (4 corners + 4 edges)
and supports modifier keys:
- No modifier: Resize with opposite edge/corner fixed
- Shift: Maintain aspect ratio (proportional scaling)
- Ctrl: Center-fixed scaling
"""

from typing import Optional, Tuple, Callable, Dict
import tkinter as tk
from .coordinate_system import canvas_to_image_coords


class ResizeController:
    """Manages resize handle interactions with modifier key support."""

    def __init__(
        self,
        grid_config: Dict[str, int],
        grid_inputs: Dict[str, tk.IntVar],
        grid_editor  # GridEditor instance for accessing the flag
    ):
        """Initialize the resize controller.

        Args:
            grid_config: Dictionary with grid parameters (shared reference)
            grid_inputs: Dictionary of Spinbox IntVars (shared reference)
            grid_editor: GridEditor instance (for accessing updating_inputs_programmatically flag)
        """
        self.grid_config = grid_config
        self.grid_inputs = grid_inputs
        self.grid_editor = grid_editor

        # Resize state
        self.resize_mode: Optional[str] = None  # 'edge_left', 'corner_tl', etc.
        self.resize_start_pos: Optional[Tuple[int, int]] = None
        self.resize_original_config: Optional[Dict[str, int]] = None
        self.is_resizing: bool = False

    def on_handle_click(
        self,
        event,
        handle_tag: str,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float]
    ):
        """Handle click on a resize handle.

        Args:
            event: Mouse button press event
            handle_tag: Tag identifying which handle was clicked (e.g., 'corner_br')
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
        """
        self.resize_mode = handle_tag
        self.start_resize(event, canvas, zoom_level, pan_offset)

    def start_resize(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float]
    ):
        """Start resizing the grid cell.

        Args:
            event: Mouse button press event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
        """
        self.is_resizing = True
        img_x, img_y = canvas_to_image_coords(
            event.x, event.y, zoom_level, pan_offset, canvas
        )
        self.resize_start_pos = (img_x, img_y)

        # Save original config for reference
        self.resize_original_config = self.grid_config.copy()

    def do_resize(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        update_spinboxes: bool = True
    ):
        """Handle resize dragging with modifier key support.

        Supports:
        - No modifier: Opposite corner/edge fixed
        - Shift: Maintain aspect ratio
        - Ctrl: Center-fixed scaling

        Args:
            event: Mouse motion event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
            update_spinboxes: If False, skip spinbox updates (for performance during drag)
        """
        if not self.is_resizing or not self.resize_mode or not self.resize_start_pos:
            return

        img_x, img_y = canvas_to_image_coords(
            event.x, event.y, zoom_level, pan_offset, canvas
        )
        start_x, start_y = self.resize_start_pos
        orig = self.resize_original_config

        # Calculate delta
        dx = img_x - start_x
        dy = img_y - start_y

        # Check modifier keys
        ctrl_pressed = bool(event.state & 0x0004)
        shift_pressed = bool(event.state & 0x0001)

        if self.resize_mode.startswith('edge_'):
            self._resize_edge(dx, dy, ctrl_pressed)
        elif self.resize_mode.startswith('corner_'):
            self._resize_corner(dx, dy, shift_pressed, ctrl_pressed, orig)

        # Update input fields (set flag to prevent trace callback loop)
        # Skip during drag for performance - only update on mouse release
        if update_spinboxes:
            self.grid_editor.updating_inputs_programmatically = True
            try:
                for param, var in self.grid_inputs.items():
                    if param in self.grid_config:
                        var.set(self.grid_config[param])
            finally:
                self.grid_editor.updating_inputs_programmatically = False

    def _resize_edge(self, dx: int, dy: int, ctrl_pressed: bool):
        """Handle edge resizing (single dimension).

        Args:
            dx: Horizontal delta from resize start
            dy: Vertical delta from resize start
            ctrl_pressed: Whether Ctrl key is pressed
        """
        orig = self.resize_original_config

        if ctrl_pressed:
            # Ctrl: scale from center along edge direction
            if self.resize_mode == 'edge_left':
                self.grid_config['start_x'] = orig['start_x'] - dx
                self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
            elif self.resize_mode == 'edge_right':
                self.grid_config['start_x'] = orig['start_x'] - dx
                self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
            elif self.resize_mode == 'edge_top':
                self.grid_config['start_y'] = orig['start_y'] - dy
                self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
            elif self.resize_mode == 'edge_bottom':
                self.grid_config['start_y'] = orig['start_y'] - dy
                self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
        else:
            # Normal edge resize: opposite edge stays fixed
            if self.resize_mode == 'edge_left':
                new_width = orig['cell_width'] - dx
                self.grid_config['start_x'] = orig['start_x'] + dx
                self.grid_config['cell_width'] = max(1, new_width)
            elif self.resize_mode == 'edge_right':
                self.grid_config['cell_width'] = max(1, orig['cell_width'] + dx)
            elif self.resize_mode == 'edge_top':
                new_height = orig['cell_height'] - dy
                self.grid_config['start_y'] = orig['start_y'] + dy
                self.grid_config['cell_height'] = max(1, new_height)
            elif self.resize_mode == 'edge_bottom':
                self.grid_config['cell_height'] = max(1, orig['cell_height'] + dy)

    def _resize_corner(
        self,
        dx: int,
        dy: int,
        shift_pressed: bool,
        ctrl_pressed: bool,
        orig: Dict[str, int]
    ):
        """Handle corner resizing (both dimensions).

        Args:
            dx: Horizontal delta from resize start
            dy: Vertical delta from resize start
            shift_pressed: Whether Shift key is pressed (aspect ratio)
            ctrl_pressed: Whether Ctrl key is pressed (center-fixed)
            orig: Original grid config snapshot
        """
        if shift_pressed:
            self._resize_corner_aspect_ratio(dx, dy, orig)
        elif ctrl_pressed:
            self._resize_corner_center_fixed(dx, dy, orig)
        else:
            self._resize_corner_default(dx, dy, orig)

    def _resize_corner_default(self, dx: int, dy: int, orig: Dict[str, int]):
        """Resize corner with opposite corner fixed."""
        if self.resize_mode == 'corner_br':
            self.grid_config['cell_width'] = max(1, orig['cell_width'] + dx)
            self.grid_config['cell_height'] = max(1, orig['cell_height'] + dy)
        elif self.resize_mode == 'corner_tl':
            new_width = max(1, orig['cell_width'] - dx)
            new_height = max(1, orig['cell_height'] - dy)
            self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
            self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
            self.grid_config['cell_width'] = new_width
            self.grid_config['cell_height'] = new_height
        elif self.resize_mode == 'corner_tr':
            new_height = max(1, orig['cell_height'] - dy)
            self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
            self.grid_config['cell_width'] = max(1, orig['cell_width'] + dx)
            self.grid_config['cell_height'] = new_height
        elif self.resize_mode == 'corner_bl':
            new_width = max(1, orig['cell_width'] - dx)
            self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
            self.grid_config['cell_width'] = new_width
            self.grid_config['cell_height'] = max(1, orig['cell_height'] + dy)

    def _resize_corner_aspect_ratio(self, dx: int, dy: int, orig: Dict[str, int]):
        """Resize corner maintaining aspect ratio (Shift)."""
        if self.resize_mode == 'corner_br':
            scale = max(dx / max(orig['cell_width'], 1), dy / max(orig['cell_height'], 1))
            self.grid_config['cell_width'] = max(1, int(orig['cell_width'] + scale * orig['cell_width']))
            self.grid_config['cell_height'] = max(1, int(orig['cell_height'] + scale * orig['cell_height']))
        elif self.resize_mode == 'corner_tl':
            scale = max(-dx / max(orig['cell_width'], 1), -dy / max(orig['cell_height'], 1))
            new_width = max(1, int(orig['cell_width'] - scale * orig['cell_width']))
            new_height = max(1, int(orig['cell_height'] - scale * orig['cell_height']))
            self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
            self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
            self.grid_config['cell_width'] = new_width
            self.grid_config['cell_height'] = new_height
        elif self.resize_mode == 'corner_tr':
            scale = max(dx / max(orig['cell_width'], 1), -dy / max(orig['cell_height'], 1))
            new_width = max(1, int(orig['cell_width'] + scale * orig['cell_width']))
            new_height = max(1, int(orig['cell_height'] + scale * orig['cell_height']))
            self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
            self.grid_config['cell_width'] = new_width
            self.grid_config['cell_height'] = new_height
        elif self.resize_mode == 'corner_bl':
            scale = max(-dx / max(orig['cell_width'], 1), dy / max(orig['cell_height'], 1))
            new_width = max(1, int(orig['cell_width'] + scale * orig['cell_width']))
            new_height = max(1, int(orig['cell_height'] + scale * orig['cell_height']))
            self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
            self.grid_config['cell_width'] = new_width
            self.grid_config['cell_height'] = new_height

    def _resize_corner_center_fixed(self, dx: int, dy: int, orig: Dict[str, int]):
        """Resize corner with center fixed (Ctrl)."""
        if self.resize_mode == 'corner_br':
            self.grid_config['start_x'] = orig['start_x'] - dx
            self.grid_config['start_y'] = orig['start_y'] - dy
            self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
            self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
        elif self.resize_mode == 'corner_tl':
            self.grid_config['start_x'] = orig['start_x'] + dx
            self.grid_config['start_y'] = orig['start_y'] + dy
            self.grid_config['cell_width'] = max(1, orig['cell_width'] - 2 * dx)
            self.grid_config['cell_height'] = max(1, orig['cell_height'] - 2 * dy)
        elif self.resize_mode == 'corner_tr':
            self.grid_config['start_x'] = orig['start_x'] - dx
            self.grid_config['start_y'] = orig['start_y'] + dy
            self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
            self.grid_config['cell_height'] = max(1, orig['cell_height'] - 2 * dy)
        elif self.resize_mode == 'corner_bl':
            self.grid_config['start_x'] = orig['start_x'] + dx
            self.grid_config['start_y'] = orig['start_y'] - dy
            self.grid_config['cell_width'] = max(1, orig['cell_width'] - 2 * dx)
            self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)

    def end_resize(self, event, canvas: tk.Canvas):
        """Complete the resize operation.

        Args:
            event: Mouse button release event
            canvas: Canvas widget
        """
        self.is_resizing = False
        self.resize_start_pos = None
        self.resize_original_config = None
        self.resize_mode = None
        canvas.config(cursor='')
