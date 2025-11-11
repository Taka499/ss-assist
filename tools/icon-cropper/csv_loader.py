"""CSV loader for character data validation."""

import csv
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class CharacterData:
    """Character data from CSV."""
    id: str
    name_ja: str
    name_zh_hans: str
    name_zh_hant: str
    name_en: str
    icon: str
    role: str
    style: str
    faction: str
    element: str
    rarity: str

    @property
    def display_name(self) -> str:
        """Get a display name for the character."""
        # Use Japanese name, with English in parentheses if available
        if self.name_en:
            return f"{self.name_ja} ({self.name_en})"
        return self.name_ja

    @property
    def icon_number(self) -> str:
        """Extract icon number from icon path (e.g., '001' from 'assets/characters/001.png')."""
        return Path(self.icon).stem


class CharacterDatabase:
    """Database of character data loaded from CSV."""

    def __init__(self, csv_path: Path):
        """Initialize the character database.

        Args:
            csv_path: Path to the characters CSV file
        """
        self.csv_path = csv_path
        self.characters: Dict[str, CharacterData] = {}
        self._load_csv()

    def _load_csv(self) -> None:
        """Load character data from CSV file."""
        if not self.csv_path.exists():
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")

        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                char_id = row['id']

                # Skip placeholder row (char-000)
                if char_id == 'char-000':
                    continue

                # Skip rows with empty ID
                if not char_id:
                    continue

                char_data = CharacterData(
                    id=char_id,
                    name_ja=row.get('name_ja', ''),
                    name_zh_hans=row.get('name_zh-Hans', ''),
                    name_zh_hant=row.get('name_zh-Hant', ''),
                    name_en=row.get('name_en', ''),
                    icon=row.get('icon', ''),
                    role=row.get('role', ''),
                    style=row.get('style', ''),
                    faction=row.get('faction', ''),
                    element=row.get('element', ''),
                    rarity=row.get('rarity', ''),
                )

                self.characters[char_id] = char_data

    def get_character(self, char_id: str) -> Optional[CharacterData]:
        """Get character data by ID.

        Args:
            char_id: Character ID (e.g., 'char-001')

        Returns:
            CharacterData if found, None otherwise
        """
        return self.characters.get(char_id)

    def get_all_characters(self) -> List[CharacterData]:
        """Get all character data.

        Returns:
            List of CharacterData objects
        """
        return list(self.characters.values())

    def get_character_ids(self) -> List[str]:
        """Get all character IDs.

        Returns:
            List of character IDs (e.g., ['char-001', 'char-002', ...])
        """
        return list(self.characters.keys())

    def validate_character_id(self, char_id: str) -> bool:
        """Check if a character ID exists in the database.

        Args:
            char_id: Character ID to validate

        Returns:
            True if valid, False otherwise
        """
        return char_id in self.characters

    def get_display_names(self) -> Dict[str, str]:
        """Get a mapping of character IDs to display names.

        Returns:
            Dictionary of {char_id: display_name}
        """
        return {
            char_id: char_data.display_name
            for char_id, char_data in self.characters.items()
        }

    def get_character_info(self, char_id: str) -> str:
        """Get formatted character information for display.

        Args:
            char_id: Character ID

        Returns:
            Formatted string with character info
        """
        char = self.get_character(char_id)

        if char is None:
            return f"Unknown character: {char_id}"

        info_parts = [
            f"{char.display_name}",
        ]

        if char.rarity:
            info_parts.append(f"★{char.rarity}")

        if char.role:
            info_parts.append(char.role)

        if char.element:
            info_parts.append(char.element)

        if char.faction:
            info_parts.append(char.faction)

        return " | ".join(info_parts)


def load_characters(csv_path: Path) -> CharacterDatabase:
    """Load character database from CSV.

    Args:
        csv_path: Path to the characters CSV file

    Returns:
        CharacterDatabase instance

    Raises:
        FileNotFoundError: If CSV file not found
    """
    return CharacterDatabase(csv_path)


if __name__ == "__main__":
    # Test the CSV loader
    from utils import get_project_root

    project_root = get_project_root()
    csv_path = project_root / "data-sources" / "stellasora - characters.csv"

    print(f"Loading characters from: {csv_path}")

    try:
        db = load_characters(csv_path)
        print(f"Loaded {len(db.characters)} characters")

        # Show first 5 characters
        print("\nFirst 5 characters:")
        for char_id in list(db.get_character_ids())[:5]:
            print(f"  {char_id}: {db.get_character_info(char_id)}")

        # Test validation
        print("\nValidation tests:")
        print(f"  'char-001' valid: {db.validate_character_id('char-001')}")
        print(f"  'char-999' valid: {db.validate_character_id('char-999')}")

    except Exception as e:
        print(f"Error: {e}")
