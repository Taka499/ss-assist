"""Tests for Pydantic workspace schema validation.

Tests cover:
- Valid workspace.json validation
- Invalid data rejection with clear error messages
- Cross-field validation (overlay references, selected screenshot)
- Edge cases (empty workspaces, missing fields)
"""

import pytest
from pydantic import ValidationError
from editor.schema import (
    GridConfig,
    OCRConfig,
    OverlayData,
    ScreenshotMetadata,
    WorkspaceMetadata,
)


class TestGridConfig:
    """Test GridConfig validation."""

    def test_valid_grid_config(self):
        """Valid grid configuration should pass."""
        config = GridConfig(
            start_x=100,
            start_y=200,
            cell_width=80,
            cell_height=80,
            spacing_x=10,
            spacing_y=10,
            columns=5,
            rows=4,
            crop_padding=2
        )
        assert config.start_x == 100
        assert config.columns == 5

    def test_negative_start_position_rejected(self):
        """Negative start positions should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            GridConfig(
                start_x=-10,  # Invalid
                start_y=200,
                cell_width=80,
                cell_height=80,
                spacing_x=10,
                spacing_y=10,
                columns=5,
                rows=4,
                crop_padding=2
            )
        assert "start_x" in str(exc_info.value)

    def test_zero_cell_dimensions_rejected(self):
        """Zero or negative cell dimensions should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            GridConfig(
                start_x=100,
                start_y=200,
                cell_width=0,  # Invalid
                cell_height=80,
                spacing_x=10,
                spacing_y=10,
                columns=5,
                rows=4,
                crop_padding=2
            )
        assert "cell_width" in str(exc_info.value)

    def test_excessive_columns_rejected(self):
        """More than 100 columns should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            GridConfig(
                start_x=100,
                start_y=200,
                cell_width=80,
                cell_height=80,
                spacing_x=10,
                spacing_y=10,
                columns=101,  # Invalid
                rows=4,
                crop_padding=2
            )
        assert "columns" in str(exc_info.value)


class TestOCRConfig:
    """Test OCRConfig validation."""

    def test_valid_ocr_config(self):
        """Valid OCR configuration should pass."""
        config = OCRConfig(x=50, y=50, width=200, height=100)
        assert config.x == 50
        assert config.width == 200

    def test_zero_dimensions_allowed(self):
        """Zero dimensions should be allowed (empty region)."""
        config = OCRConfig(x=0, y=0, width=0, height=0)
        assert config.width == 0

    def test_partial_zero_dimensions_rejected(self):
        """Width > 0 but height = 0 should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            OCRConfig(x=0, y=0, width=200, height=0)  # Invalid
        assert "width and height" in str(exc_info.value).lower()

    def test_negative_coordinates_rejected(self):
        """Negative coordinates should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            OCRConfig(x=-10, y=50, width=200, height=100)  # Invalid
        assert "x" in str(exc_info.value)


class TestOverlayData:
    """Test OverlayData validation."""

    def test_valid_grid_overlay(self):
        """Valid grid overlay should pass."""
        overlay = OverlayData(
            id="grid_1",
            type="grid",
            name="Grid 1",
            config=GridConfig(
                start_x=100, start_y=200, cell_width=80, cell_height=80,
                spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
            ),
            locked=False,
            visible=True
        )
        assert overlay.id == "grid_1"
        assert overlay.type == "grid"

    def test_valid_ocr_overlay(self):
        """Valid OCR overlay should pass."""
        overlay = OverlayData(
            id="ocr_1",
            type="ocr",
            name="OCR Region 1",
            config=OCRConfig(x=50, y=50, width=200, height=100),
            locked=False,
            visible=True
        )
        assert overlay.id == "ocr_1"
        assert overlay.type == "ocr"

    def test_config_type_mismatch_rejected(self):
        """Grid overlay with OCRConfig should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            OverlayData(
                id="grid_1",
                type="grid",
                name="Grid 1",
                config=OCRConfig(x=50, y=50, width=200, height=100),  # Wrong config type
                locked=False,
                visible=True
            )
        assert "GridConfig" in str(exc_info.value)

    def test_invalid_overlay_id_rejected(self):
        """Overlay ID with special characters should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            OverlayData(
                id="grid@1",  # Invalid character
                type="grid",
                name="Grid 1",
                config=GridConfig(
                    start_x=100, start_y=200, cell_width=80, cell_height=80,
                    spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
                ),
                locked=False,
                visible=True
            )
        assert "invalid characters" in str(exc_info.value).lower()

    def test_empty_overlay_id_rejected(self):
        """Empty overlay ID should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            OverlayData(
                id="",  # Invalid
                type="grid",
                name="Grid 1",
                config=GridConfig(
                    start_x=100, start_y=200, cell_width=80, cell_height=80,
                    spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
                ),
                locked=False,
                visible=True
            )
        assert "id" in str(exc_info.value).lower()


class TestScreenshotMetadata:
    """Test ScreenshotMetadata validation."""

    def test_valid_screenshot_metadata(self):
        """Valid screenshot metadata should pass."""
        screenshot = ScreenshotMetadata(
            filename="001.png",
            captured_at="2025-11-16T10:30:00",
            resolution=[1920, 1080],
            notes="Test screenshot",
            overlay_bindings=["grid_1", "ocr_1"]
        )
        assert screenshot.filename == "001.png"
        assert screenshot.resolution == [1920, 1080]

    def test_invalid_filename_extension_rejected(self):
        """Non-PNG filename should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ScreenshotMetadata(
                filename="001.jpg",  # Invalid
                captured_at="2025-11-16T10:30:00",
                resolution=[1920, 1080],
                notes="",
                overlay_bindings=[]
            )
        assert ".png" in str(exc_info.value).lower()

    def test_filename_with_path_rejected(self):
        """Filename with path separators should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ScreenshotMetadata(
                filename="screenshots/001.png",  # Invalid
                captured_at="2025-11-16T10:30:00",
                resolution=[1920, 1080],
                notes="",
                overlay_bindings=[]
            )
        assert "path separator" in str(exc_info.value).lower()

    def test_invalid_resolution_rejected(self):
        """Invalid resolution should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ScreenshotMetadata(
                filename="001.png",
                captured_at="2025-11-16T10:30:00",
                resolution=[1920, 0],  # Invalid (zero height)
                notes="",
                overlay_bindings=[]
            )
        assert "positive" in str(exc_info.value).lower()

    def test_invalid_timestamp_rejected(self):
        """Invalid ISO 8601 timestamp should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ScreenshotMetadata(
                filename="001.png",
                captured_at="not-a-timestamp",  # Invalid format
                resolution=[1920, 1080],
                notes="",
                overlay_bindings=[]
            )
        assert "timestamp" in str(exc_info.value).lower()


class TestWorkspaceMetadata:
    """Test WorkspaceMetadata validation (root model)."""

    def test_valid_workspace_metadata(self):
        """Valid workspace metadata should pass."""
        workspace = WorkspaceMetadata(
            workspace_name="character_select",
            schema_version=2,
            created_at="2025-11-16T10:00:00",
            selected_screenshot="001.png",
            overlays={
                "grid_1": OverlayData(
                    id="grid_1",
                    type="grid",
                    name="Grid 1",
                    config=GridConfig(
                        start_x=100, start_y=200, cell_width=80, cell_height=80,
                        spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
                    ),
                    locked=False,
                    visible=True
                )
            },
            screenshots=[
                ScreenshotMetadata(
                    filename="001.png",
                    captured_at="2025-11-16T10:30:00",
                    resolution=[1920, 1080],
                    notes="",
                    overlay_bindings=["grid_1"]
                )
            ]
        )
        assert workspace.workspace_name == "character_select"
        assert workspace.schema_version == 2

    def test_empty_workspace_valid(self):
        """Empty workspace (no overlays/screenshots) should be valid."""
        workspace = WorkspaceMetadata(
            workspace_name="empty_workspace",
            schema_version=2,
            created_at="2025-11-16T10:00:00",
            selected_screenshot=None,
            overlays={},
            screenshots=[]
        )
        assert len(workspace.overlays) == 0
        assert len(workspace.screenshots) == 0

    def test_invalid_schema_version_rejected(self):
        """Schema version other than 2 should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            WorkspaceMetadata(
                workspace_name="test",
                schema_version=1,  # Invalid
                created_at="2025-11-16T10:00:00",
                selected_screenshot=None,
                overlays={},
                screenshots=[]
            )
        assert "schema_version" in str(exc_info.value)

    def test_overlay_reference_validation(self):
        """Screenshot referencing non-existent overlay should be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            WorkspaceMetadata(
                workspace_name="test",
                schema_version=2,
                created_at="2025-11-16T10:00:00",
                selected_screenshot="001.png",
                overlays={},  # No overlays defined
                screenshots=[
                    ScreenshotMetadata(
                        filename="001.png",
                        captured_at="2025-11-16T10:30:00",
                        resolution=[1920, 1080],
                        notes="",
                        overlay_bindings=["grid_1"]  # References non-existent overlay
                    )
                ]
            )
        assert "non-existent overlay" in str(exc_info.value).lower()

    def test_selected_screenshot_validation(self):
        """Selected screenshot must exist in screenshots list."""
        with pytest.raises(ValidationError) as exc_info:
            WorkspaceMetadata(
                workspace_name="test",
                schema_version=2,
                created_at="2025-11-16T10:00:00",
                selected_screenshot="002.png",  # Doesn't exist
                overlays={},
                screenshots=[
                    ScreenshotMetadata(
                        filename="001.png",
                        captured_at="2025-11-16T10:30:00",
                        resolution=[1920, 1080],
                        notes="",
                        overlay_bindings=[]
                    )
                ]
            )
        assert "not found in screenshots" in str(exc_info.value).lower()

    def test_overlay_id_key_mismatch_rejected(self):
        """Overlay ID must match dictionary key."""
        with pytest.raises(ValidationError) as exc_info:
            WorkspaceMetadata(
                workspace_name="test",
                schema_version=2,
                created_at="2025-11-16T10:00:00",
                selected_screenshot=None,
                overlays={
                    "grid_1": OverlayData(
                        id="grid_2",  # Doesn't match key
                        type="grid",
                        name="Grid 1",
                        config=GridConfig(
                            start_x=100, start_y=200, cell_width=80, cell_height=80,
                            spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
                        ),
                        locked=False,
                        visible=True
                    )
                },
                screenshots=[]
            )
        assert "does not match" in str(exc_info.value).lower()

    def test_complex_valid_workspace(self):
        """Complex workspace with multiple overlays and screenshots should pass."""
        workspace = WorkspaceMetadata(
            workspace_name="character_select",
            schema_version=2,
            created_at="2025-11-16T10:00:00",
            selected_screenshot="002.png",
            overlays={
                "grid_1": OverlayData(
                    id="grid_1",
                    type="grid",
                    name="Grid 1",
                    config=GridConfig(
                        start_x=100, start_y=200, cell_width=80, cell_height=80,
                        spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
                    ),
                    locked=False,
                    visible=True
                ),
                "grid_2": OverlayData(
                    id="grid_2",
                    type="grid",
                    name="Grid 2",
                    config=GridConfig(
                        start_x=200, start_y=300, cell_width=100, cell_height=100,
                        spacing_x=5, spacing_y=5, columns=3, rows=3, crop_padding=0
                    ),
                    locked=True,
                    visible=False
                ),
                "ocr_1": OverlayData(
                    id="ocr_1",
                    type="ocr",
                    name="OCR Region 1",
                    config=OCRConfig(x=50, y=50, width=200, height=100),
                    locked=False,
                    visible=True
                )
            },
            screenshots=[
                ScreenshotMetadata(
                    filename="001.png",
                    captured_at="2025-11-16T10:30:00",
                    resolution=[1920, 1080],
                    notes="First screenshot",
                    overlay_bindings=["grid_1", "ocr_1"]
                ),
                ScreenshotMetadata(
                    filename="002.png",
                    captured_at="2025-11-16T10:31:00",
                    resolution=[1920, 1080],
                    notes="Second screenshot",
                    overlay_bindings=["grid_2"]
                ),
                ScreenshotMetadata(
                    filename="003.png",
                    captured_at="2025-11-16T10:32:00",
                    resolution=[1920, 1080],
                    notes="All overlays",
                    overlay_bindings=["grid_1", "grid_2", "ocr_1"]
                )
            ]
        )
        assert len(workspace.overlays) == 3
        assert len(workspace.screenshots) == 3
        assert workspace.selected_screenshot == "002.png"


class TestWorkspaceJSONRoundTrip:
    """Test serialization and deserialization round-trips."""

    def test_model_to_json_and_back(self):
        """Model should serialize to JSON and deserialize back identically."""
        original = WorkspaceMetadata(
            workspace_name="test",
            schema_version=2,
            created_at="2025-11-16T10:00:00",
            selected_screenshot="001.png",
            overlays={
                "grid_1": OverlayData(
                    id="grid_1",
                    type="grid",
                    name="Grid 1",
                    config=GridConfig(
                        start_x=100, start_y=200, cell_width=80, cell_height=80,
                        spacing_x=10, spacing_y=10, columns=5, rows=4, crop_padding=2
                    ),
                    locked=False,
                    visible=True
                )
            },
            screenshots=[
                ScreenshotMetadata(
                    filename="001.png",
                    captured_at="2025-11-16T10:30:00",
                    resolution=[1920, 1080],
                    notes="Test",
                    overlay_bindings=["grid_1"]
                )
            ]
        )

        # Serialize to JSON
        json_str = original.model_dump_json()

        # Deserialize back
        import json
        data = json.loads(json_str)
        restored = WorkspaceMetadata.model_validate(data)

        # Verify equality
        assert restored.workspace_name == original.workspace_name
        assert restored.schema_version == original.schema_version
        assert len(restored.overlays) == len(original.overlays)
        assert len(restored.screenshots) == len(original.screenshots)
