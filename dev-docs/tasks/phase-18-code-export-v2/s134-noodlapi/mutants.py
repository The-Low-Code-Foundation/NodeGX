#!/usr/bin/env python3
"""s134 — the mutant arms for `the-noodl-api-travels.test.ts` (EXP-020 with EXP-019 slice 1b).

Run from packages/nodegx-export:  python3 ../../dev-docs/tasks/phase-18-code-export-v2/s134-noodlapi/mutants.py
Each arm edits one file in place, runs the spec, prints the rows that failed, and restores the file (git checkout is
NOT used: the file is written back from the bytes read, so a peer's unstaged edit elsewhere in the tree is untouched).
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path.cwd()
SPEC = 'tests/the-noodl-api-travels.test.ts'

ARMS = [
    # (name, file, old, new, what it should kill)
    ('A plan: an awaited run is not an awaited action (never detached)',
     'src/analyze/plan.ts',
     "    (kind === 'jsfun-run' && typeof (value as { awaitsAt?: unknown }).awaitsAt === 'number')",
     "    (kind === 'jsfun-run' && typeof (value as { awaitsAt?: unknown }).awaitsAt === 'boolean')",
     'A5 (seen: not yet), C4'),
    ('B emitter: an awaited run printed flat (Success and Done before the body finishes)',
     'src/emit/component.ts',
     "          ? a.awaitsAt !== undefined\n            ? [a]",
     "          ? a.awaitsAt !== undefined && a.nodeId === ''\n            ? [a]",
     'A2 (doneN reads the count before it), A5, A6b, C4'),
    ('C library: settled resolves at once',
     'src/emit/functionRunLib.ts',
     "settled: Promise.resolve(finished).then(() => undefined)",
     "settled: Promise.resolve(finished && undefined).then(() => undefined)",
     'A2/A6b (doneN), C5'),
    ('D classifier: a top-level await is not a late writer',
     'src/analyze/jsfun.ts',
     "  if (jsAwaitsAtTopLevel(body) && /\\bOutputs\\b/.test(scanned)) return true;",
     "",
     'A2 (n, first, who … never arrive)'),
    ('E plan: the wrapper is not marked async',
     'src/analyze/plan.ts',
     "        ...(kind === 'function' && jsAwaitsAtTopLevel(body) ? { awaits: true as const } : {}),",
     "",
     'A2 (the app does not build), D5, E1'),
    ('F library: a plain row keeps its pointer envelope',
     'src/emit/noodlLib.ts',
     "      if (value.__type === 'Pointer' && value.objectId !== undefined) {\n        row[key] = value.objectId;",
     "      if (value.__type === 'Pointer' && value.objectId === null) {\n        row[key] = value.objectId;",
     'A2 (first), B1, B5'),
    ('G library: a refused filter rejects with an Error, not the words',
     'src/emit/noodlLib.ts',
     "    if (e instanceof FilterTranslationError) throw e.message;",
     "    if (e instanceof FilterTranslationError) throw e;",
     'A2 (bad), B1, B3'),
    ('H library: a Cloud Function refusal is an Error',
     'src/emit/noodlLib.ts',
     "  throw body !== undefined\n    ? body\n",
     "  throw body !== undefined\n    ? new Error(String((body as { error?: unknown }).error))\n",
     'A2 (locked), B1, B5'),
    ('I library: the signed-in user\'s id is not the session\'s objectId',
     'src/emit/noodlLib.ts',
     "    currentUser.id = String(session.objectId);",
     "    currentUser.id = String(session.id);",
     'A2 (who), B1'),
    ('J classifier: a query without plain passes',
     'src/analyze/jsfun.ts',
     "      if (!/\\bplain\\s*:\\s*true\\b/.test(callArgumentsAt(after, open))) {",
     "      if (false) {",
     'D3'),
    ('K emitter: no Variables facade (the library alone)',
     'src/emit/component.ts',
     "        if (pairs.length === 0) lines.push('  const Noodl = noodl;');",
     "        if (pairs.length >= 0) lines.push('  const Noodl = noodl;');",
     'A2 (note), C3'),
    ('L emitApp: the client carries no noodlRequest',
     'src/emit/emitApp.ts',
     "    (noodl ? NOODL_REQUEST_SOURCE : '')",
     "    ''",
     'A2/B1 (export arm cannot build), C1, E1'),
    ('M emitter: the late handler is never async',
     'src/emit/component.ts',
     "`  ${names.node}.late = ${pulses !== undefined && actionsAwait([pulses]) ? 'async ' : ''}(${names.run}) => {`,",
     "`  ${names.node}.late = ${pulses === null ? 'async ' : ''}(${names.run}) => {`,",
     'A2 (again; the app does not build), E1'),
    ('N parse: a column\'s targetClass is dropped',
     'src/parse/parseProject.ts',
     "        ...(typeof col.targetClass === 'string' ? { targetClass: col.targetClass } : {})",
     "",
     'B1 (pointsTo refused), B4, C1'),
    ('O library: text on a Date column goes as text',
     'src/emit/noodlLib.ts',
     "  if (SCHEMA[collection]?.[field]?.type === 'Date' && raw !== null && raw !== undefined) {",
     "  if (SCHEMA[collection]?.[field]?.type === 'Date' && raw === 0) {",
     'B1, B4'),
    ('P library: the query sends no keys (select)',
     'src/emit/noodlLib.ts',
     "    keys: joined(options?.select),",
     "",
     'B2'),
    ('Q emitApp: no library emitted',
     'src/emit/emitApp.ts',
     "  if (noodlLibUsed) {\n    files[NOODL_LIB_PATH]",
     "  if (noodlLibUsed && !noodlLibUsed) {\n    files[NOODL_LIB_PATH]",
     'everything that reads the backend'),
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
