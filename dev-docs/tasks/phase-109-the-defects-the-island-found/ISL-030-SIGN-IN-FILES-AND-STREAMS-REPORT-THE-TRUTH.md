# ISL-030 — Sign-in, HTTP, files and streams report the truth

**Status: ✅ CLOSED s24 (2026-10-06): 18 of 18 fixed, each with a control (§9) — AC1 by the controls (no row was a known row), AC3 one commit per ruling, AC4 no row open. ✅ AC2: all 18 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 18 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 1 high · 8 medium · 9 low, **18 awaiting a ruling**. **Side:** runtime (HTTP Request, User, Sign In With, Upload File, Cloud File, Sign File URL, SSE, Subscribe To Changes), viewer (user service, Open File Picker, Cloud Function)

## 1. The person sentence

**A request, a sign-in, a file or a live connection reports what really happened once, with the real status. A credential that is set is sent.**

## 2. Why these belong together

HTTP Request's authentication presets **have never sent a credential** (C7). A person picks Bearer, fills the token, and the
request goes out without it. A JSON body that fails to parse is reported as a network error (D11), and two requests
share one abort controller (D12). On the auth side: a backend blip at page load says Session Lost while the person is
still signed in (C45), Session Lost fires twice (C46), and after sign-out the User node keeps the person who left (C47).
A cancelled provider sign-in fires Failure twice (C50). Error Status Code is never the HTTP status (C51). Cloud File's
Name differs by backend (C52). Clearing Capture still opens the camera (C53). The streams say Connected after a silent
teardown (C58), move outputs without sending them (C56), and reconnect on a same-value write (C55).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C7](../../bugs/p107-c7-http-request-s-authentication-presets-never-send-a-credentia.md) | high | needs-ruling | HTTP Request's authentication presets never send a credential |
| [P107-C45](../../bugs/p107-c45-a-backend-blip-at-page-load-fires-session-lost-while-the-user-stays-signed-in.md) | medium | needs-ruling | On a Directus / PocketBase project, a backend that fails the page-load session check (503, network down) fires Session Lost while the user stays signed in |
| [P107-C47](../../bugs/p107-c47-after-sign-out-a-user-nodes-email-name-and-id-keep-the-person-who-left.md) | medium | needs-ruling | After a session ends (Log Out, Session Lost), a User node's Id, Email, Username and property outputs keep the person who left on every wire — only Authenticated moves |
| [P107-C50](../../bugs/p107-c50-a-sign-in-cancelled-at-the-provider-fires-failure-twice.md) | medium | needs-ruling | A sign-in cancelled (or refused) at the provider fires Sign In With's Failure twice on the page it returns to — and raises the error twice |
| [P107-C51](../../bugs/p107-c51-upload-file-and-sign-file-url-error-status-code-is-never-an-http-status.md) | medium | needs-ruling | Upload File and Sign File URL's Error Status Code is never the HTTP status — always 0 on Directus, Supabase and PocketBase, and the Parse error code (e.g. 119) on the NodeGX / Parse wire |
| [P107-C52](../../bugs/p107-c52-cloud-file-name-is-not-the-original-file-name-on-three-of-four-rest-backends.md) | medium | needs-ruling | Cloud File's Name is the original file name only on NodeGX — on PocketBase it is the random suffix, on Directus a UUID, on Supabase the bucket path |
| [P107-C53](../../bugs/p107-c53-open-file-picker-capture-cleared-still-opens-the-camera.md) | medium | needs-ruling | Open File Picker — clearing Capture after an Open that used it still opens the camera |
| [P107-D11](../../bugs/p107-d11-http-request-reports-a-json-body-that-fails-to-parse-as-a-ne.md) | medium | needs-ruling | HTTP Request reports a JSON body that fails to parse as a network error |
| [P107-D12](../../bugs/p107-d12-http-request-two-overlapping-requests-share-one-abort-contro.md) | medium | needs-ruling | HTTP Request: two overlapping requests share one abort controller, so Cancel can miss the live one |
| [P107-C46](../../bugs/p107-c46-a-rejected-session-at-page-load-fires-session-lost-twice.md) | low | needs-ruling | A session the backend rejects at page load fires Session Lost twice on every User node |
| [P107-C55](../../bugs/p107-c55-subscribe-to-changes-a-same-value-write-reconnects.md) | low | needs-ruling | Subscribe To Changes — writing a value an input already holds tears the subscription down and opens a new one |
| [P107-C56](../../bugs/p107-c56-sse-three-outputs-move-without-being-sent.md) | low | needs-ruling | Server-Sent Events — Last Error, Retry Count and Duplicates Suppressed change without being sent, so the wire shows stale values |
| [P107-C58](../../bugs/p107-c58-sse-says-connected-after-a-url-change-tore-the-stream-down.md) | low | needs-ruling | Server-Sent Events — after a URL change with Auto Connect off, Connected stays true and Connection State "open" though the stream is gone |
| [P107-D23](../../bugs/p107-d23-set-user-properties-username-is-thrown-away-on-directus-and-pocketbase.md) | low | needs-ruling | Set User Properties' Username is thrown away on Directus and PocketBase — the write says Done and the username never changes |
| [P107-D25](../../bugs/p107-d25-request-magic-link-error-keeps-the-last-failure-after-a-done.md) | low | needs-ruling | Request Magic Link's Error says "empty until one does" fail and is cleared on a Done — but the clear never reaches a wire, so a label keeps the last failure after a success |
| [P107-D26](../../bugs/p107-d26-sign-file-url-expires-at-keeps-the-previous-link-s-expiry-after-a-public-link.md) | low | needs-ruling | After Sign File URL mints a link with no expiry (a public link), Expires At and TTL keep the PREVIOUS link's values downstream |
| [P107-D27](../../bugs/p107-d27-open-file-picker-accept-is-the-string-undefined-when-blank.md) | low | needs-ruling | Open File Picker — with Accepted file types never set, the dialog's accept attribute is the string "undefined" |
| [P107-D28](../../bugs/p107-d28-cloud-function-error-can-be-an-object-on-a-string-port.md) | low | needs-ruling | Cloud Function — Error carries an object when the backend's error field is one |

## 4. Order of work

C7 first (high, and the fix is small), then C45/C46/C47 (sign-in state), then C50, C51 and the stream rows, then the low D rows.

## 5. Rules for every row

- **Re-measure first, cheaply.** Every P107 row is a *known row* on the runtime target, and
  `packages/noodl-runtime/test/node-spec/conformance.test.ts:714` asserts each one **still fires** on every run. A row
  that has stopped firing turns that test red. So run the node-spec suite before you start. A row that no longer fires was fixed
  by someone else: close it in the ledger with the commit that fixed it, and do not fix it again.
- **A `needs-ruling` row is asked before it is fixed.** P107's R3 says the runtime wins until Richard rules. Most rows
  already carry the plain-words question and a recommended fix in their evidence section (the NSP task's §6, or the P107
  README §7). Ask the rows of this task **in one batch**, plain words, one decision per question, recommendation first,
  and say what the node is in each question. Ask only when this task is next to build.
- **A fix ships alone and closes its row in the same commit:** drop the known row from the spec's runtime list, bump
  the spec's `version` with a `changes` entry that names the bug's id (P107 NSP-010, P112 OWN-010), set the ledger
  file to `status: fixed` with `commit:`, and add a `regression:` line (the scenario that now passes). `node
  scripts/bugs.js check` fails a fixed kit bug without one.
- **The export is not fixed here.** If the exported app has the same fault, write a row on P18's ledger, as P107 §8 does.

## 6. Related work and collisions

- C8 and C57 (non-text inputs that throw) are in ISL-026. C54 (a null Cloud Function body) is there too.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.

## 8. Rulings (2026-10-05)

Richard ruled every `needs-ruling` row of this task on the [Track F rulings page](https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH). Each card asked one plain-words
question with the options below; the full card is quoted in the bug's ledger file. **Build what is ruled.** A wording-only
ruling is still this task's work: the description changes, the node does not.

| bug | ruled | as recommended | what it means |
|---|---|---|---|
| P107-C7 | Fix it, send the credential | yes | Bearer adds the Authorization header, Basic adds the encoded user name and password, API Key adds the header or query parameter. A small change in one node. An app that worked round it with its own Authorization header could now send the credential twice, so the fix names that in its notes. |
| P107-C45 | Stay signed in, say nothing | yes | Session Lost fires only when the backend actually refuses the sign-in, on every backend. A brief outage no longer sends anyone to the login page. On NodeGX's own backend this also stops a blip signing people out. One change that also makes Session Lost fire once instead of twice. |
| P107-C47 | Blank text, empty for others | yes | Id, Email and Username become blank text, and Roles and the properties become empty. Labels clear at once. A graph that read Email after sign-out (to say goodbye, say) would get a blank. The port descriptions already promise this. |
| P107-C50 | Fire it once | yes | The node remembers it has already reported this return and ignores the repeat. Small change in one node. |
| P107-C51 | Send the real status | yes | Both nodes show 403, 500 and so on, on every backend, and Error is always a sentence. A change to the backend layer and the two nodes. An app that checks for 119 on NodeGX's backend would need to check for 403 instead. |
| P107-C52 | Keep the real name | yes | The node keeps the uploaded name and shows it. When the name is unknown (a file read back from a record), it shows the stored name whole instead of chopping it. A moderate change. Those read-back files still show a stored name, as their type and size already do. |
| P107-C53 | Fix it | yes | Each Open sets Capture as it stands and removes it when blank. A two-line change. Nobody relies on the camera sticking. |
| P107-D11 | Give it its own code | yes | A new code says the server answered but the body could not be read. The message stays the same. An app that checks for the network-error code in exactly this case would stop matching, which is unlikely. |
| P107-D12 | Every request still running | yes | Each request gets its own cancel handle, and Cancel stops all of them. This is what a person pressing Cancel expects. A modest change inside one node. |
| P107-C46 | Fire it once | yes | The second announcement is removed. Wired actions run once. Small, and it comes with the page-load check change for brief outages. |
| P107-C55 | Ignore repeated values | yes | Both nodes reconnect only when a setting really changes, as Query Records' query already does. A small guard on each setting. A graph that re-sent the same value on purpose to force a reconnect would lose that trick. |
| P107-C56 | Send them when they change | yes | Last Error clears on reconnect, Retry Count is current, and Duplicates Suppressed counts as it goes. A small change in one node. Wires get a few more updates. |
| P107-C58 | Say idle, as WebSocket does | yes | Connected becomes false and Connection State idle. The app connects to the new URL when it chooses. A small change, and the two live-connection nodes then agree. |
| P107-D23 | Refuse with a reason | yes | The node fires Failure with a sentence saying this backend has no username, following the backend layer's rule that nothing is silently dropped. An app that sets Username alongside other details would see the whole save refused until it drops Username. |
| P107-D25 | Clear it to blank text | yes | A Done sends blank text on Error, so the label empties. A tiny change, following whatever the User node ruling decides 'empty' means. |
| P107-D26 | Clear them | yes | A public link sends empty values on Expires At and TTL. A tiny change, following whatever the User node ruling decides 'empty' means. Few apps meet it: only a node whose file moves between public and private. |
| P107-D27 | Blank means no filter | yes | A blank setting sends no filter to the browser. A one-line change, shipped with the Capture fix. Nothing visible changes in browsers that already ignore the bad value. |
| P107-D28 | Always text | yes | Error is the object's message when it has one, or the object written out as text. A small change. A graph that read fields off the Error object would lose them. |

## 9. Session 24 (2026-10-06) — all eighteen

**AC1, re-measured:** none of the 18 was a known row in the runtime's conformance table (`KNOWN_ROWS` holds only the
controls' rows), so §5's "a row that stops firing turns the test red" could not re-measure any of them. Each was recorded
in its spec instead (a scenario stating the runtime's reading, or a "ROWS" docblock) — or, for C51, in no scenario at all.
Each row was re-measured by its control: HEAD's runtime file red on exactly the scenarios the fix changes.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C7 | `684d881f2` | `authInputs` strips the `auth-` prefix for the presets; the Authentication port says Bearer/Basic set Authorization; HTTP Request v3 | 4 scenarios (1 flipped, 3 new); control red on all 4 |
| D11 | `962edf855` | a JSON body that will not parse is `http/bad-body` (the error marked, never wrapped — a cross-realm SyntaxError gained a prefix when wrapped); HTTP v4; enrichment lists the codes | 2 scenarios; control red on both |
| D12 | `ef0632424` | one abort controller per request, Cancel aborts every one; HTTP v5; one equivalent declared (a cancelled request's landing) | 4 scenarios; control red on the 3 that change |
| C45 + C46 | `aead4edb8` | the page-load check's failure is the adapter's alone; the bridge lets go of `current` on `sessionLost`; User v3; world: `serviceCheckFailed` removed | spec + `noodl-viewer-react/tests/isl-030-the-page-load-check.test.ts` (Parse wire); controls red |
| C47 | `df793e7eb` | nobody signed in: Id / Email / Username `''`, Roles and properties `null` (DEF-005's row moved from `undefined` to `null`); User v4; graph s10 re-recorded | control red on 7 scenarios |
| C50 | `69efd9820` | Sign In With reports a return once (`returnReported`); Sign In With v3 | control red on the 3 with a provider error |
| C51 | `091e86d1c` | the REST and Parse-wire file envelopes carry the HTTP status; `fileFailureOf` for both nodes; Upload File v2, Sign File URL v2 | spec + adapter unit rows; controls red |
| C53 + D27 | `a664d36b4` | every Open sets Capture and Accept as they stand and REMOVES a blank one; world file input gains `removeAttribute`; Open File Picker v2 | control red on 15 of 16 |
| D25 | `f34e59460` | Request Magic Link's Done sends blank Error; its D25 equivalent mutant removed (now killed); RML v2 | control red on every Done scenario |
| D26 | `8d15b190c` | a link with no expiry sends `''` / `null`; Sign File URL v3 | control red on both |
| C55 | `bbd4d5539` | Subscribe To Changes' five settings and Query Records' realtime three reconnect only on a change (`valueDidChange`); STC v2, Query Records v5 | three Query Records scenarios reworked to make a real change; control red on the C55 ones |
| C56 | `af96a5310` | SSE sends Last Error at an open, Retry Count after it moves (`onRetry`), Duplicates Suppressed as it counts (`onDuplicate`); SSE v2 | control red on 10 |
| C58 | `5afc27a75` | a URL change that does not reopen says idle; SSE v3 | control red on the 3 |
| D28 | `68e0cd9a7` | Cloud Function's Error always text (`errorText`); Cloud Function v2 | control red on both |
| D23 | `58cff6c06` | the REST adapter refuses a Username (`REST_USERNAME_UNSUPPORTED`); world pre-flight the same; Set User Properties v2 | ⚠️ the spec's control stays GREEN (the runtime target plays auth through the world); graded by `rest-auth-adapter.test.ts`, red on HEAD |
| C52 | `214020378` | the stored file keeps the name it was uploaded as (`filename`: the backend's, else the sent file's); Cloud File reads it first, a target-addressed file's name whole, else the Parse prefix rule; Upload File v3, Cloud File v2 | control (HEAD's three files) red on the 3 Cloud File C52 scenarios and every Upload File scenario ending in a stored file |

**What the plan did not know.**
- **Not one row was a known row.** §5 assumed the conformance table would re-measure them; it holds none of Track F's
  ISL-030 rows. The controls did the re-measuring.
- **The world can hide a runtime half.** D23's spec control stayed green on HEAD's adapter: the runtime target answers auth
  calls with the world's model, so the real `setUserProperties` never ran. Grade such a fix with a unit test on the real
  adapter. The same held for C51's and C45's Parse-wire halves (the world plays only REST).
- **Names went false again**, and three Query Records scenarios lost what they graded (their reconnects came from
  same-value writes): reworked to make a real change, not just renamed. One SSE scenario's name had been false before
  this task ("reconnects to the new one", Auto Connect off).
- **Old tests pinned the defects:** DEF-005's "nobody signed in reads undefined", `file-ref.test.ts`'s envelope without
  status, `signfileurl.test.ts`'s 119, two viewer stubs of the file input without `removeAttribute`.
- **C52's ruling text and its recommendation differ.** The card's short text says "show the stored name whole instead of
  chopping it"; the recommendation it accepted says "fall back to the prefix rule only on the Parse wire". Built as the
  recommendation (a target-addressed file whole; else the prefix rule, which leaves a Directus UUID whole anyway), because
  the short text read literally would break NodeGX files read back from a record, which are correct today.
- **A hung jest left a control file in place** (D23: a failing assertion skipped `dispose()`, a timer kept jest alive,
  and the chained restore never ran) while a peer's conformance chain was starting. Restored by hand; the rows now
  dispose in a `finally`. Run the restore as its own step, never chained after a jest that can hang.

**Owed by P18 (the export), not checked:** whether the exported app has any of these eighteen; filed:
`P109-S24-EXPORTBADBODY` (D11's twin, read). C7: the export already reads `auth-authToken`. D12: the export defers a
wired Cancel. C47: the export reads the session through React state (probably clears; not run).

**Filed this session:** `P109-S24-SIGNINWITHERRORKEPT` (needs a ruling; probably unreachable).
