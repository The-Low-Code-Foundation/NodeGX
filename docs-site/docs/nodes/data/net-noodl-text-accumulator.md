---
title: "Text Accumulator"
---
Text Accumulator: collects stream fragments into growing text, and splits complete messages off a delimiter.

Each `add` appends the current `chunk` to a buffer. With an empty delimiter nothing is ever split and `accumulated` is simply the text so far — the mode a token stream wants. With a delimiter (newline by default) every complete piece moves to `messages` and only the unfinished tail stays in `accumulated`, so a message split across chunk boundaries reassembles correctly. Both stores are bounded: `maxLength` caps the pending buffer and `maxMessages` caps the retained list, dropping the oldest first and reporting the loss on `droppedCharacters` / `droppedMessages` plus an `overflowed` signal rather than growing without limit in a long-lived session. An empty chunk appends nothing, so a stream's keep-alive frames do not fire `changed` — the Add reports `unchanged` rather than nothing at all.

## When to use it

Assembling anything that arrives in pieces: AI tokens into a displayable answer, log lines out of a chunked feed, NDJSON lines before parsing them. Pair it with Server-Sent Events or any node that emits fragments. Not needed when each event is already a whole value — wire that straight to its consumer.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.TextAccumulator` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `chunk` | String | — | The next fragment of text to append; wire a stream Text output, not its Data output, which is JSON-parsed and is usually an object |
| `delimiter` | String | `
` | Message boundary to split complete messages off; leave empty to accumulate everything, which is what a token stream wants |
| `maxLength` | Number | `1048576` | Cap on the pending buffer in characters; overflow drops the oldest and is counted on Dropped Characters |
| `maxMessages` | Number | `1000` | Cap on retained complete messages, oldest dropped first; 0 keeps them all, which grows forever |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `add` | Signal | — | Appends the current Chunk, which is retained between pulses, so a second Add with no new chunk appends it again |
| `clear` | Signal | — | Empties the buffer, the messages and both dropped counts |

### What each input does

**Chunk** (`chunk`)

- text (a number, boolean or bigint as its text; nothing as empty) while an Error stands: kept for the next Add, and the Error is cleared → Failure stays silent
- text (a number, boolean or bigint as its text; nothing as empty): kept for the next Add, and retained after it → Failure stays silent
- an object, array or Date again, the same refusal already on Error: the chunk is emptied and nothing more is said → Failure stays silent
- an object, array or Date: refused before any Add — the chunk is emptied and Error names what arrived → Failure

**Delimiter** (`delimiter`)

- always: read at the next Add — where complete messages are split off (nothing, or empty: never split)

**Max Length (characters)** (`maxLength`)

- always: read at the next Add — the cap the oldest characters are dropped past (not above 0: no cap); a buffer already over it is trimmed by the next Add

**Max Messages** (`maxMessages`)

- always: read at the next Add that completes a message — the cap the oldest messages are dropped past (not at least 0: 0, keep all)

**Add** (`add`)

- an empty Chunk (a keep-alive, or one that was refused): nothing is appended → Unchanged; Overflowed, Changed, Message Received stay silent
- the chunk is appended, past Max Length the oldest characters go (counted on Dropped Characters), and no Delimiter completes a message: Accumulated grows → Overflowed, Changed, Done; Message Received stays silent
- the chunk is appended and no Delimiter completes a message: Accumulated grows → Changed, Done; Overflowed, Message Received stay silent
- the chunk is appended, past Max Length the oldest characters go (counted on Dropped Characters), a Delimiter completes a message, and past Max Messages the oldest messages go (counted on Dropped Messages): Overflowed twice, the last complete one is Last Message, the rest stays in Accumulated → Overflowed, Overflowed, Message Received, Changed, Done
- the chunk is appended, a Delimiter completes a message, and past Max Messages the oldest messages go (counted on Dropped Messages): the last complete one is Last Message, the rest stays in Accumulated → Overflowed, Message Received, Changed, Done
- the chunk is appended, past Max Length the oldest characters go (counted on Dropped Characters), and a Delimiter completes a message: it joins Messages, the last complete one is Last Message, the rest stays in Accumulated → Overflowed, Message Received, Changed, Done
- the chunk is appended and a Delimiter completes a message: it joins Messages, the last complete one is Last Message, the rest stays in Accumulated — Message Received once however many completed → Message Received, Changed, Done; Overflowed stays silent

**Clear** (`clear`)

- anything accumulated, kept, dropped or refused: the buffer, Messages, Last Message, both dropped counts and the Error are emptied — not the Chunk retained → Cleared, Done
- nothing held: the same empty values are sent again → Cleared, Unchanged

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `accumulated` | String | — | Everything appended since the last Clear that has not yet been split off as a complete message |
| `byteCount` | Number | — | Length of Accumulated in UTF-8 bytes, which differs from Character Count for anything outside ASCII |
| `characterCount` | Number | — | Length of Accumulated in characters |
| `droppedCharacters` | Number | — | How many characters Max Length has discarded from the front since the last Clear |
| `droppedMessages` | Number | — | How many complete messages Max Messages has discarded since the last Clear |
| `lastMessage` | String | — | The most recent complete message, which is what a chat surface usually wants |
| `messageCount` | Number | — | How many complete messages are being retained, which is not how many have arrived |
| `messages` | Array | — | Complete messages split off the delimiter, oldest first, capped at Max Messages |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires whenever an Add appended something, which is the cue to redraw |
| `cleared` | Signal | — | Fires once the buffer and the messages have been emptied |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once an Add or Clear you triggered has changed the buffer |
| `messageReceived` | Signal | — | Fires once per Add that completed at least one message, not once per message |
| `overflowed` | Signal | — | Fires when Max Length or Max Messages has just discarded something |
| `unchanged` | Signal | — | Fires when an Add had no text to append — an empty chunk, or one already refused — or a Clear found nothing to discard |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last chunk was refused; blank once a chunk of text arrives |
| `failure` | Signal | — | Fires when a chunk was not text and nothing was appended, which usually means the wrong stream output is wired |

## Patterns

- Server-Sent Events `text` → `chunk`, `onMessage` → `add`, delimiter empty, `accumulated` → Text `text`: an answer that types itself out.
- Delimiter `\n` with `messages` → For Each renders a growing log without re-parsing the whole buffer each time.
- The stream's `onOpen` → `clear` resets the accumulator when a new response starts.

## Watch out for

- Wiring a stream's `data` output into `chunk`. `data` is JSON-parsed and is an object for an OpenAI-style payload; wire `text` (with the stream's `textPath` set) or a Function node that picks out the string field.
- Leaving `maxMessages` at 0 in a session that runs for hours — the array grows until the tab does.
- Wiring `add` from a signal that fires before `chunk` is set (a Function's own output, say) — the last chunk gets appended twice and the newest not at all.

## Examples

**Agent chat: stream an AI answer token by token**

The core agentic-UI wiring. Server-Sent Events POSTs the prompt with an Authorization header — which needs the Fetch transport, since EventSource can neither POST nor set headers — and each streamed token lands on `text`. `text` and not `data`: `data` is JSON-parsed, so for an OpenAI-compatible endpoint it is an object, and `textPath` here (`choices.0.delta.content`) is what turns that envelope into the token. For an endpoint that streams bare text, leave `textPath` blank and `text` is the payload as sent. Text Accumulator collects the tokens with an empty delimiter, so `accumulated` is the answer as it is being written, and `changed` repaints the Text node. `connectionState` drives a status label, so a reconnection is visible rather than looking like a stalled answer, and `onOpen` clears the accumulator when a new response starts.

## Related nodes

[Server-Sent Events](./net-noodl-sse.md), [JSON Stream Parser](./net-noodl-jsonstream-parser.md), [Stream Buffer](./net-noodl-stream-buffer.md), [String Format](../string-manipulation/string-format.md), [Substring](../string-manipulation/substring.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "pendingChunk": "",
  "buffer": "",
  "messages": [],
  "lastMessage": "",
  "delimiter": "\n",
  "maxLength": 1048576,
  "maxMessages": 1000,
  "droppedCharacters": 0,
  "droppedMessages": 0,
  "error": ""
}
```

### How actions report back

Each time Add or Clear is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/text-accumulator.ts"
/**
 * Text Accumulator (`net.noodl.TextAccumulator`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/agent/text-accumulator.ts` and `stream-parsers.ts`
 * on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Chunk` is kept and RETAINED between Adds (:176-186): text as
 * is; a number, boolean or bigint as its text; `null` / `undefined` as `''` — each of those clears
 * a standing `Error` (:115-133, :376-380). Anything else (an object, an array, a Date …) is
 * REFUSED at arrival, before any Add: the chunk becomes `''`, `Error` names what arrived
 * (:45-58), and `Failure` pulses there and then — a plain pulse, no invocation behind it (:343-365);
 * the same sentence again while it stands pulses nothing (:345, :357). `Add` with an empty chunk —
 * a keep-alive, or a refused one — is `unchanged` (:390-397). Otherwise the chunk is appended, the
 * buffer capped at `Max Length` from the FRONT (0 = no cap; `Dropped Characters`, `Overflowed`,
 * :402-408), split on `Delimiter` (empty = never split, :410-411); complete messages join
 * `Messages` (capped at `Max Messages` from the front — 0 keeps all; `Dropped Messages`,
 * `Overflowed` again, :413-429), the last is `Last Message`; then `Message Received` (once per Add,
 * when any completed) and `Changed`, and `done` (:431-442). `Clear` empties the buffer, the
 * messages, Last Message, both dropped counts and the error — not the retained chunk — pulses
 * `Cleared`, and is `done` when anything was there, else `unchanged` (:445-471).
 */

import { defineNode } from '../spec';
import { splitDelimited, truncateHead, utf8ByteLength } from './stream-parsers';

/** :36 */
export const CHUNK_ERROR_CODE = 'text-accumulator/chunk-not-text';

/** :45-58 */
export function describeBadChunk(value: unknown): string {
  const shape = Array.isArray(value) ? 'an array' : value instanceof Date ? 'a Date' : typeof value === 'object' ? 'an object' : `a ${typeof value}`;
  return (
    `Chunk must be text, but ${shape} arrived, so nothing was appended. ` +
    "A stream's Data output is JSON-parsed and is an object for a payload like " +
    '{"delta":"Hi"} — wire the stream\'s Text output instead (set its Text Path for a JSON ' +
    'payload), or a Function node that picks the string field out of Data.'
  );
}

type State = {
  pendingChunk: string;
  buffer: string;
  messages: readonly string[];
  lastMessage: string;
  delimiter: string;
  maxLength: number;
  maxMessages: number;
  droppedCharacters: number;
  droppedMessages: number;
  error: string;
}

type Port = 'accumulated' | 'messages' | 'lastMessage' | 'messageCount' | 'characterCount' | 'byteCount' | 'droppedCharacters' | 'droppedMessages' | 'error';

export const TextAccumulator = defineNode({
  type: 'net.noodl.TextAccumulator',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/agent/text-accumulator.ts; stream-parsers.ts',

  // :69-81 initialize
  state: { pendingChunk: '', buffer: '', messages: [], lastMessage: '', delimiter: '\n', maxLength: 1024 * 1024, maxMessages: 1000, droppedCharacters: 0, droppedMessages: 0, error: '' } as State,
  outcomes: ['done', 'unchanged', 'failure'], // :327-332

  inputs: {
    // :99-134
    chunk: {
      type: 'string',
      coerce: 'none',
      displayName: 'Chunk',
      group: 'Data',
      description: 'The next fragment of text to append; wire a stream Text output, not its Data output, which is JSON-parsed and is usually an object',
      examples: ['Hel', 'lo\nWor', 'ld\n', 'a\nb\nc\n', '', 'é😀', 7, true, { delta: 'Hi' }, ['x'], 'line;', '\uD800']
    },
    // :136-148
    delimiter: {
      type: 'string',
      default: '\n',
      coerce: 'none',
      displayName: 'Delimiter',
      group: 'Config',
      description: 'Message boundary to split complete messages off; leave empty to accumulate everything, which is what a token stream wants',
      examples: ['\n', '', ';', '\n\n']
    },
    // :150-161
    maxLength: { type: 'number', default: 1024 * 1024, coerce: 'none', displayName: 'Max Length (characters)', group: 'Config', description: 'Cap on the pending buffer in characters; overflow drops the oldest and is counted on Dropped Characters', examples: [0, 3, 8, -2] },
    // :163-174
    maxMessages: { type: 'number', default: 1000, coerce: 'none', displayName: 'Max Messages', group: 'Config', description: 'Cap on retained complete messages, oldest dropped first; 0 keeps them all, which grows forever', examples: [0, 1, 2, -1] },
    // :176-186
    add: { type: 'signal', outcome: true, displayName: 'Add', group: 'Actions', description: 'Appends the current Chunk, which is retained between pulses, so a second Add with no new chunk appends it again' },
    // :188-195
    clear: { type: 'signal', outcome: true, displayName: 'Clear', group: 'Actions', description: 'Empties the buffer, the messages and both dropped counts' }
  },

  outputs: {
    accumulated: { type: 'string', from: (s) => s.buffer, displayName: 'Accumulated', group: 'Data', description: 'Everything appended since the last Clear that has not yet been split off as a complete message' },
    messages: { type: 'array', from: (s) => s.messages, displayName: 'Messages', group: 'Data', description: 'Complete messages split off the delimiter, oldest first, capped at Max Messages' },
    lastMessage: { type: 'string', from: (s) => s.lastMessage, displayName: 'Last Message', group: 'Data', description: 'The most recent complete message, which is what a chat surface usually wants' },
    messageCount: { type: 'number', from: (s) => s.messages.length, displayName: 'Message Count', group: 'Status', description: 'How many complete messages are being retained, which is not how many have arrived' },
    characterCount: { type: 'number', from: (s) => s.buffer.length, displayName: 'Character Count', group: 'Status', description: 'Length of Accumulated in characters' },
    byteCount: {
      type: 'number',
      from: (s) => utf8ByteLength(s.buffer),
      displayName: 'Byte Count (UTF-8)',
      group: 'Status',
      description: 'Length of Accumulated in UTF-8 bytes, which differs from Character Count for anything outside ASCII'
    },
    droppedCharacters: { type: 'number', from: (s) => s.droppedCharacters, displayName: 'Dropped Characters', group: 'Status', description: 'How many characters Max Length has discarded from the front since the last Clear' },
    droppedMessages: { type: 'number', from: (s) => s.droppedMessages, displayName: 'Dropped Messages', group: 'Status', description: 'How many complete messages Max Messages has discarded since the last Clear' },
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Status', description: 'Why the last chunk was refused; blank once a chunk of text arrives' },
    messageReceived: { type: 'signal', displayName: 'Message Received', group: 'Events', description: 'Fires once per Add that completed at least one message, not once per message' },
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires whenever an Add appended something, which is the cue to redraw' },
    cleared: { type: 'signal', displayName: 'Cleared', group: 'Events', description: 'Fires once the buffer and the messages have been emptied' },
    overflowed: { type: 'signal', displayName: 'Overflowed', group: 'Events', description: 'Fires when Max Length or Max Messages has just discarded something' }
  }
}).on({
  // :105-134
  chunk: (s, v) => {
    const kind = typeof v;
    let text: string | undefined;
    if (v === undefined || v === null) text = '';
    else if (kind === 'string') text = v as string;
    else if (kind === 'number' || kind === 'boolean' || kind === 'bigint') text = String(v);
    if (text !== undefined) {
      // :132 → :376-380 clearChunkError
      if (s.error) return { says: 'text (a number, boolean or bigint as its text; nothing as empty) while an Error stands: kept for the next Add, and the Error is cleared', set: { pendingChunk: text, error: '' }, send: ['error'] };
      return { says: 'text (a number, boolean or bigint as its text; nothing as empty): kept for the next Add, and retained after it', set: { pendingChunk: text }, send: [] };
    }
    // :127-129 → :343-365 reportChunkError, no token
    const message = describeBadChunk(v);
    if (s.error === message) return { says: 'an object, array or Date again, the same refusal already on Error: the chunk is emptied and nothing more is said', set: { pendingChunk: '' }, send: [] }; // :345, :357 — a repeat says nothing
    return { says: 'an object, array or Date: refused before any Add — the chunk is emptied and Error names what arrived', set: { pendingChunk: '', error: message }, send: ['error'], emit: ['failure'] }; // :347-348, :362-365
  },
  delimiter: (_s, v) => ({ says: 'always: read at the next Add — where complete messages are split off (nothing, or empty: never split)', set: { delimiter: v === undefined || v === null ? '' : String(v) }, send: [] }), // :146
  maxLength: (_s, v) => ({ says: 'always: read at the next Add — the cap the oldest characters are dropped past (not above 0: no cap); a buffer already over it is trimmed by the next Add', set: { maxLength: Number(v) > 0 ? Number(v) : 0 }, send: [] }), // :159
  maxMessages: (_s, v) => ({ says: 'always: read at the next Add that completes a message — the cap the oldest messages are dropped past (not at least 0: 0, keep all)', set: { maxMessages: Number(v) >= 0 ? Number(v) : 0 }, send: [] }), // :172

  // :181-185 → :388-443 (NSP-018: one literal arm per case — characters dropped or not, then no message, messages, messages with some dropped)
  add: (s) => {
    if (s.pendingChunk === '') return { says: 'an empty Chunk (a keep-alive, or one that was refused): nothing is appended', send: [], outcome: 'unchanged' }; // :390-397

    const capped = truncateHead(s.buffer + s.pendingChunk, s.maxLength); // :400-403
    const droppedCharacters = s.droppedCharacters + capped.dropped; // :404-408
    const split = splitDelimited(capped.text, s.delimiter); // :410-411
    const buffer = split.rest;
    if (split.messages.length === 0) {
      if (capped.dropped > 0) return { says: 'the chunk is appended, past Max Length the oldest characters go (counted on Dropped Characters), and no Delimiter completes a message: Accumulated grows', set: { droppedCharacters, buffer }, send: ['droppedCharacters', 'accumulated', 'characterCount', 'byteCount'], emit: ['overflowed', 'changed'], outcome: 'done' };
      return { says: 'the chunk is appended and no Delimiter completes a message: Accumulated grows', set: { buffer }, send: ['accumulated', 'characterCount', 'byteCount'], emit: ['changed'], outcome: 'done' };
    }
    const messages = s.messages.concat(split.messages); // :414-415
    const lastMessage = split.messages[split.messages.length - 1];
    if (s.maxMessages > 0 && messages.length > s.maxMessages) {
      const dropped = messages.length - s.maxMessages; // :417-424
      const kept = messages.slice(dropped);
      const droppedMessages = s.droppedMessages + dropped;
      if (capped.dropped > 0) return { says: 'the chunk is appended, past Max Length the oldest characters go (counted on Dropped Characters), a Delimiter completes a message, and past Max Messages the oldest messages go (counted on Dropped Messages): Overflowed twice, the last complete one is Last Message, the rest stays in Accumulated', set: { droppedCharacters, buffer, lastMessage, droppedMessages, messages: kept }, send: ['droppedCharacters', 'droppedMessages', 'messages', 'lastMessage', 'messageCount', 'accumulated', 'characterCount', 'byteCount'], emit: ['overflowed', 'overflowed', 'messageReceived', 'changed'], outcome: 'done' };
      return { says: 'the chunk is appended, a Delimiter completes a message, and past Max Messages the oldest messages go (counted on Dropped Messages): the last complete one is Last Message, the rest stays in Accumulated', set: { buffer, lastMessage, droppedMessages, messages: kept }, send: ['droppedMessages', 'messages', 'lastMessage', 'messageCount', 'accumulated', 'characterCount', 'byteCount'], emit: ['overflowed', 'messageReceived', 'changed'], outcome: 'done' };
    }
    // :426-428, :438-439
    if (capped.dropped > 0) return { says: 'the chunk is appended, past Max Length the oldest characters go (counted on Dropped Characters), and a Delimiter completes a message: it joins Messages, the last complete one is Last Message, the rest stays in Accumulated', set: { droppedCharacters, buffer, lastMessage, messages }, send: ['droppedCharacters', 'messages', 'lastMessage', 'messageCount', 'accumulated', 'characterCount', 'byteCount'], emit: ['overflowed', 'messageReceived', 'changed'], outcome: 'done' };
    return { says: 'the chunk is appended and a Delimiter completes a message: it joins Messages, the last complete one is Last Message, the rest stays in Accumulated — Message Received once however many completed', set: { buffer, lastMessage, messages }, send: ['messages', 'lastMessage', 'messageCount', 'accumulated', 'characterCount', 'byteCount'], emit: ['messageReceived', 'changed'], outcome: 'done' }; // :442
  },

  // :193 → :445-471
  clear: (s) => {
    const hadSomething = s.buffer.length > 0 || s.messages.length > 0 || s.droppedCharacters > 0 || s.droppedMessages > 0 || !!s.error; // :448-453
    const send: Port[] = s.error ? ['error'] : []; // :459 → :376-380, flagged only when one stood
    send.push('accumulated', 'messages', 'lastMessage', 'messageCount', 'characterCount', 'byteCount', 'droppedCharacters', 'droppedMessages'); // :461-468
    const set: Partial<State> = { buffer: '', messages: [], lastMessage: '', droppedCharacters: 0, droppedMessages: 0, error: '' }; // :454-459
    if (hadSomething) return { says: 'anything accumulated, kept, dropped or refused: the buffer, Messages, Last Message, both dropped counts and the Error are emptied — not the Chunk retained', set, send, emit: ['cleared'], outcome: 'done' }; // :469-470
    return { says: 'nothing held: the same empty values are sent again', set, send, emit: ['cleared'], outcome: 'unchanged' }; // :470
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
