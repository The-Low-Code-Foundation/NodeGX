# P132 s19: seed a Greenhouse copy for an editor drive of BWF-013 (two pieces, a ring through azdazd) and a profile
# listing only it. Usage: cp -R '<NodeGX test projects>/Greenhouse' <dir>/Greenhouse; python3 editor-seed-bwf013.py <dir>
# then NOODL_USER_DATA_DIR=<dir>/profile npm run dev:debug -- --quiet
import json, sys, uuid, time
root = sys.argv[1]
p = root + '/Greenhouse/nodegx.project.json'
d = json.load(open(p))
d['id'] = str(uuid.uuid4())
(d.get('metadata') or {}).pop('cloudservices', None)
json.dump(d, open(p, 'w'), indent=2)
a = root + '/Greenhouse/nodegx.automations.json'
f = json.load(open(a))
f['workflows'].append({'id': 'find-thirsty', 'name': 'Find thirsty plants', 'entry': 'check', 'concurrency': 1, 'steps': [
  {'id': 'check', 'kind': 'call-function', 'ref': 'Cloud Functions/Check thirst', 'params': {'plant': {'$path': 'body.plant'}}, 'next': ['done'], 'ui': {'x': 0, 'y': 0}},
  {'id': 'done', 'kind': 'return', 'params': {'value': {'$path': 'upstream.check.result'}}, 'ui': {'x': 0, 'y': 160}}]})
f['workflows'].append({'id': 'plant-round', 'name': 'Plant round', 'entry': 'run', 'concurrency': 1, 'steps': [
  {'id': 'run', 'kind': 'run-workflow', 'params': {'workflow': 'find-thirsty'}, 'next': ['done'], 'ui': {'x': 0, 'y': 0}},
  {'id': 'done', 'kind': 'return', 'params': {'value': {'$path': 'upstream.run.result'}}, 'ui': {'x': 0, 'y': 160}}]})
az = [w for w in f['workflows'] if w['id'] == 'azdazd'][0]
az['steps'][0]['routes'] = {'ontrue': ['r']}
az['steps'].append({'id': 'r', 'kind': 'run-workflow', 'params': {'workflow': 'plant-round'}, 'ui': {'x': 0, 'y': 200}})
json.dump(f, open(a, 'w'), indent=2)
prof = root + '/profile'
import os; os.makedirs(prof, exist_ok=True)
json.dump({'recentProjects': [{'retainedProjectDirectory': root + '/Greenhouse', 'latestAccessed': int(time.time()*1000), 'id': d['id'], 'name': d.get('name', 'Greenhouse')}]}, open(prof + '/recently_opened_project.json', 'w'))
print(d['id'], d.get('name'))
