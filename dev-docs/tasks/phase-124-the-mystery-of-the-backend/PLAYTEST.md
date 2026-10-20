# Gate 5 — the person it is for uses it

**Who:** Richard, as the person who vouches. **What:** sit in front of the canvas on the training product's backend
copy and answer the client's four questions out loud without opening anything else: *where is the data; who can see
the Lesson table; why does the app do X when I click Y (pick a button); is it secure*. Then take control: make
`Concept` readable by anyone signed in, from the canvas, and check that the backend obeys and that it holds after a
restart. **What is written down:** his words, the time to each answer, every "in Bubble I would…", and the verdict
in OWN-008's register: *cool* or *nope*.

## How to run it for him

```sh
# the backend copy (s1 made it in the session's scratchpad; this makes a fresh one anywhere)
mkdir -p /tmp/who && cp -R templates/digital-bricks-training /tmp/who/training && mkdir /tmp/who/backend
node packages/nodegx-backend/bin/nodegx-backend.js serve --data-dir /tmp/who/backend --port 8650 --host 127.0.0.1 \
  --token <a secret> --project-dir /tmp/who/training --backend-name "Training (WHO)" &
(cd /tmp/who/training && node tools/setup-backend.mjs --backend http://127.0.0.1:8650 --token <a secret> \
  && node tools/deploy-functions.mjs --backend http://127.0.0.1:8650 --token <a secret>)
# the editor the stranger built (LOOK.md says where its kept copy is), pointed at that backend
```

The stranger's own `npm start` and its README say the rest; LOOK.md §s1 has the exact commands that worked.

## The sitting

**2026-10-20, late, from the screens in LOOK.md (the first stranger's "backend map"), before sitting with it live.**
His words, verbatim:

> It looks so cool. Now what would make it extra cool is if you take that 'I'm signed in this is what I can see'
> concept, and apply it to 'view as user X' so you can pick a user from the database and literally see the lit up
> pathways they can access, and follow a pathway to say 'if this specific user is on the 'course' page, what EXACTLY
> do they see?' So you'd be able to answer the question 'If I let Frank log in, will he see Sally's conversations?'
> But otherwise the view is very psychadelic, in a good way. Furthermore the ability to for example extrapolate this
> view to 'show me this one conversation record Frank made, who would be able to reach it and through which
> pathways?' and the map shows a view of that one record and who would in theory be able to access it and from
> where, now that's reassurance. Being able to visually explore the 'preview' of the results of your privacy rules
> and relationships, functions and workflows, amazing

Read as the verdict OWN-008's register asks for: **cool** ("psychadelic, in a good way"). The three asks go to the
stranger as round 2, verbatim (BRIEF.md §s2). The live sitting (the four questions, the grant, the restart) is still
owed.

| he asked / tried | what happened | his words | time |
|---|---|---|---|
| looked at the two screens | | "It looks so cool … very psychadelic, in a good way" | — |
| where is the data | | | |
| who can see Lesson | | | |
| why does it do X when I click Y | | | |
| is it secure | | | |
| make Concept readable by anyone signed in | | | |
| does it hold after a restart | | | |

## What he could not do

*(filled from the sitting)*
