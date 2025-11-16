"""Preview dialog for batch crop operation.

This dialog shows a preview of what will be cropped and allows the user
to confirm before running the batch crop operation.
"""

import tkinter as tk
from tkinter import ttk
from pathlib import Path
from PIL import Image, ImageTk
from typing import List, Optional
from editor.cropper_api import get_crop_statistics, preview_overlay


class CropPreviewDialog:
    """Dialog showing crop statistics and icon previews."""

    def __init__(self, parent, workspace_name: str, workspaces_root: Path = Path("workspaces")):
        """Initialize crop preview dialog.

        Args:
            parent: Parent tkinter window
            workspace_name: Name of workspace to preview
            workspaces_root: Root directory containing workspaces
        """
        self.parent = parent
        self.workspace_name = workspace_name
        self.workspaces_root = workspaces_root
        self.result = False  # True if user clicked "Proceed", False if cancelled

        # Create dialog window
        self.dialog = tk.Toplevel(parent)
        self.dialog.title(f"Batch Crop Preview - {workspace_name}")
        self.dialog.geometry("850x700")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        self.dialog.resizable(True, True)

        # Get crop statistics
        try:
            self.stats = get_crop_statistics(workspace_name, workspaces_root)
        except Exception as e:
            self._show_error(str(e))
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

    def _build_ui(self):
        """Build dialog UI."""
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
            text="Proceed with Batch Crop",
            command=self._on_proceed,
            width=25
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

        # Enable mousewheel scrolling on the entire dialog
        def on_mousewheel(event):
            canvas.yview_scroll(-1 * (event.delta // 120), "units")

        self.dialog.bind("<MouseWheel>", on_mousewheel)

        # Summary section
        summary_frame = ttk.LabelFrame(scrollable_frame, text="Summary", padding=10)
        summary_frame.pack(fill="x", padx=10, pady=10)

        summary_text = (
            f"Screenshots: {self.stats['total_screenshots']}\n"
            f"Grid Bindings: {self.stats['total_grid_bindings']}\n"
            f"Total Icons: {self.stats['total_icons']}"
        )

        summary_label = ttk.Label(
            summary_frame,
            text=summary_text,
            font=("TkDefaultFont", 11)
        )
        summary_label.pack(anchor="w")

        # Breakdown table
        breakdown_frame = ttk.LabelFrame(scrollable_frame, text="Breakdown", padding=10)
        breakdown_frame.pack(fill="x", padx=10, pady=10)

        # Create treeview for breakdown
        columns = ("Screenshot", "Overlay", "Icons")
        tree = ttk.Treeview(breakdown_frame, columns=columns, show="headings", height=8)

        for col in columns:
            tree.heading(col, text=col)
            tree.column(col, width=200)

        for item in self.stats['breakdown']:
            tree.insert("", "end", values=(
                item['screenshot'],
                f"{item['overlay']} ({item['overlay_name']})",
                item['icons']
            ))

        # Add scrollbar
        scrollbar = ttk.Scrollbar(breakdown_frame, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)

        tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Preview section (show first few icons from first overlay)
        preview_frame = ttk.LabelFrame(scrollable_frame, text="Preview (First 9 Icons)", padding=10)
        preview_frame.pack(fill="x", padx=10, pady=10)

        self._show_preview(preview_frame)

    def _show_preview(self, parent_frame):
        """Show preview of first few icons."""
        if not self.stats['breakdown']:
            ttk.Label(parent_frame, text="No icons to preview").pack()
            return

        # Get first screenshot and overlay from breakdown
        first_item = self.stats['breakdown'][0]
        screenshot = first_item['screenshot']
        overlay_id = first_item['overlay']

        try:
            # Preview first overlay
            icons = preview_overlay(
                self.workspace_name,
                screenshot,
                overlay_id,
                self.workspaces_root
            )

            # Show first 9 icons in a 3x3 grid
            grid_frame = ttk.Frame(parent_frame)
            grid_frame.pack()

            for i, icon in enumerate(icons[:9]):  # Limit to 9 icons
                row = i // 3
                col = i % 3

                # Resize icon for preview (max 100x100)
                icon_resized = icon.copy()
                icon_resized.thumbnail((100, 100), Image.Resampling.LANCZOS)

                # Convert to PhotoImage
                photo = ImageTk.PhotoImage(icon_resized)

                # Create label with image
                label = ttk.Label(grid_frame, image=photo)
                label.image = photo  # Keep reference to prevent garbage collection
                label.grid(row=row, column=col, padx=5, pady=5)

            # Show count if there are more icons
            if len(icons) > 9:
                ttk.Label(
                    parent_frame,
                    text=f"... and {len(icons) - 9} more from this overlay",
                    font=("TkDefaultFont", 9, "italic")
                ).pack(pady=5)

        except Exception as e:
            ttk.Label(
                parent_frame,
                text=f"Preview failed: {e}",
                foreground="red"
            ).pack()

    def _on_proceed(self):
        """User clicked proceed button."""
        self.result = True
        self.dialog.destroy()

    def _on_cancel(self):
        """User clicked cancel button."""
        self.result = False
        self.dialog.destroy()

    def show(self) -> bool:
        """Show dialog and wait for user response.

        Returns:
            True if user clicked "Proceed", False if cancelled
        """
        self.parent.wait_window(self.dialog)
        return self.result


def show_crop_preview_dialog(parent, workspace_name: str, workspaces_root: Path = Path("workspaces")) -> bool:
    """Show crop preview dialog and return user decision.

    Args:
        parent: Parent tkinter window
        workspace_name: Name of workspace to preview
        workspaces_root: Root directory containing workspaces

    Returns:
        True if user clicked "Proceed with Batch Crop", False otherwise

    Example:
        >>> if show_crop_preview_dialog(root, "my_workspace"):
        ...     run_batch_crop()
    """
    dialog = CropPreviewDialog(parent, workspace_name, workspaces_root)
    return dialog.show()
