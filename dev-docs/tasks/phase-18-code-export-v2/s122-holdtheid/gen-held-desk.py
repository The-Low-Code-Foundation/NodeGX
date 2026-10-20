# "Hold the id" fixture (P18 session 122): writes packages/nodegx-export/tests/fixtures/held-desk, or the directory given.
# (Checked first: no fixture of that name, and no id in 0601-0603 under tests/fixtures.)
#
# "Hold the id" is members-area's Announcement and Meeting and the Site Builder's PageEditor, with a Variable where they
# have a Page Inputs value: Run wired from the page's Did Mount, its "id" input ticked, a body that holds a non-empty id
# and sends ready. ready writes the held id to "loaded" (where the templates fetch a Record).
#
# "The id, and the go-ahead" is the second Function the templates feed from the first: its "id" input is wired from Hold
# the id's output and unticked, its Run wired from "Remove". It says what it would remove on its own output (a Text reads
# it, before its guard, so a lost id reads "removing nothing") and sends go, which writes the id to "removed" (where the
# templates delete the Record). Every value Text has no authored text, as a wired Text in a template has none.
#
# "Pick b" and "Pick nothing" set the Variable; "Pick nothing" makes Hold the id return before writing, so the id it held
# is the one a later Remove reads, in the running app (a node keeps its outputs between runs).
import json, os, shutil, sys

here = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'held-desk')
root = os.path.abspath(root)
shutil.rmtree(root, ignore_errors=True)
T = '2026-10-17T12:00:00.000Z'
PROJECT_ID, APP_ID, HOME_ID = ('b8d20e00-0000-4000-8000-000000000601', 'b8d20e00-0000-4000-8000-000000000602',
                               'b8d20e00-0000-4000-8000-000000000603')


def write(rel, data):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')


nodes, wires = [], []
y = [160]


def node(id, type, label, params=None, parent=None, children=None, ports=None, x=None):
    n = {'id': id, 'type': type, 'label': label}
    if parent is not None:
        n['parent'] = parent
    if children is not None:
        n['children'] = children
    n['parameters'] = params or {}
    if ports is not None:
        n['ports'] = ports
    n['x'] = x if x is not None else (100 if parent is not None else 700)
    n['y'] = y[0]
    y[0] += 80
    nodes.append(n)


def wire(a, ap, b, bp):
    wires.append({'fromId': a, 'fromProperty': ap, 'toId': b, 'toProperty': bp})


def text(id, label, value=''):
    node(id, 'Text', label, {'text': value, 'fontSize': 'var(--text-base)'} if value else {'fontSize': 'var(--text-base)'}, parent='shell')


def button(id, label):
    node(id, 'net.noodl.controls.button', label, {'label': label}, parent='shell')


def port(name, plug, type='*'):
    return {'name': name, 'plug': plug, 'type': type}


shell = ['headline', 'pickB', 'pickNothing', 'removeBtn',
         'loadedLabel', 'loadedText', 'sayingLabel', 'sayingText', 'removedLabel', 'removedText']
node('page', 'Page', 'Home', {'title': 'Held Desk', 'urlPath': 'home'}, children=['shell'], x=40)
node('shell', 'Group', 'Shell', {'flexDirection': 'column', 'alignItems': 'flex-start', 'rowGap': 'var(--space-3)',
                                 'paddingTop': 'var(--space-8)', 'paddingLeft': 'var(--space-6)'}, parent='page', children=shell)
text('headline', 'Headline', 'Held Desk')
button('pickB', 'Pick b')
button('pickNothing', 'Pick nothing')
button('removeBtn', 'Remove')
for key, words in [('loaded', 'Loaded'), ('saying', 'Saying'), ('removed', 'Removed')]:
    text(f'{key}Label', words, words)
    # No authored text: a wired Text in a template has none, and a stand-in's placeholder would read as a difference.
    text(f'{key}Text', f'{words} — the value', '')

node('idRead', 'Variable2', 'Which id', {'name': 'id', 'value': 'a'})
node('pickBSet', 'Set Variable', 'Pick b', {'name': 'id', 'value': 'b'})
node('pickNothingSet', 'Set Variable', 'Pick nothing', {'name': 'id', 'value': ''})
node('hold', 'JavaScriptFunction', 'Hold the id', {
    'functionScript': "\n".join([
        "if (Inputs.id === undefined || Inputs.id === '') return;",
        "Outputs.id = Inputs.id;",
        "Outputs.ready();"]),
    # Written out: a format-4 project reads an unset box on a Run-wired node as unticked (NDA-017's migration).
    'runOnChange-in-id': True
}, ports=[port('in-id', 'input'), port('out-id', 'output'), port('out-ready', 'output', 'signal')])
node('loadedSet', 'Set Variable', 'Load the one it holds', {'name': 'loaded'})
node('loadedRead', 'Variable2', 'Loaded', {'name': 'loaded'})
node('confirmed', 'JavaScriptFunction', 'The id, and the go-ahead', {
    'functionScript': "\n".join([
        # Before the guard, so an id the export lost between Hold the id's runs reads "removing nothing" here.
        "Outputs.saying = 'removing ' + (Inputs.id === undefined || Inputs.id === '' ? 'nothing' : Inputs.id);",
        "if (Inputs.id === undefined || Inputs.id === '') return;",
        "Outputs.id = Inputs.id;",
        "Outputs.go();"]),
    'runOnChange-in-id': False
}, ports=[port('in-id', 'input'), port('out-id', 'output'), port('out-saying', 'output'), port('out-go', 'output', 'signal')])
node('removedSet', 'Set Variable', 'Remove it', {'name': 'removed'})
node('removedRead', 'Variable2', 'Removed', {'name': 'removed'})

wire('pickB', 'onClick', 'pickBSet', 'do')
wire('pickNothing', 'onClick', 'pickNothingSet', 'do')
wire('page', 'didMount', 'hold', 'run')
wire('idRead', 'value', 'hold', 'in-id')
wire('hold', 'out-id', 'loadedSet', 'value')
wire('hold', 'out-ready', 'loadedSet', 'do')
wire('loadedRead', 'value', 'loadedText', 'text')
wire('hold', 'out-id', 'confirmed', 'in-id')
wire('removeBtn', 'onClick', 'confirmed', 'run')
wire('confirmed', 'out-saying', 'sayingText', 'text')
wire('confirmed', 'out-id', 'removedSet', 'value')
wire('confirmed', 'out-go', 'removedSet', 'do')
wire('removedRead', 'value', 'removedText', 'text')

write('nodegx.project.json', {
    '$schema': 'https://opennoodl.dev/schemas/project-v2.json', 'name': 'Held Desk', 'id': PROJECT_ID,
    'version': '4', 'nodegxVersion': '0.2.0', 'runtimeVersion': 'react19', 'created': T, 'modified': T,
    'settings': {'htmlTitle': 'Held Desk', 'navigationPathType': 'path'}, 'structure': {'componentsDir': 'components'}})
write('components/_registry.json', {
    '$schema': 'https://opennoodl.dev/schemas/registry-v2.json', 'version': 1, 'lastUpdated': T, 'components': {
        'App': {'path': 'App', 'type': 'root', 'nodeCount': 1, 'connectionCount': 0, 'created': T, 'modified': T},
        'Pages/Home': {'path': 'Pages/Home', 'type': 'page', 'nodeCount': len(nodes), 'connectionCount': len(wires), 'created': T, 'modified': T}}})
write('components/App/component.json', {'$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': APP_ID, 'name': 'App',
                                        'path': '/App', 'type': 'root', 'modified': T, 'description': '"Hold the id" fixture: the router shell.'})
write('components/App/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': APP_ID, 'version': 1, 'connections': []})
write('components/App/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': APP_ID, 'version': 1, 'nodes': [
    {'id': 'router', 'type': 'Router', 'label': 'Main Router', 'parameters': {'name': 'Main', 'pages': {'startPage': '/Pages/Home', 'routes': ['/Pages/Home']}}, 'x': 40, 'y': 40}],
    'visualRoots': ['router']})
write('components/Pages/Home/component.json', {
    '$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': HOME_ID, 'name': 'Home', 'path': '/Pages/Home', 'type': 'page', 'modified': T,
    'description': '"Hold the id" fixture: a Run-wired Function that holds an id ("Hold the id", fed by a Variable, run from '
                   'Did Mount and its ticked input), and a second Function, run from Remove, that reads it.'})
write('components/Pages/Home/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': HOME_ID, 'version': 1, 'connections': wires})
write('components/Pages/Home/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': HOME_ID, 'version': 1, 'nodes': nodes, 'visualRoots': ['page']})
print('held-desk:', len(nodes), 'nodes,', len(wires), 'wires ->', root)
