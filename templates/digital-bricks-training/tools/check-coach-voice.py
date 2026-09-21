#!/usr/bin/env python3
"""A COACH NEVER READS A SENTENCE WRITTEN TO THE LEARNER (TASK-L163 AC3).

The coach's voice is an OVERLAY on the English base, exactly as a locale is --
one mechanism, two uses. The two fail DIFFERENTLY, and that asymmetry is the
whole reason this file exists:

  a LOCALE miss falls back to English. Wrong language, right meaning, and a
  reader can see it.

  a VOICE miss falls back to the LEARNER'S SENTENCE. It tells a coach "Your
  coach hasn't written this one up yet" about their own review, and "You've
  finished 7 things on this programme" about somebody else's work. It is
  grammatical, it is in the right language, and nothing in the graph can see it.

So this resolves the coach bundle the way `Data/Strings` does and fails on any
resolved string that still addresses the reader as the learner.

Run: python3 tools/check-coach-voice.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRINGS = os.path.join(ROOT, 'components', 'Data', 'Strings', 'nodes.json')
KIT = os.path.join(ROOT, 'noodl_modules', 'dbt-lesson', 'index.js')

SECOND_PERSON = re.compile(r"\b(you|your|yours|you['’](?:ve|re|ll|d))\b", re.I)

# ── WHAT A COACH SURFACE ACTUALLY RENDERS ───────────────────────────────────
# The property is NOT "the word you appears nowhere in the coach bundle", and
# the first version of this guard asserted exactly that: it reported 26
# failures, 20 of them strings on pages a coach never opens (the lesson kit's
# placeholders, the learner's home, /course's own eyebrows). Reporting those
# would be reporting a category error as damage, and "fixing" them would mean
# writing coach wordings for 20 strings nobody would ever render (L81's rung, as
# copy).
#
# So the scan is scoped to the namespaces a COACH SURFACE draws. Today that is
# the timeline and the standing panels, which are what L164 and L165 put in
# front of a coach; a coach page's own copy joins this list when it exists,
# which is a deliberate one-line act rather than a default.
# `people` joined with TASK-L164: the roster is the first page only a coach opens.
COACH_NAMESPACES = ('timeline', 'standing', 'people')

# ── WHERE THE SECOND PERSON IS THE COACH, NOT THE LEARNER ───────────────────
# The failure this file exists to catch is a coach reading a sentence written TO
# THE LEARNER. "You wrote" on a coach's own message is the opposite: it is the
# coach being addressed correctly, and a pattern that cannot tell them apart is
# the pattern's problem. Loosening the regex would excuse every real hit too, so
# these are named one at a time with the reason (L91: attribute, do not soften).
COACH_IS_YOU = {
    'timeline.messageFromCoach': "the coach's own turn in the conversation -- 'You wrote' addresses "
                                 "the coach, which is the whole point of overriding it",
    'people.learner.headline.note': "the page head naming a note the COACH wrote -- 'A note you wrote' "
                                    "is the product's own phrase (LearnerShell.tsx headline) and the "
                                    "coach is the only reader of the people namespace (TASK-L165)",
    'people.learner.log.lede': "the activity log's lede -- 'your notes, your messages' are the "
                               "coach's, beside 'what they sent in'; the product's own sentence "
                               "(TimelineFeed.tsx), read by a coach only (TASK-L165)",
}

# ── INHERITED AND NEVER RENDERED TO A COACH ─────────────────────────────────
# Each entry names the key, the reason, and the SOURCE THAT SUPPRESSES IT -- so
# the exemption is a claim about the code, and the claim is checked below. An
# exemption with no enforcement is how a suppression gets deleted and a learner's
# sentence starts reading on a coach's screen with this guard still green.
SUPPRESSED = {
    'timeline.ask': (
        "the ask control is a learner's; it posts as whoever is signed in, so on a coach's "
        "surface it would write the coach's question into their client's thread (L135's "
        "mode=staff reasoning, ported)",
        # THE EXACT EXPRESSION THAT GATES THE CONTROL, not a substring of it.
        # `audience === 'learner'` alone appears three times in the kit (the
        # validation, the message suppression, this) -- so it witnessed nothing,
        # and deleting the suppression left this guard green. Demonstrated.
        "open && audience === 'learner'",
    ),
}

problems, checked = [], {'base': 0, 'coach_overrides': 0, 'in_scope': 0, 'suppressed': 0, 'coach_is_you': 0}


def leaves(o, prefix='', into=None):
    into = [] if into is None else into
    for k, v in (o or {}).items():
        if k.startswith('_'):
            continue
        path = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            leaves(v, path, into)
        else:
            into.append((path, v))
    return into


def deep_merge(a, b):
    out = dict(a or {})
    for k, v in (b or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


doc = json.load(open(STRINGS))
nodes = {n['id']: n for n in doc['nodes']}
kit = json.loads(nodes['str_data']['parameters']['json'])[0]
graph = json.loads(nodes['str_graph']['parameters']['json'])[0]

english = deep_merge(kit, graph)
voice = english.pop('coach', {})
base = english

checked['base'] = len(leaves(base))
checked['coach_overrides'] = len([p for p, _ in leaves(voice)])
resolved = deep_merge(base, voice)

# 1. a coach override that names a key the base does not have replaces nothing.
base_paths = {p for p, _ in leaves(base)}
for path, _ in leaves(voice):
    if path not in base_paths:
        problems.append(f'coach override `{path}` names a key the English base does not have, '
                        'so it replaces nothing and renders nowhere.')

# 2. THE PROPERTY: no resolved coach string, on a surface a coach reads,
#    addresses the reader as the learner.
for ns in COACH_NAMESPACES:
    if ns not in resolved:
        problems.append(f'namespace `{ns}` is declared as a coach surface and is not in the '
                        'string table -- the scan below covers nothing.')
for path, value in leaves(resolved):
    if not isinstance(value, str):
        continue
    if path.split('.')[0] not in COACH_NAMESPACES:
        continue
    checked['in_scope'] += 1
    if not SECOND_PERSON.search(value):
        continue
    if path in COACH_IS_YOU:
        checked['coach_is_you'] += 1
        continue
    if path in SUPPRESSED:
        checked['suppressed'] += 1
        continue
    problems.append(f'`{path}` reads to a coach as if they were the learner: {value!r} '
                    '-- add it to the `coach` overlay in Data/Strings.')

# 2b. an entry in either list that is NOT second person is excusing nothing, and
#     an unused exemption is how the next real one slips past unnoticed.
for path, reason in COACH_IS_YOU.items():
    found = dict(leaves(resolved)).get(path)
    if found is None:
        problems.append(f'`{path}` is listed as the coach being addressed and no longer exists.')
    elif not SECOND_PERSON.search(str(found)):
        problems.append(f'`{path}` is listed as the coach being addressed and is not second '
                        f'person at all: {found!r}. Delete the entry.')

# 3. EVERY EXEMPTION IS A CLAIM ABOUT THE CODE, AND THE CODE IS READ.
kit_src = open(KIT).read() if os.path.exists(KIT) else ''
for path, (reason, evidence) in SUPPRESSED.items():
    found = dict(leaves(base)).get(path)
    if found is None:
        problems.append(f'`{path}` is exempted but no longer exists -- delete the exemption.')
    elif not SECOND_PERSON.search(str(found)):
        problems.append(f'`{path}` is exempted as second-person and is not: {found!r}. '
                        'The exemption is excusing nothing and hides the next one.')
    if evidence and evidence not in kit_src:
        problems.append(f'`{path}` is exempted because the kit suppresses it, and the kit no '
                        f'longer contains {evidence!r}. Either the suppression went or it moved; '
                        'a coach may now be reading it.')

# ── GUARD THE GUARD ─────────────────────────────────────────────────────────
# A scanner that resolves nothing makes every assertion pass by testing nothing
# (L111 found exactly that in a guard written an hour earlier).
if checked['base'] < 80 or checked['coach_overrides'] < 10 or checked['in_scope'] < 40:
    problems.append(f'the scan itself looks wrong: {checked} -- refusing to report a pass.')
if not SECOND_PERSON.search("You've finished 7 things") or SECOND_PERSON.search('They have finished 7 things'):
    problems.append('the second-person pattern does not discriminate -- refusing to report a pass.')
if not kit_src:
    problems.append(f'the kit bundle was not readable at {KIT} -- the exemption evidence was not checked.')

# ── AND EVERY INSTANCE SAYS WHO IS READING ──────────────────────────────────
# The throw in `Data/Strings` catches this at run time, on the page, in front of
# whoever opened it. This catches it here. Same shape as check-language-owner.py
# §3: an instance that is not told serves the wrong audience's words, and the
# one on /course is the one that matters because it feeds BOTH Logic nodes.
import glob
instances = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'components', '**', 'nodes.json'), recursive=True)):
    name = os.path.dirname(f)[len(os.path.join(ROOT, 'components')) + 1:]
    for n in json.load(open(f))['nodes']:
        if n.get('type') != '/Data/Strings':
            continue
        instances += 1
        aud = (n.get('parameters') or {}).get('audience')
        if aud not in ('learner', 'coach'):
            problems.append(f'{name}/{n["id"]}: this /Data/Strings instance does not say who is '
                            f'reading (audience={aud!r}). There is no default, on purpose.')
checked['instances'] = instances
if instances < 1:
    problems.append('no /Data/Strings instance was found at all -- refusing to report a pass.')

print(f'checked {checked}')
if problems:
    print('\nFAIL:')
    for p in problems:
        print('  -', p)
    sys.exit(1)
print("OK: the coach's bundle addresses nobody as the learner.")
