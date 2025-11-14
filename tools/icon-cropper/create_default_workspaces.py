"""Create default workspaces for icon-cropper."""

from pathlib import Path
from editor.workspace_manager import WorkspaceManager


def main():
    """Create default workspaces with configs."""
    workspaces_root = Path(__file__).parent / "workspaces"
    manager = WorkspaceManager(workspaces_root)

    # Create character_select workspace
    print("Creating character_select workspace...")
    if not manager.workspace_exists("character_select"):
        manager.create_workspace("character_select")
        print("[OK] Created character_select workspace")
    else:
        print("[SKIP] character_select workspace already exists")

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
