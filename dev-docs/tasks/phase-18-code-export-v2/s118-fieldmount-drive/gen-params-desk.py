# P18-S115-QUERYPARAMS drive fixture (session 116, re-used by s118's FIELDMOUNT drive): the export suite's search-desk with its Filter Records and count
# removed. Its Query Records' Filter is in the QueryEditor shape every wired filter in the corpus has: `city equal to
# <city>` AND `vip equal to true`, sorted by name. `city` is the Variable the search box writes (onTextChanged), wired
# into the filter's `qp-city`. Backend app id backend_paramsdesk on :8596.
import json, os, shutil
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'search-desk')
root = os.path.join(here, 'params-desk')
shutil.rmtree(root, ignore_errors=True)
shutil.copytree(src, root)
pj = os.path.join(root, 'nodegx.project.json')
p = json.load(open(pj))
p['name'] = 'Params Desk'
p['metadata']['cloudservices'] = {"instanceId": "backend_paramsdesk", "endpoint": "http://localhost:8596", "appId": "backend_paramsdesk", "type": "nodegx"}
json.dump(p, open(pj, 'w'), indent=2)
home = os.path.join(root, 'components', 'Pages', 'Home')
nodes = json.load(open(os.path.join(home, 'nodes.json')))
drop = {'countText', 'filter'}
nodes['nodes'] = [n for n in nodes['nodes'] if n['id'] not in drop]
for n in nodes['nodes']:
    if n['id'] == 'shell': n['children'] = [c for c in n['children'] if c not in drop]
    if n['id'] == 'headline': n['parameters']['text'] = 'Params Desk'
    if n['id'] == 'searchInput': n['parameters']['placeholder'] = 'City'
    if n['id'] == 'searchVar': n['parameters']['name'] = 'city'
    if n['id'] == 'query':
        n['parameters'] = {
            "collectionName": "Contact",
            "visualFilter": {"combinator": "and", "rules": [
                {"property": "city", "operator": "equal to", "input": "city"},
                {"property": "vip", "operator": "equal to", "value": True}]},
            "visualSort": [{"property": "name", "order": "ascending"}]}
json.dump(nodes, open(os.path.join(home, 'nodes.json'), 'w'), indent=2)
conns = json.load(open(os.path.join(home, 'connections.json')))
conns['connections'] = [c for c in conns['connections'] if c['fromId'] not in drop and c['toId'] not in drop]
conns['connections'].append({"fromId": "query", "fromProperty": "items", "toId": "contactList", "toProperty": "items"})
conns['connections'].append({"fromId": "searchVar", "fromProperty": "value", "toId": "query", "toProperty": "qp-city"})
json.dump(conns, open(os.path.join(home, 'connections.json'), 'w'), indent=2)
reg = json.load(open(os.path.join(root, 'components', '_registry.json')))
reg['components']['Pages/Home']['nodeCount'] = len(nodes['nodes'])
reg['components']['Pages/Home']['connectionCount'] = len(conns['connections'])
json.dump(reg, open(os.path.join(root, 'components', '_registry.json'), 'w'), indent=2)
print('params-desk:', len(nodes['nodes']), 'nodes,', len(conns['connections']), 'connections on Home')
