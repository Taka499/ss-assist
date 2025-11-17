"""Create default workspaces for icon-cropper."""

from pathlib import Path
from editor.workspace_manager import WorkspaceManager, DEFAULT_WORKSPACE


def main():
    """Create default workspaces with configs."""
    workspaces_root = Path(__file__).parent / "workspaces"
    manager = WorkspaceManager(workspaces_root)

    # Create default workspace
    print(f"Creating {DEFAULT_WORKSPACE} workspace...")
    if not manager.workspace_exists(DEFAULT_WORKSPACE):
        manager.create_workspace(DEFAULT_WORKSPACE)
        print(f"[OK] Created {DEFAULT_WORKSPACE} workspace")
    else:
        print(f"[SKIP] {DEFAULT_WORKSPACE} workspace already exists")

    # Create item_inventory workspace
    print("Creating item_inventory workspace...")
    if not manager.workspace_exists("item_inventory"):
        manager.create_workspace("item_inventory")
        print("[OK] Created item_inventory workspace")
    else:
        print("[SKIP] item_inventory workspace already exists")

    print(f"\n[OK] Default workspaces ready!")
    print(f"Location: {workspaces_root.absolute()}")


if __name__ == "__main__":
    main()
