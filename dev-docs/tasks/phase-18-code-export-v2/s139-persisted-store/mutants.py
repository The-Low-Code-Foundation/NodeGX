#!/usr/bin/env python3
"""s139 mutants: each removes one part of the change; the Store Desk spec must read the named rows red.
Run from packages/nodegx-export. Restores every file from its own saved copy (never git checkout)."""
import subprocess, sys, re, shutil
PLAN = 'src/analyze/plan.ts'
STATE = 'src/analyze/appState.ts'
LIB = 'src/emit/persistStoreLib.ts'
EMIT = 'src/emit/component.ts'
SPEC = 'tests/a-persisted-store-travels.test.ts'
M = [
  ('M1 the stored copy is not loaded', LIB,
   "    target.set(persisted as Partial<T>);\n",
   "    void persisted;\n", ['A2', 'A4']),
  ('M2 a change is not saved', LIB,
   "  target.subscribe(schedulePersist);\n",
   "  target.subscribe(() => undefined);\n", ['A2']),
  ('M3 Persist still refuses the store', STATE,
   "            if (persistAuthored) plan.persist = { storageKey };",
   "            if (persistAuthored) plan.deferred = 'a declarer authors persist — browser-storage rehydration is not translatable';", ['A2', 'E1']),
  ('M4 an untyped Subscribe key is not lifted', PLAN,
   "        if (!('defer' in read) && read.untyped === true) {",
   "        if (!('defer' in read) && read.untyped === true && read.key.length < 0) {", ['A2', 'C1', 'E1']),
  ('M5 several feeds into one input are not one row', PLAN,
   "      const merged = pending.intoItems !== true && (feedsOfSink.get(sinkKeyOf(pending))?.length ?? 1) > 1;",
   "      const merged = pending.intoItems !== true && (feedsOfSink.get(sinkKeyOf(pending))?.length ?? 1) > 1 && varKey.length < 0;", ['A2', 'B3', 'E2']),
  ('M6 a placed component\'s value into an output is not passed on', PLAN,
   "        if (fromIR !== undefined && componentOutputInterface(fromIR).valueProps.some((v) => v.port === wire.fromProperty)) {",
   "        if (fromIR !== undefined && componentOutputInterface(fromIR).valueProps.some((v) => v.port === wire.fromProperty) && wire.key.length < 0) {", ['A2', 'B4', 'E3']),
  ('M7 a pulse whose value is not delivered still runs', PLAN,
   "      const unreached = unreachedOwnerOf(connection) ?? excluded.pulses.get(`${connection.fromId}\\u0000${connection.toId}`);",
   "      const unreached = unreachedOwnerOf(connection);", ['A9', 'C2', 'E4']),
  ('M8 the lift pass runs in the project\'s order, not by placement', PLAN,
   "  for (const legacy of byPlacement(order)) liftInto(plannedByLegacy.get(legacy)!);",
   "  for (const legacy of order) liftInto(plannedByLegacy.get(legacy)!);", ['C5']),
  ('M9 a hook may take an imported hook\'s name', PLAN,
   "symbol: IMPORTED_HOOK_NAMES.has(`use${fileBase}`) ? `use${fileBase}Logic` : `use${fileBase}` };",
   "symbol: `use${fileBase}` };", ['A2', 'B5']),
  ('M10 a States machine\'s local is not reserved', EMIT,
   "  for (const machine of plan.statesMachines) reserved.add(machine.local);\n",
   "", ['E6']),
  ('M11 disagreeing declarers are ordered, not refused', STATE,
   "            if (before !== undefined && (before.on !== said.on || (said.on && before.storageKey !== said.storageKey))) {",
   "            if (before !== undefined && (before.on !== said.on || (said.on && before.storageKey !== said.storageKey)) && said.on === false) {", ['C3']),
  ('M12 a port with two rows to write passes each setter on its own', EMIT,
   "      if (setters.length < 2) continue;\n      const tsType = plan.stateVars.find((v) => v.setterName === setters[0])?.tsType ?? 'unknown';",
   "      if (setters.length < 99) continue;\n      const tsType = plan.stateVars.find((v) => v.setterName === setters[0])?.tsType ?? 'unknown';", ['E7']),
  ('M13 a pulse is refused although the sender never feeds the port', PLAN,
   "        if (pending.intoInstance === true && readInside && fedInside) {",
   "        if (pending.intoInstance === true && readInside) {", ['C6']),
]
only = sys.argv[1:]
for name, path, old, new, want in M:
    if only and not any(name.startswith(o + ' ') for o in only): continue
    src = open(path).read()
    if src.count(old) != 1:
        print(f'{name}: SITE NOT FOUND ({src.count(old)})', flush=True); continue
    shutil.copy(path, path + '.s139keep')
    try:
        open(path, 'w').write(src.replace(old, new))
        r = subprocess.run(['nice', '-n', '19', 'npx', 'jest', SPEC, '--runInBand', '--verbose'], capture_output=True, text=True)
        out = r.stdout + r.stderr
        red = sorted(set(re.findall(r'✕ ([A-Z]\d+)', out)))
        total = re.search(r'Tests:.*', out)
        killed = all(w in red for w in want)
        print(f"{name}: {'KILLED' if killed else 'SURVIVED'} — red {red} (wanted {want}); {total.group(0) if total else 'NO TESTS LINE'}", flush=True)
    finally:
        shutil.move(path + '.s139keep', path)
