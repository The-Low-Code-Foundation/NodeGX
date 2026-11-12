#!/usr/bin/env python3
"""s133 — the mutant arms for `the-script-runs-on-arrival.test.ts` (EXP-019 slice 2).

Run from packages/nodegx-export:  python3 ../../dev-docs/tasks/phase-18-code-export-v2/s133-arrival/mutants.py
Each arm edits one file in place, runs the spec, prints the rows that failed, and restores the file (git checkout is
NOT used: the file is written back from the bytes read, so a peer's unstaged edit elsewhere in the tree is untouched).
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path.cwd()
SPEC = 'tests/the-script-runs-on-arrival.test.ts'

ARMS = [
    # (name, file, old, new, what it should kill)
    ('A emitter: no load run when nothing arrived',
     'src/emit/component.ts',
     "        `      if (!${loaded}.current) ${run}();`,",
     "        `      if (false) ${run}();`,",
     'A2 (Tally B, the clock show nothing), A3, A4'),
    ('B emitter: the load run at once, not after the mount effects above',
     'src/emit/component.ts',
     "        `    if (tickedArrival(${tickedRecordArgs(ticked.nodeId)})) {`,",
     "        `    if (tickedArrival(${tickedRecordArgs(ticked.nodeId)}) || !${loaded}.current) {`,",
     'A2, A4 (Ann 2: a run before the parent\'s seed arrives)'),
    ('C emitter: no loaded guard before the timer',
     'src/emit/component.ts',
     "        `    if (${loaded}.current) return;`,",
     "        `    if (false) return;`,",
     'none on this desk? (a re-run of the effect with no arrival: no step reaches it)'),
    ('D plan: an arrival run is not pulsed',
     'src/analyze/plan.ts',
     "(materialize !== undefined && record.def.kind === 'function') || hosted) record.def.pulsed = true;",
     "(materialize !== undefined && record.def.kind === 'function')) record.def.pulsed = true;",
     'C1 (pulsed)'),
    ('E plan: an arrival run\'s reads do not go through its row',
     'src/analyze/plan.ts',
     "const via = def.mode === 'invoked' || def.host !== undefined ? jsMaterializedVars.get(fromNode.id) : undefined;",
     "const via = def.mode === 'invoked' ? jsMaterializedVars.get(fromNode.id) : undefined;",
     'A2 (every reader refused), B3, C1'),
    ('F plan: no arrival run placed when it watches nothing',
     'src/analyze/plan.ts',
     "    if (arrival) {\n      tickedRunPieces.set(node.id, {",
     "    if (arrival && ticked.watch.length > 0) {\n      tickedRunPieces.set(node.id, {",
     'A2/A3 (loaded), B2, C1 (the clock)'),
    ('G plan: a Done on an arrival run is compiled as if a Run sent it',
     'src/analyze/plan.ts',
     "    if (arrival && component.connections.some((c) => c.fromId === node.id && c.fromProperty === 'done')) {",
     "    if (false && arrival && component.connections.some((c) => c.fromId === node.id && c.fromProperty === 'done')) {",
     'C4'),
    ('H plan: the attach pass drops an arrival run\'s signal wire',
     'src/analyze/plan.ts',
     "      isArrivalRun(fromNode) &&\n      !jsArrivalRefusals.has(fromNode.id) &&\n",
     "      isArrivalRun(fromNode) && fromNode.id === '' &&\n      !jsArrivalRefusals.has(fromNode.id) &&\n",
     'C6 (a note says the wire is dropped)'),
    ('I plan: an arrival run is refused again (the slice-2 sentence)',
     'src/analyze/plan.ts',
     "  const compileJsRun = (node: NodeIR): CompiledSink => {\n    if (!isArrivalRun(node)) return compileJsRunOnce(node);",
     "  const compileJsRun = (node: NodeIR): CompiledSink => {\n    if (isArrivalRun(node)) return { defer: 'EXP-019 slice 2' };\n    if (!isArrivalRun(node)) return compileJsRunOnce(node);",
     'A2, C1, C2'),
    ('J library: nothing after the run is handed on (the run never counts as returned)',
     'src/emit/functionRunLib.ts',
     "  returned = true;\n",
     "",
     'E2 (bell and rings empty, chimed never)'),
    ('K emitter: no late handler printed',
     'src/emit/component.ts',
     "    if (def.late !== true) continue;\n    let pulses",
     "    if (def.late !== true || def.fnName.length > 0) continue;\n    let pulses",
     'E2, E3'),
    ('L classifier: no body calls back',
     'src/analyze/jsfun.ts',
     "    if (/\\bOutputs\\b/.test(inner)) return true;",
     "    if (false) return true;",
     'E2, E3, E4'),
    ('M plan: a refused signal\'s wire is skipped by the attach pass anyway',
     'src/analyze/plan.ts',
     "      !pulseRefusals.has(`${fromNode.id}:${connection.fromProperty}`) &&\n      !pulseRefusals.has(fromNode.id)\n",
     "      true\n",
     'C8 (the catch-all sentence)'),
    ('N plan: an arrival run\'s refused signal wires read as values (a row for a body with no value output)',
     'src/analyze/plan.ts',
     "const readers = arrival ? strays.filter((c) => !isSignalWire(c)) :",
     "const readers = arrival ? strays :",
     'C8 (a row minted; TS2345)'),
    ('O classifier: a callback\'s asynchrony is not a trait (the promise refused)',
     'src/analyze/jsfun.ts',
     "  if (asyncGate.pattern.test(scanned) && !jsAwaitsAtTopLevel(body)) traits.push('is asynchronous (it calls back)');",
     "",
     'E1/E2 (promise empty), E3, E4, E6'),
    ('P classifier: every asynchronous Function keeps the gate',
     'src/analyze/jsfun.ts',
     "      if (gate.pattern.test(scanned) && jsAwaitsAtTopLevel(body)) {",
     "      if (gate.pattern.test(scanned)) {",
     'E2, E3, E4'),
]


def run_spec() -> str:
    p = subprocess.run(['nice', '-n', '19', 'npx', 'jest', '--runInBand', SPEC], capture_output=True, text=True)
    out = p.stdout + p.stderr
    # A mutant that does not compile runs no row: say so, never "survived" (s133, arms K and H).
    if re.search(r'Tests:\s+0 total', out) or not re.search(r'Tests:', out):
        return 'DID NOT COMPILE — graded nothing'
    failed = re.findall(r'✕ (\S+)', out)
    total = re.search(r'Tests:\s+(.*)', out)
    return f"{total.group(1) if total else 'no total (compile error?)'} — failed rows: {', '.join(failed) or 'NONE (survived)'}"


def main() -> int:
    survived = 0
    for name, file, old, new, kills in ARMS:
        path = ROOT / file
        original = path.read_bytes()
        text = original.decode('utf-8')
        if text.count(old) != 1:
            print(f'[{name}] SKIP: pattern found {text.count(old)} times in {file}')
            continue
        path.write_text(text.replace(old, new, 1), encoding='utf-8')
        try:
            result = run_spec()
        finally:
            path.write_bytes(original)
        print(f'[{name}] expected to kill: {kills}\n    {result}', flush=True)
        if 'NONE (survived)' in result or 'DID NOT COMPILE' in result:
            survived += 1
    print(f'\n{len(ARMS)} arms, {survived} survived')
    return 1 if survived else 0


if __name__ == '__main__':
    sys.exit(main())
