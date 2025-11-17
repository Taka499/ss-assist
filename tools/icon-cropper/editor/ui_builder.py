"""UI builder for creating menu bar, toolbar, sidebar, and canvas layout.

This module handles all UI component creation, separating UI construction
from application logic.
"""

from typing import Dict, Tuple, Callable, List, Optional, Any
import tkinter as tk
from tkinter import ttk


class UIBuilder:
    """Builds UI components: menu bar, toolbar, sidebar, canvas."""

    def __init__(self, root: tk.Tk, callbacks: Dict[str, Callable]):
        """Initialize with root window and command callbacks.

        Args:
            root: Root Tkinter window
            callbacks: Dictionary mapping callback names to functions:
                - 'open_screenshot': Callback for File → Open
                - 'capture_screenshot': Callback for File → Capture
                - 'quit_app': Callback for File → Exit
                - 'zoom_in': Callback for View → Zoom In
                - 'zoom_out': Callback for View → Zoom Out
                - 'reset_zoom': Callback for View → Reset Zoom
                - 'show_about': Callback for Help → About
                - 'enter_grid_edit_mode': Callback for Edit Grid Layout button
                - 'enter_ocr_edit_mode': Callback for Edit OCR Region button
                - 'exit_edit_mode': Callback for Exit Edit Mode button
        """
        self.root = root
        self.callbacks = callbacks
        self.screenshot_selected_var = tk.StringVar()  # Persistent selection state
        self.overlay_selected_var = tk.StringVar()  # Persistent overlay selection state

        # Storage for parameter panel variants (Phase 2: Dynamic Parameter Panel)
        self.param_content_container = None
        self.empty_state_panel = None
        self.grid_params_panel = None
        self.ocr_params_panel = None
        self.current_param_panel = None

        # IntVars for spinboxes (shared with config_editor callbacks)
        self.grid_input_vars = {}
        self.ocr_input_vars = {}

    def _enable_mousewheel_scrolling(self, canvas: tk.Canvas):
        """Enable mousewheel scrolling for a canvas when mouse hovers over it.

        This binds mousewheel events to the canvas on Enter and unbinds on Leave,
        preventing conflicts with other scrollable areas.

        Args:
            canvas: Canvas widget to enable mousewheel scrolling for
        """
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        def bind_mousewheel(event):
            canvas.bind("<MouseWheel>", on_mousewheel)

        def unbind_mousewheel(event):
            canvas.unbind("<MouseWheel>")

        canvas.bind("<Enter>", bind_mousewheel)
        canvas.bind("<Leave>", unbind_mousewheel)

    def _create_scrollable_frame(self, parent: ttk.Frame) -> ttk.Frame:
        """Create a scrollable frame inside a parent frame.

        Args:
            parent: Parent frame to contain the scrollable area

        Returns:
            Inner frame that can hold widgets (will be scrollable)
        """
        # Create canvas for scrolling
        canvas = tk.Canvas(parent, highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient=tk.VERTICAL, command=canvas.yview)

        # Create inner frame that will hold the actual content
        scrollable_frame = ttk.Frame(canvas, padding=10)

        # Configure scrolling
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        # Create window in canvas
        canvas.create_window((0, 0), window=scrollable_frame, anchor=tk.NW)
        canvas.configure(yscrollcommand=scrollbar.set)

        # Pack canvas and scrollbar
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Enable mousewheel scrolling
        self._enable_mousewheel_scrolling(canvas)

        return scrollable_frame

    def create_menu_bar(self):
        """Create and configure the application menu bar.

        Returns:
            The configured menu bar (already set on root window)
        """
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(
            label="Open Screenshot...",
            command=self.callbacks['open_screenshot'],
            accelerator="Ctrl+O"
        )
        file_menu.add_command(
            label="Capture Screenshot",
            command=self.callbacks['capture_screenshot'],
            accelerator="Ctrl+G"
        )
        file_menu.add_separator()
        file_menu.add_command(
            label="Exit",
            command=self.callbacks['quit_app'],
            accelerator="Ctrl+Q"
        )

        # View menu
        view_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="View", menu=view_menu)
        view_menu.add_command(
            label="Zoom In",
            command=self.callbacks['zoom_in'],
            accelerator="+"
        )
        view_menu.add_command(
            label="Zoom Out",
            command=self.callbacks['zoom_out'],
            accelerator="-"
        )
        view_menu.add_command(
            label="Reset Zoom",
            command=self.callbacks['reset_zoom'],
            accelerator="0"
        )

        # Tools menu
        tools_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Tools", menu=tools_menu)
        tools_menu.add_command(
            label="✂️ Batch Crop All...",
            command=self.callbacks['batch_crop_all'],
            accelerator="Ctrl+B"
        )
        tools_menu.add_command(
            label="🏷️ Annotate Icons...",
            command=self.callbacks['annotate_icons'],
            accelerator="Ctrl+A"
        )

        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=self.callbacks['show_about'])

        return menubar

    def create_main_layout(self) -> Tuple[ttk.Frame, tk.Canvas, ttk.Label, ttk.Label]:
        """Create the main application layout.

        Creates:
        - Left sidebar with tools and inputs
        - Right panel with scrollable canvas
        - Status bar at bottom

        Returns:
            Tuple of (left_panel, canvas, instruction_label, status_bar)
        """
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Left panel for tools
        left_panel = ttk.Frame(main_frame, width=280)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        left_panel.pack_propagate(False)  # Maintain fixed width

        ttk.Label(left_panel, text="Tools", font=("Arial", 12, "bold")).pack(pady=5)

        # Workspace selector frame (at top of left panel)
        workspace_frame = ttk.Frame(left_panel)
        workspace_frame.pack(fill=tk.X, padx=5, pady=(5, 5))

        ttk.Label(workspace_frame, text="Workspace:").pack(side=tk.LEFT, padx=(0, 5))

        # Dropdown showing current workspace
        self.workspace_var = tk.StringVar(value="character_select")
        self.workspace_dropdown = ttk.Combobox(workspace_frame, textvariable=self.workspace_var, width=18, state='readonly')
        self.workspace_dropdown.pack(side=tk.LEFT, padx=5)
        self.workspace_dropdown.bind('<<ComboboxSelected>>', lambda e: self.callbacks['on_workspace_changed'](self.workspace_var.get()))

        # [+] button to create new workspace
        add_workspace_btn = ttk.Button(
            workspace_frame,
            text="+",
            command=self.callbacks['create_new_workspace'],
            width=3
        )
        add_workspace_btn.pack(side=tk.LEFT, padx=2)

        # Separator
        ttk.Separator(left_panel, orient=tk.HORIZONTAL).pack(fill=tk.X, padx=5, pady=5)

        # Screenshot list frame
        screenshot_list_frame = ttk.LabelFrame(left_panel, text="Screenshots", padding=5)
        screenshot_list_frame.pack(fill=tk.BOTH, expand=False, padx=5, pady=5)

        # Scrollable screenshot list
        list_canvas = tk.Canvas(screenshot_list_frame, height=120, highlightthickness=0)
        list_scrollbar = ttk.Scrollbar(screenshot_list_frame, orient=tk.VERTICAL, command=list_canvas.yview)
        list_canvas.configure(yscrollcommand=list_scrollbar.set)

        list_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        list_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        screenshot_list_inner = ttk.Frame(list_canvas)
        list_canvas.create_window((0, 0), window=screenshot_list_inner, anchor='nw')

        # Enable mousewheel scrolling
        self._enable_mousewheel_scrolling(list_canvas)

        # Store reference for updating
        self.screenshot_list_frame = screenshot_list_inner
        self.screenshot_list_canvas = list_canvas

        # Screenshot action buttons
        screenshot_btn_frame = ttk.Frame(left_panel)
        screenshot_btn_frame.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(
            screenshot_btn_frame,
            text="📷 Capture",
            command=self.callbacks['capture_screenshot']
        ).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)

        ttk.Button(
            screenshot_btn_frame,
            text="🗑️ Delete",
            command=self.callbacks['delete_screenshot']
        ).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)

        # Separator
        ttk.Separator(left_panel, orient=tk.HORIZONTAL).pack(fill=tk.X, padx=5, pady=5)

        # Open screenshot button (for loading from file)
        open_frame = ttk.Frame(left_panel)
        open_frame.pack(fill=tk.X, padx=5, pady=5)

        ttk.Button(
            open_frame,
            text="📂 Open Screenshot",
            command=self.callbacks['open_screenshot']
        ).pack(fill=tk.X, pady=2)

        # Mode selection buttons
        mode_frame = ttk.LabelFrame(left_panel, text="Mode", padding=10)
        mode_frame.pack(fill=tk.X, pady=5)

        ttk.Button(
            mode_frame,
            text="🔲 Draw Grid Layout",
            command=self.callbacks['enter_grid_edit_mode']
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            mode_frame,
            text="📄 Draw OCR Region",
            command=self.callbacks['enter_ocr_edit_mode']
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            mode_frame,
            text="🖱️ Pan/Zoom Mode",
            command=self.callbacks['enter_pan_mode']
        ).pack(fill=tk.X, pady=2)

        # Actions section
        actions_frame = ttk.LabelFrame(left_panel, text="Actions", padding=10)
        actions_frame.pack(fill=tk.X, pady=5)

        ttk.Button(
            actions_frame,
            text="👁️ Preview Icons (Ctrl+P)",
            command=self.callbacks['preview_icons']
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            actions_frame,
            text="✂️ Batch Crop All (Ctrl+B)",
            command=self.callbacks['batch_crop_all']
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            actions_frame,
            text="🏷️ Annotate Icons (Ctrl+A)",
            command=self.callbacks['annotate_icons']
        ).pack(fill=tk.X, pady=2)

        # Instructions label (shared between tabs)
        instruction_label = ttk.Label(
            left_panel,
            text="Select a mode above to begin",
            wraplength=240,
            foreground="blue",
            padding=5
        )
        instruction_label.pack(pady=5)

        # Right panel - split between canvas and overlay management
        right_container = ttk.Frame(main_frame)
        right_container.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Create PanedWindow to split canvas and overlay panel
        paned = ttk.PanedWindow(right_container, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True)

        # Canvas panel (left side of paned window)
        canvas_panel = ttk.Frame(paned)
        paned.add(canvas_panel, weight=10)

        # Overlay panel (right side of paned window) - narrower
        overlay_panel = ttk.Frame(paned)
        paned.add(overlay_panel, weight=1)

        # Store reference and set sash position after window is mapped
        self.paned_window = paned
        # Set sash position to make overlay panel ~300px wide (will be set after window size is known)
        def set_initial_sash():
            try:
                window_width = right_container.winfo_width()
                if window_width > 300:  # Only set if window has been sized
                    overlay_width = 300
                    sash_pos = window_width - overlay_width
                    paned.sashpos(0, sash_pos)
            except:
                pass

        # Schedule after window is displayed
        self.root.after(100, set_initial_sash)

        # Create canvas with scrollbars
        canvas_frame = ttk.Frame(canvas_panel)
        canvas_frame.pack(fill=tk.BOTH, expand=True)

        # Scrollbars
        h_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.HORIZONTAL)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)

        v_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.VERTICAL)
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Canvas
        canvas = tk.Canvas(
            canvas_frame,
            bg="#2b2b2b",
            xscrollcommand=h_scrollbar.set,
            yscrollcommand=v_scrollbar.set
        )
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        h_scrollbar.config(command=canvas.xview)
        v_scrollbar.config(command=canvas.yview)

        # === Overlay Management Panel (Right Sidebar) ===
        ttk.Label(overlay_panel, text="Overlays", font=("Arial", 12, "bold")).pack(pady=(5, 10))

        # Overlay count label
        self.overlay_count_label = ttk.Label(overlay_panel, text="No overlays", foreground="gray")
        self.overlay_count_label.pack(pady=(0, 5))

        # Scrollable overlay list
        overlay_list_frame = ttk.Frame(overlay_panel)
        overlay_list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        overlay_canvas = tk.Canvas(overlay_list_frame, highlightthickness=0)
        overlay_scrollbar = ttk.Scrollbar(overlay_list_frame, orient=tk.VERTICAL, command=overlay_canvas.yview)
        overlay_canvas.configure(yscrollcommand=overlay_scrollbar.set)

        overlay_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        overlay_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        overlay_list_inner = ttk.Frame(overlay_canvas)
        overlay_canvas.create_window((0, 0), window=overlay_list_inner, anchor='nw')

        # Enable mousewheel scrolling
        self._enable_mousewheel_scrolling(overlay_canvas)

        # Store references for updating
        self.overlay_list_frame = overlay_list_inner
        self.overlay_list_canvas = overlay_canvas

        # Control buttons
        button_frame = ttk.Frame(overlay_panel)
        button_frame.pack(fill=tk.X, padx=5, pady=10)

        self.delete_overlay_btn = ttk.Button(
            button_frame,
            text="🗑️ Delete",
            state='disabled'
        )
        self.delete_overlay_btn.pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)

        self.lock_overlay_btn = ttk.Button(
            button_frame,
            text="🔒 Lock",
            state='disabled'
        )
        self.lock_overlay_btn.pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)

        # === Dynamic Parameter Panel (Moved from left panel) ===
        ttk.Separator(overlay_panel, orient=tk.HORIZONTAL).pack(fill=tk.X, padx=5, pady=10)

        # Build parameter panel in overlay panel (right sidebar)
        param_panel = self._build_dynamic_parameter_panel(overlay_panel)

        # Status bar
        status_bar = ttk.Label(
            self.root,
            text="Ready",
            relief=tk.SUNKEN,
            anchor=tk.W
        )
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)

        # Store reference to overlay panel
        self.overlay_panel = overlay_panel

        return left_panel, canvas, instruction_label, status_bar

    def _build_dynamic_parameter_panel(self, parent: ttk.Frame) -> ttk.Frame:
        """Create dynamic parameter panel that shows different controls based on selected overlay.

        Args:
            parent: Parent frame for the parameter panel

        Returns:
            The parameter panel container
        """
        # Container frame
        param_frame = ttk.LabelFrame(parent, text="Overlay Parameters", padding=10)
        param_frame.pack(fill=tk.BOTH, expand=True, pady=5)

        # Content container that will swap its children
        self.param_content_container = ttk.Frame(param_frame)
        self.param_content_container.pack(fill=tk.BOTH, expand=True)

        # Create all three panel variants (will be packed/unpacked as needed)
        self.empty_state_panel = self._create_empty_state_panel()
        self.grid_params_panel = self._create_grid_params_panel()
        self.ocr_params_panel = self._create_ocr_params_panel()

        # Initially show empty state
        self.current_param_panel = None
        self._show_panel(self.empty_state_panel)

        return param_frame

    def _create_empty_state_panel(self) -> ttk.Frame:
        """Create empty state panel shown when no overlay is selected.

        Returns:
            The empty state panel
        """
        panel = ttk.Frame(self.param_content_container)

        message = ttk.Label(
            panel,
            text="No overlay selected\n\nSelect an overlay from the list\nto edit its parameters",
            justify="center",
            foreground="gray"
        )
        message.pack(expand=True, pady=50)

        return panel

    def _create_grid_params_panel(self) -> ttk.Frame:
        """Create grid parameter spinboxes panel (scrollable).

        Returns:
            The grid parameters panel with 9 spinboxes
        """
        # Outer container
        panel = ttk.Frame(self.param_content_container)

        # Make scrollable content
        scrollable_content = self._create_scrollable_frame(panel)

        # Grid parameters (9 spinboxes)
        grid_params = [
            ("start_x", "Start X:", 0, 10000),
            ("start_y", "Start Y:", 0, 10000),
            ("cell_width", "Cell Width:", 1, 1000),
            ("cell_height", "Cell Height:", 1, 1000),
            ("spacing_x", "Spacing X:", 0, 500),
            ("spacing_y", "Spacing Y:", 0, 500),
            ("columns", "Columns:", 1, 100),
            ("rows", "Rows:", 1, 100),
            ("crop_padding", "Crop Padding:", 0, 100),
        ]

        for i, (key, label, min_val, max_val) in enumerate(grid_params):
            row = ttk.Frame(scrollable_content)
            row.pack(fill=tk.X, pady=2)

            ttk.Label(row, text=label, width=15).pack(side=tk.LEFT)

            # Create IntVar if not exists (shared with config_editor)
            if key not in self.grid_input_vars:
                self.grid_input_vars[key] = tk.IntVar(value=0)

            spinbox = ttk.Spinbox(
                row,
                from_=min_val,
                to=max_val,
                textvariable=self.grid_input_vars[key],
                width=5
            )
            spinbox.pack(side=tk.LEFT, padx=2)

        return panel

    def _create_ocr_params_panel(self) -> ttk.Frame:
        """Create OCR parameter spinboxes panel (scrollable).

        Returns:
            The OCR parameters panel with 4 spinboxes
        """
        # Outer container
        panel = ttk.Frame(self.param_content_container)

        # Make scrollable content
        scrollable_content = self._create_scrollable_frame(panel)

        # OCR parameters (4 spinboxes)
        ocr_params = [
            ("x", "X:", 0, 10000),
            ("y", "Y:", 0, 10000),
            ("width", "Width:", 0, 10000),
            ("height", "Height:", 0, 10000),
        ]

        for key, label, min_val, max_val in ocr_params:
            row = ttk.Frame(scrollable_content)
            row.pack(fill=tk.X, pady=2)

            ttk.Label(row, text=label, width=15).pack(side=tk.LEFT)

            # Create IntVar if not exists
            if key not in self.ocr_input_vars:
                self.ocr_input_vars[key] = tk.IntVar(value=0)

            spinbox = ttk.Spinbox(
                row,
                from_=min_val,
                to=max_val,
                textvariable=self.ocr_input_vars[key],
                width=5
            )
            spinbox.pack(side=tk.LEFT, padx=2)

        return panel

    def _show_panel(self, panel: ttk.Frame):
        """Hide current panel and show the specified panel.

        Args:
            panel: Panel to show
        """
        # Hide current panel
        if self.current_param_panel:
            self.current_param_panel.pack_forget()

        # Show new panel
        panel.pack(fill=tk.BOTH, expand=True)
        self.current_param_panel = panel

    def update_parameter_panel(self, overlay_id: Optional[str], overlay_type: Optional[str]):
        """Update parameter panel based on selected overlay.

        Called by config_editor when overlay selection changes.

        Args:
            overlay_id: ID of selected overlay (None if no selection)
            overlay_type: Type of overlay ("grid" or "ocr", None if no selection)
        """
        if not overlay_id or not overlay_type:
            self._show_panel(self.empty_state_panel)
            return

        # Show appropriate panel based on overlay type
        if overlay_type == 'grid':
            self._show_panel(self.grid_params_panel)
        elif overlay_type == 'ocr':
            self._show_panel(self.ocr_params_panel)
        else:
            self._show_panel(self.empty_state_panel)

    def create_grid_inputs(
        self,
        parent: ttk.Frame,
        grid_config: Dict[str, int],
        on_change_callback: Callable
    ) -> Dict[str, tk.IntVar]:
        """Create grid parameter input widgets.

        Creates Spinbox widgets for all grid parameters with trace callbacks.

        Args:
            parent: Parent frame for input widgets
            grid_config: Dictionary with initial grid parameter values
            on_change_callback: Callback invoked when any parameter changes

        Returns:
            Dictionary mapping parameter names to IntVar instances
        """
        inputs_frame = ttk.Frame(parent)
        inputs_frame.pack(fill=tk.BOTH, expand=True)

        grid_inputs = {}
        row = 0

        # Position inputs
        ttk.Label(inputs_frame, text="Position:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(5, 2)
        )
        row += 1

        for param in ['start_x', 'start_y']:
            label = param.replace('_', ' ').title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(
                row=row, column=0, sticky=tk.W, pady=2
            )

            var = tk.IntVar(value=grid_config[param])
            spinbox = ttk.Spinbox(
                inputs_frame, textvariable=var, width=8, from_=0, to=9999, increment=1
            )
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            grid_inputs[param] = var
            var.trace_add('write', lambda *args: on_change_callback())
            row += 1

        # Cell dimensions
        ttk.Label(inputs_frame, text="Cell Size:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(10, 2)
        )
        row += 1

        for param in ['cell_width', 'cell_height']:
            label = param.replace('_', ' ').title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(
                row=row, column=0, sticky=tk.W, pady=2
            )

            var = tk.IntVar(value=grid_config[param])
            spinbox = ttk.Spinbox(
                inputs_frame, textvariable=var, width=8, from_=1, to=9999, increment=1
            )
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            grid_inputs[param] = var
            var.trace_add('write', lambda *args: on_change_callback())
            row += 1

        # Spacing
        ttk.Label(inputs_frame, text="Spacing:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(10, 2)
        )
        row += 1

        for param in ['spacing_x', 'spacing_y']:
            label = param.replace('_', ' ').title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(
                row=row, column=0, sticky=tk.W, pady=2
            )

            var = tk.IntVar(value=grid_config[param])
            spinbox = ttk.Spinbox(
                inputs_frame, textvariable=var, width=8, from_=0, to=999, increment=1
            )
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            grid_inputs[param] = var
            var.trace_add('write', lambda *args: on_change_callback())
            row += 1

        # Grid dimensions
        ttk.Label(inputs_frame, text="Grid Size:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(10, 2)
        )
        row += 1

        for param in ['columns', 'rows']:
            label = param.title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(
                row=row, column=0, sticky=tk.W, pady=2
            )

            var = tk.IntVar(value=grid_config[param])
            spinbox = ttk.Spinbox(
                inputs_frame, textvariable=var, width=8, from_=1, to=99, increment=1
            )
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            grid_inputs[param] = var
            var.trace_add('write', lambda *args: on_change_callback())
            row += 1

        # Crop padding
        ttk.Label(inputs_frame, text="Crop Padding:").grid(
            row=row, column=0, sticky=tk.W, pady=2
        )
        var = tk.IntVar(value=grid_config['crop_padding'])
        spinbox = ttk.Spinbox(
            inputs_frame, textvariable=var, width=8, from_=0, to=99, increment=1
        )
        spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        grid_inputs['crop_padding'] = var
        var.trace_add('write', lambda *args: on_change_callback())

        return grid_inputs

    def create_ocr_inputs(
        self,
        parent: ttk.Frame,
        ocr_config: Dict[str, int],
        on_change_callback: Callable
    ) -> Dict[str, tk.IntVar]:
        """Create OCR region parameter input widgets.

        Creates Spinbox widgets for OCR region parameters (x, y, width, height)
        with trace callbacks.

        Args:
            parent: Parent frame for input widgets
            ocr_config: Dictionary with initial OCR region parameter values
            on_change_callback: Callback invoked when any parameter changes

        Returns:
            Dictionary mapping parameter names to IntVar instances
        """
        inputs_frame = ttk.Frame(parent)
        inputs_frame.pack(fill=tk.BOTH, expand=True)

        ocr_inputs = {}
        row = 0

        # OCR region position and size
        ttk.Label(inputs_frame, text="Position & Size:", font=("Arial", 9, "bold")).grid(
            row=row, column=0, columnspan=2, sticky=tk.W, pady=(5, 2)
        )
        row += 1

        for param in ['x', 'y', 'width', 'height']:
            label = param.upper() if len(param) == 1 else param.title()
            ttk.Label(inputs_frame, text=f"{label}:").grid(
                row=row, column=0, sticky=tk.W, pady=2
            )

            var = tk.IntVar(value=ocr_config.get(param, 0))
            spinbox = ttk.Spinbox(
                inputs_frame, textvariable=var, width=8, from_=0, to=9999, increment=1
            )
            spinbox.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))

            ocr_inputs[param] = var
            var.trace_add('write', lambda *args: on_change_callback())
            row += 1

        return ocr_inputs

    def update_screenshot_list(self, screenshots: List[Dict[str, Any]], selected: Optional[str], on_select_callback: Callable):
        """Update the screenshot list widget.

        Args:
            screenshots: List of screenshot metadata dicts
            selected: Currently selected screenshot filename
            on_select_callback: Function to call when a screenshot is selected
        """
        # Clear existing widgets
        for widget in self.screenshot_list_frame.winfo_children():
            widget.destroy()

        # Set the selection value (use persistent instance variable)
        self.screenshot_selected_var.set(selected or "")

        for screenshot in screenshots:
            filename = screenshot["filename"]
            resolution = screenshot.get("resolution", [0, 0])

            frame = ttk.Frame(self.screenshot_list_frame)
            frame.pack(fill=tk.X, pady=2)

            radio = ttk.Radiobutton(
                frame,
                text=f"{filename}",
                variable=self.screenshot_selected_var,
                value=filename,
                command=lambda f=filename: on_select_callback(f)
            )
            radio.pack(side=tk.LEFT, anchor='w')

            res_label = ttk.Label(
                frame,
                text=f"{resolution[0]}×{resolution[1]}",
                font=('Segoe UI', 8),
                foreground='gray'
            )
            res_label.pack(side=tk.RIGHT, anchor='e')

        # Update scroll region
        self.screenshot_list_frame.update_idletasks()
        self.screenshot_list_canvas.configure(scrollregion=self.screenshot_list_canvas.bbox('all'))

    def update_overlay_list(self, overlays: List[Any], selected_id: Optional[str],
                           bound_ids: List[str],
                           on_select_callback: Callable,
                           on_binding_toggle_callback: Callable,
                           on_delete_callback: Callable,
                           on_lock_callback: Callable):
        """Update the overlay list widget.

        Args:
            overlays: List of Overlay objects
            selected_id: Currently selected overlay ID
            bound_ids: List of overlay IDs bound to current screenshot
            on_select_callback: Function to call when an overlay is selected (overlay_id)
            on_binding_toggle_callback: Function to call when Apply checkbox is toggled (overlay_id, is_bound)
            on_delete_callback: Function to call when delete button is clicked
            on_lock_callback: Function to call when lock button is clicked
        """
        # Clear existing widgets
        for widget in self.overlay_list_frame.winfo_children():
            widget.destroy()

        if not overlays:
            self.overlay_count_label.config(text="No overlays")
            self.delete_overlay_btn.config(state='disabled')
            self.lock_overlay_btn.config(state='disabled')
            return

        # Update count
        self.overlay_count_label.config(text=f"{len(overlays)} overlay{'s' if len(overlays) != 1 else ''} in workspace")

        # Set the selection value (use persistent instance variable)
        self.overlay_selected_var.set(selected_id or "")

        def on_mousewheel(event):
            self.overlay_list_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        for overlay in overlays:
            frame = ttk.Frame(self.overlay_list_frame)
            frame.pack(fill=tk.X, pady=2)

            # Icon based on type
            icon = "🔲" if overlay.type == "grid" else "📄"

            # Lock icon if locked
            lock_icon = "🔒 " if overlay.locked else ""

            # Radio button with icon and name
            radio = ttk.Radiobutton(
                frame,
                text=f"{lock_icon}{icon} {overlay.name}",
                variable=self.overlay_selected_var,
                value=overlay.id,
                command=lambda oid=overlay.id: on_select_callback(oid)
            )
            radio.pack(side=tk.LEFT, anchor='w', fill=tk.X, expand=True)

            # Apply checkbox (bind/unbind from screenshot) - on the right
            var = tk.BooleanVar(value=(overlay.id in bound_ids))
            checkbox = ttk.Checkbutton(
                frame,
                text="Apply",
                variable=var,
                command=lambda oid=overlay.id, v=var: on_binding_toggle_callback(oid, v.get())
            )
            checkbox.pack(side=tk.RIGHT, padx=5)

            # Bind mousewheel to frame, radio button, and checkbox for scrolling
            frame.bind("<MouseWheel>", on_mousewheel)
            radio.bind("<MouseWheel>", on_mousewheel)
            checkbox.bind("<MouseWheel>", on_mousewheel)

        # Update scroll region
        self.overlay_list_frame.update_idletasks()
        self.overlay_list_canvas.configure(scrollregion=self.overlay_list_canvas.bbox('all'))

        # Wire up button callbacks
        self.delete_overlay_btn.config(command=on_delete_callback)
        self.lock_overlay_btn.config(command=on_lock_callback)

        # Enable buttons if an overlay is selected
        if selected_id:
            # Find selected overlay to check if locked
            selected_overlay = next((o for o in overlays if o.id == selected_id), None)
            if selected_overlay:
                # Delete button disabled if locked
                self.delete_overlay_btn.config(state='disabled' if selected_overlay.locked else 'normal')
                # Lock button shows current state
                self.lock_overlay_btn.config(
                    text="🔓 Unlock" if selected_overlay.locked else "🔒 Lock",
                    state='normal'
                )
            else:
                self.delete_overlay_btn.config(state='disabled')
                self.lock_overlay_btn.config(state='disabled')
        else:
            self.delete_overlay_btn.config(state='disabled')
            self.lock_overlay_btn.config(state='disabled')

