"""Preview controller for extracting and displaying icon thumbnails.

This module handles:
- Extracting icon crops from the current grid configuration
- Applying crop padding
- Creating thumbnail images for display
- Opening a preview window with labeled thumbnails
"""

from typing import List, Tuple, Optional
from PIL import Image


class PreviewController:
    """Controller for extracting and previewing icon crops."""

    def __init__(self):
        """Initialize the preview controller."""
        pass

    def extract_icons(
        self,
        image: Image.Image,
        grid_config: dict
    ) -> List[Tuple[Image.Image, int, int]]:
        """Extract icon crops from the grid configuration.

        Args:
            image: Source image to crop from
            grid_config: Dictionary with grid parameters
                - start_x, start_y: Top-left corner of first icon
                - cell_width, cell_height: Size of each cell
                - spacing_x, spacing_y: Gap between cells
                - columns, rows: Grid dimensions
                - crop_padding: Pixels to trim from each edge

        Returns:
            List of tuples: (cropped_image, row, column)
        """
        icons = []

        start_x = grid_config.get('start_x', 0)
        start_y = grid_config.get('start_y', 0)
        cell_width = grid_config.get('cell_width', 100)
        cell_height = grid_config.get('cell_height', 100)
        spacing_x = grid_config.get('spacing_x', 0)
        spacing_y = grid_config.get('spacing_y', 0)
        columns = grid_config.get('columns', 3)
        rows = grid_config.get('rows', 4)
        crop_padding = grid_config.get('crop_padding', 0)

        for row in range(rows):
            for col in range(columns):
                # Calculate cell position
                x = start_x + col * (cell_width + spacing_x)
                y = start_y + row * (cell_height + spacing_y)

                # Apply crop padding to get inner icon
                crop_x1 = x + crop_padding
                crop_y1 = y + crop_padding
                crop_x2 = x + cell_width - crop_padding
                crop_y2 = y + cell_height - crop_padding

                # Ensure crop is within image bounds
                crop_x1 = max(0, crop_x1)
                crop_y1 = max(0, crop_y1)
                crop_x2 = min(image.width, crop_x2)
                crop_y2 = min(image.height, crop_y2)

                # Extract crop
                if crop_x2 > crop_x1 and crop_y2 > crop_y1:
                    cropped = image.crop((crop_x1, crop_y1, crop_x2, crop_y2))
                    icons.append((cropped, row, col))

        return icons

    def validate_grid_for_preview(
        self,
        image: Optional[Image.Image],
        grid_config: dict
    ) -> Tuple[bool, Optional[str]]:
        """Validate that grid configuration is ready for preview.

        Args:
            image: Source image (or None if not loaded)
            grid_config: Dictionary with grid parameters

        Returns:
            Tuple of (is_valid, error_message)
        """
        if image is None:
            return False, "No image loaded. Please open or capture a screenshot first."

        # Check that essential grid parameters are positive
        cell_width = grid_config.get('cell_width', 0)
        cell_height = grid_config.get('cell_height', 0)
        columns = grid_config.get('columns', 0)
        rows = grid_config.get('rows', 0)

        if cell_width <= 0 or cell_height <= 0:
            return False, "Grid cell dimensions must be positive. Please draw the grid first."

        if columns <= 0 or rows <= 0:
            return False, "Grid must have at least 1 column and 1 row."

        # Check that grid doesn't extend beyond image bounds
        start_x = grid_config.get('start_x', 0)
        start_y = grid_config.get('start_y', 0)
        spacing_x = grid_config.get('spacing_x', 0)
        spacing_y = grid_config.get('spacing_y', 0)

        grid_width = (columns - 1) * (cell_width + spacing_x) + cell_width
        grid_height = (rows - 1) * (cell_height + spacing_y) + cell_height

        if start_x + grid_width > image.width:
            return False, f"Grid extends beyond image width ({start_x + grid_width} > {image.width})"

        if start_y + grid_height > image.height:
            return False, f"Grid extends beyond image height ({start_y + grid_height} > {image.height})"

        return True, None
