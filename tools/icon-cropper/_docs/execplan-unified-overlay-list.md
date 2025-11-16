# ExecPlan: Unified Overlay List UI (Remove "Apply to Screenshot" Panel)

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `_docs/PLANS.md` in the repository root.

## Purpose / Big Picture

Currently, the overlay management UI is confusing because it has TWO separate panels for managing overlays:

1. **Overlays list (top)**: Shows overlays bound to the current screenshot (`canvas_controller.get_all_overlays()`)
   - Radio buttons select which overlay to edit
   - Delete/Lock buttons act on the selected overlay

2. **"Apply to Screenshot" panel (bottom)**: Shows ALL workspace overlays (`workspace_manager.load_workspace_overlays()`)
   - Checkboxes control which overlays are bound to the current screenshot

**The Problem:**
- Users expect Delete to delete the overlay, but it actually just unbinds it from the screenshot
- The relationship between the two panels is not obvious
- Two lists showing different subsets of overlays is confusing

**After this change**, users will have a **single unified overlay list** that:
- Shows ALL workspace overlays (not just bound ones)
- Has a checkbox for each overlay to Apply/Unapply to the current screenshot
- Delete button actually deletes the overlay from the workspace (not just unbinds)
- Lock button toggles the lock state
- Radio buttons select which overlay to edit

**UI Design:**
```
Overlays (3 overlays in workspace)

○ 🔲 Grid 1          [☑ Apply]  🗑️ Delete  🔒 Lock
● 📄 OCR Region 1    [☑ Apply]  🗑️ Delete  🔒 Lock
○ 🔲 Grid 2          [☐ Apply]  🗑️ Delete  🔒 Lock
```

Users can verify this works by:
- Unchecking "Apply" → overlay disappears from canvas but stays in list
- Checking "Apply" → overlay reappears on canvas
- Delete button → overlay is permanently removed from workspace.json
- Creating overlay in screenshot A, switching to screenshot B → overlay appears in list but unchecked

## Progress

- [x] Phase 1: Update overlay list to show ALL workspace overlays (Completed: 2025-11-16)
  - [x] Update `_refresh_overlay_list()` to load all workspace overlays
  - [x] Add "Apply" checkbox column to overlay list UI
  - [x] Wire checkbox to binding toggle logic
  - [x] Test overlay list shows all overlays (bound and unbound)

- [ ] Phase 2: Remove "Apply to Screenshot" panel
  - [ ] Remove binding panel from `ui_builder.py`
  - [ ] Remove binding panel update logic from `config_editor.py`
  - [ ] Update layout to expand overlay list area
  - [ ] Test UI renders correctly without binding panel

- [ ] Phase 3: Update Delete button behavior
  - [ ] Change `_on_delete_overlay()` to permanently delete overlay
  - [ ] Add confirmation dialog showing which screenshots use this overlay
  - [ ] Automatically remove overlay from all screenshot bindings
  - [ ] Test delete removes overlay from workspace.json and all screenshots

- [ ] Phase 4: Polish and edge cases
  - [ ] Update overlay count label to show total workspace overlays
  - [ ] Handle case when deleting a bound overlay (warn user)
  - [ ] Test with multiple screenshots and overlays
  - [ ] Update CLAUDE.md with new UI pattern

## Surprises & Discoveries

### Phase 1 Discoveries (2025-11-16)

1. **Overlay objects vs dicts**: The `workspace_manager.load_workspace_overlays()` returns `Overlay` objects (with `.type`, `.config` attributes), not plain dicts. Initial implementation incorrectly used `overlay.get('type')` instead of `overlay.type`, causing `AttributeError`. Fixed by using object attribute access consistently.

2. **Parameter panel sync issue**: When implementing Apply checkbox, discovered that parameter panel didn't sync correctly:
   - Selecting unbound overlay → checking Apply → panel didn't appear until re-selecting
   - Unchecking Apply on selected overlay → panel didn't disappear
   - **Solution**: Updated both `_on_binding_toggle()` and `_on_overlay_selected()` to check binding state and show/hide parameter panel accordingly

3. **Checkbox positioning**: Initial implementation placed checkbox on left side, but UX testing revealed it should be on right side (after overlay name) for better visual hierarchy. Changed from `pack(side=tk.LEFT)` to `pack(side=tk.RIGHT)`.

4. **Delete button with unbound overlays**: Original `_on_delete_overlay()` assumed overlay was always on canvas (via `canvas_controller.get_overlay_by_id()`). With unified list showing all overlays, unbound overlays aren't on canvas, causing `AttributeError: 'NoneType' object has no attribute 'name'`. Fixed by loading from workspace instead.

5. **Existing `_on_binding_toggle()` callback**: Discovered that Phase 1.5 (workspace-level overlays) already implemented the binding toggle logic we needed! This saved implementation time - we just reused the existing callback instead of writing new code.

## Decision Log

- Decision: Show ALL workspace overlays in the list (not just bound ones)
  Rationale: Users need to see all overlays to understand what exists in the workspace. The checkbox makes it clear which are applied to the current screenshot. This matches the mental model of "overlays are workspace-level resources, bindings are screenshot-level."
  Date: 2025-11-16

- Decision: Use "Apply" checkbox instead of visibility toggle
  Rationale: "Apply" is clearer than a visibility icon (👁️) because it communicates "apply this overlay to THIS screenshot", not "show/hide globally". Checkbox is a standard UI pattern for "include/exclude from set."
  Date: 2025-11-16

- Decision: Delete button permanently removes overlay
  Rationale: Users expect Delete to actually delete. The old behavior (unbinding) is now handled by the Apply checkbox. This eliminates the confusing "delete but it's still in the bottom panel" issue.
  Date: 2025-11-16

- Decision: Keep Delete/Lock buttons in overlay list (not per-row)
  Rationale: Keeps UI compact and follows the pattern of "select item → act on it with button". Adding buttons to each row would make the list too wide and cluttered. The selected overlay (radio button) makes it clear which overlay the buttons act on.
  Date: 2025-11-16

- Decision: Parameter panel only shows for bound (applied) overlays
  Rationale: Unbound overlays aren't on the canvas, so editing their parameters would be confusing (no visual feedback). Users should check "Apply" first to see the overlay, then edit parameters. This creates a clear workflow: Apply → Select → Edit.
  Date: 2025-11-16

- Decision: Place Apply checkbox on right side of overlay name
  Rationale: Visual hierarchy should be: Selection (radio) → Identification (icon + name) → Action (checkbox). Placing checkbox on the right keeps it near the Delete/Lock buttons and maintains left-to-right reading flow.
  Date: 2025-11-16

## Outcomes & Retrospective

(To be filled at completion)

## Context and Orientation

The icon-cropper tool has a **workspace-centric, multi-screenshot architecture**:

- **Workspace**: Contains multiple screenshots and overlays
- **Overlays**: Defined at workspace level (`workspace.json["overlays"]`)
- **Bindings**: Each screenshot has a list of overlay IDs to display (`workspace.json["screenshots"][i]["overlay_bindings"]`)

**Current UI State (Broken):**

```python
# Top panel - Overlays list
def _refresh_overlay_list(self):
    overlays = self.canvas_controller.get_all_overlays()  # Bound overlays only
    self.ui_builder.update_overlay_list(overlays, ...)

# Bottom panel - Apply to Screenshot
def _refresh_binding_list(self):
    all_overlays = self.workspace_manager.load_workspace_overlays()  # All overlays
    bound_ids = self.workspace_manager.load_screenshot_bindings(...)
    self.ui_builder.update_binding_list(all_overlays, bound_ids, ...)
```

**Key Files:**

- `config_editor.py`: Main orchestrator with `_refresh_overlay_list()` and `_refresh_binding_list()`
- `editor/ui_builder.py`: Creates UI components including `update_overlay_list()` and `update_binding_list()`
- `editor/workspace_manager.py`: Manages workspace.json with overlay and binding CRUD

**Data Model (workspace.json):**

```json
{
  "overlays": {
    "grid_1": { "id": "grid_1", "type": "grid", "name": "Grid 1", "config": {...}, "locked": false, "visible": true },
    "ocr_1": { "id": "ocr_1", "type": "ocr", "name": "OCR Region 1", "config": {...}, "locked": false, "visible": true }
  },
  "screenshots": [
    {
      "filename": "001.png",
      "resolution": [1920, 1080],
      "overlay_bindings": ["grid_1", "ocr_1"]  // Which overlays show on this screenshot
    },
    {
      "filename": "002.png",
      "resolution": [1920, 1080],
      "overlay_bindings": ["grid_1"]  // Only grid_1 applied to screenshot 2
    }
  ]
}
```

## Plan of Work

We will consolidate the two-panel overlay UI into a single unified list. The work is organized into 4 phases:

**Phase 1: Update Overlay List to Show ALL Workspace Overlays**

Currently, `_refresh_overlay_list()` only shows overlays bound to the current screenshot. We need to:
1. Change `_refresh_overlay_list()` to load ALL workspace overlays
2. Add checkbox column to each overlay row for "Apply to this screenshot"
3. Checkbox state determined by whether overlay ID is in current screenshot's bindings
4. Wire checkbox toggle to existing binding logic

**Phase 2: Remove "Apply to Screenshot" Panel**

Once overlay list shows all overlays with Apply checkboxes, the bottom panel is redundant:
1. Remove binding panel widget creation from `ui_builder.py`
2. Remove `_refresh_binding_list()` calls from `config_editor.py`
3. Update right sidebar layout to use freed space

**Phase 3: Update Delete Button to Permanently Delete**

Currently Delete just unbinds. Make it actually delete:
1. Update `_on_delete_overlay()` to remove from `workspace.json["overlays"]`
2. Remove overlay ID from ALL screenshot bindings (not just current)
3. Add warning dialog if overlay is used by multiple screenshots
4. Update UI after deletion

**Phase 4: Polish and Edge Cases**

Handle edge cases and improve UX:
1. Update overlay count label ("3 overlays in workspace" instead of "2 overlays")
2. Disable Delete if overlay is locked
3. Test with complex scenarios (many screenshots, many overlays)

## Concrete Steps

All commands should be run from the `tools/icon-cropper/` directory.

**Before starting:**

1. Ensure the tool runs without errors:
   ```bash
   cd tools/icon-cropper
   uv run python config_editor.py
   ```

2. Create test workspace with multiple screenshots and overlays:
   - Create workspace
   - Add 2+ screenshots
   - Create 3+ overlays
   - Bind different overlays to different screenshots
   - Verify current two-panel UI works

**Phase 1: Update Overlay List to Show ALL Workspace Overlays**

1. Open `config_editor.py`

2. Locate `_refresh_overlay_list()` (around line 1126):

   ```python
   def _refresh_overlay_list(self):
       """Refresh the overlay list widget."""
       overlays = self.canvas_controller.get_all_overlays()  # ONLY BOUND OVERLAYS

       self.ui_builder.update_overlay_list(
           overlays,
           self.selected_overlay_id,
           self._on_overlay_selected,
           self._on_delete_overlay,
           self._on_lock_overlay
       )
   ```

3. Change to load ALL workspace overlays:

   ```python
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
   ```

4. Open `editor/ui_builder.py`

5. Locate `update_overlay_list()` method signature (around line 805):

   ```python
   def update_overlay_list(self, overlays: List[Any], selected_id: Optional[str],
                          on_select_callback: Callable, on_delete_callback: Callable,
                          on_lock_callback: Callable):
   ```

6. Update signature to include bindings:

   ```python
   def update_overlay_list(self, overlays: List[Any], selected_id: Optional[str],
                          bound_ids: List[str],  # NEW
                          on_select_callback: Callable,
                          on_binding_toggle_callback: Callable,  # NEW
                          on_delete_callback: Callable,
                          on_lock_callback: Callable):
   ```

7. Update overlay list rendering to include Apply checkbox:

   ```python
   for overlay in overlays:
       frame = ttk.Frame(self.overlay_list_frame)
       frame.pack(fill=tk.X, pady=2)

       # Apply checkbox (bind/unbind from screenshot)
       var = tk.BooleanVar(value=(overlay.id in bound_ids))
       checkbox = ttk.Checkbutton(
           frame,
           text="Apply",
           variable=var,
           command=lambda oid=overlay.id, v=var: on_binding_toggle_callback(oid, v.get())
       )
       checkbox.pack(side=tk.LEFT, padx=5)

       # Icon based on type
       icon = "🔲" if overlay.type == "grid" else "📄"
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
   ```

8. Back in `config_editor.py`, implement `_on_binding_toggle()`:

   ```python
   def _on_binding_toggle(self, overlay_id: str, is_bound: bool):
       """Handle Apply checkbox toggle.

       Args:
           overlay_id: ID of overlay to bind/unbind
           is_bound: True if checkbox is checked, False if unchecked
       """
       if not self.current_workspace:
           return

       selected = self.workspace_manager.get_selected_screenshot(self.current_workspace)
       if not selected:
           return

       if is_bound:
           self.workspace_manager.bind_overlay_to_screenshot(
               self.current_workspace, selected, overlay_id
           )
       else:
           self.workspace_manager.unbind_overlay_from_screenshot(
               self.current_workspace, selected, overlay_id
           )

       # Reload overlays on canvas
       self._load_selected_screenshot()
   ```

9. Test Phase 1:
   ```bash
   uv run python config_editor.py
   ```
   - Load workspace with multiple overlays
   - Verify all workspace overlays appear in list (not just bound ones)
   - Verify Apply checkbox reflects binding state
   - Toggle Apply checkbox → overlay appears/disappears on canvas
   - Switch screenshots → checkbox state changes based on that screenshot's bindings

**Phase 2: Remove "Apply to Screenshot" Panel**

1. Open `editor/ui_builder.py`

2. Locate the binding panel creation in `create_main_layout()` (around line 378-403):

   ```python
   # === Overlay Binding Panel (Phase 1.5) ===
   ttk.Separator(overlay_panel, orient=tk.HORIZONTAL).pack(fill=tk.X, padx=5, pady=10)

   ttk.Label(
       overlay_panel,
       text="Apply to Screenshot:",
       font=("Arial", 10, "bold")
   ).pack(pady=(5, 5))

   # Scrollable binding list
   binding_list_frame = ttk.Frame(overlay_panel)
   # ... rest of binding panel code ...
   ```

3. Delete the entire binding panel section (lines 378-403)

4. Open `config_editor.py`

5. Remove all calls to `_refresh_binding_list()`:
   - After creating overlay (in draw tools)
   - After deleting overlay
   - After loading screenshot

6. Delete the `_refresh_binding_list()` method entirely

7. Delete the `update_binding_list()` method from `ui_builder.py`

8. Test Phase 2:
   ```bash
   uv run python config_editor.py
   ```
   - Verify bottom panel is gone
   - Verify overlay list still shows Apply checkboxes
   - Verify Apply checkbox still works

**Phase 3: Update Delete Button to Permanently Delete**

1. Open `config_editor.py`

2. Locate `_on_delete_overlay()` (around line 1246):

   ```python
   def _on_delete_overlay(self):
       """Handle delete overlay button click."""
       if not self.selected_overlay_id:
           return

       overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
       if overlay and overlay.locked:
           messagebox.showwarning("Locked", "Cannot delete locked overlay. Unlock it first.")
           return

       # Confirm deletion
       if messagebox.askyesno("Delete Overlay", f"Delete overlay '{overlay.name}'?"):
           self.canvas_controller.remove_overlay_by_id(self.selected_overlay_id)
           self.selected_overlay_id = None
           self.ui_builder.update_parameter_panel(None, None)
           self._save_current_overlays()
           self._refresh_overlay_list()
           self._refresh_binding_list()  # This will be removed in Phase 2
           self.canvas_controller.display_image()
   ```

3. Update to permanently delete from workspace:

   ```python
   def _on_delete_overlay(self):
       """Handle delete overlay button click - PERMANENTLY deletes overlay from workspace."""
       if not self.selected_overlay_id:
           return

       overlay = self.canvas_controller.get_overlay_by_id(self.selected_overlay_id)
       if not overlay:
           return

       if overlay.locked:
           messagebox.showwarning("Locked", "Cannot delete locked overlay. Unlock it first.")
           return

       # Check which screenshots use this overlay
       screenshots_using = []
       for screenshot in self.workspace_manager.get_screenshots(self.current_workspace):
           bindings = self.workspace_manager.load_screenshot_bindings(
               self.current_workspace, screenshot["filename"]
           )
           if self.selected_overlay_id in bindings:
               screenshots_using.append(screenshot["filename"])

       # Build confirmation message
       msg = f"Permanently delete overlay '{overlay.name}' from workspace?"
       if screenshots_using:
           msg += f"\n\nThis overlay is used by {len(screenshots_using)} screenshot(s):\n"
           msg += "\n".join(f"  • {s}" for s in screenshots_using[:5])
           if len(screenshots_using) > 5:
               msg += f"\n  ... and {len(screenshots_using) - 5} more"

       # Confirm deletion
       if messagebox.askyesno("Delete Overlay", msg):
           # Remove from workspace (this handles unbinding from all screenshots)
           self.workspace_manager.delete_overlay(self.current_workspace, self.selected_overlay_id)

           # Clear selection and UI
           self.selected_overlay_id = None
           self.ui_builder.update_parameter_panel(None, None)

           # Refresh lists and canvas
           self._refresh_overlay_list()
           self._load_selected_screenshot()  # Reload canvas with new bindings

           self.update_status(f"Deleted overlay '{overlay.name}' from workspace")
   ```

4. In `editor/workspace_manager.py`, add `delete_overlay()` method:

   ```python
   def delete_overlay(self, workspace: str, overlay_id: str):
       """Permanently delete overlay from workspace and all screenshot bindings.

       Args:
           workspace: Workspace name
           overlay_id: ID of overlay to delete
       """
       metadata_path = self.workspaces_root / workspace / "workspace.json"
       metadata = self._load_metadata(metadata_path)

       # Remove from overlays dict
       if overlay_id in metadata.get("overlays", {}):
           del metadata["overlays"][overlay_id]

       # Remove from all screenshot bindings
       for screenshot in metadata.get("screenshots", []):
           if overlay_id in screenshot.get("overlay_bindings", []):
               screenshot["overlay_bindings"].remove(overlay_id)

       self._save_metadata(metadata_path, metadata)
   ```

5. Test Phase 3:
   ```bash
   uv run python config_editor.py
   ```
   - Create overlay, bind to screenshot 1
   - Switch to screenshot 2, verify overlay in list but unchecked
   - Delete overlay → verify deleted from workspace.json
   - Verify overlay removed from ALL screenshot bindings
   - Verify overlay removed from canvas

**Phase 4: Polish and Edge Cases**

1. Update overlay count label to show workspace overlays (not bound overlays):

   ```python
   # In update_overlay_list()
   self.overlay_count_label.config(
       text=f"{len(overlays)} overlay{'s' if len(overlays) != 1 else ''} in workspace"
   )
   ```

2. Test edge cases:
   - Create 10+ overlays → verify scrolling works
   - Bind overlay to 5 screenshots → delete → verify confirmation shows all 5
   - Lock overlay → verify cannot delete
   - Unbind all overlays from screenshot → verify canvas is empty

3. Update `CLAUDE.md` with new UI pattern:
   - Document unified overlay list
   - Explain Apply checkbox vs Delete button
   - Update screenshots if needed

## Validation and Acceptance

**Acceptance Criteria:**

After completing all phases, the following must be true:

1. **Unified List**: Single overlay list shows ALL workspace overlays (not just bound ones)

2. **Apply Checkbox**: Each overlay has "Apply" checkbox that binds/unbinds to current screenshot

3. **Delete Behavior**: Delete button permanently removes overlay from workspace and all screenshot bindings

4. **Multi-Screenshot**: Switching screenshots updates Apply checkboxes based on that screenshot's bindings

5. **No Binding Panel**: The "Apply to Screenshot" panel is completely removed

**Validation Commands:**

```bash
cd tools/icon-cropper
uv run python config_editor.py
```

**Manual Test Checklist:**

1. Create workspace with 2 screenshots
2. Create 3 overlays (2 grids, 1 OCR)
3. Bind grid1 and OCR to screenshot 1
4. Bind only grid1 to screenshot 2
5. Verify screenshot 1: grid1 ☑, grid2 ☐, OCR ☑
6. Verify screenshot 2: grid1 ☑, grid2 ☐, OCR ☐
7. Uncheck grid1 on screenshot 1 → grid disappears from canvas
8. Delete grid2 (unbound) → verify removed from workspace
9. Delete OCR (bound to 1 screenshot) → verify warning shows screenshot 1
10. Confirm delete → verify OCR removed from workspace and screenshot 1 bindings

**Expected Observable Behavior:**

Before:
- Two panels: "Overlays" (bound only) and "Apply to Screenshot" (all overlays)
- Delete button unbinds instead of deletes
- Confusing which panel controls what

After:
- One panel: "Overlays" showing all workspace overlays
- Apply checkbox binds/unbinds to current screenshot
- Delete button permanently deletes from workspace
- Clear, predictable behavior

## Idempotence and Recovery

**Safe Execution:**

- All changes are code modifications, no data migration required
- workspace.json schema unchanged (overlays and bindings already exist)
- Old workspaces work with new code

**Recovery:**

If issues arise, revert the changes:

```bash
cd tools/icon-cropper
git diff config_editor.py editor/ui_builder.py editor/workspace_manager.py
# Review changes

# If needed, revert:
git checkout config_editor.py editor/ui_builder.py editor/workspace_manager.py
```

**Rollback Safety:**

The workspace.json schema is not changing, so old code can read new workspaces and vice versa. No backward compatibility issues.

## Artifacts and Notes

**Key Code Locations:**

- Overlay list refresh: `config_editor.py` line 1126 (`_refresh_overlay_list()`)
- Overlay list UI: `editor/ui_builder.py` line 805 (`update_overlay_list()`)
- Binding panel UI: `editor/ui_builder.py` line 378-403 (TO BE REMOVED)
- Delete handler: `config_editor.py` line 1246 (`_on_delete_overlay()`)
- Workspace manager: `editor/workspace_manager.py`

**Expected File Changes:**

- `config_editor.py`: ~50 lines modified, ~30 lines removed
- `editor/ui_builder.py`: ~100 lines modified, ~50 lines removed
- `editor/workspace_manager.py`: ~20 lines added (`delete_overlay()`)

---

*Plan created: 2025-11-16*
*Last updated: 2025-11-16 (Phase 1 completed)*
