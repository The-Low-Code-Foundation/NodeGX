# Phase 100 — 0.3.0: the first one people upgrade into

**Scoped:** 2026-09-22, at Richard's request, against `cline-dev` HEAD `7043fb6e6`.
**Status: 📋 SCOPED — nothing built. UPG-001 started (the census; 4 rows measured, 5 classes named `⬜ never measured`).**
**Prefix: `UPG`.** **Rulings outstanding: R1–R5 (§6).**

> "We should probably celebrate phase 100 by making it the prep for the release of 0.3.0, if that's
> the right version number, since we've added a bunch of potentially breaking features like the new
> styles etc. Let's scope it out and get started please."
> — Richard, 2026-09-22, opening this phase

## 1. The person sentence

> **Someone who has been using NodeGX since 0.2.2 installs 0.3.0, opens the project they already
> had, and is either told nothing changed or told exactly what did — and never finds out by
> discovering their work is gone.**

🔴 Every acceptance criterion in this phase is checked against that sentence. A criterion that can
be met while a 0.2.x project opens quietly wrong is measuring the release process, not the release.

## 2. 🔴 Why this phase is different from phases 74, 75 and 82

Every previous release phase shipped to people who were **installing**. This one ships to people who
are **upgrading**, and that changes what the phase owes.

The evidence that the ground moved is in this repo's own policy file, and nobody has read it since
it was written. [`COMPATIBILITY-POLICY.md`](../../reference/COMPATIBILITY-POLICY.md) (2026-07-30,
*"Binding on every task, in every phase"*) waives protecting other people's old files — and then
names four things it does **not** waive. The second:

> **2. A project authored in NodeGX must still open in the next NodeGX.** Once we ship a real
> release, forward compatibility for *our own* format begins to matter. Until then (see "Who
> actually has a project" below) this costs nothing — **but the moment v1 ships publicly, breaks
> need a migration that runs on load.**

And the ground that clause stands on, in the same file:

> **NodeGX has never had a public release.** `v0.1.0` is a *draft* release… **There are zero NodeGX
> projects in the wild.** … **Therefore the only projects that exist today are ours.**

**That sentence was true when it was written and is false now.** Measured:

| what | reading, 2026-09-22 |
|---|---|
| public tags since the policy was written | `v0.2.0`, `v0.2.2`, `v0.2.3`, `v0.2.4` — four |
| projects in the wild | phase 84 is scoped from **15 confirmed community issues**, filed **against the 0.2.2 AppImage**, by named people (`@dishant-kumar-thakur`, [#21](https://github.com/The-Low-Code-Foundation/NodeGX/issues/21)) on a machine that is not ours |
| the clause's trigger | **fired** |

🔴 **So this phase's real subject is not the version number. It is that the compatibility policy's
"this costs nothing" expired four releases ago and no phase has priced it since.** The number is a
consequence of that, and it is settled in §3.

## 3. The number: **0.3.0 is right**, and here is what makes it right

Richard asked *"if that's the right version number"*. It is, and not for the reason the question
assumed — not "a bunch of features", which would be 0.2.5. Three readings:

**(a) The 0.x semver convention.** In a `0.x` line the minor is the break signal; the patch is not.
Anything that changes what a project holds, or what the editor will do with a project it already
holds, belongs in a minor. 0.2.4 → **0.3.0**.

**(b) There is at least one measured, ruled, user-visible break** — see §4.1. Not a hypothetical.

**(c) It is the first release the forward-compatibility clause applies to**, per §2. Cutting it as
0.2.5 would say "patch release, nothing to see" over the exact release where that stopped being
true.

**And it is not 1.0.0.** [`POST-ALPHA-INDEX.md`](../POST-ALPHA-INDEX.md) still records no
compatibility contract, no structural merge, and a supported team size of approximately one. 1.0.0
is a promise this codebase has not built yet. 0.3.0 says *"it moved, and it can move again"*, which
is the truth.

⚠️ **Nothing in `dev-docs/` mentions `0.3.0` anywhere** (grepped, 2026-09-22). This phase is where
the number is first written down, so §3 is the citation a later session should quote.

## 4. What is actually in this release, measured

**427 commits** on `cline-dev` since `v0.2.4` (tagged 2026-09-12 10:58:19 +0200 — **ten days**).
The product version is `packages/noodl-editor/package.json` = **`0.2.4`**; the root
`package.json`'s `1.1.0` is upstream OpenNoodl's legacy number and is **not** the product version
(established in [`PUBLISH-0.2.2.md` §2](../release-0.2.2/PUBLISH-0.2.2.md)).

### 4.1 🔴 The one break that is already measured and already ruled

`aa0cd5b13` (P99 / HLT-007 a) — **the Styles panel no longer shows Text styles**, and its own
commit message is the measurement:

> *"HLT-007 §2 said the section reads a layer 'empty in every real project'. It does not. The
> importer loads `textStyles` from `nodegx.styles.json` into that layer. **17 of 19 current-format
> projects on this machine carry text styles**, among them Richard's own Puppy test and Landing page
> test V2. In the legacy format, **39 of 154** do, including **16 shipped library prefabs**. The
> question was put to Richard three times as the facts were corrected. His ruling on the last:
> **'Remove it anyway.'**"*
>
> *"Text styles still apply at runtime, a Text node can still pick one, and a prefab import still
> brings them in. **The editor no longer lists, renames or deletes them.** Converting them to Looks
> was raised as a compromise and is **not built**."*

🔴 **And the upgrade consequence WAS in front of Richard when he ruled — do not re-ask it.**
`HLT-007-THE-TWO-THINGS-P94-DID-NOT-RULE-ON.md:17-24` records all three askings: the third *"gave
the 17-of-19 figure and named his two projects"*. His answer, verbatim:

> *"Remove it anyway. I don't feel like it's going to cause a massive backlash. **You could argue
> that we could convert the existing text styles into Looks in the new styles system, as a
> compromise.** Most of them will just be using the default text styles that come baked into the
> old editor."*

So the removal is ruled **on the numbers**, and it is not reopened. What is genuinely open is the
**compromise Richard himself raised and P99 recorded as `📋 Not built`**: converting existing text
styles into Looks. That is UPG-003, and R3 asks only whether it happens for 0.3.0.

### 4.2 The break class that is **clean**, so nobody re-measures it

🔴 **Record this so a later session does not spend a session on it.** Renaming a built-in node's
port breaks every project that wired it, with no alias and no warning — this repo has done it
seven times and shipped nothing for projects on disk (P86 D1, still unowned).

**Measured for this release: 57 files changed under `noodl-runtime/src`,
`noodl-viewer-react/src/nodes` and `noodl-viewer-cloud/src/nodes` since `v0.2.4`, and the diff
removes no port `name:` or `displayName:` line at all** — the only two `-  name: string;` hits are a
TypeScript interface field. **No port was renamed in 0.3.0.** The P86 debt is older than this
release and is not this phase's to pay.

### 4.3 The rest of the census is UPG-001

The candidate classes, from the phases that shipped into this window — the Look model (P94), the
Styles panel (P94/P99), the backend storage plane (P97), the exporter (P94 STY-004, P83), the
validator (P99 HLT-014 — whose commit subject says a popup with no accessible name *"fails the
project validator"*, and which UPG-001 §3.3 measured as `severity: 'warning'`. 🔴 **That gap is why
this phase censuses the artefacts and not the 427 subjects.**). UPG-001 owns turning that list into
a table with a decision per row.

## 5. The tasks

| id | task | needs a ruling | why it is in this phase |
|---|---|---|---|
| **UPG-001** | [The break census — what a 0.2.4 project loses in 0.3.0](UPG-001-THE-BREAK-CENSUS.md) | — | the number, the notes and the migrations all read from it. **Started; §4.1 and §4.2 are its first two rows** |
| **UPG-002** | The compatibility policy's ground has moved | **R2** | amend [`COMPATIBILITY-POLICY.md`](../../reference/COMPATIBILITY-POLICY.md) with a dated amendment saying what a break owes now that the clause has fired. It is *binding on every task in every phase* and currently states a falsehood as its premise |
| **UPG-003** | The text styles nobody can edit | **R3** | §4.1. The conversion-to-Looks compromise **Richard raised himself** and P99 left `📋 Not built`. Build it for 0.3.0, or ship a release note — but not silence |
| **UPG-004** | The version bump, and the literals that are not the version | — | `0.2.4` → `0.3.0` in **one** file. The prefab `library.json` files and `package-lock.json` are **traps**, both already measured in [`PUBLISH-0.2.2.md` §2](../release-0.2.2/PUBLISH-0.2.2.md). Plus the first-two-segment consumer in §5.1 below |
| **UPG-005** | What ships and what waits | **R4** | **P83 and P84 both carry `Release: ⬜ NOT RULED` on their boards today.** A release cannot be cut with two phases explicitly waiting on a release ruling that was never given |
| **UPG-006** | The release notes, the changelog, and the what's-new post | **R5** | 427 commits, written from the person's side. And see §5.2 — the in-app feed the editor already asks for on every project open |
| **UPG-007** | The shelf before the tag | — | templates are **served**, not shipped; publishing is independent of the tag but **ordered** before it, or the release notes describe a shelf the app draws empty ([`PUBLISH-0.2.2.md` §6](../release-0.2.2/PUBLISH-0.2.2.md)) |
| **UPG-008** | The cut | — | the runbook. **There is no `release-0.2.3/` or `release-0.2.4/` directory** — the last written runbook is 0.2.2's, and its §3 records mac legs that could not sign and a runner image that caused it. Re-derive the gates and the editor floor **by name**, never carried from a handoff |

### 5.1 A consumer of the version that has not moved since 0.1.x

[`main.js:287-289`](../../../packages/noodl-editor/src/main/main.js#L287-L289) probes local docs at
`http://127.0.0.1:3000/${version}/version.json`, where `version` is
`app.getVersion().split('.').slice(0, 2).join('.')` — **the first two segments**. Every 0.2.x
release produced `"0.2"`, which is why the 0.2.2 bump could record "no behaviour change". **0.3.0
produces `"0.3"` — the first move in this consumer since 0.1.x.** It is a localhost dev probe, not a
user-facing URL, so it is a row in UPG-004 and not a blocker; it is written here because the 0.2.2
runbook's "neither consumer changes behaviour" line is the kind of sentence that gets carried
forward without re-reading.

### 5.2 The release has an in-app announcement surface, and it is a 404

P99 §10: the editor requests `static/whats-new/feed.json` from the content origin **on every project
open**, and there is no `static/whats-new/` directory at all — confirmed 404, 2026-09-22. Richard
ruled: publish an empty feed *"so the feed becomes usable later without another change"*. The file
is written and **not pushed** — the `gh api -X PUT` to the public content repo was refused by the
auto-mode classifier, and **Richard has to allow it or run it**.

🔴 **0.3.0 is "later".** A release that changes what a project holds is exactly what that feed
exists to say, and the release is the event that makes an empty feed worth filling. UPG-006 owns
the post; the push is still Richard's.

## 6. Rulings needed — none of these is code

| # | question | recommendation |
|---|---|---|
| **R1** | Is the number **0.3.0**? | **Yes** — §3. Answer this one and §3 stops being a proposal |
| **R2** | Now that the forward-compat clause has fired, what does a break owe? A migration that runs on load, a loud report at load, or a release note and nothing else? | **A visible report at load, migration where the data is recoverable.** The policy already forbids the third option for anything that would silently write a wrong project back |
| **R3** | You raised converting existing text styles into Looks *"as a compromise"* and it was never built. Does 0.3.0 carry it, or a release note? | **Release note for 0.3.0, conversion as its own row.** You also said *"most of them will just be using the default text styles baked into the old editor"* — if that holds, the conversion mostly recreates defaults, and the census's §4.1 drive is what would show it either way |
| **R4** | P83 and P84 say `Release: ⬜ NOT RULED`. What waits for 0.3.1? | **Rule the boards, not the tasks** — a per-task triage of 17 + 15 rows will eat the phase |
| **R5** | Does 0.3.0 wait for the what's-new push (§5.2), which only you can make? | **No — it ships either way**, but the post is worth more than the empty feed |

## 7. Out of scope

- **Re-litigating the Text styles removal.** Ruled 2026-09-22 **on the 17-of-19 figure, with his
  own two projects named** — the facts were corrected three times and he ruled on the corrected
  set. UPG-003 owns the conversion he raised, not the removal he ruled.
- **The P86 port-rename debt** (§4.2). Real, unowned, and older than this release.
- **1.0.0 and a compatibility contract.** §3. A later phase, and a large one.
- **Building anything new.** 🔴 A release phase that grows features grows its own blockers. Every
  row above is census, decision, note or cut. If a row turns into a build, it belongs to the phase
  that owns that surface.
