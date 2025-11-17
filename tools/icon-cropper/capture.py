"""Window capture functionality for the screenshot cropper tool."""

import sys
import time
from typing import Optional, Tuple
from PIL import Image
import numpy as np

# Windows-specific imports
if sys.platform == 'win32':
    import win32gui
    from windows_capture import WindowsCapture, Frame, InternalCaptureControl


class WindowNotFoundError(Exception):
    """Raised when the target window cannot be found."""
    pass


def find_window_by_title(title_pattern: str) -> Optional[int]:
    """Find a window handle by partial title match.

    Args:
        title_pattern: Partial window title to search for

    Returns:
        Window handle (HWND) if found, None otherwise
    """
    if sys.platform != 'win32':
        raise RuntimeError("Window capture is only supported on Windows")

    found_hwnd = None

    def enum_callback(hwnd, _):
        nonlocal found_hwnd
        if win32gui.IsWindowVisible(hwnd):
            window_title = win32gui.GetWindowText(hwnd)
            if title_pattern.lower() in window_title.lower():
                found_hwnd = hwnd
                return False  # Stop enumeration
        return True  # Continue enumeration

    win32gui.EnumWindows(enum_callback, None)

    return found_hwnd


def capture_window(hwnd: int) -> Image.Image:
    """Capture a window by its handle using Windows Graphics Capture API.

    This method can capture obscured windows including DirectX/OpenGL games.

    Args:
        hwnd: Window handle (HWND)

    Returns:
        PIL Image of the window contents

    Raises:
        RuntimeError: If capture fails
    """
    if sys.platform != 'win32':
        raise RuntimeError("Window capture is only supported on Windows")

    try:
        # Check if window is minimized
        if win32gui.IsIconic(hwnd):
            raise RuntimeError("Cannot capture minimized window. Please restore the window first.")

        # Check if window exists
        if not win32gui.IsWindow(hwnd):
            raise RuntimeError(f"Invalid window handle: {hwnd}")

        # Get window title (required by WindowsCapture API)
        window_title = win32gui.GetWindowText(hwnd)
        if not window_title:
            raise RuntimeError("Window has no title - cannot capture with Graphics Capture API")

        print(f"Capturing window: '{window_title}'")

        # Storage for captured frame
        captured_frame = {'image': None, 'error': None}

        # Create capture instance with window name
        capture = WindowsCapture(
            cursor_capture=False,
            draw_border=False,
            monitor_index=None,
            window_name=window_title,
        )

        @capture.event
        def on_frame_arrived(frame: Frame, capture_control: InternalCaptureControl):
            """Callback when a frame is captured."""
            try:
                # Convert frame buffer (BGRA numpy array) to PIL Image (RGB)
                # frame.frame_buffer is a numpy array in BGRA format
                bgra_array = frame.frame_buffer

                # Convert BGRA to RGB
                rgb_array = bgra_array[:, :, [2, 1, 0]]  # Swap B and R channels, drop A

                # Create PIL Image from RGB array
                captured_frame['image'] = Image.fromarray(rgb_array, 'RGB')

                # Stop capture after getting one frame
                capture_control.stop()
            except Exception as e:
                captured_frame['error'] = str(e)
                capture_control.stop()

        @capture.event
        def on_closed():
            """Callback when capture session closes."""
            pass

        # Start capture (this will block until we call stop)
        print("Starting Windows Graphics Capture API...")
        capture.start()

        # Check if we got the frame
        if captured_frame['error']:
            raise RuntimeError(f"Frame capture failed: {captured_frame['error']}")

        if captured_frame['image'] is None:
            raise RuntimeError("Failed to capture frame - no image data received")

        print("Successfully captured window using Windows Graphics Capture API")
        return captured_frame['image']

    except Exception as e:
        raise RuntimeError(f"Failed to capture window: {e}")


def auto_detect_window(title_pattern: str) -> int:
    """Auto-detect window by title pattern.

    Args:
        title_pattern: Partial window title to search for

    Returns:
        Window handle (HWND)

    Raises:
        WindowNotFoundError: If window not found
    """
    hwnd = find_window_by_title(title_pattern)

    if hwnd is None:
        raise WindowNotFoundError(
            f"Could not find window matching '{title_pattern}'\n"
            "Make sure the Stella Sora client is running."
        )

    return hwnd


def get_window_info(hwnd: int) -> Tuple[str, Tuple[int, int, int, int]]:
    """Get information about a window.

    Args:
        hwnd: Window handle

    Returns:
        Tuple of (title, (left, top, right, bottom))
    """
    if sys.platform != 'win32':
        raise RuntimeError("Window info is only supported on Windows")

    title = win32gui.GetWindowText(hwnd)
    rect = win32gui.GetWindowRect(hwnd)

    return title, rect


def capture_stella_sora(config: dict) -> Image.Image:
    """Capture the Stella Sora window using configuration.

    Args:
        config: Configuration dictionary

    Returns:
        PIL Image of the captured window

    Raises:
        WindowNotFoundError: If window not found
        RuntimeError: If capture fails
    """
    window_config = config['window']

    if window_config['auto_detect']:
        # Try auto-detection first
        try:
            hwnd = auto_detect_window(window_config['title_pattern'])
            title, rect = get_window_info(hwnd)
            print(f"Found window: {title}")
            print(f"Position: {rect}")

            return capture_window(hwnd)

        except WindowNotFoundError as e:
            if not window_config['allow_manual_selection']:
                raise

            # TODO: Implement manual window selection GUI
            # - Show list of all visible windows with thumbnails
            # - Allow user to click/select the correct window
            # - Cache the selection for the session
            print(f"Auto-detection failed: {e}")
            print("Manual selection not implemented yet.")
            raise

    else:
        # TODO: Implement manual window selection GUI
        raise NotImplementedError("Manual window selection not implemented yet")


if __name__ == "__main__":
    # Test the capture functionality
    from utils import load_config, validate_windows

    validate_windows()
    config = load_config()

    print("Attempting to capture Stella Sora window...")
    try:
        img = capture_stella_sora(config)
        print(f"Captured image: {img.size[0]}x{img.size[1]}")

        # Save test capture
        test_path = "test_capture.png"
        img.save(test_path)
        print(f"Saved test capture to: {test_path}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
