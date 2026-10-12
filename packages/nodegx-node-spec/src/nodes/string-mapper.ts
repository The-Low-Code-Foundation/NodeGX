/**
 * String Mapper — read from `packages/noodl-runtime/src/nodes/std-library/stringmapper.ts` on
 * 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * Two `numbered-inputs` families that pair by index (:3-9): `input <n>` is the string to match,
 * `output <n>` (drawn as "Mapping n") is what it maps to. The lookup runs once per frame
 * (`scheduleMapping` :106-112, the `hasScheduled…` idiom → `afterInputs`): `indexOf` over the
 * sparse inputs (:100 — ascending index, `===`, holes skipped), the paired mapping or Default
 * (:101-102), and `Mapped String` flagged (:104) — so an unset pairing publishes nothing (C3) and
 * the wire keeps whatever it had.
 *
 * Every string setter here reads `null` as empty text — `inputString` (:70) and both numbered
 * families (:42, :54); `undefined` is `''` on the numbered ports and "no input string" on Input
 * String (v2 — NSP-011 §6 row C4, ruled "Read it as empty text", fixed in P109 ISL-026). In v1
 * `null.toString()` threw inside the setter and the spec ignored the write.
 */

import { defineNode, type ValueInputDecl } from '../spec';

const INPUT = /^input \d+$/;
const OUTPUT = /^output \d+$/;

// :34-46 and :47-58 — `type: 'string'`, `displayPrefix` Input / Mapping, groups Inputs / Mappings
const inputPort = (i: number): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Input ' + i, group: 'Inputs' });
const mappingPort = (i: number): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Mapping ' + i, group: 'Mappings' });

/** nodedefinition.ts `collectPorts`: the highest index mentioned plus one spare, or `<family> 0` alone. */
function drawn(params: Readonly<Record<string, unknown>>, wired: readonly string[], family: string, port: (i: number) => ValueInputDecl): Record<string, ValueInputDecl> {
  const re = new RegExp('^' + family + ' \\d+$');
  const indices = [...Object.keys(params), ...wired]
    .filter((k) => re.test(k))
    .map((k) => Number(k.slice(family.length + 1)));
  const count = indices.length ? Math.max(...indices) + 2 : 1;
  const ports: Record<string, ValueInputDecl> = {};
  for (let i = 0; i < count; i++) ports[family + ' ' + i] = port(i);
  return ports;
}

/** :98-103 `doMapping` — `inputs.indexOf(current)` on a sparse array, then the paired mapping or the default. */
export function mappingFor(
  inputs: Readonly<Record<string, string>>,
  mappings: Readonly<Record<string, string>>,
  current: string | undefined,
  fallback: unknown
): unknown {
  const idx = Object.keys(inputs)
    .map(Number)
    .sort((a, b) => a - b)
    .find((i) => inputs[i] === current);
  return idx === undefined ? fallback : mappings[idx];
}

export const StringMapper = defineNode({
  type: 'String Mapper',
  // v2 (P109 ISL-026, P107-C4): null on Input String or a numbered port is empty text; v1 ignored the write (the runtime threw).
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/stringmapper.ts',
  // NSP-018 — the hand-written code this node replaces (read by nothing yet; `spec-ledger` counts it)
  idioms: [
    { says: 'a lookup table from one string to another, with a fallback', example: '({ draft: \'Draft\', live: \'Published\' })[status] ?? \'Unknown\'' },
    { says: 'a switch over string cases returning text', example: 'switch (status) { case \'draft\': return \'Draft\'; default: return \'Unknown\' }' }
  ],

  // initialize (:27-30): inputs [], mappings []; the rest is unset until written
  state: {
    inputs: {} as Readonly<Record<string, string>>,
    mappings: {} as Readonly<Record<string, string>>,
    current: undefined as string | undefined,
    fallback: undefined as unknown,
    mapped: undefined as unknown,
    scheduled: false
  },
  // :31-33
  inspect: (s) => String(s.mapped),

  inputs: {
    // :61-73 — undefined stays undefined, null is '' (v2, row C4), anything else `toString()` (:70)
    inputString: {
      type: 'string',
      coerce: 'none',
      displayName: 'Input String',
      group: 'Values',
      description: 'The string to look up among the numbered inputs'
    },
    // :74-84 — stored raw (:81)
    defaultMapping: {
      type: 'string',
      coerce: 'none',
      displayName: 'Default',
      group: 'Mappings',
      description: 'Published when Input String matches none of the numbered inputs'
    }
  },

  outputs: {
    // :86-96
    mappedString: {
      type: 'string',
      from: (s) => s.mapped,
      displayName: 'Mapped String',
      group: 'Values',
      description: 'The mapping paired with the input that matched, or Default when none did'
    }
  }
}).on(
  {
    inputString: (_s, v) => ({
      says: 'always: looked up among the numbered inputs at the end of the frame (null counts as empty text); Mapped String follows',
      set: { current: v === undefined ? undefined : v === null ? '' : String(v), scheduled: true } }),
    defaultMapping: (_s, v) => ({ says: 'always: what Mapped String becomes at the end of the frame when nothing matches', set: { fallback: v, scheduled: true } })
  },
  {
    derived: {
      // nodedefinition.ts `collectPorts` per family — mentioned by a param OR by a wire into the node (:624, NSP-020 s80: `context.wired`)
      inputs: (params, context) => ({ ...drawn(params, context.wired ?? [], 'input', inputPort), ...drawn(params, context.wired ?? [], 'output', mappingPort) }),
      needs: ['wired'],
      // :40-45, :52-57 — undefined and null are '' (v2, row C4), anything else `toString()`
      on: (s, portName, value) => {
        const text = value === undefined || value === null ? '' : String(value);
        if (INPUT.test(portName)) return { set: { inputs: { ...s.inputs, [portName.slice('input '.length)]: text }, scheduled: true } };
        return { set: { mappings: { ...s.mappings, [portName.slice('output '.length)]: text }, scheduled: true } };
      },
      // `registerNumberedInput` for each family; `inputString` starts with `input` but is already a port
      discover: (portName) => {
        if (INPUT.test(portName)) return inputPort(Number(portName.slice('input '.length)));
        if (OUTPUT.test(portName)) return mappingPort(Number(portName.slice('output '.length)));
        return undefined;
      },
      candidates: ['input 0', 'input 1', 'output 0', 'output 1']
    },
    // :98-104 — once per frame, against the frame's final inputs
    afterInputs: (s) => (s.scheduled ? { set: { scheduled: false, mapped: mappingFor(s.inputs, s.mappings, s.current, s.fallback) } } : {})
  }
);
