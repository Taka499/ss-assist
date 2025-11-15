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

        # Page selector frame (at top of left panel)
        page_frame = ttk.Frame(left_panel)
        page_frame.pack(fill=tk.X, padx=5, pady=(5, 5))

        ttk.Label(page_frame, text="Page:").pack(side=tk.LEFT, padx=(0, 5))

        # Dropdown showing current page
        self.page_var = tk.StringVar(value="character_select")
        self.page_dropdown = ttk.Combobox(page_frame, textvariable=self.page_var, width=18, state='readonly')
        self.page_dropdown.pack(side=tk.LEFT, padx=5)
        self.page_dropdown.bind('<<ComboboxSelected>>', lambda e: self.callbacks['on_page_changed'](self.page_var.get()))

        # [+] button to create new page
        add_page_btn = ttk.Button(
            page_frame,
            text="+",
            command=self.callbacks['create_new_page'],
            width=3
        )
        add_page_btn.pack(side=tk.LEFT, padx=2)

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

        # Right panel - split between canvas and overlay management
        right_container = ttk.Frame(main_frame)
        right_container.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Create PanedWindow to split canvas and overlay panel
        paned = ttk.PanedWindow(right_container, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True)

        # Canvas panel (left side of paned window)
        canvas_panel = ttk.Frame(paned)
        paned.add(canvas_panel, weight=3)

        # Overlay panel (right side of paned window)
        overlay_panel = ttk.Frame(paned, width=200)
        paned.add(overlay_panel, weight=1)

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
                           on_select_callback: Callable, on_delete_callback: Callable,
                           on_lock_callback: Callable):
        """Update the overlay list widget.

        Args:
            overlays: List of Overlay objects
            selected_id: Currently selected overlay ID
            on_select_callback: Function to call when an overlay is selected (overlay_id)
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
        self.overlay_count_label.config(text=f"{len(overlays)} overlay{'s' if len(overlays) != 1 else ''}")

        # Set the selection value (use persistent instance variable)
        self.overlay_selected_var.set(selected_id or "")

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
