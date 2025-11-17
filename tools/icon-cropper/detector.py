"""Page type detection using OCR."""

from typing import Optional, Dict, Any
from PIL import Image
import easyocr


class PageDetector:
    """OCR-based page type detector."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize the page detector.

        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.ocr_config = config['ocr']
        self.pages_config = config['pages']

        # Initialize EasyOCR reader (lazy loading)
        self._reader = None

    @property
    def reader(self):
        """Get or initialize EasyOCR reader (lazy loading)."""
        if self._reader is None:
            print("Initializing EasyOCR reader (this may take a moment)...")
            languages = self.ocr_config['languages']
            self._reader = easyocr.Reader(languages, gpu=False)
            print("EasyOCR reader initialized.")

        return self._reader

    def extract_detection_region(self, image: Image.Image) -> Image.Image:
        """Extract the region used for page detection.

        Args:
            image: Full window screenshot

        Returns:
            Cropped region for OCR
        """
        region = self.ocr_config['detection_region']
        x, y, width, height = region

        return image.crop((x, y, x + width, y + height))

    def detect_text(self, image: Image.Image) -> str:
        """Detect text in the image using OCR.

        Args:
            image: Image to detect text from

        Returns:
            Concatenated detected text
        """
        # Perform OCR
        results = self.reader.readtext(image)

        # Extract text with confidence above threshold
        threshold = self.ocr_config['confidence_threshold']
        detected_texts = [
            text for (bbox, text, confidence) in results
            if confidence >= threshold
        ]

        # Join all detected text
        full_text = ' '.join(detected_texts)

        return full_text

    def match_page_type(self, detected_text: str) -> Optional[str]:
        """Match detected text to a known page type.

        Args:
            detected_text: Text detected from OCR

        Returns:
            Page type key if matched, None otherwise
        """
        detected_lower = detected_text.lower()

        for page_key, page_config in self.pages_config.items():
            # Check primary match
            ocr_match = page_config['ocr_match']
            if ocr_match.lower() in detected_lower:
                return page_key

            # Check alternatives
            alternatives = page_config.get('ocr_alternatives', [])
            for alt in alternatives:
                if alt.lower() in detected_lower:
                    return page_key

        return None

    def detect_page_type(self, screenshot: Image.Image, debug: bool = False) -> str:
        """Detect the page type from a screenshot.

        Args:
            screenshot: Full window screenshot
            debug: If True, save intermediate images for debugging

        Returns:
            Page type key (e.g., 'character_select')

        Raises:
            ValueError: If page type cannot be detected
        """
        # Extract detection region
        region = self.extract_detection_region(screenshot)

        if debug:
            region.save("debug_detection_region.png")
            print(f"Saved detection region to: debug_detection_region.png")

        # Detect text
        print("Detecting text in region...")
        detected_text = self.detect_text(region)
        print(f"Detected text: {detected_text}")

        # Match to page type
        page_type = self.match_page_type(detected_text)

        if page_type is None:
            raise ValueError(
                f"Unknown page type. Detected text: '{detected_text}'\n"
                "Please ensure you're on a supported page or update the config."
            )

        print(f"Matched page type: {page_type}")
        return page_type


class UnknownPageError(Exception):
    """Raised when the page type cannot be determined."""
    pass


def detect_page(screenshot: Image.Image, config: Dict[str, Any], debug: bool = False) -> str:
    """Detect the page type from a screenshot.

    Args:
        screenshot: Full window screenshot
        config: Configuration dictionary
        debug: If True, save intermediate images for debugging

    Returns:
        Page type key (e.g., 'character_select')

    Raises:
        UnknownPageError: If page type cannot be detected
    """
    detector = PageDetector(config)

    try:
        return detector.detect_page_type(screenshot, debug=debug)

    except ValueError as e:
        raise UnknownPageError(str(e))


if __name__ == "__main__":
    # Test the page detector
    import sys
    from utils import load_config

    if len(sys.argv) < 2:
        print("Usage: python detector.py <screenshot.png>")
        sys.exit(1)

    screenshot_path = sys.argv[1]
    print(f"Loading screenshot: {screenshot_path}")

    screenshot = Image.open(screenshot_path)
    config = load_config()

    try:
        page_type = detect_page(screenshot, config, debug=True)
        print(f"\nDetected page type: {page_type}")

    except UnknownPageError as e:
        print(f"\nError: {e}")
        sys.exit(1)
