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
from pathlib import Path
from PIL import Image
import threading
import subprocess
import time

# Import capture functionality
from capture import WindowNotFoundError
from utils import load_config

# Import editor modules
from editor.canvas_controller import CanvasController
from editor.grid_editor import GridEditor, EditMode, GridEditStep
from editor.grid_renderer import GridRenderer
from editor.resize_controller import ResizeController
from editor.ui_builder import UIBuilder


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

        # Load configuration
        self.config = load_config()

        # Initialize grid configuration (from config.yaml character_select page)
        default_grid = self.config.get('pages', {}).get('character_select', {}).get('grid', {})
        self.grid_config = {
            'start_x': default_grid.get('start_x', 0),
            'start_y': default_grid.get('start_y', 0),
            'cell_width': default_grid.get('cell_width', 100),
            'cell_height': default_grid.get('cell_height', 100),
            'spacing_x': default_grid.get('spacing_x', 0),
            'spacing_y': default_grid.get('spacing_y', 0),
            'columns': default_grid.get('columns', 3),
            'rows': default_grid.get('rows', 4),
            'crop_padding': default_grid.get('crop_padding', 0),
        }

        # Build UI first (need canvas and widgets before initializing controllers)
        self._build_ui()

        # Initialize controllers
        self.canvas_controller = CanvasController(
            self.canvas,
            on_display_callback=self._on_display_complete
        )

        self.grid_editor = GridEditor(
            self.grid_config,
            on_instruction_update=self._update_instruction_label,
            on_status_update=self.update_status
        )

        self.grid_renderer = GridRenderer()

        self.resize_controller = ResizeController(
            self.grid_config,
            self.grid_inputs,
            self.grid_editor
        )

        # Bind events
        self._bind_events()

    def _build_ui(self):
        """Build the application UI using UIBuilder."""
        # Create callback dictionary for UIBuilder
        callbacks = {
            'open_screenshot': self.open_screenshot,
            'capture_screenshot': self.capture_screenshot,
            'quit_app': self.quit_app,
            'zoom_in': lambda: self.canvas_controller.zoom_in() if hasattr(self, 'canvas_controller') else None,
            'zoom_out': lambda: self.canvas_controller.zoom_out() if hasattr(self, 'canvas_controller') else None,
            'reset_zoom': lambda: self.canvas_controller.reset_zoom() if hasattr(self, 'canvas_controller') else None,
            'show_about': self.show_about,
            'enter_grid_edit_mode': self.enter_grid_edit_mode,
            'enter_ocr_edit_mode': self.enter_ocr_edit_mode,
            'exit_edit_mode': self.exit_edit_mode
        }

        ui_builder = UIBuilder(self.root, callbacks)

        # Create menu bar
        ui_builder.create_menu_bar()

        # Create main layout
        self.left_panel, self.canvas, self.instruction_label, self.status_bar = (
            ui_builder.create_main_layout()
        )

        # Create grid input widgets
        self.grid_inputs = ui_builder.create_grid_inputs(
            self.left_panel,
            self.grid_config,
            on_change_callback=self._on_grid_param_changed
        )

    def _bind_events(self):
        """Bind mouse and keyboard events."""
        # Mouse events
        self.canvas.bind("<ButtonPress-1>", self.on_mouse_press)
        self.canvas.bind("<B1-Motion>", self.on_mouse_move)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_release)

        # Mouse wheel for zooming/scrolling
        self.canvas.bind("<MouseWheel>", self.canvas_controller.on_mouse_wheel)
        # For Linux
        self.canvas.bind("<Button-4>", lambda e: self.canvas_controller.on_mouse_wheel_linux(e, 1))
        self.canvas.bind("<Button-5>", lambda e: self.canvas_controller.on_mouse_wheel_linux(e, -1))

        # Keyboard shortcuts
        self.root.bind('<Control-o>', lambda e: self.open_screenshot())
        self.root.bind('<Control-g>', lambda e: self.capture_screenshot())
        self.root.bind('<Control-q>', lambda e: self.quit_app())

    def _on_display_complete(self):
        """Callback invoked after canvas display is complete.

        Draws grid overlay if in grid edit mode.
        """
        if self.grid_editor.is_in_grid_edit_mode():
            self.draw_grid_overlay()

    def _on_grid_param_changed(self):
        """Handle changes to grid parameters from input fields."""
        self.grid_editor.on_grid_param_changed(self.grid_inputs)
        if self.grid_editor.is_in_grid_edit_mode():
            self.canvas_controller.display_image()

    def _update_instruction_label(self, text: str, color: str):
        """Update the instruction label text and color.

        Args:
            text: Instruction text to display
            color: Text color (e.g., 'blue', 'green')
        """
        self.instruction_label.config(text=text, foreground=color)

    def update_status(self, message: str):
        """Update the status bar message.

        Args:
            message: Status message to display
        """
        self.status_bar.config(text=message)
        self.root.update_idletasks()

    # ========== Screenshot Operations ==========

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
                image = Image.open(file_path)
                self.canvas_controller.load_image(image)
                self.canvas_controller.center_image()
                self.canvas_controller.display_image()
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
        self.canvas_controller.load_image(image)
        self.canvas_controller.center_image()
        self.canvas_controller.display_image()
        self.update_status(f"Captured: {self.canvas_controller.current_image.size[0]}x{self.canvas_controller.current_image.size[1]}")

    def _on_capture_error(self, title: str, message: str):
        """Handle capture error (called in main thread).

        Args:
            title: Error dialog title
            message: Error message
        """
        messagebox.showerror(title, message)
        self.update_status("Capture failed")

    # ========== Mode Management ==========

    def enter_grid_edit_mode(self):
        """Enter grid editing mode."""
        success = self.grid_editor.enter_grid_edit_mode(
            self.canvas,
            self.canvas_controller.current_image
        )

        if not success:
            messagebox.showwarning("No Image", "Please load or capture a screenshot first.")
            return

        self.canvas_controller.display_image()

    def enter_ocr_edit_mode(self):
        """Enter OCR region editing mode (Milestone 3)."""
        messagebox.showinfo("Coming Soon", "OCR region editing will be available in Milestone 3")

    def exit_edit_mode(self):
        """Exit editing mode and return to normal view."""
        self.grid_editor.exit_edit_mode(self.canvas)
        self.canvas_controller.display_image()

    # ========== Mouse Event Handlers ==========

    def on_mouse_press(self, event):
        """Handle mouse button press.

        Routes to appropriate handler based on current mode and context.

        Args:
            event: Mouse button press event
        """
        # Check if clicking on a resize handle
        items_under_cursor = self.canvas.find_withtag(tk.CURRENT)
        if items_under_cursor:
            tags = self.canvas.gettags(items_under_cursor[0])
            if 'resize_handle' in tags:
                # Find the handle tag (e.g., 'corner_br')
                handle_tag = [t for t in tags if t.startswith(('corner_', 'edge_'))][0]
                self.resize_controller.on_handle_click(
                    event, handle_tag, self.canvas,
                    self.canvas_controller.zoom_level,
                    self.canvas_controller.pan_offset
                )
                return

        # Check if in grid edit mode
        if self.grid_editor.is_in_grid_edit_mode():
            self.grid_editor.on_grid_click(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                self.grid_inputs
            )
            self.canvas_controller.display_image()
            return

        # Normal panning mode
        self.canvas_controller.start_pan(event)

    def on_mouse_move(self, event):
        """Handle mouse motion.

        Routes to appropriate handler based on current operation.

        Args:
            event: Mouse motion event
        """
        # Check if resizing
        if self.resize_controller.is_resizing:
            self.resize_controller.do_resize(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset
            )
            # Optimized: Only redraw grid overlay, not entire canvas
            self.canvas.delete("grid_overlay")
            self.draw_grid_overlay()
            return

        # Check if dragging grid cell
        if self.grid_editor.is_dragging_cell():
            self.grid_editor.on_grid_drag(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset
            )
            self.canvas_controller.display_image()
            return

        # Normal panning
        self.canvas_controller.update_pan(event)

    def on_mouse_release(self, event):
        """Handle mouse button release.

        Routes to appropriate handler based on current operation.

        Args:
            event: Mouse button release event
        """
        # Check if resizing
        if self.resize_controller.is_resizing:
            self.resize_controller.end_resize(event, self.canvas)
            return

        # Check if completing grid cell definition
        if self.grid_editor.is_dragging_cell():
            self.grid_editor.on_grid_release(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                self.grid_inputs
            )
            self.canvas_controller.display_image()
            return

        # Normal panning end
        self.canvas_controller.end_pan(event)

    # ========== Grid Overlay Drawing ==========

    def draw_grid_overlay(self):
        """Draw the grid overlay on the canvas."""
        if self.canvas_controller.current_image is None:
            return

        # Draw grid overlay
        self.grid_renderer.draw_grid_overlay(
            self.canvas,
            self.grid_config,
            self.canvas_controller.zoom_level,
            self.canvas_controller.pan_offset,
            self.grid_editor.edit_mode,
            self.grid_editor.grid_edit_step,
            self.grid_editor.grid_temp_start,
            self.grid_editor.grid_drag_start,
            self.grid_editor.grid_drag_current
        )

        # Draw resize handles if in adjust step
        if self.grid_editor.is_in_adjust_step():
            self.grid_renderer.draw_resize_handles(
                self.canvas,
                self.grid_config,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                self._on_handle_click
            )

    def _on_handle_click(self, event, handle_tag: str):
        """Callback for resize handle clicks (from GridRenderer).

        Args:
            event: Mouse button press event
            handle_tag: Handle identifier (e.g., 'corner_br')

        Returns:
            'break' to stop event propagation
        """
        self.resize_controller.on_handle_click(
            event, handle_tag, self.canvas,
            self.canvas_controller.zoom_level,
            self.canvas_controller.pan_offset
        )
        return 'break'

    # ========== Application Lifecycle ==========

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
