"""
Configuration serialization module for config_editor.

Provides comment-preserving YAML load/save functionality with automatic backup creation.
"""

from pathlib import Path
from datetime import datetime
import shutil
from typing import Dict, Any, Optional, Tuple
from ruamel.yaml import YAML


class ConfigSerializer:
    """Handles loading and saving config.yaml with comment preservation."""

    def __init__(self, config_path: str | Path):
        """Initialize the serializer.

        Args:
            config_path: Path to config.yaml file
        """
        self.config_path = Path(config_path)
        self.yaml = YAML()
        self.yaml.preserve_quotes = True
        self.yaml.default_flow_style = False
        self.yaml.width = 4096  # Prevent line wrapping

    def load(self) -> Tuple[Any, Optional[str]]:
        """Load config.yaml with comment preservation.

        Returns:
            Tuple of (config_dict, error_message)
            config_dict is None if loading fails
        """
        try:
            if not self.config_path.exists():
                return None, f"Config file not found: {self.config_path}"

            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = self.yaml.load(f)

            return config, None

        except Exception as e:
            return None, f"Failed to load config: {str(e)}"

    def save(self, config: Dict[str, Any], create_backup: bool = True) -> Tuple[bool, Optional[str]]:
        """Save configuration to YAML file.

        Args:
            config: Configuration dictionary
            create_backup: Whether to create timestamped backup

        Returns:
            Tuple of (success boolean, error message if failed)
        """
        try:
            # Create backup if requested
            if create_backup and self.config_path.exists():
                backup_success, backup_error = self._create_backup()
                if not backup_success:
                    return False, f"Backup failed: {backup_error}"

            # Save config
            with open(self.config_path, 'w', encoding='utf-8') as f:
                self.yaml.dump(config, f)

            return True, None

        except Exception as e:
            return False, f"Failed to save config: {e}"

    def _create_backup(self) -> Tuple[bool, Optional[str]]:
        """Create a timestamped backup of config.yaml.

        Returns:
            Tuple of (success, error_message)
        """
        try:
            if not self.config_path.exists():
                return False, "Config file does not exist"

            # Generate backup filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.config_path.with_suffix(f'.yaml.backup.{timestamp}')

            # Copy current config to backup
            shutil.copy2(self.config_path, backup_path)

            return True, None

        except Exception as e:
            return False, f"Failed to create backup: {str(e)}"

    def validate_grid_config(
        self,
        grid_config: Dict[str, Any],
        image_width: int,
        image_height: int
    ) -> Tuple[bool, Optional[str]]:
        """Validate grid configuration before saving.

        Args:
            grid_config: Grid configuration to validate
            image_width: Screenshot width in pixels
            image_height: Screenshot height in pixels

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check required fields
            required = [
                'start_x', 'start_y', 'cell_width', 'cell_height',
                'spacing_x', 'spacing_y', 'columns', 'rows', 'crop_padding'
            ]
            for field in required:
                if field not in grid_config:
                    return False, f"Missing required field: {field}"

            # Extract values
            start_x = int(grid_config['start_x'])
            start_y = int(grid_config['start_y'])
            cell_width = int(grid_config['cell_width'])
            cell_height = int(grid_config['cell_height'])
            spacing_x = int(grid_config['spacing_x'])
            spacing_y = int(grid_config['spacing_y'])
            columns = int(grid_config['columns'])
            rows = int(grid_config['rows'])
            crop_padding = int(grid_config['crop_padding'])

            # Validate types and ranges
            if not all(isinstance(v, (int, float)) for v in [
                start_x, start_y, cell_width, cell_height,
                spacing_x, spacing_y, columns, rows, crop_padding
            ]):
                return False, "All grid values must be numbers"

            # Check positive dimensions
            if cell_width <= 0:
                return False, f"Cell width must be positive (got {cell_width})"

            if cell_height <= 0:
                return False, f"Cell height must be positive (got {cell_height})"

            if columns <= 0:
                return False, f"Number of columns must be positive (got {columns})"

            if rows <= 0:
                return False, f"Number of rows must be positive (got {rows})"

            # Check reasonable limits
            if columns > 50:
                return False, f"Number of columns is too large ({columns}). Maximum recommended: 50"

            if rows > 50:
                return False, f"Number of rows is too large ({rows}). Maximum recommended: 50"

            # Check non-negative values
            if spacing_x < 0:
                return False, f"Horizontal spacing cannot be negative (got {spacing_x})"

            if spacing_y < 0:
                return False, f"Vertical spacing cannot be negative (got {spacing_y})"

            # Check for excessively large spacing
            if spacing_x > cell_width * 2:
                return False, f"Horizontal spacing ({spacing_x}px) is too large (more than 2× cell width). Check your configuration."

            if spacing_y > cell_height * 2:
                return False, f"Vertical spacing ({spacing_y}px) is too large (more than 2× cell height). Check your configuration."

            if crop_padding < 0:
                return False, f"Crop padding cannot be negative (got {crop_padding})"

            # Check padding doesn't exceed cell dimensions
            if crop_padding * 2 >= cell_width:
                return False, f"Crop padding ({crop_padding}px × 2 = {crop_padding * 2}px) exceeds cell width ({cell_width}px)"

            if crop_padding * 2 >= cell_height:
                return False, f"Crop padding ({crop_padding}px × 2 = {crop_padding * 2}px) exceeds cell height ({cell_height}px)"

            # Check grid start position
            if start_x < 0 or start_y < 0:
                return False, f"Grid start position cannot be negative (got x={start_x}, y={start_y})"

            # Check first cell fits within image
            first_cell_right = start_x + cell_width
            first_cell_bottom = start_y + cell_height

            if first_cell_right > image_width:
                return False, f"First cell extends beyond image width (cell right edge at {first_cell_right}px > image width {image_width}px)"

            if first_cell_bottom > image_height:
                return False, f"First cell extends beyond image height (cell bottom edge at {first_cell_bottom}px > image height {image_height}px)"

            # Check entire grid fits within image bounds
            grid_right = start_x + columns * cell_width + (columns - 1) * spacing_x
            grid_bottom = start_y + rows * cell_height + (rows - 1) * spacing_y

            if grid_right > image_width:
                overflow = grid_right - image_width
                return False, (
                    f"Grid extends {overflow}px beyond image width.\n"
                    f"Grid right edge: {grid_right}px, Image width: {image_width}px\n"
                    f"Reduce columns, cell width, or horizontal spacing."
                )

            if grid_bottom > image_height:
                overflow = grid_bottom - image_height
                return False, (
                    f"Grid extends {overflow}px beyond image height.\n"
                    f"Grid bottom edge: {grid_bottom}px, Image height: {image_height}px\n"
                    f"Reduce rows, cell height, or vertical spacing."
                )

            # Check for cells that would crop to zero or negative size after padding
            cropped_width = cell_width - (2 * crop_padding)
            cropped_height = cell_height - (2 * crop_padding)

            if cropped_width < 10 or cropped_height < 10:
                return False, (
                    f"Cropped cell size too small ({cropped_width}×{cropped_height}px).\n"
                    f"After padding, cells should be at least 10×10px.\n"
                    f"Reduce crop padding or increase cell size."
                )

            return True, None

        except (ValueError, TypeError) as e:
            return False, f"Invalid grid configuration: {str(e)}"
        except Exception as e:
            return False, f"Validation error: {str(e)}"

    def validate_ocr_region(
        self,
        ocr_region: list[int],
        image_width: int,
        image_height: int
    ) -> Tuple[bool, Optional[str]]:
        """Validate OCR region before saving.

        Args:
            ocr_region: OCR region [x, y, width, height]
            image_width: Screenshot width in pixels
            image_height: Screenshot height in pixels

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            if len(ocr_region) != 4:
                return False, "OCR region must have 4 values: [x, y, width, height]"

            x = int(ocr_region[0])
            y = int(ocr_region[1])
            width = int(ocr_region[2])
            height = int(ocr_region[3])

            # Check types
            if not all(isinstance(v, (int, float)) for v in [x, y, width, height]):
                return False, "All OCR region values must be numbers"

            # Check positive dimensions
            if width <= 0:
                return False, f"OCR region width must be positive (got {width})"

            if height <= 0:
                return False, f"OCR region height must be positive (got {height})"

            # Check reasonable minimum size for OCR
            if width < 20:
                return False, f"OCR region width too small ({width}px). Minimum recommended: 20px"

            if height < 10:
                return False, f"OCR region height too small ({height}px). Minimum recommended: 10px"

            # Check reasonable maximum size (OCR region shouldn't be huge)
            if width > image_width * 0.8:
                return False, f"OCR region width too large ({width}px, {width/image_width*100:.1f}% of image). Maximum recommended: 80% of image width"

            if height > image_height * 0.5:
                return False, f"OCR region height too large ({height}px, {height/image_height*100:.1f}% of image). Maximum recommended: 50% of image height"

            # Check non-negative position
            if x < 0:
                return False, f"OCR region X position cannot be negative (got {x})"

            if y < 0:
                return False, f"OCR region Y position cannot be negative (got {y})"

            # Check region fits within image bounds
            region_right = x + width
            region_bottom = y + height

            if region_right > image_width:
                overflow = region_right - image_width
                return False, (
                    f"OCR region extends {overflow}px beyond image width.\n"
                    f"Region right edge: {region_right}px, Image width: {image_width}px\n"
                    f"Reduce width or move region left."
                )

            if region_bottom > image_height:
                overflow = region_bottom - image_height
                return False, (
                    f"OCR region extends {overflow}px beyond image height.\n"
                    f"Region bottom edge: {region_bottom}px, Image height: {image_height}px\n"
                    f"Reduce height or move region up."
                )

            return True, None

        except (ValueError, TypeError) as e:
            return False, f"Invalid OCR region: {str(e)}"
        except Exception as e:
            return False, f"Validation error: {str(e)}"
