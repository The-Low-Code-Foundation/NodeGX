# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, tests/the-row-is-read-where-it-fires.test.ts run against it (EXP-011 §100); a control arm first. The copy is
# `packages/nx-mut-s131` (the package without node_modules, its node_modules a symlink), removed after. Each arm is
# typechecked (`tsc --noEmit -p` in the copy) before its spec runs: an arm that does not compile grades nothing.
# ONLY=<arm name prefix>[,…] runs those arms (and the control) alone.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
SPEC = 'tests/the-row-is-read-where-it-fires.test.ts'
ARMS = {
  'control': [],
  'A the base: a relayed value read in a row\'s chain is refused': [(PLAN,
    "      if (rowChainScopes[rowChainScopes.length - 1] !== fromNode.id) {",
    "      if (fromNode.id.length >= 0) {")],
  'B the read prints the output\'s name as the field': [(EMIT,
    "rowRelayCode.read(expr.input) : 'undefined';",
    "rowRelayCode.read(expr.output) : 'undefined';")],
  'C the cache is not kept per scope': [(PLAN,
    "    const key = scopes !== undefined ? scopedKey : basePlain;",
    "    const key = scopes !== undefined && scopedKey === 'mutant' ? scopedKey : basePlain;")],
  'D a row\'s read is valid in any handler': [(PLAN,
    "        return context.kind === 'dom' && context.nodeId === expr.repeaterId && (context.port?.startsWith(ITEM_OUTPUT_SIGNAL) ?? false);",
    "        return context.kind === 'dom' || expr.repeaterId.length >= 0;")],
  'E a read does not climb to the compile that asked': [(PLAN,
    "    if (touched.size > 0 || relayTouchedKeys.has(basePlain)) relayTouches[relayTouches.length - 1]?.add(rowScope ?? 'none');",
    "    if (touched.size < 0) relayTouches[relayTouches.length - 1]?.add(rowScope ?? 'none');")],
  'G the sweep asks outside the sender\'s row scope': [(PLAN,
    "    const scope = [...(scopes ?? [])].find((s): s is string => s !== null) ?? null;",
    "    const scope = [...(scopes ?? [])].find((s): s is string => s === 'mutant') ?? null;")],
  'H a standing input takes the chain\'s rule': [(PLAN,
    "      if (jsResolving.size > 0) {\n        ctx.defer = `it reads the repeater",
    "      if (jsResolving.size < 0) {\n        ctx.defer = `it reads the repeater")],
  'I a repeater that draws no rows keeps its chains collapsed': [(PLAN,
    "(nodeById.get(owner)?.type === 'For Each' ? rowlessReasonOf(plan, owner) : null);",
    "(nodeById.get(owner)?.type === 'mutant' ? rowlessReasonOf(plan, owner) : null);")],
  'K the row callback does not hold the row while it prints': [(EMIT,
    "        rowRelayCode = { repeaterId: node.id, read: (input) => {",
    "        rowRelayCode = { repeaterId: 'mutant', read: (input) => {")],
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
    t = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/tsc', '--noEmit', '-p', 'tsconfig.json'], cwd=copy, capture_output=True, text=True)
    if t.returncode != 0:
        results[name] = {'typecheck': (t.stdout + t.stderr)[-600:]}
        print(name, '→ DOES NOT TYPECHECK', (t.stdout + t.stderr)[-300:], flush=True)
        continue
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', SPEC], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    failed = re.findall(r'✕ (\S+)', text)
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-600:]}
    print(name, '→', results[name]['summary'], failed, flush=True)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
