"""Pydantic schema models for workspace.json validation.

This module provides runtime validation for workspace metadata using Pydantic.
It validates the structure, types, and constraints of workspace.json files
to catch errors early and provide user-friendly error messages.

Schema version 2 supports:
- Workspace-level overlays (defined once)
- Screenshot-level overlay bindings (references to workspace overlays)
- Grid and OCR overlay types
"""

from datetime import datetime
from typing import Dict, List, Literal, Union, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from pathlib import Path


class GridConfig(BaseModel):
    """Grid overlay configuration.

    Defines a grid layout for icon cropping with cells arranged in rows and columns.
    """
    start_x: int = Field(ge=0, description="X coordinate of grid start position (pixels)")
    start_y: int = Field(ge=0, description="Y coordinate of grid start position (pixels)")
    cell_width: int = Field(gt=0, description="Width of each grid cell (pixels)")
    cell_height: int = Field(gt=0, description="Height of each grid cell (pixels)")
    spacing_x: int = Field(ge=0, description="Horizontal spacing between cells (pixels)")
    spacing_y: int = Field(ge=0, description="Vertical spacing between cells (pixels)")
    columns: int = Field(gt=0, le=100, description="Number of columns in grid")
    rows: int = Field(gt=0, le=100, description="Number of rows in grid")
    crop_padding: int = Field(ge=0, description="Padding to remove from cell edges (pixels)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "start_x": 100,
                    "start_y": 200,
                    "cell_width": 80,
                    "cell_height": 80,
                    "spacing_x": 10,
                    "spacing_y": 10,
                    "columns": 5,
                    "rows": 4,
                    "crop_padding": 2
                }
            ]
        }
    }


class OCRConfig(BaseModel):
    """OCR region overlay configuration.

    Defines a rectangular region for OCR text detection.
    """
    x: int = Field(ge=0, description="X coordinate of region top-left corner (pixels)")
    y: int = Field(ge=0, description="Y coordinate of region top-left corner (pixels)")
    width: int = Field(ge=0, description="Width of OCR region (pixels)")
    height: int = Field(ge=0, description="Height of OCR region (pixels)")

    @model_validator(mode='after')
    def validate_region_size(self) -> 'OCRConfig':
        """Ensure OCR region has positive area if both width and height are non-zero."""
        if (self.width > 0 and self.height == 0) or (self.width == 0 and self.height > 0):
            raise ValueError("OCR region must have both width and height > 0, or both = 0")
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "x": 50,
                    "y": 50,
                    "width": 200,
                    "height": 100
                }
            ]
        }
    }


class OverlayData(BaseModel):
    """Overlay data model (workspace-level overlay definition).

    Each overlay has:
    - id: Unique identifier (e.g., "grid_1", "ocr_1")
    - type: "grid" or "ocr"
    - name: Display name for UI
    - config: Type-specific configuration (GridConfig or OCRConfig)
    - locked: If true, prevents deletion/modification
    - visible: If true, renders on canvas
    """
    id: str = Field(min_length=1, description="Unique overlay identifier")
    type: Literal["grid", "ocr"] = Field(description="Overlay type")
    name: str = Field(min_length=1, description="Display name for UI")
    config: Union[GridConfig, OCRConfig] = Field(description="Overlay configuration")
    locked: bool = Field(default=False, description="Prevents deletion/modification")
    visible: bool = Field(default=True, description="Controls rendering visibility")

    @model_validator(mode='after')
    def validate_config_matches_type(self) -> 'OverlayData':
        """Ensure config type matches overlay type."""
        if self.type == "grid" and not isinstance(self.config, GridConfig):
            raise ValueError(f"Grid overlay '{self.id}' must have GridConfig, got {type(self.config).__name__}")
        if self.type == "ocr" and not isinstance(self.config, OCRConfig):
            raise ValueError(f"OCR overlay '{self.id}' must have OCRConfig, got {type(self.config).__name__}")
        return self

    @field_validator('id')
    @classmethod
    def validate_overlay_id_format(cls, v: str) -> str:
        """Validate overlay ID format (must be non-empty and no special chars)."""
        if not v or not v.strip():
            raise ValueError("Overlay ID cannot be empty")
        # Allow alphanumeric, underscore, hyphen
        if not all(c.isalnum() or c in ('_', '-') for c in v):
            raise ValueError(f"Overlay ID '{v}' contains invalid characters (only alphanumeric, _, - allowed)")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "grid_1",
                    "type": "grid",
                    "name": "Grid 1",
                    "config": {
                        "start_x": 100,
                        "start_y": 200,
                        "cell_width": 80,
                        "cell_height": 80,
                        "spacing_x": 10,
                        "spacing_y": 10,
                        "columns": 5,
                        "rows": 4,
                        "crop_padding": 2
                    },
                    "locked": False,
                    "visible": True
                }
            ]
        }
    }


class ScreenshotMetadata(BaseModel):
    """Metadata for a single screenshot in a workspace.

    Each screenshot can be bound to zero or more workspace-level overlays.
    """
    filename: str = Field(min_length=1, description="Screenshot filename (e.g., '001.png')")
    captured_at: str = Field(description="ISO 8601 timestamp of capture")
    resolution: List[int] = Field(min_length=2, max_length=2, description="[width, height] in pixels")
    notes: str = Field(default="", description="Optional user notes")
    overlay_bindings: List[str] = Field(default_factory=list, description="List of overlay IDs bound to this screenshot")

    @field_validator('filename')
    @classmethod
    def validate_filename_format(cls, v: str) -> str:
        """Validate screenshot filename format."""
        if not v.endswith('.png'):
            raise ValueError(f"Screenshot filename must end with .png, got '{v}'")
        if '/' in v or '\\' in v:
            raise ValueError(f"Screenshot filename must not contain path separators, got '{v}'")
        return v

    @field_validator('resolution')
    @classmethod
    def validate_resolution(cls, v: List[int]) -> List[int]:
        """Ensure resolution values are positive."""
        if len(v) != 2:
            raise ValueError(f"Resolution must be [width, height], got {v}")
        if v[0] <= 0 or v[1] <= 0:
            raise ValueError(f"Resolution dimensions must be positive, got {v}")
        return v

    @field_validator('captured_at')
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        """Validate ISO 8601 timestamp format."""
        try:
            datetime.fromisoformat(v)
        except ValueError as e:
            raise ValueError(f"Invalid ISO 8601 timestamp '{v}': {e}")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "filename": "001.png",
                    "captured_at": "2025-11-16T10:30:00",
                    "resolution": [1920, 1080],
                    "notes": "First screenshot",
                    "overlay_bindings": ["grid_1", "ocr_1"]
                }
            ]
        }
    }


class WorkspaceMetadata(BaseModel):
    """Root schema for workspace.json (schema version 2).

    Schema v2 features:
    - Workspace-level overlays (defined once in 'overlays' dict)
    - Screenshot-level bindings (each screenshot references overlay IDs)
    - Supports reusing same overlay across multiple screenshots
    """
    workspace_name: str = Field(min_length=1, description="Workspace name (must match directory name)")
    schema_version: Literal[2] = Field(description="Schema version (must be 2)")
    created_at: str = Field(description="ISO 8601 timestamp of workspace creation")
    selected_screenshot: Optional[str] = Field(default=None, description="Currently selected screenshot filename")
    overlays: Dict[str, OverlayData] = Field(default_factory=dict, description="Workspace-level overlay definitions")
    screenshots: List[ScreenshotMetadata] = Field(default_factory=list, description="List of screenshots with bindings")

    @field_validator('created_at')
    @classmethod
    def validate_created_at(cls, v: str) -> str:
        """Validate creation timestamp format."""
        try:
            datetime.fromisoformat(v)
        except ValueError as e:
            raise ValueError(f"Invalid ISO 8601 timestamp '{v}': {e}")
        return v

    @model_validator(mode='after')
    def validate_overlay_references(self) -> 'WorkspaceMetadata':
        """Ensure all overlay bindings reference existing overlays."""
        overlay_ids = set(self.overlays.keys())

        for screenshot in self.screenshots:
            for overlay_id in screenshot.overlay_bindings:
                if overlay_id not in overlay_ids:
                    raise ValueError(
                        f"Screenshot '{screenshot.filename}' references non-existent overlay '{overlay_id}'. "
                        f"Available overlays: {sorted(overlay_ids)}"
                    )

        return self

    @model_validator(mode='after')
    def validate_selected_screenshot(self) -> 'WorkspaceMetadata':
        """Ensure selected_screenshot references an existing screenshot."""
        if self.selected_screenshot is not None:
            screenshot_filenames = {s.filename for s in self.screenshots}
            if self.selected_screenshot not in screenshot_filenames:
                raise ValueError(
                    f"Selected screenshot '{self.selected_screenshot}' not found in screenshots list. "
                    f"Available: {sorted(screenshot_filenames)}"
                )
        return self

    @model_validator(mode='after')
    def validate_overlay_ids_match_keys(self) -> 'WorkspaceMetadata':
        """Ensure overlay IDs match their dictionary keys."""
        for key, overlay in self.overlays.items():
            if key != overlay.id:
                raise ValueError(
                    f"Overlay dictionary key '{key}' does not match overlay ID '{overlay.id}'"
                )
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "workspace_name": "character_select",
                    "schema_version": 2,
                    "created_at": "2025-11-16T10:00:00",
                    "selected_screenshot": "001.png",
                    "overlays": {
                        "grid_1": {
                            "id": "grid_1",
                            "type": "grid",
                            "name": "Grid 1",
                            "config": {
                                "start_x": 100,
                                "start_y": 200,
                                "cell_width": 80,
                                "cell_height": 80,
                                "spacing_x": 10,
                                "spacing_y": 10,
                                "columns": 5,
                                "rows": 4,
                                "crop_padding": 2
                            },
                            "locked": False,
                            "visible": True
                        }
                    },
                    "screenshots": [
                        {
                            "filename": "001.png",
                            "captured_at": "2025-11-16T10:30:00",
                            "resolution": [1920, 1080],
                            "notes": "",
                            "overlay_bindings": ["grid_1"]
                        }
                    ]
                }
            ]
        }
    }


def validate_workspace_file(file_path: Path) -> WorkspaceMetadata:
    """Load and validate a workspace.json file.

    Args:
        file_path: Path to workspace.json file

    Returns:
        Validated WorkspaceMetadata instance

    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If validation fails (with detailed error message)

    Example:
        >>> metadata = validate_workspace_file(Path("workspaces/foo/workspace.json"))
        >>> print(f"Loaded workspace: {metadata.workspace_name}")
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Workspace file not found: {file_path}")

    import json
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return WorkspaceMetadata.model_validate(data)


def generate_json_schema() -> Dict[str, Any]:
    """Generate JSON Schema for workspace.json.

    Returns:
        JSON Schema dict (can be saved as workspace-schema.json)

    Example:
        >>> schema = generate_json_schema()
        >>> with open("workspace-schema.json", "w") as f:
        ...     json.dump(schema, f, indent=2)
    """
    return WorkspaceMetadata.model_json_schema()


__all__ = [
    'GridConfig',
    'OCRConfig',
    'OverlayData',
    'ScreenshotMetadata',
    'WorkspaceMetadata',
    'validate_workspace_file',
    'generate_json_schema'
]
