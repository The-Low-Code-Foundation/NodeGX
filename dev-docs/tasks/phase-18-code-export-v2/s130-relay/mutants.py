# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, tests/the-row-relays-its-values.test.ts run against it (§99); a control arm first. The copy is
# `packages/nx-mut-s130r` (the package without node_modules, its node_modules a symlink), removed after.
# ONLY=<arm name prefix>[,…] runs those arms (and the control) alone.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
SPEC = 'tests/the-row-relays-its-values.test.ts'
ARMS = {
  'control': [],
  'RA the base: a relayed row value is refused': [(PLAN,
    "    if (!fromProperty.startsWith(ITEM_OUTPUT_VALUE)) {\n      return { defer: `a repeater's",
    "    if (fromProperty.length > 0) {\n      return { defer: `a repeater's")],
  "RB the relay written after the signal's chain": [
    (EMIT, "    if (body.startsWith('{ ')) return `${head}{ ${statements.join('; ')}; ${body.slice(2)}`;",
           "    if (body.startsWith('{ ')) return `${head}{ ${body.slice(2, -1)}${statements.join('; ')}; }`;"),
    (EMIT, "    return `${head}{ ${statements.join('; ')}; ${body}; }`;",
           "    return `${head}{ ${body}; ${statements.join('; ')}; }`;")],
  'RC only the first relayed signal writes': [(EMIT,
    "        out.push(`${prop}={${prependStatements(handlerArrow(actions, '()', attrIndent), relayWrites, attrIndent)}}`);",
    "        out.push(`${prop}={${prependStatements(handlerArrow(actions, '()', attrIndent), out.length === 0 ? relayWrites : [], attrIndent)}}`);")],
  "RD the relay reads the output's name as the field": [(EMIT,
    "          const entry = entries.find((e) => e.input === r.input);",
    "          const entry = entries.find((e) => e.input === r.output);")],
  'RE a row output computed in the row is relayed anyway': [(PLAN,
    "    if (feeder?.type !== 'Component Inputs') {\n      return {\n        defer: `${templatePath}'s row output",
    "    if (feeder?.type !== 'Component Inputs' && feeder?.type === 'mutant') {\n      return {\n        defer: `${templatePath}'s row output")],
  'RF two relays of one value are two state rows': [(PLAN,
    "    if (known !== undefined) return { stateName: known.name };\n    const repeater = plan.repeaters[forEach.id];",
    "    if (known !== undefined && known.name === 'mutant') return { stateName: known.name };\n    const repeater = plan.repeaters[forEach.id];")],
  'RG a row output fed twice is relayed': [(PLAN,
    "    if (feeds.length !== 1) {\n      return {\n        defer:\n          feeds.length === 0",
    "    if (feeds.length === 0) {\n      return {\n        defer:\n          feeds.length === 0")],
  'RH a relay whose repeater draws no rows is kept': [(PLAN,
    "    if (fed) continue;\n    const reason = `the repeater relaying",
    "    if (fed || relay.output.length > 0) continue;\n    const reason = `the repeater relaying")],
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
