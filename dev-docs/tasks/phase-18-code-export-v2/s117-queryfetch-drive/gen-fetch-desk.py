# P18-S116-QUERYFETCH drive fixture (session 117): the export suite's search-desk, its Query Records' Fetch wired. The
# City box writes the Variable `city` (onTextChanged), wired into the filter's `qp-city`; the Filter is `city equal to
# <city>`, sorted by name. Fetch is sent by a Refresh button and by a Create Record's Done ("Add Zed in Berlin"). Every
# Run On Value Change box is unticked, as NDA-017's settle writes them on a wired Fetch. Backend app id
# backend_fetchdesk on :8597.
import json, os, shutil
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'search-desk')
root = os.path.join(here, 'fetch-desk')
shutil.rmtree(root, ignore_errors=True)
shutil.copytree(src, root)
pj = os.path.join(root, 'nodegx.project.json')
p = json.load(open(pj))
p['name'] = 'Fetch Desk'
p['metadata']['cloudservices'] = {"instanceId": "backend_fetchdesk", "endpoint": "http://localhost:8597", "appId": "backend_fetchdesk", "type": "nodegx"}
json.dump(p, open(pj, 'w'), indent=2)
home = os.path.join(root, 'components', 'Pages', 'Home')
nodes = json.load(open(os.path.join(home, 'nodes.json')))
drop = {'countText', 'filter'}
nodes['nodes'] = [n for n in nodes['nodes'] if n['id'] not in drop]
button = lambda id, label: {"id": id, "type": "net.noodl.controls.button", "label": label, "parent": "shell", "parameters": {"label": label}, "x": 160, "y": 600}
nodes['nodes'] += [button('refreshButton', 'Refresh'), button('addButton', 'Add Zed in Berlin'),
  {"id": "createZed", "type": "NewDbModelProperties", "label": "Create Zed", "parameters": {"collectionName": "Contact", "prop-name": "Zed", "prop-city": "Berlin", "prop-vip": True}, "x": 700, "y": 600}]
for n in nodes['nodes']:
    if n['id'] == 'shell': n['children'] = [c for c in n['children'] if c not in drop][:2] + ['refreshButton', 'addButton'] + [c for c in n['children'] if c not in drop][2:]
    if n['id'] == 'headline': n['parameters']['text'] = 'Fetch Desk'
    if n['id'] == 'searchInput': n['parameters']['placeholder'] = 'City'
    if n['id'] == 'searchVar': n['parameters']['name'] = 'city'
    if n['id'] == 'query':
        n['parameters'] = {
            "collectionName": "Contact",
            "visualFilter": {"combinator": "and", "rules": [{"property": "city", "operator": "equal to", "input": "city"}]},
            "visualSort": [{"property": "name", "order": "ascending"}],
            "runOnChange-collectionName": False, "runOnChange-querySettings": False, "runOnChange-records": False,
            "runOnChange-search": False, "runOnChange-qp-city": False}
json.dump(nodes, open(os.path.join(home, 'nodes.json'), 'w'), indent=2)
conns = json.load(open(os.path.join(home, 'connections.json')))
conns['connections'] = [c for c in conns['connections'] if c['fromId'] not in drop and c['toId'] not in drop]
conns['connections'] += [
  {"fromId": "query", "fromProperty": "items", "toId": "contactList", "toProperty": "items"},
  {"fromId": "searchVar", "fromProperty": "value", "toId": "query", "toProperty": "qp-city"},
  {"fromId": "refreshButton", "fromProperty": "onClick", "toId": "query", "toProperty": "storageFetch"},
  {"fromId": "addButton", "fromProperty": "onClick", "toId": "createZed", "toProperty": "store"},
  {"fromId": "createZed", "fromProperty": "done", "toId": "query", "toProperty": "storageFetch"}]
json.dump(conns, open(os.path.join(home, 'connections.json'), 'w'), indent=2)
reg = json.load(open(os.path.join(root, 'components', '_registry.json')))
reg['components']['Pages/Home']['nodeCount'] = len(nodes['nodes'])
reg['components']['Pages/Home']['connectionCount'] = len(conns['connections'])
json.dump(reg, open(os.path.join(root, 'components', '_registry.json'), 'w'), indent=2)
print('fetch-desk:', len(nodes['nodes']), 'nodes,', len(conns['connections']), 'connections on Home')
