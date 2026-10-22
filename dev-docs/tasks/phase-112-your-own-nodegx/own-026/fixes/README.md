# OWN-026 — the fix loop (learning as we go)

**Set up 2026-10-22 by Richard's ruling:** *"after each test we can do a little stop and check, draft a fix prompt
somewhere and I can open it in a new session that keeps in touch with this one, so the next tests have a better
chance of succeeding … we can learn and hotfix on the fly, and any big stuff can go in separate sessions and the tests
can maybe wait for fixes before starting their round."* His aim: *"perfect how the models read our shit and interact
with NodeGX projects to at least get them to the same level as Claude coded ones with good instructions."*

## Who does what

- **The lab session (`opennoodl-8c` when this was written; ListAgents shows it)** runs the rounds (`../series.mjs`). After every
  graded NodeGX round it does a stop-and-check: it reads DeepSeek's reasoning and the grade, appends what it learned
  to `LEARNINGS.md`, and writes the next `FIX-NN.md`.
- **A fixer session (you, if Richard opened this file for you)** takes the newest open `FIX-NN.md`, fixes the kit in
  the repo, packs a test kit and tells the lab it's ready. The plain-code arms are the control: they get no fixes.
- **Richard** opens a fixer session when a FIX file is written, and says which items wait for a separate session.

## The gate

- `/Users/Shared/nodegx-lab/own026/HOLD-nodegx` exists while a fix is being made: NodeGX rounds wait for it, and the
  plain-code rounds go on meanwhile.
- `/Users/Shared/nodegx-lab/own026/KIT` holds one line, the absolute path of a folder of packed tarballs
  (`create-nodegx-<v>.tgz` and `nodegx-mcp-<v>.tgz`, nothing else matching those names). The next NodeGX round
  creates its folder with that `create-nodegx` and runs that `@nodegx/mcp` as its server. No KIT file means the
  registry's 0.2.5.
- What a round can't take from a local kit: a command the agent types itself (`npx @nodegx/preview`,
  `npx @nodegx/mcp --graph`) still resolves to the registry. If a fix lives in one of those, say so in your
  ready message, and the lab decides.

## How a fixer works

1. Read the FIX file, then the evidence it points to. The round folders under `/Users/Shared/nodegx-lab/own026/` are
   **read-only to you**: never write there, never start a round's app from its own folder (copy it).
2. Fix in the repo on `cline-dev`, by the repo's rules (memory index): pathspec commits through a temporary index, one
   bug file per defect in `dev-docs/bugs/` (status `fixed` + the commit when done), tests beside the code. Run suites
   with `nice -n 19 … --runInBand`; the lab is running DeepSeek builds on the same Mac.
3. **Fixes are generic.** They teach the kit something any app needs. They never use the test's words or shape: no
   rocket, planet, times table, family, child, or check ids (T7, F7 …). A fix that only helps this test is refused.
   The grade must come from the kit getting better, not from the kit learning the exam.
4. Pack a test kit from a clean worktree at your commit (`scripts/devtools/make-worktree.sh`; the packing recipe and its
   traps are in `own-023/ROUND-3B-THE-GRAPH-AS-TEXT.md` §6; take `../OpenNoodl-worktrees/HEAVY.lock` while packing)
   into `/Users/Shared/nodegx-lab/kits/<FIX-NN>-<short commit>/`. Don't bump versions or publish to npm (that's
   Richard's, later).
5. Prove the kit from its tarballs in an empty HOME before you hand it over: `create-nodegx --cline` writes its files,
   and the server answers whatever your fix changed.
6. Hand over: write the folder path into `KIT`, delete `HOLD-nodegx`, add a "Done" section to the FIX file (commits,
   what changed, what you didn't do and why), and send the lab **one short message** (`SendMessage` to the lab's
   name): `FIX-NN ready: kits/<folder> (<commits>)`.
7. Anything big, or anything that doesn't gate the next round, goes in the FIX file's "Not now" list for its own session.
