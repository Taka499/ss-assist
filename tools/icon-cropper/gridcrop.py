"""Grid-based icon cropping engine."""

from typing import List, Tuple, Dict, Any
from pathlib import Path
from PIL import Image
import imagehash


class GridCropper:
    """Crops icons from a screenshot based on grid layout."""

    def __init__(self, grid_config: Dict[str, Any], dedup_config: Dict[str, Any]):
        """Initialize the grid cropper.

        Args:
            grid_config: Grid layout configuration
            dedup_config: Deduplication configuration
        """
        self.grid = grid_config
        self.dedup = dedup_config
        self.seen_hashes = set()

    def calculate_grid_positions(self) -> List[Tuple[int, int, int, int]]:
        """Calculate the positions of all grid cells.

        Returns:
            List of tuples (x1, y1, x2, y2) for each cell
        """
        positions = []

        columns = self.grid['columns']
        rows = self.grid['rows']
        start_x = self.grid['start_x']
        start_y = self.grid['start_y']
        cell_width = self.grid['cell_width']
        cell_height = self.grid['cell_height']
        spacing_x = self.grid['spacing_x']
        spacing_y = self.grid['spacing_y']
        crop_padding = self.grid.get('crop_padding', 0)

        for row in range(rows):
            for col in range(columns):
                # Calculate top-left corner of cell
                x1 = start_x + col * (cell_width + spacing_x)
                y1 = start_y + row * (cell_height + spacing_y)

                # Apply inner padding (to remove borders)
                x1 += crop_padding
                y1 += crop_padding

                # Calculate bottom-right corner
                x2 = x1 + cell_width - (2 * crop_padding)
                y2 = y1 + cell_height - (2 * crop_padding)

                positions.append((x1, y1, x2, y2))

        return positions

    def is_empty_cell(self, cell_image: Image.Image, threshold: float = 0.95) -> bool:
        """Check if a cell is empty (blank or uniform color).

        Args:
            cell_image: Image of the cell
            threshold: Similarity threshold for uniformity (0-1)

        Returns:
            True if cell appears empty, False otherwise
        """
        # Get the extrema (min, max) for each color channel
        extrema = cell_image.convert("RGB").getextrema()

        # Check if all channels are nearly uniform
        for min_val, max_val in extrema:
            diff = max_val - min_val
            if diff > 255 * (1 - threshold):
                # Significant variation, not empty
                return False

        return True

    def is_duplicate(self, cell_image: Image.Image) -> bool:
        """Check if a cell image is a duplicate using perceptual hashing.

        Args:
            cell_image: Image to check

        Returns:
            True if duplicate, False if unique
        """
        if not self.dedup['enabled']:
            return False

        # Compute perceptual hash
        img_hash = imagehash.dhash(cell_image)

        # Check against seen hashes
        threshold = self.dedup['threshold']

        for seen_hash in self.seen_hashes:
            distance = img_hash - seen_hash
            if distance <= threshold:
                return True

        # Not a duplicate, add to seen hashes
        self.seen_hashes.add(img_hash)
        return False

    def crop_icons(self, screenshot: Image.Image) -> List[Image.Image]:
        """Crop all icons from the screenshot.

        Args:
            screenshot: Full window screenshot

        Returns:
            List of cropped icon images (non-empty, non-duplicate)
        """
        positions = self.calculate_grid_positions()
        cropped_icons = []

        for i, (x1, y1, x2, y2) in enumerate(positions):
            # Crop the cell
            cell = screenshot.crop((x1, y1, x2, y2))

            # Check if empty
            if self.is_empty_cell(cell):
                continue

            # Check if duplicate
            if self.is_duplicate(cell):
                print(f"Skipping duplicate icon at position {i}")
                continue

            cropped_icons.append(cell)

        return cropped_icons

    def save_icons(self, icons: List[Image.Image], output_dir: Path) -> List[Path]:
        """Save cropped icons to a directory.

        Args:
            icons: List of cropped icon images
            output_dir: Directory to save icons

        Returns:
            List of saved file paths
        """
        output_dir.mkdir(parents=True, exist_ok=True)

        saved_paths = []

        for i, icon in enumerate(icons):
            filename = f"{i+1:03d}.png"
            filepath = output_dir / filename
            icon.save(filepath)
            saved_paths.append(filepath)

        return saved_paths


def crop_page(
    screenshot: Image.Image,
    page_type: str,
    config: Dict[str, Any],
    output_dir: Path
) -> List[Path]:
    """Crop icons from a screenshot based on page type.

    Args:
        screenshot: Full window screenshot
        page_type: Detected page type (e.g., 'character_select')
        config: Configuration dictionary
        output_dir: Directory to save cropped icons

    Returns:
        List of saved file paths

    Raises:
        ValueError: If page type not found in configuration
    """
    if page_type not in config['pages']:
        raise ValueError(f"Unknown page type: {page_type}")

    page_config = config['pages'][page_type]
    grid_config = page_config['grid']
    dedup_config = config['deduplication']

    # Create cropper
    cropper = GridCropper(grid_config, dedup_config)

    # Crop icons
    print(f"Cropping icons from page type: {page_type}")
    icons = cropper.crop_icons(screenshot)
    print(f"Found {len(icons)} unique icons")

    # Save icons
    saved_paths = cropper.save_icons(icons, output_dir)
    print(f"Saved {len(saved_paths)} icons to: {output_dir}")

    return saved_paths


if __name__ == "__main__":
    # Test the grid cropper
    import sys
    from utils import load_config

    if len(sys.argv) < 3:
        print("Usage: python gridcrop.py <screenshot.png> <page_type>")
        print("Example: python gridcrop.py test_capture.png character_select")
        sys.exit(1)

    screenshot_path = sys.argv[1]
    page_type = sys.argv[2]

    print(f"Loading screenshot: {screenshot_path}")
    screenshot = Image.open(screenshot_path)

    config = load_config()
    output_dir = Path("test_output")

    try:
        saved_paths = crop_page(screenshot, page_type, config, output_dir)
        print(f"\nSuccess! Cropped {len(saved_paths)} icons")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
