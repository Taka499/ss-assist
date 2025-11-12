"""Pure coordinate transformation functions for canvas-image conversions.

This module provides coordinate conversion utilities that account for:
- Canvas scroll position
- Pan offset (user dragging)
- Zoom level (image scaling)

These are pure functions with no side effects, making them easily testable.
"""

from typing import Tuple
import tkinter as tk


def canvas_to_image_coords(
    canvas_x: int,
    canvas_y: int,
    zoom_level: float,
    pan_offset: Tuple[float, float],
    canvas: tk.Canvas
) -> Tuple[int, int]:
    """Convert canvas widget coordinates to image coordinates.

    This function accounts for three transformations:
    1. Canvas scroll position - converts widget-relative coords to canvas coords
    2. Pan offset - adjusts for user dragging the image
    3. Zoom level - scales back to original image coordinates

    Args:
        canvas_x: X coordinate relative to canvas widget (from event.x)
        canvas_y: Y coordinate relative to canvas widget (from event.y)
        zoom_level: Current zoom multiplier (1.0 = 100%, 2.0 = 200%, etc.)
        pan_offset: (offset_x, offset_y) tuple from panning operations
        canvas: Canvas widget reference (needed for canvasx/canvasy calls)

    Returns:
        Tuple of (img_x, img_y) in original image pixel coordinates

    Example:
        >>> # User clicks at widget position (100, 200) with 2x zoom
        >>> canvas_to_image_coords(100, 200, 2.0, (0, 0), canvas)
        (50, 100)  # Scaled back to original image coords
    """
    # Convert widget coordinates to canvas coordinates (accounting for scroll)
    canvas_x_scrolled = canvas.canvasx(canvas_x)
    canvas_y_scrolled = canvas.canvasy(canvas_y)

    # Account for pan offset and zoom
    img_x = (canvas_x_scrolled - pan_offset[0]) / zoom_level
    img_y = (canvas_y_scrolled - pan_offset[1]) / zoom_level

    return int(img_x), int(img_y)


def image_to_canvas_coords(
    img_x: int,
    img_y: int,
    zoom_level: float,
    pan_offset: Tuple[float, float]
) -> Tuple[int, int]:
    """Convert image coordinates to canvas coordinates for drawing.

    This function applies transformations for rendering:
    1. Zoom level - scales image coordinates to current zoom
    2. Pan offset - adjusts for user dragging the image

    Args:
        img_x: X coordinate in original image pixel coordinates
        img_y: Y coordinate in original image pixel coordinates
        zoom_level: Current zoom multiplier (1.0 = 100%, 2.0 = 200%, etc.)
        pan_offset: (offset_x, offset_y) tuple from panning operations

    Returns:
        Tuple of (canvas_x, canvas_y) for drawing on canvas

    Example:
        >>> # Convert image point (100, 200) to canvas coords with 2x zoom
        >>> image_to_canvas_coords(100, 200, 2.0, (50, 30))
        (250, 430)  # Scaled and offset for display
    """
    canvas_x = img_x * zoom_level + pan_offset[0]
    canvas_y = img_y * zoom_level + pan_offset[1]

    return int(canvas_x), int(canvas_y)
