"""Canvas controller for image display, zoom, and pan operations.

This module manages the canvas state and provides methods for:
- Loading and displaying images
- Zoom in/out with cursor-centered zooming
- Pan (drag to move image)
- Mouse wheel handling (scroll, zoom with modifiers)
- Overlay management (grid, OCR, annotations, etc.)
"""

from typing import Optional, Tuple, Callable, Dict, List, Any
from PIL import Image, ImageTk
import tkinter as tk
from .coordinate_system import canvas_to_image_coords, image_to_canvas_coords


class CanvasController:
    """Manages canvas display operations: zoom, pan, and image rendering."""

    def __init__(
        self,
        canvas: tk.Canvas,
        on_display_callback: Optional[Callable] = None
    ):
        """Initialize the canvas controller.

        Args:
            canvas: The tkinter Canvas widget to control
            on_display_callback: Optional callback invoked after display_image() completes
        """
        self.canvas = canvas
        self.on_display_callback = on_display_callback

        # Image state
        self.current_image: Optional[Image.Image] = None
        self.photo_image: Optional[ImageTk.PhotoImage] = None

        # Zoom and pan state
        self.zoom_level: float = 1.0
        self.pan_offset: Tuple[float, float] = [0, 0]

        # Panning state
        self.is_panning: bool = False
        self.pan_start: Tuple[int, int] = [0, 0]

        # Overlay state - unified system for all overlay types
        # Structure: {'grid': [config1, config2], 'ocr': [config1], 'annotation': [...]}
        self.overlays: Dict[str, List[Optional[Dict[str, Any]]]] = {}

    def load_image(self, image: Image.Image):
        """Load an image and prepare for display.

        Args:
            image: PIL Image to load
        """
        self.current_image = image

    def center_image(self):
        """Center the current image in the canvas viewport.

        Calculates the pan offset needed to center the image (at current zoom)
        in the visible canvas area.
        """
        if self.current_image is None:
            return

        # Get canvas dimensions
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()

        # Get image dimensions (at current zoom)
        img_width = self.current_image.size[0] * self.zoom_level
        img_height = self.current_image.size[1] * self.zoom_level

        # Calculate center position
        self.pan_offset = [
            (canvas_width - img_width) / 2,
            (canvas_height - img_height) / 2
        ]

    def display_image(self):
        """Display the current image on the canvas with current zoom and pan.

        This method:
        1. Scales the image according to zoom level
        2. Creates a PhotoImage for tkinter
        3. Clears and redraws the canvas
        4. Updates the scroll region with padding
        5. Invokes the display callback if provided
        """
        if self.current_image is None:
            return

        # Calculate displayed size based on zoom
        width = int(self.current_image.size[0] * self.zoom_level)
        height = int(self.current_image.size[1] * self.zoom_level)

        # Resize image if zoomed
        if self.zoom_level != 1.0:
            display_img = self.current_image.resize(
                (width, height),
                Image.Resampling.LANCZOS
            )
        else:
            display_img = self.current_image

        # Convert to PhotoImage
        self.photo_image = ImageTk.PhotoImage(display_img)

        # Clear canvas
        self.canvas.delete("all")

        # Display image
        self.canvas.create_image(
            self.pan_offset[0],
            self.pan_offset[1],
            anchor=tk.NW,
            image=self.photo_image,
            tags="image"
        )

        # Update scroll region with padding to allow centering any corner
        # Add half-canvas padding so corners can be scrolled to center
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        padding_x = canvas_width / 2
        padding_y = canvas_height / 2

        self.canvas.config(scrollregion=(
            min(0, self.pan_offset[0]) - padding_x,  # Extend left
            min(0, self.pan_offset[1]) - padding_y,  # Extend top
            max(width, width + self.pan_offset[0]) + padding_x,  # Extend right
            max(height, height + self.pan_offset[1]) + padding_y  # Extend bottom
        ))

        # Invoke callback for additional drawing (e.g., grid overlay)
        if self.on_display_callback:
            self.on_display_callback()

    def zoom_in(self, cursor_x: Optional[int] = None, cursor_y: Optional[int] = None):
        """Zoom in the image.

        Args:
            cursor_x: X coordinate to zoom towards (canvas widget coordinates)
            cursor_y: Y coordinate to zoom towards (canvas widget coordinates)
        """
        old_zoom = self.zoom_level
        self.zoom_level = min(self.zoom_level * 1.2, 10.0)

        if cursor_x is not None and cursor_y is not None:
            self._adjust_pan_for_zoom(cursor_x, cursor_y, old_zoom, self.zoom_level)

        self.display_image()

    def zoom_out(self, cursor_x: Optional[int] = None, cursor_y: Optional[int] = None):
        """Zoom out the image.

        Args:
            cursor_x: X coordinate to zoom towards (canvas widget coordinates)
            cursor_y: Y coordinate to zoom towards (canvas widget coordinates)
        """
        old_zoom = self.zoom_level
        self.zoom_level = max(self.zoom_level / 1.2, 0.1)

        if cursor_x is not None and cursor_y is not None:
            self._adjust_pan_for_zoom(cursor_x, cursor_y, old_zoom, self.zoom_level)

        self.display_image()

    def reset_zoom(self):
        """Reset zoom to 100% and center the image."""
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]
        self.display_image()

    # Overlay management methods

    def set_overlay(self, overlay_type: str, config: Dict[str, Any], overlay_id: int = 0):
        """Set or update an overlay of a specific type.

        Args:
            overlay_type: Type of overlay ('grid', 'ocr', 'annotation', etc.)
            config: Configuration dict for the overlay
            overlay_id: Index for multiple overlays of same type (default: 0)
        """
        if overlay_type not in self.overlays:
            self.overlays[overlay_type] = []

        # Extend list if needed
        while len(self.overlays[overlay_type]) <= overlay_id:
            self.overlays[overlay_type].append(None)

        self.overlays[overlay_type][overlay_id] = config

    def get_overlay(self, overlay_type: str, overlay_id: int = 0) -> Optional[Dict[str, Any]]:
        """Get overlay config by type and ID.

        Args:
            overlay_type: Type of overlay ('grid', 'ocr', etc.)
            overlay_id: Index for multiple overlays (default: 0)

        Returns:
            Overlay config dict, or None if not found
        """
        if overlay_type in self.overlays and overlay_id < len(self.overlays[overlay_type]):
            return self.overlays[overlay_type][overlay_id]
        return None

    def has_overlay(self, overlay_type: str) -> bool:
        """Check if any overlay of this type exists.

        Args:
            overlay_type: Type of overlay to check

        Returns:
            True if at least one overlay of this type exists
        """
        return overlay_type in self.overlays and any(self.overlays[overlay_type])

    def clear_overlay(self, overlay_type: Optional[str] = None):
        """Clear overlays.

        Args:
            overlay_type: If specified, clear only this type. If None, clear all.
        """
        if overlay_type:
            self.overlays.pop(overlay_type, None)
        else:
            self.overlays.clear()

    def clear(self):
        """Clear the canvas and reset all state (image, zoom, pan, overlays)."""
        self.canvas.delete("all")
        self.current_image = None
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]
        self.overlays.clear()  # Automatically resets all overlays

    def _adjust_pan_for_zoom(
        self,
        cursor_x: int,
        cursor_y: int,
        old_zoom: float,
        new_zoom: float
    ):
        """Adjust pan offset so that the cursor stays at the same image position during zoom.

        This provides cursor-centered zooming for intuitive navigation.

        Args:
            cursor_x: X coordinate of cursor (canvas widget coordinates)
            cursor_y: Y coordinate of cursor (canvas widget coordinates)
            old_zoom: Previous zoom level
            new_zoom: New zoom level
        """
        # Convert cursor position to canvas coordinates (accounting for scroll)
        cursor_canvas_x = self.canvas.canvasx(cursor_x)
        cursor_canvas_y = self.canvas.canvasy(cursor_y)

        # Get image coordinates at cursor position before zoom
        img_x = (cursor_canvas_x - self.pan_offset[0]) / old_zoom
        img_y = (cursor_canvas_y - self.pan_offset[1]) / old_zoom

        # Calculate new pan offset so cursor stays at same image position
        self.pan_offset = [
            cursor_canvas_x - img_x * new_zoom,
            cursor_canvas_y - img_y * new_zoom
        ]

    def on_mouse_wheel(self, event) -> bool:
        """Handle mouse wheel for scrolling and zooming (Windows/Mac).

        Behavior depends on modifier keys:
        - No modifier: Scroll vertically
        - Shift: Scroll horizontally
        - Ctrl: Zoom in/out towards cursor

        Args:
            event: Mouse wheel event

        Returns:
            True if event was handled, False if no image loaded
        """
        if self.current_image is None:
            return False

        # Check for modifier keys
        if event.state & 0x0004:  # Control key
            # Ctrl + Wheel: Zoom in/out towards cursor
            if event.delta > 0:
                self.zoom_in(event.x, event.y)
            else:
                self.zoom_out(event.x, event.y)
        elif event.state & 0x0001:  # Shift key
            # Shift + Wheel: Scroll horizontally
            if event.delta > 0:
                self.canvas.xview_scroll(-1, "units")
            else:
                self.canvas.xview_scroll(1, "units")
        else:
            # No modifier: Scroll vertically
            if event.delta > 0:
                self.canvas.yview_scroll(-1, "units")
            else:
                self.canvas.yview_scroll(1, "units")

        return True

    def on_mouse_wheel_linux(self, event, direction: int) -> bool:
        """Handle mouse wheel for scrolling and zooming (Linux).

        Args:
            event: Mouse wheel event
            direction: 1 for up, -1 for down

        Returns:
            True if event was handled, False if no image loaded
        """
        if self.current_image is None:
            return False

        # Check for modifier keys
        if event.state & 0x0004:  # Control key
            # Ctrl + Wheel: Zoom in/out towards cursor
            if direction > 0:
                self.zoom_in(event.x, event.y)
            else:
                self.zoom_out(event.x, event.y)
        elif event.state & 0x0001:  # Shift key
            # Shift + Wheel: Scroll horizontally
            if direction > 0:
                self.canvas.xview_scroll(-1, "units")
            else:
                self.canvas.xview_scroll(1, "units")
        else:
            # No modifier: Scroll vertically
            if direction > 0:
                self.canvas.yview_scroll(-1, "units")
            else:
                self.canvas.yview_scroll(1, "units")

        return True

    def start_pan(self, event):
        """Begin panning operation.

        Args:
            event: Mouse button press event
        """
        self.is_panning = True
        self.pan_start = [event.x, event.y]
        self.canvas.config(cursor="fleur")

    def update_pan(self, event):
        """Update pan offset during drag.

        Args:
            event: Mouse motion event
        """
        if not self.is_panning or self.current_image is None:
            return

        # Calculate delta
        dx = event.x - self.pan_start[0]
        dy = event.y - self.pan_start[1]

        # Update pan offset
        self.pan_offset = [
            self.pan_offset[0] + dx,
            self.pan_offset[1] + dy
        ]

        # Update start position for next delta
        self.pan_start = [event.x, event.y]

        # Redraw
        self.display_image()

    def end_pan(self, event):
        """Complete panning operation.

        Args:
            event: Mouse button release event
        """
        self.is_panning = False
        self.canvas.config(cursor="")

    def get_zoom_percent(self) -> int:
        """Get current zoom level as a percentage.

        Returns:
            Zoom level as integer percentage (e.g., 100, 200)
        """
        return int(self.zoom_level * 100)
