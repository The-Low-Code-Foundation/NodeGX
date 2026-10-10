/**
 * P116 ONT-002 — the brief an agent reads before the first sentence about a person's world.
 *
 * Generated from the kinds, not written beside them: the table of kinds, their sentences and
 * what each points at come from `WORLD_KINDS`, and the worked example is a typed world the
 * test validates and projects. A brief that lies has examples that lie too (the lessons brief
 * learnt this first); here the examples cannot drift from the format they teach.
 *
 * Served by the MCP's `validate_world` (the backend group) and nowhere resident: a project
 * that never asks for a backend never reads it (R5).
 */
import { VERBS_FILE, WORLD_DIR, WORLD_FILES, type WorldFiles } from './files';
import { WORLD_KINDS } from './kinds';
import { QUESTION_BUDGET } from './runner';
import { WORLD_VOCABULARY } from './vocabulary';

/** The worked example in the brief: two nouns, one relation, one answer. Validated by the test. */
export const BRIEF_EXAMPLE: WorldFiles = {
  vocabulary: { vocabulary: WORLD_VOCABULARY.id, version: WORLD_VOCABULARY.version },
  nouns: {
    nouns: [
      { id: 'member', name: 'Member', sentence: 'A member is a person who pays us each year.', properties: [{ name: 'name', kind: 'text', freeWords: true }] },
      { id: 'account', name: 'Account', sentence: 'An account is what a company pays for; its members are on it.' }
    ]
  },
  relations: {
    relations: [
      {
        id: 'membership',
        from: 'member',
        to: 'account',
        kind: 'is-on',
        sentence: 'A member is on an account from the day they join until they leave.',
        answers: { several: true }
      }
    ]
  }
};

const TARGET: Record<string, string> = {
  noun: 'another noun',
  self: 'the same noun',
  nouns: 'one of several nouns, named',
  property: 'one of its own fields',
  system: 'another system, in words',
  none: 'nothing',
  'noun-or-none': 'another noun, or nothing'
};

const json = (v: unknown): string => JSON.stringify(v, null, 2);

/** The brief, as Markdown. Pure; the same text every call. */
export function worldBrief(): string {
  const kinds = WORLD_KINDS.map((k) => `| **${k.tile.label}** (\`${k.id}\`) | ${k.sentence} | ${TARGET[k.target]} | ${k.questions.length} |`).join('\n');
  return `# Describing a person's world

You are about to build a backend for someone. Before any collection exists, this project keeps what they said about their world in three files under \`${WORLD_DIR}/\`. The database is made from those files. So are the questions you ask.

A world is nouns and relations. A noun is a thing the person names: a member, an account, a session. A relation is a sentence that joins two nouns, such as "a member is on an account". A relation can also say something about one noun, such as "a person can leave". Every relation has a kind from a fixed list of ${WORLD_KINDS.length}. Each kind was read off real apps. Each carries the questions those apps paid for not asking.

## The rule

**Ask a question only when \`validate_world\` names it.** The tool reads the files, works out which classic mistakes the answers so far do not rule out, and returns the questions that would, at most ${QUESTION_BUDGET} at a time, in the person's own nouns. Each question names the mistake it stands for and what happened to somebody who did not ask it. Write the answer under the question's id in the relation's \`answers\`, in the person's words, and call the tool again. An empty list means the world is described enough to build.

Do not ask what the tool does not name. Do not answer for the person. Do not write an answer to a question nobody asked; the tool counts those.

## The three files

\`${WORLD_FILES.vocabulary}\` pins the kinds this world is described in:

\`\`\`json
${json(BRIEF_EXAMPLE.vocabulary)}
\`\`\`

\`${WORLD_FILES.nouns}\` holds the nouns. A noun has an id, the person's word for it, the sentence they said about it and its fields. A field is one of text, number, yesno, date, choice, file, location, list or anything. A field is never a link. A link between two things is a relation.

\`\`\`json
${json(BRIEF_EXAMPLE.nouns)}
\`\`\`

\`${WORLD_FILES.relations}\` holds the relations. A relation has an id and a kind. It starts from one noun and points at what the kind says it points at. It keeps the person's sentence and the answers so far.

\`\`\`json
${json(BRIEF_EXAMPLE.relations)}
\`\`\`

A noun or a field can carry one more answer. The tool asks for each of these once, because the answer has a home. \`"signsIn": true\` on one noun says that noun is who signs in. A rule about who may see what starts from that noun. When an \`owned-by\` answers \`"path": true\`, its \`"through"\` lists the relations from the noun that signs in to the owner, in order, each \`{ "relation": <id> }\`, with \`"where"\` for which records a step lands on (as holder: \`{ "role": "holder" }\`); the hop from the owner back to what it owns is the relation itself and is not listed. \`"freeWords": true\` on a text field records the person's answer to one question: the field is free words, not one of a fixed list. A text that is one of a fixed list is a \`choice\` with its \`values\`. A \`one-of\` relation then says who adds to the list.

## The kinds

Pick the kind by the person's sentence, not by the table you expect. The last column is how many questions the kind can ask; the tool asks only the ones that matter for this world.

| kind | the person's sentence | points at | questions |
|---|---|---|---|
${kinds}

A sentence that fits no kind is not a relation yet. Say so and ask what the person means. A relation whose kind is not on this list is refused, and so is an answer the kind does not ask for.

## What the answers become

\`validate_world\` also returns the schema the world projects to. The schema has a collection per noun and a collection per relation that is a record of its own. It lists the links and the rules the database keeps. The rules it does not keep yet are there too, in words. Show the person the collections in their nouns, never in the database's. Nothing in the files names a database. Nothing you write should either.

## What the person does

The person may also say what happens. "When a membership is activated, enrol them on the course" is one such sentence. Write it as a verb in \`${VERBS_FILE}\`. This fourth file is optional. A verb keeps the person's sentence and lists its steps. A step makes, updates, ends, removes or keeps one of this project's records. It can also ask another system. A step has at most one way to fail. That failure either records what happened and goes on, or it stops the verb. The tool grades the verbs with the rest of the world. It also lists the functions each verb calls. You write those functions.

## Writing the files

With Claude Code, write the files with your own tools. From this server, call \`write_world\` with the three files, the verbs if there are any, and the revision you read. Verbs you leave out are kept, and checked against the world you write. A write over files that changed since you read them is refused. A world the validator refuses is not written. The refusal names each problem and where it is.
`;
}
