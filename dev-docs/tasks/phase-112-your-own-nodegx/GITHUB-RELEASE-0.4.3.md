## NodeGX 0.4.3 — alpha

**The backend NodeGX runs on your computer now makes the smaller photos an app shows on its cards and lists.**

### Fixed

- **The backend on your computer can make smaller copies of photos.** An app asks for one to show a photo on a card or in a list. In 0.4.2 the backend that NodeGX runs couldn't make them, so the app showed a broken image there. The photo itself was always uploaded.
- **Saving an app sends its cloud functions only to its own backend.** In 0.4.2 a save sent them to every backend running on your computer. With two apps' backends running, one app's functions reached the other app's backend.
- **A Function can call a signal with nothing wired to it.** Outside the editor, in a preview or a deployed app, a Function whose code called `Outputs.done()` stopped with an error when nothing was wired to Done. It now runs to the end and sends nothing.

### New

- **Your agent can set the look of one kind of control across the app.** The new `set_element_style` tool styles every button at once, for example. `render_report` now draws an app's styles as well.
- **Your agent hears which argument a tool doesn't have.** `call_tool` now refuses an argument the tool doesn't take and names it, as calling the tool directly does.
- **Exported apps do more of what the running app does.** A signal sent into a component, a Function's Success, a Set Variable's Done and a text field's Set and Clear now work the same in exported code.

### Before you file a bug

- **Exported code doesn't keep Readers or Shrink To yet.** If your app shares photos with members only, don't export it as code for now. An exported Upload File sends the photo as a full-size public file.
- **Code export is still alpha.**
- **Windows installers are unsigned** and SmartScreen will warn. macOS is signed and notarised.
- **Linux is install-only.** Download the next AppImage to update.
- **If you use NodeGX's MCP server with an assistant, restart that assistant's session after updating.**

The full list is in the [changelog](https://nodegx.io/changelog/#v0-4-3).
