@echo off
REM Build script for Stella Sora Screenshot Cropper
REM
REM Prerequisites:
REM   - Python 3.10+ installed
REM   - Virtual environment activated
REM   - PyInstaller installed (in dev dependencies)
REM
REM Usage:
REM   .\build.bat

echo ========================================
echo Stella Sora Screenshot Cropper Builder
echo ========================================
echo.

REM Check if virtual environment is activated
python -c "import sys; sys.exit(0 if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix) else 1)" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Virtual environment is not activated!
    echo.
    echo Please activate the virtual environment first:
    echo   .venv\Scripts\activate
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking dependencies...
python -c "import PyInstaller" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller not found!
    echo.
    echo Installing PyInstaller...
    uv pip install pyinstaller
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install PyInstaller
        pause
        exit /b 1
    )
)
echo   ✓ PyInstaller found

echo.
echo [2/4] Cleaning previous builds...
if exist "build" (
    rmdir /s /q "build"
    echo   ✓ Removed build/
)
if exist "dist" (
    rmdir /s /q "dist"
    echo   ✓ Removed dist/
)

echo.
echo [3/4] Building executable...
echo   This may take 5-10 minutes...
pyinstaller cropper.spec
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Verifying build...
if exist "dist\StellaSoraCropper.exe" (
    echo   ✓ Executable created successfully!
    echo.
    echo ========================================
    echo Build Complete!
    echo ========================================
    echo.
    echo Output: dist\StellaSoraCropper.exe

    REM Get file size
    for %%I in ("dist\StellaSoraCropper.exe") do set size=%%~zI
    set /a sizeMB=!size! / 1048576
    echo Size: %sizeMB% MB
    echo.
    echo To run the executable:
    echo   dist\StellaSoraCropper.exe
    echo.
    echo Note: The executable is portable and can be copied to any Windows machine.
    echo Make sure to include config.yaml if you modify it.
    echo.
) else (
    echo   ✗ Executable not found!
    echo.
    echo [ERROR] Build completed but executable was not created.
    pause
    exit /b 1
)

pause
