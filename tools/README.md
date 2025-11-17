# Tools Directory

This directory contains standalone utilities for the ss-assist project. These tools are not part of the main application build pipeline but are used for data entry, asset management, and development workflows.

## Available Tools

### Screenshot Cropper (`icon-cropper/`)

A Windows-based tool for capturing and cropping character icons from the Stella Sora game client.

**Purpose:** Extract character icons from the game client and save them to `public/assets/characters/` for use in the web application.

**Key Features:**
- Automatic window capture with OCR-based page detection
- Config-driven grid cropping
- Batch annotation GUI with CSV validation
- Global hotkey (F9) for quick capture
- Perceptual deduplication

**Platform:** Windows only (requires game client)

**See:** `icon-cropper/README.md` for detailed usage instructions

## Tool Categories

### Asset Management
- **icon-cropper**: Extract game assets (icons, sprites) from the client

### Future Tools
- **data-validator**: Extended validation for CSV data
- **icon-optimizer**: Batch optimize icon sizes/formats
- **translation-helper**: Assist with i18n translation management

## Development Notes

**Design Principle:** Tools in this directory should be:
- Self-contained with their own dependencies
- Documented with usage instructions
- Separate from the main build pipeline (unlike `scripts/`)
- Platform-specific when necessary (Windows-only tools are acceptable)

**When to add a new tool:**
- One-time or infrequent tasks (not part of CI/CD)
- Platform-specific utilities
- GUI applications
- Tools requiring heavy dependencies (OCR, image processing)

**When to use `scripts/` instead:**
- Build pipeline tasks
- CI/CD automation
- Cross-platform utilities
- Lightweight Node.js scripts
