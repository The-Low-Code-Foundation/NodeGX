# Usage: condpulse.py <emitted templates dir> — every placed component a pulse count is passed to, and whether its parent
# draws it under a condition (`{cond && (` above the tag): the placements whose pulse can arrive as they mount.
import sys,re,os
root=sys.argv[1]
for dp,dn,fn in os.walk(root):
  for f in fn:
    if not f.endswith('.tsx'): continue
    p=os.path.join(dp,f); L=open(p).read().split('\n')
    for i,l in enumerate(L):
      m=re.search(r'(\w+)=\{\{ sent: (\w+Pulses)',l)
      if not m: continue
      j=i
      while j>0 and not re.match(r'\s*<[A-Z]\w*',L[j]): j-=1
      ind=len(L[j])-len(L[j].lstrip())
      cond=None
      for k in range(j-1,max(0,j-60),-1):
        s=L[k]; ki=len(s)-len(s.lstrip())
        if s.strip()=='' or s.strip().startswith('{/*') or s.strip().startswith('-') or s.strip().startswith('See') or s.strip().startswith('asked'): continue
        if ki<ind and s.rstrip().endswith('&& ('): cond=s.strip(); break
        if ki<ind and re.match(r'\s*<[a-zA-Z]',s): ind=ki
        if ki<2: break
      print(('COND ' if cond else 'ALWAYS ')+p.replace(root,'')+':'+str(i+1)+' '+m.group(1)+' '+(cond or ''))
