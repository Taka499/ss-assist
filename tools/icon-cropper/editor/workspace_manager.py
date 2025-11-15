"""Workspace management for multi-page configuration editing.

Each workspace represents one page type and contains:
- screenshots/ directory with numbered PNG files
- workspace.json metadata file
- cropped/ directory (future use)
"""

from pathlib import Path
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
from PIL import Image
from pydantic import ValidationError
from editor.overlay_model import Overlay
from editor.schema import WorkspaceMetadata

class WorkspaceManager:
    """Manages workspace directories and metadata for page configurations."""

    def __init__(self, workspaces_root: Path):
        """Initialize workspace manager.

        Args:
            workspaces_root: Root directory for all workspaces (e.g., tools/icon-cropper/workspaces)
        """
        self.workspaces_root = workspaces_root
        self.workspaces_root.mkdir(parents=True, exist_ok=True)

    def create_workspace(self, page_name: str, clone_from: str = None) -> Path:
        """Create a new workspace for a page.

        Args:
            page_name: Name of the workspace (e.g., "character_select")
            clone_from: Optional workspace name to clone config from

        Returns:
            Path to the created workspace directory
        """
        workspace_path = self.workspaces_root / page_name
        workspace_path.mkdir(parents=True, exist_ok=True)

        # Create subdirectories
        (workspace_path / "screenshots").mkdir(exist_ok=True)
        (workspace_path / "cropped").mkdir(exist_ok=True)

        # Create empty metadata if doesn't exist
        metadata_path = workspace_path / "workspace.json"
        if not metadata_path.exists():
            metadata = {
                "workspace_name": page_name,
                "created_at": datetime.now().isoformat(),
                "selected_screenshot": None,
                "schema_version": 2,
                "overlays": {},  # Workspace-level overlays (Phase 1.5)
                "screenshots": []
            }
            self._save_metadata(workspace_path, metadata)

        return workspace_path

    def get_workspace_path(self, page_name: str) -> Path:
        """Get path to a workspace, creating if it doesn't exist."""
        return self.create_workspace(page_name)

    def workspace_exists(self, page_name: str) -> bool:
        """Check if a workspace exists."""
        return (self.workspaces_root / page_name).exists()

    def list_workspaces(self) -> List[str]:
        """List all existing workspace names."""
        if not self.workspaces_root.exists():
            return []
        return [d.name for d in self.workspaces_root.iterdir() if d.is_dir()]

    def add_screenshot(self, page_name: str, image: Image.Image) -> str:
        """Add a screenshot to a workspace.

        Args:
            page_name: Name of the page
            image: PIL Image to save

        Returns:
            Filename of the saved screenshot (e.g., "001.png")
        """
        workspace_path = self.get_workspace_path(page_name)
        screenshots_dir = workspace_path / "screenshots"

        # Find next available number
        existing = list(screenshots_dir.glob("*.png"))
        if existing:
            numbers = [int(f.stem) for f in existing if f.stem.isdigit()]
            next_num = max(numbers) + 1 if numbers else 1
        else:
            next_num = 1

        # Save screenshot
        filename = f"{next_num:03d}.png"
        filepath = screenshots_dir / filename
        image.save(filepath)

        # Update metadata
        metadata = self._load_metadata(workspace_path)
        metadata["screenshots"].append({
            "filename": filename,
            "captured_at": datetime.now().isoformat(),
            "resolution": [image.width, image.height],
            "notes": "",
            "overlay_bindings": []  # Empty binding list for new screenshots (Phase 1.5)
        })
        metadata["selected_screenshot"] = filename
        self._save_metadata(workspace_path, metadata)

        return filename

    def get_screenshots(self, page_name: str) -> List[Dict[str, Any]]:
        """Get list of screenshots for a page.

        Returns:
            List of screenshot metadata dicts
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)
        return metadata.get("screenshots", [])

    def get_selected_screenshot(self, page_name: str) -> Optional[str]:
        """Get the currently selected screenshot filename."""
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)
        return metadata.get("selected_screenshot")

    def set_selected_screenshot(self, page_name: str, filename: str):
        """Set the selected screenshot."""
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)
        metadata["selected_screenshot"] = filename
        self._save_metadata(workspace_path, metadata)

    def delete_screenshot(self, page_name: str, filename: str) -> bool:
        """Delete a screenshot.

        Args:
            page_name: Name of the page
            filename: Screenshot filename to delete

        Returns:
            True if deleted, False if screenshot not found
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)

        # Find screenshot in metadata
        screenshot_found = any(s["filename"] == filename for s in metadata["screenshots"])
        if not screenshot_found:
            return False

        # Delete file
        filepath = workspace_path / "screenshots" / filename
        if filepath.exists():
            filepath.unlink()

        # Update metadata
        metadata["screenshots"] = [s for s in metadata["screenshots"] if s["filename"] != filename]

        # If we deleted the selected screenshot, select another (or None if list empty)
        if metadata["selected_screenshot"] == filename:
            metadata["selected_screenshot"] = metadata["screenshots"][-1]["filename"] if metadata["screenshots"] else None

        self._save_metadata(workspace_path, metadata)
        return True

    def get_screenshot_path(self, page_name: str, filename: str) -> Path:
        """Get full path to a screenshot file."""
        return self.workspaces_root / page_name / "screenshots" / filename

    def _load_metadata(self, workspace_path: Path) -> Dict[str, Any]:
        """Load workspace metadata from JSON file with Pydantic validation.

        Returns:
            Dictionary representation of validated WorkspaceMetadata

        Raises:
            ValueError: If validation fails (with detailed error message)
        """
        metadata_path = workspace_path / "workspace.json"
        if not metadata_path.exists():
            # Return default metadata (will be validated on save)
            return {
                "workspace_name": workspace_path.name,
                "created_at": datetime.now().isoformat(),
                "selected_screenshot": None,
                "schema_version": 2,
                "overlays": {},
                "screenshots": []
            }

        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Validate with Pydantic
            validated = WorkspaceMetadata.model_validate(data)
            return validated.model_dump()

        except ValidationError as e:
            # Format validation errors into user-friendly message
            error_msg = f"Workspace validation failed for '{workspace_path.name}':\n"
            for error in e.errors():
                location = " -> ".join(str(loc) for loc in error['loc'])
                error_msg += f"  • {location}: {error['msg']}\n"
            raise ValueError(error_msg) from e
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in workspace file '{metadata_path}': {e}") from e

    def _save_metadata(self, workspace_path: Path, metadata: Dict[str, Any]):
        """Save workspace metadata to JSON file with Pydantic validation.

        Args:
            workspace_path: Path to workspace directory
            metadata: Metadata dictionary to save

        Raises:
            ValueError: If metadata validation fails
        """
        try:
            # Validate before saving
            validated = WorkspaceMetadata.model_validate(metadata)

            # Save validated data
            metadata_path = workspace_path / "workspace.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                # Use Pydantic's JSON serialization for proper type handling
                f.write(validated.model_dump_json(indent=2, exclude_none=False))

        except ValidationError as e:
            # Format validation errors into user-friendly message
            error_msg = f"Cannot save workspace '{workspace_path.name}' - validation failed:\n"
            for error in e.errors():
                location = " -> ".join(str(loc) for loc in error['loc'])
                error_msg += f"  • {location}: {error['msg']}\n"
            raise ValueError(error_msg) from e

    # ========== Overlay Persistence Methods (Phase 1.5: Workspace-Level Overlays) ==========

    def save_workspace_overlays(self, page_name: str, overlays: Dict[str, Dict[str, Any]]):
        """Save workspace-level overlays.

        Args:
            page_name: Name of the workspace
            overlays: Dictionary mapping overlay IDs to overlay data dicts
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)
        metadata["overlays"] = overlays
        self._save_metadata(workspace_path, metadata)

    def load_workspace_overlays(self, page_name: str) -> Dict[str, Overlay]:
        """Load workspace-level overlays.

        Args:
            page_name: Name of the workspace

        Returns:
            Dictionary mapping overlay IDs to Overlay objects
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)
        overlays_data = metadata.get("overlays", {})

        # Convert dict data to Overlay objects
        return {
            overlay_id: Overlay.from_dict(overlay_data)
            for overlay_id, overlay_data in overlays_data.items()
        }

    def save_screenshot_bindings(self, page_name: str, screenshot_filename: str, overlay_ids: List[str]):
        """Save overlay bindings for a screenshot.

        Args:
            page_name: Name of the workspace
            screenshot_filename: Screenshot filename (e.g., "001.png")
            overlay_ids: List of overlay IDs bound to this screenshot
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)

        # Find the screenshot entry
        for screenshot in metadata["screenshots"]:
            if screenshot["filename"] == screenshot_filename:
                screenshot["overlay_bindings"] = overlay_ids
                break
        else:
            # Screenshot not found - this shouldn't happen but handle gracefully
            return

        self._save_metadata(workspace_path, metadata)

    def load_screenshot_bindings(self, page_name: str, screenshot_filename: str) -> List[str]:
        """Load overlay bindings for a screenshot.

        Args:
            page_name: Name of the workspace
            screenshot_filename: Screenshot filename (e.g., "001.png")

        Returns:
            List of overlay IDs bound to this screenshot
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)

        # Find the screenshot entry
        for screenshot in metadata["screenshots"]:
            if screenshot["filename"] == screenshot_filename:
                return screenshot.get("overlay_bindings", [])

        # Screenshot not found
        return []

    def get_screenshot_overlays(self, page_name: str, screenshot_filename: str) -> Dict[str, Overlay]:
        """Get overlays bound to a specific screenshot (convenience method).

        Args:
            page_name: Name of the workspace
            screenshot_filename: Screenshot filename (e.g., "001.png")

        Returns:
            Dictionary mapping overlay IDs to Overlay objects for bound overlays only
        """
        # Load workspace-level overlays
        all_overlays = self.load_workspace_overlays(page_name)

        # Load screenshot bindings
        bound_ids = self.load_screenshot_bindings(page_name, screenshot_filename)

        # Filter overlays to only those bound to this screenshot
        return {
            overlay_id: overlay
            for overlay_id, overlay in all_overlays.items()
            if overlay_id in bound_ids
        }
