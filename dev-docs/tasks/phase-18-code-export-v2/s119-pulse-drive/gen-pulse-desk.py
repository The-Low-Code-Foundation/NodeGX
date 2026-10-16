# EXP-011 §86 drive fixture (session 119): the export suite's pulse-desk with its Function's reset moved ahead of the
# empty-name test, so a refused Send writes `problem` twice (`''`, then the sentence) before `refused`. That is the shape
# P18-S119-FIRSTWRITE is about: the runtime's refused chain reads the first write. No backend.
import json, os, shutil
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures', 'pulse-desk')
root = os.path.join(here, 'pulse-desk')
shutil.rmtree(root, ignore_errors=True)
shutil.copytree(src, root)
home = os.path.join(root, 'components', 'Pages', 'Home', 'nodes.json')
nodes = json.load(open(home))
for n in nodes['nodes']:
    if n['id'] == 'hold':
        n['parameters']['functionScript'] = "\n".join([
            "const name = String(Inputs.name || '').trim();",
            "Outputs.problem = '';",
            "if (name === '') {",
            "  Outputs.problem = 'Type a name first';",
            "  Outputs.refused();",
            "  return;",
            "}",
            "Outputs.greeting = 'Hello, ' + name;",
            "Outputs.sends = (Outputs.sends || 0) + 1;",
            "Outputs.go();"])
json.dump(nodes, open(home, 'w'), indent=2)
print('pulse-desk: the reset ahead of the test')
