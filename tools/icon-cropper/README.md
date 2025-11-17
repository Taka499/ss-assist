# Screenshot Cropper Tool

A Windows-based GUI tool for capturing and cropping character icons from the Stella Sora game client. This workspace-centric application provides visual grid overlay editing, multi-screenshot support, and batch cropping capabilities.

## Features

- **Workspace-based projects**: Self-contained workspaces with independent configurations
- **Visual grid editor**: Click-and-drag interface for defining icon grid layouts
- **Multi-screenshot support**: Handle scrolling/paginated UIs with multiple screenshots per workspace
- **Multi-overlay support**: Create and manage multiple grids and regions per workspace
- **Batch cropping**: Extract icons from all screenshots with one click
- **Icon annotation**: Assign names to cropped icons with CSV import support
- **Real-time preview**: See grid alignment and extracted icons before saving
- **Schema validation**: Pydantic-based validation ensures configuration integrity

## Requirements

- **Windows OS** (tested on Windows 10/11)
- **Python 3.13+**
- **uv** package manager
- **Stella Sora Windows client**

## Installation

### 1. Install uv (if not already installed)

```bash
# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. Navigate to the tool directory

```bash
cd tools/icon-cropper
```

### 3. Create virtual environment and install dependencies

```bash
# Using uv
uv sync
```

## Getting Started

The tool uses a workspace-centric approach where each workspace is a self-contained project with its own screenshots, grid overlays, and configuration.

### Quick Start

```bash
# 1. Navigate to the tool directory
cd tools/icon-cropper

# 2. Launch the GUI
uv run python config_editor.py

# 3. Create a workspace (or select existing)
# 4. Capture/load screenshots
# 5. Draw grid overlays visually
# 6. Batch crop and annotate icons
```

## Usage

### Workflow Overview

The workspace-based workflow consists of the following steps:

1. **Create/Select Workspace** - Each workspace is a self-contained project
2. **Capture/Load Screenshots** - Add multiple screenshots for scrolling UIs
3. **Draw Grid Overlays** - Visually define icon grid layouts
4. **Preview Icons** - Verify grid alignment before batch cropping
5. **Batch Crop** - Extract all icons from all screenshots at once
6. **Annotate Icons** - Assign names to cropped icons
7. **Export** - Save icons with proper filenames to output directory

### Step-by-Step Guide

#### 1. Launch the GUI

```bash
uv run python config_editor.py
```

#### 2. Create or Select Workspace

- Use the workspace dropdown to select an existing workspace, or
- Click the **[+]** button to create a new workspace
- Each workspace is stored in `workspaces/{workspace_name}/`

#### 3. Add Screenshots

**Option A: Capture from game**
1. Open the Stella Sora game client
2. Click **"📷 Capture Screenshot"** (or press `Ctrl+G`)
3. The tool captures the game window automatically

**Option B: Load from file**
1. Click **"📂 Open Screenshot"** (or press `Ctrl+O`)
2. Select a screenshot file from your computer

You can add multiple screenshots to handle scrolling/paginated UIs.

#### 4. Draw Grid Overlay

1. Click **"🔲 Draw Grid Layout"** button
2. Click to set the start position (top-left of first icon)
3. Drag to define cell size (the tool shows a preview cell)
4. Release to complete the grid
5. Adjust parameters in the right panel:
   - **Columns/Rows**: Number of icons in grid
   - **Spacing**: Gap between icons
   - **Crop Padding**: Pixels to trim from edges

The tool automatically switches to Select mode where you can:
- Resize the grid using handles (8 handles: corners + edges)
- Hold **Shift** while resizing to maintain aspect ratio
- Hold **Ctrl** while resizing to resize from center

#### 5. Preview Icons

1. Click **"👁️ Preview Icons"** (or press `Ctrl+P`)
2. A preview window shows all extracted icons
3. Verify the grid alignment is correct
4. Close the preview and adjust the grid if needed

#### 6. Batch Crop All Screenshots

1. Click **Tools → "✂️ Batch Crop All..."** (or press `Ctrl+B`)
2. A preview dialog shows:
   - Total screenshots, grid bindings, and icons to extract
   - Breakdown table of what will be cropped
   - Preview of the first 9 icons
3. Click **"Proceed with Batch Crop"** to extract all icons
4. Icons are saved to `workspaces/{workspace}/cropped/{screenshot}/{overlay}/`

#### 7. Annotate Icons

1. Click **"🏷️ Annotate Icons"** (or press `Ctrl+A`)
2. Choose input mode:
   - **Manual Input**: Type names one per line, click "Load Names"
   - **CSV Import**: Import CSV file, select column with names
3. Assign names to each icon using dropdowns
4. Select output directory
5. Click **"Save"** to export icons with proper filenames

**Validation:**
- Ensures all icons are assigned names
- Warns about duplicate assignments
- Confirms overwrite for existing files

## Advanced Features

### Visual Configuration Editor

The tool provides a comprehensive visual editor for configuring grid layouts:

```bash
uv run python config_editor.py
```

**Features:**
- **Workspace-Based Projects**: Each workspace is a self-contained cropping project with its own config, screenshots, and overlays
- **Multi-Screenshot Support**: Capture and manage multiple screenshots per workspace (for scrolling/paginated UIs)
- **Multi-Overlay Support**: Create multiple grids and OCR regions, bind them to screenshots
- **Batch Cropping**: Extract icons from all screenshots with one click, organized by screenshot and overlay
- **Crop Preview**: See statistics and icon samples before running batch crop
- **Select Tools to Edit**: Select tool (pan/zoom/resize), Draw Grid tool, Draw OCR tool
- **Visual Grid Editor**: Click and drag to define icon grid layouts
- **OCR Region Editor**: Draw rectangles around page-identifying text
- **Live Preview**: See extracted icons before saving
- **Interactive Resize**: PowerPoint-like handles with modifier keys (Shift: aspect ratio, Ctrl: center-fixed)
- **Real-time Updates**: Changes reflect immediately on the canvas
- **Automatic Backup**: Creates timestamped backups before saving
- **Portable Workspaces**: Each workspace can be zipped, shared, or archived independently

**Workspace-Centric Workflow:**
1. **Select Workspace**: Choose from dropdown or click [+] to create new workspace
2. **Capture Screenshots**: Click "📷 Capture Screenshot" - can capture multiple for scrolling UIs
3. **Select Screenshot**: Click screenshots in the sidebar list to switch between them
4. **Draw Grid(s)**: Click "🔲 Draw Grid Layout" - can draw multiple grids if needed
5. **Bind Overlays**: Use "Apply" checkboxes in the unified overlay list to bind grids to screenshots
6. **Draw OCR Region(s)**: Click "📄 Draw OCR Region" - can draw multiple regions (optional)
7. **Adjust**: Tool auto-switches to Select mode - resize/adjust overlays with handles
8. **Preview Icons**: Click "👁️ Preview Icons" to verify grid alignment
9. **Batch Crop**: Click Tools → "✂️ Batch Crop All..." (Ctrl+B) to extract all icons

**Note:** All overlay configurations are automatically saved to workspace.json in real-time with validation. There is no need for manual save/load operations.

**Schema Validation:**
The tool uses Pydantic models to validate workspace.json on every load and save, ensuring data integrity:
- **Grid configurations**: Validates positive dimensions, reasonable row/column limits (≤100)
- **OCR regions**: Ensures width/height consistency
- **Overlay references**: Prevents dangling references in screenshot bindings
- **Timestamps**: Validates ISO 8601 format
- **Schema version**: Enforces schema v2 structure

If validation fails, you'll see a user-friendly error message indicating exactly which field is invalid and why. This prevents corrupt configurations from breaking the cropping workflow.

**Tool System:**
- **Select Tool** (default): Pan, zoom, and resize existing overlays via handles
- **Draw Grid Tool**: Draw new grid overlays (auto-switches to Select when done)
- **Draw OCR Tool**: Draw new OCR regions (auto-switches to Select when done)

**Keyboard Shortcuts:**
- `Ctrl+O`: Open screenshot from file
- `Ctrl+G`: Capture screenshot from game window
- `Ctrl+P`: Preview extracted icons
- `Ctrl+B`: Batch crop all screenshots
- `Ctrl+Scroll`: Zoom in/out

**Batch Cropping Workflow:**

The batch crop feature allows you to extract icons from multiple screenshots at once:

1. **Setup**: Create overlays (grids) and bind them to screenshots using the checkboxes
2. **Preview**: Click Tools → "✂️ Batch Crop All..." to see:
   - Total screenshots, grid bindings, and icons to extract
   - Breakdown table showing what will be cropped
   - Preview of the first 9 icons
3. **Execute**: Click "Proceed with Batch Crop" to extract all icons
4. **Output**: Icons are saved to `workspaces/{workspace_name}/cropped/` organized by:
   ```
   cropped/
   ├── 001.png/          # Screenshot folder
   │   └── grid_1/       # Overlay folder
   │       ├── 001.png   # First icon
   │       ├── 002.png   # Second icon
   │       └── ...
   └── 002.png/
       └── grid_1/
           └── ...
   ```

**Use Case Example:**
- Capture 3 screenshots of a scrolling character list
- Draw one grid overlay for the character grid layout
- Bind the same grid to all 3 screenshots (using checkboxes)
- Run batch crop → extracts all characters from all screenshots automatically

**Unified Overlay List:**

The tool uses a single unified overlay list that shows ALL workspace overlays:

```
Overlays (3 overlays in workspace)

○ 🔲 Grid 1          [☑ Apply]  🗑️ Delete  🔒 Lock
● 📄 OCR Region 1    [☑ Apply]  🗑️ Delete  🔒 Lock
○ 🔲 Grid 2          [☐ Apply]  🗑️ Delete  🔒 Lock
```

- **Radio button (○/●)**: Select overlay to edit (shows parameter panel)
- **Apply checkbox**: Bind/unbind overlay to current screenshot
  - Checked = overlay visible on canvas
  - Unchecked = overlay exists in workspace but hidden
  - Switching screenshots updates checkbox state automatically
- **Delete button**: Permanently removes overlay from workspace
  - Shows confirmation dialog listing affected screenshots
  - Cannot delete locked overlays
- **Lock button**: Toggle lock state (prevents editing)

**Key Behaviors:**
- Overlays exist at workspace level (shared across screenshots)
- Bindings are screenshot-specific (each screenshot has its own set)
- Deleting removes overlay from workspace AND all screenshot bindings
- Creating overlay in screenshot A makes it available (but not bound) in screenshot B

**Tips:**
- Create separate workspaces for different game UIs (character_select, item_inventory, etc.)
- Use multiple screenshots in one workspace for scrolling UIs
- Bind the same grid overlay to multiple screenshots to avoid duplicating grid configs
- Select tool is always active after drawing - handles appear automatically
- Adjust spinbox values for fine-tuning (works in any mode)
- Preview extracted icons to verify grid alignment before batch cropping
- Workspaces are stored in `workspaces/` - can be zipped and shared

### Keyboard Shortcuts

- `Ctrl+O`: Open screenshot from file
- `Ctrl+G`: Capture screenshot from game window
- `Ctrl+P`: Preview extracted icons
- `Ctrl+B`: Batch crop all screenshots
- `Ctrl+A`: Annotate icons
- `Ctrl+Scroll`: Zoom in/out on canvas

## Development Tools

### JSON Schema for IDE Autocomplete

The tool includes a JSON Schema file (`workspace-schema.json`) generated from the Pydantic models. To enable IDE autocomplete and validation in VSCode:

**Option 1: Workspace settings**
Add to `.vscode/settings.json`:
```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/workspaces/**/workspace.json"],
      "url": "./tools/icon-cropper/workspace-schema.json"
    }
  ]
}
```

**Option 2: Inline schema reference**
Add to the top of any `workspace.json`:
```json
{
  "$schema": "../../workspace-schema.json",
  "workspace_name": "character_select",
  ...
}
```

This provides autocomplete, validation, and inline documentation while editing workspace.json files.

### Regenerating JSON Schema

After updating Pydantic models in `editor/schema/`:

```bash
cd tools/icon-cropper
uv run python scripts/generate_json_schema.py
```

This regenerates `workspace-schema.json` with the latest model definitions.

### Running Tests

The tool includes comprehensive tests for workspace validation:

```bash
# Run all tests
uv run pytest

# Run schema validation tests only
uv run pytest tests/test_workspace_schema.py -v

# Run with coverage
uv run pytest --cov=editor --cov-report=term-missing
```

The test suite includes 26+ tests covering:
- Valid configuration acceptance
- Invalid data rejection with proper error messages
- Edge cases (zero dimensions, empty workspaces)
- Cross-field validation (overlay references)
- Round-trip serialization

## Troubleshooting

### Workspace Validation Errors

**Error:** `Workspace validation failed: overlays → grid_1 → config → cell_width: Input should be greater than 0`

**Solution:**
- The error message indicates exactly which field is invalid
- Open the workspace.json file and fix the invalid value
- Or delete the workspace and recreate it in the GUI
- Check `workspace-schema.json` for valid value ranges

**Error:** `Screenshot 'foo.png' references non-existent overlay 'grid_99'`

**Solution:**
- The screenshot's `overlay_bindings` array references an overlay that doesn't exist
- Remove the invalid overlay ID from the bindings array
- Or create the missing overlay in the GUI

### Window Not Found

**Error:** `Could not find window matching 'StellaSora'`

**Solution:**
- Ensure the Stella Sora client is running
- Check if the window title contains "StellaSora"
- The window must not be minimized

### Icons Misaligned

**Problem:** Cropped icons are offset or cut off

**Solution:**
- Use the visual grid editor to adjust grid position
- Adjust **Crop Padding** to trim icon borders
- Use **Preview Icons** to verify alignment before batch cropping
- Resize the grid using handles with Shift/Ctrl modifiers

### Grid Not Visible on Canvas

**Problem:** Grid overlay disappears or doesn't show

**Solution:**
- Ensure the overlay is bound to the current screenshot (check "Apply" checkbox)
- Select the overlay in the overlay list to show parameter panel
- Check if overlay is locked (unlock it to edit)

## Building an Executable

To create a standalone `.exe` file for distribution:

### Quick Build (Recommended)

```bash
# Windows (Command Prompt)
build.bat

# Windows (WSL) or Linux
chmod +x build.sh
./build.sh
```

The build scripts will:
1. Check dependencies and install PyInstaller if needed
2. Clean previous builds
3. Build the executable using the optimized `.spec` file
4. Verify the output

### Manual Build

If you prefer to build manually:

```bash
# Install PyInstaller (dev dependency)
uv pip install pyinstaller

# Build using the spec file (includes config and EasyOCR models)
pyinstaller cropper.spec

# The .exe will be in dist/StellaSoraCropper.exe
```

### Build Configuration

The build is configured via `cropper.spec`, which includes:
- **Bundled resources**: `config.yaml` and EasyOCR models
- **Hidden imports**: All Windows API and OCR dependencies
- **Compression**: UPX compression (~30% size reduction)
- **Windowed mode**: No console window (GUI only)
- **Version info**: Embedded Windows executable metadata

### Output

- **Location**: `dist/StellaSoraCropper.exe`
- **Size**: ~200-300MB (due to PyTorch, EasyOCR, OpenCV)
- **Portable**: Can be copied to any Windows 10/11 machine
- **No installation required**: Standalone executable

### Build Options

To create a folder-based distribution (faster startup, larger folder):

1. Edit `cropper.spec` and uncomment the `COLLECT` section at the bottom
2. Comment out the `exe = EXE(...)` single-file configuration
3. Run `pyinstaller cropper.spec`
4. Output will be in `dist/StellaSoraCropper/` folder

### Troubleshooting Build Issues

**Problem: "ModuleNotFoundError" during build**
- Ensure all dependencies are installed: `uv sync`
- Check `hidden_imports` in `cropper.spec`

**Problem: Executable crashes on startup**
- Run with console enabled to see errors: Set `console=True` in `cropper.spec`
- Check that `config.yaml` is bundled: Verify `added_files` in `.spec`

**Problem: EasyOCR models not found**
- Models should be auto-bundled via `collect_data_files('easyocr')`
- If missing, manually add to `datas` in `cropper.spec`

**Note:** The executable will be large (~200-300MB) due to bundled dependencies (EasyOCR, PyTorch, etc.).

## File Structure

```
icon-cropper/
├── config.yaml          # Legacy config (for reference only)
├── config_template.yaml # Template for new workspace configs
├── pyproject.toml       # Python dependencies
├── uv.lock              # Locked dependency versions
│
├── config_editor.py     # Configuration editor GUI (main app)
├── capture.py           # Window capture (used by GUI)
├── utils.py             # Utility functions
│
├── _deprecated/         # Deprecated files (old daemon workflow)
│   ├── README.md        # Deprecation explanation
│   ├── cropper.py       # Old hotkey daemon
│   ├── detector.py      # OCR page detection
│   └── gridcrop.py      # Old cropping logic
│
├── editor/              # Configuration editor modules
│   ├── __init__.py      # Package initialization
│   ├── schema/          # Pydantic models for workspace.json validation
│   │   └── __init__.py  # WorkspaceMetadata, GridConfig, OCRConfig, OverlayData, ScreenshotMetadata
│   ├── config_template.py    # Workspace config template utilities
│   ├── workspace_manager.py  # Workspace directory and metadata management (with validation)
│   ├── config_serializer.py  # YAML load/save with comment preservation
│   ├── coordinate_system.py  # Pure coordinate transformation functions
│   ├── canvas_controller.py  # Image display, zoom, pan, overlay management
│   ├── grid_renderer.py      # Grid overlay and visual feedback rendering
│   ├── grid_editor.py        # Grid editing state machine and workflow
│   ├── ocr_editor.py         # OCR region editing state machine
│   ├── resize_controller.py  # Resize handle interaction logic
│   ├── base_tool.py          # Abstract base class for tools
│   ├── tool_manager.py       # Tool selection and event delegation
│   ├── select_tool.py        # Select tool (pan/zoom/resize)
│   ├── draw_grid_tool.py     # Draw grid tool
│   ├── draw_ocr_tool.py      # Draw OCR region tool
│   └── ui_builder.py         # UI component creation (menu, sidebar, canvas)
│
├── workspaces/          # Workspace-based projects (self-contained)
│   ├── character_select/
│   │   ├── workspace.json    # Validated metadata (overlays, screenshots, schema v2)
│   │   ├── screenshots/      # Multiple screenshots for scrolling UIs
│   │   │   ├── 001.png
│   │   │   ├── 002.png
│   │   │   └── 003.png
│   │   └── cropped/          # Future: batch crop output
│   │       ├── 001/
│   │       └── 002/
│   ├── item_inventory/
│   │   ├── config.yaml
│   │   ├── workspace.json
│   │   └── screenshots/
│   └── [user_workspaces]/ # User-created workspaces
│
├── scripts/             # Utility scripts
│   └── generate_json_schema.py  # Generate JSON Schema from Pydantic models
│
├── tests/               # Test suite
│   ├── test_workspace_schema.py  # Pydantic validation tests (26 tests)
│   └── ...              # Other test modules
│
├── workspace-schema.json  # JSON Schema for IDE autocomplete
│
├── _docs/               # Design documents and ExecPlans
│   ├── PLANS.md        # ExecPlan methodology
│   └── execplan-*.md   # Phase-by-phase implementation plans
│
├── cropper.spec         # PyInstaller build configuration
├── version_info.txt     # Windows executable metadata
├── build.bat            # Windows build script
├── build.sh             # Linux/WSL build script
│
├── README.md            # This file
├── CLAUDE.md            # Development guidelines
├── .gitignore           # Git ignore rules
│
├── .venv/               # Virtual environment (created by uv)
├── temp/                # Temporary session directories (created at runtime)
│   └── YYYYMMDD_HHMMSS/ # Session folder
│       ├── full_screenshot.png
│       ├── 001.png
│       ├── 002.png
│       └── ...
│
├── build/               # PyInstaller build artifacts (gitignored)
└── dist/                # Built executable (gitignored)
    └── StellaSoraCropper.exe
```

### Configuration Editor Architecture

The `config_editor.py` GUI tool has been refactored into a workspace-centric, tool-based architecture for better maintainability and extensibility. The `editor/` package contains focused modules:

**Workspace Management:**
- **workspace_manager.py**: Manages workspace directories, screenshots, and metadata (workspace.json) with Pydantic validation
- **schema/**: Pydantic models for workspace.json validation (GridConfig, OCRConfig, OverlayData, ScreenshotMetadata, WorkspaceMetadata)
- **config_template.py**: Template utilities for creating new workspace configs
- **config_serializer.py**: YAML load/save with comment preservation and validation

**Canvas & Rendering:**
- **coordinate_system.py**: Pure functions for canvas ↔ image coordinate transformations
- **canvas_controller.py**: Manages image display, zoom (1x-10x with cursor-centered zooming), pan, and unified overlay state
- **grid_renderer.py**: Renders grid/OCR overlays, crop padding indicators, resize handles, and visual feedback

**Editing Workflows:**
- **grid_editor.py**: State machine for 3-step grid editing workflow (set start → define cell → adjust)
- **ocr_editor.py**: State machine for OCR region editing
- **resize_controller.py**: Handles 8 resize handles (4 corners + 4 edges) with modifier key support (Shift: aspect ratio, Ctrl: center-fixed)

**Tool System (Photoshop-like):**
- **base_tool.py**: Abstract base class defining tool interface
- **tool_manager.py**: Tool selection and event delegation system
- **select_tool.py**: Default tool for pan, zoom, and resizing overlays via handles
- **draw_grid_tool.py**: Tool for drawing new grid overlays (wraps GridEditor)
- **draw_ocr_tool.py**: Tool for drawing new OCR regions (wraps OCREditor)

**UI Components:**
- **ui_builder.py**: Creates all UI components (menu bar, workspace selector, screenshot list, canvas, input widgets)

The main `config_editor.py` orchestrates these modules, handling workspace switching, screenshot capture, and event routing.

**Key Architecture Patterns:**
1. **Workspace-Centric**: Each workspace is self-contained with its own config.yaml, screenshots, and metadata
2. **Tool-Based UX**: Photoshop-like tool selection instead of mode-based workflow
3. **Unified Overlay State**: CanvasController owns all visual state (overlays, zoom, pan) for automatic cleanup
4. **Multi-Overlay Support**: Extensible dict-based overlay system allows unlimited overlays per type
5. **Auto-Switch Pattern**: Drawing tools automatically switch to Select tool on completion for immediate adjustment

## Output

Cropped icons are saved to:
- **Batch crop output**: `workspaces/{workspace}/cropped/{screenshot}/{overlay}/`
  - Organized by screenshot and overlay
  - Sequential numbering: `001.png`, `002.png`, etc.
- **Annotated output**: User-selected directory (via annotation dialog)
  - Filenames match assigned names (e.g., `char-001.png`, `Seina.png`)

## License

This tool is part of the ss-assist project. See the main repository for license information.

## Support

For issues or questions:
1. Check this README first
2. Review the configuration in `config.yaml`
3. Test individual components to isolate the problem
4. Open an issue in the main repository
