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
from editor.ocr_editor import OCREditor, OCREditStep
from editor.ocr_resize_controller import OCRResizeController
from editor.ui_builder import UIBuilder
from editor.config_serializer import ConfigSerializer
from editor.preview_controller import PreviewController
from editor.preview_window import PreviewWindow


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

        # Initialize configuration serializer
        config_path = Path(__file__).parent / "config.yaml"
        self.config_serializer = ConfigSerializer(config_path)

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

        self.preview_controller = PreviewController()

        # Bind events
        self._bind_events()

    def _build_ui(self):
        """Build the application UI using UIBuilder."""
        # Create callback dictionary for UIBuilder
        callbacks = {
            'open_screenshot': self.open_screenshot,
            'capture_screenshot': self.capture_screenshot,
            'load_from_config': self.load_from_config,
            'preview_icons': self.preview_icons,
            'save_config': self.save_config,
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
        self.root.bind('<Control-l>', lambda e: self.load_from_config())
        self.root.bind('<Control-p>', lambda e: self.preview_icons())
        self.root.bind('<Control-s>', lambda e: self.save_config())
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

    def load_from_config(self):
        """Load grid and OCR configuration from config.yaml and display overlays."""
        try:
            # Reload config to get latest values
            self.config = load_config()

            # Check if image is loaded
            if self.canvas_controller.current_image is None:
                messagebox.showinfo(
                    "No Image Loaded",
                    "Please load or capture a screenshot first.\n\n"
                    "The configuration will be applied to the image."
                )
                return

            # Load grid configuration from config.yaml
            default_grid = self.config.get('pages', {}).get('character_select', {}).get('grid', {})

            # Check if grid config exists and has valid values
            has_grid = (
                default_grid.get('cell_width', 0) > 0 and
                default_grid.get('cell_height', 0) > 0
            )

            if has_grid:
                # Update grid_config
                self.grid_config['start_x'] = default_grid.get('start_x', 0)
                self.grid_config['start_y'] = default_grid.get('start_y', 0)
                self.grid_config['cell_width'] = default_grid.get('cell_width', 100)
                self.grid_config['cell_height'] = default_grid.get('cell_height', 100)
                self.grid_config['spacing_x'] = default_grid.get('spacing_x', 0)
                self.grid_config['spacing_y'] = default_grid.get('spacing_y', 0)
                self.grid_config['columns'] = default_grid.get('columns', 3)
                self.grid_config['rows'] = default_grid.get('rows', 4)
                self.grid_config['crop_padding'] = default_grid.get('crop_padding', 0)

                # Update grid input widgets
                for param, var in self.grid_inputs.items():
                    if param in self.grid_config:
                        var.set(self.grid_config[param])

                # Mark grid as drawn
                self.grid_drawn = True
                self.grid_editor.grid_edit_step = GridEditStep.ADJUST

            # Load OCR configuration from config.yaml
            default_ocr = self.config.get('ocr', {}).get('detection_region', [0, 0, 0, 0])

            # Check if OCR config exists and has valid values
            has_ocr = len(default_ocr) >= 4 and default_ocr[2] > 0 and default_ocr[3] > 0

            if has_ocr:
                # Update ocr_config
                self.ocr_config['x'] = default_ocr[0]
                self.ocr_config['y'] = default_ocr[1]
                self.ocr_config['width'] = default_ocr[2]
                self.ocr_config['height'] = default_ocr[3]

                # Update OCR input widgets
                for param, var in self.ocr_inputs.items():
                    if param in self.ocr_config:
                        var.set(self.ocr_config[param])

                # Mark OCR as drawn and set to ADJUST step
                self.ocr_drawn = True
                self.ocr_editor.edit_step = OCREditStep.ADJUST

            # Display the overlays
            self.canvas_controller.display_image()

            # Provide feedback
            loaded = []
            if has_grid:
                loaded.append("Grid layout")
            if has_ocr:
                loaded.append("OCR region")

            if loaded:
                messagebox.showinfo(
                    "Configuration Loaded",
                    f"Successfully loaded from config.yaml:\n\n"
                    f"• {chr(10).join(loaded)}\n\n"
                    f"You can now adjust the overlays using handles or spinboxes."
                )
                self.update_status(f"Loaded: {', '.join(loaded)}")
            else:
                messagebox.showwarning(
                    "No Configuration Found",
                    "No valid grid or OCR configuration found in config.yaml.\n\n"
                    "Please draw the grid and OCR region manually."
                )
                self.update_status("No config to load")

        except Exception as e:
            messagebox.showerror(
                "Load Error",
                f"Failed to load configuration:\n\n{str(e)}"
            )
            self.update_status("Load failed")

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

    def preview_icons(self):
        """Preview extracted icons from the current grid configuration."""
        try:
            # Validate that we have everything needed for preview
            is_valid, error_msg = self.preview_controller.validate_grid_for_preview(
                self.canvas_controller.current_image,
                self.grid_config
            )

            if not is_valid:
                messagebox.showwarning(
                    "Cannot Preview",
                    error_msg
                )
                return

            # Check if grid has been drawn
            if not self.grid_drawn:
                messagebox.showinfo(
                    "Grid Not Drawn",
                    "Please draw a grid layout first before previewing icons.\n\n"
                    "Click '🔲 Draw Grid Layout' to start."
                )
                return

            # Extract icons
            self.update_status("Extracting icons...")
            icons = self.preview_controller.extract_icons(
                self.canvas_controller.current_image,
                self.grid_config
            )

            if not icons:
                messagebox.showwarning(
                    "No Icons Extracted",
                    "No icons were extracted from the grid.\n"
                    "Please check your grid configuration."
                )
                return

            # Open preview window
            self.update_status(f"Extracted {len(icons)} icons")
            PreviewWindow(
                self.root,
                icons,
                self.grid_config['columns'],
                self.grid_config['rows']
            )

        except Exception as e:
            messagebox.showerror(
                "Preview Error",
                f"An error occurred while generating preview:\n\n{str(e)}"
            )
            self.update_status("Preview failed")

    def save_config(self):
        """Save the current configuration to config.yaml."""
        try:
            # Check if we have an image loaded (needed for validation)
            if self.canvas_controller.current_image is None:
                messagebox.showwarning(
                    "No Image",
                    "Please load or capture a screenshot before saving.\n"
                    "The image dimensions are needed for validation."
                )
                return

            image_width = self.canvas_controller.current_image.width
            image_height = self.canvas_controller.current_image.height

            # Validate grid configuration if grid has been drawn
            if self.grid_drawn:
                is_valid, error_msg = self.config_serializer.validate_grid_config(
                    self.grid_config,
                    image_width,
                    image_height
                )
                if not is_valid:
                    messagebox.showerror(
                        "Invalid Grid Configuration",
                        f"Grid validation failed:\n\n{error_msg}\n\n"
                        "Please adjust the grid settings and try again."
                    )
                    return

            # Validate OCR region if it has been drawn
            ocr_region = None
            if self.ocr_drawn:
                ocr_region = [
                    self.ocr_config['x'],
                    self.ocr_config['y'],
                    self.ocr_config['width'],
                    self.ocr_config['height']
                ]
                is_valid, error_msg = self.config_serializer.validate_ocr_region(
                    ocr_region,
                    image_width,
                    image_height
                )
                if not is_valid:
                    messagebox.showerror(
                        "Invalid OCR Region",
                        f"OCR region validation failed:\n\n{error_msg}\n\n"
                        "Please adjust the OCR region and try again."
                    )
                    return

            # Load current config for updating
            config, load_error = self.config_serializer.load()
            if load_error:
                messagebox.showerror("Load Error", f"Failed to load config:\n{load_error}")
                return

            # Save configuration (always save grid if drawn, optionally save OCR)
            if self.grid_drawn:
                success, save_error = self.config_serializer.save(
                    config,
                    'character_select',  # Currently hardcoded to character_select page
                    self.grid_config,
                    ocr_region=ocr_region if self.ocr_drawn else None,
                    create_backup=True
                )

                if success:
                    messagebox.showinfo(
                        "Configuration Saved",
                        "Configuration has been saved successfully!\n\n"
                        f"Grid settings updated for 'character_select' page.\n"
                        + ("OCR region updated.\n" if self.ocr_drawn else "")
                        + "\nA backup of the previous config has been created."
                    )
                    self.update_status("Configuration saved successfully")
                else:
                    messagebox.showerror("Save Error", f"Failed to save config:\n{save_error}")
                    self.update_status("Configuration save failed")
            else:
                messagebox.showwarning(
                    "Nothing to Save",
                    "Please draw a grid layout before saving.\n\n"
                    "Use the '🔲 Draw Grid Layout' button to define the grid."
                )

        except Exception as e:
            messagebox.showerror("Error", f"An unexpected error occurred:\n{str(e)}")
            self.update_status("Configuration save failed")

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
