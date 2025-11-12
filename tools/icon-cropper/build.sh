#!/bin/bash
# Build script for Stella Sora Screenshot Cropper
#
# Prerequisites:
#   - Python 3.10+ installed
#   - Virtual environment activated
#   - PyInstaller installed (in dev dependencies)
#
# Usage:
#   chmod +x build.sh
#   ./build.sh

set -e  # Exit on error

echo "========================================"
echo "Stella Sora Screenshot Cropper Builder"
echo "========================================"
echo ""

# Check if virtual environment is activated
if [[ -z "${VIRTUAL_ENV}" ]]; then
    echo "[ERROR] Virtual environment is not activated!"
    echo ""
    echo "Please activate the virtual environment first:"
    echo "  source .venv/bin/activate  # Linux/Mac"
    echo "  source .venv/Scripts/activate  # WSL"
    echo ""
    exit 1
fi

echo "[1/4] Checking dependencies..."
if ! python -c "import PyInstaller" 2>/dev/null; then
    echo "[ERROR] PyInstaller not found!"
    echo ""
    echo "Installing PyInstaller..."
    uv pip install pyinstaller
fi
echo "  ✓ PyInstaller found"

echo ""
echo "[2/4] Cleaning previous builds..."
if [ -d "build" ]; then
    rm -rf build
    echo "  ✓ Removed build/"
fi
if [ -d "dist" ]; then
    rm -rf dist
    echo "  ✓ Removed dist/"
fi

echo ""
echo "[3/4] Building executable..."
echo "  This may take 5-10 minutes..."
pyinstaller cropper.spec

echo ""
echo "[4/4] Verifying build..."
if [ -f "dist/StellaSoraCropper.exe" ] || [ -f "dist/StellaSoraCropper" ]; then
    echo "  ✓ Executable created successfully!"
    echo ""
    echo "========================================"
    echo "Build Complete!"
    echo "========================================"
    echo ""

    if [ -f "dist/StellaSoraCropper.exe" ]; then
        EXE_PATH="dist/StellaSoraCropper.exe"
    else
        EXE_PATH="dist/StellaSoraCropper"
    fi

    echo "Output: $EXE_PATH"

    # Get file size
    SIZE=$(du -h "$EXE_PATH" | cut -f1)
    echo "Size: $SIZE"
    echo ""
    echo "To run the executable:"
    echo "  $EXE_PATH"
    echo ""
    echo "Note: The executable is portable and can be copied to any Windows machine."
    echo "Make sure to include config.yaml if you modify it."
    echo ""
else
    echo "  ✗ Executable not found!"
    echo ""
    echo "[ERROR] Build completed but executable was not created."
    exit 1
fi
