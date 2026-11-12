# s140 — EXP-021 AC4, driven: what each arm will read (written before the first drive)

Predicted from the emitted `src/pages/Lists.tsx`, `src/components/Editor.tsx`, `SetRow.tsx`, `AppStore.tsx`,
`SaveQuestionSet.tsx`, `ListQuestionSets.tsx`, `src/lib/persistStore.ts` (export emitted by the tree, which equals HEAD for
`packages/nodegx-export`), and from the template's own scripts (Save / List / Parse question set, The list to edit).

## The seed (both arms, before the app's first script)

`localStorage["noodl_store_rocket-school"]` = `{"app": {"profiles": [Ada, id p1], "sets": [{"id": "s1", "name": "Capitals",
"items": [France = Paris, Spain = Madrid], "both": false}], "activeId": "p1"}}`.

## Arms

- **runtime**: `render-from-disk.js` on a copy of `templates/rocket-school`, viewer bundle 07:42 today (no runtime commit since 10-20).
- **export-head**: that copy emitted by HEAD's export, built with its own `npm run build` against npm's packages.
- **export-fixed**: the same, emitted by the tree after this session's fixes (if any).

## Steps and predictions

| step | what is done | runtime | export-head |
|---|---|---|---|
| L0 | open `/lists` | title "My revision lists"; one row "Capitals", "2 questions"; Edit, Delete, "New list"; Header names Ada | same |
| L1 | Edit on Capitals | editor open; name field "Capitals"; lines field holds `France = Paris\nSpain = Madrid` (a `<textarea>`); Save shown | editor open; name "Capitals"; lines field is an `<input type="textArea">` (P18-S120-TEXTAREA) and its `.value` is `France = ParisSpain = Madrid` (a text input's value sanitizing removes the line break) |
| L2 | name → "Capitals of Europe"; lines → `France = Paris\nSpain = Madrid\nItaly = Rome` (select all, insertText) | the field holds 3 lines | the field holds ONE line: Chrome turns each inserted line break into a space in a single-line field (`France = Paris Spain = Madrid Italy = Rome`). Lowest-confidence row: stripped instead of spaced would read `ParisSpain` |
| L3 | Save | editor closes; row "Capitals of Europe", "3 questions"; store `sets[0]` = s1, that name, 3 items | editor closes; row "Capitals of Europe", **"1 questions"**; store `sets[0]` = s1, 1 item `{q: "France = Paris Spain = Madrid Italy", a: "Rome"}` (Parse splits at the LAST " = ") |
| L4 | New list; name "Sums"; lines `2 + 2 = 4\n3 + 3 = 6`; Save | 2 rows; "Sums", "2 questions"; store 2 sets, the new id `s<base36 time>` | 2 rows; "Sums", **"1 questions"** (`2 + 2 = 4 3 + 3` = `6`) |
| L5 | Delete on "Capitals of Europe", then "Yes, delete" | the row asks "Delete this list?"; after Yes one row, "Sums"; store 1 set | same |
| L6 | reload `/lists` | one row "Sums" (the persisted copy) | same |

Every step on both arms: `app.profiles` keeps Ada, `activeId` stays `p1` (nothing on this page writes the profiles; the
Header's settings writes are refused in the export and not pressed in the runtime).

So: **the export's list editing works end to end except the lines field**. HEAD's export edits a set's name, adds a set,
deletes a set and keeps the store across a reload, and turns every multi-line list into one question. That is
P18-S120-TEXTAREA (open, medium, reach 33). Here it blocks AC4: a set of questions is typed one line each. The fix it
needs: the emitter draws a `<textarea>` for Type Text Area. **export-fixed**, after that fix, reads as the runtime column
at every step.

Not predicted, read and recorded: the console of each arm; what the Header draws.

## The desk (written before `tests/a-text-area-keeps-its-lines.test.ts` first ran)

s129's Field Desk (`tests/helpers/field-desk.ts`); its `name` field is the Lists Editor's shape (Value from the Variable
`draft`, the field's Set sent by Fill's Set Variable Done, its text into `typed`). Two variants, both with Fill's value
`Bob\nAnn`, steps `type:name:France = Paris\nSpain = Madrid`, then `Fill`. Both arms read in jsdom, which sanitizes an
`<input>`'s value as Chrome does.

| variant | after typing: `[name]` / `typed` | after Fill: `[name]` / `typed` |
|---|---|---|
| **area** (the field's Type is Text Area), runtime | `France = Paris\nSpain = Madrid` / the same | `Bob\nAnn` / `Bob\nAnn` |
| area, HEAD's export | `France = ParisSpain = Madrid` / the same (the value written into an `<input>` loses its break) | `BobAnn` / `Bob\nAnn` (the Set writes the field's state; the element shows it sanitized) |
| area, fixed export | as the runtime | as the runtime |
| **control** (Type unset: a one-line field), both arms | `France = ParisSpain = Madrid` / the same | `BobAnn` / `Bob\nAnn` |

Emitted, the area variant: a `<textarea` with the field's class, placeholder, value, ref and onChange, and no `type`; its
ref `useRef<HTMLTextAreaElement>`; `base.css` ends with `textarea { resize: none; }`; the app typechecks. The control
keeps `<input` and `HTMLInputElement`.
