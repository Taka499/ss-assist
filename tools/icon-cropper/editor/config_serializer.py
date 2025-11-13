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

    def save(
        self,
        config: Any,
        page_name: str,
        grid_config: Dict[str, Any],
        ocr_region: Optional[list[int]] = None,
        create_backup: bool = True
    ) -> Tuple[bool, Optional[str]]:
        """Save updated configuration to config.yaml.

        Args:
            config: The loaded config dictionary (from load())
            page_name: Name of the page being edited (e.g., 'character_select')
            grid_config: Grid configuration dict with keys:
                - start_x, start_y, cell_width, cell_height,
                - spacing_x, spacing_y, columns, rows, crop_padding
            ocr_region: Optional OCR region [x, y, width, height]
            create_backup: Whether to create a timestamped backup before saving

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Create backup if requested
            if create_backup:
                backup_success, backup_error = self._create_backup()
                if not backup_success:
                    return False, f"Backup failed: {backup_error}"

            # Update grid configuration for the specified page
            if 'pages' not in config:
                return False, "Config missing 'pages' section"

            if page_name not in config['pages']:
                return False, f"Page '{page_name}' not found in config"

            # Update grid settings
            page = config['pages'][page_name]
            if 'grid' not in page:
                page['grid'] = {}

            grid = page['grid']
            grid['start_x'] = int(grid_config['start_x'])
            grid['start_y'] = int(grid_config['start_y'])
            grid['cell_width'] = int(grid_config['cell_width'])
            grid['cell_height'] = int(grid_config['cell_height'])
            grid['spacing_x'] = int(grid_config['spacing_x'])
            grid['spacing_y'] = int(grid_config['spacing_y'])
            grid['columns'] = int(grid_config['columns'])
            grid['rows'] = int(grid_config['rows'])
            grid['crop_padding'] = int(grid_config['crop_padding'])

            # Update OCR region if provided
            if ocr_region is not None:
                if 'ocr' not in config:
                    config['ocr'] = {}
                config['ocr']['detection_region'] = [
                    int(ocr_region[0]),
                    int(ocr_region[1]),
                    int(ocr_region[2]),
                    int(ocr_region[3])
                ]

            # Write config back to file
            with open(self.config_path, 'w', encoding='utf-8') as f:
                self.yaml.dump(config, f)

            return True, None

        except Exception as e:
            return False, f"Failed to save config: {str(e)}"

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
            start_x = grid_config['start_x']
            start_y = grid_config['start_y']
            cell_width = grid_config['cell_width']
            cell_height = grid_config['cell_height']
            spacing_x = grid_config['spacing_x']
            spacing_y = grid_config['spacing_y']
            columns = grid_config['columns']
            rows = grid_config['rows']
            crop_padding = grid_config['crop_padding']

            # Validate types and ranges
            if not all(isinstance(v, (int, float)) for v in [
                start_x, start_y, cell_width, cell_height,
                spacing_x, spacing_y, columns, rows, crop_padding
            ]):
                return False, "All grid values must be numbers"

            # Check positive dimensions
            if cell_width <= 0 or cell_height <= 0:
                return False, "Cell dimensions must be positive"

            if columns <= 0 or rows <= 0:
                return False, "Grid size (columns/rows) must be positive"

            # Check non-negative values
            if spacing_x < 0 or spacing_y < 0:
                return False, "Spacing values cannot be negative"

            if crop_padding < 0:
                return False, "Crop padding cannot be negative"

            # Check padding doesn't exceed cell dimensions
            if crop_padding * 2 >= cell_width or crop_padding * 2 >= cell_height:
                return False, "Crop padding is too large for cell dimensions"

            # Check grid fits within image bounds
            grid_right = start_x + columns * cell_width + (columns - 1) * spacing_x
            grid_bottom = start_y + rows * cell_height + (rows - 1) * spacing_y

            if start_x < 0 or start_y < 0:
                return False, "Grid start position cannot be negative"

            if grid_right > image_width:
                return False, f"Grid extends beyond image width ({grid_right} > {image_width})"

            if grid_bottom > image_height:
                return False, f"Grid extends beyond image height ({grid_bottom} > {image_height})"

            return True, None

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

            x, y, width, height = ocr_region

            # Check types
            if not all(isinstance(v, (int, float)) for v in [x, y, width, height]):
                return False, "All OCR region values must be numbers"

            # Check positive dimensions
            if width <= 0 or height <= 0:
                return False, "OCR region dimensions must be positive"

            # Check non-negative position
            if x < 0 or y < 0:
                return False, "OCR region position cannot be negative"

            # Check region fits within image bounds
            if x + width > image_width:
                return False, f"OCR region extends beyond image width ({x + width} > {image_width})"

            if y + height > image_height:
                return False, f"OCR region extends beyond image height ({y + height} > {image_height})"

            return True, None

        except Exception as e:
            return False, f"Validation error: {str(e)}"
