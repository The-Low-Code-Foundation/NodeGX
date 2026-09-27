# FED-001 — A feed is a thing you can parse

**Status: ✅ CLOSED, 2026-09-18 (s1). All six ACs green, built, gated and driven over HTTP.**
**AC5 measured: +14.8 KB gzipped against a 50 KB budget (§6).**

> "It couldn't really help you keep up with your subscriptions in Reddit or Youtube or social media so
> you don't doom scroll several platforms every day wondering if anyone has done anything new."
> — Richard, 2026-09-18, on why the first build of Thread failed

## 1. The person sentence

**Someone drops a `Parse Feed` node after an `HTTP Request` node, wires the response text in, and
gets a list of items with a title, a link, a date, an author and a body, whether the source was a
blog, a YouTube channel, a subreddit or a podcast.**

## 2. What is there (read 2026-09-18, HEAD `f3f67874d`)

| reading | where |
|---|---|
| CSV has a shared node pair: `Parse CSV` and `To CSV`, registered in the shared list so both browser and cloud see them | `noodl-runtime/src/nodes/std-library/data/parsecsv.ts`, `tocsv.ts`; `noodl-runtime.ts:209` |
| The HTTP node returns the body as parsed JSON or as text; body types offered are `json`, `form`, `urlencoded`. **No XML branch** | `std-library/data/httpnode.ts:918-934` |
| 🔴 No XML parser of any kind in any package: zero hits for `fast-xml-parser`, `xml2js`, `DOMParser`, `sax` across `packages/*/package.json` and the three runtime source trees | grep, 2026-09-18 |
| The cloud runtime is Node 22 in-process: no `DOMParser` global there either. The browser has one | `noodl-viewer-cloud/src/index.ts:84`; TALK-007 §3.2 |
| A function cannot `require()`; anything a cloud node needs must be bundled into the backend | `noodl-viewer-cloud/src/kitModules.ts:111-118` |
| What the real sources emit: YouTube channel feeds are **Atom** with `media:group` and `yt:videoId`; Reddit `.rss` is **Atom** with HTML-escaped bodies; podcasts are **RSS 2.0** with `itunes:` and `enclosure`; Bluesky is **JSON** (no XML needed); Hacker News is JSON | source formats, not repo |

## 3. Design

### 3.1 Two nodes, shared

**`Parse XML`** — text in, a plain object out. One vendored pure-JS parser
(**`fast-xml-parser`, held to the 4.x line — `^4.5.7` in `package.json`**), bundled once for the cloud runtime and once for the
browser like any shared node.

> 🔴 **The parenthetical above originally read "MIT, no dependencies, ~40 KB". That was never true
> at any version, and it was repeated to Richard when R1 was put to him.** Measured from the
> registry 2026-09-18, before installing: **4.5.7** has one dependency (`strnum`, MIT, 19 KB, no
> deps of its own) and 230 KB unpacked; **5.11.1**, the latest, has **six** — `strnum`, `is-unsafe`,
> `xml-naming`, `fast-xml-builder`, `@nodable/entities`, `path-expression-matcher` — and **1.3 MB**
> unpacked. The range is `^4.5.7` for that reason — it takes 4.x patches and
> **cannot reach 5.x**, because six new transitive packages in a runtime bundle is a supply-chain
> surface, not a version bump. Anyone bumping to 5 should re-measure the tree first. The parser path actually imported is 69 KB of source,
> 16 KB gzipped unminified. The ruling stands; only the number under it was wrong.

Options as ports: `attributePrefix` (default `@`), `alwaysArray`
(a list of tag names that are always arrays, so one `<item>` and ten `<item>`s have the same
shape), `trimValues`. An entity bomb or a document over `maxBytes` (default 5 MB) is a loud
failure on the `Failure` output, not a hang. External entities and DTDs are never resolved.

**`Parse Feed`** — text in, `items` out, plus `feed` (title, link, description, updated). Detects
RSS 2.0, Atom 1.0 and RDF/RSS 1.0 from the root element and normalises to **one item shape**:

```
{ id, title, link, published, updated, author, summary, content, image, enclosure, tags, raw }
```

- `id` is `guid` / `<id>` / else the link / else a hash of title+published. It is what FED-002's
  unique index keys on.
- `published` and `updated` are ISO 8601 strings, or null. RFC 822 dates (RSS) are converted.
- `content` is the HTML body if the feed carries one (`content:encoded`, Atom `content`), `summary`
  is the plain description. Nothing is sanitised here: that is the renderer's job, and the node says
  so in its description.
- `image` is the first of `media:thumbnail`, `media:content[medium=image]`, `itunes:image`,
  `enclosure[type^=image/]`.
- `raw` is the item as `Parse XML` saw it, for the fields the shape does not cover (`yt:videoId`,
  `itunes:duration`).

A `kind` output on the feed (`rss | atom | rdf`) and a `source` hint (`youtube | reddit | podcast |
generic`) detected from namespaces, for the graph that wants to branch.

### 3.2 The HTTP node learns to hand over text

`HTTP Request` gains `responseType: auto | json | text` (default `auto`, which is today's
behaviour). `text` guarantees the body reaches `Parse Feed` untouched, whatever the content-type
header claims. Feeds are served as `application/rss+xml`, `text/xml`, `application/xml` and, from
Reddit, sometimes `text/html`. `auto` must not attempt JSON on any of those.

### 3.3 Where it registers

Both nodes go in the **shared** list next to `Parse CSV`, so the catalogue shows them in both
runtimes with `availableIn: ["browser", "cloud"]`. Docs: a section in `docs/runtime/` beside the
CSV nodes, with the item shape table above verbatim.

## 3.4 What "one vendored parser" turned out to mean

The dependency landed as a normal workspace dependency of `@noodl/runtime`, not as a copied-in
vendor directory: `npm install fast-xml-parser@4.5.7 --workspace=@noodl/runtime --ignore-scripts`, which recorded
`^4.5.7`. `--ignore-scripts` was deliberate: a plain install runs every workspace's `prepare`, and
`@noodl/runtime`'s is `tsc -p tsconfig.types.json`, which emits in place.
The lockfile delta is **two entries and nothing else** — `fast-xml-parser` and `strnum`, no version
moved anywhere else in the tree — which was checked against a copy of `package-lock.json` taken
before the install rather than assumed from npm's summary line.

## 4. Acceptance criteria

1. **AC1** — A cloud function with `HTTP Request → Parse Feed` against a fixture RSS 2.0 file,
   a fixture Atom file, a captured YouTube channel feed, a captured subreddit `.rss` and a captured
   podcast feed returns items in the shape of §3.1 for all five. Test asserts `id`, `title`, `link`,
   `published` non-null on every item, and `image` on the YouTube and podcast fixtures.
2. **AC2** — A single-item feed and a ten-item feed both return `items` as an array.
3. **AC3** — A 6 MB document, and a document carrying a billion-laughs entity expansion, both fail
   loudly on `Failure` within 2 seconds and leave the process alive.
4. **AC4** — `Parse XML` on a document with attributes and mixed content round-trips the fixtures
   in `tests/fixtures/xml/` exactly as documented.
5. **AC5** — The browser bundle grows by no more than 50 KB gzipped; the number is in the task
   file when it closes.
6. **AC6** — Both nodes appear in the editor's node picker under Data, with descriptions, and in
   the MCP `list_node_types` output with `availableIn` set.

## 5. What was built (s1, 2026-09-18)

| | file |
|---|---|
| the parser, with both guards | `packages/noodl-runtime/src/xml.ts` |
| four formats → one item shape | `packages/noodl-runtime/src/feed.ts` |
| `Parse XML` | `packages/noodl-runtime/src/nodes/std-library/data/parsexml.ts` |
| `Parse Feed` | `packages/noodl-runtime/src/nodes/std-library/data/parsefeed.ts` |
| `responseType: auto \| json \| text` | `packages/noodl-runtime/src/nodes/std-library/data/httpnode.ts` |
| shared registration | `noodl-runtime.ts:304-305`; picker index `src/nodelibraryexport.ts:771-772` |
| fixtures — 7 feeds, 2 XML | `packages/noodl-runtime/test/fixtures/{feeds,xml}/` |
| the parser suite, 41 tests | `packages/noodl-runtime/test/fed-001-feed.test.ts` |
| **the drive**, 12 tests over HTTP | `packages/nodegx-backend/tests/cloud-feed-nodes.test.ts` |
| node docs + one worked example each | `docs/node-catalog/enrichment/net.noodl.parse{xml,feed}.json`, `docs/node-catalog/examples/bubble-read-{a-feed-into-a-list,an-xml-response}.json` |

**Gates run:** `noodl-runtime` full suite **165 suites / 2819 tests green**; `nodegx-backend`
`cloud-feed-nodes` **12/12**; `tsc --noEmit -p` on `noodl-runtime` clean; `catalog:check` and
`catalog:merge:check --require-coverage` both green at **179/179 nodes documented, 107 examples**.

### 5.1 Where the fixtures live, and why not where the AC said

AC1 and AC4 say `tests/fixtures/` without naming a package. They are in
**`packages/noodl-runtime/test/fixtures/`** — the package that owns the parser — and the backend
drive reads across to them. That is the direction the dependency already runs
(`nodegx-backend` → `@noodl/runtime`, never the reverse), and one copy cannot drift from a second.

### 5.2 Two things the session found by arming controls rather than by reading

🔴 **The single-item guarantee was attributed to the wrong mechanism.** The fixture comment said a
one-item feed stays an array because of the parser's `alwaysArray` option. A control removed
`item`/`entry` from `FEED_ARRAY_TAGS` and **AC2 stayed green**: it is `many()` in `feed.ts` that
carries it, by wrapping a lone object. Two other injected defects (Atom `rel="alternate"`, RDF
items read from the channel) both went red, so the suite grades what it claims — but that one
assertion was grading a different thing than its comment said. Both the fixture and the code now
say which mechanism actually holds AC2, so nobody "simplifies" `many()` and finds out later.

🔴 **The first run of the drive suite hung for 30 s and answered 504, and it was right to.** The
`auto`-versus-`text` control fetches a feed the server mislabels as `application/json`. On `auto`
the HTTP node believes the header and fails **at the fetch**, not at the parse — and the graph
wired only the parser's `Failure`, so nothing reached a Response node (CWF-018). Wiring the HTTP
node's own `failure` fixed it and the case now answers in 131 ms. **This is a real trap for anyone
building a feed graph, not a test artefact**, so it is written into both node docs as a pattern and
into the worked example as two wired failure paths.

## 6. AC5 — measured

Taken 2026-09-18 once the peer session tore its stack down and the box was verified free
(`uptime`, no webpack, no Electron). Two `noodl-viewer-react` production builds, differing **only**
in whether `noodl-runtime.ts` registers the two nodes.

| bundle | gzipped, without | gzipped, with | delta |
|---|---|---|---|
| `deploy/noodl.deploy.js` | 396,541 | 411,717 | **+15,176 B = +14.8 KB** |
| `viewer/noodl.viewer.js` | 396,583 | 411,760 | **+15,177 B = +14.8 KB** |
| `ssr/noodl.deploy.js` | 393,839 | 409,040 | **+15,201 B = +14.8 KB** |

**+14.8 KB gzipped against a 50 KB budget — 30% of it.** That is `fast-xml-parser`'s parser path
plus `strnum` plus `xml.ts`, `feed.ts` and the two nodes, after webpack minified all of it.

### 6.1 Both arms carry a control, because a size delta is easy to fake

A build that silently failed to include the parser would produce a *smaller* number and read as a
better result. So each arm was probed for markers that exist only if the parser was actually
bundled — `xml/entity-declaration`, `Always Array`, `attributeNamePrefix`:

- **without:** all three absent (0 hits), as required.
- **with:** all three present (1 hit each).

⚠️ **The obvious probe does not work.** Grepping the control arm for `net.noodl.ParseFeed` returns
**1**, not 0 — `nodelibraryexport.ts` carries the type name as a string literal in the add-node
picker index, and that literal ships whether or not the node module is registered. A control built
on that string would have read "the node is in the bundle" for an arm that contains none of its
code. Probe for code, not for a name.

Restoring `noodl-runtime.ts` afterwards was verified with `git diff HEAD`, not `git diff` — see
§6.2.

### 6.2 One process note worth the next person's time

The commit was made through a temporary index (the recipe for committing only your own delta on a
shared checkout). Its **last step — `git reset -q -- <your paths>` on the REAL index — was skipped**,
and the consequence was immediate and misleading: `git diff` on a correctly-restored file showed
seven phantom insertions, because `git diff` compares the working tree to the **index**, and the
real index was still pinned at the pre-commit base. `git diff HEAD` was empty, which is the true
answer. Left unfixed it is worse than confusing: the stale index held **37 files as staged
deletions**, which is exactly the shape that lets a sibling's pathspec commit revert someone's
slice. Refreshed, and the peer's 28 uncommitted files were confirmed intact afterwards.
