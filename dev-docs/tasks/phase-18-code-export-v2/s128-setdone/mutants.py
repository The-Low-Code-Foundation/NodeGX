# Usage: python3 -I mutants.py <package copy> <tree src> <out.json> — each arm below applied alone to a fresh copy of the
# tree's src, its spec run against it: the A–M arms tests/the-set-runs-its-done-chain.test.ts (§95), the S arms
# tests/the-sibling-value-arrives.test.ts (§96); a control arm for each first. The copy is `packages/nx-mut-s128` (the
# package without node_modules, its node_modules a symlink), removed after.
# ONLY=<arm name prefix>[,…] runs those arms (and the controls) alone.
import json, os, re, shutil, subprocess, sys
copy, tree_src, out = sys.argv[1:4]
PLAN, EMIT = 'src/analyze/plan.ts', 'src/emit/component.ts'
SET_SPEC, SIB_SPEC = 'tests/the-set-runs-its-done-chain.test.ts', 'tests/the-sibling-value-arrives.test.ts'
ARMS = {
  'control': [],
  'S control': [],
  "SA a sibling's value input is not bound (the base)": [(PLAN, "    if (plan.roleOf[toNode.id] !== 'instance') return false;\n    const target = ir.components.find((tc) => `/${tc.path}` === toNode.type);\n    return (", "    if (plan.roleOf[toNode.id] !== 'instance' || port.length > 0) return false;\n    const target = ir.components.find((tc) => `/${tc.path}` === toNode.type);\n    return (")],
  'SB the count handed on as it is sent (the first build)': [(PLAN, "        pulse.delivered = { name: delivered, setterName: setterNameOf(delivered) };", "")],
  'SC the delivered count follows nothing: it never moves': [(EMIT, "      `  }, [${pulse.stateName}]);`", "      '  }, []);'")],
  "SD a lift that fails is not named on the sibling's marker": [(PLAN, "        if (pending.intoInstance === true) {", "        if (pending.intoInstance === true && pending.port.length < 0) {")],
  "A the base: a Set runs no chain": [(PLAN, "    if ('defer' in write || write.action.kind !== 'store-set') return write;", "    if ('defer' in write || write.action.kind !== 'store-set' || node.id.length > 0) return write;")],
  'B the chain printed before the write': [(EMIT, "          ? [{ ...a, then: undefined }, ...expandActions(a.then)]", "          ? [...expandActions(a.then), { ...a, then: undefined }]")],
  'C the attach pass does not leave the chain wires to the Set (wire order)': [(PLAN, "  'Set Variable': SET_VARIABLE_CHAIN_OUTPUTS,", "  'Set Variable (mutant)': SET_VARIABLE_CHAIN_OUTPUTS,")],
  'D a chain it cannot run refuses the write too': [(PLAN, "        setDoneRefusals.set(`${node.id}:${port}`, chain.defer);\n        continue;", "        setDoneRefusals.set(`${node.id}:${port}`, chain.defer);\n        return { defer: chain.defer };")],
  'E the sweep overwrites a sink another trigger ruled': [(PLAN, "    } else if (dispositions[toNode.id] === undefined) {\n      dispositions[toNode.id] = { kind: 'deferred', to: 'EXP-003', reason };", "    } else {\n      dispositions[toNode.id] = { kind: 'deferred', to: 'EXP-003', reason };")],
  'F Completed is not run': [(PLAN, "const SET_VARIABLE_CHAIN_OUTPUTS = ['done', 'completed'] as const;", "const SET_VARIABLE_CHAIN_OUTPUTS = ['done'] as const;")],
  'G no sweep: the unrun wires are named by nothing': [(PLAN, "    if (fromNode?.type !== 'Set Variable' || !(SET_VARIABLE_CHAIN_OUTPUTS as readonly string[]).includes(connection.fromProperty)) continue;", "    if (fromNode?.type !== 'Set Variable (mutant)' || !(SET_VARIABLE_CHAIN_OUTPUTS as readonly string[]).includes(connection.fromProperty)) continue;")],
  "H the sweep does not ask the sink first": [(PLAN, "    if ('defer' in sink) {\n      if (outputsSink) {\n        if (!failedOutputsNodes.has(toNode.id)) failedOutputsNodes.set(toNode.id, sink.defer);\n      } else if (dispositions[toNode.id]?.kind !== 'collapsed'", "    if ('defer' in sink && sink.defer.length < 0) {\n      if (outputsSink) {\n        if (!failedOutputsNodes.has(toNode.id)) failedOutputsNodes.set(toNode.id, sink.defer);\n      } else if (dispositions[toNode.id]?.kind !== 'collapsed'")],
  'I the chain earns no imports': [(EMIT, "      (action.then ?? []).forEach(collectActionUse);\n    }", "    }")],
  'J the deep walk skips the chain (hooks it needs)': [(EMIT, "              a.kind === 'store-set' && a.then !== undefined\n              ? [a, ...deepActions(a.then)]", "              a.kind === 'store-set' && a.then !== undefined && a.then.length < 0\n              ? [a, ...deepActions(a.then)]")],
  'K the attach scan skips the chain': [(PLAN, "        } else if (action.kind === 'store-set') {\n          // P18-S127-SETDONE. A Set Variable's Done chain, the same.\n          scanActions(action.then ?? []);", "        } else if (action.kind === 'store-set') {\n          // P18-S127-SETDONE. A Set Variable's Done chain, the same.\n          scanActions([]);")],
  'M a wire the sweep names is not consumed (named twice)': [(PLAN, "    // Named here, so not again by the sweep of wires nothing translated (the attach pass consumed it at the base).\n    consumed.add(connection.key);", "    // Named here, so not again by the sweep of wires nothing translated (the attach pass consumed it at the base).")],
  'L the chain is not snapped': [(PLAN, "        const then = snapActionList(action.then, snap);\n        if (!Array.isArray(then)) return then;\n        return { ...action, expr: e, then };", "        return { ...action, expr: e };")],
}
results = {}
only = [x for x in os.environ.get('ONLY', '').split(',') if x]
for name, edits in ARMS.items():
    if only and name not in ('control', 'S control') and not any(name.startswith(o) for o in only): continue
    shutil.rmtree(os.path.join(copy, 'src'), ignore_errors=True)
    shutil.copytree(tree_src, os.path.join(copy, 'src'))
    ok = True
    for rel, old, new in edits:
        p = os.path.join(copy, rel); s = open(p).read()
        if s.count(old) != 1: print(name, 'PATTERN NOT FOUND ONCE', rel, repr(old[:60])); ok = False; break
        open(p, 'w').write(s.replace(old, new))
    if not ok: results[name] = 'pattern'; continue
    spec = SIB_SPEC if name.startswith('S') else SET_SPEC
    r = subprocess.run(['nice', '-n', '19', '../../node_modules/.bin/jest', spec], cwd=copy, capture_output=True, text=True)
    text = r.stdout + r.stderr
    failed = re.findall(r'✕ (\S+ \S+)', text)
    results[name] = {'failed': failed, 'summary': text.split('Tests:')[-1].split('\n')[0].strip() if 'Tests:' in text else text[-600:]}
    print(name, '→', results[name]['summary'], failed, flush=True)
shutil.rmtree(os.path.join(copy, 'src')); shutil.copytree(tree_src, os.path.join(copy, 'src'))
json.dump(results, open(out, 'w'), indent=1)
