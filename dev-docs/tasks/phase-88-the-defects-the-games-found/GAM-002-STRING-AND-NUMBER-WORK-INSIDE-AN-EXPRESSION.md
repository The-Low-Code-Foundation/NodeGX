# GAM-002 — `String(n)` and `Number(s)` work inside an Expression

**Status: 🟢 built, session 11 (2026-09-14, over `5df2a01a6`), committed `89e533625`.** Option A under R4, plus a lexer in place of the regex (no parser ships in the runtime). AC1 RED at HEAD (17 failed, the 2 controls passed). AC2, AC5 and AC7 graded with 4 reverted arms (8/2/6/1). AC3's census: 386 Expressions, **0 wires lose their port**, so no migration is owed on any project on this machine; the runtime guards a saved wire instead. **Left:** AC4 (the editor, driven), the cloud runtime run, the viewer and MCP bundles, and AC6's Rocket School sites (the peer's files, §8). **Source:** [P78 D54](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 Rocket School's first drive, 2026-09-12 · **Side:** product (runtime, `Expression`)

Someone types the JavaScript they already know, `String(n)`, and the node says *"The expression threw: String is not a function"*. The node turned `String` into an input port, so `String` was `undefined` when the expression ran.

## 1. The person sentence

**Someone writes `String(n)`, `Number(s)` or `JSON.stringify(o)` in an Expression. They get the answer, and the node shows one input port for each piece of data the expression uses, and no port for anything else.**

## 2. What was measured

HEAD `eb12ebe99`.

| reading | where |
|---|---|
| `parsePorts` strips `"…"` and `'…'` strings, then treats every `[a-zA-Z_$][\w.$]*` match as an identifier. A dotted path contributes only its root. Re-read at HEAD | [`expression.ts:742-772`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L742-L772) |
| `portsToIgnore` has **30 names**: the 15 preamble maths names (`min` … `exp`), `Math`, `window`, `document`, `undefined`, `Vars`, `Variables`, `Objects`, `Arrays`, `Noodl`, `NoodlContext`, `true`, `false`, `null`, `Boolean`. **Not** `String`, `Number`, `JSON`, `Date`, `parseInt`, `parseFloat`, `isNaN`, `Array`, `Object`, `NaN`, `Infinity`, or any keyword. Re-read at HEAD | [`expression.ts:702-732`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L702-L732) |
| The compiled function takes `Object.keys(scope)` plus `Noodl` as parameters, so a name that became a port shadows the global of the same name. Every discovered input is seeded `undefined`. Re-read at HEAD | [`:384-406`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L384-L406), [`:184`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L184), [`:461`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L461) |
| 🔴 **The register's `Math` claim does not hold at HEAD.** D54 says `Math` becomes an input port. `Math` is on the ignore list (`:718`), and `Math.min` contributes only its root. So `Math.min(a, b)` mints no `Math` port and should work. That is predicted from source and not run. D54's measured error was `String(n)` alone | as above |
| Predicted from source, not run: `typeof x` mints a port named `typeof`, and a `Function` parameter named `typeof` is a SyntaxError, so the whole node reports `expression/compile-failed`. A `)` before a `.` mints the method name as a port: `(a + b).toFixed(2)` mints `toFixed`. So do identifiers inside a comment or a template literal | `:758-766`; [P85 parts-source README:40-49](../phase-85-the-component-is-the-backbone/parts-source/README.md) |
| The port description says *"every identifier in it becomes an input port"*. The catalog's parameter doc says *"standard Math functions are available (e.g. round(), abs())"*. Its two `antiPatterns` do not mention shadowing. Re-read at HEAD | [`expression.ts:429`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L429); `node-catalog-enriched.json` Expression entry, `antiPatterns` at `:9095-9098` |
| The editor gets the same scan through `updatePorts`, so it shows `String` as a port. Re-read at HEAD | [`expression.ts:774-793`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L774-L793) |
| Shipped surface, crude grep: 120 `"expression": "…"` strings under `library/` and `templates/`. One names a JS global, `Math.round(val)`, and `Math` is ignored. Escaped quotes can truncate a match, so this is not a census | `grep -aroh '"expression": *"[^"]*"' library templates` |
| The template's workaround: `'' + n`, bare `round(…)`. At HEAD the countdown numeral is `'' + ceil(v * limit / 100000)`, and a gate pins that exact string. Re-read at HEAD | [`tpl007Components.ts:1110`](../../../packages/noodl-mcp/tests/tpl007Components.ts), [`tpl007Template.test.ts:727`](../../../packages/noodl-mcp/tests/tpl007Template.test.ts) |

## 3. Where it bites a person

Anyone who writes ordinary JavaScript in the node sold as *"the cheapest correct answer to `price * quantity`"*: formatting a number, parsing a field, `JSON.stringify` for a debug caption, `Date.now()`. The error names the global, not the port that shadowed it, so it reads like a broken browser. Agents are hit harder, because `String(x)` is what a model writes by default.

## 4. Related work and collisions

- **P30 NDA-012 audit, row D1** ([`audit/customcode.md:66`](../phase-30-node-library-audit/audit/customcode.md), [`NODE-REGISTER.md:52`](../phase-30-node-library-audit/NODE-REGISTER.md)). The same defect, filed 2026 and **explicitly not fixed**: *"widening `portsToIgnore` changes the port set of every existing Expression node in every project, which is a migration decision, not a bug fix"*. The audit predates NDA-017, which is why it says the seed is `0`; at HEAD it is `undefined`. **No task owns the fix.** This task is that owner.
- **P85 parts-source README:40-49.** The method-chain half of the same text scan (`.trim()` after `)` mints `trim`). P85 avoided it by using a Function node. This task's scan change should close it or say why not.
- **P61 FUN-009** (built, `ace5232f3`). The editor's `codenotation: 'expression'`, and the note that Expression's scoping rule is the inverse of Function's. Adjacent. A new ignore list must stay in step with what FUN-009's completion offers.
- Grep run: `grep -anl "portsToIgnore" -r dev-docs/tasks` and `grep -anl "String is not a function\|every identifier" -r dev-docs/tasks`. Other hits (P73 TUT-004, P42, P57) are about different errors.

## 5. Design

| option | what it does | trade |
|---|---|---|
| **A. Widen the list** | add the JS globals (`String`, `Number`, `JSON`, `Date`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `Array`, `Object`, `NaN`, `Infinity`, `encodeURIComponent`, …) and the operator keywords (`typeof`, `instanceof`, `new`, `in`, `void`) | smallest change. 🔴 Any saved project with a **wired** port named, say, `Date` loses that port and its connection dangles. That is the migration the audit refused |
| **B. Parse for free variables** | a real parse instead of the regex: strings, template literals, comments, member names after `)` and keywords all fall out | closes P85's half too. Needs a parser in the runtime bundle (check what `expression-evaluator` already uses before adding one). The same migration question as A for globals |
| **C. Pass a global-named port only when it has a value** | keep minting ports, but compile a port named like a global as a parameter only when something is wired to it | no migration. 🔴 A name means different things depending on wiring, invisibly |
| **D. Say so** | node docs, port description and catalog `antiPatterns` name what is shadowed, plus an editor diagnostic for an identifier that shadows a JS global | changes no behaviour, and leaves `String(n)` broken |

🔒 **Richard: may an Expression stop offering a port whose name is a JavaScript global (A or B), given that a saved project wired to such a port would lose the wire? Or must existing ports survive (C, or D only)?** Nothing is built until this is answered. The blast-radius AC below gives him the count.

> 🔒 **Ruled, 2026-09-14 (session 1): yes.** Expressions stop minting ports for JavaScript globals and keywords. Any
> saved project wired to such a port is migrated. — Richard, choosing that over "only if the census counts zero", C, and D
>
> The build: B (a real free-variable parse) if the runtime bundle already carries a parser, otherwise A. AC3's census still
> runs first. A non-zero count means a migration is written for every hit, not a return to Richard.

**Do not** make the port set depend on the environment (`typeof globalThis[name]`). The browser, the cloud runtime and the editor would disagree about which ports a node has.

## 6. Acceptance criteria

| AC | clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A runtime spec: `String(n)` with `n = 5` raises `expression/threw` "String is not a function". Known-firing control in the same file: `'' + n` gives `"5"`. Also recorded, pass or fail: `Math.min(a, b)` (predicted to work at HEAD, which is the register correction) and `typeof n` (predicted `compile-failed`) |
| AC2 | After the ruled change, `String(n)`, `Number(s)`, `JSON.stringify(o)`, `parseInt(s)` and `Date.now() - t` evaluate, and each node's registered inputs are exactly its data identifiers (`[n]`, `[s]`, `[o]`, `[s]`, `[t]`). **Sabotage arm:** restore the old list or scan, and AC2 goes RED |
| AC3 | **Blast radius, measured before landing.** For every Expression in `library/`, `templates/`, `project-examples/` and both render corpora: the port set before and after, and **every connection whose target port disappears**. The count goes to Richard with the 🔒. Zero, or each one migrated as ruled |
| AC4 | **Editor, driven.** Type `String(n)` into an Expression. The port panel shows only `n` and the preview shows the value. Wiring `n` updates it. A console listener attached before the drive has a known-firing signal and records no `expression/threw` |
| AC5 | Whatever the ruling leaves unavailable is named in the port description and the catalog `antiPatterns`, and a spec asserts each is present (the text, not only that the field exists) |
| AC6 | **Workaround.** Say whether Rocket School's `'' + …` sites can return to `String(…)`. If they are changed, regenerate, run the template gate (`tpl007Template.test.ts:727` pins the string) and drive `drive-rkt007-boost.js`. If they are kept, write why in the gate's comment |
| AC7 | If option A or B lands, P85's method-chain case (`(first + ' ' + last).trim()`) mints only `first` and `last`, or §8 records why it was left |

## 7. Traps

- 🔴 **`compiledFunctionsCache` is module-level** (`expression.ts:700`), keyed by expression plus parameter names. A sabotage arm in the same jest module can pass on a cached function from the previous arm. Isolate the module per arm.
- `Math.min` was never broken (§2). A fix graded on it grades nothing.
- The editor's port list comes from `updatePorts`, which runs only when `isRunningLocally()` (`:839`). A runtime-only spec cannot see what the editor shows, which is why AC4 exists.
- The cloud runtime is a second host for this node. Run AC2's arms there too, or record that it was not run.
- Do not bump a literal count in any port-count gate. Count the artefact.

## 8. Record

### Session 11 (2026-09-14, HEAD `5df2a01a6`)

**Which build.** R4 says B if the runtime already carries a parser, otherwise A. It carries none: `noodl-runtime`'s
dependencies are two `lodash` helpers and two contract packages, and no source file imports acorn, esprima, babel or
meriyah. So the list is widened (A). The regex is replaced by a small lexer in the same file, because the regex was
the cause of AC7 and a list cannot fix that.

**What was built.**
- `noodl-runtime/src/nodes/std-library/expression-ports.ts` (new, no imports): the reserved names (the 15 Math
  shortcuts, 7 Noodl names, 34 JavaScript globals, 36 sloppy-mode keywords) and `expressionReferences`, a lexer that
  skips comments, quoted strings, template-literal text (its `${…}` is read), regex literals, numbers, and a member name
  after `.` or `?.`. `expressionPorts` is the unreserved references, once, in order.
- `expression.ts`: the `expression` setter and `updatePorts` both call `expressionPorts`, so the editor and the runtime
  cannot disagree. `portsToIgnore` and `parsePorts` are gone. `registerInputIfNeeded` registers a reserved name as an
  input that drops its value and never enters `scope`, so a wire saved before GAM-002 cannot shadow the global again.
  The port description names what can never be a port (AC5).
- `nodegx-export/src/analyze/expression-ports.ts` is a byte-identical copy (the export cannot import the runtime), and
  `jsfun.ts`'s `expressionIdentifiersOf` uses it in place of its verbatim clone of the old list and regex.
- `docs/node-catalog/enrichment/expression.json`: the `expression` port text, and two new `antiPatterns` (the reserved
  names, and the object-literal key that still mints a port). The catalog, the enriched catalog and
  `docs-site/docs/nodes/custom-code/expression.md` were regenerated. Each differed from HEAD **only** in the Expression
  entry (diffed by `typeName`), and `docs:nodes` changed only that one page.

**AC1: RED at HEAD.** `packages/noodl-runtime/test/gam-002-string-and-number-in-an-expression.test.ts`, with
`expression.ts` checked equal to HEAD first: **17 failed, 2 passed**. The 2 passes are the known-firing controls:
`'' + n` gives `"5"`, and `Math.min(a, b)` gives `2` with ports `[a, b]`, which confirms §2's correction of the register.
The runtime's own messages:

| expression | at HEAD |
|---|---|
| `String(n)` | `expression/threw`: String is not a function |
| `Number(s)` | `expression/threw`: Number is not a function |
| `JSON.stringify(o)` | `expression/threw`: Cannot read properties of undefined (reading 'stringify') |
| `parseInt(s)` | `expression/threw`: parseInt is not a function |
| `Date.now() - t` | `expression/threw`: Cannot read properties of undefined (reading 'now') |
| `typeof n` | `expression/compile-failed`: Unexpected token 'typeof' (predicted in §2, confirmed) |
| AC7's 9 rows | each minted a junk port (`trim`, `length`, `test`, `b`, `e3`…) |
| a saved wire into `String` / `typeof` | threw / did not compile |

**AC2 and AC7: after.** 21/21, including AC5's two text rows. One row was first red for a wrong expectation of mine,
not the lexer's: in `` `${ {k: a}.k } and ${b}` `` the key `k` comes first in the text, so the port order is `k, a, b`.
The spec was corrected to text order, and says the key is still a port.

**Reverted arms** (`scratchpad/gam002/sabotage.sh`: each replaces one asserted-unique string, runs the owning spec, and
restores from a snapshot, checked byte-identical):

| arm | reverted | red | exactly |
|---|---|---|---|
| S1 | the reserved list back to the old names | **8** | the 6 AC2 rows and the 2 saved-wire rows |
| S2 | no guard in `registerInputIfNeeded` | **2** | the 2 saved-wire rows |
| S3 | a member name read as a variable again | **6** | `JSON.stringify`, `Date.now`, `.trim()`, `.length`, `/x+/.test`, `a?.b` |
| S4 | the export's copy drifts by one byte | **1** | the byte-identity row (export parity spec, 10 rows) |

**AC3: blast radius** (`scratchpad/gam002/census.js`, HEAD's scan copied verbatim against the new one). Roots:
`library/`, `templates/`, `project-examples/`, `docs/node-catalog/examples/`, P86's `corpus/` (no project JSON), the
`NodeGX test projects` folder and `~/Documents/NodeGX`. A V2 `nodes.json` is joined with its folder's `connections.json`.

| reading | value |
|---|---|
| files holding an Expression / Expression nodes | 123 / **386** (library 19, templates 118, project-examples 12, catalog examples 18, test projects 217, Documents 2) |
| wires into those Expressions (the known-firing signal) | **517** |
| port sets that change / ports that vanish | 37 / 52 |
| **wires whose target port vanishes** | **0** |
| sabotage arm `SAME=1` (HEAD's scan on both sides) | 386 nodes, 517 wires, 0 changed, 0 vanished |

Every vanished port was junk: a method or property name after `)` (`trim`, `length`, `toString`, `slice`, `charAt`,
`toLowerCase`, `toUpperCase`, `id`) or an unwired `Number`. None of the 386 used a global as data. So under R4 no wire
needs migrating on any project on this machine, and none was written. The runtime guard (S2) covers a project saved
elsewhere. The editor still shows such a wire as unconnected until someone deletes it.

🔴 **Found by the census:** two published catalog examples were broken at HEAD. `cloud-who-is-in-this-role`
(`Math.max(0, Number(page) || 0) * 20`) and `fn-cloud-function-roundtrip` (`Number(a) + Number(b)`) each minted an
unwired `Number` port, so both threw. They work after this change and were not edited.

**AC4: owed.** The editor's port list comes from the viewer bundle (`updatePorts` runs only when `isRunningLocally()`),
and `src/external`'s bundles were not rebuilt. A drive needs a rebuild and an editor launch.

**AC5.** The port description and the catalog `antiPatterns` name `String`, `Number`, `JSON`, `Date`, `parseInt`, `Math`
and `typeof`, say a wire into one delivers nothing, and name the object-literal key. The spec asserts that text.

**AC6: kept, and why.** Rocket School's `'' + ceil(v * limit / 100000)` (`tpl007Components.ts:1217`, pinned at
`tpl007Template.test.ts:753`) still works, and `String(…)` would now work too. Both files belong to the TPL-007 peer,
who was changing them during this session (22:28), so neither the generator nor the gate comment was touched. Changing
them is the peer's call.

**AC7: met.** `(first + ' ' + last).trim()` mints `first` and `last` only, and so do P85's other two cases. Left on
purpose: a key in an object literal (`{ size: n }`) still mints a port, because telling a key from a ternary's `b :`
needs a parse. It is written in the `antiPatterns`.

**§4 collisions.** FUN-009: Expression's editor mode only turns `no-undef` off (`CodeEditorType.ts:69-153`) and offers
no list of globals, so there is nothing to keep in step. P30 NDA-012 D1 is this defect, filed and not fixed for want of a
migration ruling. R4 is that ruling. The editor validator (`nonexistentPort.ts`) treats Expression inputs as runtime-minted
and skips them, and `noodl-mcp/src` never names Expression, so no third copy of the scan exists.

**Cloud runtime:** not run. It hosts the same `expression.ts`, but only through its own bundle.

**The export's pins of the old scan.** The whole `nodegx-export` suite's first run had **3 red suites, 3 tests, one
cause**. `cheer`'s `hasLongName` (`(name || '').length > 1`) no longer mints `length`, so its wrapper lost `length?: any`.
- `jsfun.test.ts` pinned the old defect by name (*"the runtime mints a port for `.length` after a paren — the wrapper
  carries it, unfed"*). That is an assertion written from HEAD's behaviour against R4. It is rewritten to pin one input
  and assert `length?: any` is absent.
- `stores-events.test.ts`'s hand-written `GOLDEN_HOME` changed the same 2 lines.
- HLS-001's golden named 1 file, `cheer/src/pages/Home.tsx`.
- **Attribution:** with HEAD's `jsfun.ts` put back (snapshot, restored, `cmp` identical), all three suites were **70/70**.
  The golden was regenerated after that and moved **1** hash line (`2f4c0fef…` → `d420548f…`). The four suites, parity
  included, were **80/80** after. The regeneration is recorded in HLS-001's header.

**Gates (2026-09-14, over `5df2a01a6`), one job at a time:**

| gate | result |
|---|---|
| GAM-002 spec at HEAD / after | 17 failed + 2 passed / **21/21** |
| 4 reverted arms | S1 **8**, S2 **2**, S3 **6**, S4 **1**, each exactly its rows; all restored byte-identical |
| export parity spec | **10/10** |
| AC3 census, both arms | 386 Expressions, 517 wires; new: 37 sets change, **0 wires lose a port**; `SAME=1`: 0 |
| `catalog:check`, `catalog:merge:check`, `docs:nodes:check` | exit 0, 0, 0, after splicing only the Expression entry |
| `catalog:examples` | exit 1, **baseline**: 2 agent examples wire Text Input's `text` output, which HEAD's catalog does not have (last touched by AIX-005). Not GAM-002 |
| whole `noodl-runtime` | **162 suites, 2,759 passed, 13 skipped**, exit 0 |
| whole `nodegx-export`, first run | 3 red (above); HEAD `jsfun.ts`: 70/70; after pins and golden: the 4 suites **80/80** |
| editor `test:main` | **458 suites, 7,522 / 7,522**, exit 0 |
| Electron `test:ci`, noodl-mcp suites, viewer/MCP bundles, cloud runtime | not run |
