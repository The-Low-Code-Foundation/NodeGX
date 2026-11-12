# HTX-006: the menu's look, read by drive.cjs: in the game (G1), in its own app (REF), wider (G5), and without the cut (CTRL).
import json, os
r = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'readings.json')))
step = lambda n: [s for s in r['steps'] if s['step'] == n][0]['look']
def diff(a, b):
    return [(el, p, a[el][p], b[el][p]) for el in b for p in b[el] if a[el][p] != b[el][p]]
g1, g5, ref, ctrl = step('G1'), step('G5'), r['REF']['look'], r['CTRL']['look']
cells = sum(len(v) for v in ref.values())
print(f'G1 (in the game) vs REF (its own app): {len(diff(g1, ref))} of {cells} cells differ')
print(f"G5 (wider) vs G1: {len(diff(g5, g1))} differ, all widths: {all(p == 'width' for _, p, _, _ in diff(g5, g1))}; panel {g1['panel']['width']} -> {g5['panel']['width']}")
# CTRL runs on the wider build (after W), so it is read against G5, the same build with the cut.
d = diff(ctrl, g5)
print(f'CTRL (the wider build, no cut) vs G5 (the same build, with it): {len(d)} of {cells} cells differ')
for el, p, a, b in d:
    print(f'  {el:7} {p:17} {a!s:40} (with the cut: {b})')
print('own files equal after the re-export:', r['ownFilesEqual'], '| E2 changed:', r['E2']['changed'], '| H exit', r['H']['exit'], 'nothing written:', r['H']['nothingWritten'])
