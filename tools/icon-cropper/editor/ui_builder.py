"""UI builder for creating menu bar, toolbar, sidebar, and canvas layout.

This module handles all UI component creation, separating UI construction
from application logic.
"""

from typing import Dict, Tuple, Callable
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

        # Enable mousewheel scrolling when mouse is over this canvas
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        def bind_mousewheel(event):
            canvas.bind("<MouseWheel>", on_mousewheel)

        def unbind_mousewheel(event):
            canvas.unbind("<MouseWheel>")

        canvas.bind("<Enter>", bind_mousewheel)
        canvas.bind("<Leave>", unbind_mousewheel)

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
            label="Save Configuration",
            command=self.callbacks['save_config'],
            accelerator="Ctrl+S"
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

        # Screenshot buttons
        screenshot_frame = ttk.LabelFrame(left_panel, text="Screenshot", padding=10)
        screenshot_frame.pack(fill=tk.X, pady=5)

        ttk.Button(
            screenshot_frame,
            text="📂 Open Screenshot",
            command=self.callbacks['open_screenshot']
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            screenshot_frame,
            text="📷 Capture Screenshot",
            command=self.callbacks['capture_screenshot']
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

        # Load configuration button
        load_frame = ttk.LabelFrame(left_panel, text="Load Config", padding=10)
        load_frame.pack(fill=tk.X, pady=5)

        ttk.Button(
            load_frame,
            text="📂 Load From Config (Ctrl+L)",
            command=self.callbacks['load_from_config']
        ).pack(fill=tk.X, pady=2)

        ttk.Label(
            load_frame,
            text="Apply saved grid & OCR\nfrom config.yaml",
            font=("Arial", 9),
            foreground="gray",
            justify=tk.CENTER
        ).pack(pady=(0, 5))

        # Preview and Save buttons
        save_frame = ttk.LabelFrame(left_panel, text="Preview & Save", padding=10)
        save_frame.pack(fill=tk.X, pady=5)

        ttk.Button(
            save_frame,
            text="👁️ Preview Icons (Ctrl+P)",
            command=self.callbacks['preview_icons']
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            save_frame,
            text="💾 Save Configuration (Ctrl+S)",
            command=self.callbacks['save_config']
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

        # Notebook for Grid and OCR tabs
        notebook = ttk.Notebook(left_panel)
        notebook.pack(fill=tk.BOTH, expand=True, pady=5)

        # Grid configuration tab (scrollable)
        grid_tab_outer = ttk.Frame(notebook)
        notebook.add(grid_tab_outer, text="Grid Layout")
        grid_tab = self._create_scrollable_frame(grid_tab_outer)

        # OCR region tab (scrollable)
        ocr_tab_outer = ttk.Frame(notebook)
        notebook.add(ocr_tab_outer, text="OCR Region")
        ocr_tab = self._create_scrollable_frame(ocr_tab_outer)

        # Store references for returning
        self._grid_tab = grid_tab
        self._ocr_tab = ocr_tab

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
        canvas = tk.Canvas(
            canvas_frame,
            bg="#2b2b2b",
            xscrollcommand=h_scrollbar.set,
            yscrollcommand=v_scrollbar.set
        )
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        h_scrollbar.config(command=canvas.xview)
        v_scrollbar.config(command=canvas.yview)

        # Status bar
        status_bar = ttk.Label(
            self.root,
            text="Ready",
            relief=tk.SUNKEN,
            anchor=tk.W
        )
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)

        return left_panel, canvas, instruction_label, status_bar, grid_tab, ocr_tab

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
