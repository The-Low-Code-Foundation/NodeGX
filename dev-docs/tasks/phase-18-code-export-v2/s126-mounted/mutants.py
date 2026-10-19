# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, the spec run against it (tests/the-root-is-mounted-when-it-says.test.ts); a control arm first. Every arm's
# emitted apps still typecheck (each changes a decision, not the shape of the code), so a red row is the behaviour's.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
ARMS = {
  'control': [],
  "A HEAD's rule: every root's Mounted is the router's": [(PLAN, "    toProperty === 'mounted' && toNode.id === plan.rootId && toNode.type === 'Page';", "    toProperty === 'mounted' && toNode.id === plan.rootId && toNode.type !== '';")],
  'B the root drawn whatever it says': [(EMIT, "            rootMountedCond = cond;\n", "            rootMountedCond = null;\n")],
  'C no undefined arm': [(EMIT, "    if (!undefinedAtFirst) return cond;", "    if (!undefinedAtFirst || cond.length > 0) return cond;")],
  'D a gated Did Mount runs once, at the component mount': [(EMIT, "    if (gate.length > 0) {\n      const when", "    if (gate.length > 0 && gate.length < 0) {\n      const when")],
  'E the Did Mount ref is not reset by an unmount': [(EMIT, "        `      ${mounted}.current = false;`,\n", "")],
  'F the field announces at the component mount': [(EMIT, "      ...(when !== null ? [`    if (${negatedCode(when)}) return;`] : []),", "      ...(when !== null && when.length < 0 ? [`    if (${negatedCode(when)}) return;`] : []),")],
  'G the plan gives the field no gates': [(PLAN, "          if (!literal && id !== plan.collapsedGroupId) gates.push(id);", "          if (!literal && id !== plan.collapsedGroupId && id.length < 0) gates.push(id);")],
  'H an Expression answer takes the undefined arm': [(EMIT, "    const isExpressionAnswer =\n      source.kind === 'computed'", "    const isExpressionAnswer =\n      false && source.kind === 'computed'")],
  "I a Page's Mounted binds too": [(PLAN, "    toProperty === 'mounted' && toNode.id === plan.rootId && toNode.type === 'Page';", "    toProperty === 'mounted' && toNode.id === plan.rootId && toNode.type === '\\u0000';")],
  'J a Did Mount gated by its own element only': [(EMIT, "&& at !== plan.collapsedGroupId) gates.push(at);", "&& at !== plan.collapsedGroupId && at === id) gates.push(at);")],
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
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', 'tests/the-root-is-mounted-when-it-says.test.ts'], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    failed = re.findall(r'✕ (\S+)', text)
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-600:]}
    print(name, '→', results[name]['summary'], failed, flush=True)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
