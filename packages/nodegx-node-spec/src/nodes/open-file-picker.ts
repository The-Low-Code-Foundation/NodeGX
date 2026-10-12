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
