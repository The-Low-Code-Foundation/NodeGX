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
 *   Failure: `setError` with the contract's envelope (world.ts FILES) — Error is the envelope's `error` when it HAS one
 *   (`hasOwnProperty`, :391) and THE ENVELOPE ITSELF when it has none (an object on a string port); Error Status Code is
 *   `code || status || 0` (:393 — a Parse wire's error CODE wins over the HTTP status); then Failure with the node's code
 *   (:399-403 / :334-339). Error and Error Status Code keep the last failure across a later success (nothing clears them).
 *
 * PROGRESS (Upload File): Uploaded Percent is 0 until a total is known (:292); Total and Uploaded Bytes `undefined`
 * (never sent, C3). The adapter the world plays never reports progress (world.ts FILES), so none of the four moves and
 * Progress Changed never fires.
 *
 * NOT GRADED HERE, named:
 *   - progress on the Parse wire's XHR upload (`onUploadProgress`, :187-195) — not a world the BACKEND seam plays.
 *   - the editor's Backend picker (`updatePorts`, `setup`) and the inspector — not ports.
 *   - a failure envelope that is `undefined` or `null` (the contract allows `error()` with nothing): `setError` reads
 *     `.hasOwnProperty` on it and throws. The world always hands an envelope.
 */

import { isStoredFile, type StoredFileLike } from '../canonical';
import type { BackendAnswerEvent, InputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import { fileError, StoredFile, type BackendScript } from '../world';
import { STORED_FILES } from './cloud-file';
import { NO_BACKEND_MESSAGE } from './record-base';
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

/** :390-403 / signfileurl.ts :326-339 — the envelope's `error` when it has one, else the envelope; `code || status || 0` */
function errorOf(answer: { error: string | undefined; detail?: Record<string, unknown> }): Settled {
  const envelope = fileError(answer);
  return {
    error: Object.prototype.hasOwnProperty.call(envelope, 'error') ? envelope.error : envelope,
    errorStatus: (envelope.code as unknown) || (envelope.status as unknown) || 0
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

/** The backends a sequence plays with: at once and late, REST's refusal (a message only), the Parse wire's (a code and a status), none, silent, and a project with two. */
function pool(op: string, ok: unknown): ReadonlyArray<BackendScript> {
  return [
    { answers: [{ match: { op }, answer: { ok } }] },
    { answers: [{ match: { op }, answer: { ok } }] },
    { answers: [{ match: { op }, answer: { ok }, after: 20 }] },
    { answers: [{ match: { op }, answer: { error: 'HTTP 403: {"errors":[{"message":"You don\'t have permission to access this."}]}' } }] },
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
  bucket: unknown;
  path: unknown;
  collection: unknown;
  recordId: unknown;
  field: unknown;
  /** `_internal.cloudFile` (:209) */
  cloudFile: StoredFile | undefined;
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
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/uploadfile.ts; noodl-runtime api/cloudstore.js, api/cloudfile.ts',
  needs: ['backend'],
  worldPool: { backends: [...pool('uploadFile', FILE_REFS[0]), ...pool('uploadFile', FILE_REFS[1]).slice(0, 1), ...pool('uploadFile', FILE_REFS[2]).slice(2, 3)] },
  state: {
    file: undefined,
    private: undefined,
    bucket: undefined,
    path: undefined,
    collection: undefined,
    recordId: undefined,
    field: undefined,
    backendId: undefined,
    cloudFile: undefined,
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
    file: (_s, v) => ({ set: { file: v }, send: [] }),
    private: (_s, v) => ({ set: { private: v }, send: [] }),
    bucket: (_s, v) => ({ set: { bucket: v }, send: [] }),
    path: (_s, v) => ({ set: { path: v }, send: [] }),
    collection: (_s, v) => ({ set: { collection: v }, send: [] }),
    recordId: (_s, v) => ({ set: { recordId: v }, send: [] }),
    field: (_s, v) => ({ set: { field: v }, send: [] }),
    // :170-172 — a token now, the work at the frame end
    upload: (s) => ({ set: { presses: s.presses + 1 }, send: [], outcome: 'pending' })
  },
  {
    derived: {
      inputs: () => ({}),
      discover: (port) => (port === 'backendId' ? backendPort() : undefined),
      candidates: ['backendId'],
      on: (_s, _port, v) => ({ set: { backendId: v }, send: [] })
    },
    // :172-216
    afterInputs: (s, _i, w) => frame(s, w, !!s.file, 'uploadFile', () => ({ file: s.file, private: s.private, target: fileTarget(s) }), UPLOAD_ERROR_CODE, 'upload'),
    world: {
      // :202-214 — a stored file made from the FileRef, then Done; a failure through `setError`
      backend: (s, _i, answer) =>
        answered(s, answer, 'upload', UPLOAD_ERROR_CODE, (ok) => ({ set: { cloudFile: new StoredFile(ok as ConstructorParameters<typeof StoredFile>[0]) }, send: ['cloudFile' as const] }))
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
  version: 1,
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
    file: (_s, v) => (isStoredFile(v) ? { set: { file: v }, send: [] } : { send: [] }),
    // :135-137
    sign: (s) => ({ set: { presses: s.presses + 1 }, send: [], outcome: 'pending' })
  },
  {
    derived: {
      inputs: () => ({}),
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
          return { set: { url: r.url, kind: r.kind, expiresAt: r.expiresAt, ttlSeconds: r.ttlSeconds }, send: ['url' as const, 'urlKind' as const, 'isShareable' as const, 'expiresAt' as const, 'ttlSeconds' as const] };
        })
    }
  }
);
