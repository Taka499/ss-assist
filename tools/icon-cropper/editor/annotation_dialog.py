"""Annotation dialog for assigning names to cropped icons.

This dialog allows users to:
1. Enter icon names manually (one per line) OR import from CSV
2. Assign names to each cropped icon from the workspace
3. Select an output directory
4. Save annotated icons with proper filenames (001.png, 002.png, ...)
"""

import csv
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from pathlib import Path
from PIL import Image, ImageTk
from typing import List, Tuple, Dict, Optional
import shutil


class AnnotationDialog:
    """Dialog for annotating cropped icons with names."""

    def __init__(self, parent, workspace_name: str, workspaces_root: Path = Path("workspaces")):
        """Initialize annotation dialog.

        Args:
            parent: Parent tkinter window
            workspace_name: Name of workspace to annotate
            workspaces_root: Root directory containing workspaces
        """
        self.parent = parent
        self.workspace_name = workspace_name
        self.workspaces_root = workspaces_root
        self.result = False  # True if user clicked Save, False if cancelled

        # Input mode: "manual" or "csv"
        self.input_mode = tk.StringVar(value="manual")

        # Manual input
        self.manual_text: Optional[scrolledtext.ScrolledText] = None
        self.available_names: List[str] = []

        # CSV data
        self.csv_path: Optional[Path] = None
        self.csv_data: List[Dict[str, str]] = []  # List of row dicts
        self.csv_headers: List[str] = []
        self.selected_column: Optional[str] = None

        # Output directory
        self.output_directory: Optional[Path] = None

        # Icon data: list of (icon_path, display_label, assigned_name)
        self.icons: List[Tuple[Path, str, Optional[str]]] = []

        # UI widgets (keep references for updates)
        self.manual_frame: Optional[ttk.Frame] = None
        self.csv_frame: Optional[ttk.Frame] = None
        self.column_selector: Optional[ttk.Combobox] = None
        self.output_entry: Optional[ttk.Entry] = None
        self.icon_dropdowns: List[ttk.Combobox] = []
        self.icon_photos: List[ImageTk.PhotoImage] = []  # Keep references to prevent GC

        # Create dialog window
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(f"Annotate Icons - {workspace_name}")
        self.dialog.geometry("900x750")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        self.dialog.resizable(True, True)

        # Gather cropped icons from workspace
        try:
            self._gather_cropped_icons()
        except Exception as e:
            self._show_error(f"Failed to load icons: {e}")
            return

        if not self.icons:
            self._show_error("No cropped icons found. Run batch crop first.")
            return

        # Build UI
        self._build_ui()

        # Center dialog
        self.dialog.update_idletasks()
        x = (parent.winfo_screenwidth() // 2) - (self.dialog.winfo_width() // 2)
        y = (parent.winfo_screenheight() // 2) - (self.dialog.winfo_height() // 2)
        self.dialog.geometry(f"+{x}+{y}")

    def _show_error(self, message: str):
        """Show error message and close dialog."""
        error_label = ttk.Label(
            self.dialog,
            text=f"Error: {message}",
            foreground="red",
            font=("TkDefaultFont", 12, "bold")
        )
        error_label.pack(pady=20)

        ttk.Button(self.dialog, text="Close", command=self.dialog.destroy).pack(pady=10)

    def _gather_cropped_icons(self):
        """Scan workspace cropped/ directory for all icons.

        Populates self.icons with list of (icon_path, display_label, None).
        Display label format: "Screenshot 003 / grid_1 / Icon 12"
        """
        workspace_path = self.workspaces_root / self.workspace_name
        cropped_path = workspace_path / "cropped"

        if not cropped_path.exists():
            return

        # Scan all screenshot directories
        for screenshot_dir in sorted(cropped_path.iterdir()):
            if not screenshot_dir.is_dir():
                continue

            screenshot_name = screenshot_dir.name

            # Scan all overlay directories within screenshot
            for overlay_dir in sorted(screenshot_dir.iterdir()):
                if not overlay_dir.is_dir():
                    continue

                overlay_name = overlay_dir.name

                # Scan all icon files within overlay
                for icon_file in sorted(overlay_dir.glob("*.png")):
                    # Extract icon number from filename (e.g., "001.png" -> "001")
                    icon_num = icon_file.stem

                    # Create display label
                    display_label = f"{screenshot_name} / {overlay_name} / Icon {icon_num}"

                    # Add to list (path, label, assigned_name=None)
                    self.icons.append((icon_file, display_label, None))

    def _build_ui(self):
        """Build dialog UI with input options, icon grid, output selector, and buttons."""
        # Buttons - fixed at bottom (pack first so it stays at bottom)
        button_frame = ttk.Frame(self.dialog)
        button_frame.pack(side="bottom", fill="x", padx=10, pady=10)

        ttk.Button(
            button_frame,
            text="Cancel",
            command=self._on_cancel,
            width=15
        ).pack(side="left", padx=5)

        ttk.Button(
            button_frame,
            text="Save",
            command=self._on_save,
            width=15
        ).pack(side="right", padx=5)

        # Create main container with scrollbar (pack after buttons)
        main_container = ttk.Frame(self.dialog)
        main_container.pack(fill="both", expand=True)

        # Create canvas for scrolling
        canvas = tk.Canvas(main_container)
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Enable mousewheel scrolling
        def on_mousewheel(event):
            canvas.yview_scroll(-1 * (event.delta // 120), "units")

        self.dialog.bind("<MouseWheel>", on_mousewheel)

        # === Input Method Section ===
        input_method_frame = ttk.LabelFrame(scrollable_frame, text="1. Input Icon Names", padding=10)
        input_method_frame.pack(fill="x", padx=10, pady=10)

        # Radio buttons for input mode
        radio_frame = ttk.Frame(input_method_frame)
        radio_frame.pack(fill="x", pady=(0, 10))

        ttk.Radiobutton(
            radio_frame,
            text="Manual Input (one name per line)",
            variable=self.input_mode,
            value="manual",
            command=self._on_mode_changed
        ).pack(side="left", padx=5)

        ttk.Radiobutton(
            radio_frame,
            text="CSV Import",
            variable=self.input_mode,
            value="csv",
            command=self._on_mode_changed
        ).pack(side="left", padx=5)

        # Manual input frame
        self.manual_frame = ttk.Frame(input_method_frame)
        self.manual_frame.pack(fill="both", expand=True)

        ttk.Label(
            self.manual_frame,
            text="Enter icon names (one per line):",
            font=("TkDefaultFont", 9)
        ).pack(anchor="w", pady=(0, 5))

        self.manual_text = scrolledtext.ScrolledText(
            self.manual_frame,
            height=8,
            width=60,
            font=("Courier", 10)
        )
        self.manual_text.pack(fill="both", expand=True, pady=(0, 10))

        ttk.Button(
            self.manual_frame,
            text="Load Names",
            command=self._on_load_manual_names
        ).pack(anchor="w")

        # CSV import frame (hidden by default)
        self.csv_frame = ttk.Frame(input_method_frame)

        ttk.Button(
            self.csv_frame,
            text="Import CSV File...",
            command=self._on_import_csv
        ).pack(side="left", padx=5)

        ttk.Label(self.csv_frame, text="Column:").pack(side="left", padx=(20, 5))

        self.column_selector = ttk.Combobox(self.csv_frame, state="disabled", width=20)
        self.column_selector.pack(side="left", padx=5)
        self.column_selector.bind("<<ComboboxSelected>>", self._on_column_selected)

        # === Output Directory Section ===
        output_frame = ttk.LabelFrame(scrollable_frame, text="2. Select Output Directory", padding=10)
        output_frame.pack(fill="x", padx=10, pady=10)

        self.output_entry = ttk.Entry(output_frame, state="readonly", width=50)
        self.output_entry.pack(side="left", padx=5, fill="x", expand=True)

        ttk.Button(
            output_frame,
            text="Browse...",
            command=self._on_browse_output
        ).pack(side="left", padx=5)

        # === Icon Grid Section ===
        icon_frame = ttk.LabelFrame(scrollable_frame, text=f"3. Assign Names ({len(self.icons)} icons)", padding=10)
        icon_frame.pack(fill="both", expand=True, padx=10, pady=10)

        # Create grid (4 columns)
        self._build_icon_grid(icon_frame)

    def _build_icon_grid(self, parent_frame):
        """Build icon grid with thumbnails and name dropdowns."""
        grid_container = ttk.Frame(parent_frame)
        grid_container.pack(fill="both", expand=True)

        columns = 4

        for i, (icon_path, display_label, assigned_name) in enumerate(self.icons):
            row = i // columns
            col = i % columns

            # Create frame for this icon
            icon_frame = ttk.Frame(grid_container, relief="solid", borderwidth=1)
            icon_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")

            # Load and display icon thumbnail
            try:
                icon_img = Image.open(icon_path)
                icon_img.thumbnail((100, 100), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(icon_img)
                self.icon_photos.append(photo)  # Keep reference

                icon_label = ttk.Label(icon_frame, image=photo)
                icon_label.pack(pady=5)
            except Exception as e:
                ttk.Label(icon_frame, text=f"Error: {e}", foreground="red").pack(pady=5)

            # Display label
            ttk.Label(
                icon_frame,
                text=display_label,
                font=("TkDefaultFont", 8),
                wraplength=120
            ).pack(pady=2)

            # Name dropdown
            name_dropdown = ttk.Combobox(icon_frame, state="disabled", width=15)
            name_dropdown.set("(Select name)")
            name_dropdown.pack(pady=5)

            # Store reference for later updates
            self.icon_dropdowns.append(name_dropdown)

            # Bind selection event
            name_dropdown.bind("<<ComboboxSelected>>", lambda e, idx=i: self._on_name_selected(idx))

        # Configure grid column weights for equal spacing
        for col in range(columns):
            grid_container.columnconfigure(col, weight=1)

    def _on_mode_changed(self):
        """Handle input mode change (manual vs CSV)."""
        mode = self.input_mode.get()

        if mode == "manual":
            # Show manual input, hide CSV
            self.manual_frame.pack(fill="both", expand=True)
            self.csv_frame.pack_forget()
        else:
            # Show CSV, hide manual input
            self.manual_frame.pack_forget()
            self.csv_frame.pack(fill="x")

    def _on_load_manual_names(self):
        """Parse manual input text and load names."""
        text_content = self.manual_text.get("1.0", tk.END).strip()

        if not text_content:
            messagebox.showerror("Input Error", "Please enter icon names (one per line).")
            return

        # Split by newlines and filter out empty lines
        self.available_names = [line.strip() for line in text_content.split('\n') if line.strip()]

        if not self.available_names:
            messagebox.showerror("Input Error", "No valid names found. Please check your input.")
            return

        # Update all icon dropdowns
        for dropdown in self.icon_dropdowns:
            dropdown['values'] = self.available_names
            dropdown['state'] = "readonly"

        messagebox.showinfo(
            "Names Loaded",
            f"Loaded {len(self.available_names)} names from manual input.\n\n"
            f"You can now assign names to icons using the dropdowns."
        )

    def _on_import_csv(self):
        """Handle CSV import button click."""
        csv_path = filedialog.askopenfilename(
            parent=self.dialog,
            title="Select CSV File",
            filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")]
        )

        if not csv_path:
            return

        try:
            # Read CSV file
            self.csv_path = Path(csv_path)
            with open(self.csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                self.csv_headers = reader.fieldnames or []
                self.csv_data = list(reader)

            if not self.csv_headers:
                messagebox.showerror("CSV Error", "CSV file has no headers.")
                return

            # Populate column selector
            self.column_selector['values'] = self.csv_headers
            self.column_selector['state'] = "readonly"

            messagebox.showinfo(
                "CSV Imported",
                f"Successfully imported CSV with {len(self.csv_data)} rows.\n"
                f"Columns: {', '.join(self.csv_headers)}\n\n"
                f"Now select which column contains icon names."
            )

        except Exception as e:
            messagebox.showerror("CSV Import Error", f"Failed to import CSV:\n{e}")

    def _on_column_selected(self, event=None):
        """Handle column selection from dropdown."""
        selected = self.column_selector.get()
        if not selected:
            return

        self.selected_column = selected

        # Extract names from selected column
        self.available_names = []
        empty_count = 0

        for row in self.csv_data:
            name = row.get(selected, "").strip()
            if name:
                self.available_names.append(name)
            else:
                empty_count += 1

        if empty_count > 0:
            messagebox.showwarning(
                "Empty Values",
                f"Warning: {empty_count} rows have empty values in column '{selected}'."
            )

        # Update all icon dropdowns
        for dropdown in self.icon_dropdowns:
            dropdown['values'] = self.available_names
            dropdown['state'] = "readonly"

        messagebox.showinfo(
            "Column Selected",
            f"Loaded {len(self.available_names)} names from column '{selected}'.\n\n"
            f"You can now assign names to icons using the dropdowns."
        )

    def _on_name_selected(self, icon_index: int):
        """Handle name selection for an icon."""
        dropdown = self.icon_dropdowns[icon_index]
        selected_name = dropdown.get()

        if not selected_name or selected_name == "(Select name)":
            return

        # Update assigned name in icons list
        icon_path, display_label, _ = self.icons[icon_index]
        self.icons[icon_index] = (icon_path, display_label, selected_name)

        # Check for duplicate assignments
        assigned_names = [name for _, _, name in self.icons if name is not None]
        if assigned_names.count(selected_name) > 1:
            messagebox.showwarning(
                "Duplicate Assignment",
                f"Warning: '{selected_name}' is assigned to multiple icons.\n\n"
                f"This is allowed but may overwrite files during save."
            )

    def _on_browse_output(self):
        """Handle output directory browse button."""
        output_dir = filedialog.askdirectory(
            parent=self.dialog,
            title="Select Output Directory"
        )

        if not output_dir:
            return

        self.output_directory = Path(output_dir)

        # Update entry field
        self.output_entry.configure(state="normal")
        self.output_entry.delete(0, tk.END)
        self.output_entry.insert(0, str(self.output_directory))
        self.output_entry.configure(state="readonly")

    def _on_save(self):
        """Handle save button click."""
        # Validate prerequisites
        if not self.available_names:
            if self.input_mode.get() == "manual":
                messagebox.showerror("Validation Error", "Please enter names and click 'Load Names' first.")
            else:
                messagebox.showerror("Validation Error", "Please import a CSV file and select a column first.")
            return

        if not self.output_directory:
            messagebox.showerror("Validation Error", "Please select an output directory.")
            return

        # Check that all icons have names assigned
        unassigned = [label for _, label, name in self.icons if name is None]
        if unassigned:
            messagebox.showerror(
                "Validation Error",
                f"Please assign names to all icons.\n\n"
                f"{len(unassigned)} icons are unassigned."
            )
            return

        # Create output directory if it doesn't exist
        try:
            self.output_directory.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            messagebox.showerror("Directory Error", f"Failed to create output directory:\n{e}")
            return

        # Check for existing files
        existing_files = []
        for i, (_, _, name) in enumerate(self.icons):
            output_filename = f"{name}.png"  # Use selected name
            output_path = self.output_directory / output_filename
            if output_path.exists():
                existing_files.append(output_filename)

        if existing_files:
            response = messagebox.askyesno(
                "Overwrite Confirmation",
                f"{len(existing_files)} files already exist in the output directory:\n\n"
                f"{', '.join(existing_files[:5])}"
                f"{' ...' if len(existing_files) > 5 else ''}\n\n"
                f"Do you want to overwrite them?"
            )
            if not response:
                return

        # Perform save
        try:
            saved_count = 0
            failed = []

            for i, (icon_path, display_label, name) in enumerate(self.icons):
                output_filename = f"{name}.png"  # Use selected name
                output_path = self.output_directory / output_filename

                try:
                    shutil.copy2(icon_path, output_path)
                    saved_count += 1
                except Exception as e:
                    failed.append((output_filename, str(e)))

            # Show result
            if failed:
                messagebox.showwarning(
                    "Save Incomplete",
                    f"Saved {saved_count} icons, but {len(failed)} failed:\n\n"
                    + "\n".join([f"{f}: {e}" for f, e in failed[:5]])
                )
            else:
                # Show first few filenames as examples
                example_names = [f"{name}.png" for _, _, name in self.icons[:3]]
                example_text = ", ".join(example_names)
                if saved_count > 3:
                    example_text += ", ..."

                messagebox.showinfo(
                    "Save Successful",
                    f"Saved {saved_count} icons to:\n{self.output_directory}\n\n"
                    f"Examples: {example_text}"
                )
                self.result = True
                self.dialog.destroy()

        except Exception as e:
            messagebox.showerror("Save Error", f"Save operation failed:\n{e}")

    def _on_cancel(self):
        """Handle cancel button click."""
        self.result = False
        self.dialog.destroy()

    def show(self) -> bool:
        """Show dialog and wait for user response.

        Returns:
            True if user clicked Save and save succeeded, False otherwise
        """
        self.parent.wait_window(self.dialog)
        return self.result


def show_annotation_dialog(parent, workspace_name: str, workspaces_root: Path = Path("workspaces")) -> bool:
    """Show annotation dialog and return result.

    Args:
        parent: Parent tkinter window
        workspace_name: Name of workspace to annotate
        workspaces_root: Root directory containing workspaces

    Returns:
        True if icons were saved, False otherwise

    Example:
        >>> if show_annotation_dialog(root, "my_workspace"):
        ...     print("Icons saved successfully!")
    """
    dialog = AnnotationDialog(parent, workspace_name, workspaces_root)
    return dialog.show()
