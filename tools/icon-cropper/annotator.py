"""Tkinter-based annotation GUI for assigning character IDs to cropped icons."""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path
from typing import Dict, List, Optional
from PIL import Image, ImageTk
import shutil

from utils import load_config, get_project_root, extract_character_number, format_filename
from csv_loader import load_characters, CharacterDatabase


class IconAnnotation:
    """Represents an icon annotation."""

    def __init__(self, image_path: Path):
        self.image_path = image_path
        self.character_id: Optional[str] = None
        self.overwrite: bool = False


class AnnotatorApp:
    """Main annotation application."""

    def __init__(self, root: tk.Tk, session_dir: Path):
        """Initialize the annotator app.

        Args:
            root: Tkinter root window
            session_dir: Path to the session directory with cropped icons
        """
        self.root = root
        self.session_dir = session_dir
        self.config = load_config()
        self.project_root = get_project_root()

        # Load character database
        # TODO: Add graceful error handling for missing CSV
        # - Show user-friendly error dialog if CSV not found
        # - Provide instructions to update character data
        # - Allow annotator to run in "manual ID entry" mode
        csv_path = self.project_root / "data-sources" / "stellasora - characters.csv"
        self.char_db = load_characters(csv_path)

        # Load icons from session directory
        self.annotations: List[IconAnnotation] = []
        self._load_icons()

        # Track assigned character IDs to detect duplicates
        self.assigned_ids: Dict[str, str] = {}  # {char_id: icon_filename}

        # Setup UI
        self.root.title("Screenshot Cropper - Icon Annotation")
        self.root.geometry("1200x800")
        self._setup_ui()

    def _load_icons(self) -> None:
        """Load all icon images from the session directory."""
        # Look for PNG files
        icon_files = sorted(self.session_dir.glob("*.png"))

        if not icon_files:
            raise ValueError(f"No PNG files found in: {self.session_dir}")

        for icon_file in icon_files:
            self.annotations.append(IconAnnotation(icon_file))

        print(f"Loaded {len(self.annotations)} icons from session")

    def _setup_ui(self) -> None:
        """Setup the UI components."""
        # Top toolbar
        toolbar = ttk.Frame(self.root)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)

        ttk.Label(toolbar, text=f"Session: {self.session_dir.name}").pack(side=tk.LEFT, padx=5)
        ttk.Button(toolbar, text="Save All", command=self._save_all).pack(side=tk.RIGHT, padx=5)

        # Main content area with scrollbar
        canvas_frame = ttk.Frame(self.root)
        canvas_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        canvas = tk.Canvas(canvas_frame)
        scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Enable mousewheel scrolling
        def on_mousewheel(event):
            canvas.yview_scroll(-1 * (event.delta // 120), "units")

        self.root.bind("<MouseWheel>", on_mousewheel)

        # Create grid of icon annotations
        self._create_icon_grid(scrollable_frame)

        # Status bar
        self.status_var = tk.StringVar(value="Ready")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def _create_icon_grid(self, parent: ttk.Frame) -> None:
        """Create a grid of icon annotation widgets.

        Args:
            parent: Parent frame to contain the grid
        """
        columns = 4  # Number of icons per row

        for idx, annotation in enumerate(self.annotations):
            row = idx // columns
            col = idx % columns

            # Create frame for this icon
            icon_frame = ttk.LabelFrame(parent, text=f"Icon {idx + 1}")
            icon_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")

            # Load and display image
            try:
                img = Image.open(annotation.image_path)
                img.thumbnail((150, 150), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(img)

                img_label = ttk.Label(icon_frame, image=photo)
                img_label.image = photo  # Keep reference
                img_label.pack(pady=5)
            except Exception as e:
                ttk.Label(icon_frame, text=f"Error loading image:\n{e}").pack()

            # Character ID dropdown
            ttk.Label(icon_frame, text="Character:").pack()

            char_ids = [''] + self.char_db.get_character_ids()
            char_var = tk.StringVar()

            char_combo = ttk.Combobox(
                icon_frame,
                textvariable=char_var,
                values=char_ids,
                state="readonly",
                width=15
            )
            char_combo.pack(pady=2)
            char_combo.current(0)

            # Bind selection event
            char_combo.bind(
                "<<ComboboxSelected>>",
                lambda e, ann=annotation, var=char_var: self._on_character_selected(ann, var)
            )

            # Character info label (shows on hover/selection)
            info_label = ttk.Label(icon_frame, text="", foreground="blue", wraplength=150)
            info_label.pack(pady=2)

            # Update info label when character is selected
            def update_info(event, var=char_var, label=info_label):
                char_id = var.get()
                if char_id:
                    info = self.char_db.get_character_info(char_id)
                    label.config(text=info)
                else:
                    label.config(text="")

            char_combo.bind("<<ComboboxSelected>>", update_info)

            # Overwrite checkbox
            overwrite_var = tk.BooleanVar(value=False)
            overwrite_check = ttk.Checkbutton(
                icon_frame,
                text="Overwrite existing",
                variable=overwrite_var,
                command=lambda ann=annotation, var=overwrite_var: self._on_overwrite_changed(ann, var)
            )
            overwrite_check.pack()

            # Store references
            annotation.char_var = char_var
            annotation.overwrite_var = overwrite_var
            annotation.info_label = info_label

    def _on_character_selected(self, annotation: IconAnnotation, var: tk.StringVar) -> None:
        """Handle character selection.

        Args:
            annotation: Icon annotation
            var: StringVar containing the selected character ID
        """
        char_id = var.get()

        if not char_id:
            annotation.character_id = None
            return

        # Validate character ID
        if not self.char_db.validate_character_id(char_id):
            messagebox.showerror("Invalid Character", f"Character ID not found: {char_id}")
            var.set('')
            return

        # Check for duplicate assignment
        if char_id in self.assigned_ids and self.assigned_ids[char_id] != annotation.image_path.name:
            other_icon = self.assigned_ids[char_id]
            response = messagebox.askyesno(
                "Duplicate Assignment",
                f"Character {char_id} is already assigned to {other_icon}.\n"
                f"Do you want to assign it to this icon too?"
            )

            if not response:
                var.set('')
                return

        # Update annotation
        annotation.character_id = char_id
        self.assigned_ids[char_id] = annotation.image_path.name

        self.status_var.set(f"Assigned {char_id} to {annotation.image_path.name}")

    def _on_overwrite_changed(self, annotation: IconAnnotation, var: tk.BooleanVar) -> None:
        """Handle overwrite checkbox change.

        Args:
            annotation: Icon annotation
            var: BooleanVar containing the overwrite state
        """
        annotation.overwrite = var.get()

    def _save_all(self) -> None:
        """Save all annotated icons to the target directory."""
        # Get output configuration
        # TODO: Make page-type aware - detect from session metadata
        # - Save page_type to session directory metadata file (e.g., session.json)
        # - Read page_type from metadata when opening session
        # - Support mixed page types in single session (multi-category)
        # Assuming all icons are from character_select page for now
        page_config = self.config['pages']['character_select']
        output_config = page_config['output']

        target_dir = self.project_root / output_config['target_dir']
        target_dir.mkdir(parents=True, exist_ok=True)

        saved_count = 0
        skipped_count = 0
        errors = []

        for annotation in self.annotations:
            if not annotation.character_id:
                skipped_count += 1
                continue

            try:
                # Generate target filename
                filename = format_filename(
                    output_config['filename_pattern'],
                    annotation.character_id
                )
                target_path = target_dir / filename

                # Check if file exists
                if target_path.exists() and not annotation.overwrite:
                    skipped_count += 1
                    print(f"Skipping {filename} (already exists, overwrite not enabled)")
                    continue

                # Copy file
                shutil.copy2(annotation.image_path, target_path)
                saved_count += 1
                print(f"Saved {filename}")

            except Exception as e:
                errors.append(f"{annotation.image_path.name}: {e}")

        # Show summary
        summary = f"Saved {saved_count} icons, skipped {skipped_count}"

        if errors:
            summary += f"\n\nErrors:\n" + "\n".join(errors)
            messagebox.showwarning("Save Complete with Errors", summary)
        else:
            messagebox.showinfo("Save Complete", summary)

        self.status_var.set(f"Saved {saved_count} icons to {target_dir}")


def run_annotator(session_dir: Path) -> None:
    """Run the annotation GUI.

    Args:
        session_dir: Path to the session directory with cropped icons
    """
    root = tk.Tk()
    app = AnnotatorApp(root, session_dir)
    root.mainloop()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python annotator.py <session_directory>")
        print("Example: python annotator.py temp/20250112_143022")
        sys.exit(1)

    session_path = Path(sys.argv[1])

    if not session_path.exists():
        print(f"Error: Session directory not found: {session_path}")
        sys.exit(1)

    run_annotator(session_path)
