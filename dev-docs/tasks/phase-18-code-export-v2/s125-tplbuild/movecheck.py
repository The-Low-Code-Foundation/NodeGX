import os,sys,difflib,re
a,b=sys.argv[1],sys.argv[2]
moved=0;bad=0;comp_other=0
for root,_,files in os.walk(b):
  for f in files:
    p=os.path.join(root,f); rel=os.path.relpath(p,b)
    if '/src/functions/' not in '/'+rel: continue
    proj, _, rest = rel.partition('/src/functions/')
    d, base, fn = rest.rsplit('/',2)[0], rest.rsplit('/',2)[1], rest.rsplit('/',2)[2]
    comp=os.path.join(a,proj,'src',d,base+'.tsx')
    old=open(comp).read()
    new=open(p).read().split('\n')
    i=next(k for k,l in enumerate(new) if l.startswith('// From the Function node'))
    wrapper='\n'.join(new[i:]).replace('export function ','function ',1).rstrip('\n')
    moved+=1
    if wrapper not in old: bad+=1; print('NOT VERBATIM', rel)
print('moved',moved,'not verbatim',bad)
# component files: removed lines only wrappers, added lines only imports
for root,_,files in os.walk(b):
  for f in files:
    p=os.path.join(root,f); rel=os.path.relpath(p,b); q=os.path.join(a,rel)
    if not os.path.exists(q) or not f.endswith('.tsx'): continue
    o=open(q).read().split('\n'); n=open(p).read().split('\n')
    if o==n: continue
    for l in difflib.unified_diff(o,n,lineterm='',n=0):
      if l.startswith('+') and not l.startswith('+++') and not re.match(r"^\+import \{ \w+ \} from '\.\./functions/", l) and l.strip()!='+': comp_other+=1; print(rel, l[:150])
print('other added lines', comp_other)
