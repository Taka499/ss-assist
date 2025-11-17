"""Tests for icon cropping API."""

import pytest
import numpy as np
from PIL import Image
from pathlib import Path
import json
import tempfile
import shutil
from datetime import datetime

from editor.cropper_api import (
    crop_grid,
    preview_overlay,
    batch_crop_workspace,
    get_crop_statistics
)
from editor.schema import GridConfig, WorkspaceMetadata, OverlayData, ScreenshotMetadata


def create_test_image(width: int = 400, height: int = 400, color=(255, 255, 255)):
    """Create a test image with specified dimensions and color."""
    return np.full((height, width, 3), color, dtype=np.uint8)


def test_crop_grid_basic():
    """Test basic grid cropping without padding."""
    # Create 400x400 white image
    image = create_test_image(400, 400)

    # Define 2x2 grid starting at (100, 100), 80x80 cells, 10px spacing
    config = GridConfig(
        start_x=100,
        start_y=100,
        cell_width=80,
        cell_height=80,
        rows=2,
        columns=2,
        spacing_x=10,
        spacing_y=10,
        crop_padding=0
    )

    icons = crop_grid(image, config)

    assert len(icons) == 4  # 2 rows × 2 cols

    # Verify each icon has correct dimensions
    for icon in icons:
        assert icon.shape == (80, 80, 3)


def test_crop_grid_with_crop_padding():
    """Test grid cropping with crop padding (shrinks cells)."""
    image = create_test_image(400, 400)

    config = GridConfig(
        start_x=100,
        start_y=100,
        cell_width=80,
        cell_height=80,
        rows=2,
        columns=2,
        spacing_x=10,
        spacing_y=10,
        crop_padding=5  # Removes 5px from each edge
    )

    icons = crop_grid(image, config)

    # Each icon should be shrunk by padding (80 - 5 - 5 = 70)
    for icon in icons:
        assert icon.shape == (70, 70, 3)


def test_crop_grid_edge_clipping():
    """Test that cropping clips correctly at image boundaries."""
    # Small 200x200 image
    image = create_test_image(200, 200)

    # Grid that extends beyond image boundaries
    config = GridConfig(
        start_x=150,
        start_y=150,
        cell_width=80,
        cell_height=80,
        rows=2,
        columns=2,
        spacing_x=10,
        spacing_y=10,
        crop_padding=0
    )

    icons = crop_grid(image, config)

    # Should still have 4 icons, but some will be clipped
    assert len(icons) == 4

    # Bottom-right icon should be clipped (image is only 200x200)
    # Start at (240, 240), but image ends at (200, 200)
    # So bottom-right icon should be empty or very small
    bottom_right_icon = icons[3]
    assert bottom_right_icon.shape[0] <= 80  # Height clipped
    assert bottom_right_icon.shape[1] <= 80  # Width clipped


def test_crop_grid_order():
    """Test that icons are returned in correct order (left-to-right, top-to-bottom)."""
    # Create image with colored quadrants
    image = np.zeros((400, 400, 3), dtype=np.uint8)
    image[0:200, 0:200] = [255, 0, 0]      # Top-left: Red
    image[0:200, 200:400] = [0, 255, 0]    # Top-right: Green
    image[200:400, 0:200] = [0, 0, 255]    # Bottom-left: Blue
    image[200:400, 200:400] = [255, 255, 0]  # Bottom-right: Yellow

    config = GridConfig(
        start_x=50,
        start_y=50,
        cell_width=100,
        cell_height=100,
        rows=2,
        columns=2,
        spacing_x=100,
        spacing_y=100,
        crop_padding=0
    )

    icons = crop_grid(image, config)

    # Icons should be: [red, green, blue, yellow]
    assert np.allclose(icons[0].mean(axis=(0, 1)), [255, 0, 0], atol=50)    # Red
    assert np.allclose(icons[1].mean(axis=(0, 1)), [0, 255, 0], atol=50)    # Green
    assert np.allclose(icons[2].mean(axis=(0, 1)), [0, 0, 255], atol=50)    # Blue
    assert np.allclose(icons[3].mean(axis=(0, 1)), [255, 255, 0], atol=50)  # Yellow


@pytest.fixture
def temp_workspace():
    """Create temporary workspace for testing."""
    temp_dir = Path(tempfile.mkdtemp())
    workspace_name = "test_workspace"
    workspace_path = temp_dir / workspace_name

    # Create workspace structure
    workspace_path.mkdir(parents=True)
    screenshots_dir = workspace_path / "screenshots"
    screenshots_dir.mkdir()

    # Create test screenshot
    test_image = Image.fromarray(create_test_image(400, 400))
    test_image.save(screenshots_dir / "001.png")

    # Create workspace.json with valid schema
    workspace_data = WorkspaceMetadata(
        workspace_name=workspace_name,
        created_at=datetime.now().isoformat(),
        schema_version=2,
        overlays={
            "grid_1": OverlayData(
                id="grid_1",
                type="grid",
                name="Test Grid",
                config=GridConfig(
                    start_x=50,
                    start_y=50,
                    cell_width=80,
                    cell_height=80,
                    rows=3,
                    columns=4,
                    spacing_x=10,
                    spacing_y=10,
                    crop_padding=0
                )
            )
        },
        screenshots=[
            ScreenshotMetadata(
                filename="001.png",
                captured_at=datetime.now().isoformat(),
                resolution=[400, 400],
                overlay_bindings=["grid_1"]
            )
        ]
    )

    with open(workspace_path / "workspace.json", 'w', encoding='utf-8') as f:
        json.dump(workspace_data.model_dump(mode='json'), f, indent=2)

    yield temp_dir, workspace_name

    # Cleanup
    shutil.rmtree(temp_dir)


class TestPreviewOverlay:
    """Tests for preview_overlay function."""

    def test_preview_overlay_success(self, temp_workspace):
        """Test successful preview of overlay."""
        temp_dir, workspace_name = temp_workspace

        icons = preview_overlay(
            workspace_name,
            "001.png",
            "grid_1",
            workspaces_root=temp_dir
        )

        # 3 rows × 4 cols = 12 icons
        assert len(icons) == 12

        # All icons should be PIL Images
        for icon in icons:
            assert isinstance(icon, Image.Image)

    def test_preview_overlay_workspace_not_found(self, temp_workspace):
        """Test error when workspace doesn't exist."""
        temp_dir, _ = temp_workspace

        with pytest.raises(FileNotFoundError, match="Workspace 'nonexistent' not found"):
            preview_overlay("nonexistent", "001.png", "grid_1", workspaces_root=temp_dir)

    def test_preview_overlay_screenshot_not_found(self, temp_workspace):
        """Test error when screenshot doesn't exist."""
        temp_dir, workspace_name = temp_workspace

        with pytest.raises(FileNotFoundError, match="Screenshot '999.png' not found"):
            preview_overlay(workspace_name, "999.png", "grid_1", workspaces_root=temp_dir)

    def test_preview_overlay_not_found(self, temp_workspace):
        """Test error when overlay doesn't exist."""
        temp_dir, workspace_name = temp_workspace

        with pytest.raises(ValueError, match="Overlay 'grid_99' not found"):
            preview_overlay(workspace_name, "001.png", "grid_99", workspaces_root=temp_dir)


class TestBatchCropWorkspace:
    """Tests for batch_crop_workspace function."""

    @pytest.fixture
    def temp_workspace_multi(self):
        """Create workspace with multiple screenshots and overlays."""
        temp_dir = Path(tempfile.mkdtemp())
        workspace_name = "multi_workspace"
        workspace_path = temp_dir / workspace_name

        # Create workspace structure
        workspace_path.mkdir(parents=True)
        screenshots_dir = workspace_path / "screenshots"
        screenshots_dir.mkdir()

        # Create 2 test screenshots
        test_image_1 = Image.fromarray(create_test_image(400, 400, (255, 0, 0)))
        test_image_1.save(screenshots_dir / "001.png")

        test_image_2 = Image.fromarray(create_test_image(400, 400, (0, 255, 0)))
        test_image_2.save(screenshots_dir / "002.png")

        # Create workspace.json with 2 screenshots, 1 grid bound to both
        workspace_data = WorkspaceMetadata(
            workspace_name=workspace_name,
            created_at=datetime.now().isoformat(),
            schema_version=2,
            overlays={
                "grid_1": OverlayData(
                    id="grid_1",
                    type="grid",
                    name="Shared Grid",
                    config=GridConfig(
                        start_x=50,
                        start_y=50,
                        cell_width=80,
                        cell_height=80,
                        rows=2,
                        columns=3,
                        spacing_x=10,
                        spacing_y=10,
                        crop_padding=0
                    )
                )
            },
            screenshots=[
                ScreenshotMetadata(
                    filename="001.png",
                    captured_at=datetime.now().isoformat(),
                    resolution=[400, 400],
                    overlay_bindings=["grid_1"]
                ),
                ScreenshotMetadata(
                    filename="002.png",
                    captured_at=datetime.now().isoformat(),
                    resolution=[400, 400],
                    overlay_bindings=["grid_1"]
                )
            ]
        )

        with open(workspace_path / "workspace.json", 'w', encoding='utf-8') as f:
            json.dump(workspace_data.model_dump(mode='json'), f, indent=2)

        yield temp_dir, workspace_name, workspace_path

        # Cleanup
        shutil.rmtree(temp_dir)

    def test_batch_crop_success(self, temp_workspace_multi):
        """Test successful batch cropping."""
        temp_dir, workspace_name, workspace_path = temp_workspace_multi

        results = batch_crop_workspace(workspace_name, workspaces_root=temp_dir)

        # Should have 2 entries (2 screenshots × 1 overlay each)
        assert len(results) == 2
        assert "001.png/grid_1" in results
        assert "002.png/grid_1" in results

        # Each should have 6 icons (2 rows × 3 cols)
        assert len(results["001.png/grid_1"]) == 6
        assert len(results["002.png/grid_1"]) == 6

        # Verify files were actually created
        cropped_dir = workspace_path / "cropped"
        assert (cropped_dir / "001.png" / "grid_1" / "001.png").exists()
        assert (cropped_dir / "001.png" / "grid_1" / "006.png").exists()
        assert (cropped_dir / "002.png" / "grid_1" / "001.png").exists()


def test_get_crop_statistics(temp_workspace):
    """Test crop statistics calculation."""
    temp_dir, workspace_name = temp_workspace

    stats = get_crop_statistics(workspace_name, workspaces_root=temp_dir)

    assert stats["total_screenshots"] == 1
    assert stats["total_grid_bindings"] == 1
    assert stats["total_icons"] == 12  # 3 rows × 4 cols

    assert len(stats["breakdown"]) == 1
    breakdown = stats["breakdown"][0]
    assert breakdown["screenshot"] == "001.png"
    assert breakdown["overlay"] == "grid_1"
    assert breakdown["overlay_name"] == "Test Grid"
    assert breakdown["icons"] == 12
