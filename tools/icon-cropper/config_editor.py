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
import json
import re

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
from editor.preview_controller import PreviewController
from editor.preview_window import PreviewWindow
from editor.workspace_manager import WorkspaceManager

# Import tool system
from editor.tool_manager import ToolManager
from editor.select_tool import SelectTool
from editor.draw_grid_tool import DrawGridTool
from editor.draw_ocr_tool import DrawOCRTool

# Import batch cropping
from editor.cropper_api import batch_crop_workspace
from editor.crop_preview_dialog import show_crop_preview_dialog


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

        # Initialize workspace manager
        workspaces_root = Path(__file__).parent / "workspaces"
        self.workspace_manager = WorkspaceManager(workspaces_root)

        # Load preferences (last workspace)
        prefs = self._load_preferences()
        self.current_workspace = prefs.get("last_workspace", "character_select")

        # Ensure current workspace exists
        if not self.workspace_manager.workspace_exists(self.current_workspace):
            self.current_workspace = "character_select"

        # Create workspace (this will create workspace.json if it doesn't exist)
        self.workspace_manager.create_workspace(self.current_workspace)

        # Flag to prevent callbacks during workspace loading
        self._loading_workspace = False

        # Track selected overlay in overlay management panel
        self.selected_overlay_id = None

        # Initialize grid configuration with default values
        self.grid_config = {
            'start_x': 0,
            'start_y': 0,
            'cell_width': 100,
            'cell_height': 100,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 3,
            'rows': 4,
            'crop_padding': 0,
        }

        # Initialize OCR configuration with default values
        self.ocr_config = {
            'x': 0,
            'y': 0,
            'width': 0,
            'height': 0,
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

        # Initialize tool system
        self.tool_manager = ToolManager()

        # Register tools
        self.tool_manager.register_tool('select', SelectTool(self.canvas_controller))
        self.tool_manager.register_tool('draw_grid', DrawGridTool(self.grid_editor))
        self.tool_manager.register_tool('draw_ocr', DrawOCRTool(self.ocr_editor))

        # Set default tool to select (will be activated after UI loads)
        self.tool_manager.default_tool_name = 'select'

        # Note: Overlays will be loaded from workspace.json per screenshot
        # (no global overlay loading from config.yaml)

        # Bind events
        self._bind_events()

        # Activate default tool (select tool)
        self.tool_manager.set_active_tool('select', self.canvas, self.update_status)

    def _build_ui(self):
        """Build the application UI using UIBuilder."""
        # Create callback dictionary for UIBuilder
        callbacks = {
            'open_screenshot': self.open_screenshot,
            'capture_screenshot': self.capture_screenshot,
            'delete_screenshot': self.delete_screenshot,
            'preview_icons': self.preview_icons,
            'batch_crop_all': self.batch_crop_all,
            'quit_app': self.quit_app,
            'zoom_in': lambda: self.canvas_controller.zoom_in() if hasattr(self, 'canvas_controller') else None,
            'zoom_out': lambda: self.canvas_controller.zoom_out() if hasattr(self, 'canvas_controller') else None,
            'reset_zoom': lambda: self.canvas_controller.reset_zoom() if hasattr(self, 'canvas_controller') else None,
            'show_about': self.show_about,
            'enter_grid_edit_mode': self.enter_grid_edit_mode,
            'enter_ocr_edit_mode': self.enter_ocr_edit_mode,
            'enter_pan_mode': self.enter_pan_mode,
            'on_page_changed': self.on_page_changed,
            'create_new_page': self.create_new_workspace
        }

        ui_builder = UIBuilder(self.root, callbacks)
        self.ui_builder = ui_builder  # Store reference for later use

        # Create menu bar
        ui_builder.create_menu_bar()

        # Create main layout (Phase 2: no longer returns tabs)
        (self.left_panel, self.canvas, self.instruction_label,
         self.status_bar) = ui_builder.create_main_layout()

        # Link spinbox IntVars from ui_builder (created in dynamic parameter panel)
        self.grid_inputs = ui_builder.grid_input_vars
        self.ocr_inputs = ui_builder.ocr_input_vars

        # Wire up callbacks for spinbox changes
        for param, var in self.grid_inputs.items():
            var.trace_add('write', lambda *args: self._on_grid_param_changed())

        for param, var in self.ocr_inputs.items():
            var.trace_add('write', lambda *args: self._on_ocr_param_changed())

        # Initialize workspace dropdown with available workspaces
        workspaces = self.workspace_manager.list_workspaces()
        if not workspaces:
            # Create default workspace
            self.workspace_manager.create_workspace("character_select")
            workspaces = ["character_select"]

        ui_builder.page_dropdown['values'] = workspaces
        ui_builder.page_var.set(self.current_workspace)

        # Initialize screenshot list for current workspace
        self._refresh_screenshot_list()

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
        self.root.bind('<Control-p>', lambda e: self.preview_icons())
        self.root.bind('<Control-b>', lambda e: self.batch_crop_all())
        self.root.bind('<Control-q>', lambda e: self.quit_app())

    def _on_display_complete(self):
        """Callback invoked after canvas display is complete.

        Shows overlays if:
        - Currently in drawing mode (to show crosshair/drag preview), OR
        - Overlay is active (stored in canvas controller)
        """
        # Show grid overlay if actively drawing OR if overlay is active
        if self.grid_editor.is_in_grid_edit_mode() or self.canvas_controller.has_overlay('grid'):
            self.draw_grid_overlay()

        # Show OCR overlay if actively drawing OR if overlay is active
        if self.ocr_editor.is_in_ocr_edit_mode() or self.canvas_controller.has_overlay('ocr'):
            self.draw_ocr_overlay()

    def _on_grid_param_changed(self):
        """Handle changes to grid parameters from input fields."""
        # Skip if we're loading a workspace (prevents premature redraws)
        if self._loading_workspace:
            return

        self.grid_editor.on_grid_param_changed(self.grid_inputs)

        # Update the selected overlay's config with the new values
        if self.selected_overlay_id:
            selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
            if selected_overlay and selected_overlay.type == 'grid':
                # Copy all values from self.grid_config to the overlay's config
                for key, value in self.grid_config.items():
                    selected_overlay.config[key] = value
                # Save overlays to workspace
                self._save_current_overlays()

        # Always update display if grid overlay is active
        if self.canvas_controller.has_overlay('grid'):
            self.canvas_controller.display_image()

    def _on_ocr_param_changed(self):
        """Handle changes to OCR region parameters from input fields."""
        # Skip if we're loading a workspace (prevents premature redraws)
        if self._loading_workspace:
            return

        self.ocr_editor.on_ocr_param_changed(self.ocr_inputs)

        # Update the selected overlay's config with the new values
        if self.selected_overlay_id:
            selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
            if selected_overlay and selected_overlay.type == 'ocr':
                # Copy all values from self.ocr_config to the overlay's config
                for key, value in self.ocr_config.items():
                    selected_overlay.config[key] = value
                # Save overlays to workspace
                self._save_current_overlays()

        # Always update display if OCR overlay is active
        if self.canvas_controller.has_overlay('ocr'):
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
        """Open a screenshot from file and import it to the current workspace."""
        file_path = filedialog.askopenfilename(
            title="Open Screenshot",
            filetypes=[
                ("Image files", "*.png *.jpg *.jpeg *.bmp"),
                ("All files", "*.*")
            ]
        )

        if file_path:
            try:
                # Load the image
                image = Image.open(file_path)

                # Import to workspace (copy file, update metadata, set as selected)
                filename = self.workspace_manager.add_screenshot(self.current_workspace, image)

                # Refresh the screenshot list to show the new image
                self._refresh_screenshot_list()

                # Load and display the newly imported screenshot
                self._load_selected_screenshot()

                self.update_status(f"Imported to workspace as {filename}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to import image:\n{e}")
                self.update_status("Error importing image")

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
        """Handle successful capture (called in main thread) with error handling.

        Args:
            image: The captured image
        """
        try:
            # Add to workspace
            filename = self.workspace_manager.add_screenshot(self.current_workspace, image)

            # Update UI
            self._refresh_screenshot_list()

            # Display on canvas (workspace manager auto-selected it)
            self._load_selected_screenshot()

            self.update_status(f"Screenshot captured: {filename}")

        except ValueError as e:
            # Workspace validation failed
            messagebox.showerror(
                "Workspace Validation Error",
                f"Error saving screenshot to workspace '{self.current_workspace}':\n\n{e}\n\n"
                "Screenshot was captured but could not be saved."
            )
            self.update_status("Error saving screenshot")

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

        # Clear selection to prevent spinbox changes from affecting the previously selected overlay
        self.selected_overlay_id = None
        self.ui_builder.update_parameter_panel(None, None)
        self._refresh_overlay_list()

        # Reset grid_config to default values for new overlay (Phase 2 fix)
        self.grid_config.update({
            'start_x': 0,
            'start_y': 0,
            'cell_width': 100,
            'cell_height': 100,
            'spacing_x': 0,
            'spacing_y': 0,
            'columns': 3,
            'rows': 4,
            'crop_padding': 0,
        })

        # Switch to draw grid tool (tool handles mode transitions)
        self.tool_manager.set_active_tool('draw_grid', self.canvas, self.update_status)
        self.canvas_controller.display_image()

    def enter_ocr_edit_mode(self):
        """Enter OCR region drawing mode."""
        if self.canvas_controller.current_image is None:
            messagebox.showwarning("No Image", "Please load or capture a screenshot first.")
            return

        # Clear selection to prevent spinbox changes from affecting the previously selected overlay
        self.selected_overlay_id = None
        self.ui_builder.update_parameter_panel(None, None)
        self._refresh_overlay_list()

        # Reset ocr_config to default values for new overlay (Phase 2 fix)
        self.ocr_config.update({
            'x': 0,
            'y': 0,
            'width': 0,
            'height': 0,
        })

        # Switch to draw OCR tool (tool handles mode transitions)
        self.tool_manager.set_active_tool('draw_ocr', self.canvas, self.update_status)
        self.canvas_controller.display_image()

    def enter_pan_mode(self):
        """Enter pan/zoom mode (normal mode)."""
        # Switch to select tool (tool handles exiting edit modes)
        self.tool_manager.set_active_tool('select', self.canvas, self.update_status)
        self.canvas_controller.display_image()

    # ========== Mouse Event Handlers ==========

    def _build_tool_context(self) -> dict:
        """Build context dictionary for tool event handlers.

        Returns:
            Dictionary with shared state and callbacks for tools
        """
        return {
            'canvas': self.canvas,
            'canvas_controller': self.canvas_controller,
            'grid_config': self.grid_config,
            'ocr_config': self.ocr_config,
            'grid_inputs': self.grid_inputs,
            'ocr_inputs': self.ocr_inputs,
            'auto_switch_tool': self._auto_switch_tool,
            'status_callback': self.update_status,
            'save_overlays_callback': self._save_current_overlays,
            'refresh_overlay_list_callback': self._refresh_overlay_list,
            'set_selected_overlay_callback': self._set_selected_overlay
        }

    def _set_selected_overlay(self, overlay_id: str):
        """Set the selected overlay ID and update UI.

        Called by drawing tools when a new overlay is created.

        Args:
            overlay_id: ID of overlay to select
        """
        # Use the full selection handler to update spinboxes and parameter panel
        self._on_overlay_selected(overlay_id)

    def _auto_switch_tool(self, tool_name: str):
        """Helper to switch tools from within tool handlers.

        Args:
            tool_name: Name of tool to switch to
        """
        self.tool_manager.set_active_tool(tool_name, self.canvas, self.update_status)
        # Redraw to show/hide handles based on new tool
        self.canvas_controller.display_image()

    def on_mouse_press(self, event):
        """Handle mouse button press.

        Routes to appropriate handler based on current mode and context.

        Args:
            event: Mouse button press event
        """
        # Note: Resize handles are bound directly via tag_bind in GridRenderer
        # and handle clicks through callbacks, so we don't check for them here

        # Delegate to active tool
        context = self._build_tool_context()
        self.tool_manager.on_mouse_press(event, context)

        # Redraw to update any visual changes
        self.canvas_controller.display_image()

    def on_mouse_move(self, event):
        """Handle mouse motion.

        Routes to appropriate handler based on current operation.

        Args:
            event: Mouse motion event
        """
        # Priority 1: Check if resizing grid (via handle drag)
        # Resize operations bypass tool system since they're triggered by tag_bind
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

        # Priority 2: Check if resizing OCR region (via handle drag)
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

        # Priority 3: Delegate to active tool
        context = self._build_tool_context()
        handled = self.tool_manager.on_mouse_move(event, context)

        # Redraw if tool handled the event
        if handled:
            self.canvas_controller.display_image()

    def on_mouse_release(self, event):
        """Handle mouse button release.

        Routes to appropriate handler based on current operation.

        Args:
            event: Mouse button release event
        """
        # Priority 1: Check if resizing grid (via handle drag)
        # Resize operations bypass tool system since they're triggered by tag_bind
        if self.resize_controller.is_resizing:
            self.resize_controller.end_resize(event, self.canvas)

            # Update the selected overlay's config with the new values
            if self.selected_overlay_id:
                selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
                if selected_overlay and selected_overlay.type == 'grid':
                    # Copy all values from self.grid_config to the overlay's config
                    for key, value in self.grid_config.items():
                        selected_overlay.config[key] = value
                    # Save overlays to workspace
                    self._save_current_overlays()

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

        # Priority 2: Check if resizing OCR region (via handle drag)
        if self.ocr_resize_controller.is_resizing:
            self.ocr_resize_controller.end_resize(event, self.canvas)

            # Update the selected overlay's config with the new values
            if self.selected_overlay_id:
                selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
                if selected_overlay and selected_overlay.type == 'ocr':
                    # Copy all values from self.ocr_config to the overlay's config
                    for key, value in self.ocr_config.items():
                        selected_overlay.config[key] = value
                    # Save overlays to workspace
                    self._save_current_overlays()

            # Redraw OCR overlay with handles after resize completes
            self.canvas.delete("ocr_overlay")
            self.draw_ocr_overlay()
            return

        # Priority 3: Delegate to active tool
        context = self._build_tool_context()
        handled = self.tool_manager.on_mouse_release(event, context)

        # Note: Tools handle their own overlay updates and auto-switching
        # No need to redraw here - tools call auto_switch_tool which triggers redraw

    # ========== Grid Overlay Drawing ==========

    def draw_grid_overlay(self):
        """Draw all grid overlays on the canvas.

        Draws all saved grid overlays, plus any in-progress drawing.
        Shows handles when overlay exists and not currently drawing.
        """
        if self.canvas_controller.current_image is None:
            return

        # Draw all saved grid overlays
        grid_overlays = [o for o in self.canvas_controller.get_all_overlays() if o.type == 'grid' and o.visible]
        for overlay in grid_overlays:
            self.grid_renderer.draw_grid_overlay(
                self.canvas,
                overlay.config,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                None,  # Not in edit mode for saved overlays
                None,  # No edit step
                None,  # No temp start
                None,  # No drag start
                None   # No drag current
            )

        # If currently drawing a new grid, draw the in-progress overlay
        # Only draw if user has started drawing (not just in edit mode)
        if self.grid_editor.edit_mode == EditMode.GRID_EDIT and self.grid_editor.grid_temp_start:
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

        # Draw resize handles only for the selected grid overlay (if not currently drawing)
        if self._should_show_grid_handles() and self.selected_overlay_id:
            selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
            if selected_overlay and selected_overlay.type == 'grid' and selected_overlay.visible:
                self.grid_renderer.draw_resize_handles(
                    self.canvas,
                    selected_overlay.config,
                    self.canvas_controller.zoom_level,
                    self.canvas_controller.pan_offset,
                    self._on_handle_click
                )

    def _should_show_grid_handles(self) -> bool:
        """Determine if grid resize handles should be visible.

        Handles are visible when:
        1. Grid overlay exists, AND
        2. NOT currently drawing a new grid

        Returns:
            True if handles should be shown
        """
        # Check if grid overlay exists
        if not self.canvas_controller.has_overlay('grid'):
            return False

        # Hide handles while actively drawing grid
        if isinstance(self.tool_manager.active_tool, DrawGridTool):
            return False

        return True

    def _on_handle_click(self, event, handle_tag: str):
        """Callback for resize handle clicks (from GridRenderer).

        Args:
            event: Mouse button press event
            handle_tag: Handle identifier (e.g., 'corner_br')

        Returns:
            'break' to stop event propagation
        """
        # Load the selected overlay's config into self.grid_config for resize controller
        if self.selected_overlay_id:
            selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
            if selected_overlay and selected_overlay.type == 'grid':
                # Copy the overlay's config to self.grid_config
                for key, value in selected_overlay.config.items():
                    self.grid_config[key] = value

        self.resize_controller.on_handle_click(
            event, handle_tag, self.canvas,
            self.canvas_controller.zoom_level,
            self.canvas_controller.pan_offset
        )
        return 'break'

    def draw_ocr_overlay(self):
        """Draw all OCR region overlays on the canvas.

        Draws all saved OCR overlays, plus any in-progress drawing.
        Shows handles when overlay exists and not currently drawing.
        """
        if self.canvas_controller.current_image is None:
            return

        # Draw all saved OCR overlays
        ocr_overlays = [o for o in self.canvas_controller.get_all_overlays() if o.type == 'ocr' and o.visible]
        for overlay in ocr_overlays:
            self.grid_renderer.draw_ocr_overlay(
                self.canvas,
                overlay.config,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                is_active=False,  # Saved overlays are not in active editing
                is_defining=False,  # Not defining
                drag_start=None,
                drag_current=None
            )

        # If currently drawing a new OCR region, draw the in-progress overlay
        # Only draw if user has started dragging (not just in edit mode)
        if self.ocr_editor.is_in_ocr_edit_mode() and self.ocr_editor.drag_start:
            self.grid_renderer.draw_ocr_overlay(
                self.canvas,
                self.ocr_config,
                self.canvas_controller.zoom_level,
                self.canvas_controller.pan_offset,
                is_active=True,
                is_defining=(self.ocr_editor.edit_step == "define"),
                drag_start=self.ocr_editor.drag_start,
                drag_current=self.ocr_editor.drag_current
            )

        # Draw resize handles only for the selected OCR overlay (if not currently drawing)
        if self._should_show_ocr_handles() and self.selected_overlay_id:
            selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
            if selected_overlay and selected_overlay.type == 'ocr' and selected_overlay.visible:
                self.grid_renderer.draw_ocr_resize_handles(
                    self.canvas,
                    selected_overlay.config,
                    self.canvas_controller.zoom_level,
                    self.canvas_controller.pan_offset,
                    self._on_ocr_handle_click
                )

    def _should_show_ocr_handles(self) -> bool:
        """Determine if OCR resize handles should be visible.

        Handles are visible when:
        1. OCR overlay exists, AND
        2. NOT currently drawing a new OCR region

        Returns:
            True if handles should be shown
        """
        # Check if OCR overlay exists
        if not self.canvas_controller.has_overlay('ocr'):
            return False

        # Hide handles while actively drawing OCR region
        if isinstance(self.tool_manager.active_tool, DrawOCRTool):
            return False

        return True

    def _on_ocr_handle_click(self, event, handle_tag: str):
        """Callback for OCR resize handle clicks (from GridRenderer).

        Args:
            event: Mouse button press event
            handle_tag: OCR handle identifier (e.g., 'ocr_corner_br')

        Returns:
            'break' to stop event propagation
        """
        # Load the selected overlay's config into self.ocr_config for resize controller
        if self.selected_overlay_id:
            selected_overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
            if selected_overlay and selected_overlay.type == 'ocr':
                # Copy the overlay's config to self.ocr_config
                for key, value in selected_overlay.config.items():
                    self.ocr_config[key] = value

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

            # Check if grid overlay is active
            if not self.canvas_controller.has_overlay('grid'):
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

    def batch_crop_all(self):
        """Run batch crop operation on all screenshots in workspace."""
        try:
            # Validate workspace
            if not self.current_workspace:
                messagebox.showwarning(
                    "No Workspace",
                    "Please select a workspace first."
                )
                return

            # Show preview dialog
            self.update_status("Preparing batch crop preview...")
            proceed = show_crop_preview_dialog(
                self.root,
                self.current_workspace,
                self.workspace_manager.workspaces_root
            )

            if not proceed:
                self.update_status("Batch crop cancelled")
                return

            # Run batch crop
            self.update_status("Running batch crop...")
            results = batch_crop_workspace(
                self.current_workspace,
                workspaces_root=self.workspace_manager.workspaces_root
            )

            # Show success message
            total_icons = sum(len(paths) for paths in results.values())
            messagebox.showinfo(
                "Batch Crop Complete",
                f"Successfully extracted {total_icons} icons!\n\n"
                f"Output location:\n"
                f"workspaces/{self.current_workspace}/cropped/"
            )
            self.update_status(f"Batch crop complete: {total_icons} icons extracted")

        except FileNotFoundError as e:
            messagebox.showerror(
                "Workspace Not Found",
                f"Error: {str(e)}\n\n"
                f"Please ensure the workspace exists."
            )
            self.update_status("Batch crop failed: workspace not found")

        except Exception as e:
            messagebox.showerror(
                "Batch Crop Error",
                f"An error occurred during batch cropping:\n\n{str(e)}"
            )
            self.update_status("Batch crop failed")

    # ========== Workspace Management ==========

    def _load_preferences(self):
        """Load user preferences (last workspace, etc.)."""
        prefs_path = Path(__file__).parent / "editor_preferences.json"
        if prefs_path.exists():
            try:
                with open(prefs_path, 'r') as f:
                    prefs = json.load(f)
                    return prefs
            except:
                pass
        return {"last_workspace": "character_select"}

    def _save_preferences(self):
        """Save user preferences."""
        prefs_path = Path(__file__).parent / "editor_preferences.json"
        prefs = {
            "last_workspace": self.current_workspace
        }
        with open(prefs_path, 'w') as f:
            json.dump(prefs, f, indent=2)

    def _refresh_screenshot_list(self):
        """Refresh the screenshot list widget with error handling."""
        try:
            screenshots = self.workspace_manager.get_screenshots(self.current_workspace)
            selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)

            self.ui_builder.update_screenshot_list(
                screenshots,
                selected,
                self._on_screenshot_selected
            )
        except ValueError as e:
            # Workspace validation failed
            messagebox.showerror(
                "Workspace Validation Error",
                f"Error loading workspace '{self.current_workspace}':\n\n{e}\n\n"
                "Please fix the workspace.json file or delete it to reset."
            )
            # Clear UI to prevent showing invalid data
            self.ui_builder.update_screenshot_list([], None, self._on_screenshot_selected)

    def _on_screenshot_selected(self, filename: str):
        """Handle screenshot selection from list."""
        self.workspace_manager.set_selected_screenshot(self.current_workspace, filename)
        self._load_selected_screenshot()

    def _load_selected_screenshot(self):
        """Load the selected screenshot onto canvas and restore its overlays with error handling."""
        try:
            selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)
            if not selected:
                return

            screenshot_path = self.workspace_manager.get_screenshot_path(self.current_workspace, selected)
            if screenshot_path.exists():
                # Load image
                image = Image.open(screenshot_path)
                self.canvas_controller.load_image(image)
                self.canvas_controller.center_image()

                # Load overlays bound to this screenshot (Phase 1.5: workspace-level overlays)
                overlays = self.workspace_manager.get_screenshot_overlays(self.current_workspace, selected)

                # Clear existing overlays and load saved ones
                self.canvas_controller.overlay_manager.clear()
                self.selected_overlay_id = None  # Clear selection when switching screenshots
                for overlay_id, overlay in overlays.items():
                    self.canvas_controller.overlay_manager.add_overlay(overlay)

                # Update parameter panel to show empty state (Phase 2)
                self.ui_builder.update_parameter_panel(None, None)

                self.canvas_controller.display_image()

                # Refresh overlay list UI
                self._refresh_overlay_list()

        except ValueError as e:
            # Workspace validation failed
            messagebox.showerror(
                "Workspace Validation Error",
                f"Error loading screenshot from workspace '{self.current_workspace}':\n\n{e}\n\n"
                "Please fix the workspace.json file or delete it to reset."
            )
            return

    def _save_current_overlays(self):
        """Save current canvas overlays to the workspace with error handling (Phase 1.5: workspace-level overlays)."""
        selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)
        if not selected:
            return

        try:
            # Get current overlays from canvas
            canvas_overlays = self.canvas_controller.overlay_manager.to_dict()
            canvas_overlay_ids = list(canvas_overlays.keys())

            # Load existing workspace overlays
            workspace_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)
            workspace_overlays_dict = {oid: overlay.to_dict() for oid, overlay in workspace_overlays.items()}

            # Merge canvas overlays into workspace overlays (canvas overlays take precedence)
            workspace_overlays_dict.update(canvas_overlays)

            # Save workspace overlays
            self.workspace_manager.save_workspace_overlays(self.current_workspace, workspace_overlays_dict)

            # Save screenshot bindings (overlay IDs visible on this screenshot)
            self.workspace_manager.save_screenshot_bindings(self.current_workspace, selected, canvas_overlay_ids)

        except ValueError as e:
            # Workspace validation failed during save
            messagebox.showerror(
                "Workspace Validation Error",
                f"Error saving overlays to workspace '{self.current_workspace}':\n\n{e}\n\n"
                "Your overlays could not be saved. Please check the workspace.json file."
            )

    def _refresh_overlay_list(self):
        """Refresh the overlay list widget (shows ALL workspace overlays)."""
        if not self.current_workspace:
            return

        # Get selected screenshot to determine bindings
        selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)

        # Load ALL workspace overlays
        all_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)

        # Load bindings for current screenshot
        bound_ids = []
        if selected:
            bound_ids = self.workspace_manager.load_screenshot_bindings(self.current_workspace, selected)

        self.ui_builder.update_overlay_list(
            list(all_overlays.values()),
            self.selected_overlay_id,
            bound_ids,  # NEW: Pass binding state
            self._on_overlay_selected,
            self._on_binding_toggle,  # NEW: Checkbox callback
            self._on_delete_overlay,
            self._on_lock_overlay
        )

    def _on_binding_toggle(self, overlay_id: str, is_bound: bool):
        """Handle overlay binding checkbox toggle (Phase 1.5).

        Args:
            overlay_id: ID of overlay to bind/unbind
            is_bound: True if checkbox is checked, False if unchecked
        """
        selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)
        if not selected:
            return

        # Load workspace overlays
        all_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)

        if is_bound:
            # Add overlay to canvas
            overlay = all_overlays.get(overlay_id)
            if overlay:
                self.canvas_controller.overlay_manager.add_overlay(overlay)
        else:
            # Remove overlay from canvas
            self.canvas_controller.remove_overlay_by_id(overlay_id)

        # Save changes
        self._save_current_overlays()

        # Update parameter panel if this is the selected overlay
        if overlay_id == self.selected_overlay_id:
            if is_bound:
                # Show parameter panel for newly bound overlay
                overlay = all_overlays.get(overlay_id)
                if overlay:
                    self.ui_builder.update_parameter_panel(overlay_id, overlay.type)
                    self._load_overlay_into_spinboxes(overlay_id)
            else:
                # Hide parameter panel for unbound overlay
                self.ui_builder.update_parameter_panel(None, None)

        # Refresh UI
        self._refresh_overlay_list()
        self.canvas_controller.display_image()

    def _load_overlay_into_spinboxes(self, overlay_id: str):
        """Load overlay's config values into spinboxes.

        Args:
            overlay_id: ID of overlay to load
        """
        if not overlay_id or not self.current_workspace:
            return

        # Get the overlay from workspace (not canvas, since not all overlays are bound)
        all_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)
        overlay = all_overlays.get(overlay_id)
        if not overlay:
            return

        # Suppress spinbox callbacks while loading to prevent feedback loop
        self._loading_workspace = True

        try:
            # Load values based on overlay type
            if overlay.type == 'grid':
                self.grid_inputs['start_x'].set(overlay.config['start_x'])
                self.grid_inputs['start_y'].set(overlay.config['start_y'])
                self.grid_inputs['cell_width'].set(overlay.config['cell_width'])
                self.grid_inputs['cell_height'].set(overlay.config['cell_height'])
                self.grid_inputs['spacing_x'].set(overlay.config['spacing_x'])
                self.grid_inputs['spacing_y'].set(overlay.config['spacing_y'])
                self.grid_inputs['columns'].set(overlay.config['columns'])
                self.grid_inputs['rows'].set(overlay.config['rows'])
                self.grid_inputs['crop_padding'].set(overlay.config['crop_padding'])

            elif overlay.type == 'ocr':
                self.ocr_inputs['x'].set(overlay.config['x'])
                self.ocr_inputs['y'].set(overlay.config['y'])
                self.ocr_inputs['width'].set(overlay.config['width'])
                self.ocr_inputs['height'].set(overlay.config['height'])
        finally:
            self._loading_workspace = False

    def _on_overlay_selected(self, overlay_id: str):
        """Handle overlay selection from list."""
        self.selected_overlay_id = overlay_id

        # Get selected screenshot to check if overlay is bound
        selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)
        if not selected:
            return

        # Load all workspace overlays
        all_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)
        overlay = all_overlays.get(overlay_id)

        # Check if overlay is bound to current screenshot
        bound_ids = self.workspace_manager.load_screenshot_bindings(self.current_workspace, selected)
        is_bound = overlay_id in bound_ids

        # Only show parameter panel if overlay is bound (applied)
        if is_bound and overlay:
            # Load overlay's values into spinboxes
            self._load_overlay_into_spinboxes(overlay_id)
            # Update parameter panel to show appropriate controls
            self.ui_builder.update_parameter_panel(overlay_id, overlay.type)
        else:
            # Hide parameter panel for unbound overlays
            self.ui_builder.update_parameter_panel(None, None)

        self._refresh_overlay_list()
        # Redraw to highlight selected overlay (future enhancement)
        self.canvas_controller.display_image()

    def _on_delete_overlay(self):
        """Handle delete overlay button click."""
        if not self.selected_overlay_id or not self.current_workspace:
            return

        # Get overlay from workspace (may not be on canvas if not bound)
        all_overlays = self.workspace_manager.load_workspace_overlays(self.current_workspace)
        overlay = all_overlays.get(self.selected_overlay_id)
        if not overlay:
            return

        # Check if locked
        if overlay.locked:
            messagebox.showwarning("Locked", "Cannot delete locked overlay. Unlock it first.")
            return

        # Confirm deletion
        if messagebox.askyesno("Delete Overlay", f"Delete overlay '{overlay.name}'?"):
            # Remove from canvas if it's currently bound
            self.canvas_controller.remove_overlay_by_id(self.selected_overlay_id)
            self.selected_overlay_id = None

            # Update parameter panel to show empty state (Phase 2)
            self.ui_builder.update_parameter_panel(None, None)

            self._save_current_overlays()
            self._refresh_overlay_list()
            self.canvas_controller.display_image()
            self.update_status(f"Deleted overlay '{overlay.name}'")

    def _on_lock_overlay(self):
        """Handle lock/unlock overlay button click."""
        if not self.selected_overlay_id:
            return

        overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
        if not overlay:
            return

        # Toggle lock
        self.canvas_controller.toggle_overlay_lock(self.selected_overlay_id)
        self._save_current_overlays()
        self._refresh_overlay_list()

        status = "locked" if overlay.locked else "unlocked"
        self.update_status(f"Overlay '{overlay.name}' {status}")

    def delete_screenshot(self):
        """Delete the selected screenshot."""
        selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)
        if not selected:
            messagebox.showinfo("No Selection", "No screenshot selected")
            return

        confirm = messagebox.askyesno(
            "Delete Screenshot",
            f"Delete {selected}?\n\nThis cannot be undone."
        )

        if confirm:
            success = self.workspace_manager.delete_screenshot(self.current_workspace, selected)
            if success:
                self._refresh_screenshot_list()
                # Check if there are any screenshots left
                screenshots = self.workspace_manager.get_screenshots(self.current_workspace)
                if screenshots:
                    self._load_selected_screenshot()
                else:
                    # No screenshots left, clear canvas
                    self.canvas_controller.clear()
                self.update_status(f"Deleted {selected}")

    def on_page_changed(self, new_workspace: str):
        """Handle workspace selector dropdown change."""
        if new_workspace == self.current_workspace:
            return

        # Switch workspace
        self.current_workspace = new_workspace

        # Clear canvas and reset ALL state (image, zoom, pan, overlays)
        self.canvas_controller.clear()

        # Ensure workspace exists (creates workspace.json if needed)
        self.workspace_manager.create_workspace(new_workspace)

        # Load screenshots from workspace
        self._refresh_screenshot_list()

        # Load selected screenshot (if any)
        screenshots = self.workspace_manager.get_screenshots(new_workspace)
        if screenshots:
            self._load_selected_screenshot()
        else:
            # No screenshots yet, offer to capture
            choice = messagebox.askquestion(
                "No Screenshots",
                f"No screenshots found for '{new_workspace}'.\n\nCapture now?",
                icon='question'
            )
            if choice == 'yes':
                self.capture_screenshot()

        self.update_status(f"Switched to workspace: {new_workspace}")

    def create_new_workspace(self):
        """Show dialog to create a new workspace."""
        dialog = tk.Toplevel(self.root)
        dialog.title("Create New Workspace")
        dialog.geometry("450x250")
        dialog.transient(self.root)
        dialog.grab_set()

        # Workspace name input
        ttk.Label(dialog, text="Workspace Name (lowercase with underscores):").pack(pady=5)
        name_var = tk.StringVar(value=self._generate_new_workspace_name())
        name_entry = ttk.Entry(dialog, textvariable=name_var, width=40)
        name_entry.pack(pady=5)
        name_entry.focus()

        # Clone option
        ttk.Label(dialog, text="Clone configuration from (optional):").pack(pady=5)
        clone_var = tk.StringVar(value="None")
        clone_dropdown = ttk.Combobox(dialog, textvariable=clone_var, width=37, state='readonly')
        available_workspaces = self.workspace_manager.list_workspaces()
        clone_dropdown['values'] = ["None"] + available_workspaces
        clone_dropdown.pack(pady=5)

        # Buttons
        button_frame = ttk.Frame(dialog)
        button_frame.pack(pady=20)

        def on_create():
            workspace_name = name_var.get().strip()

            # Validate
            if not workspace_name:
                messagebox.showerror("Invalid Name", "Workspace name cannot be empty", parent=dialog)
                return

            if not re.match(r'^[a-z_][a-z0-9_]*$', workspace_name):
                messagebox.showerror(
                    "Invalid Name",
                    "Workspace name must start with lowercase letter or underscore,\nand contain only lowercase letters, numbers, and underscores.",
                    parent=dialog
                )
                return

            if self.workspace_manager.workspace_exists(workspace_name):
                messagebox.showerror("Duplicate Name", f"Workspace '{workspace_name}' already exists", parent=dialog)
                return

            # Create workspace (with optional cloning)
            clone_from = clone_var.get() if clone_var.get() != "None" else None
            self.workspace_manager.create_workspace(workspace_name, clone_from=clone_from)

            # Update dropdown
            workspaces = self.workspace_manager.list_workspaces()
            self.ui_builder.page_dropdown['values'] = workspaces

            # Switch to new workspace
            self.ui_builder.page_var.set(workspace_name)
            self.on_page_changed(workspace_name)

            dialog.destroy()

        ttk.Button(button_frame, text="Create", command=on_create, width=15).pack(side=tk.LEFT, padx=10)
        ttk.Button(button_frame, text="Cancel", command=dialog.destroy, width=15).pack(side=tk.LEFT, padx=10)

        # Enter key creates
        dialog.bind('<Return>', lambda e: on_create())
        dialog.bind('<Escape>', lambda e: dialog.destroy())

    def _generate_new_workspace_name(self) -> str:
        """Generate a new workspace name like 'new_workspace_1'."""
        base = "new_workspace"
        counter = 1
        while self.workspace_manager.workspace_exists(f"{base}_{counter}"):
            counter += 1
        return f"{base}_{counter}"

    def quit_app(self):
        """Quit the application."""
        self._save_preferences()
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
