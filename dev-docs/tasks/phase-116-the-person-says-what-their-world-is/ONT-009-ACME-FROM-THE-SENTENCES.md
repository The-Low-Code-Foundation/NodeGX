# ONT-009 — Acme from the sentences

**Opened 2026-10-08.** **Depends on ONT-002 … ONT-008 and R6.** **Status: 📋 not started. The phase's thesis test.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 (or Sonnet 5.5) for the conversation, ON PURPOSE; Fable 5.1 reads the record and grades it** — users run the product's agent on whatever model they have — a pass on Fable would measure the wrong thing. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **A two-person ops team describes their membership world in their own words, and the questions they are asked
> surface, before any collection exists, the two answers Acme only wrote down after two incidents.**

## 2. Why

README §1 reading 7. Acme's archive note answers the *ends* question. Its enrolment note answers the *exists
elsewhere* question, after a paying member was invisible for an unknown period. If the vocabulary asks
those two before a collection exists, the phase's idea holds. If it does not, the vocabulary is wrong and the task says
how. This is NSP-006's move: the thesis graded by someone who could not cheat.

## 3. What to do

1. **The persona.** Richard plays a two-person operations team with a membership business: companies, people who
   work there, accounts a company pays for, people on an account, a learning library elsewhere, a mailing list
   elsewhere, people who leave. No name, email, row or note from Acme; the shape is theirs, the people are synthetic
   (R6).
2. **The conversation.** With the brief and the one tool, an agent that has never seen Acme's notes takes
   the description in sentences, asks what the runner returns, and writes `docs/world/` and `verbs.json`. The transcript
   is kept.
3. **The record.** From the transcript and the files: every question asked, in order, with its mutant and incident;
   the first time the *ends* question and the *exists elsewhere* question appear; whether either appeared before the
   first projection.
4. **The build.** Project (ONT-003), the manager view by a stranger (ONT-008), the archive and enrolment verbs
   (ONT-006), the bombshell (ONT-007: "some people are on two accounts").
5. **The use.** The persona archives a contact, adds a person to an account who has no library account yet, and reads
   what the page says. Their sentences are the verdict.

## 4. Acceptance criteria

1. Both questions appear in the record before any collection exists, and the answers given match the two notes in
   substance.
2. The projected schema has the same relation shape as Acme's (company, person, employment with dates, account,
   person-on-account with active and dates, an external id per elsewhere), measured by ONT-000's census over both.
3. The persona completes the three uses without a storage word on the page, and says so.
4. The bombshell migrates with the synthetic records intact.

## 5. Watch for

- **Correct is not usable** (memory). AC3 is the persona's words, not a green suite.
- **The agent must not read Acme's notes.** Like NSP-006's stranger, it gets the brief and the persona only; the
  transcript is checked for what it read.
- **A page handed over for a ruling decays** (memory). The fixture Richard sees is dated.

## 6. Built

*(empty)*
