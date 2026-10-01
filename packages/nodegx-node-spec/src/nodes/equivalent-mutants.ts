/**
 * NSP-012 — mutants a node's OWN ports cannot tell from the original (runner/conformance.ts
 * `ConformanceOptions.equivalent`): counted in every report, never listed as survivors, never
 * hidden. Two kinds:
 *
 *   - a "run scheduled" flag left set on a branch whose re-run is SILENT — Array Map has no
 *     checkbox and no input that changes a run without scheduling one, so a stuck flag re-runs a
 *     silent run silently (Array Filter's stuck flag IS killed: `Enabled` moving with its box
 *     unticked re-runs the mutant and not the original);
 *   - a value a node stores and writes onto a record or array that NO port of its own reads
 *     back — Create New Object's held properties, Set Variable's `Value` and `Set as` — graded by
 *     the graph scenarios in scenarios/graph/s*.json, where a second node reads the record.
 *
 * Kept as narrow as each row; a wider row would eat the next hole (README §9).
 */

import type { EquivalentMutant } from '../runner/conformance';

const STUCK_FLAG = 'a stuck "scheduled" flag re-runs a silent run silently: no port of this node can show it';
const GRAPH = (what: string, scenario: string) => `${what} is written onto the registry and no port of this node reads it back — graded by ${scenario}`;

export const EQUIVALENT_MUTANTS: Readonly<Record<string, EquivalentMutant[]>> = Object.freeze({
  'Map Collection': [
    { reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":["scheduled"],"emit":[]', swappedWith: '"set":[],"emit":[]', why: STUCK_FLAG },
    { reducer: 'afterInputs', kind: 'swap-branch', branch: '"set":[],"emit":[]', swappedWith: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG }
  ],
  Model2: [
    {
      reducer: 'afterInputs',
      kind: 'drop-set',
      why:
        "the frame end's bookkeeping left uncleared (jobs, dirty keys, the store flag, the Fetch tokens): the writes the frame did are registry side effects the mutant keeps, and re-running them is silent — " +
        'a store of what the record already holds notifies nothing. Only the Fetch tokens tell, re-reported at the NEXT settle and refused by the interpreter, so a sequence ending at that settle cannot show it (killed by any longer one; scenarios/Model2.json pins the common shape)'
    }
  ],
  NewModel: [
    { reducer: 'derived', why: GRAPH('a held property value or type', 'scenarios/graph/s03-create-new-object-then-read.json') }
  ],
  SetModelProperties: [
    { reducer: 'derived', why: GRAPH('a held property value or type', 'scenarios/graph/s04-set-object-properties-then-read.json') }
  ],
  'Set Variable': [
    { reducer: 'derived', why: GRAPH('the Value to write', 'scenarios/graph/s02-set-variable-then-read.json') },
    { reducer: 'setWith', kind: 'drop-set', why: GRAPH('the Set as choice', 'scenarios/graph/s02-set-variable-then-read.json') }
  ],
  // NSP-013
  'net.noodl.DateParts': [
    {
      reducer: 'input',
      kind: 'drop-set',
      branch: '"set":["input","inputSupplied"],"emit":["failure"]',
      why: 'an unreadable Date stores nothing a later read sees: every part reads as nothing (never sent, so the wire keeps the last readable part) and the next arrival stores afresh before anything reads'
    },
    {
      reducer: 'input',
      kind: 'drop-set',
      branch: '"set":["input","inputSupplied"],"emit":[]',
      why: 'an unsupplied Date (undefined, null, "") stores nothing a later read sees: nothing is sent, and the next arrival stores afresh before anything reads'
    }
  ],
  'net.noodl.ParseCSV': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on CSV yet, or nothing due)' }],
  'net.noodl.ToCSV': [{ reducer: 'afterInputs', kind: 'drop-set', branch: '"set":["scheduled"],"emit":[]', why: STUCK_FLAG + ' (nothing on Items yet, or nothing due)' }]

});
