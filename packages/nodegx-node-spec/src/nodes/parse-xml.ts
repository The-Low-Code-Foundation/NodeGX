/**
 * Parse XML (`net.noodl.ParseXML`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/parsexml.ts` and `packages/noodl-runtime/src/xml.ts`
 * on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node parses at the FRAME END, once per frame however many
 * of its five inputs moved (:185-194), and abstains until something has arrived on `XML` (:198 —
 * anything but `undefined` and `null`). The text goes to xml.ts `parseXML` (xml.ts in this
 * package, the runtime's file verbatim) with the four options as they stand. A failure sets
 * `Error` to the sentence and `Error Code` to the code, raises `parse-xml/parse-failed` on the
 * runtime error channel (an effect beside the trace) and pulses `Failure`, leaving `Result` as it
 * was (:210-221). A success clears both (sent — a wire keeps the last reason), replaces `Result`
 * with the fresh object, and pulses `Changed` (:223-230). `Attribute Prefix` falls back to `@` on
 * `undefined` / `null` only (:94 — `''` is a real prefix: attributes keyed by their bare name);
 * `Always Array` is `value || ''` (:108); `Trim Values` is truthiness (:119); `Max Bytes` is
 * `Number(value)`, the default unless finite and above 0 (:132-133).
 *
 * ⚠️ `Always Array` is split as a string at PARSE time (:202-205): a truthy non-string (a number,
 * `true`, an array, an object) throws there, inside the frame-end callback, AFTER `scheduled` was
 * cleared (:191-192) — the scheduler logs the throw and the node sends nothing, not even
 * `Failure`; the next frame parses again (and throws again while the value stands). The spec
 * writes that silence (R3 (a)); NSP-013 §6 row C18.
 */

import { defineNode } from '../spec';
import { DEFAULT_MAX_BYTES, parseXML, XML_EXAMPLES } from './xml';
import { errorOutput } from './data-base';

/** :30 — the runtime error code a failed parse raises (an effect; the runtime target keeps it on the handle). */
export const PARSE_ERROR_CODE = 'parse-xml/parse-failed';

type State = {
  text: unknown;
  textSupplied: boolean;
  attributePrefix: unknown;
  alwaysArray: unknown;
  trimValues: boolean;
  maxBytes: number;
  /** Replaced only on a successful parse. */
  result: Record<string, unknown> | undefined;
  lastError: string | undefined;
  lastErrorCode: string | undefined;
  scheduled: boolean;
}

export const ParseXML = defineNode({
  type: 'net.noodl.ParseXML',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/parsexml.ts; packages/noodl-runtime/src/xml.ts',

  // :61-66 initialize — the real defaults (a declared `default` never runs its setter)
  state: { text: undefined, textSupplied: false, attributePrefix: '@', alwaysArray: '', trimValues: true, maxBytes: DEFAULT_MAX_BYTES, result: undefined, lastError: undefined, lastErrorCode: undefined, scheduled: false } as State,

  inputs: {
    // :72-84 — raw; supplied = not undefined / null
    text: {
      type: 'string',
      coerce: 'none',
      examples: XML_EXAMPLES,
      displayName: 'XML',
      group: 'General',
      description:
        'The XML text to parse. Wire an HTTP Request node\'s Response here with its Response Type ' +
        'set to Text, so the body reaches this node untouched whatever content-type the server claimed'
    },
    // :85-97 — undefined / null → '@' (:94)
    attributePrefix: {
      type: 'string',
      default: '@',
      coerce: 'none',
      examples: ['@', '', '_', '$'],
      displayName: 'Attribute Prefix',
      group: 'General',
      description:
        'What an attribute\'s key starts with, so it cannot collide with a child element of the ' +
        'same name. With the default, <a href="x"/> is { "@href": "x" }'
    },
    // :98-111 — `value || ''` (:108)
    alwaysArray: {
      type: 'string',
      default: '',
      coerce: 'none',
      examples: ['item', 'item, b', 'a,item', ' , ', 'entry'],
      displayName: 'Always Array',
      group: 'General',
      description:
        'Comma-separated tag names that are always an array, however many times they appear. ' +
        'Without this, a document with one <item> and a document with ten have different shapes ' +
        'and everything downstream needs a branch'
    },
    // :112-122 — `!!value` (:119)
    trimValues: { type: 'boolean', default: true, coerce: 'js-boolean', displayName: 'Trim Values', group: 'General', description: 'Strip leading and trailing whitespace from text. Untick it to keep a document\'s indentation' },
    // :123-136 — `Number(value)`, finite and > 0, else the default (:132-133)
    maxBytes: {
      type: 'number',
      default: DEFAULT_MAX_BYTES,
      coerce: 'none',
      examples: [8, 30, 1000, 0, -1, 'x'],
      displayName: 'Max Bytes',
      group: 'General',
      description:
        'Refuse a document larger than this, before parsing it. A big document costs many times ' +
        'its own size in memory once it is an object, and a server can always send more than you expected'
    }
  },

  outputs: {
    // :139-150
    result: {
      type: 'object',
      from: (s) => s.result,
      displayName: 'Result',
      group: 'Values',
      description:
        'The document as an object. Every value is a string, including ones that look numeric — ' +
        'an id of 0123 stays "0123". A tag carrying both attributes and text becomes ' +
        '{ "@attr": "…", "#text": "…" }. Unchanged while the XML cannot be parsed'
    },
    // :151-156
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires once Result holds the freshly parsed document' },
    // :157-162 — a plain signal, no invocation behind it
    failure: { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the XML could not be parsed or was refused, leaving Result as it was' },
    // :163-171
    error: errorOutput('Why the XML could not be read; empty until a parse fails', (s: { lastError: unknown }) => s.lastError),
    // :172-182
    errorCode: {
      type: 'string',
      from: (s) => s.lastErrorCode,
      displayName: 'Error Code',
      group: 'Error',
      description:
        'A stable code for the failure, for a graph that branches rather than reads: xml/too-large, ' +
        'xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty'
    }
  }
}).on(
  {
    text: (_s, v) => ({ set: { text: v, textSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :80-82
    attributePrefix: (_s, v) => ({ set: { attributePrefix: v === undefined || v === null ? '@' : v, scheduled: true }, send: [] }), // :94-95
    alwaysArray: (_s, v) => ({ set: { alwaysArray: v || '', scheduled: true }, send: [] }), // :108-109
    trimValues: (_s, v) => ({ set: { trimValues: v, scheduled: true }, send: [] }), // :119-120
    maxBytes: (_s, v) => {
      const n = Number(v); // :132
      return { set: { maxBytes: isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES, scheduled: true }, send: [] }; // :133-134
    }
  },
  {
    // :185-194 `_schedule` → :195-231 `_parse`
    afterInputs: (s) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled || !s.textSupplied) return idle; // :191, :198
      // :202-205 — `.split` on a truthy non-string throws in the runtime; the callback's throw is logged and nothing is sent (row C18)
      if (typeof s.alwaysArray !== 'string') return idle;

      const result = parseXML(s.text as string, {
        attributePrefix: s.attributePrefix as string,
        alwaysArray: s.alwaysArray
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        trimValues: s.trimValues,
        maxBytes: s.maxBytes
      }); // :200-208

      if (result.error) {
        // :210-220 — the reason and the code, the runtime error raised (an effect), Failure; Result untouched
        return { set: { scheduled: false, lastError: result.error.message, lastErrorCode: result.error.code }, send: ['error', 'errorCode'], emit: ['failure'] };
      }
      // :223-230 — both cleared (sent), Result replaced, Changed
      return { set: { scheduled: false, lastError: undefined, lastErrorCode: undefined, result: result.value }, send: ['error', 'errorCode', 'result'], emit: ['changed'] };
    }
  }
);
