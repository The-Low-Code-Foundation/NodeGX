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
type Pulse = 'overflowed' | 'messageReceived' | 'changed';

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
      return s.error ? { set: { pendingChunk: text, error: '' }, send: ['error'] } : { set: { pendingChunk: text }, send: [] };
    }
    // :127-129 → :343-365 reportChunkError, no token
    const message = describeBadChunk(v);
    if (s.error === message) return { set: { pendingChunk: '' }, send: [] }; // :345, :357 — a repeat says nothing
    return { set: { pendingChunk: '', error: message }, send: ['error'], emit: ['failure'] }; // :347-348, :362-365
  },
  delimiter: (_s, v) => ({ set: { delimiter: v === undefined || v === null ? '' : String(v) }, send: [] }), // :146
  maxLength: (_s, v) => ({ set: { maxLength: Number(v) > 0 ? Number(v) : 0 }, send: [] }), // :159
  maxMessages: (_s, v) => ({ set: { maxMessages: Number(v) >= 0 ? Number(v) : 0 }, send: [] }), // :172

  // :181-185 → :388-443
  add: (s) => {
    if (s.pendingChunk === '') return { send: [], outcome: 'unchanged' }; // :390-397

    const set: Partial<State> = {};
    const send: Port[] = [];
    const emit: Pulse[] = [];
    const capped = truncateHead(s.buffer + s.pendingChunk, s.maxLength); // :400-403
    if (capped.dropped > 0) {
      set.droppedCharacters = s.droppedCharacters + capped.dropped; // :404-408
      send.push('droppedCharacters');
      emit.push('overflowed');
    }
    const split = splitDelimited(capped.text, s.delimiter); // :410-411
    set.buffer = split.rest;
    if (split.messages.length > 0) {
      let messages = s.messages.concat(split.messages); // :414-415
      set.lastMessage = split.messages[split.messages.length - 1];
      if (s.maxMessages > 0 && messages.length > s.maxMessages) {
        const dropped = messages.length - s.maxMessages; // :417-424
        messages = messages.slice(dropped);
        set.droppedMessages = s.droppedMessages + dropped;
        send.push('droppedMessages');
        emit.push('overflowed');
      }
      set.messages = messages;
      send.push('messages', 'lastMessage', 'messageCount'); // :426-428
      emit.push('messageReceived'); // :438
    }
    send.push('accumulated', 'characterCount', 'byteCount'); // :431-433
    emit.push('changed'); // :439
    return { set, send, emit, outcome: 'done' }; // :442
  },

  // :193 → :445-471
  clear: (s) => {
    const hadSomething = s.buffer.length > 0 || s.messages.length > 0 || s.droppedCharacters > 0 || s.droppedMessages > 0 || !!s.error; // :448-453
    const send: Port[] = s.error ? ['error'] : []; // :459 → :376-380, flagged only when one stood
    send.push('accumulated', 'messages', 'lastMessage', 'messageCount', 'characterCount', 'byteCount', 'droppedCharacters', 'droppedMessages'); // :461-468
    return {
      set: { buffer: '', messages: [], lastMessage: '', droppedCharacters: 0, droppedMessages: 0, error: '' }, // :454-459
      send,
      emit: ['cleared'], // :469
      outcome: hadSomething ? 'done' : 'unchanged' // :470
    };
  }
});
