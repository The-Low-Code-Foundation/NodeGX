# Nightbook kit

The page a child decorates, for the evening journal (TPL-011, `dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md`).

One node, **Journal Page** (`nightbook-kit.Page`). It draws an array of items free on a page: text she types onto,
stickers, speech bubbles and photos. Each one is moved with a finger, a pen or the mouse, resized from its corner,
turned from its top handle, or pinched and turned with two fingers.

- **In:** `Items` (the array), `Editable` (off = a closed page), the page's size and background, and the current
  *choice* (Font, Font Size, Colour, Fill, Effect, Sticker). A choice applies to the picked item when it changes, and
  to every new item.
- **Actions:** Add Text, Add Sticker, Add Bubble, Add Photo (opens the file picker; wire a button press straight to
  it), Remove Picked, Bring To Front.
- **Out:** `Items` then `Changed`, once per finished gesture, typed passage, choice, add or removal. `Words`, `Picked
  Id` / `Picked Kind`, `Key` (for a keyboard helper), `Photo Bytes`, `Photo Problem`.

It never saves. Wire `Changed` to the record; refusing a closed day is the backend's job (TPL-011-DESKTOP §3.3).

Photos come from the picker, a drop or a paste, and are shrunk in the page (long edge ≤ Photo Max Edge, JPEG) before
they are kept, because the desktop backend has no image resizer (`sharp` is optional and absent).

The page is Page Width × Page Height *units* and is drawn to fit its width, so a page reads the same on any screen.
Handles are 48 px targets at any scale.
