"""Icon extraction API based on workspace.json overlays.

This module provides functions for extracting icons from screenshots using
grid overlay configurations. It integrates with the workspace.json schema
and Pydantic validation system.
"""

from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np
from PIL import Image
import json
from editor.schema import WorkspaceMetadata, GridConfig


def crop_grid(image: np.ndarray, grid_config: GridConfig) -> List[np.ndarray]:
    """Extract icon cells from image using grid configuration.

    Args:
        image: Input image as numpy array (H, W, C)
        grid_config: Validated GridConfig Pydantic model with grid parameters

    Returns:
        List of cropped cell images as numpy arrays, ordered left-to-right,
        top-to-bottom

    Example:
        >>> image = np.array(Image.open("screenshot.png"))
        >>> config = GridConfig(start_x=100, start_y=200, cell_width=80,
        ...                     cell_height=80, rows=5, columns=4)
        >>> icons = crop_grid(image, config)
        >>> len(icons)
        20
    """
    icons = []

    # Extract grid parameters from Pydantic model
    start_x = grid_config.start_x
    start_y = grid_config.start_y
    cell_w = grid_config.cell_width
    cell_h = grid_config.cell_height
    spacing_x = grid_config.spacing_x
    spacing_y = grid_config.spacing_y
    rows = grid_config.rows
    cols = grid_config.columns

    # Crop padding (removes from cell edges - single value for all sides)
    crop_padding = grid_config.crop_padding

    img_height, img_width = image.shape[:2]

    for row in range(rows):
        for col in range(cols):
            # Calculate cell position (top-left corner)
            x = start_x + col * (cell_w + spacing_x)
            y = start_y + row * (cell_h + spacing_y)

            # Apply crop padding (shrinks cell by removing edges)
            x1 = max(0, x + crop_padding)
            y1 = max(0, y + crop_padding)
            x2 = min(img_width, x + cell_w - crop_padding)
            y2 = min(img_height, y + cell_h - crop_padding)

            # Crop cell (numpy slicing: [y:y+h, x:x+w])
            cell = image[y1:y2, x1:x2]
            icons.append(cell)

    return icons


def preview_overlay(
    workspace_name: str,
    screenshot_filename: str,
    overlay_id: str,
    workspaces_root: Path = Path("workspaces")
) -> List[Image.Image]:
    """Preview cropped icons for a single overlay on a screenshot.

    Args:
        workspace_name: Name of workspace
        screenshot_filename: Screenshot filename (e.g., "001.png")
        overlay_id: Overlay ID (e.g., "grid_1")
        workspaces_root: Root directory containing workspaces

    Returns:
        List of cropped icons as PIL Images

    Raises:
        FileNotFoundError: If workspace or screenshot doesn't exist
        ValueError: If overlay not found or is not a grid overlay
        ValidationError: If workspace.json has invalid schema

    Example:
        >>> icons = preview_overlay("character_select", "001.png", "grid_1")
        >>> icons[0].save("preview_icon_0.png")
    """
    workspace_path = workspaces_root / workspace_name
    screenshot_path = workspace_path / "screenshots" / screenshot_filename
    metadata_path = workspace_path / "workspace.json"

    if not metadata_path.exists():
        raise FileNotFoundError(f"Workspace '{workspace_name}' not found at {workspace_path}")

    if not screenshot_path.exists():
        raise FileNotFoundError(f"Screenshot '{screenshot_filename}' not found at {screenshot_path}")

    # Load and validate workspace.json with Pydantic
    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    workspace = WorkspaceMetadata.model_validate(data)

    # Get overlay config
    if overlay_id not in workspace.overlays:
        raise ValueError(
            f"Overlay '{overlay_id}' not found in workspace. "
            f"Available overlays: {', '.join(workspace.overlays.keys())}"
        )

    overlay = workspace.overlays[overlay_id]

    if overlay.type != 'grid':
        raise ValueError(
            f"Overlay '{overlay_id}' has type '{overlay.type}', expected 'grid'. "
            f"Only grid overlays can be cropped."
        )

    # Load image
    image = Image.open(screenshot_path)
    image_array = np.array(image)

    # Crop icons (config is already a GridConfig Pydantic model)
    icon_arrays = crop_grid(image_array, overlay.config)

    # Convert back to PIL Images
    return [Image.fromarray(arr) for arr in icon_arrays]


def batch_crop_workspace(
    workspace_name: str,
    output_base: str = "cropped",
    workspaces_root: Path = Path("workspaces")
) -> Dict[str, List[str]]:
    """Batch crop all screenshots in workspace based on overlay bindings.

    This function processes all screenshots in a workspace, extracting icons
    from each screenshot using the grid overlays bound to it. Icons are saved
    to organized subdirectories.

    Args:
        workspace_name: Name of workspace to process
        output_base: Base directory name for cropped output (within workspace)
        workspaces_root: Root directory containing workspaces

    Returns:
        Dict mapping "screenshot/overlay" to list of output paths.
        Example:
        {
            "001.png/grid_1": ["cropped/001.png/grid_1/001.png", ...],
            "002.png/grid_1": ["cropped/002.png/grid_1/001.png", ...]
        }

    Raises:
        FileNotFoundError: If workspace doesn't exist
        ValidationError: If workspace.json has invalid schema

    Example:
        >>> results = batch_crop_workspace("character_select")
        >>> print(f"Extracted {sum(len(v) for v in results.values())} icons")
        Extracted 60 icons
    """
    workspace_path = workspaces_root / workspace_name
    metadata_path = workspace_path / "workspace.json"
    output_root = workspace_path / output_base

    if not metadata_path.exists():
        raise FileNotFoundError(f"Workspace '{workspace_name}' not found at {workspace_path}")

    # Load and validate workspace.json with Pydantic
    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    workspace = WorkspaceMetadata.model_validate(data)

    results = {}
    total_icons_extracted = 0

    # Process each screenshot
    for screenshot in workspace.screenshots:
        screenshot_filename = screenshot.filename
        screenshot_path = workspace_path / "screenshots" / screenshot_filename

        if not screenshot_path.exists():
            print(f"Warning: Screenshot '{screenshot_filename}' not found, skipping")
            continue

        # Load image once for all overlays
        image = Image.open(screenshot_path)
        image_array = np.array(image)

        # Process each bound overlay
        for overlay_id in screenshot.overlay_bindings:
            if overlay_id not in workspace.overlays:
                print(f"Warning: Overlay '{overlay_id}' not found, skipping")
                continue

            overlay = workspace.overlays[overlay_id]

            if overlay.type != 'grid':
                print(f"Info: Skipping non-grid overlay '{overlay_id}' (type: {overlay.type})")
                continue

            # Crop icons
            icon_arrays = crop_grid(image_array, overlay.config)

            # Save icons to organized directory structure
            output_dir = output_root / screenshot_filename / overlay_id
            output_dir.mkdir(parents=True, exist_ok=True)

            output_paths = []
            for i, icon_array in enumerate(icon_arrays, start=1):
                output_path = output_dir / f"{i:03d}.png"
                icon_image = Image.fromarray(icon_array)
                icon_image.save(output_path)
                output_paths.append(str(output_path.relative_to(workspace_path)))

            results[f"{screenshot_filename}/{overlay_id}"] = output_paths
            total_icons_extracted += len(icon_arrays)
            print(f"[OK] Extracted {len(icon_arrays)} icons from {screenshot_filename}/{overlay_id}")

    print(f"\n[SUCCESS] Batch crop complete: {total_icons_extracted} total icons extracted")
    return results


def get_crop_statistics(workspace_name: str, workspaces_root: Path = Path("workspaces")) -> Dict:
    """Get statistics about what will be cropped without actually cropping.

    Useful for preview/confirmation dialogs before running batch crop.

    Args:
        workspace_name: Name of workspace
        workspaces_root: Root directory containing workspaces

    Returns:
        Dict with statistics:
        {
            "total_screenshots": 3,
            "total_grid_bindings": 5,
            "total_icons": 150,
            "breakdown": [
                {"screenshot": "001.png", "overlay": "grid_1", "icons": 50},
                ...
            ]
        }
    """
    workspace_path = workspaces_root / workspace_name
    metadata_path = workspace_path / "workspace.json"

    if not metadata_path.exists():
        raise FileNotFoundError(f"Workspace '{workspace_name}' not found")

    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    workspace = WorkspaceMetadata.model_validate(data)

    breakdown = []
    total_icons = 0
    total_grid_bindings = 0

    for screenshot in workspace.screenshots:
        for overlay_id in screenshot.overlay_bindings:
            if overlay_id not in workspace.overlays:
                continue

            overlay = workspace.overlays[overlay_id]

            if overlay.type != 'grid':
                continue

            # Calculate icon count
            grid_config = overlay.config
            icon_count = grid_config.rows * grid_config.columns

            breakdown.append({
                "screenshot": screenshot.filename,
                "overlay": overlay_id,
                "overlay_name": overlay.name,
                "icons": icon_count
            })

            total_icons += icon_count
            total_grid_bindings += 1

    return {
        "total_screenshots": len(workspace.screenshots),
        "total_grid_bindings": total_grid_bindings,
        "total_icons": total_icons,
        "breakdown": breakdown
    }
