# Screenshot Cropping Tool Implementation Plan

## Overview

Create a Python-based Windows tool that captures Stella Sora client screenshots, crops character icons using config-driven grid detection, and provides a batch annotation 
GUI for assigning character IDs from CSV.

### Phase 1: Project Setup & Core Architecture

1. Create directory structure
```
tools/screenshot-cropper/
├── pyproject.toml          # Python dependencies
├── config.yaml              # Page definitions & grid layouts
├── cropper.py               # Main daemon (hotkey listener)
├── capture.py               # Window screenshot logic
├── detector.py              # OCR page detection
├── gridcrop.py              # Grid-based cropping engine
├── annotator.py             # Tkinter annotation GUI
├── csv_loader.py            # CSV validation & character data
├── utils.py                 # Helper functions
└── README.md                # Usage instructions
```
2. Define pyproject.toml
   - Pillow (image processing)
   - pywin32 (window capture)
   - keyboard (global hotkey)
   - easyocr (OCR page detection)
   - imagehash (deduplication)
   - pyyaml (config parsing)
   - pyinstaller (exe packaging)

### Phase 2: Window Capture & Page Detection

1. Implement window capture (capture.py)
   - Auto-detect "StellaSora" window by title/process
   - Fallback to manual window selection
   - Capture active window to PIL Image
2. Implement OCR page detector (detector.py)
   - Extract top-left region (where "ホーム画面設定" appears)
   - Use easyocr to recognize Japanese text
   - Match against known page types from config
   - Return page type or raise error if unknown

### Phase 3: Config-Driven Grid Cropping

1. Design config.yaml structure
```yaml
pages:
    character_select:
        ocr_match: "ホーム画面設定"
        grid:
        columns: 3
        start_x: 960
        start_y: 140
        cell_width: 150
        cell_height: 150
        spacing_x: 10
        spacing_y: 10
        output_category: "characters"
```
2. Implement grid cropper (gridcrop.py)
   - Load config for detected page type
   - Calculate grid positions
   - Crop individual icons
   - Save to temp folder: temp/{timestamp}/{page_type}/{001.png, 002.png, ...}
   - Use imagehash to skip duplicates within session

### Phase 4: Main Daemon

1. Implement hotkey daemon (cropper.py)
   - Run as system tray app (pystray)
   - Listen for F9 global hotkey
   - On trigger:
       - Capture StellaSora window
       - Detect page type via OCR
       - Crop according to config
       - Show notification: "Captured 12 icons from character_select"
   - Exit via system tray menu

### Phase 5: Annotation GUI

1. Implement batch annotator (annotator.py)
   - Tkinter GUI with:
       - File browser: Select temp session folder
       - Grid view: Show all cropped icons
       - Per-icon controls:
           - Dropdown: Character IDs from CSV (char-001, char-002, ...)
       - Hover preview: Show character name, rarity, faction from CSV
       - Checkbox: "Overwrite existing file"
       - Save button: Copy to public/assets/characters/{XXX}.png
2. Implement CSV integration (csv_loader.py)
   - Parse data-sources/stellasora - characters.csv
   - Build lookup: {char-001: {name_ja: "セイナ", rarity: "4", ...}}
   - Validation:
       - Check ID exists in CSV
       - Warn on duplicate assignments in session
       - Preview character data on hover

### Phase 6: Packaging & Documentation

1. Create .exe with PyInstaller
   - Bundle with config.yaml
   - Include easyocr models
   - Test on clean Windows machine
2. Write comprehensive README.md
   - Installation steps
   - First-time setup (configure grid positions)
   - Usage workflow
   - Troubleshooting

### Phase 7: Testing & Refinement

1. Test capture workflow
   - Verify window detection
   - Validate OCR accuracy
   - Check grid cropping precision
2. Test annotation workflow
   - CSV validation
   - Duplicate detection
   - File overwrite logic

Deliverables

- Standalone Python tool in tools/screenshot-cropper/
- Packaged .exe for Windows
- Configuration system for extensibility (future: items, memories, etc.)
- Documentation for usage and extending to new page types