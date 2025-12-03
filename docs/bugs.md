## Camera Preset Modal Text Input Bug

### Description
When creating and deleting camera presets, the modal for adding a new camera view sometimes becomes unresponsive. Specifically, the text input in the modal cannot be focused or typed into, although pasting and deleting text (with backspace) works. Selecting the input via browser dev tools temporarily restores normal behavior.

### Observed Behavior
- After deleting a camera preset, opening the add view modal causes the text input to be unresponsive to keyboard input and mouse focus.
- Pasting text and using backspace works, but typing new characters does not.
- Selecting the input using dev tools restores normal typing and focus.
- Canceling and reopening the modal also restores normal behavior.

### Approaches Tried
- CSS fixes for pointer-events and z-index to ensure overlays do not block the input.
- Programmatically focusing and clicking the input after opening the modal.
- Resetting modal and overlay states on open and close.
- Ensuring only the Enter key is intercepted in custom keydown handlers.
- Pre-filling the input with a default name ("Custom View XX") based on the number of presets.

### Current Status
The bug persists despite these approaches. The root cause appears to be a focus or event-handling issue, possibly related to overlays or global event listeners interfering with the modal's input. Further investigation is needed.

---
