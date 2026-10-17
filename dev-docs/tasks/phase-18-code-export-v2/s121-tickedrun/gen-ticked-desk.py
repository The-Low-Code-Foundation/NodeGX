# P18-S119-TICKEDRUN fixture (session 121): writes packages/nodegx-export/tests/fixtures/ticked-desk, or the directory given.
# (Not `tick-desk`: that is EXP-011 §39's Timer fixture, which this script's first run overwrote and git restored.)
#
# "Hold the item" is the members pages' "Hold the id" with a Variable where they have a Page Inputs value: Run wired from
# the page's Did Mount and two buttons, its "item" input ticked, and a body that holds the item, counts
# its runs on its own output and sends ready. ready writes the run count to "readyAt", Done writes it to "doneAt"; the
# item and the count are also read in render. "Pick b" sets the item, "Pick c and run" sets it and sends Run in one
# click, "Run" sends Run alone.
#
# "Say the word" has Run wired from "Again" and a literal on its ticked "word" input, which the runtime delivers at load.
# It counts on its own output and sends "spoke" into "saidAt", so the export keeps its node across runs (a Function
# with no signal of its own gets a fresh Outputs per run in the export: P18-S121-FRESHOUTPUTS, filed, not this fixture's).
import json, os, shutil, sys

here = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'ticked-desk')
root = os.path.abspath(root)
shutil.rmtree(root, ignore_errors=True)
T = '2026-10-17T12:00:00.000Z'
APP_ID, HOME_ID = 'b8d20e00-0000-4000-8000-000000000502', 'b8d20e00-0000-4000-8000-000000000503'


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
    node(id, 'Text', label, {'text': value, 'fontSize': 'var(--text-base)'}, parent='shell')


def button(id, label):
    node(id, 'net.noodl.controls.button', label, {'label': label}, parent='shell')


def port(name, plug, type='*'):
    return {'name': name, 'plug': plug, 'type': type}


shell = ['headline', 'pickB', 'pickCRun', 'runBtn', 'againBtn',
         'holdingLabel', 'holdingText', 'runsLabel', 'runsText', 'readyLabel', 'readyText', 'doneLabel', 'doneText',
         'saidLabel', 'saidText']
node('page', 'Page', 'Home', {'title': 'Ticked Desk', 'urlPath': 'home'}, children=['shell'], x=40)
node('shell', 'Group', 'Shell', {'flexDirection': 'column', 'alignItems': 'flex-start', 'rowGap': 'var(--space-3)',
                                 'paddingTop': 'var(--space-8)', 'paddingLeft': 'var(--space-6)'}, parent='page', children=shell)
text('headline', 'Headline', 'Ticked Desk')
button('pickB', 'Pick b')
button('pickCRun', 'Pick c and run')
button('runBtn', 'Run')
button('againBtn', 'Again')
for key, words in [('holding', 'Holding'), ('runs', 'Runs'), ('ready', 'Ready at'), ('done', 'Done at'), ('said', 'Said')]:
    text(f'{key}Label', words, words)
    text(f'{key}Text', f'{words} — the value')

node('itemRead', 'Variable2', 'The item', {'name': 'item', 'value': 'a'})
node('pickBSet', 'Set Variable', 'Pick b', {'name': 'item', 'value': 'b'})
node('pickCSet', 'Set Variable', 'Pick c', {'name': 'item', 'value': 'c'})
node('hold', 'JavaScriptFunction', 'Hold the item', {
    'functionScript': "\n".join([
        "if (Inputs.item === undefined || Inputs.item === '') return;",
        "Outputs.item = Inputs.item;",
        "Outputs.runs = (Outputs.runs || 0) + 1;",
        "Outputs.ready();"]),
    # Ticked in the file, as the templates' "Hold the id" is. Left unset, a format-4 project reads unticked: the editor's
    # load runs NDA-017's migration, which writes false on a Run-wired node, and the exporter settles the same way
    # (parseProject `settleComponent`). render-from-disk does not, so an unset box would split the arms.
    'runOnChange-in-item': True
}, ports=[port('in-item', 'input'), port('out-item', 'output'), port('out-runs', 'output'), port('out-ready', 'output', 'signal')])
node('readySet', 'Set Variable', 'Remember the run ready came from', {'name': 'readyAt'})
node('doneSet', 'Set Variable', 'Remember the run Done came from', {'name': 'doneAt'})
node('readyRead', 'Variable2', 'Ready at', {'name': 'readyAt'})
node('doneRead', 'Variable2', 'Done at', {'name': 'doneAt'})
node('say', 'JavaScriptFunction', 'Say the word', {
    'functionScript': "Outputs.said = (Outputs.said || 0) + 1;\nOutputs.word = Inputs.word;\nOutputs.spoke();",
    'in-word': 'hello',
    'runOnChange-in-word': True
}, ports=[port('in-word', 'input'), port('out-said', 'output'), port('out-word', 'output'), port('out-spoke', 'output', 'signal')])
node('saidSet', 'Set Variable', 'Remember how many times it spoke', {'name': 'saidAt'})
node('saidRead', 'Variable2', 'Said', {'name': 'saidAt'})

wire('pickB', 'onClick', 'pickBSet', 'do')
wire('pickCRun', 'onClick', 'pickCSet', 'do')
wire('pickCRun', 'onClick', 'hold', 'run')
wire('runBtn', 'onClick', 'hold', 'run')
wire('page', 'didMount', 'hold', 'run')
wire('itemRead', 'value', 'hold', 'in-item')
wire('hold', 'out-runs', 'readySet', 'value')
wire('hold', 'out-ready', 'readySet', 'do')
wire('hold', 'out-runs', 'doneSet', 'value')
wire('hold', 'done', 'doneSet', 'do')
wire('hold', 'out-item', 'holdingText', 'text')
wire('hold', 'out-runs', 'runsText', 'text')
wire('readyRead', 'value', 'readyText', 'text')
wire('doneRead', 'value', 'doneText', 'text')
wire('againBtn', 'onClick', 'say', 'run')
wire('say', 'out-said', 'saidSet', 'value')
wire('say', 'out-spoke', 'saidSet', 'do')
wire('saidRead', 'value', 'saidText', 'text')

write('nodegx.project.json', {
    '$schema': 'https://opennoodl.dev/schemas/project-v2.json', 'name': 'Ticked Desk', 'id': 'b8d20e00-0000-4000-8000-000000000501',
    'version': '4', 'nodegxVersion': '0.2.0', 'runtimeVersion': 'react19', 'created': T, 'modified': T,
    'settings': {'htmlTitle': 'Ticked Desk', 'navigationPathType': 'path'}, 'structure': {'componentsDir': 'components'}})
write('components/_registry.json', {
    '$schema': 'https://opennoodl.dev/schemas/registry-v2.json', 'version': 1, 'lastUpdated': T, 'components': {
        'App': {'path': 'App', 'type': 'root', 'nodeCount': 1, 'connectionCount': 0, 'created': T, 'modified': T},
        'Pages/Home': {'path': 'Pages/Home', 'type': 'page', 'nodeCount': len(nodes), 'connectionCount': len(wires), 'created': T, 'modified': T}}})
write('components/App/component.json', {'$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': APP_ID, 'name': 'App',
                                        'path': '/App', 'type': 'root', 'modified': T, 'description': 'P18-S119-TICKEDRUN fixture: the router shell.'})
write('components/App/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': APP_ID, 'version': 1, 'connections': []})
write('components/App/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': APP_ID, 'version': 1, 'nodes': [
    {'id': 'router', 'type': 'Router', 'label': 'Main Router', 'parameters': {'name': 'Main', 'pages': {'startPage': '/Pages/Home', 'routes': ['/Pages/Home']}}, 'x': 40, 'y': 40}],
    'visualRoots': ['router']})
write('components/Pages/Home/component.json', {
    '$schema': 'https://opennoodl.dev/schemas/component-v2.json', 'id': HOME_ID, 'name': 'Home', 'path': '/Pages/Home', 'type': 'page', 'modified': T,
    'description': 'P18-S119-TICKEDRUN fixture: a Run-wired Function whose ticked input also runs it ("Hold the item", '
                   'fed by a Variable, run from Did Mount and two buttons), and one with a literal on its ticked input ("Say the word").'})
write('components/Pages/Home/connections.json', {'$schema': 'https://opennoodl.dev/schemas/connections-v2.json', 'componentId': HOME_ID, 'version': 1, 'connections': wires})
write('components/Pages/Home/nodes.json', {'$schema': 'https://opennoodl.dev/schemas/nodes-v2.json', 'componentId': HOME_ID, 'version': 1, 'nodes': nodes, 'visualRoots': ['page']})
print('ticked-desk:', len(nodes), 'nodes,', len(wires), 'wires ->', root)
