"""Unit tests for coordinate_system.py

Tests coordinate transformation functions with various zoom/pan/scroll scenarios.
"""

import pytest
import tkinter as tk
from editor.coordinate_system import canvas_to_image_coords, image_to_canvas_coords


class TestImageToCanvasCoords:
    """Tests for image_to_canvas_coords (pure function, no tkinter dependencies)."""

    def test_no_zoom_no_pan(self):
        """Identity transform: 1x zoom, no pan offset."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 1.0, (0, 0))
        assert canvas_x == 100
        assert canvas_y == 200

    def test_2x_zoom_no_pan(self):
        """2x zoom doubles coordinates."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 2.0, (0, 0))
        assert canvas_x == 200
        assert canvas_y == 400

    def test_no_zoom_with_pan(self):
        """Pan offset adds to coordinates."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 1.0, (50, 30))
        assert canvas_x == 150
        assert canvas_y == 230

    def test_zoom_and_pan_combined(self):
        """Both zoom and pan are applied correctly."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 2.0, (50, 30))
        assert canvas_x == 250  # 100 * 2.0 + 50
        assert canvas_y == 430  # 200 * 2.0 + 30

    def test_fractional_zoom(self):
        """Fractional zoom (zoom out)."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 0.5, (0, 0))
        assert canvas_x == 50
        assert canvas_y == 100

    def test_negative_pan_offset(self):
        """Negative pan offset (scrolled left/up)."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 1.0, (-50, -30))
        assert canvas_x == 50
        assert canvas_y == 170

    def test_origin_point(self):
        """Origin (0, 0) with pan offset."""
        canvas_x, canvas_y = image_to_canvas_coords(0, 0, 2.0, (100, 100))
        assert canvas_x == 100
        assert canvas_y == 100

    def test_large_zoom(self):
        """Very large zoom (10x)."""
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 10.0, (0, 0))
        assert canvas_x == 1000
        assert canvas_y == 2000

    def test_integer_rounding(self):
        """Verify integer rounding behavior."""
        # Fractional results should be truncated to int
        canvas_x, canvas_y = image_to_canvas_coords(100, 200, 1.5, (0, 0))
        assert canvas_x == 150  # 100 * 1.5 = 150.0
        assert canvas_y == 300  # 200 * 1.5 = 300.0
        assert isinstance(canvas_x, int)
        assert isinstance(canvas_y, int)


class TestCanvasToImageCoords:
    """Tests for canvas_to_image_coords (requires tkinter Canvas mock)."""

    @pytest.fixture
    def canvas(self, mocker):
        """Create a mock Canvas that simulates canvasx/canvasy behavior."""
        mock_canvas = mocker.Mock()

        # Mock canvasx and canvasy to return input + scroll offset
        # For most tests, we use 0 scroll offset
        mock_canvas.canvasx.side_effect = lambda x: x
        mock_canvas.canvasy.side_effect = lambda y: y

        return mock_canvas

    def test_no_zoom_no_pan_no_scroll(self, canvas):
        """Identity transform: 1x zoom, no pan, no scroll."""
        img_x, img_y = canvas_to_image_coords(100, 200, 1.0, (0, 0), canvas)
        assert img_x == 100
        assert img_y == 200

    def test_2x_zoom_no_pan_no_scroll(self, canvas):
        """2x zoom halves coordinates (inverse of zoom)."""
        img_x, img_y = canvas_to_image_coords(200, 400, 2.0, (0, 0), canvas)
        assert img_x == 100
        assert img_y == 200

    def test_no_zoom_with_pan_no_scroll(self, canvas):
        """Pan offset subtracts from coordinates."""
        img_x, img_y = canvas_to_image_coords(150, 230, 1.0, (50, 30), canvas)
        assert img_x == 100
        assert img_y == 200

    def test_zoom_and_pan_combined(self, canvas):
        """Both zoom and pan are inverted correctly."""
        img_x, img_y = canvas_to_image_coords(250, 430, 2.0, (50, 30), canvas)
        assert img_x == 100  # (250 - 50) / 2.0 = 100
        assert img_y == 200  # (430 - 30) / 2.0 = 200

    def test_with_scroll_offset(self, mocker):
        """Canvas scroll position is accounted for."""
        # Create canvas with scroll offset
        mock_canvas = mocker.Mock()
        mock_canvas.canvasx.side_effect = lambda x: x + 50  # Scrolled right 50px
        mock_canvas.canvasy.side_effect = lambda y: y + 30  # Scrolled down 30px

        img_x, img_y = canvas_to_image_coords(100, 200, 1.0, (0, 0), mock_canvas)

        # With scroll offset added, coordinates should be higher
        assert img_x == 150  # 100 + 50 scroll offset
        assert img_y == 230  # 200 + 30 scroll offset

    def test_negative_pan_offset(self, canvas):
        """Negative pan offset (scrolled left/up)."""
        img_x, img_y = canvas_to_image_coords(50, 170, 1.0, (-50, -30), canvas)
        assert img_x == 100  # (50 - (-50)) / 1.0 = 100
        assert img_y == 200  # (170 - (-30)) / 1.0 = 200

    def test_fractional_zoom(self, canvas):
        """Fractional zoom (zoom out)."""
        img_x, img_y = canvas_to_image_coords(50, 100, 0.5, (0, 0), canvas)
        assert img_x == 100
        assert img_y == 200

    def test_origin_point(self, canvas):
        """Origin (0, 0) with pan offset."""
        img_x, img_y = canvas_to_image_coords(100, 100, 2.0, (100, 100), canvas)
        assert img_x == 0  # (100 - 100) / 2.0 = 0
        assert img_y == 0

    def test_large_zoom(self, canvas):
        """Very large zoom (10x) inverted correctly."""
        img_x, img_y = canvas_to_image_coords(1000, 2000, 10.0, (0, 0), canvas)
        assert img_x == 100
        assert img_y == 200

    def test_integer_rounding(self, canvas):
        """Verify integer rounding behavior."""
        # Result should always be integers
        img_x, img_y = canvas_to_image_coords(150, 300, 1.5, (0, 0), canvas)
        assert img_x == 100  # 150 / 1.5 = 100.0
        assert img_y == 200  # 300 / 1.5 = 200.0
        assert isinstance(img_x, int)
        assert isinstance(img_y, int)


class TestRoundTripConversion:
    """Test that converting image → canvas → image returns to original coordinates."""

    @pytest.fixture
    def canvas(self, mocker):
        """Create a mock Canvas with no scroll offset for roundtrip tests."""
        mock_canvas = mocker.Mock()
        mock_canvas.canvasx.side_effect = lambda x: x
        mock_canvas.canvasy.side_effect = lambda y: y
        return mock_canvas

    def test_roundtrip_no_zoom_no_pan(self, canvas):
        """Round-trip with identity transform."""
        original_x, original_y = 100, 200
        canvas_x, canvas_y = image_to_canvas_coords(original_x, original_y, 1.0, (0, 0))
        img_x, img_y = canvas_to_image_coords(canvas_x, canvas_y, 1.0, (0, 0), canvas)
        assert img_x == original_x
        assert img_y == original_y

    def test_roundtrip_with_zoom(self, canvas):
        """Round-trip with 2x zoom."""
        original_x, original_y = 100, 200
        zoom = 2.0
        pan = (0, 0)

        canvas_x, canvas_y = image_to_canvas_coords(original_x, original_y, zoom, pan)
        img_x, img_y = canvas_to_image_coords(canvas_x, canvas_y, zoom, pan, canvas)
        assert img_x == original_x
        assert img_y == original_y

    def test_roundtrip_with_pan(self, canvas):
        """Round-trip with pan offset."""
        original_x, original_y = 100, 200
        zoom = 1.0
        pan = (50, 30)

        canvas_x, canvas_y = image_to_canvas_coords(original_x, original_y, zoom, pan)
        img_x, img_y = canvas_to_image_coords(canvas_x, canvas_y, zoom, pan, canvas)
        assert img_x == original_x
        assert img_y == original_y

    def test_roundtrip_with_zoom_and_pan(self, canvas):
        """Round-trip with both zoom and pan."""
        original_x, original_y = 100, 200
        zoom = 2.5
        pan = (75, 50)

        canvas_x, canvas_y = image_to_canvas_coords(original_x, original_y, zoom, pan)
        img_x, img_y = canvas_to_image_coords(canvas_x, canvas_y, zoom, pan, canvas)
        assert img_x == original_x
        assert img_y == original_y

    def test_roundtrip_fractional_zoom(self, canvas):
        """Round-trip with fractional zoom (zoom out)."""
        original_x, original_y = 100, 200
        zoom = 0.75
        pan = (0, 0)

        canvas_x, canvas_y = image_to_canvas_coords(original_x, original_y, zoom, pan)
        img_x, img_y = canvas_to_image_coords(canvas_x, canvas_y, zoom, pan, canvas)
        assert img_x == original_x
        assert img_y == original_y

    def test_roundtrip_negative_pan(self, canvas):
        """Round-trip with negative pan offset."""
        original_x, original_y = 100, 200
        zoom = 1.5
        pan = (-50, -30)

        canvas_x, canvas_y = image_to_canvas_coords(original_x, original_y, zoom, pan)
        img_x, img_y = canvas_to_image_coords(canvas_x, canvas_y, zoom, pan, canvas)
        assert img_x == original_x
        assert img_y == original_y
