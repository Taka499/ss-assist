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
from typing import Optional, Tuple
from pathlib import Path
from PIL import Image, ImageTk, ImageDraw
import threading
import subprocess
import tempfile
import time
from enum import Enum

# Import capture functionality
from capture import WindowNotFoundError
from utils import load_config


class EditMode(Enum):
    """Editing modes for the configuration editor."""
    NONE = "none"
    GRID_EDIT = "grid_edit"
    OCR_EDIT = "ocr_edit"


class GridEditStep(Enum):
    """Steps in the grid editing workflow."""
    SET_START = "set_start"  # Click to set grid start position
    SET_CELL = "set_cell"    # Drag to define cell dimensions
    ADJUST = "adjust"        # Fine-tune with inputs


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

        # Editing mode state
        self.edit_mode = EditMode.NONE
        self.grid_edit_step = GridEditStep.SET_START

        # Grid configuration state (from config.yaml character_select page)
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

        # Grid editing temporary state
        self.grid_temp_start: Optional[Tuple[int, int]] = None
        self.grid_drag_start: Optional[Tuple[int, int]] = None
        self.grid_drag_current: Optional[Tuple[int, int]] = None

        # Grid resize state
        self.resize_mode: Optional[str] = None  # 'edge_left', 'edge_right', 'edge_top', 'edge_bottom',
                                                  # 'corner_tl', 'corner_tr', 'corner_bl', 'corner_br'
        self.resize_start_pos: Optional[Tuple[int, int]] = None  # Mouse position at resize start
        self.resize_original_config: Optional[dict] = None  # Grid config snapshot at resize start
        self.is_resizing = False
        self.updating_inputs_programmatically = False  # Flag to prevent trace callback loops

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

        # Left panel for tools
        self.left_panel = ttk.Frame(main_frame, width=280)
        self.left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        self.left_panel.pack_propagate(False)  # Maintain fixed width

        ttk.Label(self.left_panel, text="Tools", font=("Arial", 12, "bold")).pack(pady=5)

        # Screenshot buttons
        screenshot_frame = ttk.LabelFrame(self.left_panel, text="Screenshot", padding=10)
        screenshot_frame.pack(fill=tk.X, pady=5)

        ttk.Button(
            screenshot_frame,
            text="📂 Open Screenshot",
            command=self.open_screenshot
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            screenshot_frame,
            text="📷 Capture Screenshot",
            command=self.capture_screenshot
        ).pack(fill=tk.X, pady=2)

        # Mode selection buttons
        mode_frame = ttk.LabelFrame(self.left_panel, text="Editing Mode", padding=10)
        mode_frame.pack(fill=tk.X, pady=5)

        self.grid_mode_btn = ttk.Button(
            mode_frame,
            text="Edit Grid Layout",
            command=self.enter_grid_edit_mode
        )
        self.grid_mode_btn.pack(fill=tk.X, pady=2)

        self.ocr_mode_btn = ttk.Button(
            mode_frame,
            text="Edit OCR Region",
            command=self.enter_ocr_edit_mode,
            state=tk.DISABLED  # Milestone 3
        )
        self.ocr_mode_btn.pack(fill=tk.X, pady=2)

        ttk.Button(
            mode_frame,
            text="Exit Edit Mode",
            command=self.exit_edit_mode
        ).pack(fill=tk.X, pady=2)

        # Grid configuration panel
        self.grid_panel = ttk.LabelFrame(self.left_panel, text="Grid Configuration", padding=10)
        self.grid_panel.pack(fill=tk.BOTH, expand=True, pady=5)

        # Instructions label
        self.instruction_label = ttk.Label(
            self.grid_panel,
            text="Click 'Edit Grid Layout' to begin",
            wraplength=240,
            foreground="blue"
        )
        self.instruction_label.pack(pady=5)

        # Grid parameter inputs
        self._create_grid_inputs()

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

    def _create_grid_inputs(self):
        """Create input fields for grid configuration."""
        # Create a scrollable frame for inputs
        inputs_frame = ttk.Frame(self.grid_panel)
        inputs_frame.pack(fill=tk.BOTH, expand=True)

        self.grid_inputs = {}

        # Position inputs
        row = 0
        ttk.Label(inputs_frame, text="Position:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(5, 2)
        )
        row += 1

        for param in ['start_x', 'start_y']:
            label = param.replace('_', ' ').title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(row=row, column=0, sticky=tk.W, pady=2)

            var = tk.IntVar(value=self.grid_config[param])
            spinbox = ttk.Spinbox(inputs_frame, textvariable=var, width=8, from_=0, to=9999, increment=1)
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            self.grid_inputs[param] = var
            var.trace_add('write', lambda *args: self.on_grid_param_changed())
            row += 1

        # Cell dimensions
        ttk.Label(inputs_frame, text="Cell Size:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(10, 2)
        )
        row += 1

        for param in ['cell_width', 'cell_height']:
            label = param.replace('_', ' ').title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(row=row, column=0, sticky=tk.W, pady=2)

            var = tk.IntVar(value=self.grid_config[param])
            spinbox = ttk.Spinbox(inputs_frame, textvariable=var, width=8, from_=1, to=9999, increment=1)
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            self.grid_inputs[param] = var
            var.trace_add('write', lambda *args: self.on_grid_param_changed())
            row += 1

        # Spacing
        ttk.Label(inputs_frame, text="Spacing:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(10, 2)
        )
        row += 1

        for param in ['spacing_x', 'spacing_y']:
            label = param.replace('_', ' ').title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(row=row, column=0, sticky=tk.W, pady=2)

            var = tk.IntVar(value=self.grid_config[param])
            spinbox = ttk.Spinbox(inputs_frame, textvariable=var, width=8, from_=0, to=999, increment=1)
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            self.grid_inputs[param] = var
            var.trace_add('write', lambda *args: self.on_grid_param_changed())
            row += 1

        # Grid dimensions
        ttk.Label(inputs_frame, text="Grid Size:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(10, 2)
        )
        row += 1

        for param in ['columns', 'rows']:
            label = param.title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(row=row, column=0, sticky=tk.W, pady=2)

            var = tk.IntVar(value=self.grid_config[param])
            spinbox = ttk.Spinbox(inputs_frame, textvariable=var, width=8, from_=1, to=99, increment=1)
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            self.grid_inputs[param] = var
            var.trace_add('write', lambda *args: self.on_grid_param_changed())
            row += 1

        # Crop padding
        ttk.Label(inputs_frame, text="Crop Padding:").grid(row=row, column=0, sticky=tk.W, pady=2)
        var = tk.IntVar(value=self.grid_config['crop_padding'])
        spinbox = ttk.Spinbox(inputs_frame, textvariable=var, width=8, from_=0, to=99, increment=1)
        spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        self.grid_inputs['crop_padding'] = var
        var.trace_add('write', lambda *args: self.on_grid_param_changed())

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
                self.center_image()
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
        self.center_image()
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

    def center_image(self):
        """Center the current image in the canvas viewport."""
        if self.current_image is None:
            return

        # Get canvas dimensions
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()

        # Get image dimensions (at current zoom)
        img_width = self.current_image.size[0] * self.zoom_level
        img_height = self.current_image.size[1] * self.zoom_level

        # Calculate center position
        self.pan_offset[0] = (canvas_width - img_width) / 2
        self.pan_offset[1] = (canvas_height - img_height) / 2

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

        # Update scroll region with padding to allow centering any corner
        # Add half-canvas padding so corners can be scrolled to center
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        padding_x = canvas_width / 2
        padding_y = canvas_height / 2

        self.canvas.config(scrollregion=(
            min(0, self.pan_offset[0]) - padding_x,  # Extend left
            min(0, self.pan_offset[1]) - padding_y,  # Extend top
            max(width, width + self.pan_offset[0]) + padding_x,  # Extend right
            max(height, height + self.pan_offset[1]) + padding_y  # Extend bottom
        ))

        # Draw grid overlay if in grid edit mode
        if self.edit_mode == EditMode.GRID_EDIT:
            self.draw_grid_overlay()

    def zoom_in(self, cursor_x: Optional[int] = None, cursor_y: Optional[int] = None):
        """Zoom in the image.

        Args:
            cursor_x: X coordinate to zoom towards (canvas widget coordinates)
            cursor_y: Y coordinate to zoom towards (canvas widget coordinates)
        """
        old_zoom = self.zoom_level
        self.zoom_level = min(self.zoom_level * 1.2, 10.0)

        if cursor_x is not None and cursor_y is not None:
            self._adjust_pan_for_zoom(cursor_x, cursor_y, old_zoom, self.zoom_level)

        self.display_image()
        self.update_status(f"Zoom: {int(self.zoom_level * 100)}%")

    def zoom_out(self, cursor_x: Optional[int] = None, cursor_y: Optional[int] = None):
        """Zoom out the image.

        Args:
            cursor_x: X coordinate to zoom towards (canvas widget coordinates)
            cursor_y: Y coordinate to zoom towards (canvas widget coordinates)
        """
        old_zoom = self.zoom_level
        self.zoom_level = max(self.zoom_level / 1.2, 0.1)

        if cursor_x is not None and cursor_y is not None:
            self._adjust_pan_for_zoom(cursor_x, cursor_y, old_zoom, self.zoom_level)

        self.display_image()
        self.update_status(f"Zoom: {int(self.zoom_level * 100)}%")

    def reset_zoom(self):
        """Reset zoom to 100%."""
        self.zoom_level = 1.0
        self.pan_offset = [0, 0]
        self.display_image()
        self.update_status("Zoom: 100%")

    def _adjust_pan_for_zoom(self, cursor_x: int, cursor_y: int, old_zoom: float, new_zoom: float):
        """Adjust pan offset so that the cursor stays at the same image position during zoom.

        Args:
            cursor_x: X coordinate of cursor (canvas widget coordinates)
            cursor_y: Y coordinate of cursor (canvas widget coordinates)
            old_zoom: Previous zoom level
            new_zoom: New zoom level
        """
        # Convert cursor position to canvas coordinates (accounting for scroll)
        cursor_canvas_x = self.canvas.canvasx(cursor_x)
        cursor_canvas_y = self.canvas.canvasy(cursor_y)

        # Get image coordinates at cursor position before zoom
        img_x = (cursor_canvas_x - self.pan_offset[0]) / old_zoom
        img_y = (cursor_canvas_y - self.pan_offset[1]) / old_zoom

        # Calculate new pan offset so cursor stays at same image position
        self.pan_offset[0] = cursor_canvas_x - img_x * new_zoom
        self.pan_offset[1] = cursor_canvas_y - img_y * new_zoom

    def on_mouse_wheel(self, event):
        """Handle mouse wheel for scrolling and zooming (Windows/Mac).

        Args:
            event: Mouse wheel event
        """
        if self.current_image is None:
            return

        # Check for modifier keys
        if event.state & 0x0004:  # Control key
            # Ctrl + Wheel: Zoom in/out towards cursor
            if event.delta > 0:
                self.zoom_in(event.x, event.y)
            else:
                self.zoom_out(event.x, event.y)
        elif event.state & 0x0001:  # Shift key
            # Shift + Wheel: Scroll horizontally
            if event.delta > 0:
                self.canvas.xview_scroll(-1, "units")
            else:
                self.canvas.xview_scroll(1, "units")
        else:
            # No modifier: Scroll vertically
            if event.delta > 0:
                self.canvas.yview_scroll(-1, "units")
            else:
                self.canvas.yview_scroll(1, "units")

    def on_mouse_wheel_linux(self, event, direction):
        """Handle mouse wheel for scrolling and zooming (Linux).

        Args:
            event: Mouse wheel event
            direction: 1 for up, -1 for down
        """
        if self.current_image is None:
            return

        # Check for modifier keys
        if event.state & 0x0004:  # Control key
            # Ctrl + Wheel: Zoom in/out towards cursor
            if direction > 0:
                self.zoom_in(event.x, event.y)
            else:
                self.zoom_out(event.x, event.y)
        elif event.state & 0x0001:  # Shift key
            # Shift + Wheel: Scroll horizontally
            if direction > 0:
                self.canvas.xview_scroll(-1, "units")
            else:
                self.canvas.xview_scroll(1, "units")
        else:
            # No modifier: Scroll vertically
            if direction > 0:
                self.canvas.yview_scroll(-1, "units")
            else:
                self.canvas.yview_scroll(1, "units")

    def on_pan_start(self, event):
        """Start panning or grid editing when mouse button is pressed.

        Args:
            event: Mouse button press event
        """
        # Check if clicking on a resize handle - let tag binding handle it
        items_under_cursor = self.canvas.find_withtag(tk.CURRENT)
        if items_under_cursor:
            tags = self.canvas.gettags(items_under_cursor[0])
            if 'resize_handle' in tags:
                return  # Let tag binding handle resize

        # Check if in grid edit mode
        if self.edit_mode == EditMode.GRID_EDIT:
            self.on_grid_click(event)
            return

        # Normal panning mode
        self.is_panning = True
        self.pan_start = [event.x, event.y]
        self.canvas.config(cursor="fleur")

    def on_pan_move(self, event):
        """Pan the image, handle grid dragging, or handle resize while moving mouse.

        Args:
            event: Mouse motion event
        """
        # Check if resizing
        if self.is_resizing:
            self.do_resize(event)
            return

        # Check if in grid edit mode and dragging
        if self.edit_mode == EditMode.GRID_EDIT and self.grid_edit_step == GridEditStep.SET_CELL:
            self.on_grid_drag(event)
            return

        # Normal panning
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
        """Stop panning, resizing, or complete grid cell definition when mouse released.

        Args:
            event: Mouse button release event
        """
        # Check if resizing
        if self.is_resizing:
            self.end_resize(event)
            return

        # Check if in grid edit mode
        if self.edit_mode == EditMode.GRID_EDIT and self.grid_edit_step == GridEditStep.SET_CELL:
            self.on_grid_release(event)
            return

        # Normal panning
        self.is_panning = False
        self.canvas.config(cursor="")

    def on_grid_click(self, event):
        """Handle mouse click during grid editing.

        Args:
            event: Mouse click event
        """
        img_x, img_y = self.canvas_to_image_coords(event.x, event.y)

        if self.grid_edit_step == GridEditStep.SET_START:
            # Set grid start position
            self.grid_temp_start = (img_x, img_y)
            self.grid_drag_start = (img_x, img_y)
            self.grid_edit_step = GridEditStep.SET_CELL

            # Update config
            self.grid_config['start_x'] = img_x
            self.grid_config['start_y'] = img_y
            self.updating_inputs_programmatically = True
            try:
                self.grid_inputs['start_x'].set(img_x)
                self.grid_inputs['start_y'].set(img_y)
            finally:
                self.updating_inputs_programmatically = False

            # Reset cursor to default after first click
            self.canvas.config(cursor="")

            self.instruction_label.config(
                text="STEP 2: Drag to define cell width and height"
            )
            self.update_status("Grid Edit Mode: Drag to set cell dimensions")
            self.display_image()

    def on_grid_drag(self, event):
        """Handle mouse drag during grid cell definition.

        Args:
            event: Mouse motion event
        """
        if not self.grid_drag_start:
            return

        img_x, img_y = self.canvas_to_image_coords(event.x, event.y)
        self.grid_drag_current = (img_x, img_y)

        # Update display
        self.display_image()

    def on_grid_release(self, event):
        """Handle mouse release to complete cell definition.

        Args:
            event: Mouse release event
        """
        if not self.grid_drag_start or not self.grid_drag_current:
            return

        # Calculate cell dimensions
        cell_width = abs(self.grid_drag_current[0] - self.grid_drag_start[0])
        cell_height = abs(self.grid_drag_current[1] - self.grid_drag_start[1])

        # Update config
        self.grid_config['cell_width'] = cell_width
        self.grid_config['cell_height'] = cell_height
        self.updating_inputs_programmatically = True
        try:
            self.grid_inputs['cell_width'].set(cell_width)
            self.grid_inputs['cell_height'].set(cell_height)
        finally:
            self.updating_inputs_programmatically = False

        # Move to adjust step
        self.grid_edit_step = GridEditStep.ADJUST
        self.grid_drag_current = None

        self.instruction_label.config(
            text="STEP 3: Adjust parameters using input fields below"
        )
        self.update_status("Grid Edit Mode: Fine-tune grid parameters")
        self.display_image()

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

    # ========== Mode Management ==========

    def enter_grid_edit_mode(self):
        """Enter grid editing mode."""
        if self.current_image is None:
            messagebox.showwarning("No Image", "Please load or capture a screenshot first.")
            return

        self.edit_mode = EditMode.GRID_EDIT
        self.grid_edit_step = GridEditStep.SET_START
        self.grid_temp_start = None
        self.grid_drag_start = None
        self.grid_drag_current = None

        # Set crosshair cursor for initial selection
        self.canvas.config(cursor="crosshair")

        self.instruction_label.config(
            text="STEP 1: Click on the top-left corner of the first icon",
            foreground="green"
        )
        self.update_status("Grid Edit Mode: Click to set grid start position")
        self.display_image()

    def enter_ocr_edit_mode(self):
        """Enter OCR region editing mode (Milestone 3)."""
        messagebox.showinfo("Coming Soon", "OCR region editing will be available in Milestone 3")

    def exit_edit_mode(self):
        """Exit editing mode and return to normal view."""
        self.edit_mode = EditMode.NONE
        self.grid_temp_start = None
        self.grid_drag_start = None
        self.grid_drag_current = None

        self.instruction_label.config(
            text="Click 'Edit Grid Layout' to begin",
            foreground="blue"
        )
        self.update_status("Editing mode exited")
        self.display_image()

    def on_grid_param_changed(self):
        """Handle changes to grid parameters from input fields."""
        if self.edit_mode != EditMode.GRID_EDIT:
            return

        # Skip if we're updating inputs programmatically (e.g., during resize)
        if self.updating_inputs_programmatically:
            return

        try:
            # Update grid_config from input fields
            for param, var in self.grid_inputs.items():
                self.grid_config[param] = var.get()

            # Redraw the grid overlay
            self.display_image()
        except tk.TclError:
            # Ignore errors during typing (incomplete numbers)
            pass

    # ========== Grid Editing Handlers ==========

    def canvas_to_image_coords(self, canvas_x: int, canvas_y: int) -> Tuple[int, int]:
        """Convert canvas coordinates to image coordinates.

        Args:
            canvas_x: X coordinate on canvas (widget-relative)
            canvas_y: Y coordinate on canvas (widget-relative)

        Returns:
            Tuple of (image_x, image_y) in original image coordinates
        """
        # Convert widget coordinates to canvas coordinates (accounting for scroll)
        canvas_x_scrolled = self.canvas.canvasx(canvas_x)
        canvas_y_scrolled = self.canvas.canvasy(canvas_y)

        # Account for pan offset and zoom
        img_x = (canvas_x_scrolled - self.pan_offset[0]) / self.zoom_level
        img_y = (canvas_y_scrolled - self.pan_offset[1]) / self.zoom_level
        return int(img_x), int(img_y)

    def image_to_canvas_coords(self, img_x: int, img_y: int) -> Tuple[int, int]:
        """Convert image coordinates to canvas coordinates.

        Args:
            img_x: X coordinate on image
            img_y: Y coordinate on image

        Returns:
            Tuple of (canvas_x, canvas_y)
        """
        canvas_x = img_x * self.zoom_level + self.pan_offset[0]
        canvas_y = img_y * self.zoom_level + self.pan_offset[1]
        return int(canvas_x), int(canvas_y)

    def draw_grid_overlay(self):
        """Draw the grid overlay on the canvas."""
        if self.current_image is None:
            return

        # Draw the full grid based on current configuration
        for row in range(self.grid_config['rows']):
            for col in range(self.grid_config['columns']):
                x = self.grid_config['start_x'] + col * (
                    self.grid_config['cell_width'] + self.grid_config['spacing_x']
                )
                y = self.grid_config['start_y'] + row * (
                    self.grid_config['cell_height'] + self.grid_config['spacing_y']
                )

                # Convert to canvas coordinates
                x1, y1 = self.image_to_canvas_coords(x, y)
                x2, y2 = self.image_to_canvas_coords(
                    x + self.grid_config['cell_width'],
                    y + self.grid_config['cell_height']
                )

                # Draw outer cell (blue, semi-transparent)
                self.canvas.create_rectangle(
                    x1, y1, x2, y2,
                    outline="#4CAF50",
                    width=2,
                    tags="grid_overlay"
                )

                # Draw inner crop area (if padding > 0)
                if self.grid_config['crop_padding'] > 0:
                    pad = self.grid_config['crop_padding']
                    inner_x1, inner_y1 = self.image_to_canvas_coords(x + pad, y + pad)
                    inner_x2, inner_y2 = self.image_to_canvas_coords(
                        x + self.grid_config['cell_width'] - pad,
                        y + self.grid_config['cell_height'] - pad
                    )

                    self.canvas.create_rectangle(
                        inner_x1, inner_y1, inner_x2, inner_y2,
                        outline="#FFC107",
                        width=1,
                        dash=(3, 3),
                        tags="grid_overlay"
                    )

        # Draw start position marker if in grid edit mode (only during initial steps)
        if (self.edit_mode == EditMode.GRID_EDIT and
            self.grid_temp_start and
            self.grid_edit_step in (GridEditStep.SET_START, GridEditStep.SET_CELL)):
            x, y = self.image_to_canvas_coords(*self.grid_temp_start)
            # Draw a crosshair
            size = 10
            self.canvas.create_line(
                x - size, y, x + size, y,
                fill="red", width=2, tags="grid_overlay"
            )
            self.canvas.create_line(
                x, y - size, x, y + size,
                fill="red", width=2, tags="grid_overlay"
            )

        # Draw drag preview rectangle if dragging
        if self.grid_drag_start and self.grid_drag_current:
            x1, y1 = self.image_to_canvas_coords(*self.grid_drag_start)
            x2, y2 = self.image_to_canvas_coords(*self.grid_drag_current)

            self.canvas.create_rectangle(
                x1, y1, x2, y2,
                outline="#FF5722",
                fill="#FF5722",
                stipple="gray25",
                width=3,
                tags="grid_overlay"
            )

        # Draw resize handles on the first cell when in ADJUST mode
        if self.grid_edit_step == GridEditStep.ADJUST:
            self._draw_resize_handles()


    # ========== Grid Resize Handlers ==========

    def _draw_resize_handles(self):
        """Draw interactive resize handles on the first grid cell as canvas items."""
        if self.current_image is None:
            return

        # Get the first cell bounds (top-left cell)
        cell_start_x = self.grid_config['start_x']
        cell_start_y = self.grid_config['start_y']
        cell_end_x = cell_start_x + self.grid_config['cell_width']
        cell_end_y = cell_start_y + self.grid_config['cell_height']

        # Convert to canvas coordinates
        canvas_x1, canvas_y1 = self.image_to_canvas_coords(cell_start_x, cell_start_y)
        canvas_x2, canvas_y2 = self.image_to_canvas_coords(cell_end_x, cell_end_y)

        # Handle size (pixels on canvas)
        handle_size = 8

        # Define handle positions and their tags/cursors
        handles = [
            # Corners
            ('corner_tl', canvas_x1, canvas_y1, 'size_nw_se'),
            ('corner_tr', canvas_x2, canvas_y1, 'size_ne_sw'),
            ('corner_bl', canvas_x1, canvas_y2, 'size_ne_sw'),
            ('corner_br', canvas_x2, canvas_y2, 'size_nw_se'),
            # Edges (midpoints)
            ('edge_left', canvas_x1, (canvas_y1 + canvas_y2) / 2, 'sb_h_double_arrow'),
            ('edge_right', canvas_x2, (canvas_y1 + canvas_y2) / 2, 'sb_h_double_arrow'),
            ('edge_top', (canvas_x1 + canvas_x2) / 2, canvas_y1, 'sb_v_double_arrow'),
            ('edge_bottom', (canvas_x1 + canvas_x2) / 2, canvas_y2, 'sb_v_double_arrow'),
        ]

        # Unbind old events from all handle tags to prevent conflicts
        for tag, _, _, _ in handles:
            self.canvas.tag_unbind(tag, '<Enter>')
            self.canvas.tag_unbind(tag, '<Leave>')
            self.canvas.tag_unbind(tag, '<Button-1>')

        for tag, cx, cy, cursor in handles:
            # Draw semi-transparent handle rectangle
            handle_id = self.canvas.create_rectangle(
                cx - handle_size, cy - handle_size,
                cx + handle_size, cy + handle_size,
                fill='#2196F3',
                outline='white',
                width=2,
                tags=('grid_overlay', 'resize_handle', tag)
            )

            # Bind events to this handle - use default arguments to capture values
            self.canvas.tag_bind(tag, '<Enter>',
                lambda e, cursor_val=cursor: self.canvas.config(cursor=cursor_val))
            self.canvas.tag_bind(tag, '<Leave>',
                lambda e: self.canvas.config(cursor=''))
            # Return 'break' to stop event propagation to canvas binding
            self.canvas.tag_bind(tag, '<Button-1>',
                lambda e, tag_val=tag: self._on_handle_click(e, tag_val) or 'break')

    def _on_handle_click(self, event, handle_tag):
        """Handle click on a resize handle.

        Args:
            event: Mouse button press event
            handle_tag: Tag identifying which handle was clicked
        """
        self.resize_mode = handle_tag
        self.start_resize(event)

    def start_resize(self, event):
        """Start resizing the grid cell.

        Args:
            event: Mouse button press event
        """
        self.is_resizing = True
        img_x, img_y = self.canvas_to_image_coords(event.x, event.y)
        self.resize_start_pos = (img_x, img_y)

        # Save original config for reference
        self.resize_original_config = self.grid_config.copy()

    def do_resize(self, event):
        """Handle resize dragging.

        Args:
            event: Mouse motion event
        """
        if not self.is_resizing or not self.resize_mode or not self.resize_start_pos:
            return

        img_x, img_y = self.canvas_to_image_coords(event.x, event.y)
        start_x, start_y = self.resize_start_pos
        orig = self.resize_original_config

        # Calculate delta
        dx = img_x - start_x
        dy = img_y - start_y

        # Check modifier keys
        ctrl_pressed = bool(event.state & 0x0004)
        shift_pressed = bool(event.state & 0x0001)

        if self.resize_mode.startswith('edge_'):
            # Edge resizing - single dimension
            if ctrl_pressed:
                # Ctrl: scale from center along edge direction
                if self.resize_mode == 'edge_left':
                    # Moving left edge: both edges move symmetrically
                    self.grid_config['start_x'] = orig['start_x'] - dx
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
                elif self.resize_mode == 'edge_right':
                    # Moving right edge: both edges move symmetrically
                    self.grid_config['start_x'] = orig['start_x'] - dx
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
                elif self.resize_mode == 'edge_top':
                    # Moving top edge: both edges move symmetrically
                    self.grid_config['start_y'] = orig['start_y'] - dy
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
                elif self.resize_mode == 'edge_bottom':
                    # Moving bottom edge: both edges move symmetrically
                    self.grid_config['start_y'] = orig['start_y'] - dy
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
            else:
                # Normal edge resize: opposite edge stays fixed
                if self.resize_mode == 'edge_left':
                    new_width = orig['cell_width'] - dx
                    self.grid_config['start_x'] = orig['start_x'] + dx
                    self.grid_config['cell_width'] = max(1, new_width)
                elif self.resize_mode == 'edge_right':
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + dx)
                elif self.resize_mode == 'edge_top':
                    new_height = orig['cell_height'] - dy
                    self.grid_config['start_y'] = orig['start_y'] + dy
                    self.grid_config['cell_height'] = max(1, new_height)
                elif self.resize_mode == 'edge_bottom':
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + dy)

        elif self.resize_mode.startswith('corner_'):
            # Corner resizing - both dimensions
            if shift_pressed:
                # Shift: maintain aspect ratio
                if self.resize_mode == 'corner_br':
                    # Bottom-right: scale proportionally from top-left
                    scale = max(dx / max(orig['cell_width'], 1), dy / max(orig['cell_height'], 1))
                    self.grid_config['cell_width'] = max(1, int(orig['cell_width'] + scale * orig['cell_width']))
                    self.grid_config['cell_height'] = max(1, int(orig['cell_height'] + scale * orig['cell_height']))
                elif self.resize_mode == 'corner_tl':
                    scale = max(-dx / max(orig['cell_width'], 1), -dy / max(orig['cell_height'], 1))
                    new_width = max(1, int(orig['cell_width'] - scale * orig['cell_width']))
                    new_height = max(1, int(orig['cell_height'] - scale * orig['cell_height']))
                    self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
                    self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
                    self.grid_config['cell_width'] = new_width
                    self.grid_config['cell_height'] = new_height
                elif self.resize_mode == 'corner_tr':
                    # Top-right: bottom-left is anchor. Moving right or up enlarges both dimensions.
                    scale = max(dx / max(orig['cell_width'], 1), -dy / max(orig['cell_height'], 1))
                    new_width = max(1, int(orig['cell_width'] + scale * orig['cell_width']))
                    new_height = max(1, int(orig['cell_height'] + scale * orig['cell_height']))
                    # Top edge moves, so adjust start_y
                    self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
                    self.grid_config['cell_width'] = new_width
                    self.grid_config['cell_height'] = new_height
                elif self.resize_mode == 'corner_bl':
                    # Bottom-left: top-right is anchor. Moving left or down enlarges both dimensions.
                    scale = max(-dx / max(orig['cell_width'], 1), dy / max(orig['cell_height'], 1))
                    new_width = max(1, int(orig['cell_width'] + scale * orig['cell_width']))
                    new_height = max(1, int(orig['cell_height'] + scale * orig['cell_height']))
                    # Left edge moves, so adjust start_x
                    self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
                    self.grid_config['cell_width'] = new_width
                    self.grid_config['cell_height'] = new_height
            elif ctrl_pressed:
                # Ctrl: scale from center
                if self.resize_mode == 'corner_br':
                    self.grid_config['start_x'] = orig['start_x'] - dx
                    self.grid_config['start_y'] = orig['start_y'] - dy
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
                elif self.resize_mode == 'corner_tl':
                    self.grid_config['start_x'] = orig['start_x'] + dx
                    self.grid_config['start_y'] = orig['start_y'] + dy
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] - 2 * dx)
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] - 2 * dy)
                elif self.resize_mode == 'corner_tr':
                    self.grid_config['start_x'] = orig['start_x'] - dx
                    self.grid_config['start_y'] = orig['start_y'] + dy
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + 2 * dx)
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] - 2 * dy)
                elif self.resize_mode == 'corner_bl':
                    self.grid_config['start_x'] = orig['start_x'] + dx
                    self.grid_config['start_y'] = orig['start_y'] - dy
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] - 2 * dx)
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + 2 * dy)
            else:
                # Default: opposite corner fixed
                if self.resize_mode == 'corner_br':
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + dx)
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + dy)
                elif self.resize_mode == 'corner_tl':
                    new_width = max(1, orig['cell_width'] - dx)
                    new_height = max(1, orig['cell_height'] - dy)
                    self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
                    self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
                    self.grid_config['cell_width'] = new_width
                    self.grid_config['cell_height'] = new_height
                elif self.resize_mode == 'corner_tr':
                    new_height = max(1, orig['cell_height'] - dy)
                    self.grid_config['start_y'] = orig['start_y'] + orig['cell_height'] - new_height
                    self.grid_config['cell_width'] = max(1, orig['cell_width'] + dx)
                    self.grid_config['cell_height'] = new_height
                elif self.resize_mode == 'corner_bl':
                    new_width = max(1, orig['cell_width'] - dx)
                    self.grid_config['start_x'] = orig['start_x'] + orig['cell_width'] - new_width
                    self.grid_config['cell_width'] = new_width
                    self.grid_config['cell_height'] = max(1, orig['cell_height'] + dy)

        # Update input fields (set flag to prevent trace callback loop)
        self.updating_inputs_programmatically = True
        try:
            for param, var in self.grid_inputs.items():
                if param in self.grid_config:
                    var.set(self.grid_config[param])
        finally:
            self.updating_inputs_programmatically = False

        # OPTIMIZED: Only redraw grid overlay during resize, not entire canvas
        # This prevents handles from being destroyed/recreated
        self.canvas.delete("grid_overlay")
        self.draw_grid_overlay()

    def end_resize(self, event):
        """Complete the resize operation.

        Args:
            event: Mouse button release event
        """
        self.is_resizing = False
        self.resize_start_pos = None
        self.resize_original_config = None
        self.resize_mode = None
        self.canvas.config(cursor='')


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
