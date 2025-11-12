# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Stella Sora Screenshot Cropper

Build instructions:
    pyinstaller cropper.spec

Output:
    dist/StellaSoraCropper.exe (standalone executable)

Notes:
    - Bundles config.yaml and EasyOCR models
    - Creates a windowed application (no console window)
    - Includes all necessary dependencies
    - Final .exe size: ~200-300MB due to PyTorch/EasyOCR
"""

from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import os
from pathlib import Path

block_cipher = None

# Collect EasyOCR data files (models, character sets)
easyocr_datas = collect_data_files('easyocr')

# Collect additional data files
added_files = [
    ('config.yaml', '.'),  # Bundle config.yaml in root of executable
]

# Hidden imports that PyInstaller might miss
hidden_imports = [
    # Windows API
    'win32gui',
    'win32ui',
    'win32con',
    'win32api',
    'win32file',
    'win32timezone',
    'pywintypes',

    # EasyOCR dependencies
    'easyocr',
    'easyocr.config',
    'easyocr.detection',
    'easyocr.recognition',
    'easyocr.utils',

    # PIL/Pillow
    'PIL',
    'PIL._imagingtk',
    'PIL._tkinter_finder',

    # Other dependencies
    'imagehash',
    'keyboard',
    'plyer',
    'plyer.platforms.win.notification',
    'pystray',
    'pystray._win32',
    'yaml',

    # Tkinter (for annotator)
    'tkinter',
    'tkinter.filedialog',
    'tkinter.messagebox',
    'tkinter.ttk',
]

# Collect all submodules for problematic packages
hidden_imports += collect_submodules('easyocr')
hidden_imports += collect_submodules('plyer')

a = Analysis(
    ['cropper.py'],
    pathex=[],
    binaries=[],
    datas=added_files + easyocr_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unnecessary packages to reduce size
        'matplotlib',
        'scipy.spatial.transform._rotation_groups',
        'scipy.spatial.transform._rotation',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='StellaSoraCropper',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Compress with UPX (reduces size by ~30%)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window (runs as GUI app)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # TODO: Add icon file if available
    version='version_info.txt',  # Optional: version info
)

# Note: For --onedir mode (folder with dependencies), use this instead:
# coll = COLLECT(
#     exe,
#     a.binaries,
#     a.zipfiles,
#     a.datas,
#     strip=False,
#     upx=True,
#     upx_exclude=[],
#     name='StellaSoraCropper'
# )
