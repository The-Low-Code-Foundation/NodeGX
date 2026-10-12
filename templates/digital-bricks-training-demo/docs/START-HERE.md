# Digital Bricks Training — demo

The **Digital Bricks Training** template with its backend taken out, so it runs on a web page with
no server and no account: <https://nodegx.io/templates/digital-bricks-training/>.

🔴 **Generated — do not edit it by hand.** `node tools/build-demo.mjs` in the template writes it,
and `node tools/check-demo.mjs` fails on any difference the generator did not make. Change the
template and regenerate, and the demo follows (TASK-L180).

## What is different from the template

- **The four backend calls answer in the browser.** `Data/Programme`, `Data/Lesson` and
  `Data/Roster` hold the template's fixtures (`backend/fixtures/`) in Function nodes at the same
  ids the Cloud Functions had, and answer the same `rows`. Somebody other than Sam has no
  programme, and a concept other than the one written lesson is *not written yet*, exactly as the
  backend says.
- **It is always happening now.** Every date in the programme and the roster moves forward by the
  whole number of days between 22 September 2026 at 12:00 UTC (the fixture's instant) and the
  moment you open it, and the two months named in prose move with them. What is done is still
  done, what is ahead is still ahead, and the pace tracker is drawn against today.
- **There is no sign in.** Home's two doors open the learner's course and the coach's people.
  Nothing is saved, and nothing leaves the browser.
- **The two writes keep nothing.** Saving an answer in a lesson shows *✓ Saved*, and *Mark complete*
  goes to the course, because each answers the way a write that worked answers — but there is no
  backend, so a reload shows the programme as it was. In the template both are real
  (TASK-L177, TASK-L178).
- **Asking your coach works, and keeps nothing.** *Ask your coach about this* opens the thread
  about that card from the made-up messages, and a question or a coach's reply appears in it — but
  only in this page: a reload shows the thread as it was. In the template it is real (TASK-L186).
- **Hash URLs** (`#/course`), so a reload works on a static host with no fallback.

To run it with a real backend, magic-link sign-in and the coach's gate, start from the
**Digital Bricks Training** template.
