/**
 * P116 ONT-001 — the fourteen relation kinds ONT-000 read off eight apps, and (ONT-011 step 2) the
 * fifteenth, *settled*, read off step 1's borrow candidates.
 *
 * `sentence`, `distinguishes` and `projectsTo` are the census's words, verbatim; `evidence` is
 * its count. A test pins both against `kinds.hand.json` and `kinds.json`, so this file cannot
 * drift from what was measured. The questions split the census's question line into things a
 * person can answer one at a time, and add the three notes and Richard's seven rows where they
 * name the kind — each says which.
 *
 * Every relation NodeGX itself has produced so far is a string id (ONT-000 §6): no template and
 * no lessons-backend field uses a Link. That is the first mutant of `belongs-to` below.
 *
 * ONT-005: every mutant seed carries the question that kills it and an executable `shape`
 * (`kind.ts` `MutantShape`); `world/mutants.ts` makes each one and the backend grades it on two
 * engines. A seed `from: 'task'` is one of ONT-005 §3.1's ten, read from the corpus and Richard's
 * rows at scoping, that no census or oral seed already named.
 */
import { defineKind, type Kind, type ProjectedField, type ProjectedRule } from './kind';

const SOURCE = 'dev-docs/tasks/phase-116-the-person-says-what-their-world-is/kinds.json';
const GOES = ['goes-too', 'stays-unlinked', 'blocks'] as const;

const one = (to: string | readonly string[] | undefined): string => (Array.isArray(to) ? to[0] : (to as string)) || '';
/** "a person", "an account": the article a rule's words need before a noun the person named. */
const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

export const belongsTo = defineKind({
  id: 'belongs-to',
  version: 1,
  source: SOURCE,
  sentence: 'each {from} is attached to one {to}',
  distinguishes: "one target, no details on the link itself; read the other way it is 'has many' (the same edge)",
  projectsTo: 'Link (Pointer) with required/optional and an on-delete rule; the reverse read is a query, not a column',
  target: 'noun',
  carriesDetails: false,
  tile: { label: 'Belongs to one', line: 'each one is attached to exactly one of another', icon: '→' },
  questions: [
    {
      id: 'several',
      ask: 'Could a {from} ever be attached to several {to}s at once, now or later?',
      prevents:
        'a person modelled as belonging to one company, who turned out to belong to several once the field existed and real data was in it',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'is-on' },
      from: 'oral'
    },
    {
      id: 'required',
      ask: 'Must every {from} have a {to}, or can one stand alone?',
      prevents: 'records that exist without the thing they belong to, on screens that assume they never do',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'whenTargetGoes',
      ask: 'When a {to} goes, do its {from}s go with it, stay without one, or stop it going?',
      prevents: 'a removal that silently deletes, or silently orphans, what was attached to it',
      answer: { type: 'one-of', values: GOES },
      from: 'census'
    },
    {
      id: 'moves',
      ask: 'Can a {from} move to another {to} later?',
      prevents: 'a move that can only be done by deleting and re-creating, which loses the history',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ from, to, answers }) => {
    const field: ProjectedField = { on: 'from', name: one(to), kind: 'link', points: one(to), required: answers.required === true };
    if (typeof answers.whenTargetGoes === 'string') field.whenTargetGoes = answers.whenTargetGoes as ProjectedField['whenTargetGoes'];
    return { fields: [field], rules: answers.moves === false ? [{ on: 'from', says: `${a(from)}'s ${one(to)} is set once`, holds: { setOnce: one(to) } }] : [] };
  },
  mutants: [
    {
      id: 'id-as-text',
      mistake: 'the link stored as a text field holding the other record\'s id',
      why: 'nothing checks the id names a record, and nothing follows it when the record goes; every relation the templates and the lessons backend have is this',
      from: 'census',
      kills: 'the kind',
      shape: { asText: true }
    },
    {
      id: 'one-that-was-several',
      mistake: "a one-to-many made on 'this user only belongs to one company', then they belong to several, with real data in the field",
      why: "a 'belongs-to' that was an 'is-on'; 'could it ever be several' was not asked before data existed",
      from: 'oral',
      kills: 'several',
      shape: { changesKind: true }
    }
  ],
  evidence: { rows: 78, sources: ['template:members-area', 'template:planning', 'template:todo-list', 'lessons', 'acme', 'tirion', 'sentinel'] }
});

export const isOn = defineKind({
  id: 'is-on',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} is on a {to} for a while, with details of its own',
  distinguishes: "a junction record that carries details; a plain pairing with none is 'together'",
  projectsTo: 'a collection of its own with two Links and the details as fields; never a Links (Relation) column, which cannot hold a date',
  target: 'noun',
  carriesDetails: true,
  tile: { label: 'Is on, for a while', line: 'one is on another, with details of its own', icon: '⇄' },
  questions: [
    {
      id: 'counts',
      ask: 'What must be linked for a {from} to count as one — is a {from} on no {to} still a {from}?',
      prevents:
        'a paying member invisible for an unknown period, and a repair that made people without the links they needed to count',
      answer: { type: 'words' },
      from: 'note'
    },
    {
      id: 'several',
      ask: 'Can a {from} be on two {to}s at once?',
      prevents: 'a second account that overwrites the first, because the link was made to hold one',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'sameTime',
      ask: 'Can two {from}s be on the same {to} at the same time?',
      prevents: 'two people booked into one appointment slot, because the slots shown as free had no rule that one slot takes one booking',
      answer: { type: 'yes-no' },
      from: 'oral'
    },
    {
      id: 'startsEnds',
      ask: 'Does being on a {to} start and end — a date, an active switch?',
      prevents: "a link that cannot hold a date, so 'since when' and 'until when' are lost",
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'whenEnds',
      ask: 'When it ends, what stays and what goes?',
      prevents: 'an ending decided case by case, after the fact',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'details',
      ask: 'Which details belong to being on it, and not to the {from} or the {to} — a role, a type, a position?',
      prevents: 'a role kept on the person, so they can hold only one role across every account they are on',
      answer: { type: 'words' },
      from: 'census'
    }
  ],
  projection: ({ id, from, to, answers }) => {
    const fields: ProjectedField[] = [
      { on: 'own', name: from, kind: 'link', points: from, required: true, whenTargetGoes: 'goes-too' },
      { on: 'own', name: one(to), kind: 'link', points: one(to), required: true, whenTargetGoes: 'goes-too' }
    ];
    if (answers.startsEnds === true) fields.push({ on: 'own', name: 'since', kind: 'date' }, { on: 'own', name: 'until', kind: 'date' });
    const rules: ProjectedRule[] = [
      { on: 'own', says: `'${id}' is a record of its own, never a Links field: a Links field cannot hold a date or a role`, holds: { shape: true } }
    ];
    // "At a time": with a start and an end, only the links still running (no `until`) are counted.
    const open = answers.startsEnds === true ? { whileEmpty: 'until' } : {};
    if (answers.several === false) rules.push({ on: 'own', says: `${a(from)} is on one ${one(to)} at a time`, holds: { unique: [from], ...open } });
    if (answers.sameTime === false) rules.push({ on: 'own', says: `one ${from} on ${a(one(to))} at a time`, holds: { unique: [one(to)], ...open } });
    return { ownRecord: true, fields, rules };
  },
  mutants: [
    {
      id: 'links-column',
      mistake: 'a Links field between the two, with nowhere to put since when, until when or in what role',
      why: 'a pairing with details made as one without',
      from: 'census',
      kills: 'details',
      shape: { asKind: 'together', answers: { needsDetails: false, twice: false } }
    },
    {
      id: 'no-slot-rule',
      mistake: 'appointment slots shown as free, with no rule that one slot takes one booking, so two people land on one slot',
      why: "a booking is a person on a slot at a time; 'can two be on it at the same time' was not asked",
      from: 'oral',
      kills: 'sameTime',
      shape: { unanswered: 'sameTime' }
    },
    {
      id: 'link-column',
      mistake: 'one Link on the {from} naming its current {to}: one account, no history',
      why: "a Link holds one value; the {to}s it was on before, and since when, are overwritten — 'can it be on several' was answered for today only",
      from: 'task',
      kills: 'several',
      shape: { asKind: 'belongs-to', answers: { several: false } }
    },
    {
      id: 'no-end',
      mistake: 'no start and no end on being on it, so a thing that ends has no end date',
      why: "'at a time' cannot be told from 'ever': the one-at-a-time rule then counts every link that was ever made",
      from: 'task',
      kills: 'startsEnds',
      shape: { unanswered: 'startsEnds' }
    }
  ],
  evidence: { rows: 20, sources: ['template:members-area', 'lessons', 'acme', 'tirion'] }
});

export const together = defineKind({
  id: 'together',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} and a {to} go together',
  distinguishes: 'a junction with no details',
  projectsTo: 'Links (Relation) or a junction collection; the unique pair rule',
  target: 'noun',
  carriesDetails: false,
  tile: { label: 'Go together', line: 'a pairing, with nothing said about it', icon: '⇉' },
  questions: [
    {
      id: 'needsDetails',
      ask: 'Does the pairing ever need a date, a reason, a role or an order?',
      prevents: 'a pairing that later needed a date, with nowhere to put it',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'is-on' },
      from: 'census'
    },
    {
      id: 'twice',
      ask: 'Can the same {from} and {to} be paired twice?',
      prevents: 'a pair listed twice and counted twice in every total',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ from, to, answers }) => ({
    fields: [{ on: 'from', name: one(to), kind: 'links', points: one(to) }],
    rules:
      answers.twice === false
        ? [{ on: 'from', says: `${a(from)} and ${a(one(to))} are paired once`, holds: { pairOnce: one(to) } }]
        : answers.twice === true
          ? [{ on: 'from', says: `${a(from)} and ${a(one(to))} can be paired twice`, holds: { pairTwice: one(to) } }]
          : []
  }),
  mutants: [
    {
      id: 'pair-twice',
      mistake: 'a pairing with no rule that a pair is listed once',
      why: "'can the same pair be listed twice' was not asked",
      from: 'census',
      kills: 'twice',
      shape: { asKind: 'many-by-list', answers: { otherWay: false, grows: false, entryDetails: false } }
    }
  ],
  evidence: { rows: 4, sources: ['sentinel'], thin: 'one source: every row is from one prototype' }
});

export const oneOf = defineKind({
  id: 'one-of',
  version: 1,
  source: SOURCE,
  sentence: "a {from}'s {field} is one of a fixed list",
  distinguishes: 'a value from a declared list on the record itself, not a link to a record',
  projectsTo: 'Choice (String + oneOf rule); the mutant is free text where a list belongs',
  target: 'property',
  carriesDetails: false,
  tile: { label: 'One of a list', line: 'a value picked from a list you keep', icon: '☰' },
  questions: [
    {
      id: 'needsDetails',
      ask: 'Will you ever need details about a {field} itself — a description, an order, a picture?',
      prevents: 'product categories made as a text field; when they needed details they had to become records, after every product already held the text',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'belongs-to' },
      from: 'oral'
    },
    {
      id: 'whoAdds',
      ask: 'Who adds to the list of {field}s?',
      prevents: 'a list kept in the code, so every new value is a call to the developer',
      answer: { type: 'one-of', values: ['the people using it', 'a developer'] },
      // ONT-005: a list the people add to is a thing of its own (tags as a Choice is the mistake).
      changesKind: { when: 'the people using it', to: 'belongs-to' },
      from: 'census'
    },
    {
      id: 'sameForEveryone',
      ask: 'Is the list the same for everyone?',
      prevents: 'one list for every team, when each team had its own',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'retires',
      ask: 'Does a {field} ever retire?',
      prevents: 'a retired value removed from the list, leaving records that hold a value no screen can show',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ property, answers }) => ({
    fields: [{ on: 'from', name: property || '', kind: 'choice' }],
    rules:
      answers.retires === true
        ? [{ on: 'from', says: 'a retired value stays on the records that hold it, and is no longer offered', holds: { retiredStays: property || '' } }]
        : []
  }),
  mutants: [
    {
      id: 'free-text',
      mistake: 'a text field where a list belongs',
      why: 'every misspelling becomes a new value, and no screen can offer the list',
      from: 'census',
      kills: 'the kind',
      shape: { property: 'text' }
    },
    {
      id: 'category-as-text',
      mistake: 'a string field made for product categories, when it should have been a link to a category',
      why: "a fixed list typed as free text; when categories need details or ordering it is a 'belongs-to' to a category record",
      from: 'oral',
      kills: 'needsDetails',
      shape: { changesKind: true }
    },
    {
      id: 'open-list-as-choice',
      mistake: 'a fixed list where an open one belongs: tags, which the people using it add to, made as a Choice',
      why: 'every new value is a call to the developer; a list the people add to is a thing of its own, with records',
      from: 'task',
      kills: 'whoAdds',
      shape: { changesKind: true }
    }
  ],
  evidence: { rows: 24, sources: ['acme'], thin: 'one source: every row is from one business' }
});

export const manyByList = defineKind({
  id: 'many-by-list',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} carries a list of {to} on itself',
  distinguishes: 'ids or values stored as an array column, no record per entry',
  projectsTo: 'List (Array); the mutant is a list of ids that nobody can query from the other side',
  target: 'noun',
  carriesDetails: false,
  tile: { label: 'Carries a list', line: 'a short list kept on the thing itself', icon: '≡' },
  questions: [
    {
      id: 'otherWay',
      ask: 'Will you ever ask it the other way round: which {from}s name this {to}?',
      prevents: 'a parent carrying dozens of related records as a list; finding the right parent needed a nested query through the list, and it fell apart',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'together' },
      from: 'oral'
    },
    {
      id: 'grows',
      ask: 'Will the list grow to dozens?',
      prevents: 'a list that was three entries on day one and sixty in a year, read whole on every screen',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'entryDetails',
      ask: 'Will an entry in the list ever need details of its own?',
      prevents: 'a detail about one entry with nowhere to go',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'is-on' },
      from: 'census'
    }
  ],
  projection: ({ to }) => ({
    fields: [{ on: 'from', name: one(to), kind: 'list' }],
    rules: [{ on: 'from', says: 'nobody can ask the list the other way round', holds: { shape: true } }]
  }),
  mutants: [
    {
      id: 'dozens-on-the-parent',
      mistake: 'relation fields where the parent record has dozens of relations, and later a nested query to find the right parent',
      why: 'a list on the parent that nobody can query from the other side',
      from: 'oral',
      kills: 'otherWay',
      shape: { changesKind: true }
    }
  ],
  evidence: { rows: 8, sources: ['tirion'], thin: 'one source: every row is from one prototype' }
});

export const partOfTree = defineKind({
  id: 'part-of-tree',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} can sit under another {from}',
  distinguishes: 'a link from a collection to itself',
  projectsTo: 'a Link to the same collection; the path operation walks it (ONT-004)',
  target: 'self',
  carriesDetails: false,
  tile: { label: 'Sits under another', line: 'a tree of one kind of thing', icon: '⊢' },
  questions: [
    {
      id: 'depth',
      ask: 'How deep can it go?',
      prevents: 'a screen that shows two levels, and a tree that grew a third',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'ownAncestor',
      ask: 'Can a {from} end up under itself?',
      prevents: 'a loop that hangs every screen that walks the tree',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'moves',
      ask: 'Can a {from} be moved under another?',
      prevents: 'a move done by re-creating the branch, which loses its history',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'inherits',
      ask: 'Does a {from} take anything from the one it sits under?',
      prevents: 'a setting copied down by hand that drifts from its parent',
      answer: { type: 'words' },
      from: 'census'
    }
  ],
  projection: ({ from, answers }) => ({
    fields: [{ on: 'from', name: 'parent', kind: 'link', points: from, whenTargetGoes: 'blocks' }],
    rules: answers.ownAncestor === false ? [{ on: 'from', says: `no ${from} sits under itself`, holds: { notUnderItself: 'parent' } }] : []
  }),
  mutants: [
    {
      id: 'loop',
      mistake: 'a tree with no rule against a thing sitting under itself',
      why: "'can it be its own ancestor' was not asked",
      from: 'census',
      kills: 'ownAncestor',
      shape: { unanswered: 'ownAncestor' }
    }
  ],
  evidence: { rows: 1, sources: ['sentinel'], thin: 'one row: a single field in one prototype' }
});

/** `on-the-course-platform` → `onTheCoursePlatformId`: the field holding a record's id in the other system. */
function idThere(relationId: string): string {
  const w = `${relationId} id`.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return w.map((x, i) => (i ? x.charAt(0).toUpperCase() : x.charAt(0).toLowerCase()) + x.slice(1)).join('');
}

export const existsElsewhere = defineKind({
  id: 'exists-elsewhere',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} also exists in another system, known there by its own id',
  distinguishes: 'an id or a provenance record naming another system, not a record in this one',
  projectsTo: "a Text field per system, unique, plus a sync log; the enrolment note is this kind's unasked question",
  target: 'system',
  carriesDetails: false,
  tile: { label: 'Also exists elsewhere', line: 'the same thing kept in another system too', icon: '⇆' },
  questions: [
    {
      id: 'hereFirst',
      ask: 'Can a {from} be added here before it exists in {to} — and if it can, what is silently skipped, and how would anyone notice?',
      prevents: 'an enrolment in the other system silently skipped for people added here first, and nobody noticed',
      answer: { type: 'words' },
      from: 'note'
    },
    {
      id: 'thereFirst',
      ask: 'Can a {from} exist in {to} before it exists here?',
      prevents: 'records arriving from the other system with nothing here to attach them to',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'wins',
      ask: 'When the two disagree, which side wins?',
      prevents: 'two systems overwriting each other in turn',
      answer: { type: 'one-of', values: ['here', 'there', 'a person decides'] },
      from: 'census'
    },
    {
      id: 'nameThere',
      ask: 'What is a {from} called in {to}?',
      prevents: 'a sync that matches the wrong things because they are named differently there',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'endsThere',
      ask: 'What happens in {to} when a {from} ends here?',
      prevents: 'a person who left here still active there',
      answer: { type: 'words' },
      from: 'census'
    }
  ],
  // Named after the relation, so a noun known in two systems has two fields (bug P116-ONT-003-two-systems): the
  // relation's id, not the system's words, because a reworded system must not rename what is stored.
  projection: ({ id, to }) => ({
    fields: [{ on: 'from', name: idThere(id), kind: 'text', unique: true }],
    rules: [{ on: 'from', says: `every exchange with ${one(to)} is logged, and a skipped one says why`, holds: { logged: one(to) } }]
  }),
  mutants: [
    {
      id: 'silent-skip',
      mistake: 'an id from the other system with no log of what was sent and what was skipped',
      why: "the enrolment note: 'can it exist here before there' was not asked, so the skip was silent",
      from: 'note',
      kills: 'hereFirst',
      shape: { without: { rule: 'logged' } }
    },
    {
      id: 'id-nowhere',
      mistake: "the other system's id stored nowhere",
      why: 'nothing here can be matched to anything there; every sync starts from a name',
      from: 'task',
      kills: 'the kind',
      shape: { unsaid: true }
    }
  ],
  evidence: { rows: 16, sources: ['acme', 'tirion', 'sentinel'] }
});

export const sameAs = defineKind({
  id: 'same-as',
  version: 1,
  source: SOURCE,
  sentence: 'two {from}s turned out to be one thing',
  distinguishes: 'a link between records of the same collection that means identity, not hierarchy',
  projectsTo: "a 'superseded by' Link on the same collection plus a match record; never a delete",
  target: 'self',
  carriesDetails: false,
  tile: { label: 'Turned out the same', line: 'two records that are one thing', icon: '=' },
  questions: [
    {
      id: 'howTell',
      ask: 'How do you tell that two {from}s are one?',
      prevents: 'duplicates merged on a guess',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'whoDecides',
      ask: 'Who decides when it is not certain?',
      prevents: 'a merge nobody chose',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'survivor',
      ask: 'Which one survives, and whose details win?',
      prevents: 'the newer email lost to the older record',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'undo',
      ask: 'Can a merge be undone?',
      prevents: 'a wrong merge that cannot be undone because the other record was deleted',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ from }) => ({
    fields: [{ on: 'from', name: 'supersededBy', kind: 'link', points: from, whenTargetGoes: 'blocks' }],
    rules: [{ on: 'from', says: `a merged ${from} is kept, never deleted`, holds: { neverDeleted: true } }]
  }),
  mutants: [
    {
      id: 'merge-by-delete',
      mistake: 'a duplicate merged by deleting it',
      why: 'nothing is left to undo a wrong merge with',
      from: 'census',
      kills: 'undo',
      shape: { without: { rule: 'neverDeleted' } }
    }
  ],
  evidence: { rows: 5, sources: ['acme', 'tirion', 'sentinel'] }
});

export const ends = defineKind({
  id: 'ends',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} can end without being deleted',
  distinguishes: 'a status, an active flag, an end date, an archive or erasure record — the record is kept',
  projectsTo: "a status Choice or a Date, a rule for each linked thing, and a 'delete: nobody' permission; the archive note is this kind's unasked question",
  // ONT-011 step 2: `endNote`/`endNoteNeeded` add a rule, not a field — the detail is the noun's own; the kind says it matters only once ended (held as all-or-none when it must be there).
  target: 'none',
  carriesDetails: false,
  tile: { label: 'Can end', line: 'stops, without being deleted', icon: '◼' },
  questions: [
    {
      id: 'whatStays',
      ask: 'When a {from} ends, what stays and what goes — its record and its history, the things it is on, its access elsewhere, the lists it is on?',
      prevents: 'archiving a person with no written answer for what stays and what ends, so it was decided case by case after the fact',
      answer: { type: 'words' },
      from: 'note'
    },
    {
      id: 'comesBack',
      ask: 'Can a {from} come back?',
      prevents: 'a returning person who cannot be brought back',
      answer: { type: 'yes-no' },
      from: 'note'
    },
    {
      id: 'backAs',
      ask: 'When a {from} comes back, is it the old one revived or a new one?',
      prevents: 'a returning person made new, with their history left on the old record',
      answer: { type: 'one-of', values: ['the old one', 'a new one'] },
      from: 'note'
    },
    {
      id: 'whoEnds',
      ask: 'Who may end a {from}?',
      prevents: 'anyone able to end anything',
      answer: { type: 'words' },
      from: 'census'
    },
    // ONT-011 step 2, *only sometimes*: the corpus's clearest rows are a note or a reason beside the
    // day a thing ended (a task's closing note, a routine's stop note), and a cancellation with no
    // field for why. The detail is the person's; the kind says when it matters, and whether it must.
    {
      id: 'endNote',
      ask: 'When a {from} ends, is a note or a reason written with it? Name that detail of a {from}, or "nothing".',
      prevents: 'a cancelled session shown to the learner with no field for why',
      answer: { type: 'field' },
      from: 'census'
    },
    {
      id: 'endNoteNeeded',
      ask: 'Must that note be there whenever a {from} has ended?',
      prevents: 'a reason that was always optional, so it was empty when it mattered',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ from, answers }) => {
    const rules: ProjectedRule[] = [{ on: 'from', says: `nobody deletes ${a(from)}; it ends`, holds: { neverDeleted: true } }];
    const [note] = typeof answers.endNote === 'string' ? answers.endNote.split(',').map((w) => w.trim()).filter((w) => w && !/^nothing$/i.test(w)) : [];
    if (note) {
      const needed = answers.endNoteNeeded === true;
      rules.push({
        on: 'from',
        says: needed ? `${a(from)} that has ended has its ${note}, and one that has not has none` : `${a(from)}'s ${note} matters only once it has ended`,
        holds: { onlyWhen: note, when: 'endedAt', required: needed }
      });
    }
    return { fields: [{ on: 'from', name: 'endedAt', kind: 'date' }], rules };
  },
  mutants: [
    {
      id: 'end-by-delete',
      mistake: 'ending a thing by deleting it',
      why: 'its history and everything linked to it goes too',
      from: 'note',
      kills: 'whatStays',
      shape: { unsaid: true }
    },
    {
      id: 'note-always-optional',
      mistake: 'a reason for the end that is always optional, so it is empty when it mattered',
      why: 'nothing ties the reason to the ending, so a thing ends with no reason on file and nothing refuses it',
      from: 'task',
      kills: 'endNoteNeeded',
      shape: { without: { rule: 'onlyWhen' } }
    }
  ],
  evidence: { rows: 13, sources: ['lessons', 'acme', 'tirion'] }
});

export const happenedTo = defineKind({
  id: 'happened-to',
  version: 1,
  source: SOURCE,
  sentence: 'something happened to a {from} at a time, and the record of it is kept',
  distinguishes: 'a record that is an event about another record (a log, an action, an attendance, a submission, a read receipt)',
  projectsTo: "a collection with a Link, a Date and a 'who' Link; update and delete: nobody",
  target: 'noun-or-none',
  carriesDetails: true,
  tile: { label: 'Happened to', line: 'something that happened, kept as a record', icon: '◷' },
  questions: [
    {
      id: 'forever',
      ask: 'Is the record kept forever?',
      prevents: 'a history cleared to save space that was the only proof of what happened',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'undo',
      ask: 'Can it be undone — and is undoing a new record, or removing this one?',
      prevents: 'an undo that deleted the history the next question needed',
      answer: { type: 'one-of', values: ['it cannot', 'a new record', 'removing this one'] },
      from: 'census'
    },
    {
      id: 'who',
      ask: 'Is who did it kept?',
      prevents: 'an action nobody can be asked about',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'seeHistory',
      ask: 'Who may see the history?',
      prevents: 'a history everyone can read',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'outlives',
      ask: 'Can the record outlive the {from} it happened to?',
      prevents: 'a removal that takes the history with it, or a history that stops a removal nobody expected to be stopped',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ from, to, answers }) => {
    const fields: ProjectedField[] = [
      // ONT-003: a record that outlives its {from} keeps it as an empty link, so it cannot be
      // required — ONT-001's sketch had both, which no store can hold at once.
      answers.outlives === true
        ? { on: 'own', name: from, kind: 'link', points: from, whenTargetGoes: 'stays-unlinked' }
        : { on: 'own', name: from, kind: 'link', points: from, required: true, whenTargetGoes: 'blocks' },
      { on: 'own', name: 'at', kind: 'date', required: true }
    ];
    if (one(to)) fields.push({ on: 'own', name: one(to), kind: 'link', points: one(to) });
    // `doneBy`, not `by`: BY is a word the database keeps for itself, and the manager refuses it.
    if (answers.who === true) fields.push({ on: 'own', name: 'doneBy', kind: 'link' });
    const rules: ProjectedRule[] = [{ on: 'own', says: 'nobody edits it', holds: { neverEdited: true } }];
    if (answers.undo !== 'removing this one') rules.push({ on: 'own', says: 'nobody deletes it', holds: { neverDeleted: true } });
    return { ownRecord: true, fields, rules };
  },
  mutants: [
    {
      id: 'editable-history',
      mistake: 'a log that anyone may edit or delete',
      why: 'a record of what happened that can be changed is not one',
      from: 'census',
      kills: 'forever',
      shape: { without: { rule: 'neverEdited' } }
    }
  ],
  evidence: { rows: 44, sources: ['template:planning', 'template:todo-list', 'lessons', 'acme', 'tirion', 'sentinel'] }
});

export const ownedBy = defineKind({
  id: 'owned-by',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} is seen and changed by whoever it belongs to, and by nobody else unless said',
  distinguishes: 'a rule about visibility, not a fact about the world: creator-owns, an access list, a tenant, an admin link',
  projectsTo: "the security file's permissions and creatorOwns; a path-shaped rule needs ONT-004",
  target: 'noun',
  carriesDetails: false,
  tile: { label: 'Owned by', line: 'who may see it and change it', icon: '⚿' },
  questions: [
    {
      id: 'whoElse',
      ask: 'Who else may see a {from} — a role, an admin of what it sits on, everyone?',
      prevents: 'a record everyone could read because nobody said who may',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'path',
      ask: 'Does it belong to someone through a chain — the holder of the account the person is on?',
      prevents: 'a permission rule four links deep, used eight times, that only a developer could write',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'whenOwnerEnds',
      ask: 'What happens to a {from} when its {to} ends?',
      prevents: 'records nobody can reach once the person who made them left',
      answer: { type: 'one-of', values: ['goes too', 'passes to someone', 'stays, unowned'] },
      from: 'census'
    }
  ],
  projection: ({ from, to, answers }) => ({
    fields: [{ on: 'from', name: 'owner', kind: 'link', points: one(to), required: true }],
    rules: [
      {
        on: 'from',
        says: `only its ${one(to)} sees and changes ${a(from)}` + (answers.path === true ? ', through a chain (ONT-004)' : ''),
        holds: answers.path === true ? { onlyThrough: 'owner', path: true } : { onlyThrough: 'owner' }
      }
    ]
  }),
  mutants: [
    {
      id: 'visible-to-all',
      mistake: 'records with no owner rule, readable by everyone signed in',
      why: "'who else may see it' was not asked",
      from: 'census',
      kills: 'whoElse',
      shape: { without: { rule: 'onlyThrough' } }
    }
  ],
  evidence: { rows: 71, sources: ['template:members-area', 'template:planning', 'template:todo-list', 'acme', 'tirion'] }
});

export const extendsKind = defineKind({
  id: 'extends',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} is extra detail about one {to}, at most one each',
  distinguishes: 'a one-to-one link, usually unique or the record\'s own key',
  projectsTo: 'a Link with a unique rule; or fields on the thing itself when it is small',
  target: 'noun',
  carriesDetails: false,
  tile: { label: 'Extra detail about', line: 'more about one thing, one each', icon: '⊕' },
  questions: [
    {
      id: 'filterBy',
      ask: 'Which of its details will you filter or sort {to}s by?',
      prevents: "a field split off into the profile that was later used to filter users all the time, and a profile's date copied onto the user by hand to sort by it — repeated until the database was patchwork",
      answer: { type: 'words' },
      from: 'oral'
    },
    {
      id: 'grows',
      ask: 'Is it a few details, or could it grow to a dozen that only some {to}s use?',
      prevents: 'profile fields piled into the user record; later a dozen of them, half unused by most users',
      answer: { type: 'one-of', values: ['a few', 'could grow'] },
      from: 'oral'
    },
    {
      id: 'moreThanOne',
      ask: 'Is there ever more than one {from} for a {to}?',
      prevents: 'a second one with nowhere to go',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'belongs-to' },
      from: 'census'
    },
    {
      id: 'standsAlone',
      ask: 'Does a {from} exist without its {to}?',
      prevents: 'extra detail left behind about something that is gone',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'computed',
      ask: 'Is it worked out from other things, or written by a person?',
      prevents: 'a computed value someone edited by hand',
      answer: { type: 'one-of', values: ['worked out', 'written by a person'] },
      from: 'census'
    }
  ],
  projection: ({ from, to, answers }) => ({
    fields: [
      { on: 'from', name: one(to), kind: 'link', points: one(to), required: true, unique: true, whenTargetGoes: answers.standsAlone === true ? 'stays-unlinked' : 'goes-too' }
    ],
    rules: ([{ on: 'from', says: `what a ${one(to)} is filtered or sorted by stays on the ${one(to)}, not on its ${from}`, holds: { shape: true } }] as ProjectedRule[]).concat(
      answers.computed === 'worked out' ? [{ on: 'from', says: 'nobody edits it by hand', holds: { neverEdited: true } }] : []
    )
  }),
  mutants: [
    {
      id: 'piled-in',
      mistake: "piling all the profile fields into the user table thinking there's only a few; later a dozen, some users using half",
      why: 'extra detail folded into the thing it extends',
      from: 'oral',
      kills: 'grows',
      shape: { foldedIn: true }
    },
    {
      id: 'filter-field-split-off',
      mistake: 'a field in the profile table later used very often to filter users; too late to move once users have profiles',
      why: 'the field you filter or sort the main thing by was split off into the extension',
      from: 'oral',
      kills: 'filterBy',
      shape: { without: { rule: 'shape' } }
    },
    {
      id: 'sort-key-copied',
      mistake: "a 'profile updated' field copied onto the user and kept in sync by hand, to sort users by it",
      why: 'a derived field copied onto the parent and maintained by hand',
      from: 'oral',
      kills: 'filterBy',
      shape: { without: { rule: 'shape' } }
    }
  ],
  evidence: { rows: 11, sources: ['lessons', 'acme', 'tirion', 'sentinel'] }
});

export const byName = defineKind({
  id: 'by-name',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} names its {to} by something a person could retype (an email, a code)',
  distinguishes: 'a natural key stored as text where a Link would be',
  projectsTo: 'a Link; the mutant is the text itself',
  target: 'noun',
  carriesDetails: false,
  tile: { label: 'Names by email or code', line: 'points at another by something typed', icon: '@' },
  questions: [
    {
      id: 'changes',
      ask: "Can a {to}'s email or code change, or be mistyped?",
      prevents: 'a record pointing at a person by email that stopped pointing at anyone when the email changed',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'shared',
      ask: 'Can two {to}s share it?',
      prevents: 'a note that names two people at once',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'shouldLink',
      ask: 'Should it be a link to the {to} instead?',
      prevents: 'a text kept where a link belongs',
      answer: { type: 'yes-no' },
      changesKind: { when: true, to: 'belongs-to' },
      from: 'census'
    }
  ],
  projection: ({ from, to }) => ({
    fields: [{ on: 'from', name: one(to), kind: 'link', points: one(to) }],
    rules: [{ on: 'from', says: `${a(from)} keeps the link; the email or code is read from the ${one(to)}`, holds: { shape: true } }]
  }),
  mutants: [
    {
      id: 'the-text-itself',
      mistake: 'the email or code stored as text where a link would be',
      why: 'a change to the email breaks every record that named it',
      from: 'census',
      kills: 'shouldLink',
      shape: { asText: true }
    }
  ],
  evidence: { rows: 6, sources: ['lessons'], thin: 'one source: every row is from one backend' }
});

export const pointsAtOneOf = defineKind({
  id: 'points-at-one-of',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} points at one thing that may be any of several kinds, and says which',
  distinguishes: 'an id beside a kind field; no single target collection',
  projectsTo: 'a kind Choice plus a Text id; the mutant is an id with no kind beside it',
  target: 'nouns',
  carriesDetails: false,
  tile: { label: 'Points at one of several', line: 'one thing, which may be any of a few kinds', icon: '⋔' },
  questions: [
    {
      id: 'more',
      ask: 'Could it ever point at a kind of thing not on the list?',
      prevents: 'a new kind of target that every screen reading it does not know',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'whenTargetGoes',
      ask: 'What happens when the thing it points at goes?',
      prevents: 'a pointer at nothing, which no rule can catch because no single collection holds the target',
      answer: { type: 'one-of', values: GOES },
      from: 'census'
    },
    {
      id: 'repoint',
      ask: 'Can it be pointed at something else later?',
      prevents: 'a note moved to another lesson by hand, leaving the kind behind',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ to, answers }) => {
    const kinds = Array.isArray(to) ? (to as readonly string[]) : to ? [to as string] : [];
    const goes = typeof answers.whenTargetGoes === 'string' ? { whenTargetGoes: answers.whenTargetGoes as ProjectedField['whenTargetGoes'] } : {};
    return {
      fields: [
        { on: 'from', name: 'pointsAtKind', kind: 'choice', required: true, values: kinds },
        { on: 'from', name: 'pointsAtId', kind: 'text', required: true, ...goes }
      ],
      // Held by both fields being required: a rule of its own would grade nothing the two do not.
      rules: [{ on: 'from', says: 'the kind is always set beside the id', holds: { shape: true } }]
    };
  },
  mutants: [
    {
      id: 'id-without-kind',
      mistake: 'an id with no kind beside it',
      why: 'nothing can tell which collection to look in',
      from: 'census',
      kills: 'the kind',
      shape: { without: { field: 'pointsAtKind' } }
    }
  ],
  evidence: { rows: 2, sources: ['lessons'], thin: 'one source: two fields of one backend' }
});

/**
 * P116 ONT-011 step 2 (R-c, ruled 2026-10-10): the fifteenth kind, Frappe's *submittable* in the
 * person's words. ONT-000 harvested relations; this kind's rows are ONT-011 step 1's *settled*
 * candidates judged **yes** (census.js counts them for it), 8 over 4 sources. Its rules are the
 * first users of ONT-014's two new holds: `moves` on the status and `frozen` `unless` a draft.
 */
export const settled = defineKind({
  id: 'settled',
  version: 1,
  source: SOURCE,
  sentence: 'a {from} is agreed at some point, and after that it stays as it was agreed',
  distinguishes: "a draft that becomes agreed (issued, sent, sealed, published) and is then frozen while still in force; 'ends' keeps a record that stopped, 'happened-to' was never editable",
  projectsTo: "a status Choice (draft / agreed / withdrawn), an agreed-at Date and an 'amends' Link to itself; the moves and the freeze kept inside the write (onlyWhile), and no deleting an agreed one if said",
  target: 'none',
  carriesDetails: false,
  tile: { label: 'Settled once agreed', line: 'a draft, then agreed and frozen', icon: '◆' },
  questions: [
    {
      id: 'agreedBy',
      ask: 'Who agrees a {from}, and what is it called when they do (issued, sent, sealed, published)?',
      prevents: 'a bill whose amount changed after it was sent, because nothing said that sending settled it',
      answer: { type: 'words' },
      from: 'census'
    },
    {
      id: 'stillChanges',
      ask: 'After a {from} is agreed, which of its details may still change (a note, whether it was paid) — name them, or "nothing"?',
      prevents: 'a sent bill that could not be marked paid, or one whose amount still could be',
      answer: { type: 'fields' },
      from: 'census'
    },
    {
      id: 'putRight',
      ask: 'To put a mistake in an agreed {from} right, is it withdrawn, or replaced by a new one that says which it replaces?',
      prevents: 'an agreed assignment edited in place, so nobody could tell what the learner had been given',
      answer: { type: 'one-of', values: ['withdraw it', 'replace it with a new one', 'either'] },
      from: 'census'
    },
    {
      id: 'deleteDraft',
      ask: 'May a draft {from} be thrown away?',
      prevents: 'a draft nobody could delete, kept beside the agreed ones for ever',
      answer: { type: 'yes-no' },
      from: 'census'
    },
    {
      id: 'deleteAgreed',
      ask: 'May an agreed {from} ever be deleted?',
      prevents: 'an agreed record deleted, and with it the proof of what was agreed',
      answer: { type: 'yes-no' },
      from: 'census'
    }
  ],
  projection: ({ from, answers }) => {
    const STATUS = ['draft', 'agreed', 'withdrawn'] as const;
    // A row made before the status was asked for has none yet: it is a draft for the rules below.
    const draftish = { $or: [{ status: 'draft' }, { status: { $exists: false } }] };
    const still = typeof answers.stillChanges === 'string' ? answers.stillChanges.split(',').map((w) => w.trim()).filter((w) => w && !/^nothing$/i.test(w)) : [];
    const fields: ProjectedField[] = [
      { on: 'from', name: 'status', kind: 'choice', values: STATUS },
      { on: 'from', name: 'agreedAt', kind: 'date' }
    ];
    if (answers.putRight !== 'withdraw it') fields.push({ on: 'from', name: 'amends', kind: 'link', points: from, whenTargetGoes: 'stays-unlinked' });
    const rules: ProjectedRule[] = [
      {
        on: 'from',
        says: `${a(from)} goes from draft to agreed to withdrawn, and never back`,
        holds: { moves: 'status', from: { draft: { to: ['agreed'] }, agreed: { to: ['withdrawn'] }, withdrawn: { to: [] } } }
      },
      {
        on: 'from',
        says: still.length ? `once ${a(from)} is agreed, nothing on it changes but ${still.join(', ')}` : `once ${a(from)} is agreed, nothing on it changes`,
        holds: { frozen: '*', unless: draftish, except: ['status', 'agreedAt', ...still], heldOn: { status: 'agreed' }, freeOn: { status: 'draft' } }
      }
    ];
    if (answers.deleteAgreed === false) {
      rules.push(
        answers.deleteDraft === false
          ? { on: 'from', says: `nobody deletes ${a(from)}`, holds: { neverDeleted: true } }
          : { on: 'from', says: `an agreed ${from} is never deleted; a draft may be`, holds: { neverDeleted: true, unless: draftish, heldOn: { status: 'agreed' }, freeOn: { status: 'draft' } } }
      );
    }
    return { fields, rules };
  },
  mutants: [
    {
      id: 'edited-in-place',
      mistake: 'an agreed thing edited in place',
      why: 'nobody can tell afterwards what was agreed',
      from: 'census',
      kills: 'stillChanges',
      shape: { without: { rule: 'frozen' } }
    },
    {
      id: 'goes-back',
      mistake: 'an agreed thing put back to draft, changed, and agreed again',
      why: 'the freeze means nothing if the status can walk around it',
      from: 'census',
      kills: 'putRight',
      shape: { without: { rule: 'moves' } }
    },
    {
      id: 'agreed-deleted',
      mistake: 'an agreed thing deleted',
      why: 'the proof of what was agreed goes with it',
      from: 'census',
      kills: 'deleteAgreed',
      shape: { without: { rule: 'neverDeleted' } }
    },
    {
      id: 'amend-loses-link',
      mistake: 'a replacement that does not say which one it replaces',
      why: 'two agreed records, and nothing says the second supersedes the first',
      from: 'census',
      kills: 'putRight',
      shape: { without: { field: 'amends' } }
    }
  ],
  evidence: { rows: 8, sources: ['lessons', 'template:nightbook', 'template:planning', 'tirion'] }
});

/** In the census's order. */
export const WORLD_KINDS: readonly Kind[] = Object.freeze([
  belongsTo,
  isOn,
  together,
  oneOf,
  manyByList,
  partOfTree,
  existsElsewhere,
  sameAs,
  ends,
  happenedTo,
  ownedBy,
  extendsKind,
  byName,
  pointsAtOneOf,
  settled
]);
