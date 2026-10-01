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
  text: (_s, v) => ({ set: { text: asText(v) }, send: [] }), // :74
  pattern: (_s, v) => ({ set: { pattern: asText(v) }, send: [] }), // :85
  flags: (_s, v) => ({ set: { flags: asText(v) }, send: [] }), // :97
  extractAll: (_s, v) => ({ set: { extractAll: v }, send: [] }), // :108

  // :116-119 → :228-261
  extract: (s) => {
    const result = extractPattern(s.text, s.pattern, { all: s.extractAll, flags: s.flags }); // :230-233
    const set = { match: result.match, matches: result.matches, groups: result.groups, namedGroups: result.namedGroups, error: result.ok ? '' : result.error || 'Invalid pattern' }; // :235-239
    if (!result.ok) return { set, outcome: 'failure', error: EXTRACT_ERROR_CODE }; // :249-257 — every output was flagged (:241-247)
    return { set, emit: [result.match === null ? 'notFound' : 'found'], outcome: 'done' }; // :259-260
  }
});
