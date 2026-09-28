# Phase 105 — next session

> ### 📋 2026-09-28 (s5, no build) — RICHARD PLAYED IT; PHASE 106 SCOPED, AWAITING HIS RULINGS — START THERE
>
> Richard's first play of the packaged app produced seven points and two global asks (a persistent Autonauts-style
> world; a 3D renderer). Each was MEASURED against the source and written into
> `dev-docs/tasks/phase-106-the-island-grows/README.md`: his words verbatim (§0), the readings (§1), eight rulings
> in plain words (§3), ten defects that need no ruling (§4: the stuck "thinking" in One step, the run leaking across
> requests, "fewer blocks" on the reference program, the 1.44:1 highlight, answers never shown, `olive_says` not in
> the picker, the emoji pills, the fixed pad), and the board IG-000–IG-008 (§5). **Richard ruled the same day: "go 3D and a bit more open world"; the nine task
> files are written. Next session starts at `phase-106-the-island-grows/NEXT-SESSION-PROMPT.md` (IG-001 first).** The s4 items below (the Windows
> timings, the tablet, the FR read) stay owed.

> ### 📋 2026-09-28 (CG s4) — THE WINDOWS WORKFLOW RAN; THE INSTALLER WORKS; OLIVE IS TOO SLOW ON THE RUNNER'S CPU — START HERE
>
> - **Done on `cline-dev` (`770ec034a` → `ac3698953`, then the docs commit), each driven:**
>   the Grown-ups **paste box** (a save code brings the islands back; a bad one writes nothing) · the **after-run rung
>   lesson line** (`Logic/Olive played`: only an ask of THIS run that was SENT) · **Olive's 18 lessons as Skills cards**
>   (band 10–12; "can't do this here yet" where the exam withheld one) · free play's **arrow** · the Mac **Edit menu**
>   (Cmd+V in a text box) · the app **icon** · three CI first-run defects (below). Richard said PUSH: the branch
>   `p105-garden-desktop` holds `ac3698953` (a fast-forward of `cline-dev` commits only).
> - **Readings (primary checkout, 2026-09-28):** garden specs **337/337** (cg003Template 84); page drive **161/161** exit 0
>   (`d4236a5d9` template, 14:47); Olive page drive **17/17, 0 skip** (14:54); shell `npm test` **89/89**. Packaged
>   `Olive's Island.app` rebuilt at 15:54 with every s4 change (grep of its resources) — not driven.
>   Windows, five runs (CG-008 §9): run 4 `36423640596` built `OlivesIsland-Setup-0.0.1.exe`, installed it silently
>   (exe + FileDescription + Start-menu shortcut all "Olive's Island", no default-icon line), egress blocked, app up in
>   4.2 s, model on CPU in 8.5 s — then **the exam never finished: 55/80 asks hit the 12 s limit**. Run 5 `36426590795`:
>   **the contract itself on that CPU (2 threads, the shipped prebuilt) times out on every ask** (poem 12004 ms, 11/31,
>   per probe 21–36 s) — so NOT the app's thread setting. Linux, same prebuilt: ~3 s a probe (31/31 in run 4).
> - **Where the last handoff was wrong / what s4 settled:** "the Linux contract 31/31 CPU" in CI had been grading a
>   llama.cpp COMPILED on the runner (the Mac-made lockfile had no linux/win prebuilt; `npm ci` took 3 min) — its P07
>   4/4 red vanished on the prebuilt. The paste box's "a null model would be written" was reasoned: the control (null
>   restored) passed the drive too — the decode change is a guard, not a measured fix. "Free play card missing": it
>   existed; it differed from the mockup by a tag (now the arrow) and the owl's face (still — see 5).
>
> **For Richard (human, not code):**
> 1. **Try it on the Mac:** `open "dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/dist/mac-arm64/Olive's Island.app"`.
>    The look against the mockup (now incl. the Skills "Olive's lessons" section, which the mockup does not have).
> 2. **Two minutes by hand:** Cmd+V into Grown-ups → Paste a code (CDP cannot press a native menu shortcut); the Restore
>    menu's dialogs (CG-004 §8.1).
> 3. **Read the French** (CG-006 AC3) incl. s4's new lines: `saveCodeUse`, `saveCodeDone`, `guSaveLine`, `skRungsH`,
>    `skRungsSub`, `rungGreen`, `rungGrad`.
> 4. **The tablet:** install the run's installer (artifact `garden-win32-x64-ac36989…`, SmartScreen → More info → Run
>    anyway) and bring back `%APPDATA%\Bot Garden\logs\timings.log` + `…\island\olive-exam.json`. The runner says Olive may
>    answer NOTHING inside 12 s on a plain Windows CPU; only the tablet can say whether that is the kids' reality.
> 5. **Rulings, when the tablet has spoken:** if Olive is too slow there — a longer limit (the child waits), a smaller
>    job (fewer tokens), or "Olive only on the Mac"? And: must rung 9 show on every machine (it is withheld on Metal)?
>
> **Session 5, in order:**
> 1. **Read run 5's app logs** (artifact `out/logs/timings.log`) and find why the win-x64 prebuilt is ~10× slower than
>    linux-x64 on the same class of runner: which `ggml-cpu-*.dll` loads (node-llama-cpp debug log), Defender on the
>    mmapped model, a `--cpu` run with 4 threads. A reading on the runner, then the tablet's numbers (CG-008 AC4).
> 2. The Linux contract gate is flaky by design (30/31 both attempts, a different probe each time): judge the retry on
>    the union, or two of three — a gate change, say so in CG-004.
> 3. The installed-app drive's full path (CG-008 §2: island → tulip → teach → fold → play → win → Grown-ups → Try Olive)
>    is still not built; with a slow Olive the drive must not wait on the exam for its other clauses.
> 4. Small: free play's face is the owl, the mockup's is the kid's robot; the Workshop palette list's top is cut when it
>    scrolls (`s4-rung-lesson.png`, seen not measured).
>
> - **Traps paid for this session:** a Mac-made lockfile drops other platforms' prebuilts and CI compiles silently
>   (memory `a-lockfile-made-on-a-mac-drops-other-platforms-prebuilts`) · a `needs:` on a model-grading job skipped the
>   whole product build · a drive clause whose control also passes is a regression check, not a proof — run the control
>   · a drive finder keyed on a label's text broke when the label became an arrow (19 reds, one cause) · job logs are
>   404 until the job completes.
> - **Known reds not ours:** as in s1–s3 (`noodl-mcp` whole-suite, `library:check` 80/81). Not re-measured.
> - **Worktrees:** none. Scratch: `/private/tmp/claude-501/…/962c15ed-…/scratchpad/` (pages1–4, olive2–5, run logs).
> - **End of session:** `/next` — this block rewritten, README §4 from the task files, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.
