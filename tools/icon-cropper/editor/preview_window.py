"""Preview window for displaying extracted icon thumbnails.

This module creates a separate window that displays all extracted icons
in a grid layout, with each icon labeled by its row and column position.
"""

import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
from typing import List, Tuple


class PreviewWindow:
    """Window for displaying icon thumbnail previews."""

    def __init__(
        self,
        parent: tk.Tk,
        icons: List[Tuple[Image.Image, int, int]],
        columns: int,
        rows: int
    ):
        """Initialize the preview window.

        Args:
            parent: Parent window
            icons: List of (image, row, col) tuples
            columns: Number of columns in grid
            rows: Number of rows in grid
        """
        self.parent = parent
        self.window = tk.Toplevel(parent)
        self.window.title("Icon Preview")
        self.window.geometry("900x700")

        self.icons = icons
        self.grid_columns = columns
        self.grid_rows = rows

        # Keep references to PhotoImage objects to prevent garbage collection
        self.photo_images = []

        self._build_ui()

    def _build_ui(self):
        """Build the preview window UI."""
        # Header
        header_frame = ttk.Frame(self.window)
        header_frame.pack(fill=tk.X, padx=10, pady=10)

        ttk.Label(
            header_frame,
            text=f"Icon Preview - {len(self.icons)} icons ({self.grid_columns}×{self.grid_rows})",
            font=("Arial", 14, "bold")
        ).pack(side=tk.LEFT)

        ttk.Button(
            header_frame,
            text="Close",
            command=self.window.destroy
        ).pack(side=tk.RIGHT)

        # Scrollable canvas for icon grid
        canvas_frame = ttk.Frame(self.window)
        canvas_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Create canvas with scrollbars
        h_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.HORIZONTAL)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)

        v_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.VERTICAL)
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        canvas = tk.Canvas(
            canvas_frame,
            xscrollcommand=h_scrollbar.set,
            yscrollcommand=v_scrollbar.set,
            bg="white"
        )
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        h_scrollbar.config(command=canvas.xview)
        v_scrollbar.config(command=canvas.yview)

        # Frame to hold the icon grid
        grid_frame = ttk.Frame(canvas)
        canvas_window = canvas.create_window(0, 0, anchor=tk.NW, window=grid_frame)

        # Display icons in grid
        self._display_icons(grid_frame)

        # Update scroll region after widgets are added
        grid_frame.update_idletasks()
        canvas.config(scrollregion=canvas.bbox("all"))

        # Enable mousewheel scrolling
        def on_mousewheel(event):
            canvas.yview_scroll(-1 * (event.delta // 120), "units")

        canvas.bind("<MouseWheel>", on_mousewheel)

        # Center the window on parent
        self.window.transient(self.parent)
        self.window.update_idletasks()

    def _display_icons(self, parent_frame: ttk.Frame):
        """Display icons in a grid layout.

        Args:
            parent_frame: Frame to place icon grid in
        """
        # Calculate thumbnail size (max 150x150)
        thumbnail_size = (150, 150)

        for image, row, col in self.icons:
            # Create frame for each icon
            icon_frame = ttk.LabelFrame(
                parent_frame,
                text=f"Row {row + 1}, Col {col + 1}",
                padding=5
            )
            icon_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")

            # Create thumbnail - use resize instead of thumbnail for better control
            thumbnail = image.copy()

            # Convert to RGB if needed (in case of RGBA or other modes)
            if thumbnail.mode != 'RGB':
                thumbnail = thumbnail.convert('RGB')

            # Calculate scaling to fit within thumbnail_size while maintaining aspect ratio
            img_width, img_height = thumbnail.size
            max_width, max_height = thumbnail_size

            scale = min(max_width / img_width, max_height / img_height)
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)

            thumbnail = thumbnail.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # Convert to PhotoImage
            photo = ImageTk.PhotoImage(thumbnail)
            self.photo_images.append(photo)  # Keep reference

            # Display thumbnail (use tk.Label, not ttk.Label, for images)
            label = tk.Label(icon_frame, image=photo, bg="white", relief=tk.SOLID, borderwidth=1)
            label.image = photo  # CRITICAL: Keep a reference on the label itself to prevent garbage collection
            label.pack(padx=5, pady=5)

            # Display dimensions
            dim_label = ttk.Label(
                icon_frame,
                text=f"{image.width}×{image.height}px",
                font=("Arial", 9),
                foreground="gray"
            )
            dim_label.pack()

        # Configure grid weights for even spacing
        for i in range(self.grid_rows):
            parent_frame.rowconfigure(i, weight=1)
        for j in range(self.grid_columns):
            parent_frame.columnconfigure(j, weight=1)
