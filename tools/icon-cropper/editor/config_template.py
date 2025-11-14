"""Config template utilities for workspace creation."""

from pathlib import Path
from typing import Dict, Any
from ruamel.yaml import YAML


def load_template() -> Dict[str, Any]:
    """Load the config template.

    Returns:
        Template config dict
    """
    yaml = YAML()
    template_path = Path(__file__).parent.parent / "config_template.yaml"
    with open(template_path, 'r', encoding='utf-8') as f:
        return yaml.load(f)


def create_workspace_config(workspace_name: str, clone_from_path: Path = None) -> Dict[str, Any]:
    """Create a new workspace config.

    Args:
        workspace_name: Name of the workspace
        clone_from_path: Optional path to existing workspace config to clone

    Returns:
        Config dict ready to save
    """
    yaml = YAML()

    if clone_from_path and clone_from_path.exists():
        # Clone existing workspace config
        with open(clone_from_path, 'r', encoding='utf-8') as f:
            config = yaml.load(f)
        # Update workspace-specific fields
        config['workspace_name'] = workspace_name
        config['output']['category'] = workspace_name
        config['output']['target_dir'] = f'output/{workspace_name}'
        return config
    else:
        # Create from template
        config = load_template()
        # Replace placeholders
        config['workspace_name'] = workspace_name
        config['ocr_match'] = f"{workspace_name}_identifier"
        config['output']['category'] = workspace_name
        config['output']['target_dir'] = f'output/{workspace_name}'
        return config
