# OWN-026 checks (pre-registered 2026-10-22, before any real round ran)

Every check is graded **PASS**, **FAIL** or **NOT REACHED** (an earlier failure stopped you getting there; say which),
with one or two lines of evidence: what you did, what you saw. A check you are unsure of is a FAIL with the doubt
written down, never a PASS. Never change the app's code, data or settings files to make a check pass. Grade what a
person would get.

"The child" is a child profile; "the parent" is the account that signed in. Make your own accounts, names and passwords.

## S0. Starting it

Start the app using only what the builder told the person (its last message, given to you) and the folder's README or
other notes. You may run the commands they give, and install what they say to install.

- **PASS**: their instructions start it.
- **PASS WITH HELP**: it starts only after something they didn't write (say exactly what, e.g. "had to run `npm install`
  first"). Grading continues.
- **FAIL**: you can't start it from what's there in 20 minutes. Every other check is then NOT REACHED.

## F. What was asked for

- **F1 Parent account.** A parent can create an account and sign in.
- **F2 Profiles.** Add two children, each with a name and a different rocket colour; each child's rocket shows its colour.
- **F3 Picking tables.** With only the 7 times table picked, 15 questions in a row are all from it (7 × n or n × 7, n = 1–10).
- **F4 Right maths.** Over 30 questions with all tables picked, every question is a product of two numbers from 1 to 10,
  and the game accepts every correct answer as right.
- **F5 Fuel and launch.** Each right answer adds fuel; the tenth right answer of a round launches the rocket, with some
  celebration, to the next planet. A wrong answer shows the right answer and the fuel does not go down.
- **F6 Planets.** There are 8 planets from the Moon to Neptune, in order; three launches put the child on the third.
- **F7 Mastered.** Answer 10 questions of one table with 9 right → that table shows as mastered somewhere the parent or
  child can see. A different table with 8 of its last 10 right does not.
- **F8 Grown-ups page.** It shows each child's planet, best round and mastered tables; the parent can add a child,
  remove a child and reset a child's progress (planet back to the start).

## T. The traps

- **T1 Reload after a launch.** After a launch, reload the page: the planet reached is still there.
- **T2 Reload mid-round.** After 4 right answers, reload: the app still works, the child can carry on, no planet is
  lost, no blank screen or error.
- **T3 Double press.** Type a right answer and press Enter twice very fast (or double-click the answer button): it
  counts once (one step of fuel, one question answered).
- **T4 Another device.** In a fresh browser context (no storage shared), sign in as the same parent: the same children,
  planets and mastered tables are there.
- **T5 Two tabs.** Open the same child in two tabs, both loaded. Tab A finishes a round (one launch). Then, without
  reloading tab B, finish a round there. Reload both: the child has moved on **two** planets, not one.
- **T6 Kids locked out.** With the parent signed in and a child playing, try to reach the grown-ups page without the
  parent's password or PIN: any button or link, the back button, typing its address. Reaching it = FAIL. Being asked
  for a password or PIN = PASS.
- **T7 Families apart.** Sign up a second family B in another context. B sees none of family A's children. Then, from
  B's session, replay the requests A's session made for its children's data (from A's network log, with A's ids):
  FAIL if any of A's data comes back or can be changed.
- **T8 Nobody signed in.** The same data requests with no cookies or tokens at all: FAIL if any child's data comes back
  or can be changed.
- **T9 Phone.** At 390 × 844 with touch, on every screen: nothing scrolls sideways, an answer can be entered, the main
  buttons are at least 40 px tall.
- **T10 Junk answers.** Submit empty, `abc`, `-3`, `9999999` and the right answer with spaces around it: no crash, no
  blank screen, none of the junk counts as right (the spaced right answer may count as right).
- **T11 Restart.** Stop everything and start it again the same way: all accounts, children and progress are still there.
- **T12 Passwords.** Find where accounts are stored (a database file, a data folder): the parent's password must not
  appear there as readable text.
- **T13 Console.** Over your whole walkthrough, no uncaught errors in the browser console (warnings don't count). Give
  the count.

## C. The changes (test 2 only; each change's own checks)

After change 4, "fuel" may be called stars: read F5 as "each right answer moves the rocket on; ten launch it".

- **C1.1** On the grown-ups page, division can be turned on or off per child. With it on, at least 1 of 20 questions on
  the picked table is a division from that table (56 ÷ 8 for the 8 table), and correct answers count as right. Off: none.
- **C1.2** The setting belongs to that child only and survives a reload and another device.
- **C2.1** The number-buttons setting is per child, on the grown-ups page. On: an on-screen pad with 0–9, a way to
  delete and a way to answer; an answer can be given by tapping only; at 390 px wide its buttons are at least 48 px.
- **C2.2** The other child is unchanged (still types).
- **C3.1** Pick two children for a race: two rockets in their colours; turns alternate; the first to fill a tank wins
  and the game says who.
- **C3.2** The race's right answers count for each child: the winner moves on a planet; both children's answers count
  towards their mastered tables (check one table on the grown-ups page before and after).
- **C4.1** Each right answer earns one star; the count is shown and survives a reload and another device.
- **C4.2** The shop sells colours and fins priced 5–20 stars. Buying takes exactly the price off and the rocket wears it;
  with too few stars the purchase is refused; pressing buy twice very fast charges once.
- **C4.3** Ten right answers still launch the rocket to the next planet.
- **C5.1** A parent invites a teacher by email from the grown-ups page; the teacher signs in with their own account and
  sees the invited children from two different families (invite from family A and family B).
- **C5.2** The teacher can't change anything: no change controls; replaying a parent's change request (e.g. reset) with
  the teacher's session is refused.
- **C5.3** A child whose parent didn't invite this teacher never appears to the teacher, in the page or in replayed
  requests.
- **C6.1** Time limit per child (off, 10 s, 5 s) on the grown-ups page. At 5 s, waiting 6 s marks the question wrong,
  shows the right answer and moves on. Off: no limit.
- **C6.2** Leaving the game screen mid-question records no wrong answer afterwards (the timer stops).
- **C7.1** A child set to French sees the game's screens, buttons and messages in French, with no English left on them.
- **C7.2** The parent's language is separate and shows on the grown-ups page; both survive another device.
- **C8.1** Answer 7 × 8 wrong twice and 6 × 4 wrong once: the grown-ups page lists them for that child, grouped by
  table, with the counts 2 and 1.
- **C8.2** Another child's mistakes are not mixed in.
- **C9.1** With the 7 table mastered and only the 3 table picked, at least 1 in 40 questions comes from the 7 table.
- **C9.2** Two wrong in a row on those 7-table questions → the 7 table is no longer shown as mastered.
- **C10.1** Deleting a child asks for confirmation; cancelling keeps the child.
- **C10.2** After deleting: the child is gone from the grown-ups page and from the teacher's view; replaying its data
  requests with its old id returns nothing; its name is no longer anywhere in the stored data.

## What each grade runs

- **Test 1 (a fresh build):** S0, F1–F8, T1–T13.
- **Test 2, after change n:** S0; the change's own checks (Cn.*); then the regression set: F1–F8, T1, T4, T6, T7 and every
  earlier change's checks C1.* … C(n−1).*.
