"""Utility functions for the screenshot cropper tool."""

import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
import yaml


def get_project_root() -> Path:
    """Get the project root directory (ss-assist/)."""
    # This script is in tools/icon-cropper/
    return Path(__file__).parent.parent.parent


def load_config() -> Dict[str, Any]:
    """Load configuration from config.yaml."""
    config_path = Path(__file__).parent / "config.yaml"

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    return config


def ensure_directory(path: Path) -> None:
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)


def get_temp_session_dir(config: Dict[str, Any]) -> Path:
    """Create and return a new temporary session directory."""
    project_root = get_project_root()
    temp_dir = project_root / config['temp']['directory']

    # Create session folder with timestamp
    session_format = config['temp']['session_format']
    session_name = datetime.now().strftime(session_format)
    session_dir = temp_dir / session_name

    ensure_directory(session_dir)

    return session_dir


def extract_character_number(char_id: str) -> str:
    """Extract the number portion from a character ID.

    Args:
        char_id: Character ID in format 'char-XXX' (e.g., 'char-001')

    Returns:
        The number portion as a string (e.g., '001')

    Raises:
        ValueError: If the character ID format is invalid
    """
    if not char_id.startswith('char-'):
        raise ValueError(f"Invalid character ID format: {char_id}")

    number = char_id.split('-')[1]

    if not number.isdigit():
        raise ValueError(f"Invalid character ID format: {char_id}")

    return number


def format_filename(pattern: str, char_id: str) -> str:
    """Format a filename using the pattern and character ID.

    Args:
        pattern: Filename pattern (e.g., '{number:03d}.png')
        char_id: Character ID (e.g., 'char-001')

    Returns:
        Formatted filename (e.g., '001.png')
    """
    number = extract_character_number(char_id)
    return pattern.format(number=int(number))


def is_windows() -> bool:
    """Check if running on Windows."""
    return sys.platform == 'win32'


def validate_windows() -> None:
    """Validate that the script is running on Windows."""
    if not is_windows():
        raise RuntimeError(
            "This tool is designed for Windows only. "
            f"Current platform: {sys.platform}"
        )
