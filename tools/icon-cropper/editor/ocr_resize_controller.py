"""OCR resize controller for interactive resize handle logic.

This module handles resize operations for the OCR region with 8 handles
(4 corners + 4 edges). Simpler than grid resize since we only need to
adjust a single rectangle's position and size.
"""

from typing import Optional, Tuple, Dict
import tkinter as tk
from .coordinate_system import canvas_to_image_coords


class OCRResizeController:
    """Manages OCR region resize handle interactions."""

    def __init__(
        self,
        ocr_config: Dict[str, int],
        ocr_inputs: Dict[str, tk.IntVar],
        ocr_editor  # OCREditor instance for accessing the flag
    ):
        """Initialize the OCR resize controller.

        Args:
            ocr_config: Dictionary with OCR region parameters (shared reference)
            ocr_inputs: Dictionary of Spinbox IntVars (shared reference)
            ocr_editor: OCREditor instance (for accessing updating_inputs_programmatically flag)
        """
        self.ocr_config = ocr_config
        self.ocr_inputs = ocr_inputs
        self.ocr_editor = ocr_editor

        # Resize state
        self.resize_mode: Optional[str] = None  # 'ocr_edge_left', 'ocr_corner_tl', etc.
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
            handle_tag: Tag identifying which handle was clicked (e.g., 'ocr_corner_br')
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
        """Start resizing the OCR region.

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
        self.resize_original_config = self.ocr_config.copy()

    def do_resize(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        update_spinboxes: bool = True
    ):
        """Handle resize dragging.

        Args:
            event: Mouse motion event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
            update_spinboxes: Whether to update spinbox values (set False during drag for performance)
        """
        if not self.is_resizing or not self.resize_original_config:
            return

        # Get current mouse position in image coordinates
        img_x, img_y = canvas_to_image_coords(
            event.x, event.y, zoom_level, pan_offset, canvas
        )

        # Calculate delta from resize start
        delta_x = img_x - self.resize_start_pos[0]
        delta_y = img_y - self.resize_start_pos[1]

        # Get original bounds
        orig_x = self.resize_original_config['x']
        orig_y = self.resize_original_config['y']
        orig_x2 = orig_x + self.resize_original_config['width']
        orig_y2 = orig_y + self.resize_original_config['height']

        # Calculate new bounds based on which handle is being dragged
        new_x1, new_y1, new_x2, new_y2 = orig_x, orig_y, orig_x2, orig_y2

        if 'tl' in self.resize_mode:  # Top-left corner
            new_x1 = orig_x + delta_x
            new_y1 = orig_y + delta_y
        elif 'tr' in self.resize_mode:  # Top-right corner
            new_x2 = orig_x2 + delta_x
            new_y1 = orig_y + delta_y
        elif 'bl' in self.resize_mode:  # Bottom-left corner
            new_x1 = orig_x + delta_x
            new_y2 = orig_y2 + delta_y
        elif 'br' in self.resize_mode:  # Bottom-right corner
            new_x2 = orig_x2 + delta_x
            new_y2 = orig_y2 + delta_y
        elif 'left' in self.resize_mode:  # Left edge
            new_x1 = orig_x + delta_x
        elif 'right' in self.resize_mode:  # Right edge
            new_x2 = orig_x2 + delta_x
        elif 'top' in self.resize_mode:  # Top edge
            new_y1 = orig_y + delta_y
        elif 'bottom' in self.resize_mode:  # Bottom edge
            new_y2 = orig_y2 + delta_y

        # Normalize coordinates (ensure x1 < x2 and y1 < y2)
        x = min(new_x1, new_x2)
        y = min(new_y1, new_y2)
        width = abs(new_x2 - new_x1)
        height = abs(new_y2 - new_y1)

        # Enforce minimum size (10 pixels)
        if width < 10:
            width = 10
        if height < 10:
            height = 10

        # Update config
        self.ocr_config['x'] = int(x)
        self.ocr_config['y'] = int(y)
        self.ocr_config['width'] = int(width)
        self.ocr_config['height'] = int(height)

        # Update spinboxes if requested (disabled during drag for performance)
        if update_spinboxes:
            self._update_spinboxes()

    def end_resize(self, event=None, canvas=None):
        """End the resize operation and update spinboxes with final values.

        Args:
            event: Mouse button release event (optional, for API compatibility)
            canvas: Canvas widget (optional, for cursor reset)
        """
        if not self.is_resizing:
            return

        self.is_resizing = False
        self.resize_mode = None
        self.resize_start_pos = None
        self.resize_original_config = None

        # Reset cursor
        if canvas:
            canvas.config(cursor='')

        # Update spinboxes with final values
        self._update_spinboxes()

    def _update_spinboxes(self):
        """Update spinbox values from current OCR config.

        Uses the updating_inputs_programmatically flag to prevent circular updates.
        """
        self.ocr_editor.updating_inputs_programmatically = True
        try:
            for param, var in self.ocr_inputs.items():
                if param in self.ocr_config:
                    var.set(self.ocr_config[param])
        finally:
            self.ocr_editor.updating_inputs_programmatically = False

    def is_resize_active(self) -> bool:
        """Check if resize operation is currently active.

        Returns:
            True if resizing is in progress
        """
        return self.is_resizing
