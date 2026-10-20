# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, the spec run against it (tests/the-signal-arrives-in-the-component.test.ts); a control arm first. The copy
# is `packages/nx-mut-s127` (the package without node_modules, its node_modules a symlink), removed after.
# ONLY=<arm name prefix>[,…] runs those arms (and the control) alone.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
EFFECT = """      '  useEffect(() => {',
      `    if (${pair} === undefined || ${pair}.taken.current === ${pair}.sent) return;`,
      `    ${pair}.taken.current = ${pair}.sent;`,"""
ARMS = {
  'control': [],
  "A the base's rule: a placed component's signal input is no trigger": [(PLAN, "    if (target === undefined || !signalInputPortsOf(target).has(port)) return false;", "    if (target === undefined || !signalInputPortsOf(target).has(port) || port.length > 0) return false;")],
  'B a signal input runs no chain inside': [(PLAN, "    if (fromNode?.type === 'Component Inputs' && signalInputPortsOf(component).has(connection.fromProperty)) {", "    if (fromNode?.type === 'Component Inputs' && signalInputPortsOf(component).has(connection.fromProperty) && connection.key.length < 0) {")],
  'C no count taken: the chain runs on every effect run': [(EMIT, "      `    if (${pair} === undefined || ${pair}.taken.current === ${pair}.sent) return;`,", "      `    if (${pair} === undefined) return;`,")],
  "D the count taken is the child's, booted at its mount (the first build)": [
    (EMIT, EFFECT, """      `  const ${pair}Here = useRef(${pair}?.sent);`,
      '  useEffect(() => {',
      `    if (${pair} === undefined || ${pair}Here.current === ${pair}.sent) return;`,
      `    ${pair}Here.current = ${pair}.sent;`,"""),
    (EMIT, "plan.tickedRuns.length > 0 || plan.instancePulses.length > 0) reactImports.push('useRef');", "plan.tickedRuns.length > 0 || plan.instancePulses.length > 0 || plan.inputPulses.length > 0) reactImports.push('useRef');")],
  'E one count per placed component, not per port': [(PLAN, "    const key = `${node.id}\\u0000${port}`;\n    let stateVar = instancePulseVars.get(key);", "    const key = `${node.id}\\u0000${port.slice(0, 0)}`;\n    let stateVar = instancePulseVars.get(key);")],
  'F the effect keyed on nothing: it runs at mount only': [(EMIT, "      `  }, [${pair}?.sent]);`,", "      '  }, []);',")],
  'G a refused sender defers the placed component': [(PLAN, "    if (dispositions[id]?.kind !== 'deferred' || before?.kind === 'deferred') continue;", "    if (dispositions[id]?.kind !== 'deferred' || before?.kind === 'deferred' || id.length > 0) continue;")],
  'H a count nothing adds to is kept': [(PLAN, "  if (instancePulseVars.size > 0) {", "  if (instancePulseVars.size < 0) {")],
  "I a logic component's input is pulsed too": [(PLAN, "    return target.nodes.some((n) => {\n      if (n.parent !== undefined) return false;\n      const role = renderRole(n, catalog, kits);\n      return role !== null && role !== 'unsupported' && role !== 'radio';\n    });\n  };", "    return target.nodes.length >= 0;\n  };")],
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
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', 'tests/the-signal-arrives-in-the-component.test.ts'], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    failed = re.findall(r'✕ (\S+ \S+)', text)
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-600:]}
    print(name, '→', results[name]['summary'], failed, flush=True)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
