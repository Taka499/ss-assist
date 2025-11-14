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
from ruamel.yaml import YAML
from editor.config_template import create_workspace_config

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

        # Create config.yaml from template (if doesn't exist)
        config_path = workspace_path / "config.yaml"
        if not config_path.exists():
            clone_from_path = None
            if clone_from:
                clone_from_path = self.workspaces_root / clone_from / "config.yaml"

            config = create_workspace_config(page_name, clone_from_path)

            yaml = YAML()
            yaml.default_flow_style = False
            with open(config_path, 'w', encoding='utf-8') as f:
                yaml.dump(config, f)

        # Create empty metadata if doesn't exist
        metadata_path = workspace_path / "workspace.json"
        if not metadata_path.exists():
            metadata = {
                "workspace_name": page_name,
                "created_at": datetime.now().isoformat(),
                "selected_screenshot": None,
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
            "notes": ""
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
        """Load workspace metadata from JSON file."""
        metadata_path = workspace_path / "workspace.json"
        if not metadata_path.exists():
            return {
                "workspace_name": workspace_path.name,
                "created_at": datetime.now().isoformat(),
                "selected_screenshot": None,
                "screenshots": []
            }

        with open(metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_metadata(self, workspace_path: Path, metadata: Dict[str, Any]):
        """Save workspace metadata to JSON file."""
        metadata_path = workspace_path / "workspace.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
