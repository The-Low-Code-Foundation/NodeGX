#!/usr/bin/env python3
"""s138 mutants: each removes one part of the fix; the Hook Desk spec must read the named rows red.
Run from packages/nodegx-export. Restores every file from its own saved copy (never git checkout)."""
import subprocess, sys, re, shutil, os
PLAN = 'src/analyze/plan.ts'
EMIT = 'src/emit/component.ts'
SPEC = 'tests/a-logic-component-is-a-hook.test.ts'
M = [
  ('M1 liftInto does not make the lift the items', PLAN,
   "        plan.repeaters[pending.toNodeId].itemsExpr = { kind: 'state-get', name, maybeUndefined: true };\n",
   "", ['A8']),
  ('M2 a row value into a placed component is not bound', PLAN,
   "    if (!rendered.has(toNode.id) || !siblingValueInputOf(toNode, c.toProperty)) continue;\n    const relay = rowRelayOf(fromNode, c.fromProperty);",
   "    if (!rendered.has(toNode.id) || !siblingValueInputOf(toNode, c.toProperty) || toNode.id.length > 0) continue;\n    const relay = rowRelayOf(fromNode, c.fromProperty);", ['A9']),
  ('M3 the relay is not written before the pulse', EMIT,
   "          out.push(`${prop}={${prependStatements(handlerArrow(actions, '()', attrIndent), relayWrites, attrIndent)}}`);",
   "          out.push(`${prop}={${prependStatements(handlerArrow(actions, '()', attrIndent), [], attrIndent)}}`);", ['A9']),
  ('M4 the row guard in compileInstanceSignal is gone', PLAN,
   "    if (row !== undefined) {\n      const repeater = nodeById.get(row);",
   "    if (row !== undefined && row.length < 0) {\n      const repeater = nodeById.get(row);", ['C9']),
  ('M5 a lifted render run is not memoised', EMIT,
   "      if (v.kind === 'jsfun-out' && typeof v.nodeId === 'string' && v.viaState === undefined && jsLocals.has(v.nodeId)) memoJsIds.add(v.nodeId);",
   "", ['A8']),
  ('M6 the hook calls are not walked for render reads', EMIT,
   "  for (const id of [...preOrder(plan), ...plan.hookCalls]) {",
   "  for (const id of [...preOrder(plan)]) {", ['D1', 'E5']),
  ('M7 a reserved word is a Variable local', EMIT,
   "    if (reserved.has(candidate) || isReservedWord(candidate)) candidate = `${exportName}Value`;",
   "    if (reserved.has(candidate) || (isReservedWord(candidate) && candidate.length < 0)) candidate = `${exportName}Value`;", ['E5']),
  ('M8 a relay taken back leaves the binding', PLAN,
   "    if (bound?.kind === 'computed' && bound.expr.kind === 'state-get' && bound.expr.name === relay.stateName) {",
   "    if (bound?.kind === 'computed' && bound.expr.kind === 'state-get' && bound.expr.name === relay.stateName && wire.key.length < 0) {", ['C8']),
  ('M9 a pending lift does not count as fed in the first plan', PLAN,
   "        repeater.itemsLifted !== undefined ||\n        plan.staticData.some((sd) => sd.nodeId === repeater.itemsStaticId));\n    if (fed) continue;",
   "        plan.staticData.some((sd) => sd.nodeId === repeater.itemsStaticId));\n    if (fed) continue;", ['A9']),
]
only = sys.argv[1:]
for name, path, old, new, want in M:
    if only and not any(name.startswith(o) for o in only): continue
    src = open(path).read()
    if src.count(old) != 1:
        print(f'{name}: SITE NOT FOUND ({src.count(old)})', flush=True); continue
    shutil.copy(path, path + '.s138keep')
    try:
        open(path, 'w').write(src.replace(old, new))
        r = subprocess.run(['nice', '-n', '19', 'npx', 'jest', SPEC, '--runInBand', '--verbose'], capture_output=True, text=True)
        out = r.stdout + r.stderr
        red = sorted(set(re.findall(r'✕ ([A-Z]\d+)', out)))
        total = re.search(r'Tests:.*', out)
        killed = all(w in red for w in want)
        print(f"{name}: {'KILLED' if killed else 'SURVIVED'} — red {red} (wanted {want}); {total.group(0) if total else 'NO TESTS LINE'}", flush=True)
    finally:
        shutil.move(path + '.s138keep', path)
