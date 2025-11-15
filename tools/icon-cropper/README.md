# Screenshot Cropper Tool

A Windows-based tool for capturing and cropping character icons from the Stella Sora game client. This tool uses OCR-based page detection, grid-based cropping, and a batch annotation GUI to streamline the process of extracting game assets.

## Features

- **Automatic window capture**: Detects and captures the Stella Sora client window
- **OCR-based page detection**: Identifies the current page type to apply the correct cropping configuration
- **Grid-based cropping**: Extracts icons from a predefined grid layout
- **Perceptual deduplication**: Automatically skips duplicate icons
- **Batch annotation GUI**: Assign character IDs to cropped icons with CSV validation
- **Global hotkey**: Trigger capture with a single keypress (default: F9)
- **System tray integration**: Runs in the background with easy access

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
uv venv
uv pip install -e .
```

### 4. Activate the virtual environment

```bash
# Windows
.venv\Scripts\activate
```

## Configuration

The tool is configured via `config.yaml`. Key settings:

### Window Detection

```yaml
window:
  auto_detect: true
  title_pattern: "StellaSora"  # Window title to search for
  allow_manual_selection: true
```

### Page Types

Each page type defines:
- OCR text to match
- Grid layout (position, size, spacing)
- Output settings (target directory, filename pattern)

Example for character selection page:

```yaml
pages:
  character_select:
    ocr_match: "ホーム画面設定"
    grid:
      columns: 3
      rows: 5
      start_x: 963
      start_y: 151
      cell_width: 146
      cell_height: 146
      spacing_x: 4
      spacing_y: 4
      crop_padding: 8
    output:
      category: "characters"
      target_dir: "public/assets/characters"
      filename_pattern: "{number:03d}.png"
      csv_source: "data-sources/stellasora - characters.csv"
```

### Hotkey

```yaml
hotkey:
  key: "F9"
  modifiers: []  # Can add: ctrl, shift, alt
```

## Usage

### Workflow Overview

1. **Start the daemon** - Runs in background with system tray icon
2. **Navigate to target page** - Open Stella Sora client to the character selection page
3. **Press F9** - Captures window, detects page type, crops icons
4. **Run annotator** - Assign character IDs to cropped icons
5. **Save** - Icons are saved to `public/assets/characters/`

### Step-by-Step Guide

#### 1. Start the Daemon

```bash
# Make sure virtual environment is activated
python cropper.py
```

You should see:
```
==================================================
Screenshot Cropper Daemon
==================================================
Registering hotkey: F9
✓ Hotkey registered successfully
Creating system tray icon...

✓ Daemon is running!
Press F9 to capture the Stella Sora window
Right-click the system tray icon to quit
```

A green circle icon will appear in your system tray.

#### 2. Capture Icons

1. Open the Stella Sora Windows client
2. Navigate to the character selection page (ホーム画面設定)
3. Press **F9**

The tool will:
- Capture the window screenshot
- Detect the page type using OCR
- Crop icons based on the grid configuration
- Save to a temporary session directory (e.g., `temp/20250112_143022/`)

Output:
```
==================================================
Screenshot capture triggered!
==================================================

[1/4] Capturing Stella Sora window...
✓ Captured screenshot: 1920x1080

[2/4] Detecting page type...
Detecting text in region...
Detected text: ホーム画面設定
✓ Detected page type: character_select

[3/4] Creating session directory...
✓ Session directory: temp/20250112_143022

[4/4] Cropping icons...
✓ Cropped 12 icons

==================================================
Capture complete!
Session directory: temp/20250112_143022
Run the annotator to assign character IDs:
  python annotator.py temp/20250112_143022
==================================================
```

#### 3. Annotate Icons

Run the annotation GUI to assign character IDs:

```bash
python annotator.py temp/20250112_143022
```

The GUI will open showing:
- Grid of all cropped icons
- Dropdown to select character ID for each icon
- Character info (name, rarity, role, etc.) from CSV
- "Overwrite existing" checkbox for each icon

**To assign a character:**
1. Click the dropdown under an icon
2. Select the character ID (e.g., "char-001")
3. Character info will be displayed below the dropdown
4. Check "Overwrite existing" if you want to replace an existing file

**Validation:**
- Only character IDs from the CSV are available
- Duplicate assignments will show a warning
- Character info is displayed on selection

#### 4. Save Icons

Click **"Save All"** to copy the annotated icons to `public/assets/characters/`.

The tool will:
- Generate filenames based on character ID (e.g., `char-001` → `001.png`)
- Skip files that already exist (unless "Overwrite" is checked)
- Show a summary of saved/skipped files

### Testing Individual Components

Each module can be tested independently:

#### Test Window Capture

```bash
python capture.py
```

Creates `test_capture.png` if successful.

#### Test Page Detection

```bash
python detector.py test_capture.png
```

Detects the page type and shows detected text.

#### Test Grid Cropping

```bash
python gridcrop.py test_capture.png character_select
```

Crops icons and saves to `test_output/`.

#### Test CSV Loader

```bash
python csv_loader.py
```

Loads and displays character data from CSV.

## Configuration Guide

### Visual Configuration Editor (Recommended)

The easiest way to configure grid layouts and OCR regions is using the **visual configuration editor**:

```bash
uv run python config_editor.py
```

**Features:**
- **Workspace-Based Projects**: Each workspace is a self-contained cropping project with its own config, screenshots, and overlays
- **Multi-Screenshot Support**: Capture and manage multiple screenshots per workspace (for scrolling/paginated UIs)
- **Multi-Overlay Support**: Create multiple grids and OCR regions on each screenshot
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
5. **Draw OCR Region(s)**: Click "📄 Draw OCR Region" - can draw multiple regions
6. **Adjust**: Tool auto-switches to Select mode - resize/adjust overlays with handles
7. **Preview Icons**: Click "👁️ Preview Icons" to verify grid alignment

**Note:** All overlay configurations are automatically saved to workspace.json in real-time. There is no need for manual save/load operations.

**Tool System:**
- **Select Tool** (default): Pan, zoom, and resize existing overlays via handles
- **Draw Grid Tool**: Draw new grid overlays (auto-switches to Select when done)
- **Draw OCR Tool**: Draw new OCR regions (auto-switches to Select when done)

**Keyboard Shortcuts:**
- `Ctrl+O`: Open screenshot from file
- `Ctrl+G`: Capture screenshot from game window
- `Ctrl+P`: Preview extracted icons
- `Ctrl+Scroll`: Zoom in/out

**Tips:**
- Create separate workspaces for different game UIs (character_select, item_inventory, etc.)
- Use multiple screenshots in one workspace for scrolling UIs
- Select tool is always active after drawing - handles appear automatically
- Adjust spinbox values for fine-tuning (works in any mode)
- Preview extracted icons to verify grid alignment
- Workspaces are stored in `workspaces/` - can be zipped and shared

### Adjusting Grid Positions Manually

If you prefer to edit config.yaml manually or the cropped icons are misaligned:

1. Take a test screenshot:
   ```bash
   python capture.py
   ```

2. Open `test_capture.png` in an image editor (e.g., Paint, GIMP)

3. Measure the coordinates:
   - **start_x, start_y**: Top-left corner of the first icon
   - **cell_width, cell_height**: Size of each icon (including border)
   - **spacing_x, spacing_y**: Gap between icons
   - **crop_padding**: Pixels to remove from each edge (to exclude borders)

4. Update `config.yaml`:
   ```yaml
   grid:
     start_x: 963     # Adjust these values
     start_y: 151
     cell_width: 146
     cell_height: 146
     spacing_x: 4
     spacing_y: 4
     crop_padding: 8
   ```

5. Test the cropping:
   ```bash
   python gridcrop.py test_capture.png character_select
   ```

6. Check the output in `test_output/` and adjust as needed.

### Adding New Page Types

To support additional pages (e.g., item inventory):

1. Capture a screenshot of the new page
2. Identify the OCR text that uniquely identifies this page
3. Measure the grid layout
4. Add a new page configuration in `config.yaml`:

```yaml
pages:
  item_inventory:
    ocr_match: "アイテム一覧"
    ocr_alternatives:
      - "アイテム"
    grid:
      columns: 4
      rows: 3
      start_x: 800
      start_y: 200
      cell_width: 100
      cell_height: 100
      spacing_x: 10
      spacing_y: 10
      crop_padding: 5
    output:
      category: "items"
      target_dir: "public/assets/items"
      filename_pattern: "item_{number:03d}.png"
      csv_source: "data-sources/stellasora - items.csv"
```

## Troubleshooting

### Window Not Found

**Error:** `Could not find window matching 'StellaSora'`

**Solution:**
- Ensure the Stella Sora client is running
- Check if the window title contains "StellaSora"
- Adjust `title_pattern` in `config.yaml` if needed

### OCR Detection Fails

**Error:** `Unknown page type. Detected text: '...'`

**Solution:**
- Check the detected text in the error message
- Add it to `ocr_alternatives` in `config.yaml`
- Adjust `detection_region` if the text is in a different location
- Verify OCR is detecting Japanese text correctly

### Icons Misaligned

**Problem:** Cropped icons are offset or cut off

**Solution:**
- Follow the "Adjusting Grid Positions" guide above
- Use `crop_padding` to trim icon borders
- Test with `python gridcrop.py test_capture.png character_select`

### Hotkey Not Working

**Problem:** F9 doesn't trigger capture

**Solution:**
- Ensure no other application is using F9
- Try a different hotkey in `config.yaml`
- Run as administrator if permission issues occur

### EasyOCR Loading Slowly

**Note:** First run will download OCR models (~100MB), which takes time.

**Solution:**
- Be patient during first initialization
- Models are cached for subsequent runs

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
├── config.yaml          # DEPRECATED: Now used as template only
├── config_template.yaml # Template for new workspace configs
├── pyproject.toml       # Python dependencies
├── uv.lock              # Locked dependency versions
│
├── cropper.py           # Main daemon
├── capture.py           # Window capture
├── detector.py          # OCR page detection
├── gridcrop.py          # Grid-based cropping
├── csv_loader.py        # CSV validation
├── annotator.py         # Annotation GUI
├── config_editor.py     # Configuration editor GUI (main app)
├── utils.py             # Utility functions
│
├── editor/              # Configuration editor modules
│   ├── __init__.py      # Package initialization
│   ├── config_template.py    # Workspace config template utilities
│   ├── workspace_manager.py  # Workspace directory and metadata management
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
│   │   ├── config.yaml       # Workspace-specific configuration
│   │   ├── workspace.json    # Metadata (selected screenshot, timestamps)
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
- **workspace_manager.py**: Manages workspace directories, screenshots, and metadata (workspace.json)
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
- **Temporary**: `temp/YYYYMMDD_HHMMSS/` (for annotation)
- **Final**: `public/assets/characters/` (after annotation)

Filename format: `{number}.png` where number is extracted from character ID.
- `char-001` → `001.png`
- `char-025` → `025.png`

## License

This tool is part of the ss-assist project. See the main repository for license information.

## Support

For issues or questions:
1. Check this README first
2. Review the configuration in `config.yaml`
3. Test individual components to isolate the problem
4. Open an issue in the main repository
