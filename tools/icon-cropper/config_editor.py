"""GUI Configuration Editor for Icon Cropper Tool.

This tool provides a visual interface for configuring the icon cropper,
allowing users to:
- Capture screenshots from the Stella Sora game window
- Visually define icon grid layouts by drawing rectangles
- Define OCR detection regions interactively
- Preview extracted icons to verify alignment
- Auto-save configuration to config.yaml

Usage:
    python config_editor.py
"""

import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from typing import Optional
from pathlib import Path
from PIL import Image, ImageTk
import threading
import subprocess
import tempfile
import time

# Import capture functionality
from capture import WindowNotFoundError
from utils import load_config


class ConfigEditorApp:
    """Main application for the Config Editor GUI."""

    def __init__(self, root: tk.Tk):
        """Initialize the Config Editor application.

        Args:
            root: The root Tkinter window
        """
        self.root = root
        self.root.title("Icon Cropper - Configuration Editor")
        self.root.geometry("1200x800")

        # Application state
        self.config = load_config()
        self.current_image: Optional[Image.Image] = None
        self.photo_image: Optional[ImageTk.PhotoImage] = None
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]  # [x, y] offset for panning

        # Panning state
        self.is_panning = False
        self.pan_start = [0, 0]

        # Set up the UI
        self._create_menu_bar()
        self._create_main_layout()
        self._create_status_bar()

        # Bind keyboard shortcuts
        self.root.bind('<Control-o>', lambda e: self.open_screenshot())
        self.root.bind('<Control-g>', lambda e: self.capture_screenshot())
        self.root.bind('<Control-q>', lambda e: self.quit_app())

    def _create_menu_bar(self):
        """Create the application menu bar."""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(
            label="Open Screenshot...",
            command=self.open_screenshot,
            accelerator="Ctrl+O"
        )
        file_menu.add_command(
            label="Capture Screenshot",
            command=self.capture_screenshot,
            accelerator="Ctrl+G"
        )
        file_menu.add_separator()
        file_menu.add_command(
            label="Exit",
            command=self.quit_app,
            accelerator="Ctrl+Q"
        )

        # View menu (for future zoom controls)
        view_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="View", menu=view_menu)
        view_menu.add_command(label="Zoom In", command=self.zoom_in, accelerator="+")
        view_menu.add_command(label="Zoom Out", command=self.zoom_out, accelerator="-")
        view_menu.add_command(label="Reset Zoom", command=self.reset_zoom, accelerator="0")

        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=self.show_about)

    def _create_main_layout(self):
        """Create the main application layout."""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Left panel for tools (placeholder for future milestones)
        left_panel = ttk.Frame(main_frame, width=250)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

        ttk.Label(left_panel, text="Tools", font=("Arial", 12, "bold")).pack(pady=5)
        ttk.Label(
            left_panel,
            text="Load a screenshot to begin",
            wraplength=230
        ).pack(pady=10)

        # Right panel for canvas
        right_panel = ttk.Frame(main_frame)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Create canvas with scrollbars
        canvas_frame = ttk.Frame(right_panel)
        canvas_frame.pack(fill=tk.BOTH, expand=True)

        # Scrollbars
        h_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.HORIZONTAL)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)

        v_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.VERTICAL)
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Canvas
        self.canvas = tk.Canvas(
            canvas_frame,
            bg="#2b2b2b",
            xscrollcommand=h_scrollbar.set,
            yscrollcommand=v_scrollbar.set
        )
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        h_scrollbar.config(command=self.canvas.xview)
        v_scrollbar.config(command=self.canvas.yview)

        # Bind mouse events for panning
        self.canvas.bind("<ButtonPress-1>", self.on_pan_start)
        self.canvas.bind("<B1-Motion>", self.on_pan_move)
        self.canvas.bind("<ButtonRelease-1>", self.on_pan_end)

        # Bind mouse wheel for zooming
        self.canvas.bind("<MouseWheel>", self.on_mouse_wheel)
        # For Linux
        self.canvas.bind("<Button-4>", lambda e: self.on_mouse_wheel_linux(e, 1))
        self.canvas.bind("<Button-5>", lambda e: self.on_mouse_wheel_linux(e, -1))

    def _create_status_bar(self):
        """Create the status bar at the bottom of the window."""
        self.status_bar = ttk.Label(
            self.root,
            text="Ready",
            relief=tk.SUNKEN,
            anchor=tk.W
        )
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def update_status(self, message: str):
        """Update the status bar message.

        Args:
            message: Status message to display
        """
        self.status_bar.config(text=message)
        self.root.update_idletasks()

    def open_screenshot(self):
        """Open a screenshot from file."""
        file_path = filedialog.askopenfilename(
            title="Open Screenshot",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg *.bmp"),
                ("All files", "*.*")
            ]
        )

        if file_path:
            try:
                self.current_image = Image.open(file_path)
                self.display_image()
                self.update_status(f"Loaded: {Path(file_path).name}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to open image:\n{e}")
                self.update_status("Error loading image")

    def capture_screenshot(self):
        """Capture a screenshot from the Stella Sora game window."""
        self.update_status("Capturing screenshot...")

        # Run capture in a separate thread to avoid COM/WinRT issues
        capture_thread = threading.Thread(target=self._capture_thread)
        capture_thread.daemon = True
        capture_thread.start()

    def _capture_thread(self):
        """Thread worker for capturing screenshots using subprocess isolation."""
        try:
            # Run capture.py in a separate process to avoid WinRT/COM threading issues
            # This gives the Windows Graphics Capture API a clean process environment
            capture_script = Path(__file__).parent / "capture.py"
            working_dir = Path(__file__).parent

            result = subprocess.run(
                ['uv', 'run', 'python', str(capture_script)],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode != 0:
                error_msg = result.stderr if result.stderr else result.stdout
                if "Could not find window" in error_msg or "WindowNotFoundError" in error_msg:
                    raise WindowNotFoundError("Could not find Stella Sora window. Make sure the game is running.")
                else:
                    raise RuntimeError(f"Capture failed:\n{error_msg}")

            # The capture.py script saves to test_capture.png
            capture_path = working_dir / "test_capture.png"

            # Wait a moment for file to be written
            time.sleep(0.1)

            if not capture_path.exists():
                raise RuntimeError("Capture file not found. The capture may have failed silently.")

            # Load the captured image
            image = Image.open(capture_path)

            # Update UI in main thread
            self.root.after(0, self._on_capture_success, image)

        except subprocess.TimeoutExpired:
            self.root.after(0, self._on_capture_error, "Error", "Capture timed out after 10 seconds")
        except WindowNotFoundError as e:
            self.root.after(0, self._on_capture_error, "Window Not Found", str(e))
        except Exception as e:
            self.root.after(0, self._on_capture_error, "Error", f"Failed to capture screenshot:\n{e}")

    def _on_capture_success(self, image: Image.Image):
        """Handle successful capture (called in main thread).

        Args:
            image: The captured image
        """
        self.current_image = image
        self.display_image()
        self.update_status(f"Captured: {self.current_image.size[0]}x{self.current_image.size[1]}")

    def _on_capture_error(self, title: str, message: str):
        """Handle capture error (called in main thread).

        Args:
            title: Error dialog title
            message: Error message
        """
        messagebox.showerror(title, message)
        self.update_status("Capture failed")

    def display_image(self):
        """Display the current image on the canvas with current zoom and pan."""
        if self.current_image is None:
            return

        # Calculate displayed size based on zoom
        width = int(self.current_image.size[0] * self.zoom_level)
        height = int(self.current_image.size[1] * self.zoom_level)

        # Resize image if zoomed
        if self.zoom_level != 1.0:
            display_img = self.current_image.resize(
                (width, height),
                Image.Resampling.LANCZOS
            )
        else:
            display_img = self.current_image

        # Convert to PhotoImage
        self.photo_image = ImageTk.PhotoImage(display_img)

        # Clear canvas
        self.canvas.delete("all")

        # Display image
        self.canvas.create_image(
            self.pan_offset[0],
            self.pan_offset[1],
            anchor=tk.NW,
            image=self.photo_image,
            tags="image"
        )

        # Update scroll region
        self.canvas.config(scrollregion=(
            0, 0,
            width + abs(self.pan_offset[0]),
            height + abs(self.pan_offset[1])
        ))

    def zoom_in(self):
        """Zoom in the image."""
        self.zoom_level = min(self.zoom_level * 1.2, 10.0)
        self.display_image()
        self.update_status(f"Zoom: {int(self.zoom_level * 100)}%")

    def zoom_out(self):
        """Zoom out the image."""
        self.zoom_level = max(self.zoom_level / 1.2, 0.1)
        self.display_image()
        self.update_status(f"Zoom: {int(self.zoom_level * 100)}%")

    def reset_zoom(self):
        """Reset zoom to 100%."""
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]
        self.display_image()
        self.update_status("Zoom: 100%")

    def on_mouse_wheel(self, event):
        """Handle mouse wheel for zooming (Windows/Mac).

        Args:
            event: Mouse wheel event
        """
        if self.current_image is None:
            return

        # Zoom based on wheel direction
        if event.delta > 0:
            self.zoom_in()
        else:
            self.zoom_out()

    def on_mouse_wheel_linux(self, event, direction):
        """Handle mouse wheel for zooming (Linux).

        Args:
            event: Mouse wheel event
            direction: 1 for up, -1 for down
        """
        if self.current_image is None:
            return

        if direction > 0:
            self.zoom_in()
        else:
            self.zoom_out()

    def on_pan_start(self, event):
        """Start panning when mouse button is pressed.

        Args:
            event: Mouse button press event
        """
        self.is_panning = True
        self.pan_start = [event.x, event.y]
        self.canvas.config(cursor="fleur")

    def on_pan_move(self, event):
        """Pan the image while dragging.

        Args:
            event: Mouse motion event
        """
        if not self.is_panning or self.current_image is None:
            return

        # Calculate delta
        dx = event.x - self.pan_start[0]
        dy = event.y - self.pan_start[1]

        # Update pan offset
        self.pan_offset[0] += dx
        self.pan_offset[1] += dy

        # Update start position for next delta
        self.pan_start = [event.x, event.y]

        # Redraw
        self.display_image()

    def on_pan_end(self, event):
        """Stop panning when mouse button is released.

        Args:
            event: Mouse button release event
        """
        self.is_panning = False
        self.canvas.config(cursor="")

    def show_about(self):
        """Show the About dialog."""
        messagebox.showinfo(
            "About Icon Cropper Config Editor",
            "Icon Cropper Configuration Editor\n\n"
            "A visual tool for configuring the icon cropper.\n"
            "Allows you to define grid layouts and OCR regions\n"
            "by drawing on screenshots instead of manually\n"
            "editing config.yaml.\n\n"
            "Part of the Stella Sora Request Assistant project."
        )

    def quit_app(self):
        """Quit the application."""
        if messagebox.askokcancel("Quit", "Do you want to quit?"):
            self.root.quit()


def main():
    """Main entry point for the Config Editor."""
    # Check if we're on Windows
    if sys.platform != 'win32':
        print("Warning: Window capture is only supported on Windows.")
        print("You can still open existing screenshots.")

    # Create the main window
    root = tk.Tk()
    app = ConfigEditorApp(root)

    # Run the application
    root.mainloop()


if __name__ == "__main__":
    main()
