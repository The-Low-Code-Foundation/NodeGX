import json,collections,sys
d=json.load(open(sys.argv[1]))
k=lambda x: x['kind'] if x else 'none'
c=collections.Counter()
for r in d:
  if 'error' in r: c['ERROR '+r['error'][:80]]+=1; continue
  c[(k(r['before']),k(r['after']))]+=1
print(c)
lost=[r for r in d if 'error' not in r and k(r['before'])!='deferred' and k(r['after'])=='deferred']
print('LOST',len(lost))
for r in lost[:30]: print('  ',r['project'],r['component'],r['type'],r['label'],r['after'].get('reason','')[:220])
g=collections.Counter((r['project'],r['type']) for r in d if 'error' not in r and k(r['before'])=='deferred' and k(r['after'])!='deferred')
print('GAINED',sum(g.values())); [print('  ',v,kk) for kk,v in g.most_common()]
rw=collections.Counter(r['after'].get('reason','')[:150] for r in d if 'error' not in r and k(r['before'])=='deferred' and k(r['after'])=='deferred')
print('REWORDED',sum(rw.values())); [print('  ',v,kk) for kk,v in rw.most_common(25)]
