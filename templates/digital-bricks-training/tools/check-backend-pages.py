"""check-backend-pages.py — the pages read the backend, and the way in stays one way (TASK-L171).

Four properties, each stated as the property rather than a proxy for it (L100):

1. THE SEAM DID NOT MOVE. Each `Data/*` component that replaced a fixture keeps
   the fixture's outputs, by name and in order (criterion 3), so no page, no
   Logic component and no kit node had to change to read the backend. Data/Lesson
   appends exactly one, `found`, for the state a fixture could never be in: a
   lesson nobody has written yet. Appended, never interleaved.
2. ONE GATE, IN APP. Only App decides where a signed-out or non-staff reader is
   sent; no page carries its own copy, because a page that forgot its copy would
   be the one somebody could read. The public and staff lists are pinned here so
   widening either is a decision made in this file, not an edit made in passing.
3. A STAFF ADDRESS DECIDES NOTHING. Staff is the backend's `staff` role. The
   only place a staff address may be written in the graph is the trainer door's
   prefill on Home (decision 8) — never in a script, never on anything else.
   The addresses are read from the seed, so a new staff user is covered without
   editing this file.
4. `reader` HAS NO DEFAULT. Data/Programme's Component Inputs carries no value
   for it, and every instance says who is reading — the same contract
   Data/Strings' `audience` has (TASK-L163). A defaulted reader would serve a
   learner's page the coach's function, or the other way round, silently.

Run: python3 tools/check-backend-pages.py
"""
import json, os, re, sys

T = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
C = os.path.join(T, 'components')

# The fixtures' outputs as they were at L170 (read off nodes.json at OpenNoodl 7df454df6, the commit before TASK-L171).
FIXTURE_OUTPUTS = {
    'Data/Roster': ['people', 'count', 'loaded'],
    'Data/Programme': ['projectName', 'problemStatement', 'endsOn', 'entries', 'dimensions', 'loaded', 'learnerId',
                       'history', 'deliverables', 'facts', 'submissions', 'onboardingFacts', 'concepts'],
    'Data/Lesson': ['title', 'hook', 'landing', 'conceptId', 'steps', 'sections', 'loaded'],
}
# Data/Programme appends `work` (TASK-L182): the words a learner sent in and what came back, which
# the fixture carried nowhere before L182 — appended, never interleaved, like `found`.
APPENDED = {'Data/Lesson': ['found'], 'Data/Programme': ['work']}
# Privacy joined 2026-10-01 (TASK-L185): anybody may read what would be held before they have an
# account, and a person who declines the notice must still be able to read it.
PUBLIC = ['Pages/Home', 'Pages/Sign in', 'Pages/Palette', 'Pages/Privacy']
STAFF = ['Pages/People', 'Pages/Learner']


def walk():
    for dirpath, _, files in os.walk(C):
        if 'nodes.json' in files:
            rel = os.path.relpath(dirpath, C)
            if rel.startswith('__cloud__'):
                continue
            n = json.load(open(os.path.join(dirpath, 'nodes.json'), encoding='utf-8'))['nodes']
            cp = os.path.join(dirpath, 'connections.json')
            c = json.load(open(cp, encoding='utf-8')) if os.path.exists(cp) else {'connections': []}
            yield rel, n, c.get('connections', c) if isinstance(c, dict) else c


comps = {rel: (n, c) for rel, n, c in walk()}
fails, checked = [], {'components': len(comps), 'outputs': 0, 'scripts': 0, 'staffAddresses': 0}

# 1. The seam.
for comp, want in FIXTURE_OUTPUTS.items():
    nodes, _ = comps[comp]
    outs = [n for n in nodes if n['type'] == 'Component Outputs']
    if len(outs) != 1:
        fails.append(f"{comp}: expected one Component Outputs, found {len(outs)}")
        continue
    got = [p['name'] for p in outs[0].get('ports', [])]
    expect = want + APPENDED.get(comp, [])
    checked['outputs'] += len(got)
    if got != expect:
        fails.append(f"{comp}: outputs are {got}, expected the fixture's {want}" +
                     (f" then {APPENDED[comp]}" if comp in APPENDED else '') + ' (criterion 3)')
    if any(n['type'] == 'Static Data' for n in nodes):
        fails.append(f"{comp}: still holds a Static Data node — the pages read the backend (TASK-L171 §1)")

# 2. One gate, in App.
def gate_script():
    for n in comps['App'][0]:
        if n['id'] == 'app_gate':
            return n['parameters']['functionScript']
    return None

g = gate_script()
if g is None:
    fails.append("App: no `app_gate` Function — the gate must live in App (TASK-L171 §2)")
else:
    lists = {k: re.search(r"const %s = (\[[^\]]*\])" % k, g) for k in ('PUBLIC', 'STAFF')}
    for k, want in (('PUBLIC', PUBLIC), ('STAFF', STAFF)):
        m = lists[k]
        got = json.loads(m.group(1).replace("'", '"')) if m else None
        if got != want:
            fails.append(f"App: the gate's {k} list is {got}, pinned as {want} — widen it HERE, deliberately")
for comp, (nodes, conns) in comps.items():
    if comp == 'App':
        continue
    users = {n['id'] for n in nodes if n['type'] == 'net.noodl.user.User'}
    for n in nodes:
        if n['type'] == 'RouterNavigate' and n.get('parameters', {}).get('target') == '/Pages/Sign in':
            # A navigation to sign-in must be a person pressing something, never the auth state.
            feeders = [x for x in conns if x['toId'] == n['id'] and x['toProperty'] == 'navigate']
            for x in feeders:
                src = next((m for m in nodes if m['id'] == x['fromId']), {})
                if src.get('type', '').startswith('net.noodl.controls.') is False:
                    fails.append(f"{comp}: `{n['label']}` is sent to sign-in by {src.get('type')} `{src.get('label')}` — "
                                 f"only App's gate may send somebody to sign-in on their own state")
    if users and comp != 'Pages/Home':
        fails.append(f"{comp}: reads the signed-in user — a second gate in waiting. Only App (the gate) and "
                     f"Home (which doors to show) read it")

# 3. A staff address decides nothing.
seed = json.load(open(os.path.join(T, 'backend', 'seed.json'), encoding='utf-8'))
staff = sorted({u['email'] for u in seed['users'] if 'staff' in (u.get('roles') or []) and u.get('email')})
if not staff:
    fails.append("backend/seed.json: no staff user with an address — this check would pass by testing nothing")
for comp, (nodes, _) in comps.items():
    for n in nodes:
        params = n.get('parameters', {})
        for k, v in params.items():
            s = json.dumps(v)
            for addr in staff:
                if addr not in s:
                    continue
                checked['staffAddresses'] += 1
                allowed = comp == 'Pages/Home' and n['type'] == 'RouterNavigate' and k == 'pm-email' \
                    and params.get('target') == '/Pages/Sign in'
                if not allowed:
                    fails.append(f"{comp}: `{n.get('label')}` names the staff address {addr} in `{k}` — "
                                 f"staff is the backend's role; only Home's trainer door may prefill it (decision 8)")
        if n['type'] == 'JavaScriptFunction':
            checked['scripts'] += 1
if checked['staffAddresses'] != 1:
    fails.append(f"expected exactly ONE staff address in the graph (Home's trainer door), found {checked['staffAddresses']}")

# 4. `reader` has no default, and every instance says who is reading.
nodes, _ = comps['Data/Programme']
ins = [n for n in nodes if n['type'] == 'Component Inputs']
if not ins or 'reader' not in [p['name'] for p in ins[0].get('ports', [])]:
    fails.append("Data/Programme: no `reader` input")
elif any('reader' in json.dumps(n.get('parameters', {})) for n in ins):
    fails.append("Data/Programme: `reader` carries a default on its Component Inputs — every instance must say who is reading")
# Pages/Lesson reads the learner's own programme for one thing, the work they sent against this
# lesson's challenge (TASK-L182) — as the product's lesson page reads /api/course (L59, L118).
want_reader = {'Pages/Course': 'learner', 'Pages/Learner': 'coach', 'Pages/Lesson': 'learner'}
seen = {}
for comp, (nodes, _) in comps.items():
    for n in nodes:
        if n['type'] == '/Data/Programme':
            r = n.get('parameters', {}).get('reader')
            seen[comp] = r
            if r not in ('learner', 'coach'):
                fails.append(f"{comp}: a Data/Programme instance with reader={r!r} — say 'learner' or 'coach'")
if seen != want_reader:
    fails.append(f"Data/Programme is placed as {seen}, expected {want_reader}")

print('checked', checked)
if fails:
    print('FAILED:')
    for f in fails:
        print('  -', f)
    sys.exit(1)
print('OK: the seam did not move, there is one gate, a staff address decides nothing, and every reader is named.')
