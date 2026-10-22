#!/usr/bin/env python3
"""s141 mutants: each removes one part of the Header fix; the Header spec must read the named rows red.
Run from packages/nodegx-export. Restores every file from its own saved copy (never git checkout).
Each run's jest output is kept in $MUTANT_LOGS (a scratch folder) as <id>.log."""
import os, subprocess, sys, re, shutil
PLAN = 'src/analyze/plan.ts'
EMIT = 'src/emit/component.ts'
SPEC = 'tests/a-header-writes-the-store.test.ts'
LOGS = os.environ.get('MUTANT_LOGS')
M = [
  ('M1 several writers into one output stay refused', PLAN,
   "        if (lifts.some((l) => l === null)) {\n",
   "        if (lifts.length > 0) {\n", ['A2', 'A3', 'B1', 'C1', 'C2', 'E1', 'E2']),
  ('M2 a writer that does not lift leaves the others forwarded', PLAN,
   "      unliftedIntoOutput.set(sinkKeyOf(pending), `instance output",
   "      if (false as boolean) unliftedIntoOutput.set(sinkKeyOf(pending), `instance output", ['C3']),
  ('M3 the forward is handed as a fresh arrow each render', EMIT,
   "      attrs.push(`${lifted.prop}={${combined?.local ?? lifted.setterName}}`);\n",
   "      attrs.push(`${lifted.prop}={${combined?.local ?? (lifted.forward !== undefined ? `(value: any) => ${lifted.setterName}?.(value)` : lifted.setterName)}}`);\n", ['A2']),
  ('M4 a placed component is not handed its own Mounted (P18-S141-MOUNTEDIN)', EMIT,
   "        if (mountedAttr !== null && mountedExpr !== null) attrs.push(`${mountedAttr}={${mountedExpr}}`);\n",
   "", ['F2', 'F3', 'F4']),
]
only = sys.argv[1:]
for name, path, old, new, want in M:
    if only and not any(name.startswith(o + ' ') for o in only): continue
    src = open(path).read()
    if src.count(old) != 1:
        print(f'{name}: SITE NOT FOUND ({src.count(old)})', flush=True); continue
    shutil.copy(path, path + '.s141keep')
    try:
        open(path, 'w').write(src.replace(old, new))
        r = subprocess.run(['nice', '-n', '19', 'npx', 'jest', SPEC, '--runInBand', '--verbose'], capture_output=True, text=True)
        out = r.stdout + r.stderr
        if LOGS: open(os.path.join(LOGS, name.split(' ')[0] + '.log'), 'w').write(out)
        red = sorted(set(re.findall(r'✕ ([A-Z]\d+)', out)))
        total = re.search(r'Tests:.*', out)
        killed = all(w in red for w in want)
        print(f"{name}: {'KILLED' if killed else 'SURVIVED'} — red {red} (wanted {want}); {total.group(0) if total else 'NO TESTS LINE'}", flush=True)
    finally:
        shutil.move(path + '.s141keep', path)
