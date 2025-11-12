"""Grid renderer for drawing overlays and visual feedback on canvas.

This module handles all visual rendering of grid elements:
- Grid cells (boundaries)
- Crop padding indicators
- Start position markers
- Drag preview rectangles
- Resize handles
"""

from typing import Optional, Tuple, Callable
import tkinter as tk
from enum import Enum
from .coordinate_system import image_to_canvas_coords


class GridRenderer:
    """Renders grid overlays, drag previews, and visual feedback on canvas."""

    def draw_grid_overlay(
        self,
        canvas: tk.Canvas,
        grid_config: dict,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        edit_mode: Enum,  # EditMode enum
        grid_edit_step: Enum,  # GridEditStep enum
        grid_temp_start: Optional[Tuple[int, int]] = None,
        grid_drag_start: Optional[Tuple[int, int]] = None,
        grid_drag_current: Optional[Tuple[int, int]] = None,
        show_resize_handles: bool = False
    ):
        """Draw complete grid overlay with all visual elements.

        Draws:
        - Grid cells (green rectangles)
        - Crop padding indicators (yellow dashed rectangles)
        - Start position marker (red crosshair)
        - Drag preview (orange semi-transparent rectangle)
        - Resize handles (if show_resize_handles is True)

        Args:
            canvas: Canvas widget to draw on
            grid_config: Dictionary with grid parameters (start_x, start_y, cell_width, etc.)
            zoom_level: Current zoom level for scaling
            pan_offset: (offset_x, offset_y) for panning
            edit_mode: Current editing mode
            grid_edit_step: Current grid editing step
            grid_temp_start: Temporary start position during editing
            grid_drag_start: Drag start position during cell definition
            grid_drag_current: Current drag position during cell definition
            show_resize_handles: Whether to draw resize handles
        """
        # Draw the full grid based on current configuration
        for row in range(grid_config['rows']):
            for col in range(grid_config['columns']):
                x = grid_config['start_x'] + col * (
                    grid_config['cell_width'] + grid_config['spacing_x']
                )
                y = grid_config['start_y'] + row * (
                    grid_config['cell_height'] + grid_config['spacing_y']
                )

                # Convert to canvas coordinates
                x1, y1 = image_to_canvas_coords(x, y, zoom_level, pan_offset)
                x2, y2 = image_to_canvas_coords(
                    x + grid_config['cell_width'],
                    y + grid_config['cell_height'],
                    zoom_level,
                    pan_offset
                )

                # Draw outer cell (green outline)
                canvas.create_rectangle(
                    x1, y1, x2, y2,
                    outline="#4CAF50",
                    width=2,
                    tags="grid_overlay"
                )

                # Draw inner crop area (if padding > 0)
                if grid_config['crop_padding'] > 0:
                    pad = grid_config['crop_padding']
                    inner_x1, inner_y1 = image_to_canvas_coords(
                        x + pad, y + pad, zoom_level, pan_offset
                    )
                    inner_x2, inner_y2 = image_to_canvas_coords(
                        x + grid_config['cell_width'] - pad,
                        y + grid_config['cell_height'] - pad,
                        zoom_level,
                        pan_offset
                    )

                    canvas.create_rectangle(
                        inner_x1, inner_y1, inner_x2, inner_y2,
                        outline="#FFC107",
                        width=1,
                        dash=(3, 3),
                        tags="grid_overlay"
                    )

        # Draw start position marker if in grid edit mode (only during initial steps)
        # Check if we're in grid edit mode by checking if it's not NONE
        is_grid_edit = str(edit_mode).split('.')[-1] == 'GRID_EDIT'
        is_initial_step = str(grid_edit_step).split('.')[-1] in ['SET_START', 'SET_CELL']

        if is_grid_edit and grid_temp_start and is_initial_step:
            cx, cy = image_to_canvas_coords(
                grid_temp_start[0], grid_temp_start[1], zoom_level, pan_offset
            )
            # Draw a crosshair
            size = 10
            canvas.create_line(
                cx - size, cy, cx + size, cy,
                fill="red", width=2, tags="grid_overlay"
            )
            canvas.create_line(
                cx, cy - size, cx, cy + size,
                fill="red", width=2, tags="grid_overlay"
            )

        # Draw drag preview rectangle if dragging
        if grid_drag_start and grid_drag_current:
            x1, y1 = image_to_canvas_coords(
                grid_drag_start[0], grid_drag_start[1], zoom_level, pan_offset
            )
            x2, y2 = image_to_canvas_coords(
                grid_drag_current[0], grid_drag_current[1], zoom_level, pan_offset
            )

            canvas.create_rectangle(
                x1, y1, x2, y2,
                outline="#FF5722",
                fill="#FF5722",
                stipple="gray25",
                width=3,
                tags="grid_overlay"
            )

    def draw_resize_handles(
        self,
        canvas: tk.Canvas,
        grid_config: dict,
        zoom_level: float,
        pan_offset: Tuple[float, float],
        on_handle_click_callback: Callable
    ):
        """Draw 8 interactive resize handles on first grid cell as canvas items.

        Handles are drawn as blue circles at:
        - 4 corners: top-left, top-right, bottom-right, bottom-left
        - 4 edges: left, right, top, bottom

        Binds click events to callback with handle identifier.

        Args:
            canvas: Canvas widget to draw on
            grid_config: Dictionary with grid parameters
            zoom_level: Current zoom level
            pan_offset: (offset_x, offset_y) for panning
            on_handle_click_callback: Callback function(event, handle_tag)
        """
        # Get the first cell bounds (top-left cell)
        cell_start_x = grid_config['start_x']
        cell_start_y = grid_config['start_y']
        cell_end_x = cell_start_x + grid_config['cell_width']
        cell_end_y = cell_start_y + grid_config['cell_height']

        # Convert to canvas coordinates
        canvas_x1, canvas_y1 = image_to_canvas_coords(
            cell_start_x, cell_start_y, zoom_level, pan_offset
        )
        canvas_x2, canvas_y2 = image_to_canvas_coords(
            cell_end_x, cell_end_y, zoom_level, pan_offset
        )

        # Handle size (pixels on canvas)
        handle_size = 8

        # Define handle positions and their tags/cursors
        handles = [
            # Corners
            ('corner_tl', canvas_x1, canvas_y1, 'size_nw_se'),
            ('corner_tr', canvas_x2, canvas_y1, 'size_ne_sw'),
            ('corner_bl', canvas_x1, canvas_y2, 'size_ne_sw'),
            ('corner_br', canvas_x2, canvas_y2, 'size_nw_se'),
            # Edges (midpoints)
            ('edge_left', canvas_x1, (canvas_y1 + canvas_y2) / 2, 'sb_h_double_arrow'),
            ('edge_right', canvas_x2, (canvas_y1 + canvas_y2) / 2, 'sb_h_double_arrow'),
            ('edge_top', (canvas_x1 + canvas_x2) / 2, canvas_y1, 'sb_v_double_arrow'),
            ('edge_bottom', (canvas_x1 + canvas_x2) / 2, canvas_y2, 'sb_v_double_arrow'),
        ]

        # Unbind old events from all handle tags to prevent conflicts
        for tag, _, _, _ in handles:
            canvas.tag_unbind(tag, '<Enter>')
            canvas.tag_unbind(tag, '<Leave>')
            canvas.tag_unbind(tag, '<Button-1>')

        for tag, cx, cy, cursor in handles:
            # Draw semi-transparent handle rectangle
            handle_id = canvas.create_rectangle(
                cx - handle_size, cy - handle_size,
                cx + handle_size, cy + handle_size,
                fill='#2196F3',
                outline='white',
                width=2,
                tags=('grid_overlay', 'resize_handle', tag)
            )

            # Bind events to this handle - use default arguments to capture values
            canvas.tag_bind(tag, '<Enter>',
                lambda e, cursor_val=cursor: canvas.config(cursor=cursor_val))
            canvas.tag_bind(tag, '<Leave>',
                lambda e: canvas.config(cursor=''))
            # Return 'break' to stop event propagation to canvas binding
            canvas.tag_bind(tag, '<Button-1>',
                lambda e, tag_val=tag: on_handle_click_callback(e, tag_val) or 'break')
