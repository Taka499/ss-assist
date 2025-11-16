"""Test script for config_serializer.py

Tests the YAML save/load roundtrip with comment preservation.
"""

import sys
from pathlib import Path
from editor.config_serializer import ConfigSerializer

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def test_roundtrip():
    """Test loading, modifying, and saving config with comment preservation."""
    print("=" * 60)
    print("Testing Config Serializer - Save/Load Roundtrip")
    print("=" * 60)

    # Initialize serializer
    config_path = Path(__file__).parent / "config.yaml"
    serializer = ConfigSerializer(config_path)

    # Step 1: Load existing config
    print("\n[1/5] Loading config.yaml...")
    config, load_error = serializer.load()
    if load_error:
        print(f"❌ Load failed: {load_error}")
        return False
    print("✓ Config loaded successfully")

    # Step 2: Read original file content to check comments
    print("\n[2/5] Reading original file to verify comments...")
    with open(config_path, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # Check for key comments
    key_comments = [
        "# Screenshot Cropper Configuration",
        "# Window detection settings",
        "# OCR settings for page detection",
        "# Grid layout for icon cropping"
    ]

    for comment in key_comments:
        if comment in original_content:
            print(f"  ✓ Found: {comment}")
        else:
            print(f"  ⚠ Missing: {comment}")

    # Step 3: Validate grid configuration
    print("\n[3/5] Validating grid configuration...")
    test_grid = {
        'start_x': 963,
        'start_y': 151,
        'cell_width': 146,
        'cell_height': 146,
        'spacing_x': 4,
        'spacing_y': 4,
        'columns': 3,
        'rows': 4,
        'crop_padding': 8
    }

    is_valid, error_msg = serializer.validate_grid_config(
        test_grid,
        image_width=1920,
        image_height=1080
    )

    if is_valid:
        print("✓ Grid configuration is valid")
    else:
        print(f"❌ Grid validation failed: {error_msg}")
        return False

    # Step 4: Validate OCR region
    print("\n[4/5] Validating OCR region...")
    test_ocr = [140, 50, 300, 50]

    is_valid, error_msg = serializer.validate_ocr_region(
        test_ocr,
        image_width=1920,
        image_height=1080
    )

    if is_valid:
        print("✓ OCR region is valid")
    else:
        print(f"❌ OCR validation failed: {error_msg}")
        return False

    # Step 5: Test save (with backup, but we'll use a test modification)
    print("\n[5/5] Testing save with modified values...")

    # Modify grid slightly (just for testing - we'll verify backup exists)
    modified_grid = test_grid.copy()
    modified_grid['start_x'] = 965  # Change slightly
    modified_grid['start_y'] = 153

    success, save_error = serializer.save(
        config,
        'character_select',
        modified_grid,
        ocr_region=test_ocr,
        create_backup=True
    )

    if not success:
        print(f"❌ Save failed: {save_error}")
        return False

    print("✓ Configuration saved successfully")

    # Verify backup was created
    backup_files = list(config_path.parent.glob("config.yaml.backup.*"))
    if backup_files:
        latest_backup = max(backup_files, key=lambda p: p.stat().st_mtime)
        print(f"✓ Backup created: {latest_backup.name}")
    else:
        print("⚠ No backup file found")

    # Step 6: Reload and verify comments are preserved
    print("\n[6/6] Verifying comments are preserved after save...")
    with open(config_path, 'r', encoding='utf-8') as f:
        saved_content = f.read()

    comments_preserved = True
    for comment in key_comments:
        if comment in saved_content:
            print(f"  ✓ Preserved: {comment}")
        else:
            print(f"  ❌ Lost: {comment}")
            comments_preserved = False

    # Restore original values
    print("\n[7/7] Restoring original configuration...")
    config_restored, _ = serializer.load()
    success, _ = serializer.save(
        config_restored,
        'character_select',
        test_grid,
        ocr_region=test_ocr,
        create_backup=False  # Don't create another backup
    )

    if success:
        print("✓ Original configuration restored")

    print("\n" + "=" * 60)
    if comments_preserved:
        print("✅ All tests passed! Comments are preserved.")
    else:
        print("⚠️ Tests completed with warnings - some comments may be lost")
    print("=" * 60)

    return comments_preserved


if __name__ == "__main__":
    test_roundtrip()
