---
title: "Open File Picker"
---
Opens the browser's native file dialog on a signal and outputs the picked file plus its name, size and MIME type.

When the `open` (Open) signal fires, the node clicks a hidden HTML file input, showing the browser's native file dialog. When the user picks a file, the `file` output delivers the browser File object (the value upload nodes expect), the Metadata outputs update, and `done` fires. If the user closes the dialog with nothing chosen — or a later `open` supersedes this one — `unchanged` fires instead, which is a legitimate empty result and not a failure. The selection is reset after each pick, so choosing the same file again still reports `done`. `acceptedFileTypes` maps to the file input's accept attribute; `capture` maps to the capture attribute, which on mobile devices requests a camera or microphone as the source.

## When to use it

Use it whenever the user must supply a file from their device — avatar upload, CSV import — typically firing `open` from a Button's `onClick` and passing `file` to an Upload File node. It is browser-only; there is no folder or multi-file selection.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `Open File Picker` |
| Available in | browser |
| SSR compatibility | client-only — File dialogs only exist in the browser. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `acceptedFileTypes` | String | — | Comma-separated extensions or MIME types the dialog offers; leave blank to offer every file |
| `capture` | String | — | Asks a mobile browser to open a camera or microphone instead of the file list — "user" for the front camera, "environment" for the rear |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `open` | Signal | — | Opens the browser file dialog |

### What each input does

**Accepted file types** (`acceptedFileTypes`)

- always: held as handed; put on the dialog at the next Open — blank offers every file

**Capture** (`capture`)

- always: held as handed; put on the dialog at the next Open — blank asks for the file list, not a camera

**Open** (`open`)

- the browser refuses to open the dialog: an Open still waiting is answered Unchanged first; Error says why, and this press fails at once → Failure
- the dialog opens, with Accepted file types and Capture as held: an Open still waiting is answered Unchanged first; this press waits for the person — a file chosen sends File, Path, Name, Size in bytes and Type, then Done; the dialog cancelled or closed with nothing is Unchanged

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `file` | * | — | The chosen file itself, for passing on to an upload node |
| `name` | String | — | File name as the user chose it, extension included |
| `path` | String | — | Absolute path of the chosen file, which only the desktop app can supply — blank in a browser |
| `sizeInBytes` | Number | — | Size of the chosen file, in bytes |
| `type` | String | — | MIME type the browser reports, which is blank for an extension it does not recognise |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once a file has been chosen and every metadata output is up to date |
| `unchanged` | Signal | — | Fires when the dialog closed with nothing chosen, or when a later Open superseded this one — a legitimate outcome rather than a failure |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the dialog could not be opened |
| `failure` | Signal | — | Fires when the dialog could not be opened at all, for example inside a sandboxed frame |

## Patterns

- Button `onClick` → `open`, then `file` → Upload File and `done` → the upload's trigger: the standard upload flow.
- Latch `done` into a Boolean (value pinned true, `done` → Set) to reveal post-pick UI as a level.

## Watch out for

- Treating `acceptedFileTypes` as a guarantee — users can often override the filter; check `type`/`sizeInBytes` before acting on the file.

## Examples

**File picker with a shared accent color and a viewport-aware hint**

Three utility shapes in one small screen. A Color node is the single source of truth for the accent: it holds the design token `var(--primary)` — a colour port takes a token as readily as a hex, and the token survives the node — and its savedValue fans out to the title's text color and the button's background, so one edit restyles both. The Button's onClick fires Open File Picker's open — the dialog must come from a user gesture — and after a pick the file's name flows into a Text while `done` latches a Boolean (value pinned true) that reveals the result row as a level; closing the dialog with nothing chosen reports `unchanged` instead. Screen Resolution's width feeds an Expression (width < 600) whose boolean drives the compact hint's visibility, updating live as the window resizes.

**Drag a file onto the page, or click to browse**

A drop target built the way the browser actually requires: a `Javascript2` node adds `dragover`/`drop` listeners to the element on `Node.Signals.DidMount` and removes them on `WillUnmount`, because a listener attached without a matching removal survives the component and fires against a node that is gone. `Component Children` means the drop zone wraps whatever you put inside it rather than dictating its own appearance, and `Open File Picker` gives the same component a click-to-browse path, so one part answers both ways a person supplies a file. ⚠️ One wire in the original had to be re-pointed to land here: it named an `Open File Picker` output called `success`, which was real when this was written and is now called `done`.

## Related nodes

[Upload File](../cloud-services/upload-file.md), [Image](../visual/image.md), [Boolean](../variables/boolean.md), [String](../variables/string.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the browser's file picker (`picker`)

### Starting state

```json
{
  "pending": false
}
```

### How actions report back

Each time Open is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/open-file-picker.ts"
/**
 * Open File Picker (`Open File Picker`) — read on 2026-10-03 (NSP-014 s31) from
 * `packages/noodl-viewer-react/src/nodes/std-library/openfilepicker.ts`. The one node that asks the PERSON for something
 * through the browser (world.ts PICKER).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE ELEMENT — one file `<input>`, made at the node's making (`initialize`, :43-51 — "it doesn't work predictably in
 * Safari when created in the open signal function") and reused for every Open. Its `accept` and `capture` are REFLECTED
 * attributes (world.ts PICKER): whatever is assigned is held as a string. The node sets them on EVERY Open, from what it
 * holds (v2, rows C53 + D27 ruled "Fix it" / "Blank means no filter"):
 *   `accept` — Accepted file types as held; blank (`undefined`, `null`, `''`) REMOVES the attribute: no filter. v1 assigned
 *     it raw, so unset it was the STRING `"undefined"` (D27);
 *   `capture` — Capture when TRUTHY; otherwise the attribute is REMOVED. v1 set it only when truthy and never removed it, so
 *     a Capture cleared after an Open that used it left the next dialog asking for the camera (C53).
 * HELD VALUES, stored raw as they arrive (:182-184, :192-194). Neither is sent anywhere; both reach the element at Open.
 *
 * OPEN (:58-174) — in this order, all inside the press:
 *   1. an Open still waiting for the dialog is SUPERSEDED: Unchanged, now (:66-70; ERG-001 §4 — a `Failure` for a graph
 *      working as written would train authors to ignore the port);
 *   2. a token for this press (:72) — pending until the person answers;
 *   3. the element's two attributes (above), the handlers assigned (:147-148), and the CLICK (:164-165) — a `picker` event;
 *   4. a click that THROWS (:166-173): the handlers taken off, Error `Could not open the file picker: <message>` (the
 *      exception's message; the exception itself when it has none), Failure `open-file-picker/open-failed`.
 * THE ANSWER (world.ts PICKER), at its moment, to whatever handler the element holds then — this node's, exactly while an
 * Open waits (`pending`: set by a click that did not throw, cleared by any answer, a throw, or nothing else):
 *   a `change` with a file (:81-110): the handlers off; File, Path, Name, Size in bytes and Type sent; Done;
 *   a `change` with an EMPTY list (:96-99, NDA-004 §2): the handlers off; Unchanged — every output as it was;
 *   a `cancel` (:136-139): the handlers off; Unchanged.
 * An answer that finds no handler (the press it answered was already settled — superseded and answered since, or the
 * dialog's second answer) does nothing.
 *
 * OUTPUTS read the chosen file as kept (:198-242): `undefined` until one is chosen, and after a later empty list or cancel
 * still the last one chosen. Error (:251-259) keeps the last failure across a later Done — nothing clears it (row D25's
 * family: Request Magic Link's Error, Upload File's).
 *
 * NOT GRADED HERE, named:
 *   - Path's VALUE on the desktop app (Electron's `path` on a `File`): a browser's file has none and a world file has none,
 *     so Path is never sent here (world.ts PICKER, not played).
 *   - the inspector (`getInspectInfo`, :38-42 — the chosen file's path), not a port.
 *   - a node deleted while its dialog is open: the token is never reported (no `_onNodeDeleted`); nothing on the wire.
 *   - a server render: the node cannot be made without a `document` (`ssr: client-only`, :37); a play has one exactly
 *     when its script has a picker, and this spec needs one.
 */

import type { WorldView } from '../spec';
import { defineNode } from '../spec';
import type { PickerScript } from '../world';
import { dones } from './user-actions';

/** :172 */
export const OPEN_FAILED = 'open-file-picker/open-failed';

/** :168-169 — `e.message` when the exception has one, else the exception itself (a `DOMException` with none reads as its name). */
const openFailed = (message: string) => 'Could not open the file picker: ' + (message ? message : 'NotAllowedError');

/** What a person chooses in a sequence: an image (weighted — it is the success path), a text file, a file with no type. */
const PHOTO = { name: 'photo.png', type: 'image/png', size: 3 };
const NOTES = { name: 'notes.txt', type: 'text/plain', size: 12 };

/** The people at the dialog a sequence plays with: picks at once and late, backs out, cancels, a refused click, a dialog left open, and an answer racing a later Open's. */
const PICKERS: ReadonlyArray<PickerScript> = [
  { answers: [{ file: PHOTO }] },
  { answers: [{ file: PHOTO, after: 20 }, { file: NOTES }] },
  { answers: [{ cancel: true }, { file: PHOTO }] },
  { answers: [{ empty: true, after: 5 }, { cancel: true, after: 30 }] },
  { answers: [{ throws: 'The file chooser is not allowed in this frame' }, { file: { name: 'blob' } }] },
  { answers: [{ never: true }, { file: PHOTO }] },
  { answers: [{ file: PHOTO, after: 50 }, { cancel: true }] },
  {}
];

type PickerState = {
  /** `_internal.acceptedFileTypes` / `_internal.capture` — held raw (:182-184, :192-194) */
  acceptedFileTypes: unknown;
  capture: unknown;
  /** `_internal.file` (:101) */
  file: unknown;
  /** `_internal.error` (:170) */
  error: unknown;
  /** an Open is waiting for the dialog — `_internal.pendingOpen`, and the element's handlers are this node's (:73, :77) */
  pending: boolean;
};

const fileField = (s: Readonly<PickerState>, key: 'path' | 'name' | 'size' | 'type') => (s.file ? (s.file as Record<string, unknown>)[key] : undefined);

export const OpenFilePicker = defineNode({
  type: 'Open File Picker',
  // v2 (P109 ISL-030, rows C53 + D27): every Open sets Capture and Accepted file types as they stand, and removes a blank one;
  // v1 never removed Capture once set, and wrote the string "undefined" for an unset Accepted file types.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/openfilepicker.ts',
  needs: ['picker'],
  worldPool: { pickers: PICKERS },
  state: { acceptedFileTypes: undefined, capture: undefined, file: undefined, error: undefined, pending: false } as PickerState,
  // :245-250
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    // :53-175
    open: { type: 'signal', outcome: true, displayName: 'Open', group: 'Actions', description: 'Opens the browser file dialog' },
    // :176-185
    acceptedFileTypes: {
      type: 'string',
      coerce: 'none',
      displayName: 'Accepted file types',
      group: 'General',
      description: 'Comma-separated extensions or MIME types the dialog offers; leave blank to offer every file',
      examples: ['image/*', '.png,.jpg', '', 'video/*,audio/*']
    },
    // :186-195
    capture: {
      type: 'string',
      coerce: 'none',
      displayName: 'Capture',
      group: 'General',
      description: 'Asks a mobile browser to open a camera or microphone instead of the file list — "user" for the front camera, "environment" for the rear',
      examples: ['user', 'environment', '']
    }
  },
  outputs: {
    // :198-206
    file: { type: '*', displayName: 'File', group: 'General', description: 'The chosen file itself, for passing on to an upload node', from: (s) => s.file },
    // :207-215
    path: {
      type: 'string',
      displayName: 'Path',
      group: 'Metadata',
      description: 'Absolute path of the chosen file, which only the desktop app can supply — blank in a browser',
      from: (s) => fileField(s, 'path')
    },
    // :216-224
    name: { type: 'string', displayName: 'Name', group: 'Metadata', description: 'File name as the user chose it, extension included', from: (s) => fileField(s, 'name') },
    // :225-233
    sizeInBytes: { type: 'number', displayName: 'Size in bytes', group: 'Metadata', description: 'Size of the chosen file, in bytes', from: (s) => fileField(s, 'size') },
    // :234-242
    type: {
      type: 'string',
      displayName: 'Type',
      group: 'Metadata',
      description: 'MIME type the browser reports, which is blank for an extension it does not recognise',
      from: (s) => fileField(s, 'type')
    },
    // :251-259
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the dialog could not be opened', from: (s) => s.error }
  }
}).on(
  {
    acceptedFileTypes: (_s, v) => ({ says: 'always: held as handed; put on the dialog at the next Open — blank offers every file', set: { acceptedFileTypes: v }, send: [] }),
    capture: (_s, v) => ({ says: 'always: held as handed; put on the dialog at the next Open — blank asks for the file list, not a camera', set: { capture: v }, send: [] }),
    // :58-174 — supersede, a token, the attributes, the click; a refused click fails at once
    open: (s, _i, w: WorldView) => {
      const settles = s.pending ? [{ outcome: 'unchanged' as const }] : undefined;
      // v2 (C53, D27): both as they stand, a blank one removed (an absent attribute reads '')
      const blank = s.acceptedFileTypes === undefined || s.acceptedFileTypes === null || s.acceptedFileTypes === '';
      // v2: nothing the element held before is read, so it is not state
      const picker = { accept: blank ? '' : String(s.acceptedFileTypes), capture: s.capture ? String(s.capture) : '' };
      const answer = w.pickerAnswer(0);
      if ('throws' in answer) {
        const error = openFailed(answer.throws);
        return {
          says: 'the browser refuses to open the dialog: an Open still waiting is answered Unchanged first; Error says why, and this press fails at once',
          set: { pending: false, error },
          send: ['error' as const],
          outcome: 'failure' as const,
          error: OPEN_FAILED,
          settles,
          picker
        };
      }
      // only what changes (record.ts's rule): a superseding Open finds the press already pending
      return {
        says: 'the dialog opens, with Accepted file types and Capture as held: an Open still waiting is answered Unchanged first; this press waits for the person — a file chosen sends File, Path, Name, Size in bytes and Type, then Done; the dialog cancelled or closed with nothing is Unchanged',
        set: s.pending ? {} : { pending: true },
        send: [],
        outcome: 'pending' as const,
        settles,
        picker
      };
    }
  },
  {
    world: {
      // :81-139 — the answer meets this node's handler only while an Open waits
      picker: (s, _i, event) => {
        if (!s.pending) return { send: [] };
        if (event.kind === 'change' && event.file !== undefined) {
          return { set: { file: event.file, pending: false }, send: ['file' as const, 'path' as const, 'name' as const, 'sizeInBytes' as const, 'type' as const], outcomes: dones('open', 1) };
        }
        return { set: { pending: false }, send: [], outcomes: [{ port: 'open', outcome: 'unchanged' as const }] };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
