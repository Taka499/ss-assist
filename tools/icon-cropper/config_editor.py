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
from editor.ocr_editor import OCREditor
from editor.ocr_resize_controller import OCRResizeController
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

        # Initialize OCR configuration (from config.yaml ocr section)
        default_ocr = self.config.get('ocr', {}).get('detection_region', [0, 0, 0, 0])
        self.ocr_config = {
            'x': default_ocr[0] if len(default_ocr) >= 1 else 0,
            'y': default_ocr[1] if len(default_ocr) >= 2 else 0,
            'width': default_ocr[2] if len(default_ocr) >= 3 else 0,
            'height': default_ocr[3] if len(default_ocr) >= 4 else 0,
        }

        # Track whether user has drawn grid/OCR (don't show default config unless drawn)
        self.grid_drawn = False
        self.ocr_drawn = False

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

        self.ocr_editor = OCREditor(
            self.ocr_config,
            on_instruction_update=self._update_instruction_label,
            on_status_update=self.update_status
        )

        self.ocr_resize_controller = OCRResizeController(
            self.ocr_config,
            self.ocr_inputs,
            self.ocr_editor
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
            'enter_pan_mode': self.enter_pan_mode
        }

        ui_builder = UIBuilder(self.root, callbacks)

        # Create menu bar
        ui_builder.create_menu_bar()

        # Create main layout
        (self.left_panel, self.canvas, self.instruction_label,
         self.status_bar, grid_tab, ocr_tab) = ui_builder.create_main_layout()

        # Create grid input widgets in Grid tab
        self.grid_inputs = ui_builder.create_grid_inputs(
            grid_tab,
            self.grid_config,
            on_change_callback=self._on_grid_param_changed
        )

        # Create OCR input widgets in OCR tab
        self.ocr_inputs = ui_builder.create_ocr_inputs(
            ocr_tab,
            self.ocr_config,
            on_change_callback=self._on_ocr_param_changed
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

        Shows overlays if:
        - Currently in drawing mode (to show crosshair/drag preview), OR
        - Already drawn (to show persistent overlay)
        """
        # Show grid overlay if actively drawing OR if it has been drawn
        if self.grid_editor.is_in_grid_edit_mode() or self.grid_drawn:
            self.draw_grid_overlay()

        # Show OCR overlay if actively drawing OR if it has been drawn
        if self.ocr_editor.is_in_ocr_edit_mode() or self.ocr_drawn:
            self.draw_ocr_overlay()

    def _on_grid_param_changed(self):
        """Handle changes to grid parameters from input fields."""
        self.grid_editor.on_grid_param_changed(self.grid_inputs)
        # Always update display if grid has been drawn
        if self.grid_drawn:
            self.canvas_controller.display_image()

    def _on_ocr_param_changed(self):
        """Handle changes to OCR region parameters from input fields."""
        self.ocr_editor.on_ocr_param_changed(self.ocr_inputs)
        # Always update display if OCR has been drawn
        if self.ocr_drawn:
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
        """Enter grid drawing mode."""
        if self.canvas_controller.current_image is None:
            messagebox.showwarning("No Image", "Please load or capture a screenshot first.")
            return

        # Exit OCR mode if active
        if self.ocr_editor.is_in_ocr_edit_mode():
            self.ocr_editor.exit_ocr_edit_mode(self.canvas)

        success = self.grid_editor.enter_grid_edit_mode(
            self.canvas,
            self.canvas_controller.current_image
        )

        if not success:
            return

        self.canvas_controller.display_image()

    def enter_ocr_edit_mode(self):
        """Enter OCR region drawing mode."""
        if self.canvas_controller.current_image is None:
            messagebox.showwarning("No Image", "Please load or capture a screenshot first.")
            return

        # Exit grid mode if active
        if self.grid_editor.is_in_grid_edit_mode():
            self.grid_editor.exit_edit_mode(self.canvas)

        success = self.ocr_editor.enter_ocr_edit_mode(
            self.canvas,
            self.canvas_controller.current_image
        )

        if not success:
            return

        self.canvas_controller.display_image()

    def enter_pan_mode(self):
        """Enter pan/zoom mode (normal mode)."""
        # Exit any active editing mode
        self.grid_editor.exit_edit_mode(self.canvas)
        self.ocr_editor.exit_ocr_edit_mode(self.canvas)
        self.canvas_controller.display_image()

    # ========== Mouse Event Handlers ==========

    def on_mouse_press(self, event):
        """Handle mouse button press.

        Routes to appropriate handler based on current mode and context.

        Args:
            event: Mouse button press event
        """
        # Note: Resize handles are bound directly via tag_bind in GridRenderer
        # and handle clicks through callbacks, so we don't check for them here

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

        # Check if in OCR edit mode
        if self.ocr_editor.is_in_ocr_edit_mode():
            self.ocr_editor.on_ocr_click(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset
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
        # Check if resizing grid
        if self.resize_controller.is_resizing:
            # Performance optimization: Skip spinbox updates during drag
            self.resize_controller.do_resize(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                update_spinboxes=False  # Defer to mouse release
            )
            # Optimized: Only redraw grid overlay during drag, NOT handles
            # Handles are expensive to redraw (24 event unbind/rebind operations)
            self.canvas.delete("grid_overlay")
            # Draw grid WITHOUT handles during drag
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
            # Handles and spinboxes will be updated on mouse release
            return

        # Check if resizing OCR region
        if self.ocr_resize_controller.is_resizing:
            self.ocr_resize_controller.do_resize(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                update_spinboxes=False  # Defer to mouse release
            )
            # Redraw OCR overlay during drag, NOT handles
            self.canvas.delete("ocr_overlay")
            self.grid_renderer.draw_ocr_overlay(
                self.canvas,
                self.ocr_config,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                is_active=True,
                is_defining=False  # During resize, we're in ADJUST step
            )
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

        # Check if dragging OCR region
        if self.ocr_editor.is_dragging():
            self.ocr_editor.on_ocr_drag(
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
        # Check if resizing grid
        if self.resize_controller.is_resizing:
            self.resize_controller.end_resize(event, self.canvas)
            # Update spinboxes with final values (skipped during drag for performance)
            self.grid_editor.updating_inputs_programmatically = True
            try:
                for param, var in self.grid_inputs.items():
                    if param in self.grid_config:
                        var.set(self.grid_config[param])
            finally:
                self.grid_editor.updating_inputs_programmatically = False
            # Redraw grid with handles after resize completes
            self.canvas.delete("grid_overlay")
            self.draw_grid_overlay()
            return

        # Check if resizing OCR region
        if self.ocr_resize_controller.is_resizing:
            self.ocr_resize_controller.end_resize(event, self.canvas)
            # Redraw OCR overlay with handles after resize completes
            self.canvas.delete("ocr_overlay")
            self.draw_ocr_overlay()
            return

        # Check if completing grid cell definition
        if self.grid_editor.is_dragging_cell():
            self.grid_editor.on_grid_release(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                self.grid_inputs
            )
            # Mark grid as drawn
            self.grid_drawn = True
            self.canvas_controller.display_image()
            return

        # Check if completing OCR region definition
        if self.ocr_editor.is_dragging():
            self.ocr_editor.on_ocr_release(
                event, self.canvas,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                self.ocr_inputs
            )
            # Mark OCR as drawn
            self.ocr_drawn = True
            self.canvas_controller.display_image()
            return

        # Normal panning end
        self.canvas_controller.end_pan(event)

    # ========== Grid Overlay Drawing ==========

    def draw_grid_overlay(self):
        """Draw the grid overlay on the canvas.

        Always shows the grid if drawn. Shows handles only in grid edit mode.
        """
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

        # Draw resize handles only in ADJUST step (after user finishes drawing)
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

    def draw_ocr_overlay(self):
        """Draw the OCR region overlay on the canvas.

        Always shows the OCR region if drawn. Shows handles only in OCR edit mode.
        """
        if self.canvas_controller.current_image is None:
            return

        # Draw OCR overlay
        self.grid_renderer.draw_ocr_overlay(
            self.canvas,
            self.ocr_config,
            self.canvas_controller.zoom_level,
            self.canvas_controller.pan_offset,
            is_active=self.ocr_editor.is_in_ocr_edit_mode(),
            is_defining=(self.ocr_editor.edit_step == "define"),
            drag_start=self.ocr_editor.drag_start,
            drag_current=self.ocr_editor.drag_current
        )

        # Draw resize handles only in ADJUST step (after user finishes drawing)
        if self.ocr_editor.is_in_adjust_step():
            self.grid_renderer.draw_ocr_resize_handles(
                self.canvas,
                self.ocr_config,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                self._on_ocr_handle_click
            )

    def _on_ocr_handle_click(self, event, handle_tag: str):
        """Callback for OCR resize handle clicks (from GridRenderer).

        Args:
            event: Mouse button press event
            handle_tag: OCR handle identifier (e.g., 'ocr_corner_br')

        Returns:
            'break' to stop event propagation
        """
        self.ocr_resize_controller.on_handle_click(
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
