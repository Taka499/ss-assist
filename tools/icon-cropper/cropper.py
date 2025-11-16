"""Main screenshot cropper daemon with hotkey listener and system tray."""

import sys
import threading
from pathlib import Path
from datetime import datetime

import keyboard
from PIL import Image
from pystray import Icon, Menu, MenuItem
from PIL import Image as PilImage

from utils import (
    load_config,
    validate_windows,
    get_temp_session_dir,
    show_notification
)
from capture import capture_stella_sora, WindowNotFoundError
from detector import detect_page, UnknownPageError
from gridcrop import crop_page


class CropperDaemon:
    """Main daemon for the screenshot cropper tool."""

    def __init__(self):
        """Initialize the cropper daemon."""
        validate_windows()

        self.config = load_config()
        self.running = False
        self.icon = None

        # Setup hotkey
        hotkey_config = self.config['hotkey']
        self.hotkey = hotkey_config['key'].lower()
        self.modifiers = [m.lower() for m in hotkey_config.get('modifiers', [])]

    def capture_and_crop(self) -> None:
        """Perform the capture and crop workflow."""
        try:
            print("\n" + "=" * 50)
            print("Screenshot capture triggered!")
            print("=" * 50)

            # Step 1: Capture window
            print("\n[1/4] Capturing Stella Sora window...")
            screenshot = capture_stella_sora(self.config)
            print(f"✓ Captured screenshot: {screenshot.size[0]}x{screenshot.size[1]}")

            # Step 2: Detect page type
            print("\n[2/4] Detecting page type...")
            page_type = detect_page(screenshot, self.config)
            print(f"✓ Detected page type: {page_type}")

            # Step 3: Create session directory
            print("\n[3/4] Creating session directory...")
            session_dir = get_temp_session_dir(self.config)
            print(f"✓ Session directory: {session_dir}")

            # Save full screenshot for reference
            screenshot_path = session_dir / "full_screenshot.png"
            screenshot.save(screenshot_path)
            print(f"✓ Saved full screenshot: {screenshot_path}")

            # Step 4: Crop icons
            print("\n[4/4] Cropping icons...")
            saved_paths = crop_page(screenshot, page_type, self.config, session_dir)
            print(f"✓ Cropped {len(saved_paths)} icons")

            # Show notification
            show_notification(
                "Screenshot Cropper",
                f"Captured {len(saved_paths)} icons from {page_type}",
                self.config
            )

            print("\n" + "=" * 50)
            print("Capture complete!")
            print(f"Session directory: {session_dir}")
            print("\nNext steps:")
            print("1. Run the annotator to assign character IDs:")
            print(f"     uv run python annotator.py {session_dir}")
            print("\n💡 Tip: To adjust grid layout or OCR regions:")
            print("     uv run python config_editor.py")
            print("=" * 50)

        except WindowNotFoundError as e:
            print(f"\n❌ Error: {e}")
            show_notification(
                "Screenshot Cropper - Error",
                "Stella Sora window not found",
                self.config
            )

        except UnknownPageError as e:
            print(f"\n❌ Error: {e}")
            print("\n💡 Hint: If OCR detection is failing, try adjusting the OCR region:")
            print("     uv run python config_editor.py")
            show_notification(
                "Screenshot Cropper - Error",
                "Unknown page type detected",
                self.config
            )

        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()

            show_notification(
                "Screenshot Cropper - Error",
                f"Capture failed: {e}",
                self.config
            )

    def on_hotkey(self) -> None:
        """Handle hotkey press."""
        # Run capture in a separate thread to avoid blocking
        thread = threading.Thread(target=self.capture_and_crop, daemon=True)
        thread.start()

    def create_system_tray_icon(self) -> Icon:
        """Create the system tray icon.

        Returns:
            pystray Icon instance
        """
        # Create a simple icon image (green circle)
        icon_image = PilImage.new('RGB', (64, 64), color='white')
        from PIL import ImageDraw
        draw = ImageDraw.Draw(icon_image)
        draw.ellipse([8, 8, 56, 56], fill='green', outline='darkgreen', width=2)

        # Create menu
        menu = Menu(
            MenuItem(
                f"Hotkey: {self.hotkey.upper()}",
                lambda: None,
                enabled=False
            ),
            MenuItem(
                "Capture Now",
                lambda: self.on_hotkey()
            ),
            Menu.SEPARATOR,
            MenuItem(
                "Quit",
                lambda: self.stop()
            )
        )

        return Icon(
            "Screenshot Cropper",
            icon_image,
            "Screenshot Cropper\n" + f"Press {self.hotkey.upper()} to capture",
            menu
        )

    def setup_hotkey(self) -> None:
        """Setup the global hotkey listener."""
        # Build hotkey string
        hotkey_parts = self.modifiers + [self.hotkey]
        hotkey_str = '+'.join(hotkey_parts)

        print(f"Registering hotkey: {hotkey_str.upper()}")

        try:
            keyboard.add_hotkey(hotkey_str, self.on_hotkey, suppress=False)
            print("✓ Hotkey registered successfully")
        except Exception as e:
            print(f"❌ Failed to register hotkey: {e}")
            raise

    def start(self) -> None:
        """Start the daemon."""
        print("=" * 50)
        print("Screenshot Cropper Daemon")
        print("=" * 50)

        # Setup hotkey
        self.setup_hotkey()

        # Create system tray icon
        print("Creating system tray icon...")
        self.icon = self.create_system_tray_icon()

        self.running = True

        print("\n✓ Daemon is running!")
        print(f"Press {self.hotkey.upper()} to capture the Stella Sora window")
        print("Right-click the system tray icon to quit")
        print()

        # Run the icon (blocks until quit)
        self.icon.run()

    def stop(self) -> None:
        """Stop the daemon."""
        print("\nStopping daemon...")
        self.running = False

        # Remove hotkey
        try:
            keyboard.unhook_all_hotkeys()
        except Exception:
            pass

        # Stop icon
        if self.icon:
            self.icon.stop()

        print("✓ Daemon stopped")


def main():
    """Main entry point."""
    try:
        daemon = CropperDaemon()
        daemon.start()

    except KeyboardInterrupt:
        print("\n\nReceived Ctrl+C, exiting...")
        sys.exit(0)

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
