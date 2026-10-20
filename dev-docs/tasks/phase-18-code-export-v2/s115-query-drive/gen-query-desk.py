# P18-S115-QUERYFILTER drive fixture: the export suite's search-desk with its Filter Records, search box and count
# removed, and its Query Records given a Filter (builder shape: and / or groups, a Date column), a two-key Sort and
# Use Limit (Limit 3, Skip 1), feeding the For Each directly. Backend app id backend_querydesk on :8595.
import json, os, shutil, sys
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'search-desk')
root = os.path.join(here, 'query-desk')
shutil.rmtree(root, ignore_errors=True)
shutil.copytree(src, root)
pj = os.path.join(root, 'nodegx.project.json')
p = json.load(open(pj))
p['name'] = 'Query Desk'
p['metadata']['cloudservices'] = {"instanceId": "backend_querydesk", "endpoint": "http://localhost:8595", "appId": "backend_querydesk", "type": "nodegx"}
json.dump(p, open(pj, 'w'), indent=2)
home = os.path.join(root, 'components', 'Pages', 'Home')
nodes = json.load(open(os.path.join(home, 'nodes.json')))
drop = {'searchInput', 'countText', 'searchVar', 'filter'}
nodes['nodes'] = [n for n in nodes['nodes'] if n['id'] not in drop]
f = lambda i, field, op, value: {"id": i, "kind": "field", "field": field, "operator": op, "value": value}
for n in nodes['nodes']:
    if n['id'] == 'shell': n['children'] = [c for c in n['children'] if c not in drop]
    if n['id'] == 'headline': n['parameters']['text'] = 'Query Desk'
    if n['id'] == 'query':
        n['parameters'] = {
            "collectionName": "Contact",
            "visualFilter": {"id": "q", "type": "and", "conditions": [
                f("q-0", "vip", "equalTo", True),
                f("q-1", "joined", "greaterThan", "2020-01-01"),
                {"id": "q-2", "type": "or", "conditions": [f("q-2-0", "city", "startsWith", "Ber"), f("q-2-1", "age", "greaterThan", 40)]}]},
            "visualSort": [{"property": "age", "order": "descending"}, {"property": "name", "order": "ascending"}],
            "storageEnableLimit": True, "storageLimit": 3, "storageSkip": 1}
json.dump(nodes, open(os.path.join(home, 'nodes.json'), 'w'), indent=2)
conns = json.load(open(os.path.join(home, 'connections.json')))
conns['connections'] = [c for c in conns['connections'] if c['fromId'] not in drop and c['toId'] not in drop]
conns['connections'].append({"fromId": "query", "fromProperty": "items", "toId": "contactList", "toProperty": "items"})
json.dump(conns, open(os.path.join(home, 'connections.json'), 'w'), indent=2)
reg = json.load(open(os.path.join(root, 'components', '_registry.json')))
reg['components']['Pages/Home']['nodeCount'] = len(nodes['nodes'])
reg['components']['Pages/Home']['connectionCount'] = len(conns['connections'])
json.dump(reg, open(os.path.join(root, 'components', '_registry.json'), 'w'), indent=2)
print('query-desk:', len(nodes['nodes']), 'nodes,', len(conns['connections']), 'connections on Home')
