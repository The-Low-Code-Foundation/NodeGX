#!/usr/bin/env python3
"""s132 — the mutant arms for `the-script-travels-as-written.test.ts` (EXP-019 slice 1).

Run from packages/nodegx-export:  python3 ../../dev-docs/tasks/phase-18-code-export-v2/s132-hostgates/mutants.py
Each arm edits one file in place, runs the spec, prints the rows that failed, and restores the file (git checkout is
NOT used: the file is written back from the bytes read, so a peer's unstaged edit elsewhere in the tree is untouched).
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path.cwd()
SPEC = 'tests/the-script-travels-as-written.test.ts'

ARMS = [
    # (name, file, old, new, what it should kill)
    ('A plan: a hosted run is not pulsed',
     'src/analyze/plan.ts',
     "(materialize !== undefined && record.def.kind === 'function') || hosted) record.def.pulsed = true;",
     "(materialize !== undefined && record.def.kind === 'function')) record.def.pulsed = true;",
     'C3 (pulsed), and A3/A4 if the emitter follows the plan'),
    ('B emitter: a hosted run keeps no node',
     'src/emit/component.ts',
     "const runIsHosted = (nodeId: string): boolean => (jsFunByNode[nodeId]?.host?.length ?? 0) > 0;",
     "const runIsHosted = (_nodeId: string): boolean => false;",
     'B3/B4 (no runFunction), A3 (count 1), A4'),
    ('C wrapper: the body runs bound to a fresh object',
     'src/emit/component.ts',
     "lines.push(keepsThis ? '    }).call(self);' : '    })();');",
     "lines.push(keepsThis ? '    }).call({});' : '    })();');",
     'B1, A3 (count stays 1), A4'),
    ('D library: the node\'s self is not handed to the body',
     'src/emit/functionRunLib.ts',
     "body(inputs, outputs as unknown as O, node.self);",
     "body(inputs, outputs as unknown as O, {});",
     'B5, A3, A4'),
    ('E plan: the reactive refusal is gone (a traited body with no Run wire goes through)',
     'src/analyze/plan.ts',
     "if (host.length > 0 && !wiredPorts.has(`${node.id}:run`)) {",
     "if (false && host.length > 0 && !wiredPorts.has(`${node.id}:run`)) {",
     'C4'),
    ('F classifier: the clock is a gate again',
     'src/analyze/jsfun.ts',
     "/^(keeps state on `this`|reads the clock|draws randomness|reaches the network|schedules timers|touches the browser environment)/",
     "/^(keeps state on `this`|draws randomness|reaches the network|schedules timers|touches the browser environment)/",
     'C1 (traits), C3 (host length 4), A5 (the stamp refused)'),
]


def run_spec() -> str:
    p = subprocess.run(['npx', 'jest', '--runInBand', SPEC], capture_output=True, text=True)
    out = p.stdout + p.stderr
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
        print(f'[{name}] expected to kill: {kills}\n    {result}')
        if 'NONE (survived)' in result:
            survived += 1
    print(f'\n{len(ARMS)} arms, {survived} survived')
    return 1 if survived else 0


if __name__ == '__main__':
    sys.exit(main())
