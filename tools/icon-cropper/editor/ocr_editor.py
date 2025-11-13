"""OCR region editor for managing OCR region editing workflow.

This module handles the OCR region editing workflow:
1. Click and drag to define a rectangular OCR detection region
2. Adjust region using resize handles or input fields
3. Preview the cropped region content

The OCR region is simpler than the grid (just one rectangle), but follows
a similar state machine pattern for consistency.
"""

from typing import Optional, Tuple, Callable, Dict
import tkinter as tk
from .coordinate_system import canvas_to_image_coords


class OCREditStep:
    """Steps in the OCR region editing workflow."""
    DEFINE = "define"      # Click and drag to define region
    ADJUST = "adjust"      # Fine-tune with resize handles or inputs


class OCREditor:
    """Manages OCR region editing state and workflow."""

    def __init__(
        self,
        ocr_config: Dict[str, int],
        on_instruction_update: Callable[[str, str], None],
        on_status_update: Callable[[str], None]
    ):
        """Initialize the OCR editor.

        Args:
            ocr_config: Dictionary with OCR region parameters (x, y, width, height)
            on_instruction_update: Callback(text, color) to update instruction label
            on_status_update: Callback(text) to update status bar
        """
        self.ocr_config = ocr_config
        self.on_instruction_update = on_instruction_update
        self.on_status_update = on_status_update

        # Editing state
        self.is_active = False
        self.edit_step = OCREditStep.DEFINE

        # Temporary editing state
        self.drag_start: Optional[Tuple[int, int]] = None
        self.drag_current: Optional[Tuple[int, int]] = None

        # Flag to prevent circular updates when programmatically updating inputs
        self.updating_inputs_programmatically = False

    def enter_ocr_edit_mode(self, canvas: tk.Canvas, current_image) -> bool:
        """Enter OCR region editing mode.

        Args:
            canvas: Canvas widget
            current_image: Current image loaded (or None)

        Returns:
            True if mode entered successfully, False if no image loaded
        """
        if current_image is None:
            return False

        self.is_active = True
        self.edit_step = OCREditStep.DEFINE
        self.drag_start = None
        self.drag_current = None

        # Set crosshair cursor for region selection
        canvas.config(cursor="crosshair")

        self.on_instruction_update(
            "Click and drag to define the OCR detection region",
            "orange"
        )
        self.on_status_update("OCR Draw Mode: Draw rectangle around page title text")

        return True

    def exit_ocr_edit_mode(self, canvas: tk.Canvas):
        """Exit OCR editing mode and return to normal view."""
        self.is_active = False
        self.drag_start = None
        self.drag_current = None

        canvas.config(cursor="")

        self.on_instruction_update(
            "Select a mode above to begin",
            "blue"
        )
        self.on_status_update("Pan/Zoom mode active")

    def on_ocr_click(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float]
    ):
        """Handle mouse click during OCR region definition.

        Args:
            event: Mouse click event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
        """
        if self.edit_step == OCREditStep.DEFINE:
            # Start dragging to define region
            img_x, img_y = canvas_to_image_coords(
                event.x, event.y, zoom_level, pan_offset, canvas
            )
            self.drag_start = (img_x, img_y)

            self.on_status_update("OCR Draw Mode: Drag to define region size")

    def on_ocr_drag(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float]
    ):
        """Handle mouse drag during OCR region definition.

        Args:
            event: Mouse motion event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
        """
        if not self.drag_start:
            return

        img_x, img_y = canvas_to_image_coords(
            event.x, event.y, zoom_level, pan_offset, canvas
        )
        self.drag_current = (img_x, img_y)

    def on_ocr_release(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        ocr_inputs: Dict[str, tk.IntVar]
    ):
        """Handle mouse release to complete OCR region definition.

        Args:
            event: Mouse release event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
            ocr_inputs: Dictionary of input IntVars for OCR region
        """
        if not self.drag_start or not self.drag_current:
            return

        # Calculate region bounds (normalize to top-left origin)
        x1, y1 = self.drag_start
        x2, y2 = self.drag_current

        # Ensure x1 < x2 and y1 < y2
        x = min(x1, x2)
        y = min(y1, y2)
        width = abs(x2 - x1)
        height = abs(y2 - y1)

        # Update config
        self.ocr_config['x'] = x
        self.ocr_config['y'] = y
        self.ocr_config['width'] = width
        self.ocr_config['height'] = height

        # Update input fields
        self.updating_inputs_programmatically = True
        try:
            ocr_inputs['x'].set(x)
            ocr_inputs['y'].set(y)
            ocr_inputs['width'].set(width)
            ocr_inputs['height'].set(height)
        finally:
            self.updating_inputs_programmatically = False

        # Move to adjust step
        self.edit_step = OCREditStep.ADJUST
        self.drag_start = None
        self.drag_current = None

        # Reset cursor
        canvas.config(cursor="")

        self.on_instruction_update(
            "OCR region drawn! Use handles or spinboxes to adjust",
            "orange"
        )
        self.on_status_update("OCR Draw Mode: Adjust region parameters")

    def on_ocr_param_changed(self, ocr_inputs: Dict[str, tk.IntVar]):
        """Handle changes to OCR region parameters from input fields.

        This is called by Spinbox trace callbacks. It updates the ocr_config
        dictionary from the current input field values.

        Args:
            ocr_inputs: Dictionary of Spinbox IntVars
        """
        if not self.is_active:
            return

        # Skip if we're updating inputs programmatically
        if self.updating_inputs_programmatically:
            return

        try:
            # Update ocr_config from input fields
            for param, var in ocr_inputs.items():
                self.ocr_config[param] = var.get()
        except tk.TclError:
            # Ignore errors during typing (incomplete numbers)
            pass

    def is_in_ocr_edit_mode(self) -> bool:
        """Check if currently in OCR editing mode.

        Returns:
            True if in OCR edit mode
        """
        return self.is_active

    def is_in_adjust_step(self) -> bool:
        """Check if in the adjust step (ready for resize handles).

        Returns:
            True if in adjust step
        """
        return self.edit_step == OCREditStep.ADJUST

    def is_dragging(self) -> bool:
        """Check if currently dragging to define region.

        Returns:
            True if dragging (drag has started, even if no motion yet)
        """
        return self.edit_step == OCREditStep.DEFINE and self.drag_start is not None
