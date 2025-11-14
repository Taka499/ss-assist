"""Unit tests for config_serializer.py

Tests YAML loading/saving, comment preservation, backup creation, and validation.
"""

import pytest
from pathlib import Path
import shutil
import tempfile
from editor.config_serializer import ConfigSerializer


@pytest.fixture
def temp_config_dir(tmp_path):
    """Create a temporary directory with test config file."""
    # Copy test config to temp directory
    fixtures_dir = Path(__file__).parent / 'fixtures'
    test_config_src = fixtures_dir / 'test_config.yaml'
    test_config_dest = tmp_path / 'config.yaml'

    shutil.copy(test_config_src, test_config_dest)

    return tmp_path


@pytest.fixture
def serializer(temp_config_dir):
    """Create a ConfigSerializer instance with temp config."""
    config_path = temp_config_dir / 'config.yaml'
    return ConfigSerializer(config_path)


class TestLoad:
    """Tests for loading config.yaml."""

    def test_load_success(self, serializer):
        """Successfully load a valid config file."""
        config, error = serializer.load()

        assert error is None
        assert config is not None
        assert 'pages' in config
        assert 'character_select' in config['pages']
        assert 'ocr' in config

    def test_load_preserves_structure(self, serializer):
        """Loaded config preserves expected structure."""
        config, error = serializer.load()

        assert error is None
        page = config['pages']['character_select']
        assert 'grid' in page
        assert 'output' in page
        assert page['grid']['columns'] == 3
        assert page['grid']['rows'] == 4

    def test_load_nonexistent_file(self, tmp_path):
        """Loading a nonexistent file returns error."""
        serializer = ConfigSerializer(tmp_path / 'nonexistent.yaml')
        config, error = serializer.load()

        assert config is None
        assert error is not None
        assert 'not found' in error.lower()

    def test_load_invalid_yaml(self, tmp_path):
        """Loading invalid YAML returns error."""
        invalid_yaml = tmp_path / 'invalid.yaml'
        invalid_yaml.write_text('{ invalid yaml content [}', encoding='utf-8')

        serializer = ConfigSerializer(invalid_yaml)
        config, error = serializer.load()

        assert config is None
        assert error is not None


class TestSave:
    """Tests for saving config.yaml."""

    def test_save_success(self, serializer):
        """Successfully save modified grid configuration."""
        # Load config
        config, _ = serializer.load()

        # Modify grid
        modified_grid = {
            'start_x': 1000,
            'start_y': 200,
            'cell_width': 150,
            'cell_height': 150,
            'spacing_x': 5,
            'spacing_y': 5,
            'columns': 3,
            'rows': 4,
            'crop_padding': 10
        }

        # Save (without backup for this test)
        success, error = serializer.save(
            config,
            'character_select',
            modified_grid,
            create_backup=False
        )

        assert success is True
        assert error is None

        # Reload and verify changes
        config_reloaded, _ = serializer.load()
        grid = config_reloaded['pages']['character_select']['grid']
        assert grid['start_x'] == 1000
        assert grid['start_y'] == 200
        assert grid['cell_width'] == 150
        assert grid['crop_padding'] == 10

    def test_save_with_ocr_region(self, serializer):
        """Successfully save with OCR region update."""
        config, _ = serializer.load()

        grid_config = {
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

        ocr_region = [150, 60, 320, 55]

        success, error = serializer.save(
            config,
            'character_select',
            grid_config,
            ocr_region=ocr_region,
            create_backup=False
        )

        assert success is True
        assert error is None

        # Verify OCR region was updated
        config_reloaded, _ = serializer.load()
        assert config_reloaded['ocr']['detection_region'] == ocr_region

    def test_save_preserves_comments(self, serializer):
        """Comments are preserved after save."""
        config, _ = serializer.load()

        grid_config = {
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

        serializer.save(config, 'character_select', grid_config, create_backup=False)

        # Read file content directly
        with open(serializer.config_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for key comments
        assert '# Screenshot Cropper Configuration' in content
        assert '# Window detection settings' in content
        assert '# OCR settings for page detection' in content
        assert '# Grid layout for icon cropping' in content

    def test_save_missing_page(self, serializer):
        """Saving to nonexistent page returns error."""
        config, _ = serializer.load()

        grid_config = {
            'start_x': 963, 'start_y': 151,
            'cell_width': 146, 'cell_height': 146,
            'spacing_x': 4, 'spacing_y': 4,
            'columns': 3, 'rows': 4, 'crop_padding': 8
        }

        success, error = serializer.save(
            config,
            'nonexistent_page',
            grid_config,
            create_backup=False
        )

        assert success is False
        assert error is not None
        assert 'not found' in error.lower()

    def test_save_missing_pages_section(self, serializer):
        """Saving to config without 'pages' section returns error."""
        # Create empty config
        config = {}

        grid_config = {
            'start_x': 963, 'start_y': 151,
            'cell_width': 146, 'cell_height': 146,
            'spacing_x': 4, 'spacing_y': 4,
            'columns': 3, 'rows': 4, 'crop_padding': 8
        }

        success, error = serializer.save(
            config,
            'character_select',
            grid_config,
            create_backup=False
        )

        assert success is False
        assert error is not None
        assert 'pages' in error.lower()


class TestBackup:
    """Tests for backup creation."""

    def test_create_backup_success(self, serializer):
        """Backup file is created with timestamp."""
        config, _ = serializer.load()

        grid_config = {
            'start_x': 963, 'start_y': 151,
            'cell_width': 146, 'cell_height': 146,
            'spacing_x': 4, 'spacing_y': 4,
            'columns': 3, 'rows': 4, 'crop_padding': 8
        }

        # Save with backup
        success, error = serializer.save(
            config,
            'character_select',
            grid_config,
            create_backup=True
        )

        assert success is True

        # Check backup file exists
        backup_files = list(serializer.config_path.parent.glob('config.yaml.backup.*'))
        assert len(backup_files) > 0

        # Verify backup content matches original
        latest_backup = max(backup_files, key=lambda p: p.stat().st_mtime)
        with open(latest_backup, 'r', encoding='utf-8') as f:
            backup_content = f.read()

        assert '# Screenshot Cropper Configuration' in backup_content

    def test_create_backup_nonexistent_file(self, tmp_path):
        """Creating backup of nonexistent file returns error."""
        serializer = ConfigSerializer(tmp_path / 'nonexistent.yaml')
        success, error = serializer._create_backup()

        assert success is False
        assert error is not None


class TestValidateGridConfig:
    """Tests for grid configuration validation."""

    @pytest.fixture
    def valid_grid(self):
        """A valid grid configuration."""
        return {
            'start_x': 100,
            'start_y': 100,
            'cell_width': 150,
            'cell_height': 150,
            'spacing_x': 5,
            'spacing_y': 5,
            'columns': 3,
            'rows': 4,
            'crop_padding': 10
        }

    def test_validate_success(self, serializer, valid_grid):
        """Valid grid configuration passes validation."""
        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is True
        assert error is None

    def test_validate_missing_field(self, serializer):
        """Missing required field fails validation."""
        incomplete_grid = {
            'start_x': 100,
            'start_y': 100,
            # Missing other required fields
        }

        is_valid, error = serializer.validate_grid_config(
            incomplete_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert error is not None
        assert 'missing' in error.lower()

    def test_validate_negative_cell_width(self, serializer, valid_grid):
        """Negative cell width fails validation."""
        valid_grid['cell_width'] = -100

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'positive' in error.lower()

    def test_validate_zero_cell_height(self, serializer, valid_grid):
        """Zero cell height fails validation."""
        valid_grid['cell_height'] = 0

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'positive' in error.lower()

    def test_validate_negative_columns(self, serializer, valid_grid):
        """Negative columns fails validation."""
        valid_grid['columns'] = -1

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'positive' in error.lower()

    def test_validate_excessive_columns(self, serializer, valid_grid):
        """Too many columns fails validation."""
        valid_grid['columns'] = 100

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'too large' in error.lower()

    def test_validate_negative_spacing(self, serializer, valid_grid):
        """Negative spacing fails validation."""
        valid_grid['spacing_x'] = -5

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'negative' in error.lower()

    def test_validate_excessive_spacing(self, serializer, valid_grid):
        """Excessive spacing fails validation."""
        valid_grid['spacing_x'] = 500  # More than 2× cell width

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'too large' in error.lower()

    def test_validate_negative_padding(self, serializer, valid_grid):
        """Negative padding fails validation."""
        valid_grid['crop_padding'] = -5

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'negative' in error.lower()

    def test_validate_padding_exceeds_cell_width(self, serializer, valid_grid):
        """Padding exceeding cell width fails validation."""
        valid_grid['crop_padding'] = 100  # 100 * 2 > 150 cell_width

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'exceeds' in error.lower()

    def test_validate_negative_start_position(self, serializer, valid_grid):
        """Negative start position fails validation."""
        valid_grid['start_x'] = -10

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'negative' in error.lower()

    def test_validate_first_cell_exceeds_width(self, serializer, valid_grid):
        """First cell exceeding image width fails validation."""
        valid_grid['start_x'] = 1800  # start_x + cell_width > 1920

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'beyond' in error.lower()

    def test_validate_grid_exceeds_image_bounds(self, serializer, valid_grid):
        """Grid extending beyond image bounds fails validation."""
        valid_grid['columns'] = 20  # Grid will extend far beyond 1920px width

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'beyond' in error.lower()
        assert 'width' in error.lower()

    def test_validate_cropped_cell_too_small(self, serializer, valid_grid):
        """Cropped cell size too small fails validation."""
        valid_grid['cell_width'] = 20
        valid_grid['cell_height'] = 20
        valid_grid['crop_padding'] = 8  # Leaves only 4×4px after padding

        is_valid, error = serializer.validate_grid_config(
            valid_grid,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'too small' in error.lower()


class TestValidateOcrRegion:
    """Tests for OCR region validation."""

    @pytest.fixture
    def valid_ocr(self):
        """A valid OCR region."""
        return [140, 50, 300, 50]  # [x, y, width, height]

    def test_validate_success(self, serializer, valid_ocr):
        """Valid OCR region passes validation."""
        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is True
        assert error is None

    def test_validate_wrong_length(self, serializer):
        """OCR region with wrong number of values fails."""
        invalid_ocr = [140, 50, 300]  # Missing height

        is_valid, error = serializer.validate_ocr_region(
            invalid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert '4 values' in error.lower()

    def test_validate_negative_width(self, serializer, valid_ocr):
        """Negative width fails validation."""
        valid_ocr[2] = -100

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'positive' in error.lower()

    def test_validate_zero_height(self, serializer, valid_ocr):
        """Zero height fails validation."""
        valid_ocr[3] = 0

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'positive' in error.lower()

    def test_validate_width_too_small(self, serializer, valid_ocr):
        """Width too small for OCR fails validation."""
        valid_ocr[2] = 10  # Less than 20px minimum

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'too small' in error.lower()

    def test_validate_width_too_large(self, serializer, valid_ocr):
        """Width too large (>80% image) fails validation."""
        valid_ocr[2] = 1600  # More than 80% of 1920px

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'too large' in error.lower()

    def test_validate_negative_position(self, serializer, valid_ocr):
        """Negative position fails validation."""
        valid_ocr[0] = -10

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'negative' in error.lower()

    def test_validate_exceeds_image_width(self, serializer, valid_ocr):
        """OCR region exceeding image width fails validation."""
        valid_ocr[0] = 1800  # x=1800, width=300 exceeds 1920

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'beyond' in error.lower()
        assert 'width' in error.lower()

    def test_validate_exceeds_image_height(self, serializer, valid_ocr):
        """OCR region exceeding image height fails validation."""
        valid_ocr[1] = 1050  # y=1050, height=50 exceeds 1080

        is_valid, error = serializer.validate_ocr_region(
            valid_ocr,
            image_width=1920,
            image_height=1080
        )

        assert is_valid is False
        assert 'beyond' in error.lower()
        assert 'height' in error.lower()
