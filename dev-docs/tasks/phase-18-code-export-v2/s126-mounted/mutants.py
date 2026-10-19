# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, the spec run against it (tests/the-root-is-mounted-when-it-says.test.ts); a control arm first. Every arm's
# emitted apps still typecheck (each changes a decision, not the shape of the code), so a red row is the behaviour's.
# G was first `!literal && id.length < 0`, which broke the narrowing of `bound` below it and read "0 total": reshaped.
# ONLY=<arm name prefix>[,…] runs those arms (and the control) alone.
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
  'G the plan gives the field no gates': [(PLAN, "          else if (!literal) gates.push(id);", "          else if (!literal) gates.push(...[id].filter((x) => x.length < 0));")],
  'H an Expression answer takes the undefined arm': [(EMIT, "nodeById.get(source.expr.nodeId)?.type === 'Expression';", "nodeById.get(source.expr.nodeId)?.type === 'Expression' && id.length < 0;")],
  "I a Page's Mounted binds too": [(PLAN, "    toProperty === 'mounted' && toNode.id === plan.rootId && toNode.type === 'Page';", "    toProperty === 'mounted' && toNode.id === plan.rootId && toNode.type === '\\u0000';")],
  'J a Did Mount gated by its own element only': [(EMIT, "        if (bound !== undefined && !(bound.kind === 'computed' && bound.expr.kind === 'literal')) gates.push(at);", "        if (bound !== undefined && !(bound.kind === 'computed' && bound.expr.kind === 'literal') && at === id) gates.push(at);")],
  "K a Did Mount in a page's own wired Group is not refused": [(PLAN, "    if (!inside) continue;", "    if (!inside || inside) continue;")],
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
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', 'tests/the-root-is-mounted-when-it-says.test.ts'], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    failed = re.findall(r'✕ (\S+)', text)
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-600:]}
    print(name, '→', results[name]['summary'], failed, flush=True)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
