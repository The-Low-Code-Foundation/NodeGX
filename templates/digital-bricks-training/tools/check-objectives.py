"""check-objectives.py — the coach's "What they must produce" stays what TASK-L168 made it.

Three rules, each a property rather than a proxy (L100):

1. NOTHING ON THE SURFACE WRITES. The product's row carries Move up, Move down,
   Edit, Archive and a concept picker, and every one of them writes; the
   template has no writes (sprint 47). So no control node of any kind may sit in
   the section or in the two rows it places — a Button that "only navigates"
   is still the first step towards one that doesn't.
2. THE PROGRAMME SCOPE NEVER FEEDS IT (§2). Objectives are per LEARNER:
   nothing writes learner_deliverables.programme_id (L127), so the product
   ignores the selected programme here. Every input into the section's
   instance on Pages/Learner must come from the programme fixture or the
   string table — never from People/Programme scope or anything downstream of it.
3. IT MOUNTS, NEVER HIDES (L157). `visible` is visibility:hidden and keeps the
   rows in the page, so the wrapper is gated on `mounted`.
"""
import json, os, sys

C = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'components')
SECTION = '/People/What they must produce'
LEAVES = ['People/What they must produce', 'People/Objective row', 'People/Told us row']
CONTROL = ('net.noodl.controls.', 'net.noodl.visual.link', 'RouterNavigate', 'Set Variable')


def load(path):
    n = json.load(open(os.path.join(C, path, 'nodes.json'), encoding='utf-8'))['nodes']
    c = json.load(open(os.path.join(C, path, 'connections.json'), encoding='utf-8'))['connections']
    return n, c


fails, checked = [], {'components': 0, 'nodes': 0, 'inputs': 0}

for path in LEAVES:
    nodes, _ = load(path)
    checked['components'] += 1
    for n in nodes:
        checked['nodes'] += 1
        if n['type'].startswith(CONTROL):
            fails.append(f"{path}: `{n['label']}` is a {n['type']} — surface C is read-only (TASK-L168 §1)")

nodes, conns = load('Pages/Learner')
by = {n['id']: n for n in nodes}
inst = [n for n in nodes if n['type'] == SECTION]
if len(inst) != 1:
    fails.append(f"Pages/Learner: expected one {SECTION} instance, found {len(inst)}")
else:
    inst = inst[0]
    allowed = {'/Data/Fixture programme', '/Data/Strings'}
    for x in conns:
        if x['toId'] != inst['id']:
            continue
        checked['inputs'] += 1
        src = by.get(x['fromId'], {}).get('type')
        if src not in allowed:
            fails.append(f"Pages/Learner: `{x['toProperty']}` reaches surface C from {src} "
                         f"(`{by.get(x['fromId'], {}).get('label')}`) — objectives are per learner and the "
                         f"programme scope must not filter them (TASK-L168 §2)")
    wrap = by.get(inst.get('parent'))
    gates = [x['toProperty'] for x in conns if wrap and x['toId'] == wrap['id']]
    if not wrap or 'mounted' not in gates:
        fails.append("Pages/Learner: surface C's wrapper is not gated on `mounted` (L157)")
    if wrap and 'visible' in gates:
        fails.append("Pages/Learner: surface C's wrapper is gated on `visible`, which keeps its rows (L157)")

print('checked', checked)
if fails:
    print('\nFAIL:')
    for f in fails:
        print('  -', f)
    sys.exit(1)
print('OK: surface C writes nothing, is fed by the learner, and mounts.')
