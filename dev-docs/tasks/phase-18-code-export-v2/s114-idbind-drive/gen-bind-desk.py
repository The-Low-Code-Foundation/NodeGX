# P18-S113-IDBINDREAD drive fixture: record-desk as s113's run 1 had it — no Load button, both Records' Fetch unwired.
# Shown's "Record properties" box is left unstated (with Fetch unwired nothing settles it, so it is the default, ticked);
# Frozen's stays unticked. Generated from s113's own generator, then the three Load pieces removed.
import json, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, 'bind-desk')
subprocess.run([sys.executable, '-I', os.path.join(here, '..', 's113-recordlive-drive', 'gen-fixture.py'), root], check=True)
home = os.path.join(root, 'components', 'Pages', 'Home')
nodes = json.load(open(os.path.join(home, 'nodes.json')))
nodes['nodes'] = [n for n in nodes['nodes'] if n['id'] != 'loadBtn']
for n in nodes['nodes']:
    if n['id'] == 'shell': n['children'] = [c for c in n['children'] if c != 'loadBtn']
    if n['id'] == 'shownRec': n['parameters'].pop('runOnChange-record')
json.dump(nodes, open(os.path.join(home, 'nodes.json'), 'w'), indent=2)
conns = json.load(open(os.path.join(home, 'connections.json')))
conns['connections'] = [c for c in conns['connections'] if c['fromId'] != 'loadBtn']
json.dump(conns, open(os.path.join(home, 'connections.json'), 'w'), indent=2)
reg = json.load(open(os.path.join(root, 'components', '_registry.json')))
reg['components']['Pages/Home']['nodeCount'] = len(nodes['nodes'])
reg['components']['Pages/Home']['connectionCount'] = len(conns['connections'])
json.dump(reg, open(os.path.join(root, 'components', '_registry.json'), 'w'), indent=2)
print('bind-desk:', len(nodes['nodes']), 'nodes,', len(conns['connections']), 'connections on Home')
