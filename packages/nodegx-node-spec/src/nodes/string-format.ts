/**
 * String Format — read from `packages/noodl-runtime/src/nodes/std-library/stringformat.ts` on
 * 2026-09-30.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Why this node is in the pilot: the first `runtime-discovered` ports (the catalog's
 * `dynamicPorts.mechanisms`). `registerInputIfNeeded` is overridden (:102-109) to register ANY
 * name on first write and store its value (:124-131) — even one the format does not mention yet —
 * while the EDITOR draws one port per `{placeholder}` in `format` (:133-155 `updatePorts`). Both
 * halves are in `derived`: `inputs(params)` is what the editor draws, `discover` is what the
 * runtime accepts.
 *
 * Two things the source once said about itself that the code did not do, both §6 rows in NSP-004:
 *   - every copy of a placeholder is filled: the loop at :89-94 runs once PER MATCH, and each
 *     `replace` fills the first occurrence still standing — so `{a}{a}` with `a = 'x'` gives `xx`.
 *     The description (:52) and the comment at :91-92 said only the first copy filled (row D2,
 *     ruled "Correct the words" in P109 ISL-033; the code did not change).
 *   - v2 (row D3, ruled "Insert values exactly"): a value goes in exactly as it is. v1, as the
 *     runtime was, replaced with a string, which interprets `$&`, `$$`, `` $` `` and `$'` in the
 *     REPLACEMENT: a value of `$&` printed the placeholder back, `$$5` printed `$5`.
 */

import { defineNode, type ValueInputDecl } from '../spec';

/** :81 — a placeholder is `{` + zero or more of `A-Za-z0-9_` + `}`; `{}` names the port `''`. */
const PLACEHOLDER = /\{[A-Za-z0-9_]*\}/g;

/** :81-87 — the placeholder names in order of appearance, duplicates kept. */
export function placeholders(format: string): string[] {
  const matches = format.match(PLACEHOLDER);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

/** :75-98 `formatValue`, without the dirty cache (a pure function of format and values). */
export function formatValue(format: string, values: Readonly<Record<string, unknown>>): string {
  let formatted = format;
  for (const name of placeholders(format)) {
    const v = values[name];
    // :93 — string pattern, so the FIRST occurrence still standing; a function replacement, so no `$`-pattern applies (v2, D3)
    const text = v !== undefined ? String(v) : '';
    formatted = formatted.replace('{' + name + '}', () => text);
  }
  return formatted;
}

// :107-109 registers `{ set }` only — no type, no label; :148 gives the editor's port `type: 'string'`.
// No conversion on arrival (:128 stores what came), `String(v)` is applied at format time (:93).
const placeholderPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none' });

export const StringFormat = defineNode({
  type: 'String Format',
  // v2 (P109 ISL-032, row D3 ruled "Insert values exactly"): `$&`, `$$`, `$'` and `` $` `` in a value come out as typed.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/stringformat.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a template literal filling named values into text', example: '`Hello ${name}, you have ${count} messages`' }
  ],

  // initialize (:38-44): format '', cachedResult '', inputValues {}. The cache and its dirty flag
  // are not state a wire can see; `formatted` is a function of `format` and `values`.
  state: { format: '', values: {} as Readonly<Record<string, unknown>> },
  // :45-47 — the formatted text
  inspect: (s) => formatValue(s.format, s.values),

  inputs: {
    // :49-61. No declared default. The setter converts on arrival (`String(value)`): a wired
    // number, `null`, an object is read as its text. It once stored the value unconverted and
    // `.match` threw inside the frame, for good (P107-C3, fixed in ISL-026; the spec always read it so).
    format: {
      type: 'string',
      coerce: 'js-string',
      displayName: 'Format',
      group: 'Values',
      description: 'Template text; each {placeholder} becomes an input port, and every copy of a placeholder is filled'
    }
  },

  outputs: {
    // :64-71 `get` → `formatValue()`; :115-118 sends it after the frame's inputs have landed
    formatted: {
      type: 'string',
      from: (s) => formatValue(s.format, s.values),
      displayName: 'Formatted',
      group: 'Values',
      description: 'Format with every placeholder substituted, and an unset placeholder replaced by nothing'
    }
  }
}).on(
  {
    // :54-60 — store the format. The :55 same-value guard only skips a reschedule; not carried.
    format: (_s, v) => ({ says: 'always: the new template — each {name} in it becomes a text input, and Formatted follows', set: { format: v } })
  },
  {
    derived: {
      // :133-155 `updatePorts` — one `string` input per UNIQUE placeholder in `format`, in order of
      // first appearance. A non-string `format` parameter draws no ports (`.match` would throw
      // there too; the editor never sends one).
      inputs: (params) => {
        const ports: Record<string, ValueInputDecl> = {};
        const format = params.format;
        if (typeof format !== 'string') return ports;
        for (const name of placeholders(format)) if (!(name in ports)) ports[name] = placeholderPort();
        return ports;
      },
      // :124-131 `userInputSetter` — store under the name; the :126 same-value guard is not carried
      on: (s, portName, value) => ({ set: { values: { ...s.values, [portName]: value } } }),
      // :102-109 — any name at all is registered on first write
      discover: () => placeholderPort(),
      candidates: ['name', 'a']
    }
  }
);
