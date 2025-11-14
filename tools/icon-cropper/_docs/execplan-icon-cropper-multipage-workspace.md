# Icon Cropper Multi-Page Workspace Support

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md`.

## Purpose / Big Picture

Currently, the icon-cropper config editor can only edit one page type (hardcoded to `character_select`) and overwrites screenshots every time a new capture is made (`test_capture.png`). After this change, users will be able to:

1. **Manage multiple page configurations** - Create, edit, and switch between different page types (character_select, item_inventory, mission_list, etc.) in a single session without manually editing config.yaml
2. **Build screenshot collections** - Capture multiple screenshots for the same page type to handle game UI with scrolling or pagination
3. **Organize work in workspaces** - Each page type gets its own workspace directory containing screenshots, configuration metadata, and future cropped icons
4. **Create new page configurations** - Add new page types through the GUI instead of manually editing YAML

**How to see it working:** After implementation, users launch `uv run python config_editor.py` and see a page selector dropdown at the top of the sidebar. They can select "item_inventory", capture multiple screenshots by scrolling through the game's item list, draw the grid once, and all screenshots are preserved. Switching back to "character_select" shows that page's screenshots and configuration without any loss of data. Clicking the [+] button creates a new page type with a clean workspace.

## Progress

- [ ] Create workspace directory structure and management module
- [ ] Implement workspace.json metadata schema
- [ ] Add page selector dropdown UI with [+] create button
- [ ] Add screenshot list widget (scrollable, radio button selection)
- [ ] Update capture workflow to save numbered screenshots to workspace
- [ ] Implement screenshot selection (click to display on canvas)
- [ ] Implement delete screenshot with safety checks
- [ ] Create "New Page" dialog with validation
- [ ] Implement page switching with unsaved changes warning
- [ ] Update load_from_config() to use selected page
- [ ] Update save_config() to save to selected page in config.yaml
- [ ] Add workspace state persistence (remember last page)
- [ ] Migrate existing test_capture.png workflow to workspace model
- [ ] Test multi-page workflow end-to-end
- [ ] Test screenshot list with 5+ screenshots
- [ ] Update documentation (README, CLAUDE.md)

## Surprises & Discoveries

(To be filled during implementation)

## Decision Log

### D1: Workspace-Per-Page Architecture (2025-11-15)

**Decision:** Use a workspace directory for each page type containing all related files (screenshots, metadata, future cropped icons).

**Rationale:**
- Each page type shows different game UI, requiring different screenshots
- Screenshot list feature enables handling scrolling/pagination in game UI
- Organizing by page makes it easy to manage multiple configurations
- Prepares for future batch cropping feature (cropped icons per screenshot)
- Avoids screenshot filename conflicts between pages

**Structure:**
```
tools/icon-cropper/workspaces/
├── character_select/
│   ├── screenshots/
│   │   ├── 001.png
│   │   ├── 002.png
│   │   └── 003.png
│   ├── cropped/              # Future: batch crop output
│   │   ├── 001/
│   │   └── 002/
│   └── workspace.json        # Metadata
├── item_inventory/
│   ├── screenshots/
│   └── workspace.json
└── new_page_1/               # User-created pages
    └── ...
```

### D2: No Screenshot Preview Dialog (2025-11-15)

**Decision:** Captured screenshots display directly on the canvas without a preview dialog.

**Rationale:**
- Immediate visual feedback is faster than dialog flow
- Canvas is the primary workspace - seeing the screenshot there is most natural
- Users can immediately delete or retake if unhappy with capture
- Reduces UI complexity and clicks

### D3: Screenshot List with Radio Selection (2025-11-15)

**Decision:** Use a scrollable list widget with radio button selection in the sidebar.

**Rationale:**
- Only one screenshot can be displayed on canvas at a time
- Radio buttons make the selection model clear
- Shows all available screenshots at a glance
- Displays metadata (filename, resolution) for context
- Scrollable to handle 10+ screenshots for heavily paginated game UI

### D4: Auto-Numbered Screenshot Filenames (2025-11-15)

**Decision:** Use sequential numbering (001.png, 002.png, 003.png) instead of timestamps or user-provided names.

**Rationale:**
- Simple and predictable naming
- Easy to reference in cropped output directories
- Numbers sort naturally in file browsers
- Avoids filename collisions
- Users can add notes in workspace.json metadata if needed

### D5: Page Creation with Clone Option (2025-11-15)

**Decision:** New page dialog offers optional cloning from an existing page's grid configuration.

**Rationale:**
- Many game UIs have similar layouts (same grid, different content)
- Cloning saves time re-drawing identical grids
- Still allows creating from scratch (default empty config)
- Users can pick any existing page as a template

### D6: Preserve Overlays When Switching Screenshots (2025-11-15)

**Decision:** When user selects a different screenshot from the list, keep grid and OCR overlays visible.

**Rationale:**
- Same page configuration applies to all screenshots in the workspace
- User needs to verify grid alignment across all screenshots (especially for scrolling UI)
- Switching screenshots is primarily for verification, not configuration changes
- Grid/OCR are page-level settings, not screenshot-level

## Outcomes & Retrospective

(To be filled at completion)

## Context and Orientation

The icon-cropper GUI tool is located at `tools/icon-cropper/config_editor.py`. It provides a visual interface for configuring grid-based icon extraction from game screenshots. The tool currently:

- Loads `tools/icon-cropper/config.yaml` which contains a `pages` section with multiple page definitions
- Hardcodes all operations to the `character_select` page (see config_editor.py lines 62-63)
- Saves screenshots to `tools/icon-cropper/test_capture.png`, overwriting previous captures
- Has no UI for page selection or creation

**Key files:**
- `config_editor.py` - Main application orchestrator
- `editor/ui_builder.py` - UI component construction
- `editor/config_serializer.py` - YAML load/save with comment preservation
- `editor/canvas_controller.py` - Screenshot display management
- `capture.py` - Screenshot capture from game window
- `config.yaml` - Configuration file with pages section

**Current config.yaml structure:**
```yaml
pages:
  character_select:
    ocr_match: "ホーム画面設定"
    grid:
      columns: 3
      rows: 5
      start_x: 963
      # ... etc
    output:
      category: "characters"
      target_dir: "public/assets/characters"
```

**Terminology:**
- **Page** - A distinct UI screen in the game (character selection, item inventory, etc.)
- **Workspace** - A directory containing all files related to one page type
- **Screenshot list** - Multiple screenshots for the same page type (for scrolling/pagination)
- **Grid configuration** - The layout parameters (start position, cell size, spacing) for icon extraction
- **OCR region** - The area where page-identifying text is detected

## Plan of Work

We will refactor the config editor from a single-page, single-screenshot model to a multi-page workspace model. The work breaks into five main areas:

**1. Workspace Infrastructure** - Create a `WorkspaceManager` class that handles directory creation, metadata save/load, and file management. Each workspace will have a `screenshots/` subdirectory and a `workspace.json` file tracking the selected screenshot and capture history.

**2. UI Components** - Add a page selector dropdown and [+] button to the top of the left sidebar (above existing mode buttons). Add a screenshot list widget below the mode buttons showing all screenshots for the current page with radio button selection. Add a delete button next to the capture button.

**3. Screenshot Management** - Modify the capture workflow to save screenshots as `workspaces/{page_name}/screenshots/{001-999}.png` instead of `test_capture.png`. Implement selection logic that loads the chosen screenshot onto the canvas while preserving grid/OCR overlays.

**4. Page Switching** - Implement logic to detect unsaved changes before switching pages, load the new page's workspace, and restore the last-selected screenshot. Add a "Create New Page" dialog with name validation and optional configuration cloning.

**5. Config Integration** - Update `load_from_config()` and `save_config()` to work with the selected page instead of hardcoded `character_select`. Ensure the config.yaml `pages` section is updated correctly with per-page grid and OCR settings.

## Concrete Steps

### Step 1: Create WorkspaceManager Module

Create `tools/icon-cropper/editor/workspace_manager.py`:

```python
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

class WorkspaceManager:
    """Manages workspace directories and metadata for page configurations."""

    def __init__(self, workspaces_root: Path):
        """Initialize workspace manager.

        Args:
            workspaces_root: Root directory for all workspaces (e.g., tools/icon-cropper/workspaces)
        """
        self.workspaces_root = workspaces_root
        self.workspaces_root.mkdir(parents=True, exist_ok=True)

    def create_workspace(self, page_name: str) -> Path:
        """Create a new workspace for a page.

        Args:
            page_name: Name of the page (e.g., "character_select")

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
                "page_name": page_name,
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
            True if deleted, False if it was the last screenshot (not deleted)
        """
        workspace_path = self.get_workspace_path(page_name)
        metadata = self._load_metadata(workspace_path)

        # Don't delete last screenshot
        if len(metadata["screenshots"]) <= 1:
            return False

        # Delete file
        filepath = workspace_path / "screenshots" / filename
        if filepath.exists():
            filepath.unlink()

        # Update metadata
        metadata["screenshots"] = [s for s in metadata["screenshots"] if s["filename"] != filename]

        # If we deleted the selected screenshot, select another
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
                "page_name": workspace_path.name,
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
```

### Step 2: Add Page Selector and Screenshot List UI

Modify `tools/icon-cropper/editor/ui_builder.py` to add the new UI components. In the `create_main_layout` method, add the page selector above the mode buttons:

```python
# In ui_builder.py, inside create_main_layout():

# Page selector frame (at top of left panel)
page_frame = tk.Frame(left_panel, bg=PANEL_BG)
page_frame.pack(fill=tk.X, padx=10, pady=(10, 5))

tk.Label(page_frame, text="Page:", bg=PANEL_BG, fg=TEXT_COLOR, font=LABEL_FONT).pack(side=tk.LEFT, padx=(0, 5))

# Dropdown showing current page
self.page_var = tk.StringVar(value="character_select")
page_dropdown = ttk.Combobox(page_frame, textvariable=self.page_var, width=20, state='readonly')
page_dropdown.pack(side=tk.LEFT, padx=5)
page_dropdown.bind('<<ComboboxSelected>>', lambda e: callbacks['on_page_changed'](self.page_var.get()))

# [+] button to create new page
add_page_btn = tk.Button(
    page_frame,
    text="+",
    command=callbacks['create_new_page'],
    bg=BUTTON_BG,
    fg=BUTTON_FG,
    font=BUTTON_FONT,
    width=3
)
add_page_btn.pack(side=tk.LEFT, padx=2)

# Separator
tk.Frame(left_panel, height=2, bg=DIVIDER_COLOR).pack(fill=tk.X, padx=10, pady=5)

# Screenshot list frame
screenshot_frame = tk.LabelFrame(left_panel, text="Screenshots", bg=PANEL_BG, fg=TEXT_COLOR, font=LABEL_FONT)
screenshot_frame.pack(fill=tk.BOTH, expand=False, padx=10, pady=5)

# Scrollable screenshot list
list_canvas = tk.Canvas(screenshot_frame, bg=PANEL_BG, height=150, highlightthickness=0)
list_scrollbar = tk.Scrollbar(screenshot_frame, orient=tk.VERTICAL, command=list_canvas.yview)
list_canvas.configure(yscrollcommand=list_scrollbar.set)

list_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
list_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

screenshot_list_frame = tk.Frame(list_canvas, bg=PANEL_BG)
list_canvas.create_window((0, 0), window=screenshot_list_frame, anchor='nw')

# Store reference for updating
self.screenshot_list_frame = screenshot_list_frame
self.screenshot_list_canvas = list_canvas

# Screenshot action buttons
screenshot_btn_frame = tk.Frame(left_panel, bg=PANEL_BG)
screenshot_btn_frame.pack(fill=tk.X, padx=10, pady=5)

tk.Button(
    screenshot_btn_frame,
    text="📷 Capture",
    command=callbacks['capture_screenshot'],
    bg=BUTTON_BG,
    fg=BUTTON_FG,
    font=BUTTON_FONT
).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)

tk.Button(
    screenshot_btn_frame,
    text="🗑️ Delete",
    command=callbacks['delete_screenshot'],
    bg=BUTTON_BG,
    fg=BUTTON_FG,
    font=BUTTON_FONT
).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
```

Also add a method to update the screenshot list:

```python
def update_screenshot_list(self, screenshots: List[Dict[str, Any]], selected: Optional[str], on_select_callback):
    """Update the screenshot list widget.

    Args:
        screenshots: List of screenshot metadata dicts
        selected: Currently selected screenshot filename
        on_select_callback: Function to call when a screenshot is selected
    """
    # Clear existing widgets
    for widget in self.screenshot_list_frame.winfo_children():
        widget.destroy()

    # Create radio buttons for each screenshot
    selected_var = tk.StringVar(value=selected or "")

    for screenshot in screenshots:
        filename = screenshot["filename"]
        resolution = screenshot.get("resolution", [0, 0])

        frame = tk.Frame(self.screenshot_list_frame, bg=PANEL_BG)
        frame.pack(fill=tk.X, pady=2)

        radio = tk.Radiobutton(
            frame,
            text=f"{filename}",
            variable=selected_var,
            value=filename,
            bg=PANEL_BG,
            fg=TEXT_COLOR,
            selectcolor=BUTTON_BG,
            command=lambda f=filename: on_select_callback(f)
        )
        radio.pack(side=tk.LEFT, anchor='w')

        res_label = tk.Label(
            frame,
            text=f"{resolution[0]}×{resolution[1]}",
            bg=PANEL_BG,
            fg=SUBTLE_TEXT_COLOR,
            font=('Segoe UI', 8)
        )
        res_label.pack(side=tk.RIGHT, anchor='e')

    # Update scroll region
    self.screenshot_list_frame.update_idletasks()
    self.screenshot_list_canvas.configure(scrollregion=self.screenshot_list_canvas.bbox('all'))
```

### Step 3: Update ConfigEditorApp for Multi-Page Support

Modify `tools/icon-cropper/config_editor.py`:

**Add workspace manager and state tracking:**

```python
# In __init__:
from editor.workspace_manager import WorkspaceManager

# Initialize workspace manager
workspaces_root = Path(__file__).parent / "workspaces"
self.workspace_manager = WorkspaceManager(workspaces_root)

# Current page tracking
self.current_page = "character_select"
self.unsaved_changes = False

# Load pages from config.yaml
self.available_pages = list(self.config.get('pages', {}).keys())
```

**Update capture workflow:**

```python
def capture_screenshot(self):
    """Capture screenshot from game window and add to workspace."""
    self.update_status("Capturing screenshot...")

    try:
        # Capture using subprocess
        script_dir = Path(__file__).parent
        result = subprocess.run(
            [sys.executable, script_dir / "capture.py"],
            capture_output=True,
            text=True,
            cwd=script_dir,
            timeout=30
        )

        if result.returncode != 0:
            messagebox.showerror("Capture Failed", f"Screenshot capture failed:\n{result.stderr}")
            self.update_status("Capture failed")
            return

        # Load the captured image
        temp_path = script_dir / "test_capture.png"
        if not temp_path.exists():
            messagebox.showerror("Capture Failed", "Screenshot file not found")
            self.update_status("Capture failed")
            return

        image = Image.open(temp_path)

        # Add to workspace
        filename = self.workspace_manager.add_screenshot(self.current_page, image)

        # Update UI
        self._refresh_screenshot_list()

        # Display on canvas (workspace manager auto-selected it)
        self._load_selected_screenshot()

        self.update_status(f"Screenshot captured: {filename}")

    except subprocess.TimeoutExpired:
        messagebox.showerror("Timeout", "Screenshot capture timed out")
        self.update_status("Capture timeout")
    except Exception as e:
        messagebox.showerror("Error", f"Capture error: {e}")
        self.update_status("Capture error")
```

**Add screenshot selection and deletion:**

```python
def _refresh_screenshot_list(self):
    """Refresh the screenshot list widget."""
    screenshots = self.workspace_manager.get_screenshots(self.current_page)
    selected = self.workspace_manager.get_selected_screenshot(self.current_page)

    self.ui_builder.update_screenshot_list(
        screenshots,
        selected,
        self._on_screenshot_selected
    )

def _on_screenshot_selected(self, filename: str):
    """Handle screenshot selection from list."""
    self.workspace_manager.set_selected_screenshot(self.current_page, filename)
    self._load_selected_screenshot()

def _load_selected_screenshot(self):
    """Load the selected screenshot onto canvas."""
    selected = self.workspace_manager.get_selected_screenshot(self.current_page)
    if not selected:
        return

    screenshot_path = self.workspace_manager.get_screenshot_path(self.current_page, selected)
    if screenshot_path.exists():
        image = Image.open(screenshot_path)
        self.canvas_controller.display_image(image)

def delete_screenshot(self):
    """Delete the selected screenshot."""
    selected = self.workspace_manager.get_selected_screenshot(self.current_page)
    if not selected:
        messagebox.showinfo("No Selection", "No screenshot selected")
        return

    confirm = messagebox.askyesno(
        "Delete Screenshot",
        f"Delete {selected}?\n\nThis cannot be undone."
    )

    if confirm:
        success = self.workspace_manager.delete_screenshot(self.current_page, selected)
        if not success:
            messagebox.showerror("Cannot Delete", "Cannot delete the last screenshot")
        else:
            self._refresh_screenshot_list()
            self._load_selected_screenshot()
            self.update_status(f"Deleted {selected}")
```

**Add page switching:**

```python
def on_page_changed(self, new_page: str):
    """Handle page selector dropdown change."""
    if new_page == self.current_page:
        return

    # Check for unsaved changes
    if self.unsaved_changes:
        choice = messagebox.askyesnocancel(
            "Unsaved Changes",
            f"Save changes to '{self.current_page}' before switching?"
        )
        if choice is True:  # Yes
            self.save_config()
        elif choice is None:  # Cancel
            # Revert dropdown
            self.ui_builder.page_var.set(self.current_page)
            return
        # else: No, discard changes

    # Switch page
    self.current_page = new_page
    self.unsaved_changes = False

    # Load page configuration from config.yaml
    self._load_page_config(new_page)

    # Load screenshots from workspace
    self._refresh_screenshot_list()

    # Load selected screenshot (or clear canvas if none)
    screenshots = self.workspace_manager.get_screenshots(new_page)
    if screenshots:
        self._load_selected_screenshot()
    else:
        # No screenshots yet, offer to capture
        choice = messagebox.askquestion(
            "No Screenshots",
            f"No screenshots found for '{new_page}'.\n\nCapture now?",
            icon='question'
        )
        if choice == 'yes':
            self.capture_screenshot()
        else:
            self.canvas_controller.clear()

    self.update_status(f"Switched to page: {new_page}")

def _load_page_config(self, page_name: str):
    """Load grid and OCR configuration for a page from config.yaml."""
    page_config = self.config.get('pages', {}).get(page_name, {})

    # Load grid config
    grid = page_config.get('grid', {})
    self.grid_config.update({
        'start_x': grid.get('start_x', 0),
        'start_y': grid.get('start_y', 0),
        'cell_width': grid.get('cell_width', 100),
        'cell_height': grid.get('cell_height', 100),
        'spacing_x': grid.get('spacing_x', 0),
        'spacing_y': grid.get('spacing_y', 0),
        'columns': grid.get('columns', 3),
        'rows': grid.get('rows', 4),
        'crop_padding': grid.get('crop_padding', 0),
    })

    # Load OCR config (from global ocr section)
    # Note: OCR region is global, not per-page
    ocr_region = self.config.get('ocr', {}).get('detection_region', [0, 0, 0, 0])
    self.ocr_config.update({
        'x': ocr_region[0] if len(ocr_region) >= 1 else 0,
        'y': ocr_region[1] if len(ocr_region) >= 2 else 0,
        'width': ocr_region[2] if len(ocr_region) >= 3 else 0,
        'height': ocr_region[3] if len(ocr_region) >= 4 else 0,
    })

    # Update UI inputs
    for param, var in self.grid_inputs.items():
        if param in self.grid_config:
            var.set(self.grid_config[param])

    for param, var in self.ocr_inputs.items():
        if param in self.ocr_config:
            var.set(self.ocr_config[param])

    # Reset drawn flags
    self.grid_drawn = bool(grid)  # True if page has grid config
    self.ocr_drawn = bool(ocr_region and any(ocr_region))

    # Redraw overlays if loaded
    if self.canvas_controller.current_image:
        self.canvas_controller.redraw()
```

**Add new page creation dialog:**

```python
def create_new_page(self):
    """Show dialog to create a new page."""
    dialog = tk.Toplevel(self.root)
    dialog.title("Create New Page")
    dialog.geometry("450x250")
    dialog.transient(self.root)
    dialog.grab_set()

    # Page name input
    tk.Label(dialog, text="Page Name (lowercase with underscores):").pack(pady=5)
    name_var = tk.StringVar(value=self._generate_new_page_name())
    name_entry = tk.Entry(dialog, textvariable=name_var, width=40)
    name_entry.pack(pady=5)
    name_entry.focus()

    # Clone option
    tk.Label(dialog, text="Clone configuration from (optional):").pack(pady=5)
    clone_var = tk.StringVar(value="None")
    clone_dropdown = ttk.Combobox(dialog, textvariable=clone_var, width=37, state='readonly')
    clone_dropdown['values'] = ["None"] + self.available_pages
    clone_dropdown.pack(pady=5)

    # Buttons
    button_frame = tk.Frame(dialog)
    button_frame.pack(pady=20)

    def on_create():
        import re
        page_name = name_var.get().strip()

        # Validate
        if not page_name:
            messagebox.showerror("Invalid Name", "Page name cannot be empty", parent=dialog)
            return

        if not re.match(r'^[a-z_][a-z0-9_]*$', page_name):
            messagebox.showerror(
                "Invalid Name",
                "Page name must start with lowercase letter or underscore,\nand contain only lowercase letters, numbers, and underscores.",
                parent=dialog
            )
            return

        if page_name in self.available_pages:
            messagebox.showerror("Duplicate Name", f"Page '{page_name}' already exists", parent=dialog)
            return

        # Create workspace
        self.workspace_manager.create_workspace(page_name)

        # Create config entry
        clone_from = clone_var.get()
        if clone_from != "None":
            # Clone grid config
            source_config = self.config['pages'][clone_from].copy()
            self.config['pages'][page_name] = source_config
        else:
            # Create empty config
            self.config['pages'][page_name] = {
                'ocr_match': f"{page_name}_identifier",
                'grid': {
                    'columns': 3,
                    'rows': 4,
                    'start_x': 0,
                    'start_y': 0,
                    'cell_width': 100,
                    'cell_height': 100,
                    'spacing_x': 0,
                    'spacing_y': 0,
                    'crop_padding': 0
                },
                'output': {
                    'category': page_name,
                    'target_dir': f'output/{page_name}'
                }
            }

        # Update available pages
        self.available_pages.append(page_name)
        self.ui_builder.page_dropdown['values'] = self.available_pages

        # Switch to new page
        self.ui_builder.page_var.set(page_name)
        self.on_page_changed(page_name)

        dialog.destroy()

    tk.Button(button_frame, text="Create", command=on_create, width=15).pack(side=tk.LEFT, padx=10)
    tk.Button(button_frame, text="Cancel", command=dialog.destroy, width=15).pack(side=tk.LEFT, padx=10)

    # Enter key creates
    dialog.bind('<Return>', lambda e: on_create())
    dialog.bind('<Escape>', lambda e: dialog.destroy())

def _generate_new_page_name(self) -> str:
    """Generate a new page name like 'new_page_1'."""
    base = "new_page"
    counter = 1
    while f"{base}_{counter}" in self.available_pages:
        counter += 1
    return f"{base}_{counter}"
```

**Update save_config to use current_page:**

```python
def save_config(self):
    """Save configuration to config.yaml for the current page."""
    # Validate current screenshot loaded
    if self.canvas_controller.current_image is None:
        messagebox.showwarning("No Image", "Please load a screenshot before saving configuration")
        return

    # Get image dimensions for validation
    img_width = self.canvas_controller.current_image.width
    img_height = self.canvas_controller.current_image.height

    # Validate grid if drawn
    if self.grid_drawn:
        is_valid, error = self.config_serializer.validate_grid_config(
            self.grid_config,
            img_width,
            img_height
        )
        if not is_valid:
            messagebox.showerror("Invalid Grid Configuration", error)
            return

    # Validate OCR if drawn
    if self.ocr_drawn:
        ocr_region = [
            self.ocr_config['x'],
            self.ocr_config['y'],
            self.ocr_config['width'],
            self.ocr_config['height']
        ]
        is_valid, error = self.config_serializer.validate_ocr_region(
            ocr_region,
            img_width,
            img_height
        )
        if not is_valid:
            messagebox.showerror("Invalid OCR Region", error)
            return

    # Update config for current page
    if self.current_page not in self.config['pages']:
        self.config['pages'][self.current_page] = {}

    page_config = self.config['pages'][self.current_page]

    # Update grid
    if self.grid_drawn:
        page_config['grid'] = {
            'columns': self.grid_config['columns'],
            'rows': self.grid_config['rows'],
            'start_x': self.grid_config['start_x'],
            'start_y': self.grid_config['start_y'],
            'cell_width': self.grid_config['cell_width'],
            'cell_height': self.grid_config['cell_height'],
            'spacing_x': self.grid_config['spacing_x'],
            'spacing_y': self.grid_config['spacing_y'],
            'crop_padding': self.grid_config['crop_padding']
        }

    # Update OCR (global, but still save)
    if self.ocr_drawn:
        self.config['ocr']['detection_region'] = [
            self.ocr_config['x'],
            self.ocr_config['y'],
            self.ocr_config['width'],
            self.ocr_config['height']
        ]

    # Save to config.yaml
    success = self.config_serializer.save(self.config)

    if success:
        self.unsaved_changes = False
        messagebox.showinfo(
            "Configuration Saved",
            f"Configuration saved for page: {self.current_page}\n\n"
            f"Grid: {'Yes' if self.grid_drawn else 'No'}\n"
            f"OCR: {'Yes' if self.ocr_drawn else 'No'}"
        )
        self.update_status("Configuration saved")
    else:
        messagebox.showerror("Save Failed", "Failed to save configuration")
```

**Update load_from_config to use current_page:**

```python
def load_from_config(self):
    """Load configuration from config.yaml for the current page."""
    page_config = self.config.get('pages', {}).get(self.current_page)

    if not page_config:
        messagebox.showinfo(
            "No Configuration",
            f"No configuration found for page: {self.current_page}"
        )
        return

    loaded_items = []

    # Load grid configuration
    grid = page_config.get('grid', {})
    if grid and any(grid.values()):
        # (existing grid load logic)
        loaded_items.append("Grid layout")
        self.grid_drawn = True

    # Load OCR configuration
    ocr_region = self.config.get('ocr', {}).get('detection_region', [])
    if ocr_region and any(ocr_region):
        # (existing OCR load logic)
        loaded_items.append("OCR region")
        self.ocr_drawn = True

    if loaded_items:
        messagebox.showinfo(
            "Configuration Loaded",
            f"Loaded from page '{self.current_page}':\n\n" + "\n".join(f"• {item}" for item in loaded_items)
        )
        # Redraw overlays
        if self.canvas_controller.current_image:
            self.canvas_controller.redraw()
    else:
        messagebox.showinfo("No Configuration", f"No grid or OCR configuration found for: {self.current_page}")
```

### Step 4: Persistence and Migration

**Add workspace state persistence:**

Save the last-edited page to a preferences file:

```python
# In config_editor.py, add methods:

def _load_preferences(self):
    """Load user preferences (last page, etc.)."""
    prefs_path = Path(__file__).parent / "editor_preferences.json"
    if prefs_path.exists():
        try:
            with open(prefs_path, 'r') as f:
                prefs = json.load(f)
                return prefs
        except:
            pass
    return {"last_page": "character_select"}

def _save_preferences(self):
    """Save user preferences."""
    prefs_path = Path(__file__).parent / "editor_preferences.json"
    prefs = {
        "last_page": self.current_page
    }
    with open(prefs_path, 'w') as f:
        json.dump(prefs, f, indent=2)

# In __init__, after loading config:
prefs = self._load_preferences()
self.current_page = prefs.get("last_page", "character_select")

# In quit_app:
def quit_app(self):
    """Quit the application."""
    if self.unsaved_changes:
        choice = messagebox.askyesnocancel(
            "Unsaved Changes",
            "Save changes before quitting?"
        )
        if choice is True:
            self.save_config()
        elif choice is None:
            return  # Cancel quit

    self._save_preferences()
    self.root.quit()
```

**Migrate existing test_capture.png workflow:**

On first launch, check for existing test_capture.png and migrate to workspace:

```python
# In __init__, after workspace_manager creation:
self._migrate_legacy_screenshots()

def _migrate_legacy_screenshots(self):
    """Migrate test_capture.png to workspace if exists."""
    legacy_path = Path(__file__).parent / "test_capture.png"
    if legacy_path.exists():
        try:
            image = Image.open(legacy_path)
            # Add to character_select workspace by default
            self.workspace_manager.add_screenshot("character_select", image)
            # Rename legacy file to avoid confusion
            legacy_path.rename(legacy_path.parent / "test_capture.png.migrated")
        except Exception as e:
            print(f"Failed to migrate legacy screenshot: {e}")
```

### Step 5: Update UI Builder Return Values

Update `ui_builder.py` to return the page dropdown and screenshot list references:

```python
# In create_main_layout, return additional references:
return (left_panel, canvas, instruction_label, status_bar, grid_tab, ocr_tab,
        page_dropdown, self.page_var, self.screenshot_list_frame)

# In config_editor.py __init__:
(self.left_panel, self.canvas, self.instruction_label,
 self.status_bar, grid_tab, ocr_tab, self.page_dropdown,
 self.page_var, self.screenshot_list_frame) = ui_builder.create_main_layout()

# Store ui_builder for later use
self.ui_builder = ui_builder
```

## Validation and Acceptance

After implementation, test the multi-page workflow:

**Test 1: Create New Page**
```bash
cd tools/icon-cropper
uv run python config_editor.py
```

1. Click the [+] button next to page selector
2. Enter "test_page_1" as name
3. Select "None" for clone option
4. Click Create
5. **Expected:** Dropdown switches to "test_page_1", screenshot list is empty, canvas is clear
6. **Expected:** Directory `workspaces/test_page_1/` exists with `screenshots/` and `workspace.json`

**Test 2: Multi-Screenshot Workflow**
```bash
# With game running and on character select screen
uv run python config_editor.py
```

1. Ensure "character_select" is selected in dropdown
2. Click "📷 Capture" - screenshot 001.png appears in list and on canvas
3. Scroll game UI to show different characters
4. Click "📷 Capture" - screenshot 002.png appears in list
5. Scroll again and capture 003.png
6. **Expected:** List shows ☑ 003.png, ☐ 002.png, ☐ 001.png
7. Click on 001.png in list
8. **Expected:** Canvas shows 001.png, list shows ☑ 001.png
9. Draw grid layout
10. Click on 002.png
11. **Expected:** Canvas shows 002.png, grid overlay remains visible
12. Click on 003.png
13. **Expected:** Canvas shows 003.png, grid overlay still visible
14. Click "💾 Save Configuration"
15. **Expected:** Success message, config.yaml updated for character_select page

**Test 3: Page Switching**
1. With character_select configured (grid drawn, 3 screenshots)
2. Modify grid (change start_x)
3. Select "test_page_1" from dropdown
4. **Expected:** Dialog "Save changes to 'character_select' before switching?"
5. Click "Yes"
6. **Expected:** Config saved, switches to test_page_1 page
7. **Expected:** Canvas clears, screenshot list is empty
8. **Expected:** Dialog "No screenshots found for 'test_page_1'. Capture now?"
9. Click "Yes" and capture a screenshot
10. Draw a different grid layout
11. Switch back to "character_select"
12. **Expected:** Loads character_select screenshots, shows 001.png, grid overlay visible
13. **Expected:** Grid parameters match saved values (not test_page_1 values)

**Test 4: Delete Screenshot**
1. With character_select page having 3 screenshots
2. Select 002.png
3. Click "🗑️ Delete"
4. **Expected:** Confirmation dialog
5. Click "Yes"
6. **Expected:** 002.png removed from list, 003.png or 001.png auto-selected
7. Try to delete last screenshot
8. **Expected:** Error "Cannot delete the last screenshot"

**Test 5: Clone Configuration**
1. Click [+] to create new page
2. Enter "test_page_2"
3. Select "character_select" from clone dropdown
4. Click Create
5. **Expected:** Switches to test_page_2
6. Click "Load From Config"
7. **Expected:** Grid layout loads with same values as character_select
8. **Expected:** Can modify independently without affecting character_select

**Test 6: Persistence**
1. Configure multiple pages with screenshots
2. Close application
3. Relaunch
4. **Expected:** Last-edited page is selected in dropdown
5. **Expected:** All screenshots and configurations preserved
6. Switch between pages
7. **Expected:** All workspaces intact

All tests should pass. The config.yaml file should contain all page configurations with correct grid settings. Workspace directories should contain properly numbered screenshots and valid workspace.json metadata files.

## Idempotence and Recovery

The workspace system is designed to be safe and idempotent:

- **Multiple runs**: Can launch, capture, and configure repeatedly without data loss
- **Screenshot numbering**: Automatically finds next available number (001, 002, ...), no overwrites
- **Metadata sync**: workspace.json always reflects current screenshot list
- **Config backups**: config_serializer.py creates timestamped backups before each save
- **Last screenshot protection**: Cannot delete the only screenshot in a workspace
- **Unsaved changes**: Prompts before page switching or quitting

**Recovery scenarios:**

- **Corrupted workspace.json**: Will be recreated from directory contents on next load
- **Missing screenshots directory**: Automatically created when adding first screenshot
- **Deleted preference file**: Defaults to "character_select" page
- **Config.yaml corruption**: Existing backup system handles recovery

## Artifacts and Notes

### workspace.json Schema

```json
{
  "page_name": "character_select",
  "created_at": "2025-11-15T10:00:00Z",
  "selected_screenshot": "002.png",
  "screenshots": [
    {
      "filename": "001.png",
      "captured_at": "2025-11-15T10:05:00Z",
      "resolution": [1920, 1080],
      "notes": ""
    },
    {
      "filename": "002.png",
      "captured_at": "2025-11-15T10:10:00Z",
      "resolution": [1920, 1080],
      "notes": "After scrolling down"
    }
  ]
}
```

### UI Layout Before/After

**Before:**
```
┌────────────────────────────────────┐
│ Mode Buttons                       │
│ Screenshot Buttons (Open/Capture)  │
│ Grid/OCR Tabs                      │
│ Preview/Save Buttons               │
└────────────────────────────────────┘
```

**After:**
```
┌────────────────────────────────────┐
│ Page: [character_select ▼] [+]    │ ← NEW
│ ───────────────────────────────    │
│ Screenshots:                       │ ← NEW
│ ☑ 001.png  1920×1080              │
│ ☐ 002.png  1920×1080              │
│ ☐ 003.png  1920×1080              │
│ [📷 Capture] [🗑️ Delete]          │
│ ───────────────────────────────    │
│ Mode Buttons                       │
│ Grid/OCR Tabs                      │
│ Preview/Save Buttons               │
└────────────────────────────────────┘
```

## Interfaces and Dependencies

### WorkspaceManager API

```python
class WorkspaceManager:
    def __init__(self, workspaces_root: Path)

    # Workspace operations
    def create_workspace(self, page_name: str) -> Path
    def get_workspace_path(self, page_name: str) -> Path
    def workspace_exists(self, page_name: str) -> bool
    def list_workspaces(self) -> List[str]

    # Screenshot operations
    def add_screenshot(self, page_name: str, image: Image.Image) -> str
    def get_screenshots(self, page_name: str) -> List[Dict[str, Any]]
    def get_selected_screenshot(self, page_name: str) -> Optional[str]
    def set_selected_screenshot(self, page_name: str, filename: str)
    def delete_screenshot(self, page_name: str, filename: str) -> bool
    def get_screenshot_path(self, page_name: str, filename: str) -> Path
```

### UIBuilder Additions

```python
class UIBuilder:
    # New components
    page_var: tk.StringVar
    screenshot_list_frame: tk.Frame
    screenshot_list_canvas: tk.Canvas
    page_dropdown: ttk.Combobox

    # New method
    def update_screenshot_list(
        self,
        screenshots: List[Dict[str, Any]],
        selected: Optional[str],
        on_select_callback: Callable[[str], None]
    )
```

### ConfigEditorApp Additions

```python
class ConfigEditorApp:
    # New attributes
    workspace_manager: WorkspaceManager
    current_page: str
    available_pages: List[str]
    unsaved_changes: bool

    # New methods
    def on_page_changed(self, new_page: str)
    def create_new_page(self)
    def delete_screenshot(self)
    def _load_page_config(self, page_name: str)
    def _refresh_screenshot_list(self)
    def _on_screenshot_selected(self, filename: str)
    def _load_selected_screenshot(self)
    def _generate_new_page_name(self) -> str
    def _load_preferences(self) -> dict
    def _save_preferences(self)
    def _migrate_legacy_screenshots(self)
```

## Future Integration: Batch Cropping

The workspace structure prepares for batch cropping:

```python
# Future method in ConfigEditorApp:
def crop_all_screenshots(self):
    """Apply current grid to all screenshots and extract icons."""
    screenshots = self.workspace_manager.get_screenshots(self.current_page)

    for screenshot in screenshots:
        filename = screenshot["filename"]
        screenshot_path = self.workspace_manager.get_screenshot_path(self.current_page, filename)
        output_dir = self.workspace_manager.get_workspace_path(self.current_page) / "cropped" / filename.replace(".png", "")

        # Use existing gridcrop.py logic
        from gridcrop import extract_icons_from_grid
        extract_icons_from_grid(
            screenshot_path,
            self.grid_config,
            output_dir
        )

    messagebox.showinfo("Batch Crop Complete", f"Cropped {len(screenshots)} screenshots")
```

This will populate `workspaces/{page}/cropped/{001,002,003}/` directories with extracted icons.

---

**ExecPlan Created:** 2025-11-15
**Status:** Ready for implementation
**Estimated Effort:** 1-2 days
