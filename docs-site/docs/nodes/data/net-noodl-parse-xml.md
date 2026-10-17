---
title: "Parse XML"
---
Turns XML text that arrived at runtime into an object, with attributes prefixed and hostile documents refused rather than parsed.

Parse XML reads XML text into a plain object. An element's attributes arrive under keys prefixed with @ (so &lt;a href="x"/> is { "@href": "x" }) and a tag that carries both attributes and text keeps its text under #text — which is the shape that catches everyone, because String(node.title) on such a tag gives [object Object] and not the words. Namespace prefixes are kept, deliberately: content:encoded and yt:videoId are how you tell one kind of item from another, and stripping the prefix would collide media:title with title. Every value is a string, the same rule Parse CSV set — an id of 0123 stays "0123" and never becomes the number 123. Always Array names tags that must be an array however many times they appear, so a document with one &lt;item> and a document with ten have the same shape and nothing downstream needs a branch. Two guards run before parsing rather than during it: a document over Max Bytes is refused, and a document that declares its own entities (&lt;!ENTITY>, or a DOCTYPE with an inline subset) is refused outright — that is the billion-laughs attack, where a dozen lines expand to gigabytes, and no feed or document format legitimately needs it. Both fail on Failure with a code on Error Code, in milliseconds, leaving the process alive.

## When to use it

XML arriving from anywhere at runtime: an RSS or Atom feed, a SOAP or sitemap response, a supplier's export, an upload. For a feed specifically, use Parse Feed instead — it is this node plus the mapping that turns four incompatible feed formats into one item shape. Pair either with an HTTP Request node whose Response Type is Text, so the body reaches you untouched whatever content-type the server claimed.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.ParseXML` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `alwaysArray` | String | `` | Comma-separated tag names that are always an array, however many times they appear. Without this, a document with one &lt;item> and a document with ten have different shapes and everything downstream needs a branch |
| `attributePrefix` | String | `@` | What an attribute's key starts with, so it cannot collide with a child element of the same name. With the default, &lt;a href="x"/> is { "@href": "x" } |
| `maxBytes` | Number | `5242880` | Refuse a document longer than this many characters (not bytes), before parsing it. A big document costs many times its own size in memory once it is an object, and a server can always send more than you expected |
| `text` | String | — | The XML text to parse. Wire an HTTP Request node's Response here with its Response Type set to Text, so the body reaches this node untouched whatever content-type the server claimed |
| `trimValues` | Boolean | `true` | Strip leading and trailing whitespace from text. Untick it to keep a document's indentation |

### What each input does

**XML** (`text`)

- always: parsed at the end of the frame (once, however many inputs moved) — Result and Changed, or Error, Error Code and Failure with Result untouched; nothing (undefined or null) is not parsed

**Attribute Prefix** (`attributePrefix`)

- always: the XML is parsed again at the end of the frame, once any has arrived, with attribute keys starting with this (nothing reads as @; empty is a real prefix: the bare name)

**Always Array** (`alwaysArray`)

- always: read as text — the XML is parsed again at the end of the frame, once any has arrived, with these comma-separated tags always arrays

**Trim Values** (`trimValues`)

- always: the XML is parsed again at the end of the frame, once any has arrived, with text values trimmed or kept as written

**Max Characters** (`maxBytes`)

- always: the XML is parsed again at the end of the frame, once any has arrived — a text longer than this (counted in characters) is refused as xml/too-large before parsing; not a finite number above 0 reads as the default, 5 MB

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | Object | — | The document as an object. Every value is a string, including ones that look numeric — an id of 0123 stays "0123". A tag carrying both attributes and text becomes { "@attr": "…", "#text": "…" }. Unchanged while the XML cannot be parsed |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires once Result holds the freshly parsed document |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the XML could not be read; empty until a parse fails |
| `errorCode` | String | — | A stable code for the failure, for a graph that branches rather than reads: xml/too-large, xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty |
| `failure` | Signal | — | Fires when the XML could not be parsed or was refused, leaving Result as it was |

## Patterns

- HTTP Request (Response Type: Text) → Parse XML `text`. Text is what guarantees the body arrives untouched — a server that labels XML as application/json will otherwise break the fetch itself, before this node runs.
- Set Always Array for any tag you will loop over. Without it, a document that happens to carry one of something gives you an object where you expected a list.
- Wire `failure` somewhere that answers the caller. A cloud function whose only wired path is the happy one hangs forever when the document is bad (CWF-018).

## Watch out for

- Expecting numbers. Every value is a string; convert explicitly where you need one.
- Reading a tag's text with String(node.tag) when the tag also has attributes — that gives [object Object]. Read node.tag['#text'].
- Raising Max Bytes to take any document a server offers. The object costs several times the text in memory, and a server can always send more than you expected.
- Using this for a feed and writing the RSS-versus-Atom mapping by hand. Parse Feed already did it, including the four cases that are easy to get wrong.

## Examples

**Read an XML response that is not a feed**

A supplier's export, a sitemap, a SOAP reply: XML that arrives at runtime and is not a feed. Parse XML turns it into a plain object and then it is ordinary graph work. Three things about the shape it hands you, each of which catches people once. Attributes arrive under keys prefixed with @, so &lt;tool id="t1"> becomes { "@id": "t1" } and cannot collide with a child element called id. A tag that carries BOTH attributes and text keeps its text under #text — so &lt;name lang="en">Bench tools&lt;/name> is { "@lang": "en", "#text": "Bench tools" }, and reading it as if it were a plain string gives you [object Object] rather than the words. And every value is a string, the same rule Parse CSV set: an id of 0123 stays "0123" and never silently becomes the number 123. Always Array is set to 'tool' here, and that is the setting worth understanding. XML has no way to say 'this is a list', so a document with ten &lt;tool> elements gives you an array and a document with one gives you a single object — and the graph that worked all week breaks on the day a supplier ships one item. Naming the tag in Always Array makes it an array in both cases. Max Bytes is left at its default: a document larger than it is refused BEFORE parsing, as is any document that declares its own entities, which is the billion-laughs attack. Both fail on Failure with a code on Error Code, in milliseconds, rather than taking the process with them — so wiring Failure somewhere is what turns that guard into something a person finds out about.

## Related nodes

[Parse Feed](./net-noodl-parse-feed.md), [Parse CSV](./net-noodl-parse-csv.md), [HTTP Request](./net-noodl-http.md), [Static Array](./static-data.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "textSupplied": false,
  "attributePrefix": "@",
  "alwaysArray": "",
  "trimValues": true,
  "maxBytes": 5242880,
  "scheduled": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Trim Values (`trimValues`) | `js-boolean` | any truthy value is `true`, anything else `false` |

### Version history

- **Version 3**: Words only: "Max Bytes" is now "Max Characters", and the xml/too-large Error says "N K characters, over the M K limit. Raise Max Characters on the node…" where it said "N KB, over the M KB limit. Raise Max Bytes…". The check is the same: it always counted characters, not bytes. Existing projects are not migrated: ruled "Rename it Max Characters and keep the check" (R28): the port id stays `maxBytes`, so a saved project reads as before, and only the words of an Error changed. The reach measured on 2026-10-12 was 0 Parse XML or Parse Feed nodes in Richard's projects.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/parse-xml.ts"
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
 * `Always Array` is `value || ''` (:108); `Trim Values` is truthiness (:119); `Max Characters` (port id `maxBytes`) is
 * `Number(value)`, the default unless finite and above 0 (:132-133).
 *
 * `Always Array` is read as text on arrival (`String(value)`, v2 — NSP-013 §6 row C18, ruled "Turn it into
 * text", fixed in P109 ISL-026): a list of names wired in reads as `'a,b'`. In v1 a truthy non-string threw at
 * `.split` inside the frame-end callback and every parse sent nothing, not even `Failure`, while it stood.
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
  // v2 (P109 ISL-026, P107-C18 ruled "Turn it into text"): Always Array is `String(value)` on arrival; v1 wrote the runtime's
  // silence for a value that was not text.
  // v3 (P107 s92, row C162 — R28): the cap is named Max Characters, and its Error says so
  version: 3,
  changes: [
    {
      version: 3,
      says: 'Words only: "Max Bytes" is now "Max Characters", and the xml/too-large Error says "N K characters, over the M K limit. Raise Max Characters on the node…" where it said "N KB, over the M KB limit. Raise Max Bytes…". The check is the same: it always counted characters, not bytes',
      row: 'P107-C162 (R28)',
      migration: {
        none: 'Ruled "Rename it Max Characters and keep the check" (R28): the port id stays `maxBytes`, so a saved project reads as before, and only the words of an Error changed. The reach measured on 2026-10-12 was 0 Parse XML or Parse Feed nodes in Richard\'s projects'
      }
    }
  ],
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
      displayName: 'Max Characters',
      group: 'General',
      description:
        'Refuse a document longer than this many characters (not bytes), before parsing it. A big document costs many times ' +
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
    text: (_s, v) => ({ says: 'always: parsed at the end of the frame (once, however many inputs moved) — Result and Changed, or Error, Error Code and Failure with Result untouched; nothing (undefined or null) is not parsed', set: { text: v, textSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :80-82
    attributePrefix: (_s, v) => ({ says: 'always: the XML is parsed again at the end of the frame, once any has arrived, with attribute keys starting with this (nothing reads as @; empty is a real prefix: the bare name)', set: { attributePrefix: v === undefined || v === null ? '@' : v, scheduled: true }, send: [] }), // :94-95
    alwaysArray: (_s, v) => ({ says: 'always: read as text — the XML is parsed again at the end of the frame, once any has arrived, with these comma-separated tags always arrays', set: { alwaysArray: v ? String(v) : '', scheduled: true }, send: [] }), // :108-109 — v2 (C18): as text
    trimValues: (_s, v) => ({ says: 'always: the XML is parsed again at the end of the frame, once any has arrived, with text values trimmed or kept as written', set: { trimValues: v, scheduled: true }, send: [] }), // :119-120
    maxBytes: (_s, v) => {
      const n = Number(v); // :132
      return { says: 'always: the XML is parsed again at the end of the frame, once any has arrived — a text longer than this (counted in characters) is refused as xml/too-large before parsing; not a finite number above 0 reads as the default, 5 MB', set: { maxBytes: isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES, scheduled: true }, send: [] }; // :133-134
    }
  },
  {
    // :185-194 `_schedule` → :195-231 `_parse`
    afterInputs: (s) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled || !s.textSupplied) return idle; // :191, :198

      const result = parseXML(s.text as string, {
        attributePrefix: s.attributePrefix as string,
        alwaysArray: String(s.alwaysArray)
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
