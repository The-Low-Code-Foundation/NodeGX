# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, tests/the-function-succeeds.test.ts run against it (§98); a control arm first. The copy is
# `packages/nx-mut-s130` (the package without node_modules, its node_modules a symlink), removed after.
# ONLY=<arm name prefix>[,…] runs those arms (and the control) alone.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
SPEC = 'tests/the-function-succeeds.test.ts'
ARMS = {
  'control': [],
  'A the base: a Success wire refuses the run': [(PLAN, "      if (node.type === JS_FUNCTION && c.fromProperty === 'success') continue;\n", "")],
  'B Success after Done': [(PLAN, "      then: [...pulses.then, ...success.then, ...done.then],", "      then: [...pulses.then, ...done.then, ...success.then],")],
  'C Success before the own signals': [(PLAN, "      then: [...pulses.then, ...success.then, ...done.then],", "      then: [...success.then, ...pulses.then, ...done.then],")],
  'D a ticked run sends no Success': [(PLAN, "    const tickedThen = [...pulses.then, ...success.then];", "    const tickedThen = [...pulses.then];")],
  'E a ticked run sends Done too': [(PLAN, "    const tickedThen = [...pulses.then, ...success.then];", "    const tickedThen = [...pulses.then, ...success.then, ...done.then];")],
  'F a plain Run is not a statement, so it records nothing': [(EMIT, " || (a.ticked !== true && tickedRunIds.has(a.nodeId))\n", "\n")],
  'G a plain Run prints no record': [(EMIT, "        if (record !== '' && action.then.length === 0) return `tickedArrival(${tickedRecordArgs(action.nodeId)})`;\n", "")],
  'H the attach pass rules Success wires as triggers (wire order)': [(PLAN, "    if (isRunSuccessWire(connection)) continue;\n    consumed.add(connection.key);", "    consumed.add(connection.key);")],
  'I no sweep: a Success wire the compile did not take is named by nothing': [(PLAN, "    if (consumed.has(connection.key) || !isRunSuccessWire(connection)) continue;\n    const fromNode = nodeById.get(connection.fromId)!;", "    if (consumed.has(connection.key) || !isRunSuccessWire(connection) || connection.key.length > 0) continue;\n    const fromNode = nodeById.get(connection.fromId)!;")],
  'J the sweep does not ask the sink first': [(PLAN, "      'defer' in sink\n        ? sink.defer\n        : run !== undefined && 'defer' in run", "      'defer' in sink && sink.defer.length < 0\n        ? sink.defer\n        : run !== undefined && 'defer' in run")],
  'K a reactive Function\'s Success taken as a Run chain': [(PLAN, "connection.fromProperty === 'success' && nodeById.get(connection.fromId)?.type === JS_FUNCTION && wiredPorts.has(`${connection.fromId}:run`);", "connection.fromProperty === 'success' && nodeById.get(connection.fromId)?.type === JS_FUNCTION;")],
  'L a Success chain it cannot run does not refuse the run': [(PLAN, "    const success = node.type === JS_FUNCTION ? doneChainOf(node, 'success') : { then: [], consumes: [], collapses: [], subscribes: [] };\n    if ('defer' in success) return success;\n", "    const successRaw = node.type === JS_FUNCTION ? doneChainOf(node, 'success') : { then: [], consumes: [], collapses: [], subscribes: [] };\n    const success: DoneChain = 'defer' in successRaw ? { then: [], consumes: [], collapses: [], subscribes: [] } : successRaw;\n")],
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
