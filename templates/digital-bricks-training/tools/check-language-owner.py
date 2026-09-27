#!/usr/bin/env python3
"""ONE OWNER FOR *WHICH LANGUAGE THE VIEWER READS* (TASK-L162 AC1).

The property is NOT "the word language appears once". A `Language Bundle`
legitimately carries a language: it declares what the strings it registers ARE.
That is a different question from what the viewer reads, and collapsing the two
is the bug this guard exists to stop -- wiring the viewer's language into a
bundle whose JSON does not change with it re-registers the ENGLISH strings under
the new code, so the switch renders English always and appears to work.

So what is asserted here is:
  1. exactly one `i18next` node in the project -- it owns the value;
  2. nothing else DECIDES a language: no other node carries a Language/locale
     parameter, and the bundles take theirs from the owner by wire;
  3. every `/Data/Strings` instance is told the language, because an instance
     that is not told silently serves English while the rest of the page moves;
  4. every `Translation` node names a namespace some `Language Bundle` actually
     registers, with its Bundle wired. A Translation on an unregistered
     namespace resolves to nothing and the Text it feeds keeps its editor
     default -- measured: L167's dossier eyebrow read "TEXT" on /course, with
     every other tool green (TASK-L167).

Run: python3 tools/check-language-owner.py
"""
import json, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGY = ('language', 'locale', 'lang')
problems, checked = [], {'components': 0, 'nodes': 0, 'i18next': 0, 'strings_instances': 0, 'translations': 0, 'bundles': 0}
translations, registered = [], set()


def components():
    for f in sorted(glob.glob(os.path.join(ROOT, 'components', '**', 'nodes.json'), recursive=True)):
        name = os.path.dirname(f)[len(os.path.join(ROOT, 'components')) + 1:]
        cons = os.path.join(os.path.dirname(f), 'connections.json')
        conns = json.load(open(cons))['connections'] if os.path.exists(cons) else []
        yield name, json.load(open(f))['nodes'], conns


for name, nodes, conns in components():
    checked['components'] += 1
    for n in nodes:
        checked['nodes'] += 1
        t, nid = n.get('type', ''), n.get('id')
        params = n.get('parameters') or {}

        if t == 'i18next':
            checked['i18next'] += 1
            if 'Language' not in params:
                problems.append(f'{name}/{nid}: the i18next node carries no Language parameter -- '
                                'it is the one place the value is written.')
            continue

        # 2. nobody else DECIDES a language.
        for k in params:
            if any(w in k.lower() for w in LANGY):
                if t == 'Language Bundle':
                    problems.append(
                        f'{name}/{nid}: a Language Bundle writes "{k}" as a parameter. It must be '
                        'wired from the one owner instead, so the language it registers under and '
                        'the JSON it registers always move together (TASK-L162 §1).')
                elif not (t == 'Variable' and params.get('name') == 'language'):
                    problems.append(f'{name}/{nid} ({t}): parameter "{k}" names a language. '
                                    'Only the i18next node in App decides that.')

        # 4. collected here, asserted after the walk.
        if t == 'Translation':
            translations.append((name, nid, params.get('Namespace')))
        if t == 'Language Bundle' and [c for c in conns if c['toId'] == nid and c['toProperty'] == 'Bundle']:
            registered.add(params.get('Namespace'))

        # 3. a string table that is never told the language serves English in silence.
        if t == '/Data/Strings':
            checked['strings_instances'] += 1
            if not [c for c in conns if c['toId'] == nid and c['toProperty'] == 'language']:
                problems.append(
                    f'{name}/{nid}: this /Data/Strings instance has no `language` input wired, so it '
                    'resolves to English whatever the owner says, and its kit copy will not switch.')

checked['translations'], checked['bundles'] = len(translations), len(registered)
for name, nid, ns in translations:
    if ns not in registered:
        problems.append(f'{name}/{nid}: a Translation reads namespace "{ns}", which no wired Language Bundle '
                        'registers, so it resolves to nothing and its Text shows the editor default. Add a '
                        'Language Bundle for it in App, fed from Data/Strings (TASK-L167).')

if checked['i18next'] != 1:
    problems.append(f'expected exactly ONE i18next node in the project, found {checked["i18next"]}.')

# guard-the-guard: a walk that finds nothing makes every assertion pass by testing nothing.
if checked['components'] < 10 or checked['nodes'] < 100 or checked['strings_instances'] < 1 \
        or checked['translations'] < 10 or checked['bundles'] < 5:
    problems.append(f'the walk itself looks wrong: {checked} -- refusing to report a pass.')

print(f'checked {checked}')
if problems:
    print('\nFAIL:')
    for p in problems:
        print('  -', p)
    sys.exit(1)
print('OK: one owner for the language, and every string table is told what it is.')
