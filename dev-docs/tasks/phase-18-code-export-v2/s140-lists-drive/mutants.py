#!/usr/bin/env python3
"""s140 mutants: each removes one part of the TEXTAREA fix; the Text Area spec must read the named rows red.
Run from packages/nodegx-export. Restores every file from its own saved copy (never git checkout).
Each run's jest output is kept in $MUTANT_LOGS (a scratch folder) as <id>.log."""
import os, subprocess, sys, re, shutil
EMIT = 'src/emit/component.ts'
SCAFFOLD = 'src/emit/scaffold.ts'
SPEC = 'tests/a-text-area-keeps-its-lines.test.ts'
LOGS = os.environ.get('MUTANT_LOGS')
M = [
  ('M1 a Text Area is drawn as an input', EMIT,
   "    if (role === 'input' && isTextArea(nodeById.get(id))) return 'textarea';\n",
   "", ['A2', 'B1']),
  ('M2 the textarea still prints type="textArea"', EMIT,
   "      if (attr === 'type' && isTextArea(node)) continue;\n",
   "", ['B1', 'B3']),
  ('M3 its ref is typed for an input', EMIT,
   "isTextArea(nodeById.get(inputId)) ? 'HTMLTextAreaElement' : 'HTMLInputElement'",
   "'HTMLInputElement'", ['B2', 'C1']),
  ('M4 the textarea can be resized', SCAFFOLD,
   "\ntextarea {\n  resize: none;\n}\n",
   "\n", ['B4']),
]
only = sys.argv[1:]
for name, path, old, new, want in M:
    if only and not any(name.startswith(o + ' ') for o in only): continue
    src = open(path).read()
    if src.count(old) != 1:
        print(f'{name}: SITE NOT FOUND ({src.count(old)})', flush=True); continue
    shutil.copy(path, path + '.s140keep')
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
        shutil.move(path + '.s140keep', path)
