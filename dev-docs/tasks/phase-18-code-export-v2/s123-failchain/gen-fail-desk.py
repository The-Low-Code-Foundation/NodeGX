# "The failure runs its chain" fixture (P18 session 123): writes packages/nodegx-export/tests/fixtures/fail-desk, or the
# directory given. (Checked first: no fixture of that name, and no id in 0701-0703 under tests/fixtures.)
#
# The shape is members-area's Remove and todo-list's Sign in, one page: "Remove" fires Delete Record and, on its next wire,
# a Condition that puts the refusal away. Delete Record's Failure evaluates a second Condition that shows the refusal, and
# runs a Set Variable fed by its own Error (a read of the Error inside its own Failure chain). Its Done writes "gone". A
# Text shows the Error row. Every value Text has no authored text, as a wired Text in a template has none.
import json, os, shutil, sys

here = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'fail-desk')
root = os.path.abspath(root)
shutil.rmtree(root, ignore_errors=True)
T = '2026-10-17T12:00:00.000Z'
PROJECT_ID, APP_ID, HOME_ID = ('b8d20e00-0000-4000-8000-000000000701', 'b8d20e00-0000-4000-8000-000000000702',
                               'b8d20e00-0000-4000-8000-000000000703')


def write(rel, data):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')


nodes, wires = [], []
y = [160]


def node(id, type, label, params=None, parent=None, children=None, x=None):
    n = {'id': id, 'type': type, 'label': label}
    if parent is not None:
        n['parent'] = parent
    if children is not None:
        n['children'] = children
    n['parameters'] = params or {}
    n['x'] = x if x is not None else (100 if parent is not None else 700)
    n['y'] = y[0]
    y[0] += 80
    nodes.append(n)


def wire(a, ap, b, bp):
    wires.append({'fromId': a, 'fromProperty': ap, 'toId': b, 'toProperty': bp})


def text(id, label, value=''):
    node(id, 'Text', label, {'text': value, 'fontSize': 'var(--text-base)'} if value else {'fontSize': 'var(--text-base)'}, parent='shell')


shell = ['headline', 'removeBtn', 'refusal', 'errorLabel', 'errorText', 'saidLabel', 'saidText', 'goneLabel', 'goneText']
node('page', 'Page', 'Home', {'title': 'Fail Desk', 'urlPath': 'home'}, children=['shell'], x=40)
node('shell', 'Group', 'Shell', {'flexDirection': 'column', 'alignItems': 'flex-start', 'rowGap': 'var(--space-3)',
                                 'paddingTop': 'var(--space-8)', 'paddingLeft': 'var(--space-6)'}, parent='page', children=shell)
text('headline', 'Headline', 'Fail Desk')
node('removeBtn', 'net.noodl.controls.button', 'Remove', {'label': 'Remove'}, parent='shell')
text('refusal', 'It did not go', 'That could not be removed.')
for key, words in [('error', 'Error'), ('said', 'Said'), ('gone', 'Gone')]:
    text(f'{key}Label', words, words)
    text(f'{key}Text', f'{words} — the value', '')

node('del', 'DeleteDbModelProperties', 'Remove it', {'collectionName': 'Note', 'modelId': 'n1'})
node('putAway', 'Condition', 'Put the refusal away', {'condition': False, 'runOnChange-condition': False})
node('show', 'Condition', 'Say it did not go', {'condition': True, 'runOnChange-condition': False})
node('saidSet', 'Set Variable', 'Say why', {'name': 'said'})
node('saidRead', 'Variable2', 'Said', {'name': 'said'})
node('goneSet', 'Set Variable', 'Say it went', {'name': 'gone', 'value': 'gone'})
node('goneRead', 'Variable2', 'Gone', {'name': 'gone'})

# The delete first, then the clear: todo-list's Sign in and members-area's Remove.
wire('removeBtn', 'onClick', 'del', 'store')
wire('removeBtn', 'onClick', 'putAway', 'eval')
wire('putAway', 'result', 'refusal', 'mounted')
wire('del', 'failure', 'show', 'eval')
wire('show', 'result', 'refusal', 'mounted')
wire('del', 'error', 'errorText', 'text')
wire('del', 'error', 'saidSet', 'value')
wire('del', 'failure', 'saidSet', 'do')
wire('saidRead', 'value', 'saidText', 'text')
wire('del', 'done', 'goneSet', 'do')
wire('goneRead', 'value', 'goneText', 'text')

write('nodegx.project.json', {
    '$schema': 'https://opennoodl.dev/schemas/project-v2.json', 'name': 'Fail Desk', 'id': PROJECT_ID,
    'version': '4', 'nodegxVersion': '0.2.0', 'runtimeVersion': 'react19', 'created': T, 'modified': T,
    'settings': {'htmlTitle': 'Fail Desk', 'navigationPathType': 'path'}, 'structure': {'componentsDir': 'components'}})
write('components/_registry.json', {
    '$schema': 'https://opennoodl.dev/schemas/registry-v2.json', 'version': 1, 'lastUpdated': T, 'components': {
        'App': {'path': 'App', 'type': 'root', 'nodeCount': 1, 'connectionCount': 0, 'created': T, 'modified': T},
        'Pages/Home': {'path': 'Pages/Home', 'type': 'page', 'nodeCount': len(nodes), 'connectionCount': len(wires), 'created': T, 'modified': T}}})
write('components/App/component.json', {'$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': APP_ID, 'name': 'App',
                                        'path': '/App', 'type': 'root', 'modified': T, 'description': '"The failure runs its chain" fixture: the router shell.'})
write('components/App/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': APP_ID, 'version': 1, 'connections': []})
write('components/App/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': APP_ID, 'version': 1, 'nodes': [
    {'id': 'router', 'type': 'Router', 'label': 'Main Router', 'parameters': {'name': 'Main', 'pages': {'startPage': '/Pages/Home', 'routes': ['/Pages/Home']}}, 'x': 40, 'y': 40}],
    'visualRoots': ['router']})
write('components/Pages/Home/component.json', {
    '$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': HOME_ID, 'name': 'Home', 'path': '/Pages/Home', 'type': 'page', 'modified': T,
    'description': '"The failure runs its chain" fixture: Remove fires Delete Record, then puts the refusal away; '
                   "the delete's Failure shows the refusal and says why, its Done says it went."})
write('components/Pages/Home/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': HOME_ID, 'version': 1, 'connections': wires})
write('components/Pages/Home/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': HOME_ID, 'version': 1, 'nodes': nodes, 'visualRoots': ['page']})
print('fail-desk:', len(nodes), 'nodes,', len(wires), 'wires ->', root)
