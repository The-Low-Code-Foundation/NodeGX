---
title: "Pattern Extractor"
---
Pattern Extractor: pulls matches and capture groups out of text with a regular expression, without needing a Function node.

Runs `pattern` over `text` on each `extract` and publishes the first match, its capture groups (numbered and named), and — with Extract All on — every match. An optional group that did not participate becomes an empty string rather than a hole in the array, so downstream indexes stay stable. `firstGroup` is a convenience for the overwhelmingly common single-group case. A pattern that will not compile is a result, not an exception: `ok` becomes false, `error` explains, and the `failure` signal fires — distinct from `notFound`, which is a normal outcome. Note that a catastrophically backtracking pattern is still the author's problem; this runs the platform regex engine and cannot bound it.

## When to use it

Extracting a value from text that is not structured data: a percentage out of a progress line, a tool name out of an agent status message, a field out of a log record. Prefer JSON Stream Parser when the payload really is JSON, and String Format or Substring for fixed-position work that needs no pattern.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.PatternExtractor` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `extractAll` | Boolean | `false` | Collects every match into Matches instead of stopping at the first one |
| `flags` | String | — | Regex flags i, m, s, u and y; g is controlled by Extract All and a g written here is ignored |
| `pattern` | String | — | A JavaScript regular expression without the surrounding slashes; capture groups appear on Groups |
| `text` | String | — | The text to search |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `extract` | Signal | — | Runs Pattern over Text and reports what it found |

### What each input does

**Text** (`text`)

- always: kept as text (nothing as empty) and read at the next Extract

**Pattern** (`pattern`)

- always: kept as text (nothing as empty) and read at the next Extract — a regular expression without its slashes

**Flags** (`flags`)

- always: kept as text (nothing as empty) and read at the next Extract — only i, m, s, u and y count; g comes from Extract All

**Extract All** (`extractAll`)

- always: read at the next Extract — every match into Matches, or only the first

**Extract** (`extract`)

- a blank Pattern, or one that is not a valid regular expression: every output is rewritten empty and Error says why → Failure; Not Found, Found stay silent
- the Pattern ran and matched nothing (empty Text matches nothing): every output is rewritten empty, Error cleared — an ordinary result → Not Found, Done; Found stays silent
- the Pattern ran and matched: Match, Matches, Groups, First Group, Named Groups and Match Count are rewritten, Error cleared → Found, Done; Not Found stays silent

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `firstGroup` | String | — | The first capture group of the first match, which is the whole answer for a pattern like (\d+)% |
| `groups` | Array | — | Capture groups of the first match; an optional group that did not participate is a blank string, not a hole |
| `match` | String | — | The first match, or blank when nothing matched |
| `matchCount` | Number | — | How many matches were found, which is at most one unless Extract All is on |
| `matches` | Array | — | Every match when Extract All is on, otherwise just the first |
| `namedGroups` | Object | — | Named capture groups of the first match, keyed by name |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the extract has run, whether it matched or not — Found and Not Found say which |
| `found` | Signal | — | Fires when the pattern ran and matched at least once |
| `notFound` | Signal | — | Fires when the pattern ran and matched nothing, which is an ordinary outcome rather than a mistake |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the pattern could not be used: it is blank, or it is not a valid regular expression |
| `failure` | Signal | — | Fires when the pattern itself is unusable, which is a bug to fix rather than a result |

## Patterns

- Stream text → `text`, pattern `(\d+)%`, `firstGroup` → Number → a progress bar.
- Named groups turn one pattern into several outputs without chaining extractors: `(?<tool>\w+)\s+(?<state>\w+)`.
- `failure` → a visible warning during authoring catches a mistyped pattern that would otherwise read as 'never matches'.

## Watch out for

- Parsing JSON with a regex instead of using JSON Stream Parser.
- Treating `notFound` as an error state — most streams contain lines the pattern is not meant to match.
- Building a pattern from user input without bounding it; nested quantifiers can hang the frame.

## Examples

**Long-running task monitor: progress, batched log lines, and a visible connection**

A backend job streams two kinds of frame on one connection. Pattern Extractor pulls the percentage out of human-readable status text, so a progress bar tracks it without a Function node. JSON Stream Parser turns NDJSON log payloads into values — several may complete in one frame, so `values` rather than `parsed` is what feeds downstream. Stream Buffer batches those into a flush every 250 ms, which keeps a busy log from repainting the list hundreds of times a second, and the stream's `onClose` flushes the tail that never reached a full batch.

## Related nodes

[Server-Sent Events](./net-noodl-sse.md), [JSON Stream Parser](./net-noodl-jsonstream-parser.md), [Substring](../string-manipulation/substring.md), [String Format](../string-manipulation/string-format.md), [String Mapper](../utilities/string-mapper.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

Nothing. Its outputs depend only on its inputs and its own state.

### Starting state

```json
{
  "text": "",
  "pattern": "",
  "flags": "",
  "extractAll": false,
  "match": null,
  "matches": [],
  "groups": [],
  "namedGroups": {},
  "error": ""
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Extract All (`extractAll`) | `js-boolean` | any truthy value is `true`, anything else `false` |

### How actions report back

Each time Extract is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/pattern-extractor.ts"
/**
 * Pattern Extractor (`net.noodl.PatternExtractor`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/agent/pattern-extractor.ts` and `stream-parsers.ts`
 * on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Text`, `Pattern` and `Flags` are kept as text (`null` /
 * `undefined` → `''`, anything else `String(value)`, :73-98); `Extract All` is truthiness
 * (:107-109). Nothing runs until `Extract` (:112-120): it runs the pattern over the text
 * (stream-parsers.ts `extractPattern` — a blank pattern is refused, the flags are filtered to
 * `imsuy` and `g` comes from Extract All, an invalid pattern is a result carrying the engine's
 * message, empty text matches nothing) and ALWAYS rewrites and sends every output — Match (`''`
 * when nothing matched), Matches, Groups, First Group, Named Groups, Match Count and Error (`''`
 * on success) — even when it fails (:235-247). An unusable pattern is the outcome `failure`
 * (`pattern-extractor/extract-failed`) with no Found / Not Found (:249-257); otherwise exactly one
 * of `Found` / `Not Found` pulses and the outcome is `done` for both (:259-260 — Not Found is a
 * result, not an Unchanged).
 */

import { defineNode } from '../spec';
import { extractPattern } from './stream-parsers';

/** :24 */
export const EXTRACT_ERROR_CODE = 'pattern-extractor/extract-failed';

type State = {
  text: string;
  pattern: string;
  flags: string;
  extractAll: boolean;
  match: string | null;
  matches: readonly string[];
  groups: readonly string[];
  namedGroups: Readonly<Record<string, string>>;
  error: string;
}

const asText = (v: unknown) => (v === undefined || v === null ? '' : String(v));

export const PatternExtractor = defineNode({
  type: 'net.noodl.PatternExtractor',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/agent/pattern-extractor.ts; stream-parsers.ts',

  // :40-51 initialize
  state: { text: '', pattern: '', flags: '', extractAll: false, match: null, matches: [], groups: [], namedGroups: {}, error: '' } as State,
  outcomes: ['done', 'failure'], // :221-224

  inputs: {
    // :68-76
    text: {
      type: 'string',
      coerce: 'none',
      displayName: 'Text',
      group: 'Data',
      description: 'The text to search',
      examples: ['Processing... 45% complete', 'a1 b22 c333', 'tool: search\ntool: fetch', 'NO DIGITS', '', 'x-y']
    },
    // :78-87
    pattern: {
      type: 'string',
      coerce: 'none',
      displayName: 'Pattern',
      group: 'Pattern',
      description: 'A JavaScript regular expression without the surrounding slashes; capture groups appear on Groups',
      examples: ['(\\d+)%', '([a-z])(\\d+)', '(?<name>\\w+): (\\w+)', '^tool: (\\w+)$', '(x)?-(y)', '[', '', 'z*', '(?<n>\\d)?\\d']
    },
    // :89-99
    flags: {
      type: 'string',
      coerce: 'none',
      displayName: 'Flags',
      group: 'Pattern',
      description: 'Regex flags i, m, s, u and y; g is controlled by Extract All and a g written here is ignored',
      examples: ['i', 'm', 'g', 'gim', 'y', 'q', '']
    },
    // :101-110 — `!!value`
    extractAll: { type: 'boolean', default: false, coerce: 'js-boolean', displayName: 'Extract All', group: 'Pattern', description: 'Collects every match into Matches instead of stopping at the first one' },
    // :112-120
    extract: { type: 'signal', outcome: true, displayName: 'Extract', group: 'Actions', description: 'Runs Pattern over Text and reports what it found' }
  },

  outputs: {
    match: { type: 'string', from: (s) => (s.match === null ? '' : s.match), displayName: 'Match', group: 'Data', description: 'The first match, or blank when nothing matched' },
    matches: { type: 'array', from: (s) => s.matches, displayName: 'Matches', group: 'Data', description: 'Every match when Extract All is on, otherwise just the first' },
    groups: {
      type: 'array',
      from: (s) => s.groups,
      displayName: 'Groups',
      group: 'Data',
      description: 'Capture groups of the first match; an optional group that did not participate is a blank string, not a hole'
    },
    firstGroup: {
      type: 'string',
      from: (s) => (s.groups.length > 0 ? s.groups[0] : ''),
      displayName: 'First Group',
      group: 'Data',
      description: 'The first capture group of the first match, which is the whole answer for a pattern like (\\d+)%'
    },
    namedGroups: { type: 'object', from: (s) => s.namedGroups, displayName: 'Named Groups', group: 'Data', description: 'Named capture groups of the first match, keyed by name' },
    matchCount: { type: 'number', from: (s) => s.matches.length, displayName: 'Match Count', group: 'Status', description: 'How many matches were found, which is at most one unless Extract All is on' },
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Status', description: 'Why the pattern could not be used: it is blank, or it is not a valid regular expression' },
    found: { type: 'signal', displayName: 'Found', group: 'Events', description: 'Fires when the pattern ran and matched at least once' },
    notFound: { type: 'signal', displayName: 'Not Found', group: 'Events', description: 'Fires when the pattern ran and matched nothing, which is an ordinary outcome rather than a mistake' }
  }
}).on({
  text: (_s, v) => ({ says: 'always: kept as text (nothing as empty) and read at the next Extract', set: { text: asText(v) }, send: [] }), // :74
  pattern: (_s, v) => ({ says: 'always: kept as text (nothing as empty) and read at the next Extract — a regular expression without its slashes', set: { pattern: asText(v) }, send: [] }), // :85
  flags: (_s, v) => ({ says: 'always: kept as text (nothing as empty) and read at the next Extract — only i, m, s, u and y count; g comes from Extract All', set: { flags: asText(v) }, send: [] }), // :97
  extractAll: (_s, v) => ({ says: 'always: read at the next Extract — every match into Matches, or only the first', set: { extractAll: v }, send: [] }), // :108

  // :116-119 → :228-261 (NSP-018: the Found / Not Found ternary as two literal arms)
  extract: (s) => {
    const result = extractPattern(s.text, s.pattern, { all: s.extractAll, flags: s.flags }); // :230-233
    const set = { match: result.match, matches: result.matches, groups: result.groups, namedGroups: result.namedGroups, error: result.ok ? '' : result.error || 'Invalid pattern' }; // :235-239
    if (!result.ok) return { says: 'a blank Pattern, or one that is not a valid regular expression: every output is rewritten empty and Error says why', set, outcome: 'failure', error: EXTRACT_ERROR_CODE }; // :249-257 — every output was flagged (:241-247)
    if (result.match === null) return { says: 'the Pattern ran and matched nothing (empty Text matches nothing): every output is rewritten empty, Error cleared — an ordinary result', set, emit: ['notFound'], outcome: 'done' }; // :259-260
    return { says: 'the Pattern ran and matched: Match, Matches, Groups, First Group, Named Groups and Match Count are rewritten, Error cleared', set, emit: ['found'], outcome: 'done' }; // :259-260
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
