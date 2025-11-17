#!/usr/bin/env python3
"""Generate JSON Schema for workspace.json validation.

This script generates a JSON Schema file from the Pydantic models,
which can be used for:
- IDE autocomplete and validation in VSCode/PyCharm
- Documentation of the workspace.json format
- External validation tools

Usage:
    uv run python scripts/generate_json_schema.py

Outputs:
    workspace-schema.json - JSON Schema for workspace.json files
"""

import json
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from editor.schema import generate_json_schema


def main():
    """Generate and save JSON Schema for workspace.json."""
    # Generate schema
    print("Generating JSON Schema from Pydantic models...")
    schema = generate_json_schema()

    # Add additional metadata
    schema["$schema"] = "http://json-schema.org/draft-07/schema#"
    schema["title"] = "Icon Cropper Workspace Metadata"
    schema["description"] = (
        "Schema for workspace.json files in the icon-cropper tool. "
        "Defines workspace-level overlays (grid layouts and OCR regions) "
        "and screenshot metadata with overlay bindings."
    )

    # Determine output path (root of icon-cropper project)
    output_path = Path(__file__).parent.parent / "workspace-schema.json"

    # Save schema
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)

    print(f"[OK] JSON Schema saved to: {output_path}")
    print(f"     File size: {output_path.stat().st_size:,} bytes")
    print()
    print("You can now use this schema in your IDE:")
    print("  VSCode: Add to settings.json:")
    print('    "json.schemas": [')
    print('      {')
    print('        "fileMatch": ["**/workspaces/**/workspace.json"],')
    print(f'        "url": "./{output_path.name}"')
    print('      }')
    print('    ]')
    print()
    print("  Or add to workspace.json:")
    print(f'    "$schema": "./{output_path.name}"')


if __name__ == "__main__":
    main()
