#!/usr/bin/env python3
"""s136 — the mutant arms for `a-logic-component-is-a-hook.test.ts` (EXP-021 slice 1) and the two P18-S126-PAGEGROUP rows.

Run from packages/nodegx-export:  python3 ../../dev-docs/tasks/phase-18-code-export-v2/s136-hooks/mutants.py
Each arm edits one file in place, runs the specs, prints the rows that failed, and restores the file (git checkout is
NOT used: the file is written back from the bytes read, so a peer's unstaged edit elsewhere in the tree is untouched).
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path.cwd()
SPECS = ['tests/a-logic-component-is-a-hook.test.ts', 'tests/the-root-is-mounted-when-it-says.test.ts', 'tests/the-field-announces-at-mount.test.ts']

ARMS = [
    ('A plan: a placed logic component is never a hook (it bails as before)',
     'src/analyze/plan.ts',
     "isLogicComponent(component, ir, catalog, kits) && isPlaced(ir, plan.legacyPath)) {",
     "isLogicComponent(component, ir, catalog, kits) && isPlaced(ir, plan.legacyPath) && plan.legacyPath === '') {",
     'A2, B1, C1'),
    ('B plan: a placement is never listed as a call',
     'src/analyze/plan.ts',
     "    plan.hookCalls.push(node.id);\n  };",
     "  };",
     'A2, B3, C2'),
    ('C plan: a logic component\'s signal input is not a trigger (no pulse crosses)',
     'src/analyze/plan.ts',
     "    if (!pageFileByPath.has(target.path) && isLogicComponent(target, ir, catalog, kits)) return true;",
     "    if (!pageFileByPath.has(target.path) && isLogicComponent(target, ir, catalog, kits) && target.path === '') return true;",
     'A2, A4, A5, A6'),
    ('D plan: a Component Outputs value is not a row reader (s122\'s guard back)',
     'src/analyze/plan.ts',
     "    reader.type === 'Component Outputs' ||",
     "    reader.type === 'Component Outputs (never)' ||",
     'A2, A4, A6, C6'),
    ('E plan: the lift pass does not compile a Run-wired feeder first',
     'src/analyze/plan.ts',
     "        compiledOf(from, 'run');\n      }\n      const ctx = newCtx();",
     "      }\n      const ctx = newCtx();",
     'A2, C6'),
    ('F plan: a Function\'s value is not bound into a placed component\'s input',
     'src/analyze/plan.ts',
     "      siblingValueInputOf(toNode, connection.toProperty);\n    if (!bindable) continue; // the sweep names the reason\n    if (routerMounted(toNode, connection.toProperty)) continue; // the sweep names the reason\n    // P18-S122-DEADROW. A drawn element",
     "      false;\n    if (!bindable) continue; // the sweep names the reason\n    if (routerMounted(toNode, connection.toProperty)) continue; // the sweep names the reason\n    // P18-S122-DEADROW. A drawn element",
     'A2, A3, B3'),
    ('G plan: a Group whose Mounted is wired is folded into the page again (P18-S126-PAGEGROUP back)',
     'src/analyze/plan.ts',
     "      !component.connections.some((c) => c.toId === rootChildren[0] && c.toProperty === 'mounted')",
     "      true",
     'C5 (root-is-mounted), the page-group row (field-announces)'),
    ('H emitter: a query\'s rows are no push dependency (P18-S136-QUERYPUSH back)',
     'src/emit/component.ts',
     "        case 'query-get':\n          add(e.stateName);\n          break;",
     "        case 'query-get':\n          break;",
     'E1'),
    ('I plan: a chain-local answer is watched (P18-S136-CHAINWATCH back)',
     'src/analyze/plan.ts',
     "      if (readsChainAnswer(input.expr)) {",
     "      if (readsChainAnswer(input.expr) && input.name === '') {",
     'E3'),
    ('J plan: a list of lists prints `readonly readonly` (P18-S136-NESTEDROWS back)',
     'src/analyze/plan.ts',
     "`readonly ${elemTypes[0]}[]` : `readonly (${elemTypes[0]})[]`;",
     "`readonly ${elemTypes[0]}[]` : `readonly ${elemTypes[0]}[]`;",
     'E4'),
    ('K emitter: a hook\'s props have no default',
     'src/emit/component.ts',
     "${plan.hook === true ? ' = {}' : ''}",
     "${plan.hook === true ? '' : ''}",
     'B1'),
    ('L emitter: no type assertion at a typed prop',
     'src/emit/component.ts',
     "      attrs.push(`${attr}={${cast ? ",
     "      attrs.push(`${attr}={${cast && attr === '' ? ",
     'E6'),
    ('M emitter: an Expression\'s inferred type is not known to differ',
     'src/emit/component.ts',
     "      if (def?.kind === 'expression') return 'inferred';",
     "      if (def?.kind === 'expression') return undefined;",
     'E6'),
    ('N plan: a logic placement can root a component (todo-list\'s AddAction draws `<useWriteHistory />`)',
     'src/analyze/plan.ts',
     "roleOf(n) !== 'slot' && !placesLogic(n);",
     "roleOf(n) !== 'slot';",
     'E2'),
    ('O emitter: a hook returns null like a rootless component',
     'src/emit/component.ts',
     "  if (plan.hook === true) body.push(...preReturnComment, '}');",
     "  if (plan.hook === true) body.push(...preReturnComment, '  return null;', '}');",
     'B1'),
    ('P plan: a logic placement inside the tree is walked as a child',
     'src/analyze/plan.ts',
     "      if (childRole === 'instance' && placesLogic(child)) {",
     "      if (childRole === 'instance' && placesLogic(child) && child.id === '') {",
     'C4'),
    ('Q emitter: no hook calls printed',
     'src/emit/component.ts',
     "  if (hookCallLines.length > 0) body.push(",
     "  if (hookCallLines.length > 0 && plan.path === '') body.push(",
     'A2, B3, E5'),
]


def run_spec() -> str:
    p = subprocess.run(['nice', '-n', '19', 'npx', 'jest', '--runInBand', '--verbose', *SPECS], capture_output=True, text=True)
    out = p.stdout + p.stderr
    # A mutant that does not compile runs no row: say so, never "survived" (s133, arms K and H).
    if re.search(r'Tests:\s+0 total', out) or not re.search(r'Tests:', out):
        return 'DID NOT COMPILE — graded nothing'
    failed = re.findall(r'✕ (\S+)', out)
    # A suite that fails to load (its module-scope desk throws) runs no row and is a kill: name it, never "survived".
    crashed = re.findall(r'FAIL (\S+)', out) if re.search(r'Test suite failed to run', out) else []
    total = re.search(r'Tests:\s+(.*)', out)
    suites = re.search(r'Test Suites:\s+(.*)', out)
    named = failed + [f'SUITE {c} failed to run' for c in crashed]
    return f"{total.group(1) if total else 'no total'} | suites {suites.group(1) if suites else '?'} — failed rows: {', '.join(named) or 'NONE (survived)'}"


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
