---
title: "Upload File"
---
Uploads a browser file to cloud storage when triggered, reporting progress and yielding a cloudfile handle.

Upload File takes a browser File (typically from Open File Picker) on its untyped `file` input and, when `upload` fires, stores it in the cloud backend's file storage. Progress streams out (`progressLoadedPercent`, byte counts, `progressChanged`), and on `done` the stored file is available as `cloudFile` — the handle to attach to a record's file property or unwrap with Cloud File. `failure` carries `error` and `errorStatus`.

## When to use it

Attachments, avatars, imports — any user-picked file that must persist server-side. The upload stores the file only; associating it with a record is a separate write (Create/Set Record).

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `Upload File` |
| Available in | browser |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `bucket` | String | — | Supabase Storage bucket to upload into. Supabase only; there is no default, and a bucket that does not exist fails with an error that does not say so |
| `collection` | String | — | PocketBase collection holding the record the file attaches to. PocketBase only |
| `field` | String | — | The file-typed field on that record. PocketBase only |
| `file` | * | — | The file to upload, as an Open File Picker node produces it |
| `path` | String | — | Object path inside the bucket, such as avatars/me.png. Supabase only. Leave blank to use the file's own name |
| `photoQuality` | Number | `80` | How much detail a shrunk JPEG or WebP keeps, from 1 to 100; PNG keeps every pixel and its transparency, GIF and SVG are never shrunk |
| `private` | Boolean | `false` | Restricts the stored file to whoever uploaded it, so reading it later needs a Sign File URL node |
| `readers` | String | — | Roles that may read the file as well as whoever uploaded it, such as role:member, separated by commas; setting it makes the file private. NodeGX backends only |
| `recordId` | String | — | Existing record to attach the file to. PocketBase only. Leave blank to create a new record as part of the upload |
| `shrinkTo` | Number | `0` | Makes a photo smaller in the browser before sending it, so its longer side is at most this many pixels; 0 sends every file as picked |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `upload` | Signal | — | Starts uploading File, and fails straight away when no file has been set |

### What each input does

**File** (`file`)

- always: held as handed; read when the next Upload goes — an upload already running keeps the file it was sent with

**Private** (`private`)

- always: held as handed; read when the next Upload goes

**Readers** (`readers`)

- always: held as handed; read when the next Upload goes — set, those roles may read the file as well as whoever uploaded it, and the file is private

**Shrink To** (`shrinkTo`)

- always: held as handed; read when the next Upload goes — above 0, a photo (not a GIF or an SVG) is drawn smaller in the browser first, its longer side at most this many pixels, and the smaller file is what goes; it goes as picked when it is already that small, when the smaller one would weigh more, or when the browser cannot read it

**Photo Quality** (`photoQuality`)

- always: held as handed; read when the next Upload goes, and only when a photo is shrunk — 1 to 100 for a JPEG or WebP, anything else is 80; a PNG keeps every pixel

**Bucket (Supabase)** (`bucket`)

- always: held as handed; read when the next Upload goes — set, the file goes to this bucket at Path (or under the file's own name)

**Path (Supabase)** (`path`)

- always: held as handed; read when the next Upload goes, and only with a Bucket

**Collection (PocketBase)** (`collection`)

- always: held as handed; read when the next Upload goes — with Field set and no Bucket, the file attaches to a record of this collection

**Record ID (PocketBase)** (`recordId`)

- always: held as handed; read when the next Upload goes, and only with Collection and Field — blank attaches the file to a new record

**Field (PocketBase)** (`field`)

- always: held as handed; read when the next Upload goes, and only with Collection — a half-filled group is no location at all

**Upload** (`upload`)

- always: its own upload at the frame's end — two presses are two uploads — with File, Private, Readers and the File Location held then: no File, or a Backend the project does not have, is Error, Error Status Code 0 and Failure at once; otherwise the backend answers with Cloud File then Done, or Error, Error Status Code and Failure

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `cloudFile` | Cloudfile | — | The stored file, for wiring into a record property or a Cloud File node |
| `progressLoadedBytes` | Number | — | How much of the file has been sent so far, in bytes |
| `progressLoadedPercent` | Number | — | How much of the file has been sent so far, from 0 to 100 |
| `progressTotalBytes` | Number | — | Size of the file being uploaded, in bytes |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the file is stored and Cloud File is up to date |
| `progressChanged` | Signal | — | Fires each time the byte counts below move during an upload |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last upload failed; empty until one does |
| `errorStatus` | Number | — | HTTP status the backend refused with, or 0 when the request never left the app |
| `failure` | Signal | — | Fires when the file could not be stored, after the reason has been reported on the error channel |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Some ports are discovered at runtime from user code, parameters or connected components, and are pushed to the editor per instance; the static port list below is incomplete for such instances.

## Ports at runtime

A `backendId` (Backend) input is registered at runtime rather than declared, so it appears only once a project has more than one backend — the node then uploads through whichever backend the picker names instead of the project's `cloudservices` endpoint (BCN-007 step 6). A backend id naming nothing is an error, never a silent fallback. The static inputs are also **per backend, not universal**: `bucket` and `path` are Supabase Storage only, and `collection`/`recordId`/`field` are PocketBase only, because PocketBase stores a file as a field on a record rather than as an object of its own. Leave them unset on the built-in, Parse and Directus backends. BCN-010 gates the node on `files.upload`, so a backend that cannot accept an upload marks the node with the reason before it is triggered.

## Patterns

- Picker `done` → `upload`, upload `done` → record write: three nodes, each owning one step.
- `private: true` uploads pair with Sign File URL: wire the same `done` signal to both the record write and the signer.

## Watch out for

- Treating `cloudFile` as set before `done` fired — sequence record writes on the Done signal.
- Setting `private: true` and then binding `cloudFile.url` straight to an Image/link — a private file's plain url 403s for anyone but the uploader; sign it first.

## Examples

**Create a record with an uploaded file attachment**

The create-with-attachment flow: Open File Picker hands the picked browser file to Upload File, which stores it in cloud storage and outputs a `cloudFile`. Cloud File exposes that file's `url`, previewed in an Image (the cloudfile→image cast). When the upload succeeds, Create Record (NewDbModelProperties) writes a new 'Attachment' record whose properties — including the file — are set on the node's schema-generated inputs.

**Upload a private file and preview it with a signed URL**

Open File Picker hands the picked file to Upload File with its `private` input set, so the backend ACLs the upload to its uploader instead of leaving it public. A private file's plain URL is not directly usable in an `<img>` — it 403s for anyone else, including an unauthenticated preview — so on the picker's `done` the resulting `cloudFile` is wired into Sign File URL, whose `sign` signal is fired from the same `done`. Sign File URL mints a short-TTL signed URL (the row-ACL check that gates it is the same one the file's own GET route uses), and THAT url — not the cloudFile's own plain url — feeds the Image's `src`. Re-signing before every render (rather than persisting the signed URL) is the idiomatic use: a stored, expired signature just 403s later.

**Record audio in the browser and upload it as a cloud file**

The whole round trip in built-in nodes: **Record Media** captures from the microphone, **Upload File** stores the result, and a **Video** node plays it back. The wiring worth copying is the three-way split on the outcome — `Started` and `Stopped` drive a `States` node that owns the status text, `Recording` drives the Stop button's `enabled` so the two buttons can never both be live, and `Permission Denied` / `Device Busy` land on their own states because a refused prompt and a microphone another tab is holding need different words. ⚠️ `Blob URL` is a string and `Mounted` is a boolean, so the playback surface is gated through an `Expression` rather than wired straight across — a URL is not a truth value. The `File` output is a real `File`, which is exactly what `Upload File` expects, so nothing here converts the recording to text and back on the way.

**Show a camera preview and record the stream you are already showing**

Two nodes that look like they overlap and do not. **Web Camera** opens a stream and hands it to a **Video** node's `Source Object`, which is the live preview; **Record Media** takes that same stream on its `Media Stream` input and writes it to a file. Because the stream is passed rather than re-requested, the browser asks for permission once — a recorder that calls `getUserMedia` again would prompt a second time and open a second camera handle. The ownership rule falls out of the same wire: the recorder did not open this stream, so it never stops its tracks, and `Stop` ends the recording while the preview keeps running. Stopping the camera stays the job of the node that started it, which is why `Stop Stream` is wired from its own button.

## Related nodes

[Open File Picker](../utilities/open-file-picker.md), [Cloud File](./cloud-file.md), [Sign File URL](./sign-file-url.md), [Create Record](../data/new-db-model-properties.md), [Update Record](../data/set-db-model-properties.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)

### Starting state

```json
{
  "callNames": {},
  "presses": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Upload is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/upload-file.ts"
/**
 * Upload File (`Upload File`) and Sign File URL (`Sign File URL`) — read on 2026-10-03 (NSP-014 s30) from
 * `packages/noodl-viewer-react/src/nodes/std-library/uploadfile.ts` and
 * `packages/noodl-runtime/src/nodes/std-library/data/signfileurl.ts`, with the store they reach (`api/cloudstore.js`
 * :235-241 → the adapter's `uploadFile` / `signFileUrl`) and the stored file one makes and the other reads
 * (`api/cloudfile.ts`). The two nodes that hand their backend a FILE operation (world.ts FILES).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (uploadfile.ts or signfileurl.ts,
 * named).
 *
 * HELD VALUES, stored raw as they arrive: Upload File's File (:74-76 — anything; a falsy one is "no file"), Private
 * (:90-92), Bucket, Path, Collection, Record ID and Field (:117-157); Sign File URL's File (signfileurl.ts :121-124 — a
 * stored file ONLY: any other value leaves the held one, as Cloud File does). Both register a Backend input on first
 * write (`registerInputIfNeeded`, uploadfile.ts :316-325, signfileurl.ts :282-291), held raw.
 *
 * THE PRESS — one token per press (`beginOutcome`, :170 / signfileurl.ts :135), and EVERY press its own after-inputs
 * callback (`scheduleAfterInputsHaveUpdated`, :172 / :137 — no batch, no coalescing: two presses in a frame are two
 * calls, measured s30), run at the frame end in press order with the held values AS THEY ARE THEN:
 *   no file — `No file specified`, status 0 (:175-178 / :139-142);
 *   a Backend the project does not have — the not-configured sentence, status 0 (:339-351 / :300-312), no call;
 *   otherwise the operation, to that backend (world.ts BACKEND, R9):
 *     Upload File — `uploadFile({ file, private, target })` (:183-215), `target` the File Location as ONE value
 *       (`fileTarget`, :366-383): Bucket set → `{ kind: 'bucket', bucket, path: Path || the file's name || '' }`;
 *       else Collection AND Field set → `{ kind: 'record', collection, field, recordId? }` (Record ID only when set);
 *       else none. A partly filled group is NO target (:355-360).
 *     Sign File URL — `signFileUrl({ name: <the stored file's name>, target: <its target> })` (:147-170).
 *   THE ANSWER — success: Upload File's Cloud File becomes a stored file made from the `FileRef` (`new CloudFile`, :209
 *   — name, url, and contentType / size / target when present; `id`, `filename` dropped), then Done (:212). Sign File
 *   URL's Signed URL, URL Kind, Safe To Share, Expires At and TTL take the `SignedFileUrl` (:156-164), then Done (:166).
 *   Failure: `setError` with the contract's envelope (world.ts FILES) — v2 (row C51, ruled "Send the real status",
 *   `fileFailureOf`): Error Status Code is the envelope's HTTP `status`, 0 when it has none (never a Parse error `code`);
 *   Error is its message, or a sentence naming the status when it has none. v1 read `code || status || 0` and put the
 *   whole envelope on Error when it had no message. Then Failure with the node's code
 *   (:399-403 / :334-339). Error and Error Status Code keep the last failure across a later success (nothing clears them).
 *
 * PROGRESS (Upload File): Uploaded Percent is 0 until a total is known (:292); Total and Uploaded Bytes `undefined`
 * (never sent, C3). The adapter the world plays never reports progress (world.ts FILES), so none of the four moves and
 * Progress Changed never fires.
 *
 * NOT GRADED HERE, named:
 *   - progress on the Parse wire's XHR upload (`onUploadProgress`, :187-195) — not a world the BACKEND seam plays.
 *   - the editor's Backend picker (`updatePorts`, `setup`) and the inspector — not ports.
 *   - a failure envelope that is `undefined` or `null` (the contract allows `error()` with nothing): v2 reads it as no
 *     message and no status (v1 threw). The world always hands an envelope.
 */

import { isStoredFile, type StoredFileLike } from '../canonical';
import type { BackendAnswerEvent, InputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import { fileError, StoredFile, type BackendScript } from '../world';
import { STORED_FILES } from './cloud-file';
import { backendPickerPort, NO_BACKEND_MESSAGE } from './record-base';
import { dones, failures, stringInput } from './user-actions';

/** uploadfile.ts :55, signfileurl.ts :96 */
export const UPLOAD_ERROR_CODE = 'upload-file/upload-failed';
export const SIGN_ERROR_CODE = 'sign-file-url/sign-failed';

/** :176 / signfileurl.ts :140 */
const NO_FILE = 'No file specified';

/** The Backend picker both register on first write (schema-ports.ts — edit-only: `_active_`, an id, or one the project lost). */
const backendPort = (): InputDecl => ({ type: 'string', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', examples: ['_active_', '_active_', 'main', 'other', 'nope'] });

/** What a press does at the frame end, before any answer: a failure (Error, status 0) or a call. */
type Settled = { error: unknown; errorStatus: unknown };

/**
 * `fileRef.ts` `fileFailureOf` (v2, row C51 ruled "Send the real status"): Error Status Code the envelope's HTTP `status`
 * (0 when there is none — never a Parse error `code`); Error the envelope's message, or a sentence naming the status when
 * it has none. v1 read `code || status || 0` and put the whole envelope on Error when it had no message.
 */
function errorOf(answer: { error: string | undefined; detail?: Record<string, unknown> }): Settled {
  const envelope = fileError(answer);
  const status = typeof envelope.status === 'number' && envelope.status > 0 ? envelope.status : 0;
  if (typeof envelope.error === 'string' && envelope.error !== '') return { error: envelope.error, errorStatus: status };
  return {
    error: status > 0 ? `The backend refused the request with HTTP ${status} and gave no reason` : 'The request failed and the backend gave no reason',
    errorStatus: status
  };
}

/** The presses of a frame, each its own call or failure (THE PRESS above). */
type Presses = {
  /** the presses this frame — each its own after-inputs callback */
  presses: number;
  /** every call made, by the spec's call id */
  calls: Readonly<Record<string, true>>;
  nextCall: number;
  backendId: unknown;
  error: unknown;
  errorStatus: unknown;
};

/** The backends a sequence plays with: at once and late, REST's refusal (a message and its status — v2, C51), the Parse wire's (a code and a status), none, silent, and a project with two. */
function pool(op: string, ok: unknown): ReadonlyArray<BackendScript> {
  return [
    { answers: [{ match: { op }, answer: { ok } }] },
    { answers: [{ match: { op }, answer: { ok } }] },
    { answers: [{ match: { op }, answer: { ok }, after: 20 }] },
    { answers: [{ match: { op }, answer: { error: 'HTTP 403: {"errors":[{"message":"You don\'t have permission to access this."}]}', detail: { status: 403 } } }] },
    { answers: [{ match: { op }, answer: { error: 'Permission denied', detail: { code: 119, status: 403 } }, after: 5 }] },
    { answers: [{ match: { op }, answer: { error: null, detail: { status: 500 } } }] },
    { answers: [{ match: { op }, answer: { never: true } }] },
    { backends: ['main', 'other'], answers: [{ match: { backend: 'other' }, answer: { error: 'Bucket not found' } }, { match: { op }, answer: { ok }, after: 1 }] }
  ];
}

/** Each press of the frame, in order: no file, no backend, or a call (THE PRESS above). */
function frame<S extends Presses>(s: S, w: WorldView, hasFile: boolean, op: string, args: () => Record<string, unknown>, code: string, port: 'upload' | 'sign') {
  if (s.presses === 0) return { send: [] as Array<'error' | 'errorStatus'> };
  const failed = (error: string) => ({ set: { presses: 0, error, errorStatus: 0 }, send: ['error' as const, 'errorStatus' as const], outcomes: failures(port, code, s.presses) });
  if (!hasFile) return failed(NO_FILE);
  const backend = w.backendFor(s.backendId);
  if (backend === undefined) return failed(NO_BACKEND_MESSAGE(s.backendId));
  const calls: Record<string, true> = { ...s.calls };
  const made = Array.from({ length: s.presses }, (_, k) => {
    const id = op + ':' + (s.nextCall + k);
    calls[id] = true;
    return { id, op, backend, args: args() };
  });
  return { set: { presses: 0, calls, nextCall: s.nextCall + s.presses }, send: [] as Array<'error' | 'errorStatus'>, backend: made };
}

/** One answer: a failure sets Error and its status, then Failure; a success is the node's own (`ok`), then Done. */
function answered<S extends Presses, P extends 'upload' | 'sign', O extends string>(s: S, answer: BackendAnswerEvent, port: P, code: string, ok: (value: unknown) => { set: Partial<S>; send: O[] }) {
  if (!s.calls[answer.id]) return { send: [] as Array<O | 'error' | 'errorStatus'> };
  if (!('ok' in answer)) {
    return { set: errorOf(answer) as Partial<S>, send: ['error' as const, 'errorStatus' as const], outcomes: failures(port, code, 1) };
  }
  const done = ok(answer.ok);
  return { ...done, outcomes: dones(port, 1) };
}

/**
 * :96-97 — the File output of an Open File Picker; weighted heavily, since only a file reaches the backend (s30, measured on
 * 400 sequences before weighting: 96 reached a call, 71 of them a refused string, 6 a Done)
 */
const PHOTO = { $file: { name: 'photo.png', type: 'image/png', size: 3 } };
const FILES: readonly unknown[] = [PHOTO, PHOTO, PHOTO, PHOTO, PHOTO, PHOTO, { $file: { name: 'notes.txt', type: 'text/plain', size: 0 } }, { $file: { name: 'blob' } }];

/** What an upload's success hands (a `FileRef`): Parse-prefixed with both optional fields, Directus's (an id, a filename), PocketBase's (a target). */
const FILE_REFS: readonly unknown[] = [
  { name: 'k3j_photo.png', url: 'https://files.example/k3j_photo.png', contentType: 'image/png', size: 3 },
  { name: '6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b', url: 'https://directus.example/assets/6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b', id: '6f1c0a52-1b6e-4c1e-9a2b-1d2c3e4f5a6b', filename: 'photo.png' },
  { name: 'photo_g235k8arvj.png', url: 'https://pb.example/api/files/notes/r1/photo_g235k8arvj.png', target: { kind: 'record', collection: 'notes', recordId: 'r1', field: 'attachment' } }
];

type UploadState = Presses & {
  file: unknown;
  private: unknown;
  /** P121-TWO001-MEMBERSPHOTO: `_internal.readers` */
  readers: unknown;
  /** P121-TWO008-UPLOADSHRINK: `_internal.shrinkTo` / `photoQuality` */
  shrinkTo: unknown;
  photoQuality: unknown;
  bucket: unknown;
  path: unknown;
  collection: unknown;
  recordId: unknown;
  field: unknown;
  /** `_internal.cloudFile` (:209) */
  cloudFile: StoredFile | undefined;
  /** v3 (row C52): the name of the file each call sent, by the spec's call id — the closure's `file` (:174) */
  callNames: Readonly<Record<string, string | undefined>>;
  /** `_internal.progressTotal` / `progressLoaded` (:188-189) — never written by the adapter the world plays */
  progressTotal: number | undefined;
  progressLoaded: number | undefined;
};

/** :366-383 `fileTarget` — the File Location as one value; a partly filled group is none */
function fileTarget(s: Readonly<UploadState>): Record<string, unknown> | undefined {
  const { bucket, path, collection, recordId, field, file } = s;
  if (bucket) return { kind: 'bucket', bucket, path: path || (file as { name?: unknown } | undefined)?.name || '' };
  if (collection && field) return recordId ? { kind: 'record', collection, field, recordId } : { kind: 'record', collection, field };
  return undefined;
}

export const UploadFile = defineNode({
  type: 'Upload File',
  // v2 (P109 ISL-030, row C51 ruled "Send the real status"): Error Status Code is the HTTP status (never a Parse code) and
  // Error always a sentence; v1 read `code || status || 0` and put a message-less envelope on Error.
  // v3 (P109 ISL-030, row C52 ruled "Keep the real name"): the Cloud File keeps the name it was uploaded as (the backend's
  // `filename`, else the sent file's name); v2's dropped `filename` and knew only the stored name.
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/uploadfile.ts; noodl-runtime api/cloudstore.js, api/cloudfile.ts',
  needs: ['backend'],
  worldPool: { backends: [...pool('uploadFile', FILE_REFS[0]), ...pool('uploadFile', FILE_REFS[1]).slice(0, 1), ...pool('uploadFile', FILE_REFS[2]).slice(2, 3)] },
  state: {
    file: undefined,
    private: undefined,
    readers: undefined,
    shrinkTo: undefined,
    photoQuality: undefined,
    bucket: undefined,
    path: undefined,
    collection: undefined,
    recordId: undefined,
    field: undefined,
    backendId: undefined,
    cloudFile: undefined,
    callNames: {},
    error: undefined,
    errorStatus: undefined,
    progressTotal: undefined,
    progressLoaded: undefined,
    presses: 0,
    calls: {},
    nextCall: 1
  } as UploadState,
  // :240-243 — no Unchanged
  outcomes: ['done', 'failure'],
  inputs: {
    // :69-77
    file: { type: '*', coerce: 'none', displayName: 'File', group: 'General', description: 'The file to upload, as an Open File Picker node produces it', examples: FILES },
    // :84-93
    private: {
      type: 'boolean',
      coerce: 'none',
      default: false,
      displayName: 'Private',
      group: 'General',
      description: 'Restricts the stored file to whoever uploaded it, so reading it later needs a Sign File URL node',
      examples: [true, false]
    },
    // P121-TWO001-MEMBERSPHOTO — handed to the store with Private; the backend reads it (files.ts)
    readers: {
      type: 'string',
      coerce: 'none',
      displayName: 'Readers',
      group: 'General',
      description:
        'Roles that may read the file as well as whoever uploaded it, such as role:member, separated by commas; setting it makes the file private. NodeGX backends only',
      examples: ['role:member, role:admin', '']
    },
    // P121-TWO008-UPLOADSHRINK — the Shrink Photos group. The canvas step (shrinkphoto.ts) is the browser's: this world
    // has no decoder, so a photo goes as it was picked, which is what the runtime does when the browser cannot read it.
    shrinkTo: {
      type: 'number',
      coerce: 'none',
      default: 0,
      displayName: 'Shrink To',
      group: 'Shrink Photos',
      description: 'Makes a photo smaller in the browser before sending it, so its longer side is at most this many pixels; 0 sends every file as picked',
      examples: [0, 1600]
    },
    photoQuality: {
      type: 'number',
      coerce: 'none',
      default: 80,
      displayName: 'Photo Quality',
      group: 'Shrink Photos',
      description: 'How much detail a shrunk JPEG or WebP keeps, from 1 to 100; PNG keeps every pixel and its transparency, GIF and SVG are never shrunk',
      examples: [80, 50]
    },
    // :111-158
    bucket: {
      ...stringInput('Bucket (Supabase)', 'Supabase Storage bucket to upload into. Supabase only; there is no default, and a bucket that does not exist fails with an error that does not say so', ['avatars', '']),
      group: 'File Location'
    },
    path: { ...stringInput('Path (Supabase)', "Object path inside the bucket, such as avatars/me.png. Supabase only. Leave blank to use the file's own name", ['me/photo.png', '']), group: 'File Location' },
    collection: { ...stringInput('Collection (PocketBase)', 'PocketBase collection holding the record the file attaches to. PocketBase only', ['notes', '']), group: 'File Location' },
    recordId: {
      ...stringInput('Record ID (PocketBase)', 'Existing record to attach the file to. PocketBase only. Leave blank to create a new record as part of the upload', ['r1', '']),
      group: 'File Location'
    },
    field: { ...stringInput('Field (PocketBase)', 'The file-typed field on that record. PocketBase only', ['attachment', '']), group: 'File Location' },
    // :159-218
    upload: { type: 'signal', outcome: true, displayName: 'Upload', group: 'Actions', description: 'Starts uploading File, and fails straight away when no file has been set' }
  },
  outputs: {
    // :221-229
    cloudFile: { type: 'cloudfile', displayName: 'Cloud File', group: 'General', description: 'The stored file, for wiring into a record property or a Cloud File node', from: (s) => s.cloudFile },
    // :244-252
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last upload failed; empty until one does', from: (s) => s.error },
    // :253-261
    errorStatus: { type: 'number', displayName: 'Error Status Code', group: 'Error', description: 'HTTP status the backend refused with, or 0 when the request never left the app', from: (s) => s.errorStatus },
    // :262-267 — never fires here (PROGRESS above)
    progressChanged: { type: 'signal', displayName: 'Progress Changed', group: 'Events', description: 'Fires each time the byte counts below move during an upload' },
    // :268-295
    progressTotalBytes: { type: 'number', displayName: 'Total Bytes', group: 'Progress', description: 'Size of the file being uploaded, in bytes', from: (s) => s.progressTotal },
    progressLoadedBytes: { type: 'number', displayName: 'Uploaded Bytes', group: 'Progress', description: 'How much of the file has been sent so far, in bytes', from: (s) => s.progressLoaded },
    progressLoadedPercent: {
      type: 'number',
      displayName: 'Uploaded Percent',
      group: 'Progress',
      description: 'How much of the file has been sent so far, from 0 to 100',
      from: (s) => (!s.progressTotal ? 0 : ((s.progressLoaded ?? 0) / s.progressTotal) * 100)
    }
  }
}).on(
  {
    file: (_s, v) => ({ says: 'always: held as handed; read when the next Upload goes — an upload already running keeps the file it was sent with', set: { file: v }, send: [] }),
    private: (_s, v) => ({ says: 'always: held as handed; read when the next Upload goes', set: { private: v }, send: [] }),
    readers: (_s, v) => ({
      says: 'always: held as handed; read when the next Upload goes — set, those roles may read the file as well as whoever uploaded it, and the file is private',
      set: { readers: v },
      send: []
    }),
    shrinkTo: (_s, v) => ({
      says: 'always: held as handed; read when the next Upload goes — above 0, a photo (not a GIF or an SVG) is drawn smaller in the browser first, its longer side at most this many pixels, and the smaller file is what goes; it goes as picked when it is already that small, when the smaller one would weigh more, or when the browser cannot read it',
      set: { shrinkTo: v },
      send: []
    }),
    photoQuality: (_s, v) => ({
      says: 'always: held as handed; read when the next Upload goes, and only when a photo is shrunk — 1 to 100 for a JPEG or WebP, anything else is 80; a PNG keeps every pixel',
      set: { photoQuality: v },
      send: []
    }),
    bucket: (_s, v) => ({ says: "always: held as handed; read when the next Upload goes — set, the file goes to this bucket at Path (or under the file's own name)", set: { bucket: v }, send: [] }),
    path: (_s, v) => ({ says: 'always: held as handed; read when the next Upload goes, and only with a Bucket', set: { path: v }, send: [] }),
    collection: (_s, v) => ({ says: 'always: held as handed; read when the next Upload goes — with Field set and no Bucket, the file attaches to a record of this collection', set: { collection: v }, send: [] }),
    recordId: (_s, v) => ({ says: 'always: held as handed; read when the next Upload goes, and only with Collection and Field — blank attaches the file to a new record', set: { recordId: v }, send: [] }),
    field: (_s, v) => ({ says: 'always: held as handed; read when the next Upload goes, and only with Collection — a half-filled group is no location at all', set: { field: v }, send: [] }),
    // :170-172 — a token now, the work at the frame end
    upload: (s) => ({
      says: "always: its own upload at the frame's end — two presses are two uploads — with File, Private, Readers and the File Location held then: no File, or a Backend the project does not have, is Error, Error Status Code 0 and Failure at once; otherwise the backend answers with Cloud File then Done, or Error, Error Status Code and Failure",
      set: { presses: s.presses + 1 },
      send: [],
      outcome: 'pending'
    })
  },
  {
    derived: {
      // NSP-020 s84 — the Backend picker the editor draws with two or more backends (record-ports.ts `recordBackendPickerPorts`, P107-S80-BACKENDPICKER)
      inputs: (_params, context) => backendPickerPort(context),
      needs: ['backends'],
      discover: (port) => (port === 'backendId' ? backendPort() : undefined),
      candidates: ['backendId'],
      on: (_s, _port, v) => ({ set: { backendId: v }, send: [] })
    },
    // :172-216
    afterInputs: (s, _i, w) => {
      const r = frame(s, w, !!s.file, 'uploadFile', () => ({ file: s.file, private: s.private, readers: s.readers, target: fileTarget(s) }), UPLOAD_ERROR_CODE, 'upload');
      if (!('backend' in r) || !r.backend) return r;
      // v3 (C52): each call remembers the name of the file it sent
      const f = s.file as { name?: unknown } | undefined;
      const sent = f && typeof f.name === 'string' ? f.name : undefined;
      const callNames: Record<string, string | undefined> = { ...s.callNames };
      for (const c of r.backend) callNames[c.id] = sent;
      return { ...r, set: { ...r.set, callNames } };
    },
    world: {
      // :202-214 — a stored file made from the FileRef, then Done; a failure through `setError`. v3 (row C52 ruled "Keep the
      // real name"): it keeps the name it was uploaded as — the backend's `filename` when it reports one, else the call's file's
      backend: (s, _i, answer) =>
        answered(s, answer, 'upload', UPLOAD_ERROR_CODE, (ok) => {
          const ref = ok as ConstructorParameters<typeof StoredFile>[0];
          const filename = ref.filename !== undefined ? ref.filename : s.callNames[answer.id];
          return { set: { cloudFile: new StoredFile(filename !== undefined ? { ...ref, filename } : ref) }, send: ['cloudFile' as const] };
        })
    }
  }
);

type SignState = Presses & {
  /** `_internal.cloudFile` (:122-123) */
  file: StoredFileLike | undefined;
  url: unknown;
  kind: unknown;
  expiresAt: unknown;
  ttlSeconds: unknown;
};

/** What a sign's success hands (a `SignedFileUrl`): ours and Supabase's (signed), Directus's and PocketBase's (token), a public one. */
const SIGNED: readonly unknown[] = [
  { url: 'https://files.example/k3j_photo.png?exp=1767225600&sig=ab12', kind: 'signed', expiresAt: '2026-01-01T00:00:00.000Z', ttlSeconds: 300 },
  { url: 'https://directus.example/assets/6f1c?access_token=eyJ', kind: 'token', expiresAt: '2026-01-01T00:15:00.000Z', ttlSeconds: 900 },
  { url: 'https://files.example/plain.png', kind: 'public' }
];

export const SignFileUrl = defineNode({
  type: 'Sign File URL',
  // v2 (P109 ISL-030, row C51 ruled "Send the real status"): as Upload File's v2 — the HTTP status, and always a sentence.
  // v3 (P109 ISL-030, row D26 ruled "Clear them"): a link with no expiry (a public one) sends blank Expires At and an empty
  // TTL; v2 held them undefined, never sent, and a wire kept the previous link's expiry.
  version: 3,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/signfileurl.ts; api/cloudstore.js, api/cloudfile.ts',
  needs: ['backend'],
  worldPool: { backends: [...pool('signFileUrl', SIGNED[0]), ...pool('signFileUrl', SIGNED[1]).slice(0, 1), ...pool('signFileUrl', SIGNED[2]).slice(2, 3)] },
  state: { file: undefined, url: undefined, kind: undefined, expiresAt: undefined, ttlSeconds: undefined, backendId: undefined, error: undefined, errorStatus: undefined, presses: 0, calls: {}, nextCall: 1 } as SignState,
  // :251-255 — no Unchanged
  outcomes: ['done', 'failure'],
  inputs: {
    // :115-125
    file: {
      type: 'cloudfile',
      coerce: 'none',
      displayName: 'File',
      group: 'General',
      description: 'Stored file to mint a link for, as an Upload File node or a record property produces it; any other value leaves the previous file in place',
      examples: STORED_FILES
    },
    // :126-172
    sign: { type: 'signal', outcome: true, displayName: 'Sign', group: 'Actions', description: 'Mints a fresh link for File, refused for a caller who could not read the file directly' }
  },
  outputs: {
    // :175-184
    url: {
      type: 'string',
      displayName: 'Signed URL',
      group: 'General',
      description: 'Usable link to the file; empty until Sign has succeeded once. Read URL Kind before sharing it — on some backends this link carries your own credential rather than a signature',
      from: (s) => s.url
    },
    // :200-209
    urlKind: {
      type: 'string',
      displayName: 'URL Kind',
      group: 'General',
      description: 'How this link is protected: "signed" — it carries its own proof and stops working at Expires At; "token" — it carries your own sign-in credential; "public" — it needs nothing and never expires',
      from: (s) => s.kind
    },
    // :210-223 — undefined until a sign succeeded once; false only for a token link
    isShareable: {
      type: 'boolean',
      displayName: 'Safe To Share',
      group: 'General',
      description: 'False when the link only works because it carries your own credential — sending it to someone else either fails for them or hands them your session. True for a signed or public link',
      from: (s) => (s.kind === undefined ? undefined : s.kind !== 'token')
    },
    // :224-233
    expiresAt: {
      type: 'string',
      displayName: 'Expires At',
      group: 'General',
      description: 'Moment the link stops working, as an ISO 8601 timestamp. Empty for a "public" link, which never expires; for a "token" link on Directus this is the session\'s expiry rather than the link\'s',
      from: (s) => s.expiresAt
    },
    // :234-242
    ttlSeconds: { type: 'number', displayName: 'TTL (Seconds)', group: 'General', description: 'How long Signed URL stays valid from the moment it was minted, in seconds', from: (s) => s.ttlSeconds },
    // :256-264
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last signing attempt failed; empty until one does', from: (s) => s.error },
    // :265-273
    errorStatus: { type: 'number', displayName: 'Error Status Code', group: 'Error', description: 'HTTP status the backend refused with, or 0 when the request never left the app', from: (s) => s.errorStatus }
  }
}).on(
  {
    // :121-124 — a stored file only
    file: (_s, v) =>
      isStoredFile(v)
        ? { says: 'a stored file: held; read when the next Sign goes', set: { file: v }, send: [] }
        : { says: 'anything else (nothing, text, a plain object): ignored — the file held before stays', send: [] },
    // :135-137
    sign: (s) => ({
      says: "always: its own call at the frame's end — two presses are two calls — for the File held then: no File, or a Backend the project does not have, is Error, Error Status Code 0 and Failure at once; otherwise the backend answers with Signed URL, URL Kind, Safe To Share, Expires At and TTL (Seconds) then Done, or Error, Error Status Code and Failure",
      set: { presses: s.presses + 1 },
      send: [],
      outcome: 'pending'
    })
  },
  {
    derived: {
      // NSP-020 s84 — the Backend picker the editor draws with two or more backends (record-ports.ts `recordBackendPickerPorts`, P107-S80-BACKENDPICKER)
      inputs: (_params, context) => backendPickerPort(context),
      needs: ['backends'],
      discover: (port) => (port === 'backendId' ? backendPort() : undefined),
      candidates: ['backendId'],
      on: (_s, _port, v) => ({ set: { backendId: v }, send: [] })
    },
    // :137-170
    afterInputs: (s, _i, w) => frame(s, w, !!s.file, 'signFileUrl', () => ({ name: s.file!.getName(), target: s.file!.getTarget() }), SIGN_ERROR_CODE, 'sign'),
    world: {
      // :155-168 — the five values, then Done; a failure through `setError`
      backend: (s, _i, answer) =>
        answered(s, answer, 'sign', SIGN_ERROR_CODE, (ok) => {
          const r = (ok ?? {}) as { url?: unknown; kind?: unknown; expiresAt?: unknown; ttlSeconds?: unknown };
          // v3 (row D26 ruled "Clear them"): a link with no expiry sends blank Expires At and an empty TTL — v2 held undefined, never sent
          return { set: { url: r.url, kind: r.kind, expiresAt: r.expiresAt !== undefined ? r.expiresAt : '', ttlSeconds: r.ttlSeconds !== undefined ? r.ttlSeconds : null }, send: ['url' as const, 'urlKind' as const, 'isShareable' as const, 'expiresAt' as const, 'ttlSeconds' as const] };
        })
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
