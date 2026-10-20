# Usage: python3 -I deadrow.py <dir of emitted apps> — every §4f row ("The last run of X") whose setter the emitted file never calls, and how often it is read (P18-S122-DEADROW).
import os,re,sys
root=sys.argv[1]; n=0; dead=[]
for dp,_,fs in os.walk(root):
  for f in fs:
    if not f.endswith('.tsx'): continue
    t=open(os.path.join(dp,f)).read()
    for m in re.finditer(r"// The last run of (\w+) \(§4f\)[^\n]*\n\s*const \[(\w+), (\w+)\] = useState", t):
      n+=1
      if t.count(m.group(3)+'(')==0: 
        reads=len(re.findall(r'\b'+m.group(2)+r'\?\.', t))
        dead.append(f"{os.path.relpath(os.path.join(dp,f),root)} {m.group(1)} reads={reads}")
print(n,'rows,',len(dead),'never written'); print('\n'.join(dead))
