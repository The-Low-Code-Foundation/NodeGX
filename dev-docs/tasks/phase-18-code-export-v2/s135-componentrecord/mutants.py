#!/usr/bin/env python3
"""s135 — the mutant arms for `the-component-record-travels.test.ts` (EXP-020 slice 2, the component's record).

Run from packages/nodegx-export:  python3 ../../dev-docs/tasks/phase-18-code-export-v2/s135-componentrecord/mutants.py
Each arm edits one file in place, runs the spec, prints the rows that failed, and restores the file (git checkout is
NOT used: the file is written back from the bytes read, so a peer's unstaged edit elsewhere in the tree is untouched).
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path.cwd()
SPEC = 'tests/the-component-record-travels.test.ts'

ARMS = [
    # (name, file, old, new, what it should kill)
    ('A emitter: each kept node gets a record of its own (the instance\'s Functions do not share one)',
     'src/emit/component.ts',
     "    const scope = def.component === true ? `, ${COMPONENT_SCOPE_LOCAL}` : '';",
     "    const scope = def.component === true ? ', createComponentScope()' : '';",
     'A2, A4 (Read reads an empty record), B2'),
    ('B library: every record shares one data object (two placements read one record)',
     'src/emit/componentScopeLib.ts',
     "    '  record.data = {};',",
     "    '  record.data = ((globalThis as any).__sharedRecordData ??= {});',",
     'A2, A5'),
    ('C library: a property write lands on the record object, not in its data',
     'src/emit/componentScopeLib.ts',
     "    '      obj.set(prop as string, value);',",
     "    '      obj[prop] = value;',",
     'A2, A4 (word is not in get, keys read n)'),
    ('D library: the id is writable',
     'src/emit/componentScopeLib.ts',
     "    \"    } else if (prop === 'id') {\",",
     "    \"    } else if (prop === 'never-the-id') {\",",
     'A2, A3 (keys read id), A4'),
    ('E library: a name the record does not hold reads undefined, not its data',
     'src/emit/componentScopeLib.ts',
     "    '    else return target.get(prop as string);',",
     "    '    else return undefined;',",
     'A2, A4 (.n reads nothing), B4'),
    ('F run library: the body is not handed the scope',
     'src/emit/functionRunLib.ts',
     "  const finished = body(inputs, outputs as unknown as O, node.self, node.component);",
     "  const finished = body(inputs, outputs as unknown as O, node.self);",
     'A2–A5 (the body throws on Component.Object)'),
    ('G classifier: Component.Object is not a host trait (the body is not kept)',
     'src/analyze/jsfun.ts',
     "  if (jsComponentUseOf(body).reads) traits.push(\"reads its component's record (Component.Object)\");",
     "",
     'C3, C4, C6 (the desk\'s bodies are kept anyway: their outputs are read between runs, P18-S121-FRESHOUTPUTS)'),
    ('H plan: a family node beside the body refuses nothing',
     'src/analyze/plan.ts',
     "        if (family !== undefined) {\n          return {\n            defer: `the ${word} reads \\`Component.Object\\` in a component",
     "        if (family !== undefined && family.id === '') {\n          return {\n            defer: `the ${word} reads \\`Component.Object\\` in a component",
     'C5'),
    ('I classifier: the scope\'s other members are carried',
     'src/analyze/jsfun.ts',
     "    if (member[1] !== 'Object' || /^",
     "    if (member[1] === 'NeverAMember' || /^",
     'C2'),
    ('J emitter: no `_self` slot, so the scope arrives third (as `self`)',
     'src/emit/component.ts',
     "${keepsThis ? '' : ', _self: Record<string, any> = {}'}, Component?: ComponentScope",
     ", Component?: ComponentScope",
     'A2–A5, B1'),
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
