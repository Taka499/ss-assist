"""Window capture functionality for the screenshot cropper tool."""

import sys
from typing import Optional, Tuple
from PIL import Image

# Windows-specific imports
if sys.platform == 'win32':
    import win32gui
    import win32ui
    import win32con
    import win32api


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
    """Capture a window by its handle.

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
        # Get window dimensions
        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        width = right - left
        height = bottom - top

        # Get window device context
        hwnd_dc = win32gui.GetWindowDC(hwnd)
        mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
        save_dc = mfc_dc.CreateCompatibleDC()

        # Create bitmap
        bitmap = win32ui.CreateBitmap()
        bitmap.CreateCompatibleBitmap(mfc_dc, width, height)
        save_dc.SelectObject(bitmap)

        # Copy window content to bitmap
        result = win32gui.PrintWindow(hwnd, save_dc.GetSafeHdc(), 3)

        if result == 0:
            raise RuntimeError("PrintWindow failed")

        # Convert bitmap to PIL Image
        bmpinfo = bitmap.GetInfo()
        bmpstr = bitmap.GetBitmapBits(True)

        img = Image.frombuffer(
            'RGB',
            (bmpinfo['bmWidth'], bmpinfo['bmHeight']),
            bmpstr, 'raw', 'BGRX', 0, 1
        )

        # Cleanup
        win32gui.DeleteObject(bitmap.GetHandle())
        save_dc.DeleteDC()
        mfc_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, hwnd_dc)

        return img

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

            print(f"Auto-detection failed: {e}")
            print("Manual selection not implemented yet.")
            raise

    else:
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
