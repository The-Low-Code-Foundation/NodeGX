# Usage: dd.py <dispdiff.json> — gained (deferred → anything else), lost (anything else → deferred), re-worded (deferred → deferred), by project.
import json, sys, collections
d = json.load(open(sys.argv[1]))
g = [x for x in d if x['before']['kind'] == 'deferred' and x['after']['kind'] != 'deferred']
l = [x for x in d if x['before']['kind'] != 'deferred' and x['after']['kind'] == 'deferred']
r = [x for x in d if x['before']['kind'] == 'deferred' and x['after']['kind'] == 'deferred']
o = [x for x in d if x not in g and x not in l and x not in r]
print('gained', len(g), 'lost', len(l), 're-worded', len(r), 'other', len(o))
print('gained by project', dict(collections.Counter(x['project'] for x in g)))
for x in l: print('LOST', x['project'], x['component'], x['type'], x['label'], '|', x['after'].get('reason', '')[:200])
for x in o: print('OTHER', x['project'], x['component'], x['type'], x['before']['kind'], '->', x['after']['kind'])
for x in r[:12]: print('REWORD', x['project'], x['component'], x['type'], '|', x['before'].get('reason', '')[:90], '=>', x['after'].get('reason', '')[:110])
