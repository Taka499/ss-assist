"""Unit tests for preview_controller.py

Tests icon extraction and grid validation for preview.
"""

import pytest
from PIL import Image, ImageDraw
from editor.preview_controller import PreviewController


@pytest.fixture
def test_image():
    """Create a test image with a grid pattern."""
    # Create 800x600 test image
    image = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(image)

    # Draw a grid pattern for visual testing
    for i in range(0, 800, 100):
        draw.line([(i, 0), (i, 600)], fill='lightgray', width=1)
    for i in range(0, 600, 100):
        draw.line([(0, i), (800, i)], fill='lightgray', width=1)

    # Draw colored squares at cell positions (3x4 grid starting at 100,50)
    colors = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
              'orange', 'purple', 'pink', 'brown', 'gray', 'navy']

    cell_width, cell_height = 150, 120
    spacing_x, spacing_y = 10, 10
    start_x, start_y = 100, 50

    idx = 0
    for row in range(4):
        for col in range(3):
            if idx < len(colors):
                x = start_x + col * (cell_width + spacing_x)
                y = start_y + row * (cell_height + spacing_y)
                # Draw colored rectangle
                draw.rectangle(
                    [x, y, x + cell_width - 1, y + cell_height - 1],
                    fill=colors[idx],
                    outline='black'
                )
                idx += 1

    return image


@pytest.fixture
def controller():
    """Create a PreviewController instance."""
    return PreviewController()


@pytest.fixture
def valid_grid():
    """A valid grid configuration for testing."""
    return {
        'start_x': 100,
        'start_y': 50,
        'cell_width': 150,
        'cell_height': 120,
        'spacing_x': 10,
        'spacing_y': 10,
        'columns': 3,
        'rows': 4,
        'crop_padding': 5
    }


class TestExtractIcons:
    """Tests for icon extraction."""

    def test_extract_success(self, controller, test_image, valid_grid):
        """Successfully extract icons from grid."""
        icons = controller.extract_icons(test_image, valid_grid)

        # Should extract 3 columns × 4 rows = 12 icons
        assert len(icons) == 12

        # Check each icon is a tuple (image, row, col)
        for icon_data in icons:
            assert len(icon_data) == 3
            image, row, col = icon_data
            assert isinstance(image, Image.Image)
            assert isinstance(row, int)
            assert isinstance(col, int)

    def test_extract_correct_positions(self, controller, test_image, valid_grid):
        """Icons are extracted at correct grid positions."""
        icons = controller.extract_icons(test_image, valid_grid)

        # Check positions
        positions = [(row, col) for _, row, col in icons]

        expected_positions = []
        for row in range(4):
            for col in range(3):
                expected_positions.append((row, col))

        assert positions == expected_positions

    def test_extract_correct_size(self, controller, test_image, valid_grid):
        """Extracted icons have correct size after padding."""
        icons = controller.extract_icons(test_image, valid_grid)

        # With crop_padding=5, size should be:
        # cell_width - 2*padding = 150 - 10 = 140
        # cell_height - 2*padding = 120 - 10 = 110
        expected_width = 140
        expected_height = 110

        for image, _, _ in icons:
            assert image.width == expected_width
            assert image.height == expected_height

    def test_extract_no_padding(self, controller, test_image, valid_grid):
        """Extract icons without crop padding."""
        valid_grid['crop_padding'] = 0
        icons = controller.extract_icons(test_image, valid_grid)

        # Without padding, size should match cell size exactly
        for image, _, _ in icons:
            assert image.width == 150
            assert image.height == 120

    def test_extract_single_cell(self, controller, test_image):
        """Extract a single cell grid."""
        grid = {
            'start_x': 100,
            'start_y': 50,
            'cell_width': 150,
            'cell_height': 120,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 1,
            'rows': 1,
            'crop_padding': 0
        }

        icons = controller.extract_icons(test_image, grid)

        assert len(icons) == 1
        image, row, col = icons[0]
        assert row == 0
        assert col == 0
        assert image.width == 150
        assert image.height == 120

    def test_extract_with_large_spacing(self, controller, test_image):
        """Extract with large spacing between cells."""
        grid = {
            'start_x': 10,
            'start_y': 10,
            'cell_width': 50,
            'cell_height': 50,
            'spacing_x': 100,  # Large spacing
            'spacing_y': 100,
            'columns': 2,
            'rows': 2,
            'crop_padding': 0
        }

        icons = controller.extract_icons(test_image, grid)

        assert len(icons) == 4

        # Check positions are calculated correctly with spacing
        # Cell (0,0): x=10, y=10
        # Cell (0,1): x=10+50+100=160, y=10
        # Cell (1,0): x=10, y=10+50+100=160
        # Cell (1,1): x=160, y=160

    def test_extract_boundary_clipping(self, controller, test_image):
        """Icons at image boundary are clipped correctly."""
        # Grid that extends slightly beyond image bounds
        grid = {
            'start_x': 750,  # Near right edge
            'start_y': 550,  # Near bottom edge
            'cell_width': 100,
            'cell_height': 100,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 1,
            'rows': 1,
            'crop_padding': 0
        }

        icons = controller.extract_icons(test_image, grid)

        # Icon should be clipped to fit within 800x600 image
        # x: 750 to 800 (50px wide)
        # y: 550 to 600 (50px tall)
        assert len(icons) == 1
        image, _, _ = icons[0]
        assert image.width == 50
        assert image.height == 50

    def test_extract_completely_outside_bounds(self, controller, test_image):
        """Cells completely outside image bounds are skipped."""
        grid = {
            'start_x': 900,  # Beyond image width
            'start_y': 700,  # Beyond image height
            'cell_width': 50,
            'cell_height': 50,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 1,
            'rows': 1,
            'crop_padding': 0
        }

        icons = controller.extract_icons(test_image, grid)

        # No icons should be extracted
        assert len(icons) == 0

    def test_extract_with_missing_grid_params(self, controller, test_image):
        """Extract with missing grid parameters uses defaults."""
        # Minimal grid with some missing parameters
        grid = {
            'start_x': 10,
            'start_y': 10,
            'cell_width': 100,
            'cell_height': 100,
            # Missing: spacing_x, spacing_y, columns, rows, crop_padding
        }

        icons = controller.extract_icons(test_image, grid)

        # Should use defaults: columns=3, rows=4, spacing=0, padding=0
        assert len(icons) == 12  # 3 × 4


class TestValidateGridForPreview:
    """Tests for grid validation before preview."""

    def test_validate_success(self, controller, test_image, valid_grid):
        """Valid grid passes validation."""
        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is True
        assert error is None

    def test_validate_no_image(self, controller, valid_grid):
        """Validation fails if no image loaded."""
        is_valid, error = controller.validate_grid_for_preview(None, valid_grid)

        assert is_valid is False
        assert error is not None
        assert 'no image' in error.lower()

    def test_validate_zero_cell_width(self, controller, test_image, valid_grid):
        """Validation fails with zero cell width."""
        valid_grid['cell_width'] = 0

        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is False
        assert error is not None
        assert 'positive' in error.lower()

    def test_validate_negative_cell_height(self, controller, test_image, valid_grid):
        """Validation fails with negative cell height."""
        valid_grid['cell_height'] = -50

        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is False
        assert error is not None
        assert 'positive' in error.lower()

    def test_validate_zero_columns(self, controller, test_image, valid_grid):
        """Validation fails with zero columns."""
        valid_grid['columns'] = 0

        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is False
        assert error is not None
        assert 'at least 1' in error.lower()

    def test_validate_negative_rows(self, controller, test_image, valid_grid):
        """Validation fails with negative rows."""
        valid_grid['rows'] = -1

        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is False
        assert error is not None

    def test_validate_grid_exceeds_width(self, controller, test_image, valid_grid):
        """Validation fails if grid exceeds image width."""
        valid_grid['columns'] = 10  # Grid will extend far beyond 800px

        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is False
        assert error is not None
        assert 'width' in error.lower()

    def test_validate_grid_exceeds_height(self, controller, test_image, valid_grid):
        """Validation fails if grid exceeds image height."""
        valid_grid['rows'] = 20  # Grid will extend far beyond 600px

        is_valid, error = controller.validate_grid_for_preview(test_image, valid_grid)

        assert is_valid is False
        assert error is not None
        assert 'height' in error.lower()

    def test_validate_grid_at_exact_bounds(self, controller, test_image):
        """Validation succeeds if grid exactly fits image bounds."""
        # Grid that exactly fits 800x600 image
        grid = {
            'start_x': 0,
            'start_y': 0,
            'cell_width': 800,
            'cell_height': 600,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 1,
            'rows': 1,
            'crop_padding': 0
        }

        is_valid, error = controller.validate_grid_for_preview(test_image, grid)

        assert is_valid is True
        assert error is None

    def test_validate_with_spacing(self, controller, test_image):
        """Validation accounts for spacing between cells."""
        # 2x2 grid with spacing
        grid = {
            'start_x': 0,
            'start_y': 0,
            'cell_width': 390,
            'cell_height': 290,
            'spacing_x': 20,  # Spacing adds to total width
            'spacing_y': 20,  # Spacing adds to total height
            'columns': 2,
            'rows': 2,
            'crop_padding': 0
        }

        # Total width: 390 + 20 + 390 = 800 (fits exactly)
        # Total height: 290 + 20 + 290 = 600 (fits exactly)

        is_valid, error = controller.validate_grid_for_preview(test_image, grid)

        assert is_valid is True
        assert error is None

    def test_validate_missing_grid_params(self, controller, test_image):
        """Validation handles missing grid parameters gracefully."""
        # Completely empty grid
        grid = {}

        is_valid, error = controller.validate_grid_for_preview(test_image, grid)

        # Should fail due to zero/missing dimensions
        assert is_valid is False
        assert error is not None


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_extract_large_padding(self, controller, test_image):
        """Extract with padding that nearly eliminates the icon."""
        grid = {
            'start_x': 100,
            'start_y': 50,
            'cell_width': 50,
            'cell_height': 50,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 1,
            'rows': 1,
            'crop_padding': 20  # Leaves only 10x10px
        }

        icons = controller.extract_icons(test_image, grid)

        assert len(icons) == 1
        image, _, _ = icons[0]
        assert image.width == 10
        assert image.height == 10

    def test_extract_padding_equals_half_cell(self, controller, test_image):
        """Extract with padding equal to half cell size (results in 0x0)."""
        grid = {
            'start_x': 100,
            'start_y': 50,
            'cell_width': 50,
            'cell_height': 50,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 1,
            'rows': 1,
            'crop_padding': 25  # Leaves 0x0px (crop_x2 == crop_x1)
        }

        icons = controller.extract_icons(test_image, grid)

        # Cell with 0 size should be skipped
        assert len(icons) == 0

    def test_extract_very_large_grid(self, controller):
        """Extract from a very large grid (stress test)."""
        # Create larger test image
        large_image = Image.new('RGB', (2000, 2000), color='white')

        grid = {
            'start_x': 0,
            'start_y': 0,
            'cell_width': 100,
            'cell_height': 100,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 20,
            'rows': 20,
            'crop_padding': 0
        }

        icons = controller.extract_icons(large_image, grid)

        # Should extract 20 × 20 = 400 icons
        assert len(icons) == 400

    def test_extract_float_coordinates(self, controller, test_image):
        """Extract with float coordinates (should be handled gracefully)."""
        grid = {
            'start_x': 100.5,
            'start_y': 50.7,
            'cell_width': 150.3,
            'cell_height': 120.8,
            'spacing_x': 10.2,
            'spacing_y': 10.1,
            'columns': 2,
            'rows': 2,
            'crop_padding': 5.5
        }

        # Should not crash, coordinates will be used as-is or converted to int
        icons = controller.extract_icons(test_image, grid)

        assert len(icons) == 4
