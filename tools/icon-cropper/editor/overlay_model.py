"""Data model for overlays (grid layouts and OCR regions).

Each overlay represents a single grid layout or OCR region that can be
displayed on a screenshot. Overlays are managed independently and can be
locked to prevent accidental modification or deletion.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional


@dataclass
class Overlay:
    """Represents a single overlay (grid or OCR region) on a screenshot.

    Attributes:
        id: Unique identifier (e.g., "grid_1", "ocr_1")
        type: Overlay type - either "grid" or "ocr"
        name: Display name shown in UI (e.g., "Grid 1", "OCR Region 1")
        config: Configuration data for this overlay (dict with type-specific fields)
        locked: If True, prevents deletion and modification
        visible: If True, overlay is rendered on canvas
    """

    id: str
    type: str  # "grid" or "ocr"
    name: str
    config: Dict[str, Any]
    locked: bool = False
    visible: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert overlay to dictionary for serialization.

        Returns:
            Dictionary representation suitable for JSON/YAML serialization
        """
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Overlay':
        """Create overlay from dictionary (deserialization).

        Args:
            data: Dictionary with overlay data

        Returns:
            New Overlay instance
        """
        return cls(**data)

    def is_grid(self) -> bool:
        """Check if this is a grid overlay."""
        return self.type == "grid"

    def is_ocr(self) -> bool:
        """Check if this is an OCR overlay."""
        return self.type == "ocr"

    def toggle_lock(self):
        """Toggle the locked state."""
        self.locked = not self.locked

    def toggle_visibility(self):
        """Toggle the visible state."""
        self.visible = not self.visible


class OverlayManager:
    """Manages multiple overlays for a screenshot.

    Provides methods to add, remove, and query overlays, as well as
    auto-generate unique IDs and names.
    """

    def __init__(self):
        """Initialize empty overlay manager."""
        self.overlays: Dict[str, Overlay] = {}  # id → Overlay

    def add_overlay(self, overlay: Overlay):
        """Add an overlay to the manager.

        Args:
            overlay: Overlay to add
        """
        self.overlays[overlay.id] = overlay

    def remove_overlay(self, overlay_id: str) -> Optional[Overlay]:
        """Remove an overlay by ID.

        Args:
            overlay_id: ID of overlay to remove

        Returns:
            Removed overlay, or None if not found
        """
        return self.overlays.pop(overlay_id, None)

    def get_overlay(self, overlay_id: str) -> Optional[Overlay]:
        """Get an overlay by ID.

        Args:
            overlay_id: ID of overlay to retrieve

        Returns:
            Overlay instance, or None if not found
        """
        return self.overlays.get(overlay_id)

    def get_all_overlays(self) -> list[Overlay]:
        """Get all overlays as a list.

        Returns:
            List of all overlays
        """
        return list(self.overlays.values())

    def get_visible_overlays(self) -> list[Overlay]:
        """Get only visible overlays.

        Returns:
            List of visible overlays
        """
        return [o for o in self.overlays.values() if o.visible]

    def get_overlays_by_type(self, overlay_type: str) -> list[Overlay]:
        """Get all overlays of a specific type.

        Args:
            overlay_type: "grid" or "ocr"

        Returns:
            List of overlays matching the type
        """
        return [o for o in self.overlays.values() if o.type == overlay_type]

    def generate_overlay_id(self, overlay_type: str) -> str:
        """Generate a unique overlay ID.

        Args:
            overlay_type: "grid" or "ocr"

        Returns:
            Unique ID like "grid_1", "grid_2", "ocr_1", etc.
        """
        existing_ids = [
            o.id for o in self.get_overlays_by_type(overlay_type)
        ]

        # Extract numbers from existing IDs
        numbers = []
        for id_str in existing_ids:
            parts = id_str.split('_')
            if len(parts) == 2 and parts[1].isdigit():
                numbers.append(int(parts[1]))

        # Find next available number
        next_num = max(numbers) + 1 if numbers else 1
        return f"{overlay_type}_{next_num}"

    def generate_overlay_name(self, overlay_type: str) -> str:
        """Generate a display name for a new overlay.

        Args:
            overlay_type: "grid" or "ocr"

        Returns:
            Display name like "Grid 1", "Grid 2", "OCR Region 1", etc.
        """
        count = len(self.get_overlays_by_type(overlay_type)) + 1

        if overlay_type == "grid":
            return f"Grid {count}"
        elif overlay_type == "ocr":
            return f"OCR Region {count}"
        else:
            return f"{overlay_type.capitalize()} {count}"

    def clear(self):
        """Remove all overlays."""
        self.overlays.clear()

    def to_dict(self) -> Dict[str, Dict[str, Any]]:
        """Convert all overlays to dictionary for serialization.

        Returns:
            Dictionary mapping overlay IDs to overlay data
        """
        return {
            overlay_id: overlay.to_dict()
            for overlay_id, overlay in self.overlays.items()
        }

    def from_dict(self, data: Dict[str, Dict[str, Any]]):
        """Load overlays from dictionary (deserialization).

        Args:
            data: Dictionary mapping overlay IDs to overlay data
        """
        self.overlays.clear()
        for overlay_id, overlay_data in data.items():
            overlay = Overlay.from_dict(overlay_data)
            self.overlays[overlay_id] = overlay
