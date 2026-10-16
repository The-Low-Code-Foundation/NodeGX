# EXP-011 §87 fixture (session 120): writes packages/nodegx-export/tests/fixtures/gate-desk, the export suite's fixture for
# the Evaluate-driven Condition. Run with `python3 -I gen-gate-desk.py`. Everything it holds is the shipped templates'
# shape: Conditions with the box unticked, Evaluate sent by a button, Is True / Is False into a Text's Mounted or Visible.
import json, os, shutil

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'gate-desk')
STAMP = '2026-10-16T12:00:00.000Z'
APP_ID, HOME_ID = 'b8d20e00-0000-4000-8000-000000000402', 'b8d20e00-0000-4000-8000-000000000403'

def write(rel, doc):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(doc, f, indent=2)
        f.write('\n')

def node(id, type, node_label, parent=None, children=None, **parameters):
    n = {'id': id, 'type': type, 'label': node_label}
    if parent: n['parent'] = parent
    if children: n['children'] = children
    n['parameters'] = parameters
    return n

def gate(id, label, condition):
    return node(id, 'Condition', label, condition=condition, **{'runOnChange-condition': False})

shutil.rmtree(root, ignore_errors=True)
write('nodegx.project.json', {
    '$schema': 'https://opennoodl.dev/schemas/project-v2.json', 'name': 'Gate Desk', 'id': 'b8d20e00-0000-4000-8000-000000000401',
    'version': '4', 'nodegxVersion': '0.2.0', 'runtimeVersion': 'react19', 'created': STAMP, 'modified': STAMP,
    'settings': {'htmlTitle': 'Gate Desk', 'navigationPathType': 'path'}, 'structure': {'componentsDir': 'components'}})
write('components/_registry.json', {
    '$schema': 'https://opennoodl.dev/schemas/registry-v2.json', 'version': 1, 'lastUpdated': STAMP, 'components': {
        'App': {'path': 'App', 'type': 'root', 'nodeCount': 1, 'connectionCount': 0, 'created': STAMP, 'modified': STAMP},
        'Pages/Home': {'path': 'Pages/Home', 'type': 'page', 'nodeCount': 14, 'connectionCount': 11, 'created': STAMP, 'modified': STAMP}}})
write('components/App/component.json', {
    '$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': APP_ID, 'name': 'App', 'path': '/App', 'type': 'root',
    'modified': STAMP, 'description': 'EXP-011 §87 fixture: the router shell.'})
write('components/App/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': APP_ID, 'version': 1, 'connections': []})
write('components/App/nodes.json', {
    '$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': APP_ID, 'version': 1,
    'nodes': [dict(node('router', 'Router', 'Main Router', name='Main', pages={'startPage': '/Pages/Home', 'routes': ['/Pages/Home']}), x=40, y=40)],
    'visualRoots': ['router']})

write('components/Pages/Home/component.json', {
    '$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': HOME_ID, 'name': 'Home', 'path': '/Pages/Home', 'type': 'page',
    'modified': STAMP, 'description': 'EXP-011 §87 fixture: Show and Hide each Evaluate a Condition with the box unticked (true, '
    'false) wired into one Text\'s Mounted; Both sends the two in that order. Show\'s Is False hides a second Text, Visible left '
    'unauthored. Check Evaluates a Condition whose condition is a Switch, which Flip turns.'})
nodes = [
    node('page', 'Page', 'Home', children=['shell'], title='Gate Desk', urlPath='home'),
    node('shell', 'Group', 'Shell', 'page', ['showBtn', 'hideBtn', 'bothBtn', 'flipBtn', 'checkBtn', 'sentText', 'noteText', 'liveText'],
         flexDirection='column', alignItems='flex-start', rowGap='var(--space-3)', paddingTop='var(--space-8)', paddingLeft='var(--space-6)'),
    node('showBtn', 'net.noodl.controls.button', 'Show', 'shell', label='Show'),
    node('hideBtn', 'net.noodl.controls.button', 'Hide', 'shell', label='Hide'),
    node('bothBtn', 'net.noodl.controls.button', 'Both', 'shell', label='Both'),
    node('flipBtn', 'net.noodl.controls.button', 'Flip', 'shell', label='Flip'),
    node('checkBtn', 'net.noodl.controls.button', 'Check', 'shell', label='Check'),
    node('sentText', 'Text', 'It went', 'shell', text='It went', mounted=False),
    node('noteText', 'Text', 'Not yet', 'shell', text='Not yet'),
    node('liveText', 'Text', 'The switch was on', 'shell', text='The switch was on', mounted=False),
    gate('showGate', 'Say it went', True),
    gate('hideGate', 'Put it away', False),
    node('liveGate', 'Condition', 'Was the switch on', **{'runOnChange-condition': False}),
    node('flip', 'Switch', 'The switch'),
]
for i, n in enumerate(nodes):
    n['x'], n['y'] = (100 if n['type'] not in ('Condition', 'Switch') else 420), 40 + 80 * i
write('components/Pages/Home/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': HOME_ID, 'version': 1, 'nodes': nodes})
wires = [
    ('showBtn', 'onClick', 'showGate', 'eval'),
    ('hideBtn', 'onClick', 'hideGate', 'eval'),
    ('bothBtn', 'onClick', 'showGate', 'eval'),
    ('bothBtn', 'onClick', 'hideGate', 'eval'),
    ('showGate', 'result', 'sentText', 'mounted'),
    ('hideGate', 'result', 'sentText', 'mounted'),
    ('showGate', 'isfalse', 'noteText', 'visible'),
    ('flipBtn', 'onClick', 'flip', 'flip'),
    ('flip', 'state', 'liveGate', 'condition'),
    ('checkBtn', 'onClick', 'liveGate', 'eval'),
    ('liveGate', 'result', 'liveText', 'mounted'),
]
write('components/Pages/Home/connections.json', {
    '$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': HOME_ID, 'version': 1,
    'connections': [{'fromId': a, 'fromProperty': b, 'toId': c, 'toProperty': d} for a, b, c, d in wires]})
print('gate-desk:', len(nodes), 'nodes,', len(wires), 'wires')
