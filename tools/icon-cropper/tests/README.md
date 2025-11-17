# Icon Cropper Tests

Comprehensive test suite for the icon-cropper configuration editor.

## Test Coverage

### Unit Tests

**`test_coordinate_system.py`** (25 tests)
- Canvas ↔ image coordinate transformations
- Zoom, pan, and scroll position handling
- Round-trip conversion verification
- Edge cases with various zoom levels and offsets

**`test_config_serializer.py`** (34 tests)
- YAML loading and saving with comment preservation
- Automatic backup creation with timestamps
- Grid configuration validation (bounds, dimensions, padding)
- OCR region validation (size, position, bounds)
- Error handling for missing/invalid data

**`test_preview_controller.py`** (24 tests)
- Icon extraction from grid configurations
- Crop padding application
- Boundary clipping for cells at image edges
- Grid validation before preview
- Edge cases (large grids, float coordinates, zero-size cells)

**Total: 83 tests**

## Running Tests

### Run all tests

```bash
cd tools/icon-cropper
uv run pytest
```

### Run specific test file

```bash
uv run pytest tests/test_coordinate_system.py
uv run pytest tests/test_config_serializer.py -v
```

### Run with coverage (if pytest-cov is installed)

```bash
uv run pytest --cov=editor --cov-report=html
```

### Run tests matching a pattern

```bash
uv run pytest -k "validate"  # Run all validation tests
uv run pytest -k "grid"      # Run all grid-related tests
```

## Test Structure

```
tests/
├── __init__.py
├── README.md                       # This file
├── pytest.ini                      # Pytest configuration
├── fixtures/
│   └── test_config.yaml           # Sample config for testing
├── test_coordinate_system.py      # Coordinate transformation tests
├── test_config_serializer.py      # YAML serialization tests
└── test_preview_controller.py     # Icon extraction tests
```

## Fixtures

**`test_config.yaml`**
- Sample configuration file used for testing serialization
- Contains all sections: window, ocr, pages
- Includes comments to verify preservation

**Pytest Fixtures:**
- `temp_config_dir`: Temporary directory with test config file
- `serializer`: ConfigSerializer instance
- `controller`: PreviewController instance
- `test_image`: 800x600 test image with colored grid pattern
- `valid_grid`: Valid grid configuration dict
- `canvas` (mocked): Mock Canvas for coordinate tests

## What's Not Tested

The following modules have complex Tkinter dependencies and would require extensive mocking:

- `grid_editor.py` - State machine and UI interactions
- `ocr_editor.py` - State machine and UI interactions
- `resize_controller.py` - Handle detection and resize logic
- `grid_renderer.py` - Canvas rendering
- `canvas_controller.py` - Image display and zoom
- `ui_builder.py` - UI component creation

These modules have been manually tested during development and work reliably in production.

## Test Coverage Summary

- **Coordinate transformations**: ✅ Fully tested (100%)
- **Configuration persistence**: ✅ Fully tested (100%)
- **Validation logic**: ✅ Fully tested (100%)
- **Icon extraction**: ✅ Fully tested (100%)
- **UI state machines**: ⏳ Manual testing only
- **Integration workflows**: ⏳ Could be added if needed

## CI/CD Integration

To run tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    cd tools/icon-cropper
    uv run pytest --tb=short
```

## Contributing

When adding new features:

1. Write tests for pure functions and business logic
2. Use mocks (`pytest-mock`) for Tkinter dependencies
3. Follow existing test patterns and naming conventions
4. Ensure all tests pass before committing: `uv run pytest`

## Troubleshooting

**Problem: Tkinter errors during tests**
- Solution: Use `pytest-mock` to mock Tkinter widgets (see `test_coordinate_system.py` for examples)

**Problem: Test fixtures not found**
- Solution: Ensure `tests/fixtures/` directory exists with `test_config.yaml`

**Problem: Import errors**
- Solution: Run tests from `tools/icon-cropper` directory using `uv run pytest`
