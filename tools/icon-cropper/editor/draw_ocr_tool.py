"""Draw OCR tool for creating new OCR region overlays.

This tool wraps the existing OCREditor to provide the 2-step workflow:
1. DEFINE - Drag to define OCR region bounds
2. ADJUST - Fine-tune with handles/spinboxes (auto-switches to select tool)
"""

from typing import Dict, Any, Optional
import tkinter as tk
from .base_tool import BaseTool


class DrawOCRTool(BaseTool):
    """Tool for drawing new OCR region overlays (1-drag workflow)."""

    def __init__(self, ocr_editor):
        """Initialize the draw OCR tool.

        Args:
            ocr_editor: OCREditor instance (existing state machine)
        """
        self.ocr_editor = ocr_editor

    def on_activate(self, canvas: tk.Canvas, status_callback: Optional[callable] = None):
        """Activate draw OCR tool - enter OCR editing mode.

        Args:
            canvas: Canvas widget
            status_callback: Callback to update status text
        """
        # Enter OCR drawing mode (sets is_active, edit_step, cursor)
        self.ocr_editor.enter_ocr_edit_mode(canvas)

        if status_callback:
            status_callback("OCR tool: Drag to define OCR detection region...")

    def on_deactivate(self, canvas: tk.Canvas):
        """Deactivate draw OCR tool - exit OCR editing mode.

        Note: This does NOT clear the OCR overlay, just exits the drawing workflow.

        Args:
            canvas: Canvas widget
        """
        # Exit OCR drawing mode (keeps overlay if drawn)
        self.ocr_editor.exit_ocr_edit_mode(canvas)

    def on_mouse_press(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse press - delegate to OCREditor.

        Args:
            event: Mouse button press event
            context: Shared application state

        Returns:
            True (always handles event in OCR drawing mode)
        """
        # Extract parameters that OCREditor.on_ocr_click expects
        self.ocr_editor.on_ocr_click(
            event,
            context['canvas'],
            context['canvas_controller'].zoom_level,
            context['canvas_controller'].pan_offset
        )
        return True

    def on_mouse_move(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse move - delegate to OCREditor if dragging region.

        Args:
            event: Mouse motion event
            context: Shared application state

        Returns:
            True if currently dragging region, False otherwise
        """
        if self.ocr_editor.is_dragging():
            self.ocr_editor.on_ocr_drag(
                event,
                context['canvas'],
                context['canvas_controller'].zoom_level,
                context['canvas_controller'].pan_offset
            )
            return True

        return False

    def on_mouse_release(self, event, context: Dict[str, Any]) -> bool:
        """Handle mouse release - complete region definition and auto-switch to select tool.

        This is the KEY BEHAVIOR CHANGE: After drawing completes, we automatically
        switch to the select tool so handles become immediately visible and usable.

        Args:
            event: Mouse button release event
            context: Shared application state

        Returns:
            True if was dragging region, False otherwise
        """
        if self.ocr_editor.is_dragging():
            self.ocr_editor.on_ocr_release(
                event,
                context['canvas'],
                context['canvas_controller'].zoom_level,
                context['canvas_controller'].pan_offset,
                context['ocr_inputs']
            )

            # Add new OCR overlay (creates new overlay each time instead of replacing)
            # IMPORTANT: Pass a COPY of the config dict so each overlay has independent config
            overlay_id = context['canvas_controller'].add_overlay('ocr', dict(context['ocr_config']))

            # Auto-select the newly created overlay
            if 'set_selected_overlay_callback' in context and context['set_selected_overlay_callback']:
                context['set_selected_overlay_callback'](overlay_id)

            # Save overlays to workspace
            if 'save_overlays_callback' in context and context['save_overlays_callback']:
                context['save_overlays_callback']()

            # Refresh overlay list UI
            if 'refresh_overlay_list_callback' in context and context['refresh_overlay_list_callback']:
                context['refresh_overlay_list_callback']()

            # Refresh binding list UI (Phase 1.5)
            if 'refresh_binding_list_callback' in context and context['refresh_binding_list_callback']:
                context['refresh_binding_list_callback']()

            # AUTO-SWITCH back to select tool after drawing completes
            # This makes handles immediately visible and allows user to adjust
            if 'auto_switch_tool' in context and context['auto_switch_tool']:
                context['auto_switch_tool']('select')

            return True

        return False

    def get_cursor(self) -> str:
        """Get cursor for draw OCR tool.

        Returns:
            "crosshair" cursor to indicate drawing mode
        """
        return "crosshair"

    def get_name(self) -> str:
        """Get display name.

        Returns:
            "Draw OCR"
        """
        return "Draw OCR"
