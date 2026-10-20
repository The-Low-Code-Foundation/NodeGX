# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, the spec run against it (tests/the-undrawn-trigger-is-refused.test.ts); a control arm first.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
ARMS = {
  'control': [],
  'A no owners': [(PLAN, "    found.owners.set(owner, `its trigger, ${labelOf(owner)}, is not drawn: ${why}`);", "    if (owner === '\\u0000') found.owners.set(owner, why);")],
  'B no mounts': [(PLAN, "        found.mounts.set(owner, `its trigger, the Did Mount of ${labelOf(owner)}, is not run: ${why}`);", "        if (owner === '\\u0000') found.mounts.set(owner, why);")],
  'C no dead rows': [(PLAN, "    found.rows.set(fnId, `it reads ${labelOf(fnId)}, which the export never runs, so its outputs are never written: ${why}`);", "    if (fnId === '\\u0000') found.rows.set(fnId, why);")],
  'D a refusal overwrites a collapse': [(PLAN, "    if (dispositions[toNode.id] === undefined) dispositions[toNode.id] = { kind: 'deferred', to: 'EXP-003', reason };", "    if (dispositions[toNode.id] === undefined || toNode.id.length > 0) dispositions[toNode.id] = { kind: 'deferred', to: 'EXP-003', reason };")],
  'E only the element itself': [(PLAN, "    if (at === plan.rootId) break;\n  }\n  return null;\n}", "    if (at === plan.rootId || at.length > 0) break;\n  }\n  return null;\n}")],
  'F no second plan': [(PLAN, "  for (let round = 0; round < 8; round++) {", "  for (let round = 0; round < 0; round++) {")],
  'G the marker says renders': [(EMIT, "    const undrawn = plan.roleOf[nodeId] !== undefined ? undrawnReasonOf(plan, component, nodeId) : null;", "    const undrawn = plan.roleOf[nodeId] !== undefined && nodeId.length < 0 ? undrawnReasonOf(plan, component, nodeId) : null;")],
  'H findings before the lift': [(PLAN, "  for (const legacy of order) liftInto(plannedByLegacy.get(legacy)!);\n", ""), (PLAN, "  // P18-S122-DEADROW. A dead row's readers that are not drawn elements", "  for (const legacy of order) if (plannedByLegacy.get(legacy)!.pendingLifted.length > 0) liftInto(plannedByLegacy.get(legacy)!);\n  // P18-S122-DEADROW. A dead row's readers that are not drawn elements")],
  'I a Mounted wire named without why': [(PLAN, "      const because =\n        dropped !== undefined", "      const because =\n        dropped !== undefined && dropped.length < 0")],
  'J a dead row read by the drawn Text': [(PLAN, "    const deadRow = excluded.rows.get(fromNode.id);\n    if (deadRow !== undefined) {", "    const deadRow = excluded.rows.get(fromNode.id);\n    if (deadRow !== undefined && deadRow.length < 0) {")],
  'K no kept-reader note': [(PLAN, "      planned.notes.push(`node ${fnId}: a handler", "      if (fnId.length < 0) planned.notes.push(`node ${fnId}: a handler")],
}
results = {}
for name, edits in ARMS.items():
    shutil.rmtree(os.path.join(copy, 'src'), ignore_errors=True)
    shutil.copytree(tree_src, os.path.join(copy, 'src'))
    ok = True
    for rel, old, new in edits:
        p = os.path.join(copy, rel); s = open(p).read()
        if s.count(old) != 1: print(name, 'PATTERN NOT FOUND ONCE', rel, repr(old[:60])); ok = False; break
        open(p, 'w').write(s.replace(old, new))
    if not ok: results[name] = 'pattern'; continue
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', 'tests/the-undrawn-trigger-is-refused.test.ts'], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    m = re.search(r'Tests:\s+(?:(\d+) failed, )?(\d+) passed, (\d+) total', text) or re.search(r'Tests:\s+(\d+) failed, (\d+) total', text)
    failed = re.findall(r'✕ (\S+)', text)
    total = re.search(r'(\d+) total', text.split('Tests:')[-1]) if 'Tests:' in text else None
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-400:]}
    print(name, '→', results[name]['summary'], failed)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
