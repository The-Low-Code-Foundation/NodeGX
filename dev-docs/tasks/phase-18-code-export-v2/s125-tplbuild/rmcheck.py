import os,sys,difflib,glob
a,b=sys.argv[1],sys.argv[2]
other=[]
for root,_,files in os.walk(b):
  for f in files:
    p=os.path.join(root,f); rel=os.path.relpath(p,b); q=os.path.join(a,rel)
    if not f.endswith('.tsx') or not os.path.exists(q): continue
    o=open(q).read().split('\n'); n=open(p).read().split('\n')
    if o==n: continue
    proj=rel.split('/')[0]; d=os.path.dirname(rel).split('/src/')[-1] if '/src/' in rel else ''
    sub=os.path.join(b,proj,'src','functions',os.path.relpath(os.path.dirname(p),os.path.join(b,proj,'src')),f[:-4])
    moved=set()
    for g in glob.glob(sub+'/*.ts'):
      L=open(g).read().split('\n'); i=[k for k,l in enumerate(L) if l.startswith('// From the Function node')][0]
      moved.update(l.replace('export function ','function ',1) for l in L[i:])
    for l in difflib.unified_diff(o,n,lineterm='',n=0):
      if l.startswith('-') and not l.startswith('---') and l[1:] not in moved and l[1:].strip()!='': other.append((rel,l[:140]))
print(len(other)); [print(*x) for x in other[:10]]
