"""Grid editor for managing grid editing state machine and workflow.

This module handles the 3-step grid editing workflow:
1. SET_START: Click to set grid start position
2. SET_CELL: Drag to define cell dimensions
3. ADJUST: Fine-tune with input fields and resize handles

Also manages edit mode transitions and grid parameter updates.
"""

from typing import Optional, Tuple, Callable, Dict
import tkinter as tk
from enum import Enum
from .coordinate_system import canvas_to_image_coords


class EditMode(Enum):
    """Editing modes for the configuration editor."""
    NONE = "none"
    GRID_EDIT = "grid_edit"
    OCR_EDIT = "ocr_edit"


class GridEditStep(Enum):
    """Steps in the grid editing workflow."""
    SET_START = "set_start"  # Click to set grid start position
    SET_CELL = "set_cell"    # Drag to define cell dimensions
    ADJUST = "adjust"        # Fine-tune with inputs


class GridEditor:
    """Manages grid editing state machine and workflow."""

    def __init__(
        self,
        grid_config: Dict[str, int],
        on_instruction_update: Callable[[str, str], None],
        on_status_update: Callable[[str], None]
    ):
        """Initialize the grid editor.

        Args:
            grid_config: Dictionary with grid parameters (shared reference)
            on_instruction_update: Callback(text, color) to update instruction label
            on_status_update: Callback(text) to update status bar
        """
        self.grid_config = grid_config
        self.on_instruction_update = on_instruction_update
        self.on_status_update = on_status_update

        # Editing mode state
        self.edit_mode = EditMode.NONE
        self.grid_edit_step = GridEditStep.SET_START

        # Temporary editing state
        self.grid_temp_start: Optional[Tuple[int, int]] = None
        self.grid_drag_start: Optional[Tuple[int, int]] = None
        self.grid_drag_current: Optional[Tuple[int, int]] = None

        # Flag to prevent circular updates
        self.updating_inputs_programmatically = False

    def enter_grid_edit_mode(self, canvas: tk.Canvas, current_image) -> bool:
        """Enter grid editing mode.

        Args:
            canvas: Canvas widget
            current_image: Current image loaded (or None)

        Returns:
            True if mode entered successfully, False if no image loaded
        """
        if current_image is None:
            return False

        self.edit_mode = EditMode.GRID_EDIT
        self.grid_edit_step = GridEditStep.SET_START
        self.grid_temp_start = None
        self.grid_drag_start = None
        self.grid_drag_current = None

        # Set crosshair cursor for initial selection
        canvas.config(cursor="crosshair")

        self.on_instruction_update(
            "STEP 1: Click the top-left corner of the first icon",
            "green"
        )
        self.on_status_update("Grid Draw Mode: Click to set grid start position")

        return True

    def exit_edit_mode(self, canvas: tk.Canvas):
        """Exit editing mode and return to normal view."""
        self.edit_mode = EditMode.NONE
        self.grid_temp_start = None
        self.grid_drag_start = None
        self.grid_drag_current = None

        canvas.config(cursor="")

        self.on_instruction_update(
            "Select a mode above to begin",
            "blue"
        )
        self.on_status_update("Pan/Zoom mode active")

    def on_grid_click(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        grid_inputs: Dict[str, tk.IntVar]
    ):
        """Handle mouse click during grid editing.

        Args:
            event: Mouse click event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
            grid_inputs: Dictionary of Spinbox IntVars
        """
        img_x, img_y = canvas_to_image_coords(
            event.x, event.y, zoom_level, pan_offset, canvas
        )

        if self.grid_edit_step == GridEditStep.SET_START:
            # Set grid start position
            self.grid_temp_start = (img_x, img_y)
            self.grid_drag_start = (img_x, img_y)
            self.grid_edit_step = GridEditStep.SET_CELL

            # Update config
            self.grid_config['start_x'] = img_x
            self.grid_config['start_y'] = img_y

            # Update input fields
            self.updating_inputs_programmatically = True
            try:
                grid_inputs['start_x'].set(img_x)
                grid_inputs['start_y'].set(img_y)
            finally:
                self.updating_inputs_programmatically = False

            # Reset cursor to default after first click
            canvas.config(cursor="")

            self.on_instruction_update(
                "STEP 2: Drag to define cell width and height",
                "green"
            )
            self.on_status_update("Grid Draw Mode: Drag to set cell dimensions")

    def on_grid_drag(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float]
    ):
        """Handle mouse drag during grid cell definition.

        Args:
            event: Mouse motion event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
        """
        if not self.grid_drag_start:
            return

        img_x, img_y = canvas_to_image_coords(
            event.x, event.y, zoom_level, pan_offset, canvas
        )
        self.grid_drag_current = (img_x, img_y)

    def on_grid_release(
        self,
        event,
        canvas: tk.Canvas,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        grid_inputs: Dict[str, tk.IntVar]
    ):
        """Handle mouse release to complete cell definition.

        Args:
            event: Mouse release event
            canvas: Canvas widget
            zoom_level: Current zoom level
            pan_offset: Current pan offset
            grid_inputs: Dictionary of Spinbox IntVars
        """
        if not self.grid_drag_start or not self.grid_drag_current:
            return

        # Calculate cell dimensions
        cell_width = abs(self.grid_drag_current[0] - self.grid_drag_start[0])
        cell_height = abs(self.grid_drag_current[1] - self.grid_drag_start[1])

        # Update config
        self.grid_config['cell_width'] = cell_width
        self.grid_config['cell_height'] = cell_height

        # Update input fields
        self.updating_inputs_programmatically = True
        try:
            grid_inputs['cell_width'].set(cell_width)
            grid_inputs['cell_height'].set(cell_height)
        finally:
            self.updating_inputs_programmatically = False

        # Move to adjust step
        self.grid_edit_step = GridEditStep.ADJUST
        self.grid_drag_current = None

        self.on_instruction_update(
            "Grid drawn! Use handles or spinboxes to adjust",
            "green"
        )
        self.on_status_update("Grid Draw Mode: Adjust grid parameters")

    def on_grid_param_changed(self, grid_inputs: Dict[str, tk.IntVar]):
        """Handle changes to grid parameters from input fields.

        This is called by Spinbox trace callbacks. It updates the grid_config
        dictionary from the current input field values.

        Args:
            grid_inputs: Dictionary of Spinbox IntVars
        """
        # Skip if we're updating inputs programmatically (e.g., during resize)
        if self.updating_inputs_programmatically:
            return

        try:
            # Update grid_config from input fields
            for param, var in grid_inputs.items():
                self.grid_config[param] = var.get()
        except tk.TclError:
            # Ignore errors during typing (incomplete numbers)
            pass

    def is_in_grid_edit_mode(self) -> bool:
        """Check if currently in grid editing mode.

        Returns:
            True if in grid edit mode
        """
        return self.edit_mode == EditMode.GRID_EDIT

    def is_in_adjust_step(self) -> bool:
        """Check if in the adjust step (ready for resize handles).

        Returns:
            True if in adjust step
        """
        return self.grid_edit_step == GridEditStep.ADJUST

    def is_dragging_cell(self) -> bool:
        """Check if currently dragging to define cell.

        Returns:
            True if in SET_CELL step and dragging
        """
        return (self.grid_edit_step == GridEditStep.SET_CELL and
                self.grid_drag_start is not None)
