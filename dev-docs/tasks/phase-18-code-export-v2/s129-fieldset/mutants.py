# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, tests/the-field-does-what-it-is-told.test.ts run against it (§97); a control arm first. The copy is
# `packages/nx-mut-s129` (the package without node_modules, its node_modules a symlink), removed after.
# ONLY=<arm name prefix>[,…] runs those arms (and the control) alone.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
SPEC = 'tests/the-field-does-what-it-is-told.test.ts'
ARMS = {
  'control': [],
  'A the base: a Set is not a trigger': [(PLAN, "toProperty === 'clear' || toProperty === 'set' || toProperty === 'focus'", "toProperty === 'clear' || toProperty === 'focus'")],
  'B Focus and Blur are refused': [(PLAN, "    return { action: { kind: 'field-focus', inputId: node.id, focus: port === 'focus' }, consumes: [] };", "    return { defer: 'mutant' };")],
  'C no focus test: a focused field takes the Set': [(EMIT, "return [`if (${ref}.current !== document.activeElement) {`", "return [`if (${ref}.current !== undefined) {`")],
  'D no Cleared mark: a Set after a Clear writes the Value': [(EMIT, "    if (!fieldSetSources.has(inputId)) continue;\n    fieldClearedLocals.set", "    if (inputId.length > 0) continue;\n    fieldClearedLocals.set")],
  'E the mark is lifted only by a change of value (the prediction)': [(EMIT, "      ...(store !== null\n", "      ...(store !== null && store.length < 0\n")],
  'F CLEAROUT: a Clear runs no chain': [(EMIT, "    return fieldClearedLocals.has(a.field.inputId) || (!printingFieldChains.has(a.field.inputId) && fieldChainOf(a.field.inputId).length > 0);", "    return fieldClearedLocals.has(a.field.inputId);"), (EMIT, "...(cleared !== undefined ? [`${at}${cleared}.current = true;`] : []), ...chainLines(\"''\", indent)];", "...(cleared !== undefined ? [`${at}${cleared}.current = true;`] : [])];")],
  'G a Set runs no chain': [(EMIT, "    body.push(`${inner}${setter}(${code});`, ...chainLines(code, indent + 2));", "    body.push(`${inner}${setter}(${code});`);")],
  'H a Set reads the Value as the render last saw it': [(EMIT, "        `${inner}const ${value} = ${exprCode(action.expr, 'handler')};`,", "        `${inner}const ${value} = ${exprCode(action.expr, 'render')};`,")],
  'I On Enter is not the Enter key': [(EMIT, "      if (port === 'onEnter' && plan.roleOf[node.id] === 'input') {", "      if (port === 'onEnter' && plan.roleOf[node.id] === 'input' && port.length < 0) {")],
  'J a refused Set defers the drawn field': [(PLAN, "    if (plan.roleOf[node.id] === 'instance' || plan.roleOf[node.id] === 'input') instanceBeforeAttach", "    if (plan.roleOf[node.id] === 'instance') instanceBeforeAttach")],
  "K a field's row may take its store's name": [(PLAN, "    usedStateVarNames.has(name) ||\n    storeNameTaken(name) ||", "    usedStateVarNames.has(name) ||")],
  'L a read after the Set is snapped to the Value': [(PLAN, "          snap.set(action.name, action.field?.port === 'set' ? 'op' : e);", "          snap.set(action.name, e);")],
  'M a Focus with its outcome consumed is not refused': [(PLAN, "      (c) => c.fromId === node.id && (c.fromProperty === 'done' || c.fromProperty === 'unchanged')\n    );\n    if (consumedOutcome) {\n      return { defer: `its ${consumedOutcome.fromProperty} outcome is consumed — change-conditional pulses are not translated in this slice` };\n    }\n    return { action: { kind: 'field-focus'", "      (c) => c.fromId === node.id && c.fromProperty === 'mutant'\n    );\n    if (consumedOutcome) {\n      return { defer: `its ${consumedOutcome.fromProperty} outcome is consumed — change-conditional pulses are not translated in this slice` };\n    }\n    return { action: { kind: 'field-focus'")],
  'N the Set writes the start value for an undefined Value as text, never the authored one': [(EMIT, "      const coerced = field.start === undefined || field.start === '' ? asText : `${value} === undefined ? ${start} : ${asText}`;", "      const coerced = asText;")],
}
results = {}
only = [x for x in os.environ.get('ONLY', '').split(',') if x]
for name, edits in ARMS.items():
    if only and name != 'control' and not any(name.startswith(o) for o in only): continue
    shutil.rmtree(os.path.join(copy, 'src'), ignore_errors=True)
    shutil.copytree(tree_src, os.path.join(copy, 'src'))
    ok = True
    for rel, old, new in edits:
        p = os.path.join(copy, rel); s = open(p).read()
        if s.count(old) != 1: print(name, 'PATTERN NOT FOUND ONCE', rel, repr(old[:60])); ok = False; break
        open(p, 'w').write(s.replace(old, new))
    if not ok: results[name] = 'pattern'; continue
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', SPEC], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    failed = re.findall(r'✕ (\S+)', text)
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-600:]}
    print(name, '→', results[name]['summary'], failed, flush=True)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
