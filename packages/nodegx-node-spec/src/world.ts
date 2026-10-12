/**
 * The world (NSP-007) — clock, randomness and network as SCRIPTED fakes, owned by the runner and
 * handed to every target for one play. A node that waits, rolls dice or talks to a server is
 * specced as a conversation with this world, so its behaviour is as checkable as Counter's.
 *
 * One `World` per play, built from a `WorldScript` (JSON on a scenario or a generated sequence):
 * the seed of its random source and the network's scripted answers. Two targets playing one
 * scenario get two worlds built from the same script and behave identically by construction —
 * the same numbers, the same answers at the same moments.
 *
 * THE THREE RULES EVERY TARGET SHARES (a target reads these, the spec interpreter implements them
 * in interpreter.ts, the runtime target installs them into the runtime's own seams):
 *
 *   CLOCK.  Time starts at 0 and moves ONLY on an `advance` step — never on its own. `advance(ms)`
 *           first lets any answer already delivered land (a target with an event loop flushes
 *           its microtasks), then moves the clock, firing every timer due on the way in order of
 *           (due time, order scheduled) — and what each timer delivers lands BEFORE the next one
 *           fires, as on an event loop (a target with one yields between timers, `nextDue`; T6). A settle is a frame AT the current time; it does not move
 *           the clock. Every world timer is a JavaScript timer and keeps Node's rule for the
 *           delay: `Number(ms)`, and anything that is not a number from 1 to 2^31-1 is 1 — so a
 *           timer never fires in less than 1 ms, `setTimeout(fn, 0)` fires at +1, `NaN` is 1.
 *   RANDOM. One seeded source (mulberry32, the runner's own) behind `random()`, `bytes(n)` and
 *           `uuid()`; a target's `Math.random`, `crypto.getRandomValues` and `crypto.randomUUID`
 *           are the same three, so every draw a node makes comes out of one stream in the order
 *           the node makes them. A node that draws at mount consumes the first value at mount.
 *   NETWORK. The world is the server. A request is whatever string the node hands it as a URL —
 *           the world parses nothing and refuses nothing on shape (a browser's `fetch` resolves a
 *           relative URL; Node's throws; the world is neither). The first script rule whose
 *           `match` fits answers it: a status with headers and a body, a network error, or
 *           never. `after` > 0 delays the answer on the clock; absent or 0 answers at once (the
 *           same settle sees it). A request no rule answers is a VIOLATION: it is answered with
 *           a network error so the play can go on, and the runner fails the run (AC5). Aborting a
 *           request (a node's `Cancel`, its own timeout) delivers `{ aborted }` at once and drops
 *           any answer still due.
 *           TWO FACES, one server (s32). `fetch` and `XMLHttpRequest` both issue into the same rules and
 *           record the same request. The XHR face (`WorldXMLHttpRequest`, what Cloud Function talks
 *           through): `open(method, url)` holds the two and fires `readystatechange` at state 1, as a
 *           browser does, synchronously; `setRequestHeader(name, value)` holds `String(value)` — a
 *           second value for one name is APPENDED after `, ` (XHR's rule, unlike `Headers.set`);
 *           `send(body)` issues — `body` absent for `null` / `undefined`, otherwise as handed (a string
 *           travels as itself). Its answer lands a MICROTASK after its moment, where a `fetch`'s
 *           resolution lands (a browser fires XHR events as tasks; no node in a play can tell the two
 *           apart — a settle drains both): a response sets `status`, `statusText`, `response` /
 *           `responseText` (the body text, `''` for none) and walks `readyState` 2, 3, 4, firing
 *           `readystatechange` at each; a network error is state 4 with `status` 0 and `response` `''`
 *           (then `onerror`); an abort is state 4, `status` 0 (then `onabort`). A handler that THROWS is
 *           the DOM's "report the exception": the throw goes no further and the next handler still runs
 *           (a throw out of a node's `readystatechange` — row C54 — never reaches the play as a rejection).
 *           A STREAMED BODY (s34). A response may carry `chunks` instead of a `body`: the head lands as any answer does (at
 *           `after`), its body STREAMING — what it says arrives after, each piece `at` ms after the head landed (CLOCK's rule:
 *           never before 1, absent 1): `{ text }` a piece of the body (UTF-8 bytes on the wire, the text a reader decodes), `{ end }`
 *           the body finished, `{ error }` it failed while being read (a `TypeError` carrying the message — a dropped
 *           connection). With no end or error it never finishes. On the `fetch` face the body is a `ReadableStream` the world
 *           feeds; a read resolves as a promise does (a microtask after its moment). ABORTING the request while its body is still
 *           read drops the rest and FAILS the body with an `AbortError` at once; a reader that CANCELS the body drops the rest
 *           silently. A spec hears the head at `response` (`stream: true`, `body` null) and the rest at `stream`. A null-body
 *           status (204, 205, 304) has no body whatever was scripted. Only a `fetch` reads a streamed body: an XHR waits for the
 *           whole one, so a chunked answer to an XHR is a script error.
 *
 * WHAT GOES ON THE WIRE, in both directions, is fixed here once so the trace's `request` event
 * and the spec's response event mean the same thing on every target:
 *   - a request is `{ method, url, headers, body? }`: `method` as handed (a fetch's default is
 *     `GET`), `headers` with LOWER-CASED names (what `Headers` does; a later duplicate wins),
 *     `body` a string as handed, `{ "$form": [[name, value], …] }` for a FormData, absent for none;
 *   - an answer is `{ status, statusText, headers, body }` with `statusText` as scripted or `''`,
 *     `body` the TEXT that travels (`null` for no body), and `headers` lower-cased and completed
 *     the way a constructed `Response` completes them: a string body gets
 *     `content-type: text/plain;charset=UTF-8` and a JSON body (any scripted body that is not a
 *     string) gets `content-type: application/json`, unless the script named one.
 *
 *   REGISTRY. (NSP-012, registry.ts) The shared records and arrays the data nodes read and
 *           write — one registry per play, seeded from the script and nothing else; anonymous
 *           entries draw their ids from the random stream above. The rule in full is the header
 *           of registry.ts; a target that has its own tables (the runtime's process-wide
 *           `Model` / `Collection`) empties them for the play and seeds them from the same script.
 *           (NSP-016 s62) The script's `writes` are the app writing the registry ELSEWHERE — an array's
 *           members (`set` the diff to the records named, `add` one — at `index` when given — `remove`
 *           one) or one key of a record — each at its `at` ≥ 1 ms on the clock, in script order, world
 *           timers scheduled before any node's. A target performs each on the tables its nodes hold,
 *           through the verbs a node would call (`performRegistryWrite`), so every node watching the entry
 *           hears it as it would hear another node's write: inside the `advance` that reaches it, no node
 *           the writer. Not a trace event — the world's hand-off, as a timer's firing is not.
 *   TIME ZONE. (NSP-013) The play runs in ONE IANA zone, the script's `timeZone`, `UTC` when the
 *           script names none — never the machine's. Everything a node reads of a calendar in
 *           "the host's local zone" (`getHours`, `setMonth`, `new Date(y, m, d)`, an `Intl` call
 *           with no `timeZone` option) reads it in that zone, DST rules included, and a node that
 *           names a zone of its own (Date To String's Timezone port) still reads that one. A
 *           target that cannot set its zone for a play (a browser) refuses a `timezone` need; on
 *           Node the zone is `process.env.TZ`, which V8 re-reads on every change
 *           (`installTimeZone`). Two plays of one script in two zones are two scenarios: the
 *           date nodes are graded in at least two, one crossing a DST change (NSP-013 AC5).
 *   DIGEST. (NSP-013) A SHA-2 digest a node asks the host for (`crypto.subtle.digest`) is
 *           answered by the WORLD, computed synchronously (`digestBytes`) and handed back as an
 *           already-resolved promise — so the answer lands in the microtask after the call, in
 *           the same frame, where a target's `settle` flushes it; on the host it lands on a
 *           thread-pool completion the clock cannot see and a frame boundary may or may not
 *           carry. The bytes are the standard's (FIPS 180-4), so a digest is byte-for-byte the
 *           host's; an algorithm the world does not know (`SHA-1`, `MD5`, a typo) is refused with
 *           the message `digestBytes` throws, as WebCrypto refuses it with `NotSupportedError`.
 *           NSP-022 s96: the KEYED SIGN too — `importKey('raw', key, { name: 'HMAC', hash }, …)`
 *           then `sign('HMAC', key, data)` (HMAC, JWT Sign, JWT Verify — cloud-only nodes,
 *           crypto/encoding.ts `hmacBytes`) is the world's: each an already-resolved promise, the
 *           bytes RFC 2104's over the same SHA-2 (`hmacBytes`); a hash the world does not know is
 *           refused with `digestBytes`'s message, and an empty key with WebCrypto's own
 *           (`Zero-length key is not supported`, DataError). Any other `importKey` or `sign` (an
 *           algorithm that is not HMAC, a format that is not raw) is refused, never the host's.
 *
 *   HOST. (NSP-022 s96) What the backend process gives a cloud function's nodes through a process global it installs
 *           (nodegx-backend `service.ts`), one per SERVICE: `secrets` (`_noodl_get_secret(name)` — SYNCHRONOUS, it
 *           returns the answer), `users` (`_noodl_system_users(request)`), `roles` (`_noodl_system_roles(request)`) and
 *           `mail` (`_noodl_send_email(request)`) — each of the last three a function whose answer the node takes with
 *           `Promise.resolve(…)`. The world plays them as BACKEND plays a backend:
 *             INSTALLED OR NOT — the script's `services`, the ones this process has. A service it does not list has no
 *               global at all: the node is running outside a backend, says so and makes no call. Absent: none.
 *             A CALL — recorded AS HANDED, a `host` trace event in the request group, in the frame it is made:
 *               `{ service, request }`, `request` canonical (for `secrets` the name the node passed).
 *             THE ANSWER — the first of the script's `answers` whose `match` fits (`service` equal; `request` equal for a
 *               request that is not an object, else each key `match.request` names equal, canonically): `{ ok }` — the
 *               call returns (secrets) or resolves with `ok`; `{ throws }` — it throws (secrets) or rejects with an Error
 *               carrying that message; `{ never }` — it never settles (not for secrets: a synchronous call always
 *               answers). `after` > 0 delays a resolve or reject on the clock (not for secrets); `times` as BACKEND's. A
 *               call no rule answers is a VIOLATION: it throws or rejects with the world's sentence, so the play goes
 *               on, and the runner fails the run. A resolve lands as a promise resolution does (a microtask after its
 *               moment).
 *
 *   VIEWPORT. (NSP-013 s13) A play either HAS a browser viewport — the script's `viewport`,
 *           `{ width, height }` in CSS pixels — or it has NONE, which is a server render: no
 *           `window` at all (a node's `typeof window === 'undefined'` branch). With one, the size
 *           is read the way a page reads it (`window.innerWidth` / `innerHeight`) and changes ONLY
 *           at the script's `resizes`, each `{ at, width, height }` a world TIMER on the clock
 *           (Node's rule above: `at` ms after the play starts, never before 1): the size moves,
 *           then every `resize` listener runs, in the order it subscribed — synchronously, inside
 *           the `advance` that reaches it, as a DOM event's listeners run at its dispatch. A target
 *           with a real window (a browser, jsdom) refuses a `viewport` need it cannot size; on Node
 *           the world defines the `window` for the play (`installWorld`) and removes it after.
 *   LOCATION. (NSP-015 s16, s17) A play with a window has a LOCATION, the seam the navigation
 *           family writes through. The family reaches the browser through exactly three calls, and
 *           the world RECORDS each as handed and loads, renders and parses nothing on the way in —
 *           as the network parses nothing — each a trace event in the frame it is made, the three
 *           kinds in ONE group in the order made (trace.ts):
 *             `window.open(url, target, features)` — an `open` event `{ url, target, features }`,
 *               each canonical, a `target` or `features` not handed absent. It returns `null` when
 *               the features name `noopener` or `noreferrer` (a browser hands no handle then), or
 *               when the popup blocker refuses it: the activation is `false` and the target is not
 *               the page itself (`_self`, `_parent`, `_top`). Otherwise it returns a stand-in for the
 *               new window, `{ closed: false }` — the world has no second window to load.
 *             `history.pushState(state, title, url)` — a `history` event `{ op: 'push', url }`,
 *               `url` canonical as handed. The location's href becomes `url` resolved against the
 *               current href (`new URL(String(url), href)`). A url that does not resolve, or that
 *               resolves to another ORIGIN, is refused as a browser refuses it: the call is
 *               recorded, the href does not move, and the call THROWS a `SecurityError`
 *               (`DOMException`). A push fires neither `popstate` nor `hashchange` — a hash change
 *               is not a navigation; a node that wants its router to hear one dispatches it.
 *             `window.dispatchEvent(event)` (the global `dispatchEvent` in a page) — a `dispatch`
 *               event `{ event: <its type> }`; the play's listeners for that type
 *               (`addEventListener('popstate' | 'hashchange', fn)`) run at once, in the order they
 *               subscribed, as a DOM dispatch runs them. `PopStateEvent` is the play's too.
 *           The href STARTS at the script's `location` (absent: `https://app.example/`); a page
 *           reads it as `location.href` / `pathname` / `search` / `hash`, live.
 *           (NSP-016 s57) THE PERSON'S BROWSER moves it too: Back or Forward (`traverse`, an act) takes
 *           the href to a url resolved against it on the same origin, records nothing (the node made
 *           no call), and runs the `popstate` listeners — then the `hashchange` ones when the hash
 *           moved — in the order they subscribed. A visual node's page is the browser's: its window's
 *           `history.pushState`, `open`, `dispatchEvent` and `popstate` / `hashchange` listeners ARE
 *           this location's (a target with a page puts them there).
 *           (NSP-016 s70) THE SESSION HISTORY. The location keeps the page's history entries and which
 *           one is current: the start href is the first, and the play knows of none before it. A push
 *           drops the entries after the current one and adds its own. Two more calls, each recorded as
 *           a `history` event in the LOCATION group:
 *             `history.replaceState(state, title, url)` — op `replace`, `url` canonical as handed. The
 *               current entry becomes `url` resolved, refused as a push is (a `SecurityError`); no
 *               `popstate`, no `hashchange`.
 *             `history.back()` — op `back`. The browser does not move at the call: the traversal is a
 *               TASK, and it lands at the next yield to the event loop — a settle's, after the frame-end
 *               work and the promises that yield resolves, or an advance's, before the clock moves and
 *               after each timer (CLOCK). Landing, it makes the entry before the current one current,
 *               moves the href there and runs the `popstate` listeners, then the `hashchange` ones when
 *               the hash moved, as the person's Back does. Several calls land one by one, in order, each
 *               after the promises the one before resolved. On the first entry it lands as nothing: an
 *               earlier entry would be another document, which the world does not load.
 *           The person's Back or Forward (`traverse`) goes to the nearest entry holding its url, before
 *           the current one first; a url no entry holds is an entry the play never saw, and the history
 *           becomes that one entry.
 *           USER ACTIVATION — whether the press came from a person — is a fact of the play, the
 *           script's `activation`: `true` / `false` is `navigator.userActivation.isActive` for
 *           the whole play; absent, the browser has no `userActivation` (Safari before 16.4,
 *           Firefox before 120) and its popup blocker lets the open through. Without a window
 *           there is no location and no activation.
 *   PROJECT. (NSP-015 s17) The project's settings, as a node reads them
 *           (`NoodlRuntime.instance.getProjectSettings()`) — the script's `projectSettings`, an
 *           object of setting name → value; absent, `{}`: a project that set nothing, where every
 *           reader takes its own default (Navigate To Path: `navigationPathType` unset is `hash`).
 *           Fixed for the play.
 *           (NSP-014 s32) And its CLOUD SERVICES — the project's `cloudservices` metadata, as a node reads
 *           it (`NoodlRuntime.instance.getMetaData('cloudservices')`, cloudfunction2.ts :61, :252): the
 *           script's `cloudServices`, `{ appId, endpoint, deployVersion? }` as handed; absent, none (a
 *           project with no cloud services). Beside it, `sessionToken` — the session the BROWSER holds
 *           for that app id (`Parse/<appId>/currentUser`, read through SessionStore.ts
 *           `parseSessionStore(appId).read()`): its token; absent, nobody is signed in there. A fact of
 *           the play's storage, not of the metadata — the target writes it where the store reads it and
 *           never hands it to the metadata. Fixed for the play.
 *   STACK.  (NSP-015 s18) The Component Stacks a play's navigation nodes hand their requests to —
 *           played by the world as the network plays a server: what a stack DOES with a request
 *           (which page, how deep, the transition) is the Component Stack's own behaviour (a visual
 *           node, NSP-016); what the NODE hands it and what it is told back is the node's. Two
 *           protocols, each call recorded AS HANDED, a `stack` trace event in the LOCATION group
 *           (trace.ts), in the order made:
 *             a push or a replace (`NavigationHandler.instance.navigate(name, args)` /
 *               `.replace(name, args)`, Push Component To Stack) — `{ op: 'push' | 'replace', stack,
 *               target, params, transition }`, each canonical, `stack` / `target` absent when not
 *               handed. The HANDLER's rules are the world's: a blank name (`name || 'Main'`) is
 *               `Main`; a name with no registered stack (the script's `names`, absent: none) is
 *               QUEUED and, since no stack registers during a play, never answered; every stack
 *               registered under the name answers (the node settles once). A stack answers by the
 *               script's `answers`, the first rule whose `match` fits (`op`, `target` canonically
 *               equal), `done` when none does: `unchanged` or a `failure` (`code`, `message`) is
 *               told inside the call, as a stack's checks run before it builds anything; `done` is
 *               told a microtask later, once it has built the page — both land in the settle whose
 *               frame made the call.
 *             a pop (the back callback a stack installs on every Pop Component Stack in a page it
 *               pushed) — `{ op: 'back', action, results }`, `action` absent when none. Whether the
 *               node SITS in a pushed page is the script's: `back` absent, it does not (no callback,
 *               nothing is called); present, the n-th pop of the play is answered with the n-th
 *               entry (the last repeating) — `done` (`{ ok: true }`), `unchanged` (the stack is at its
 *               first page) or a `failure` (still animating) — returned from the call.
 *           The pushing node's back channel (the stack calling a pushed request's `backCallback`
 *           when its page is popped) is not scripted: on the runtime it reaches nothing (row C26).
 *   ROUTE.  (NSP-015 s19) The Routers a play's Navigate nodes hand their requests to, and the Router
 *           whose page a Page Inputs sits in — played by the world as STACK plays the Component
 *           Stacks: which page a Router builds, its URL, its transition, are the Router's own spec (a
 *           visual node, NSP-016); what the NODE hands it and what it is told back is the node's.
 *             a navigate (`RouterHandler.instance.navigate(name, args)`, Navigate) — a `route` trace
 *               event in the LOCATION group, `{ router, target, params, openInNewTab }`, each canonical
 *               AT THE CALL, `router` / `target` absent when not handed. The HANDLER's rules are the
 *               world's (router-handler.ts :51-67): it hands the request on ONE MILLISECOND LATER, a
 *               world timer (`setTimeout(…, 1)`), and only then picks the routers: when the script
 *               registers routers under exactly ONE name, that name, whatever the node handed;
 *               otherwise the name AS HANDED, as a property key, a blank one as `Main` (`name || 'Main'`,
 *               as a router registers, :70 — row C118, fixed in P109 ISL-048; before it `navigate` looked up
 *               `String(name)`). A name with no router is QUEUED and, since no router registers during
 *               a play, never answered. Every router under the name answers; the node settles once. A
 *               router answers by the script's `answers`, the first rule whose `match` fits (`target`
 *               equal canonically; `noTarget: true` — Target never set; `openInNewTab`), `done` when none
 *               does — told inside that +1 ms timer (a `done` a microtask later, once the page is
 *               built), so the answer lands in the `advance` that reaches it.
 *             the params a Router hands the page it built (`_setPageParams`, router.tsx :604, :926)
 *               — the script's `page`, in order: an entry with no `at` (or 0) when the page is built,
 *               i.e. at the node's mount, before its first frame; an entry `at` > 0 at that time on the
 *               clock (a Router reset onto the same page with other params, router.tsx :528-531). Absent:
 *               the node sits in no Router's page (a Component Stack hands a page its params as the
 *               page component's own inputs, navigation-stack.tsx :974-977, never to a Page Inputs).
 *               Not a trace event — the world's hand-off, as a timer's firing is not.
 *   POPUP.  (NSP-015 s20) The popups Show Popup opens and Close Popup closes. Unlike STACK and ROUTE the
 *           thing the node calls is not a visual node but RUNTIME code — `NodeContext.showPopup` (nodecontext.ts
 *           :1212-1330) owns the popup stack and its policy — so the policy is part of what is graded, and the
 *           world plays only what lies outside the runtime: the app's popup HOST (the viewer's
 *           `setPopupCallbacks`), the PROJECT's components (what a Target can build), and the PERSON (a close
 *           through the popup's own Close Popup, an Escape). Each call recorded AS HANDED, a `popup` trace
 *           event in the LOCATION group (trace.ts), in the order made:
 *             a show (`context.showPopup(target, params, args)`, Show Popup) — `{ op: 'show', target, params,
 *               stackPolicy, closeOnEscape, modal, accessibleName }`, each canonical AT THE CALL, `accessibleName`
 *               absent when not handed. What the call does (nodecontext.ts :1212-1330, read and measured s20):
 *               with no host (`host: false`) it returns at once and opens nothing — the promise resolves.
 *               Otherwise, SYNCHRONOUSLY: with `stackPolicy` `replace` (anything but `stack`) every popup on the
 *               stack is dismissed, in stack order, each told `Dismissed` (its `onDismissPopup`) — a popup whose
 *               build FAILED included (below); then the new popup takes a slot on top. Then the component is
 *               built (`nodeScope.createNode(target)` on the root scope): a name the project has (`components`)
 *               opens — the promise resolves; any other is refused with the runtime's message — `Component
 *               instance must have a name` for a falsy Target, `Can't find component model for <target>`
 *               otherwise — and the promise REJECTS, and its slot is never given back: it stays on the stack,
 *               not cancellable, `modal` / `closeOnEscape` as handed. Both land in the settle whose frame showed.
 *               (A Target that names a NODE TYPE builds that node as a popup — `createNode` asks the register
 *               first; no scenario uses one.)
 *             a close (the close handler a Close Popup resolved, closepopup.ts :206-247, called with `(action,
 *               results)`) — `{ op: 'close', popup, action, results }`, `popup` the name of the popup the handler
 *               belongs to (absent when unnamed), `action` absent when none, `results` canonical at the call.
 *           WHAT THE PERSON DOES — the script's `events`, each a world timer at `at`: `close` — a Close Popup
 *           inside the `popup`-th popup the play OPENED (0-based, counting every show that built its component;
 *           absent: the last one opened) calls its close handler with `action` and `results`; `escape` — the
 *           person presses Escape (the host's key listener calls `context.cancelTopPopup()`, :1183-1195: the
 *           TOP popup whose `modal` is on, and only it — nothing when it has `closeOnEscape` off or its build
 *           failed). A close or an Escape takes the popup off the screen at the START OF THE NEXT FRAME (`leave`
 *           → `scheduleNextFrame`, :1284-1300): only then does it leave the stack and is its opener told —
 *           `Closed` / the action (with its results) or `Cancelled`; until then it is still on the stack, and a
 *           second close or Escape aimed at it does nothing more (the first wins). A close of a popup no longer
 *           open does nothing.
 *           WHERE A CLOSE POPUP SITS — the script's `inside`: the popups (component instances that published a
 *           close handler) on the node's component walk, nearest first, by component name; absent, none. The
 *           handler the world hands each only records the call. The callback `showPopup` also hands the Close
 *           Popups at a popup's top level (`_setCloseCallback`) is not scripted: it is the nearest popup's own
 *           handler, which the walk finds anyway. A popup opened from INSIDE a popup is built in the ROOT scope
 *           (:1215, :1247), so the popup that opened it is never on its walk — `popupParent` is written (:1258)
 *           and read by nothing.
 *
 *   BACKEND. (NSP-014 s21; R9, ruled 2026-10-02: "the request, not the wire") The app's backends, as the record
 *           nodes ask them. A record node hands a backend an OPERATION in the backend contract's own words
 *           (`@noodl/backend-contract` `IDataAdapter`: `delete({ collection, objectId })`, `query({ collection, where,
 *           sort, limit, … })`, …) and an adapter turns it into ONE backend's HTTP (NodeGX's own server over its legacy
 *           `/classes/<Name>` wire; Directus, PocketBase, Supabase, PostgREST over REST). R9 put the seam at the
 *           operation, so one spec holds for every backend; the HTTP is the adapter's, graded by the contract's own
 *           conformance suite (`nodegx-backend-contract/conformance/`), never here. The world plays the backends as
 *           NETWORK plays a server:
 *             WHICH BACKEND — the script's `backends`, ids in the project's order, the FIRST the active one (absent:
 *               `['main']`; never none). A node's Backend input resolves as the runtime resolves it
 *               (resolveBackend.pure.ts `resolveBackendTarget`, :232-249): falsy or `_active_` is the active one; an
 *               id the project has (`===`) is that one; anything else is NO backend — `backendFor` answers `undefined`,
 *               and the node says so and makes no call. Every backend in a play takes the NEUTRAL filter (R9) — the
 *               project with no backend configured at all (the legacy store, `CloudStore.forScope`) is not a world
 *               this seam plays.
 *             A CALL — recorded AS HANDED, a `backend` trace event in the frame it is made, in the request group
 *               (after the outcomes): `{ op, backend, args }`, `backend` the id it went to, `args` the options the node
 *               handed with its callbacks left out, canonical at the call.
 *             THE ANSWER — the first of the script's `answers` whose `match` fits (`op`, `collection` — `args.collection`
 *               — and `backend`, each equal; absent fits all): `{ ok }` — it succeeded, `ok` what the success callback
 *               is handed (a record, rows; nothing for a delete); `{ error }` — it failed with that message (`null`: the
 *               adapter gave none), and `detail` the backend's error body when it gave one (the contract's `save` hands
 *               `error(message, detail)` — `detail.reason === 'precondition-failed'` is a refused Only If Unchanged, s22);
 *               `{ never }` — no answer comes. (s28) `times`: the rule answers the first `times` calls it fits, then fits
 *               none — a refusal, then a retry the next rule answers. `after` > 0 delays it on the clock; absent or 0, it
 *               lands at once — the settle whose frame made the call sees it, as a network answer lands. A call no
 *               rule answers is a VIOLATION: answered `{ error }` so the play goes on, and the runner fails the run.
 *               An answer lands as a promise resolution does (a microtask after its moment).
 *             USER (s22) — the script's `user`: the id of the user signed in on the LEGACY store (the `cloudservices`
 *               app id's session, `Parse/<appId>/currentUser`); absent, nobody — a target plays it where that store reads
 *               it. P109 ISL-029 (row D24, ruled "Ask the record's own backend"): the Record family's access rules no
 *               longer read it. They ask the RECORD's backend (`_getCurrentUser`, dbmodelcrudbase.ts →
 *               `CloudStore.forBackend(scope, backendId).currentUserId()`), and on a backend this world plays that is the
 *               objectId of the session it holds (AUTH's `sessions`, RestDataAdapter `currentUserId`): `userOn(backend)`.
 *               Before, a Log In on the record's backend was nobody to the rules and the legacy user was everybody's.
 *           After a write succeeds the adapter tells the store's listeners (the contract's event surface — `delete`
 *           `{ objectId, collection }`, …), AFTER the success callback (RestDataAdapter.ts :1216-1219): what a Query
 *           Records watching the store hears. A graph's writers cause it (s24: graph s08).
 *             WRITES MADE ELSEWHERE (s24) — the script's `events`: what the store's listeners hear when ANOTHER node in
 *               the app wrote, without that node in the play. Each `{ at, backend, type, collection, objectId, data }`
 *               is a world TIMER at `at` (CLOCK's rule: never before 1), `backend` absent the active one. When it fires,
 *               the writer's half first, as the writer's success does it (cloudstore.js `_fromJSON` :407-422): for a
 *               `create` or a `save` the registry record `objectId` takes the class `collection` and then each key of
 *               `data` (`objectId` and `ACL` skipped), one write each, in the key order, its watchers notified; a
 *               `delete` writes nothing. Then the adapter's half: every store listener hears the contract's event
 *               (`storeEventOf`) — `create` / `save` `{ type, objectId, object: { objectId, …data }, collection }`,
 *               `delete` `{ type, objectId, collection }` — with the backend it came from, synchronously, inside the
 *               `advance` that reaches it, in the order they listened. A listener that is not bound to that backend's
 *               store is the node's business: the world tells every listener, the node keeps the backend it watches.
 *
 *           FILES (s30) — two more operations a node hands its backend, the contract's own (`IDataAdapter` `uploadFile`,
 *           `signFileUrl`), recorded and answered by the same rules, with two differences the contract makes:
 *             THE FAILURE IS AN ENVELOPE — a file operation's `error` callback takes ONE object, the contract's `FileError`
 *               `{ error?, code?, status? }` (data.ts :51-61; RestDataAdapter.ts :1698-1711 "the three file methods take
 *               `error({error, status})`"), never `(message, detail)`. A failed answer hands `fileError(d)`: the rule's
 *               `detail` fields (a `status`, a `code` — what the Parse wire's error body carries) with `error` the message
 *               over them, and NO `error` key when the rule gave none (`error: null` — an error body without one). The REST
 *               adapter hands `{ error: message }` alone: its `fail` has the message and not the status (RestDataAdapter.ts
 *               :1814, :1868, :1938, :2013 …), so a script that plays a REST backend scripts no `detail`.
 *             THE REFUSAL BEFORE THE WIRE — an `uploadFile` whose `file` is not a file (no `arrayBuffer` function: a string, a
 *               plain object, a number): `Upload File was given something that is not a file. Wire the File output of an Open
 *               File Picker node into it.` — refused at once, inside the call (RestDataAdapter.ts :1738-1749; `NOT_A_FILE`),
 *               recorded, never a violation, no rule read.
 *           An upload's success hands the rule's `ok` (a `FileRef`: `{ name, url, contentType?, size?, target? }`); a sign's,
 *           a `SignedFileUrl` (`{ url, kind, expiresAt?, ttlSeconds? }`). Neither tells the store's listeners anything (no
 *           adapter event follows a file operation). Upload PROGRESS is not played: the REST adapter never calls
 *           `onUploadProgress` (RestDataAdapter.ts :1725-1732 — `fetch` has no upload progress); only the Parse wire's XHR does.
 *
 *           REALTIME (s33; R9 again) — a subscription a node opens on its backend (`createRealtimeSubscription(handle,
 *           { collection, where, primaryKey, onEvent, onStatus, onError })`, api/backends/realtime/index.ts :114-121). The
 *           OPERATION is the seam, not the five wires under it (NodeGX and PocketBase SSE, Directus's socket, Parse's probe):
 *           which transport, its reconnect backoff and its connect deadline are the backend layer's (`RealtimeSubscription`,
 *           graded by its own tests), and what reaches the node is what the handle TELLS it.
 *             A SUBSCRIBE — recorded as handed, a `backend` event `{ op: 'subscribe', backend, args }` (`args` the options
 *               with the three callbacks left out), answered by the first rule that fits it (`op` `subscribe`): `{ stream }`
 *               — what the subscription tells, in order, each entry `at` ms after the call (CLOCK's rule: never before 1 — a
 *               connection answers nothing inside the call that opened it; absent: 1); `{ never: true }` — it tells nothing
 *               (stays `connecting`). A subscribe no rule answers is a VIOLATION and tells nothing. Any other answer to a
 *               subscribe is a script error.
 *             THE HANDLE — the node reads its `status` (`connecting` from the call on; it moves with what is told) and may
 *               `dispose()` it. The handle's rules (RealtimeSubscription.ts) are the world's: a STATUS equal to the one held is
 *               not told (`_setStatus`); a CHANGE is told as the contract's `RealtimeChange` — `{ type, collection: <the
 *               subscription's>, ids, records, recordsComplete }`, `ids` / `records` `[]` and `recordsComplete` `true` when the
 *               entry gives none; an ERROR is told as `{ message, code, kind }`, `kind` the contract's classification
 *               (`REALTIME_FAILURE_KINDS`) when the entry gives none, and a `fatal` one then STOPS the subscription — `stopped`
 *               told after it (`fail`). A stopped subscription has closed its transport: nothing more is told. A handler that
 *               THROWS is the handle's to swallow (`_notify` logs and goes on).
 *             AN UNSUBSCRIBE — `dispose()`: recorded as a `backend` event `{ op: 'unsubscribe', backend, args }`, the args of
 *               the subscribe it ends; its status becomes `stopped` and is NOT told (`dispose` sets `_status` directly); nothing
 *               more is told. A second dispose does nothing and records nothing.
 *           Not played: `realtimeSupportFor` — every backend a play has is a REST one that speaks realtime, so no node is told
 *           `CAPABILITY_UNAVAILABLE` by the support table; the schema's primary key (no play's backend has a class schema — the
 *           key a node asks for is the wire's convention, `id`).
 *
 *   AUTH.   (NSP-014 s26; R9 again — "the request, not the wire") Who is signed in, per backend, and the auth operations a
 *           user node hands its backend: the contract's (`@noodl/backend-contract` `IAuthAdapter`) and the one beside it,
 *           `setUserProperties` (AUTH_OPS). An auth call is a BACKEND call — recorded as handed (`{ op, backend, args }`, a
 *           `backend` trace event), answered by the same rules — and every backend here is a REST one (BACKEND), so the
 *           adapter whose contract-level behaviour the world plays is the REST adapter's (RestAuthAdapter.ts):
 *             THE SESSIONS — the script's `sessions`: what each backend's session store holds at the start, the user's
 *               fields flat (`objectId` among them, tokens never); absent, nobody. `session(backend)` reads it NOW.
 *             THE REFUSAL BEFORE THE WIRE — a `fetchCurrentUser` to a backend holding no session, a `setUserProperties` to
 *               one holding none or none with an `objectId`: `Nobody is signed in.`, answered at once, inside the call
 *               (`refused`); recorded, never a violation, no rule read. (P109 ISL-030, row D23) A `setUserProperties` with a
 *               Username (not blank) to a backend that holds a session: `USERNAME_UNSUPPORTED`, refused the same way — these
 *               backends have no usernames, and the REST adapter no longer drops it and writes the rest. (s27) A `logOut` to a backend holding no session is
 *               no request either: it SUCCEEDS at once, inside the call (`inCall`) — and lands as below. (s28) A
 *               `signInWithProvider` with no provider (falsy — `!options.provider`): `Sign In With: no provider was set.`,
 *               refused inside the call (RestAuthAdapter.ts :1377-1380; ParseAuthAdapter.ts :616-619 — the same sentence).
 *             A LANDING — an answer lands as a BACKEND answer does, and then the ADAPTER's steps run in this order
 *               (`landAuth`; `AuthStep`), each after the world's sessions moved for it:
 *                 `fetchCurrentUser` ok — the session becomes the one held AT THE CALL with the answer's fields over it;
 *                   `sessionChanged`; `sessionGained`; then the caller's success (:1170-1176).
 *                 `fetchCurrentUser` failed with `lost` (the backend rejected the session: 401 / 403) — the session is
 *                   cleared with NO `sessionChanged`; `sessionLost`; then the caller's error (:1177-1186). Without `lost`
 *                   (a 5xx, the network) the session stays and only the error lands.
 *                 `setUserProperties` ok — the session becomes the one held at the call, the answer's fields over it, and
 *                   what the call wrote over those (`writtenUserFields`: every property, `email` when defined, `username`
 *                   NEVER, the server-owned fields dropped); `sessionChanged`; the caller's success (:1634-1637). Failed:
 *                   the error only (`lost` means nothing to a write).
 *                 (s27) `logIn` / `signUp` ok — the session becomes the ANSWER (whoever held it before; the answer is the
 *                   user's fields flat, as the adapter flattens a sign-in's body); `sessionChanged`; the caller's success;
 *                   `loggedIn` (:999-1020). A sign-up's success IS the adapter's own sign-in made after the account
 *                   (:1087-1142): one operation here, one landing. Failed: the error only, the session untouched.
 *                 (s27) `logOut` — WHATEVER the answer (`ok` or an error: the adapter's `finish` on both, :1064-1083): the
 *                   session cleared WITH `sessionChanged`; the caller's success; `loggedOut`. Only `never` stops it.
 *                 (s28) `requestMagicLink` — the session untouched either way: ok, the caller's success (ParseAuthAdapter.ts
 *                   :636-643 — the link is emailed; nothing signs in on THIS page); failed, the error.
 *                 (s28) `signInWithProvider` — ok is the HANDOVER ACCEPTED: the adapter sends the browser to the provider
 *                   (`window.location.href`, RestAuthAdapter.ts :1436; ParseAuthAdapter.ts :624) and nothing comes back
 *                   to the caller — the contract's one call with no success (`SignInWithProviderOptions`, auth.ts
 *                   :116-128). No step lands. Failed (the REST adapter's discovery found no such provider, or failed —
 *                   :1400-1438), the error. Where the browser went is the adapter's (its discovery request, the parked
 *                   flow, the URL it builds): R9's seam, not played — the operation as handed is the record.
 *             THE SERVICE — the app's one user service (userservice.ts), made by the first node that reaches it
 *               (`startService`; the User node at its mount, a Set User Properties at its frame end). When it is made with
 *               a session on the active backend it reads it (`current`, :143-144: the session handed to the record store,
 *               as THE BRIDGE below hands it). And it does two things a target that plays it must do too:
 *                 THE BRIDGE — at every `sessionChanged` it re-reads the ACTIVE backend's session and, when there is one,
 *                   hands it to the record store (`userRecordEvent`: tokens dropped, `_fromJSON(user, '_User')` — the
 *                   registry record of its `objectId`, every key but `objectId` / `ACL` written, its watchers notified).
 *                   The node-facing events (`loggedIn`, `loggedOut`, `sessionGained`, `sessionLost`) reach EVERY listening
 *                   node, whichever backend raised them (user.ts :136-139: "the signals are still global"), in mount order.
 *                 THE START-UP CHECK — made when the service is made, if the active backend holds a session: a
 *                   `fetchCurrentUser` with nothing in its args, the SERVICE's call (no node's — on no trace), answered by
 *                   the script's first rule for it, landing at its `after` but NEVER BEFORE 1 ms (a page's first frame is
 *                   drawn before any answer to its load). Its landing is the adapter's steps and NOTHING of the service's
 *                   (P109 ISL-030, rows C45 + C46 ruled "Stay signed in, say nothing" / "Fire it once"): a `lost` failure is
 *                   cleared and announced once, by the adapter; any other failure (a 503, the network) leaves the person
 *                   signed in and says nothing. Before, the service cleared the LEGACY session and announced `sessionLost`
 *                   on ANY failure — a 503 said Session Lost to a person still signed in, and a rejection was said twice.
 *             THE RETURN LEG (s29) — the script's `return`: this page load is a sign-in coming back to the ACTIVE backend.
 *               The service, as it is made, asks the adapter FIRST (`consumeReturn`, userservice.ts :138) and, when there is
 *               one, makes NO start-up check. A provider `error` is final at once and ANNOUNCED at 1 ms (the adapter's
 *               `setTimeout(0)`); an `exchange` is `{ inProgress: true }` at once and lands at its `after` (never before
 *               1 ms): ok — the session written, `sessionChanged`, the state succeeded, announced, `loggedIn`; failed — the
 *               state failed, announced. The state is what the service's `oauthReturn` getter hands (`authReturn`); the
 *               announcement is its `oauthReturn` event, heard only by a node that subscribed to it (spec.ts
 *               `WorldHandlers.authReturn`) — not one of the four node-facing session events.
 *           Not played: the token lifecycle (refresh timers, cross-tab storage events — RestAuthAdapter's controller), the
 *           Parse wire's adapter, the service's `current` model (read by no node specced here), where a return's address
 *           came from and how it is stripped (the parked flow, `state`, `stripQueryParams`);
 *           (s27) the capability gate (`begin` — every backend here offers password sign-in and sign-up; s28: and magic links —
 *           only the `nodegx` type does, RestAuthAdapter.ts :1562-1570 refuses every REST one in the call, so a world that plays
 *           a REST backend's refusal scripts it as an answer) and each wire's
 *           own steps inside a sign-in (Directus writes the tokens, then `/users/me` merged — two `sessionChanged`;
 *           PocketBase one; a sign-up's create-then-sign-in is two requests): the contract's operation is the seam (R9).
 *
 *   PICKER. (NSP-014 s31) The person choosing a file, through the one browser surface a node reaches for it: a file
 *           `<input>` the node makes (`document.createElement('input')`) and clicks. A play whose script has a `picker` (`{}`
 *           included) has a `document` — none otherwise, so no other node's play changes — whose `createElement('input')`
 *           hands the world's FILE INPUT (`WorldFileInput`; any other tag is refused: no node specced makes one). The
 *           element is a DOM element as far as a node reads it: `accept` and `capture` REFLECT their attributes, so what is
 *           assigned is held as a string (`String(v)` — WebIDL's DOMString: `undefined` is `"undefined"`, `null` `"null"`),
 *           `''` until assigned and after `removeAttribute(name)` (P109 ISL-030 — an absent attribute reads `''`; the world
 *           does not tell an absent attribute from one assigned `''`, which a browser does for `capture`); `files` is a list (`length`, index, `item(i)`), empty until the person picks; assigning
 *           `value = ''` empties it; `onchange` / `oncancel` are handler PROPERTIES, `null` until assigned.
 *             A CLICK (`input.click()`) — recorded as handed, a `picker` trace event in the LOCATION group, in the frame it
 *               is made: `{ accept, capture }`, what the element holds AT THE CLICK (not what the node last set: a node
 *               that skips an assignment leaves the previous one there). Then the person answers it — the n-th click of the
 *               play by the script's n-th `answers` entry (the last repeating; none: never):
 *                 `{ file: { name, type?, size? } }` — they chose that file: `files` becomes the one file (Node's `File`,
 *                   `size` zero bytes, `type` `''` when absent, `lastModified` 0 — adapter.ts `file`), then `change`;
 *                 `{ empty: true }` — `change` with an EMPTY list (a re-pick backed out of: NDA-004 §2);
 *                 `{ cancel: true }` — the dialog closed with nothing chosen: `cancel`;
 *                 `{ never: true }` — no answer comes in the play (the dialog left open; also how a browser that refuses
 *                   a click without a person's gesture behaves — Chrome logs and opens nothing);
 *                 `{ throws: message }` — the click is refused BY THROWING, inside the call (a `NotAllowedError`
 *                   `DOMException` carrying `message`; the node's comment names a sandboxed frame — not measured on a
 *                   browser here: the world plays a throw where the script says one). Recorded first: the call was made.
 *               A file, an empty list or a cancel lands at `after` on the clock (CLOCK's rule: never before 1 — a
 *               person answers no dialog inside the frame that opened it) and fires the element's handler AS IT IS THEN
 *               (`onchange` / `oncancel`, with `{ type, target: <the element> }`), as a DOM event fires whatever its
 *               handler property holds when it is dispatched: a handler the node took off, or replaced by a later click's,
 *               is what the answer meets.
 *           Not played: Electron's `path` on a chosen file (the desktop app's addition — a browser's `File` has none, so a
 *           world file has none), the dialog's own filtering by `accept` / `capture` (the browser's — the click's record
 *           is the seam), more than one file (`multiple` — no node sets it), and drag-and-drop.
 *
 *   SOCKET. (NSP-014 s34) The WebSocket servers a node talks to, through the one browser surface it reaches: the `WebSocket`
 *           constructor. EVERY play has the world's (`worldWebSocket`) — a host's own would reach a real network (Node 22 has
 *           one). A socket is a conversation that answers MANY times, so a construction is answered by a SCRIPT of what the
 *           server does, each entry on the clock, as REALTIME's stream is:
 *             A CONSTRUCTION (`new WebSocket(url, protocols)`) — recorded as handed, a `socket` trace event `{ op: 'connect',
 *               url, protocols }` in the request group (`protocols` absent when not handed), answered by the first of the
 *               script's `answers` whose `match` fits (`url` exact, or a prefix when it ends in `*`; absent fits all) and whose
 *               `times` is not spent (a refusal, then a retry the next rule answers):
 *                 `{ events }` — what the server does, in order, each entry `at` ms after the construction (CLOCK's rule: never
 *                   before 1, absent 1 — no socket opens inside the call that made it): `open`; a text `message`; a `binary`
 *                   message (its bytes); an `error`; a `close` — `code` (absent: 1006, the connection lost without a close
 *                   frame), `reason` (absent: ''), `wasClean` (absent: `code !== 1006`);
 *                 `{ never: true }` — nothing ever happens: it stays CONNECTING;
 *                 `{ throws: message }` — the constructor THROWS a `SyntaxError` `DOMException` carrying `message` (a browser
 *                   refuses a URL it cannot parse in the call). Recorded first: the call was made.
 *               A construction no rule answers is a VIOLATION: nothing happens on it, and the runner fails the run.
 *             THE SOCKET — `readyState` 0 (CONNECTING) until `open`, then 1 (OPEN); 3 (CLOSED) at a `close`; 2 (CLOSING) once
 *               the node calls `close()`, unless already CLOSED. Each event fires the handler PROPERTY it names as it is
 *               THEN (`onopen`; `onmessage` with `{ data }` — the text, or the bytes as an `ArrayBuffer` when `binaryType` is
 *               `arraybuffer`, a `Blob` otherwise; `onerror`; `onclose` with `{ code, reason, wasClean }`), synchronously,
 *               inside the `advance` that reaches it; a handler that THROWS is the DOM's to report and goes no further. After
 *               a `close` event, or once the node has called `close()`, nothing more is delivered.
 *             A SEND (`send(data)`) — recorded as handed, `{ op: 'send', data }` (canonical: text as itself, bytes as
 *               `$bytes`). While CONNECTING it THROWS an `InvalidStateError` `DOMException` (the browser's rule), recorded
 *               first. The rule's `replies` are the server answering what it is sent: a send whose text is a reply's `to`
 *               is answered by a `message` carrying its `with`, `after` ms later (never before 1, absent 1) — dropped if the
 *               socket has ended by then. Only on an OPEN socket.
 *             A CLOSE (`close(code, reason)`) — recorded as handed, `{ op: 'close', code, reason }`, each absent when not
 *               handed. What a browser fires after it (a `close` event; an `error` first, while still CONNECTING) is not
 *               played: the socket node takes its handlers off the socket before it closes it, so nothing it does could hear
 *               them.
 *           Not played: `addEventListener` (the node uses the handler properties), `bufferedAmount` (0), the subprotocol the
 *           server chose (`protocol` is ''), extensions.
 *           The OTHER stream a browser has, `EventSource`, is ABSENT from every play (`installWorld` hides a host's): a node that
 *           reaches for one finds none, as a Node host has none — not played yet.
 *   GROUP.  (NSP-016 s42) The Radio Button Group a Radio Button sits in — its PARENT on the page, played by the world as
 *           ROUTE plays the Router whose page a Page Inputs sits in: the group is another node (its own spec, Radio Button
 *           Group); what reaches the button through it is the button's. The script's `group`:
 *             `none: true` — the button sits in no group (it is drawn alone; no group reaches it). Absent `group` or
 *               `none` absent: it sits in one, with the siblings its spec's page declares (the `pick` act's values).
 *             `value` — the group's Value parameter at load, set before the first paint (absent: never set). Raw: the
 *               group converts it as its Value input does (`toString`; null and undefined ignored).
 *             `writes` — the graph writing the group's Value input later, each `at` ≥ 1 ms on the clock, in order:
 *               handed to the button's spec RAW (`WorldHandlers.group`) at that moment, inside the `advance` that
 *               reaches it; the group shows it at the frame's end, as any write is. Not a trace event — the world's
 *               hand-off, as a timer's firing is not.
 *           A target holds a REAL group: the button is added to it (`addChild`) with its siblings, the group's Value
 *           parameter set at load and its Value input written at each `at`; the page draws the group.
 *
 * A TARGET'S VIEW (s13, from the third stranger's first question). A spec's reducers read the world
 * as `WorldView` (spec.ts); a target is handed THIS module's `World` by `install(world)`. One to one:
 *   `now()` = `world.clock.now()` · `random()` / `bytes(n)` / `uuid()` = `world.random.next()` /
 *   `.bytes(n)` / `.uuid()` · a patch's `after` / `cancel` = `world.clock.schedule(ms, fn)` (returns
 *   an id) / `world.clock.cancel(id)` · a `request` / `abort` = `world.network.issue(request,
 *   deliver)` / `world.network.abort(id)` · `registry` = `world.registry` · `viewport()` =
 *   `world.viewport` (`undefined`: no window) read as `{ width, height }` · `listen('resize')` =
 *   `world.viewport.listen(fn)` (returns the unsubscribe). `dispose(h)` releases what the instance
 *   holds in the world — cancels its timers, aborts its requests, unsubscribes its listeners: a
 *   play's world is thrown away after the play, so nothing graded today depends on it, but a target
 *   that keeps a world across plays would hear a disposed node. The clock is ONE per world:
 *   `advance(h, ms)` moves it for every instance and records the `advance` event on `h`'s trace
 *   only (a graph's trace is assembled per node, runner/graph.ts). (s21) `backendFor(id)` =
 *   `world.backend.resolve(id)` · a `backend` effect = `world.backend.issue(call, deliver)` · (s22) `backendUser()` =
 *   `world.backend.user` · (s24) a spec's `world.store` handler is fed from `world.backend.onStoreEvent` after
 *   `writeStoreEvent(world.registry, e)`. · (s31) `pickerAnswer(ahead)` = `world.picker.answer(ahead)` · a `picker` effect =
 *   `world.picker.click(held, element, deliver)` — what the element holds at the click, the handler that delivers the answer.
 *   (s33) a `subscribe` effect = `world.backend.subscribe(call, tell)` (the handle it returns: `status`, `dispose()` — an
 *   `unsubscribe` effect). (s34) `socketAnswer(url)` = `world.sockets.answerFor(url)` · a `socket` effect's `connect` =
 *   `world.sockets.open(url, protocols, tell)` (the socket it returns: `readyState`, `send(data)`, `close(code, reason)` — the
 *   effect's `send` / `close`).
 *   (s42) `group()` = `world.group` read as `{ present, load }` · a spec's `world.group` handler is fed each of `world.group.writes`
 *   at its `at` (`world.clock.schedule`).
 */

import { HostFileCtor, type HostFile } from './host-file';
import { hmac, sha256, sha384, sha512 } from './sha2';

import { canonicalise } from './canonical';
import { Registry, type RegistryScript, type RegistryWrite } from './registry';
import type { TraceEvent } from './trace';
import { mulberry32, type Rng } from './runner/random';

// ------------------------------------------------------------------------------------------------
// the script — JSON, on a scenario or a sequence

export interface WorldScript {
  /** Seed of the world's random source. Default 1. */
  seed?: number;
  /** The network's scripted answers, first match wins. */
  network?: readonly NetworkRule[];
  /** NSP-012: the records and arrays the play starts with (registry.ts). Absent: an empty registry. */
  registry?: RegistryScript;
  /** NSP-013: the IANA zone the play runs in (TIME ZONE above). Absent: `UTC`. */
  timeZone?: string;
  /** NSP-013 s13: the browser viewport (VIEWPORT above). Absent: no window — a server render. */
  viewport?: ViewportScript;
  /** NSP-015 s16: `navigator.userActivation.isActive` for the play (LOCATION above). Absent: no `userActivation`. Read only with a window. */
  activation?: boolean;
  /** NSP-015 s17: the href the play's location starts at (LOCATION above). Absent: `https://app.example/`. Read only with a window. */
  location?: string;
  /** NSP-015 s17: the project's settings (PROJECT above). Absent: `{}`. */
  projectSettings?: Record<string, unknown>;
  /** NSP-015 s18: the Component Stacks (STACK above). Absent: none — a push is queued for good, and no Pop Component Stack sits in a pushed page. */
  stack?: StackScript;
  /** NSP-015 s19: the Routers (ROUTE above). Absent: none — every navigate is queued, and no Page Inputs sits in a Router's page. */
  router?: RouterScript;
  /** NSP-015 s20: the popups (POPUP above). Absent: a host, no components (every show fails to build), nothing the person does, a Close Popup inside no popup. */
  popup?: PopupScript;
  /** NSP-014 s21: the backends (BACKEND above). Absent: one, `main`, that no rule answers — every call a violation. */
  backend?: BackendScript;
  /** NSP-014 s31: the person at the file dialog (PICKER above). Absent: no `document` in the play. */
  picker?: PickerScript;
  /** NSP-014 s32: the project's cloud services and the browser's session for them (PROJECT above). Absent: none. */
  cloudServices?: CloudServicesScript;
  /** NSP-014 s34: the WebSocket servers (SOCKET above). Absent: none answers — every construction is a violation. */
  sockets?: SocketScript;
  /** NSP-016 s42: the Radio Button Group the node sits in (GROUP above). Absent: one, never written. */
  group?: GroupScript;
  /** NSP-022 s96: the backend process's services a cloud function's node reaches (HOST above). Absent: none installed. */
  host?: HostScript;
}

/** HOST above: the four services a backend process installs, by the trace's name. */
export const HOST_SERVICES = ['secrets', 'users', 'roles', 'mail'] as const;
export type HostService = (typeof HOST_SERVICES)[number];

/** HOST above: the global each service is installed as. */
export const HOST_GLOBALS: Readonly<Record<HostService, string>> = Object.freeze({ secrets: '_noodl_get_secret', users: '_noodl_system_users', roles: '_noodl_system_roles', mail: '_noodl_send_email' });

/** HOST above: which services the process has, and how they answer. */
export interface HostScript {
  /** The services installed. Absent: none. */
  services?: readonly HostService[];
  /** How they answer, first match wins. */
  answers?: readonly HostRule[];
}

export interface HostRule {
  match?: { service?: HostService; request?: unknown };
  answer: HostAnswer;
  /** Milliseconds on the clock before a resolve or reject lands (never for `secrets`); absent or 0 lands at once. */
  after?: number;
  /** The rule answers the first `times` calls it fits, then fits none; absent: every one. */
  times?: number;
}

/** What a service answers (HOST above). */
export type HostAnswer = { ok: unknown } | { throws: string } | { never: true };

/** One call a node made on a service, as handed. */
export interface HostCall {
  service: HostService;
  request: unknown;
}

/** What lands for a call: the value it returned or resolved with, or the message it threw or rejected with. */
export type HostDelivery = { ok: unknown } | { threw: string };

/** HOST above, as a play holds it. */
export class WorldHost {
  readonly services: ReadonlySet<HostService>;
  readonly calls: HostCall[] = [];
  readonly violations: string[] = [];
  private readonly rules: HostRule[];
  private readonly used = new Map<HostRule, number>();
  private readonly listeners: Array<(c: HostCall) => void> = [];
  constructor(private readonly clock: Clock, script: HostScript = {}) {
    for (const sv of script.services ?? []) if (!(HOST_SERVICES as readonly string[]).includes(sv)) throw new Error(`world: ${JSON.stringify(sv)} is not a host service (HOST: ${HOST_SERVICES.join(', ')})`);
    this.services = new Set(script.services ?? []);
    this.rules = [...(script.answers ?? [])];
    for (const r of this.rules) {
      if (r.match?.service === 'secrets' && ('never' in r.answer || r.after)) throw new Error('world: a secrets lookup is synchronous — it answers at once, never `never` or `after` (HOST)');
    }
  }

  /** Whether the process has this service (its global is installed). */
  has(service: HostService): boolean {
    return this.services.has(service);
  }

  /** Called with every call as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (c: HostCall) => void): void {
    this.listeners.push(listener);
  }

  private ruleFor(call: HostCall): HostRule | undefined {
    const fits = (r: HostRule) => {
      const m = r.match;
      if (!m) return true;
      if (m.service !== undefined && m.service !== call.service) return false;
      if (m.request === undefined) return true;
      if (m.request === null || typeof m.request !== 'object' || call.request === null || typeof call.request !== 'object') return JSON.stringify(canonicalise(m.request)) === JSON.stringify(canonicalise(call.request));
      const req = call.request as Record<string, unknown>;
      return Object.entries(m.request as Record<string, unknown>).every(([k, v]) => JSON.stringify(canonicalise(v)) === JSON.stringify(canonicalise(req[k])));
    };
    for (const r of this.rules) {
      if (!fits(r)) continue;
      const n = this.used.get(r) ?? 0;
      if (r.times !== undefined && n >= r.times) continue;
      this.used.set(r, n + 1);
      return r;
    }
    return undefined;
  }

  private record(call: HostCall): HostCall {
    const recorded: HostCall = { service: call.service, request: call.request };
    this.calls.push(recorded);
    for (const l of this.listeners) l(recorded);
    return recorded;
  }

  /** A `secrets` lookup: recorded, answered NOW (it is synchronous). */
  lookup(name: unknown): HostDelivery {
    const call = this.record({ service: 'secrets', request: name });
    const rule = this.ruleFor(call);
    if (!rule) {
      const what = `secrets ${JSON.stringify(canonicalise(name))}`;
      this.violations.push(`${what}: no rule in the world's script answers it`);
      return { threw: `the world has no answer for ${what}` };
    }
    const a = rule.answer;
    if ('never' in a) throw new Error('world: a secrets lookup always answers (HOST)');
    return 'ok' in a ? { ok: a.ok } : { threw: a.throws };
  }

  /** A call on `users`, `roles` or `mail`: recorded, its rule found, the landing scheduled; `deliver` at the answer's moment. */
  issue(call: HostCall, deliver: (d: HostDelivery) => void): void {
    const recorded = this.record(call);
    const rule = this.ruleFor(recorded);
    if (!rule) {
      const op = recorded.request && typeof recorded.request === 'object' ? (recorded.request as { op?: unknown }).op : undefined;
      const what = `${recorded.service}${op === undefined ? '' : ' ' + String(op)}`;
      this.violations.push(`${what}: no rule in the world's script answers it`);
      deliver({ threw: `the world has no answer for ${what}` });
      return;
    }
    const a = rule.answer;
    if ('never' in a) return;
    const d: HostDelivery = 'ok' in a ? { ok: a.ok } : { threw: a.throws };
    if (rule.after !== undefined && rule.after > 0) this.clock.schedule(rule.after, () => deliver(d));
    else deliver(d);
  }
}

/** The `host` trace event for a call (HOST above): as handed, canonical. */
export function hostEvent(c: HostCall): TraceEvent {
  return { t: 'host', service: c.service, request: canonicalise(c.request) } as TraceEvent;
}

/** GROUP above: whether there is a group, its Value at load, and the graph's later writes to it. */
export interface GroupScript {
  /** The node sits in no group. */
  none?: boolean;
  /** The group's Value parameter at load, raw; absent: never set. */
  value?: unknown;
  /** The graph writing the group's Value input, each `at` ≥ 1 ms on the clock, raw (`value` absent: undefined). */
  writes?: ReadonlyArray<{ at: number; value?: unknown }>;
}

/** GROUP above, as a play holds it. */
export class WorldGroup {
  /** Whether the node sits in a group. */
  readonly present: boolean;
  /** The group's Value parameter at load, when the script sets one. */
  readonly load: { value: unknown } | undefined;
  /** The graph's writes, in script order. */
  readonly writes: ReadonlyArray<{ at: number; value: unknown }>;
  constructor(script: GroupScript = {}) {
    this.present = script.none !== true;
    this.load = this.present && 'value' in script ? { value: script.value } : undefined;
    this.writes = this.present
      ? (script.writes ?? []).map((w) => {
          if (!(w.at >= 1)) throw new Error(`world: a group write is at ≥ 1 ms on the clock, not ${JSON.stringify(w.at)} — a Value at load is the script's \`value\``);
          return { at: w.at, value: w.value };
        })
      : [];
  }
}

/** SOCKET above: how the servers answer a construction, first match wins. */
export interface SocketScript {
  answers?: readonly SocketRule[];
}

/** SOCKET above: one rule — `match.url` exact, or a prefix when it ends in `*`; `times` the constructions it answers before it fits none. */
export interface SocketRule {
  match?: { url?: string };
  times?: number;
  answer: SocketAnswer;
}

/** SOCKET above: what the server does with one socket — a script of events on the clock, nothing, or a throw inside the constructor. */
export type SocketAnswer = { events: readonly SocketScriptEvent[]; replies?: readonly SocketReply[] } | { never: true } | { throws: string };

/** SOCKET above: one thing the server does, `at` ms after the construction (never before 1; absent 1). */
export type SocketScriptEvent = { at?: number } & (
  | { open: true }
  | { message: string }
  | { binary: readonly number[] }
  | { error: true }
  | { close: { code?: number; reason?: string; wasClean?: boolean } }
);

/** SOCKET above: the server answers a send whose text is `to` with a message carrying `with`, `after` ms later (never before 1). */
export interface SocketReply {
  to: string;
  with: string;
  after?: number;
}

/** SOCKET above: what a socket tells the node — the event it fires, as a spec's `world.socket` handler is handed it (spec.ts `SocketEvent`). */
export type SocketTold =
  | { kind: 'open' }
  | { kind: 'message'; data: string }
  | { kind: 'binary'; bytes: readonly number[] }
  | { kind: 'error' }
  | { kind: 'close'; code: number; reason: string; wasClean: boolean };

/** SOCKET above: a call the node made on the world's WebSocket, as handed. */
export type SocketCall = { op: 'connect'; url: unknown; protocols?: unknown } | { op: 'send'; data: unknown } | { op: 'close'; code?: unknown; reason?: unknown };

/** PROJECT above (s32): the project's `cloudservices` metadata as handed, and the session the browser holds for its app id. */
export interface CloudServicesScript {
  appId?: string;
  endpoint?: string;
  /** Set only for a deployed backend: pinned on every request as `x-noodl-cloud-version`. */
  deployVersion?: string;
  /** The token of the session stored under `Parse/<appId>/currentUser`; absent, nobody is signed in there. Never in the metadata. */
  sessionToken?: string;
}

/** PICKER above: how the person answers each click on a file input, the n-th click by the n-th entry (the last repeating). Absent or empty: never. */
export interface PickerScript {
  answers?: readonly PickerAnswer[];
}

/** PICKER above: one answer to one click. `after` (ms on the clock, never before 1) for the three that land. */
export type PickerAnswer =
  | { file: { name: string; type?: string; size?: number }; after?: number }
  | { empty: true; after?: number }
  | { cancel: true; after?: number }
  | { never: true }
  | { throws: string };

/** PICKER above: what a spec's `world.picker` handler is handed (spec.ts) — the event the answer fires; a `change` with no `file` is the empty list. */
export type PickerEvent = { kind: 'change'; file?: unknown } | { kind: 'cancel' };

/** PICKER above: what the element holds at a click — the two reflected attributes, as strings. */
export interface PickerClick {
  accept: string;
  capture: string;
}

/** BACKEND above: the project's backends (the first the active one) and how they answer. */
export interface BackendScript {
  /** The backend ids the project has, in order; the first is the active one. Absent: `['main']`. Never empty. */
  backends?: readonly string[];
  /** How the backends answer, first match wins. */
  answers?: readonly BackendRule[];
  /** s22: the id of the user signed in, as the Record family's access rules read it (USER, BACKEND above). Absent: nobody. */
  user?: string;
  /** s24: writes made elsewhere in the app, each heard by the store's listeners at its time (BACKEND above). Absent: none. */
  events?: readonly StoreEventScript[];
  /**
   * s26: the session each backend holds when the play starts (AUTH below), by backend id — the signed-in user's fields,
   * flat, `objectId` among them (the contract's `AuthSession` without its tokens). Absent: nobody is signed in anywhere.
   */
  sessions?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /**
   * s29: this page load is a sign-in coming back to the active backend (AUTH below, THE RETURN LEG) — what its address
   * carried. Absent: an ordinary page load.
   */
  return?: AuthReturnScript;
}

/**
 * AUTH below (s29), THE RETURN LEG: what a page load coming back from a provider carried. `error` — the provider's error
 * (the person cancelled, the provider refused; on REST also a `state` that does not match the parked flow — its own
 * sentence, RestAuthAdapter.ts :1505-1511): final at once. `exchange` — a code, exchanged with the backend: its answer
 * lands at `after` (never before 1 ms — a page's first frame is drawn before any answer to its load). `ok` is the session
 * the exchange returns (the user's fields flat, as `logIn`'s answer); `outcome` and `notice` what the state carries with
 * it (`notice` only the Parse wire's adapter sets — ParseAuthAdapter.ts :782; the REST adapter never does); a failed
 * exchange's `error` absent (or null) is the adapter's own `Sign-in could not be completed.`
 */
export type AuthReturnScript =
  | { error: string }
  | { exchange: { ok: Readonly<Record<string, unknown>>; outcome?: string; notice?: string } | { error: string | null } | { never: true }; after?: number };

/** AUTH below (s29): the state of a sign-in coming back, as the adapter keeps it and the service's `oauthReturn` hands it (ParseAuthAdapter.ts :192-201 `OAuthReturnState`). */
export interface AuthReturnState {
  inProgress: boolean;
  succeeded?: boolean;
  error?: string;
  outcome?: string;
  notice?: string;
}

/** AUTH below (s29): how a target runs the steps of a later moment of a return leg — `timer`: the adapter's `setTimeout(0)` firing; `answer`: the exchange's request resolving. */
export type ReturnLanding = (moment: 'timer' | 'answer', steps: () => void) => void;

/** RestAuthAdapter.ts :1552 / ParseAuthAdapter.ts :791 — a failed exchange with no message of its own (s29). */
export const SIGN_IN_NOT_COMPLETED = 'Sign-in could not be completed.';

/** BACKEND above (s24): one write made elsewhere in the app — a world timer at `at`. */
export interface StoreEventScript {
  at: number;
  /** The backend it was written to; absent, the active one. */
  backend?: string;
  type: 'create' | 'save' | 'delete';
  collection: string;
  objectId: string;
  /** What the record holds after it (`create` / `save`); a `delete` carries none. */
  data?: Readonly<Record<string, unknown>>;
}

/** What a store listener hears (BACKEND above, s24): the contract's event (`@noodl/backend-contract` `AdapterEvent`) and the backend it came from. */
export interface StoreEvent {
  backend: string;
  type: 'create' | 'save' | 'delete';
  objectId: string;
  /** `create` / `save`: the record as the adapter hands it, `objectId` first. */
  object?: Readonly<Record<string, unknown>>;
  collection: string;
}

/** The contract event a scripted write is heard as (BACKEND above, s24). */
export function storeEventOf(e: StoreEventScript, backend: string): StoreEvent {
  if (e.type === 'delete') return { backend, type: 'delete', objectId: e.objectId, collection: e.collection };
  return { backend, type: e.type, objectId: e.objectId, object: { objectId: e.objectId, ...(e.data ?? {}) }, collection: e.collection };
}

/**
 * The writer's half of a scripted write (BACKEND above, s24) on a registry: `_fromJSON` — the class, then each key of `data` but
 * `objectId` / `ACL`. A list with the same contents as the one the record holds is not written (P109 ISL-027, row C49, ruled
 * "Compare the list's contents"): a list read from JSON is a new array every time, and the record store's `!==` would call it changed.
 */
export function writeStoreEvent(
  registry: { model(id?: unknown): { set(name: string, value: unknown): void; get(name: string): unknown; [key: string]: unknown } },
  e: StoreEvent
): void {
  if (e.type === 'delete') return;
  const m = registry.model(e.objectId);
  m._class = e.collection;
  for (const key in e.object) {
    if (key === 'objectId' || key === 'ACL') continue;
    const value = e.object[key];
    if (Array.isArray(value) && sameList(m.get(key), value)) continue;
    m.set(key, value);
  }
}

/** Two plain lists with the same contents, in order (ISL-027, C49: `_fromJSON` does not write such a list again). */
export function sameList(held: unknown, value: readonly unknown[]): boolean {
  if (!Array.isArray(held) || held.length !== value.length) return false;
  try {
    return JSON.stringify(held) === JSON.stringify(value);
  } catch (e) {
    return false;
  }
}

/** BACKEND above: one answer rule — first match wins; absent `match` fits every call. */
export interface BackendRule {
  match?: { op?: string; collection?: string; backend?: string };
  answer: BackendAnswer;
  /** Milliseconds on the clock before the answer lands; absent or 0 lands at once. */
  after?: number;
  /** s28: the rule answers the first `times` calls it fits, then fits none (a refusal, then a retry that succeeds); absent: every one. */
  times?: number;
}

/** What a backend answers an operation (BACKEND above); (s33) a `subscribe` is answered by a `stream` (REALTIME above). */
export type BackendAnswer = { ok: unknown } | { error: string | null; detail?: Record<string, unknown>; lost?: true } | { never: true } | { stream: readonly RealtimeScriptEvent[] };

/** REALTIME above (s33): one thing a subscription tells, `at` ms after the subscribe (never before 1; absent: 1). */
export type RealtimeScriptEvent =
  | { at?: number; status: string }
  | { at?: number; change: { type: string; ids?: readonly unknown[]; records?: readonly unknown[]; recordsComplete?: boolean } }
  | { at?: number; error: { message: string; code: string; kind?: string } };

/** REALTIME above (s33): what a subscription tells its node — the handle's `onStatus`, `onEvent` and `onError`. */
export type RealtimeTold =
  | { status: string }
  | { change: { type: string; collection: unknown; ids: readonly unknown[]; records: readonly unknown[]; recordsComplete: boolean } }
  | { error: { message: string; code: string; kind: string | undefined } };

/** `@noodl/backend-contract/realtime` `REALTIME_FAILURE_KINDS` (realtime.ts :176-184) — the one classification, copied: this package depends on no contract. */
export const REALTIME_FAILURE_KINDS: Readonly<Record<string, string>> = Object.freeze({
  TRANSPORT_UNAVAILABLE: 'fatal',
  CONNECT_FAILED: 'retryable',
  CONNECT_TIMEOUT: 'retryable',
  AUTH_FAILED: 'fatal',
  SUBSCRIPTION_REJECTED: 'retryable',
  HEARTBEAT_MISSED: 'retryable',
  CAPABILITY_UNAVAILABLE: 'fatal'
});

/** REALTIME above (s33): the handle a subscribe hands back — its status now, and the dispose. */
export interface WorldSubscription {
  readonly status: string;
  dispose(): void;
}

/** One backend call, as handed (BACKEND above). */
export interface BackendCall {
  op: string;
  backend: string;
  args: Readonly<Record<string, unknown>>;
}

/** What lands for a call: what the success callback is handed, or the failure's message (`undefined`: none) and its `detail` when the backend gave one. */
export type BackendDelivery = { ok: unknown; inCall?: true } | { error: string | undefined; detail?: Record<string, unknown>; lost?: true; refused?: true };

/** POPUP above: the host, the components a Target can build, what the person does, where a Close Popup sits. */
export interface PopupScript {
  /** The components the project has that a Show Popup can open; absent: none. */
  components?: readonly string[];
  /** `false`: the app has no popup host (`showPopup` returns at once, opening nothing). Absent or `true`: a host. */
  host?: boolean;
  /** What the person does, each at `at` ms on the clock (a world timer: never before 1). */
  events?: readonly PopupScriptEvent[];
  /** Close Popup: the popups the node sits inside, nearest first, by component name. Absent: none. */
  inside?: readonly string[];
}

/** One thing the person does (POPUP above): a close through the popup's own Close Popup, or Escape. */
export type PopupScriptEvent =
  | { at: number; close: { action?: string; results?: Record<string, unknown> }; popup?: number }
  | { at: number; escape: true };

/** What a spec's `world.popup` handler is handed (spec.ts) — POPUP's `events`, at their time. `popup` absent: the last opened. */
export type PopupEvent = { kind: 'close'; popup?: number; action?: string; results: Readonly<Record<string, unknown>> } | { kind: 'escape' };

/** What `showPopup` does with a show (POPUP above): no host, the component built, or the message its promise rejects with. */
export type PopupAnswer = 'nohost' | 'opened' | { error: string };

/** One popup call (POPUP above), as handed. */
export type PopupCall =
  | { op: 'show'; target: unknown; params: unknown; stackPolicy: unknown; closeOnEscape: unknown; modal: unknown; accessibleName: unknown }
  | { op: 'close'; popup: unknown; action: unknown; results: unknown };

/** What a Component Stack tells a request (STACK above). */
export type StackAnswer = 'done' | 'unchanged' | { failure: { code: string; message: string } };

/** STACK above: one answer rule — first match wins; absent `match` fits every request. `target` matches canonically. */
export interface StackRule {
  match?: { op?: 'push' | 'replace'; target?: unknown };
  answer: StackAnswer;
}

/** STACK above: the registered stacks, how they answer, and what a pop is told. */
export interface StackScript {
  /** The names stacks are registered under (`''` is `Main`); absent: none. */
  names?: readonly string[];
  /** How a registered stack answers a push or a replace; absent or no match: `done`. */
  answers?: readonly StackRule[];
  /** What the n-th pop is told (the last repeating); absent: no Pop Component Stack sits in a pushed page. */
  back?: StackAnswer | readonly StackAnswer[];
}

/** ROUTE above: one answer rule — first match wins; absent `match` fits every request. `target` matches canonically. */
export interface RouteRule {
  /** `noTarget: true` fits a navigate whose Target was never set (`undefined`, which JSON cannot say); `target` never fits that one. */
  match?: { target?: unknown; noTarget?: true; openInNewTab?: boolean };
  answer: StackAnswer;
}

/** ROUTE above: the registered routers, how they answer, and the params a Router hands the page a Page Inputs sits in. */
export interface RouterScript {
  /** The names routers are registered under (`''` is `Main`); absent: none. */
  names?: readonly string[];
  /** How a registered router answers a navigate; absent or no match: `done`. */
  answers?: readonly RouteRule[];
  /** What the Router hands its page's Page Inputs, in order: no `at` (or 0) at the build (mount), `at` > 0 on the clock. Absent: the node sits in no Router's page. */
  page?: ReadonlyArray<{ at?: number; params: Record<string, unknown> }>;
}

/** VIEWPORT above: the size at the start, and the resizes the clock will deliver. */
export interface ViewportScript {
  width: number;
  height: number;
  resizes?: ReadonlyArray<{ at: number; width: number; height: number }>;
}

export interface NetworkRule {
  /** What the rule answers; absent matches every request. `url` matches exactly, or as a prefix when it ends in `*`. */
  match?: { method?: string; url?: string };
  answer: Answer;
  /** Milliseconds on the clock before the answer lands; absent or 0 lands at once. */
  after?: number;
}

export type Answer =
  /**
   * A response. `body`: a string travels as text; anything else travels as its JSON text. (s34) `chunks` instead of a `body`: a
   * body that STREAMS (NETWORK above, A STREAMED BODY) — its text, its end or its failure, each on the clock after the head lands.
   */
  | { status: number; statusText?: string; headers?: Record<string, string>; body?: unknown; chunks?: readonly StreamChunk[] }
  /** The request never reaches a server: rejected with a `TypeError` carrying this message. */
  | { error: string }
  /** No answer ever comes (until the request is aborted). */
  | { never: true };

// ------------------------------------------------------------------------------------------------
// what travels

export interface RequestRecord {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | { $form: Array<[string, string]> };
}

/** NETWORK above (s34), A STREAMED BODY: one piece of a streamed body, `at` ms after the head lands (never before 1; absent 1). */
export type StreamChunk = { at?: number } & ({ text: string } | { end: true } | { error: string });

/**
 * The world's answer as a spec sees it (spec.ts `WorldResponse` adds the request id). A head whose body streams says so
 * (`stream: true`, `body` null); what the body then does arrives as `StreamDelivery`s.
 */
export type Delivery =
  | { status: number; statusText: string; headers: Record<string, string>; body: string | null; stream?: true }
  | { error: { name: string; message: string } }
  | { aborted: true };

/** NETWORK above (s34): what a streamed body does after its head — text, its end, or its failure (an abort's included). Spec.ts `StreamEvent` adds the request id. */
export type StreamDelivery = { chunk: string } | { end: true } | { streamError: { name: string; message: string } };

/** What the world hands a request's issuer when the answer lands — and, for a streamed body, each thing the body does after it. */
export type Deliver = (d: Delivery | StreamDelivery) => void;

// ------------------------------------------------------------------------------------------------
// the clock

interface Scheduled {
  id: number;
  due: number;
  seq: number;
  fn: () => void;
}

const TIMEOUT_MAX = 2 ** 31 - 1;

/** Node's rule for a timer's delay (lib/internal/timers.js): not a number from 1 to 2^31-1 → 1. */
export function timerDelay(ms: unknown): number {
  const n = Number(ms);
  return n >= 1 && n <= TIMEOUT_MAX ? n : 1;
}

export class Clock {
  private _now = 0;
  private seq = 0;
  private nextId = 1;
  private timers: Scheduled[] = [];

  now(): number {
    return this._now;
  }

  /** Schedules `fn` at `now + timerDelay(ms)`; returns a handle for `cancel`. */
  schedule(ms: unknown, fn: () => void): number {
    const id = this.nextId++;
    this.timers.push({ id, due: this._now + timerDelay(ms), seq: this.seq++, fn });
    return id;
  }

  cancel(id: number): void {
    this.timers = this.timers.filter((t) => t.id !== id);
  }

  /** Moves the clock by `ms`, firing every timer due on the way in (due, scheduled) order. */
  advance(ms: number): void {
    const target = this._now + Math.max(0, ms);
    for (;;) {
      let next: Scheduled | undefined;
      for (const t of this.timers) {
        if (t.due <= target && (!next || t.due < next.due || (t.due === next.due && t.seq < next.seq))) next = t;
      }
      if (!next) break;
      this.timers = this.timers.filter((t) => t !== next);
      if (next.due > this._now) this._now = next.due;
      next.fn();
    }
    this._now = target;
  }

  /**
   * NSP-015 s19 (T9) — fires the ONE earliest timer due at or before `until` (due, then scheduled
   * order) and returns true, or returns false when none is due. A target with an event loop steps an
   * `advance` with this and yields after EVERY timer — two timers due at the same moment included:
   * on an event loop a timer's microtasks run before the next timer fires, whatever its due time
   * (two Navigates answered in one millisecond; stepping by due TIME fired both in one sweep).
   */
  step(until: number): boolean {
    let next: Scheduled | undefined;
    for (const t of this.timers) {
      if (t.due <= until && (!next || t.due < next.due || (t.due === next.due && t.seq < next.seq))) next = t;
    }
    if (!next) return false;
    this.timers = this.timers.filter((t) => t !== next);
    if (next.due > this._now) this._now = next.due;
    next.fn();
    return true;
  }

  pending(): number {
    return this.timers.length;
  }

  /**
   * The earliest due time of a pending timer, or undefined. A target with an event loop steps an
   * `advance` timer by timer with this, yielding between them (NSP-013 s12, T6): in a browser the
   * microtasks a timer starts — a fetch's `.then` chain — run before the next timer fires, so an
   * answer due at +100 lands before a timeout due at +30000 in the same `advance`.
   */
  nextDue(): number | undefined {
    let due: number | undefined;
    for (const t of this.timers) if (due === undefined || t.due < due) due = t.due;
    return due;
  }
}

// ------------------------------------------------------------------------------------------------
// randomness

export class Random {
  private rng: Rng;
  constructor(seed: number) {
    this.rng = mulberry32(seed >>> 0);
  }
  /** [0, 1) */
  next(): number {
    return this.rng.next();
  }
  bytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = Math.floor(this.rng.next() * 256);
    return out;
  }
  /** A version-4 UUID laid out from 16 bytes of the stream (the same layout `crypto.randomUUID` has). */
  uuid(): string {
    const b = this.bytes(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    let hex = '';
    for (let i = 0; i < 16; i++) hex += b[i].toString(16).padStart(2, '0');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}

// ------------------------------------------------------------------------------------------------
// the network

interface InFlight {
  id: number;
  deliver: Deliver;
  timer?: number;
  done: boolean;
  /** s34: the head of a streamed body has landed; these are the timers of what the body still has to say */
  streaming?: number[];
}

export class Network {
  /** Every request issued, in order — what went over the wire. */
  readonly requests: RequestRecord[] = [];
  /** Requests no rule answered (AC5): the runner fails a run that has any. */
  readonly violations: string[] = [];
  private nextId = 1;
  private inFlight = new Map<number, InFlight>();
  private listeners: Array<(r: RequestRecord) => void> = [];

  constructor(
    private readonly clock: Clock,
    private readonly rules: readonly NetworkRule[]
  ) {}

  /** Called with every request as it is issued — how a target attributes it to the node that made it. */
  onRequest(listener: (r: RequestRecord) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Issues a request: records it, finds its rule, schedules the delivery. Returns the request's
   * id (for `abort`). The record is NORMALISED here (lower-cased header names, the body's wire
   * form) so every issuer — the interpreter from a spec's effect, the runtime through `fetch` —
   * records the same thing.
   */
  issue(request: { method?: unknown; url: unknown; headers?: unknown; body?: unknown }, deliver: Deliver): number {
    const record = normaliseRequest(request);
    this.requests.push(record);
    for (const l of this.listeners) l(record);
    const id = this.nextId++;
    const entry: InFlight = { id, deliver, done: false };
    this.inFlight.set(id, entry);
    const rule = this.rules.find((r) => matches(r, record));
    if (!rule) {
      this.violations.push(`${record.method} ${record.url}: no rule in the world's script answers it`);
      this.land(entry, { error: { name: 'TypeError', message: `the world has no answer for ${record.method} ${record.url}` } });
      return id;
    }
    if ('never' in rule.answer) return id;
    const delivery = toDelivery(rule.answer);
    const chunks = 'chunks' in rule.answer ? rule.answer.chunks : undefined;
    const arrive = () => (chunks ? this.head(entry, delivery, chunks) : this.land(entry, delivery));
    if (rule.after !== undefined && rule.after > 0) entry.timer = this.clock.schedule(rule.after, arrive);
    else arrive();
    return id;
  }

  /**
   * Aborts a request still in flight: its answer is dropped and `{ aborted }` lands at once. (s34) A request whose streamed body
   * is still being read: the rest of the body is dropped and the body FAILS with an `AbortError` at once. A finished request is
   * left alone.
   */
  abort(id: number): void {
    const entry = this.inFlight.get(id);
    if (!entry || entry.done) return;
    if (entry.streaming) {
      this.endStream(entry, { streamError: { name: 'AbortError', message: 'This operation was aborted' } });
      return;
    }
    if (entry.timer !== undefined) this.clock.cancel(entry.timer);
    this.land(entry, { aborted: true });
  }

  /** s34 — the reader CANCELLED a streamed body (`reader.cancel()`): the rest is dropped and nothing more is said. */
  cancelStream(id: number): void {
    const entry = this.inFlight.get(id);
    if (!entry || entry.done || !entry.streaming) return;
    this.endStream(entry);
  }

  /** s34 — a streamed body's head lands; what the body says is then on the clock, each piece `at` ms after this moment. */
  private head(entry: InFlight, delivery: Delivery, chunks: readonly StreamChunk[]): void {
    if (entry.done) return;
    const timers: number[] = [];
    entry.streaming = timers;
    entry.deliver({ ...delivery, body: null, stream: true } as Delivery);
    for (const c of chunks) {
      const t = this.clock.schedule(c.at ?? 1, () => {
        timers.splice(timers.indexOf(t), 1);
        if (entry.done) return;
        if ('text' in c) entry.deliver({ chunk: c.text });
        else if ('end' in c) this.endStream(entry, { end: true });
        else this.endStream(entry, { streamError: { name: 'TypeError', message: c.error } });
      });
      timers.push(t);
    }
  }

  private endStream(entry: InFlight, last?: StreamDelivery): void {
    for (const t of (entry.streaming ?? []).splice(0)) this.clock.cancel(t);
    entry.done = true;
    this.inFlight.delete(entry.id);
    if (last) entry.deliver(last);
  }

  private land(entry: InFlight, d: Delivery): void {
    if (entry.done) return;
    entry.done = true;
    this.inFlight.delete(entry.id);
    entry.deliver(d);
  }
}

function matches(rule: NetworkRule, r: RequestRecord): boolean {
  const m = rule.match;
  if (!m) return true;
  if (m.method !== undefined && m.method.toUpperCase() !== String(r.method).toUpperCase()) return false;
  if (m.url !== undefined) {
    if (m.url.endsWith('*')) return r.url.startsWith(m.url.slice(0, -1));
    return r.url === m.url;
  }
  return true;
}

/** The wire form of a request, from whatever a caller handed `fetch` (or a spec's effect). */
export function normaliseRequest(request: { method?: unknown; url: unknown; headers?: unknown; body?: unknown }): RequestRecord {
  const headers: Record<string, string> = {};
  const h = request.headers;
  if (h && typeof h === 'object') {
    // a `Headers` instance iterates [name, value] already lower-cased; a plain object is lower-cased here
    const entries: Iterable<[string, string]> =
      typeof (h as { entries?: unknown }).entries === 'function' ? ((h as { entries: () => Iterable<[string, string]> }).entries() as Iterable<[string, string]>) : Object.entries(h as Record<string, unknown>).map(([k, v]) => [k, String(v)] as [string, string]);
    for (const [name, value] of entries) headers[String(name).toLowerCase()] = String(value);
  }
  const record: RequestRecord = { method: request.method === undefined || request.method === null ? 'GET' : (request.method as string), url: String(request.url), headers };
  const body = request.body;
  if (body !== undefined && body !== null) {
    const form = body as { $form?: unknown; entries?: unknown };
    if (Array.isArray(form.$form)) record.body = { $form: (form.$form as Array<[string, string]>).map(([k, v]) => [String(k), String(v)]) };
    else if (typeof FormData !== 'undefined' && body instanceof FormData) record.body = { $form: [...body.entries()].map(([k, v]) => [k, String(v)]) };
    else record.body = String(body);
  }
  return record;
}

/** The wire form of a scripted answer (see the header: how headers are completed, what the body's text is). */
export function toDelivery(answer: Answer): Delivery {
  if ('error' in answer) return { error: { name: 'TypeError', message: answer.error } };
  if ('never' in answer) throw new Error('a never-answer has no delivery');
  if (answer.chunks !== undefined && answer.body !== undefined) throw new Error('world: an answer streams its body (chunks) or has one (body), not both');
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(answer.headers ?? {})) headers[k.toLowerCase()] = String(v);
  let body: string | null = null;
  if (answer.body !== undefined) {
    if (typeof answer.body === 'string') {
      body = answer.body;
      if (!('content-type' in headers)) headers['content-type'] = 'text/plain;charset=UTF-8';
    } else {
      body = JSON.stringify(answer.body);
      if (!('content-type' in headers)) headers['content-type'] = 'application/json';
    }
  }
  return { status: answer.status, statusText: answer.statusText ?? '', headers, body };
}

// ------------------------------------------------------------------------------------------------
// the backends (BACKEND above)

/** A `backend` trace event for a call (BACKEND above): `args` canonical, its callbacks left out. */
export function backendEvent(c: BackendCall): TraceEvent {
  const args: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c.args)) if (typeof v !== 'function') args[k] = v;
  return { t: 'backend', op: c.op, backend: c.backend, args: canonicalise(args) } as TraceEvent;
}

/** What lands for an answer rule that answers (BACKEND above). */
function deliveryOf(a: Exclude<BackendAnswer, { never: true } | { stream: readonly RealtimeScriptEvent[] }>): BackendDelivery {
  if ('ok' in a) return { ok: a.ok };
  const d: BackendDelivery = { error: a.error === null ? undefined : a.error };
  if (a.detail !== undefined) d.detail = a.detail;
  if (a.lost) d.lost = true;
  return d;
}

/** FILES (BACKEND above, s30): the contract's file operations — their failure is an envelope (`fileError`). */
export const FILE_OPS: readonly string[] = Object.freeze(['uploadFile', 'signFileUrl']);

export const isFileOp = (op: string): boolean => FILE_OPS.includes(op);

/** RestDataAdapter.ts :1744-1747 — an upload handed something that is not a file, refused before the wire (s30). */
export const NOT_A_FILE = 'Upload File was given something that is not a file. Wire the File output of an Open File Picker node into it.';

/**
 * FILES (s30): what a file operation's `error` callback is handed for a failed answer — the contract's `FileError` envelope:
 * the answer's `detail` fields, then `error` the message over them; no `error` key when the answer carried no message.
 */
export function fileError(d: { error: string | undefined; detail?: Record<string, unknown> }): Record<string, unknown> {
  const envelope: Record<string, unknown> = { ...(d.detail ?? {}) };
  if (d.error !== undefined) envelope.error = d.error;
  else delete envelope.error;
  return envelope;
}

/**
 * FILES (s30): a stored file as a target that has no class of its own for one makes it — the runtime's `CloudFile`
 * (cloudfile.ts :57-103) by its surface: the fields of a `FileRef` it keeps (name, url, and contentType / size / target /
 * filename only when present — `filename` since P109 ISL-030, row C52) and their getters. canonical.ts tags it `$cloudFile`.
 */
export class StoredFile {
  readonly name: string;
  readonly url: string;
  readonly contentType?: string;
  readonly size?: number;
  readonly target?: unknown;
  /** P109 ISL-030 (row C52): the name it was uploaded as, when known (cloudfile.ts `filename`). */
  readonly filename?: string;
  constructor(ref: { name: string; url: string; contentType?: string; size?: number; target?: unknown; filename?: string }) {
    this.name = ref.name;
    this.url = ref.url;
    if (ref.contentType !== undefined) this.contentType = ref.contentType;
    if (ref.size !== undefined) this.size = ref.size;
    if (ref.target !== undefined) this.target = ref.target;
    if (ref.filename !== undefined) this.filename = ref.filename;
  }
  getUrl(): string {
    return this.url;
  }
  getName(): string {
    return this.name;
  }
  getContentType(): string | undefined {
    return this.contentType;
  }
  getSize(): number | undefined {
    return this.size;
  }
  getTarget(): unknown {
    return this.target;
  }
  getFilename(): string | undefined {
    return this.filename;
  }
  toString(): string {
    return this.url;
  }
}

/** FILES (s30): an `uploadFile` whose `file` has no `arrayBuffer` function is refused inside the call (RestDataAdapter.ts :1738-1749). */
function fileBeforeWire(op: string, args: Readonly<Record<string, unknown>>): BackendDelivery | undefined {
  if (op !== 'uploadFile') return undefined;
  const file = args.file as { arrayBuffer?: unknown } | null | undefined;
  if (file !== null && file !== undefined && typeof file.arrayBuffer === 'function') return undefined;
  return { error: NOT_A_FILE, refused: true };
}

/** AUTH below: the operations the world plays as auth — the contract's (`IAuthAdapter`) and the one beside it (`setUserProperties`, userservice.ts :422). */
export const AUTH_OPS: readonly string[] = Object.freeze(['fetchCurrentUser', 'setUserProperties', 'logIn', 'signUp', 'logOut', 'requestMagicLink', 'signInWithProvider']);

export const isAuthOp = (op: string): boolean => AUTH_OPS.includes(op);

/** RestAuthAdapter.ts :1153 / :1603 (and ParseAuthAdapter.ts :682 — the one sentence for the condition). */
export const NOBODY_SIGNED_IN = 'Nobody is signed in.';
/** AUTH (P109 ISL-030, row D23 ruled "Refuse with a reason"): a `setUserProperties` with a Username, to a REST backend (RestAuthAdapter.ts `REST_USERNAME_UNSUPPORTED`). */
export const USERNAME_UNSUPPORTED = 'This backend has no usernames, so Username cannot be set. Leave Username blank, or change Email instead.';

/** RestAuthAdapter.ts :1378 / ParseAuthAdapter.ts :617 — a provider sign-in handed no provider (s28). */
export const NO_PROVIDER_SET = 'Sign In With: no provider was set.';

/** What a session announces (AUTH below) — the contract's `AuthEventType` (`@noodl/backend-contract` auth.ts :189-206). */
export type AuthEventType = 'sessionChanged' | 'loggedIn' | 'loggedOut' | 'sessionGained' | 'sessionLost';

/** One step of an auth answer's landing (AUTH below), in order; the target performs each as it comes. */
export type AuthStep =
  | { do: 'write'; backend: string; session: Record<string, unknown> }
  | { do: 'clear'; backend: string }
  | { do: 'event'; type: AuthEventType; backend: string }
  | { do: 'success' }
  | { do: 'error'; message: string | undefined }
  /** s29 — THE RETURN LEG: the adapter's `oauthReturn` state becomes `state`; `announce`: then its `oauthReturn` event, carrying it. */
  | { do: 'return'; backend: string; state: AuthReturnState; announce: boolean };

/** What a node-facing session event hands a listening node (AUTH below; spec.ts `WorldHandlers.auth`). */
export interface AuthNotice {
  type: Exclude<AuthEventType, 'sessionChanged'>;
  backend: string;
}

/** The fields the REST adapter never sends back (RestAuthAdapter.ts :243-261 `REST_USER_READONLY_FIELDS`, copied) — server-owned. */
export const REST_USER_READONLY_FIELDS: readonly string[] = Object.freeze([
  'objectId', 'id', 'emailVerified', 'verified', 'createdAt', 'updatedAt', 'created', 'updated', 'collectionId',
  'collectionName', 'expand', 'password', 'passwordConfirm', 'tokenKey', 'sessionToken', 'refreshToken', 'expiresAt'
]);

/**
 * AUTH below: what a `setUserProperties` writes into the session on success, from the call's args (RestAuthAdapter.ts
 * :1607-1617): every property, then `email` when it is not `undefined` — `username` NEVER (the REST adapter drops it) — and
 * then the server-owned fields removed.
 */
export function writtenUserFields(args: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const content: Record<string, unknown> = { ...((args.properties as Record<string, unknown> | undefined) ?? {}) };
  if (args.email !== undefined) content.email = args.email;
  for (const field of REST_USER_READONLY_FIELDS) delete content[field];
  return content;
}

/**
 * AUTH below: a session as the user service hands it to the record store (userservice.ts :502-509 `currentFor`): a copy,
 * the token and bookkeeping keys removed, then `_fromJSON(user, '_User')` — the registry record of its `objectId`, class
 * `_User`, every key but `objectId` and `ACL` written in key order (`writeStoreEvent`).
 */
export function userRecordEvent(session: Readonly<Record<string, unknown>>): StoreEvent {
  const user: Record<string, unknown> = { ...session };
  for (const key of ['sessionToken', 'refreshToken', 'expiresAt', 'ACL', 'className', '__type']) delete user[key];
  return { backend: '', type: 'save', objectId: String(user.objectId), object: user, collection: '_User' };
}

export class WorldBackend {
  /** The project's backend ids, the first the active one. */
  readonly ids: readonly string[];
  /** Every call made, in order. */
  readonly calls: BackendCall[] = [];
  /** Calls no rule answered: the runner fails a run that has any. */
  readonly violations: string[] = [];
  private listeners: Array<(c: BackendCall) => void> = [];
  private storeListeners: Array<(e: StoreEvent) => void> = [];
  /** AUTH (s26): what each backend's session store holds now, by backend id; absent: nobody signed in there. */
  private readonly sessions = new Map<string, Readonly<Record<string, unknown>>>();
  /** USER (s22). P109 ISL-030 (C45 + C46): nothing clears it any more — a failed start-up check is the adapter's alone. */
  private readonly legacyUser: string | undefined;
  /** AUTH (s26): whether the app's user service exists yet — it makes the start-up check once, when it is made. */
  private serviceMade = false;

  constructor(
    private readonly clock: Clock,
    readonly script: BackendScript
  ) {
    const ids = script.backends ?? ['main'];
    if (ids.length === 0) throw new Error('world: a backend script names at least one backend — the project with none is the legacy store, not a world this seam plays');
    this.ids = ids;
    this.legacyUser = script.user;
    for (const [backend, session] of Object.entries(script.sessions ?? {})) {
      if (!ids.includes(backend)) throw new Error(`world: a session names backend ${JSON.stringify(backend)}, which the project does not have`);
      this.sessions.set(backend, { ...session });
    }
    // s24 — writes made elsewhere: world timers, scheduled before any node's
    for (const e of script.events ?? []) {
      const backend = e.backend ?? ids[0];
      if (!ids.includes(backend)) throw new Error(`world: a store event names backend ${JSON.stringify(backend)}, which the project does not have`);
      clock.schedule(e.at, () => {
        const event = storeEventOf(e, backend);
        for (const l of [...this.storeListeners]) l(event);
      });
    }
  }

  /**
   * s24 — called at each scripted write made elsewhere (BACKEND above), in the order subscribed. A target subscribes
   * ONCE per play and does both halves itself: the registry write (`writeStoreEvent`, on whatever holds its records),
   * then the event to its nodes' store listeners. Returns the unsubscribe.
   */
  onStoreEvent(listener: (e: StoreEvent) => void): () => void {
    this.storeListeners.push(listener);
    return () => {
      const i = this.storeListeners.indexOf(listener);
      if (i >= 0) this.storeListeners.splice(i, 1);
    };
  }

  /** USER (s22): the id of the user signed in on the LEGACY store; `undefined`: nobody. */
  get user(): string | undefined {
    return this.legacyUser;
  }

  /**
   * USER (P109 ISL-029, D24): the id of the user signed in on `backend`, as the Record family's access rules read it — the
   * objectId of the session that backend holds now (RestDataAdapter `currentUserId`); `undefined`: nobody signed in there.
   */
  userOn(backend: string): string | undefined {
    const s = this.sessions.get(backend);
    return s === undefined ? undefined : (s.objectId as string | undefined);
  }

  /**
   * AUTH (s26): what `backend`'s session store holds now — the signed-in user's fields, flat — or `undefined`: nobody signed
   * in there. A FRESH copy every read, as the store is JSON text parsed on every read (SessionStore.ts :177-185): an array in
   * it is a new array each time, and the record store's `!==` then calls it changed.
   */
  session(backend: string): Record<string, unknown> | undefined {
    const s = this.sessions.get(backend);
    return s === undefined ? undefined : (JSON.parse(JSON.stringify(s)) as Record<string, unknown>);
  }

  /**
   * AUTH (s26): the app's user service is made — by the first node that reaches it. Once per play: when the ACTIVE backend
   * holds a session, the service checks it — a `fetchCurrentUser` call to the active backend with nothing in its args, made
   * by the SERVICE (recorded in `calls`; no listener hears it, so it is no node's), answered by the script's first rule for
   * it, landing on the clock at its `after` but never before 1 ms (THE START-UP CHECK, AUTH above). `deliver` gets the
   * answer at its moment; what lands is the target's to perform — the adapter's steps (`landAuth`), and nothing of the
   * service's (P109 ISL-030, C45 + C46). Returns whether a check was made.
   */
  startService(deliver: (d: BackendDelivery) => void, performReturn: (step: AuthStep) => void = () => undefined, landReturn?: ReturnLanding): boolean {
    if (this.serviceMade) return false;
    this.serviceMade = true;
    // s29 — THE RETURN LEG first: a page load carrying a sign-in makes no start-up check (userservice.ts :138)
    if (this.consumeReturn(performReturn, landReturn)) return false;
    const backend = this.ids[0];
    if (!this.sessions.has(backend)) return false;
    const call: BackendCall = { op: 'fetchCurrentUser', backend, args: {} };
    this.calls.push(call);
    const rule = this.ruleFor(call);
    if (!rule) {
      this.violations.push(`the user service's start-up check (fetchCurrentUser on ${backend}): no rule in the world's script answers it`);
      this.clock.schedule(1, () => deliver({ error: `the world has no answer for fetchCurrentUser on ${backend}` }));
      return true;
    }
    if ('never' in rule.answer) return true;
    if ('stream' in rule.answer) throw new Error('world: the start-up check was answered by a stream — only a subscribe is (REALTIME)');
    const d = deliveryOf(rule.answer);
    this.clock.schedule(Math.max(1, rule.after ?? 0), () => deliver(d));
    return true;
  }

  /** AUTH (s26): whether the user service has been made in this play. */
  get serviceStarted(): boolean {
    return this.serviceMade;
  }

  /** s29: the adapter's return state (THE RETURN LEG) — `{ inProgress: false }` until a return was consumed. */
  private returnState: AuthReturnState = { inProgress: false };
  private returnConsumed = false;

  /** s29: what the service's `oauthReturn` hands now (THE RETURN LEG, AUTH above) — a copy. */
  get authReturn(): AuthReturnState {
    return { ...this.returnState };
  }

  /**
   * s29 — THE RETURN LEG (AUTH above): the user service, as it is made, asks the active backend's adapter whether this page
   * load is a sign-in coming back (userservice.ts :138, :456-463; RestAuthAdapter.ts :1465-1560 `consumeAuthReturn`). Once
   * per play; `false` when the script carries none. With one, its steps go to `perform` (`AuthStep`); the steps of each
   * later moment on the clock are handed to `land` as one function, with what the moment is — the adapter's `timer`
   * firing, or the exchange's `answer` resolving (a target runs that a microtask after its moment, as a `fetch` resolves):
   *   `error` — at once, the state final (`{ inProgress: false, succeeded: false, error }`, not announced); at 1 ms (the
   *     adapter's `setTimeout(0)`, CLOCK's rule) the same state announced.
   *   `exchange` — at once, the state `{ inProgress: true }` (not announced); at `after` (never before 1 ms) the answer
   *     lands — ok: the session becomes the answer (written, `sessionChanged` — `setSession` :639-643), the state
   *     succeeded with the answer's `outcome` / `notice`, announced, then `loggedIn` (:1536-1547); failed: the state failed
   *     with the error (absent: `Sign-in could not be completed.`), announced (:1549-1556). `never`: nothing lands.
   */
  consumeReturn(perform: (step: AuthStep) => void, land: ReturnLanding = (_moment, steps) => steps()): boolean {
    const r = this.script.return;
    if (r === undefined || this.returnConsumed) return false;
    this.returnConsumed = true;
    const backend = this.ids[0];
    const state = (s: AuthReturnState, announce: boolean) => {
      this.returnState = s;
      perform({ do: 'return', backend, state: { ...s }, announce });
    };
    if ('error' in r) {
      state({ inProgress: false, succeeded: false, error: r.error }, false);
      this.clock.schedule(1, () => land('timer', () => perform({ do: 'return', backend, state: { ...this.returnState }, announce: true })));
      return true;
    }
    state({ inProgress: true }, false);
    const answer = r.exchange;
    if ('never' in answer) return true;
    this.clock.schedule(Math.max(1, r.after ?? 0), () => land('answer', () => {
      if ('ok' in answer) {
        const session = { ...answer.ok };
        this.sessions.set(backend, session);
        perform({ do: 'write', backend, session: { ...session } });
        perform({ do: 'event', type: 'sessionChanged', backend });
        const s: AuthReturnState = { inProgress: false, succeeded: true };
        if (answer.outcome !== undefined) s.outcome = answer.outcome;
        if (answer.notice !== undefined) s.notice = answer.notice;
        state(s, true);
        perform({ do: 'event', type: 'loggedIn', backend });
        return;
      }
      state({ inProgress: false, succeeded: false, error: answer.error || SIGN_IN_NOT_COMPLETED }, true);
    }));
    return true;
  }

  /**
   * AUTH (s26): what an auth operation is answered with BEFORE the wire, or `undefined` — the REST adapter's own pre-flight.
   * A refusal (RestAuthAdapter.ts :1150-1155 `fetchCurrentUser`, :1601-1605 `setUserProperties`): with no session (no
   * `objectId`, for a write) on the backend it was handed to, `Nobody is signed in.` (s27) A `logOut` to a backend holding no
   * session is no request at all — the adapter finishes it at once (:1070-1073, `!session`): a SUCCESS, in the call. Either
   * is still a call (recorded, never a violation) answered AT ONCE, inside the call — no rule is read. (s28) A
   * `signInWithProvider` handed no provider (`!args.provider`) is refused so, by both adapters in the same words.
   */
  authBeforeWire(op: string, backend: string, args?: Readonly<Record<string, unknown>>): BackendDelivery | undefined {
    if (op === 'signInWithProvider' && !args?.provider) return { error: NO_PROVIDER_SET, refused: true };
    const s = this.sessions.get(backend);
    if (op === 'fetchCurrentUser' && s === undefined) return { error: NOBODY_SIGNED_IN, refused: true };
    if (op === 'setUserProperties' && (s === undefined || !s.objectId)) return { error: NOBODY_SIGNED_IN, refused: true };
    // P109 ISL-030 (D23): a Username to a REST backend is refused, before the wire — v1 of this world dropped it and wrote the rest
    if (op === 'setUserProperties' && args?.username !== undefined && args.username !== null && args.username !== '') return { error: USERNAME_UNSUPPORTED, refused: true };
    if (op === 'logOut' && s === undefined) return { ok: undefined, inCall: true };
    return undefined;
  }

  /**
   * AUTH (s26): an auth call's answer landing — the adapter's half, the steps in their order (AUTH above), each handed to
   * `perform` right after the world's own sessions moved for it. `atCall` is the session the backend held when the call was
   * made (`session(backend)` then): the REST adapter merges an answer over THAT (RestAuthAdapter.ts :1170-1172, :1636).
   */
  landAuth(op: string, backend: string, args: Readonly<Record<string, unknown>>, atCall: Readonly<Record<string, unknown>> | undefined, d: BackendDelivery, perform: (step: AuthStep) => void): void {
    const write = (session: Record<string, unknown>) => {
      this.sessions.set(backend, session);
      perform({ do: 'write', backend, session: { ...session } });
    };
    const clear = () => {
      this.sessions.delete(backend);
      perform({ do: 'clear', backend });
    };
    const event = (type: AuthEventType) => perform({ do: 'event', type, backend });
    if (op === 'logOut') {
      // s27 — the local session goes WHATEVER the backend says (RestAuthAdapter.ts :1064-1068 `finish`, :1083 — on `ok` and
      // on `fail` alike): cleared WITH `sessionChanged` (`clearSession` :645-649), the caller's success, then `loggedOut`
      clear();
      event('sessionChanged');
      perform({ do: 'success' });
      event('loggedOut');
      return;
    }
    if (!('ok' in d)) {
      // a rejected session (the contract's `sessionLost`: 401 / 403 on REST, 209 on the Parse wire) — storage cleared
      // WITHOUT `sessionChanged`, then `sessionLost` (RestAuthAdapter.ts :1177-1186); only a read of the session does this
      if (op === 'fetchCurrentUser' && d.lost && !d.refused) {
        clear();
        event('sessionLost');
      }
      perform({ do: 'error', message: d.error });
      return;
    }
    const answer = d.ok !== null && typeof d.ok === 'object' ? (d.ok as Record<string, unknown>) : {};
    if (op === 'fetchCurrentUser') {
      write({ ...(atCall ?? {}), ...answer }); // :1170-1174 — then `sessionChanged`
      event('sessionChanged');
      event('sessionGained'); // :1175
      perform({ do: 'success' }); // :1176
      return;
    }
    if (op === 'setUserProperties') {
      write({ ...(atCall ?? {}), ...answer, ...writtenUserFields(args) }); // :1634-1637
      event('sessionChanged');
      perform({ do: 'success' });
      return;
    }
    if (op === 'logIn' || op === 'signUp') {
      // s27 — the session becomes the ANSWER, whoever was signed in before (`readSession(…, undefined)` :999, :832-841 — no
      // `previous`); `sessionChanged`; the caller's success; then `loggedIn` (:1019-1020). A sign-up is the sign-in made after
      // the account (:1087-1142 — the adapter's own `logIn` on the created account's credentials): the same landing.
      write({ ...answer });
      event('sessionChanged');
      perform({ do: 'success' });
      event('loggedIn');
      return;
    }
    if (op === 'requestMagicLink') {
      perform({ do: 'success' }); // s28 — ParseAuthAdapter.ts :640: the session untouched
      return;
    }
    if (op === 'signInWithProvider') return; // s28 — the handover accepted: the browser leaves, nothing comes back
    throw new Error(`world: ${op} is not an auth operation the world plays`);
  }

  /** Called with every call as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (c: BackendCall) => void): void {
    this.listeners.push(listener);
  }

  /** The backend a node's Backend input names (resolveBackend.pure.ts :232-249): falsy or `_active_` is the active one; an id the project has is that one; anything else is none. */
  resolve(backendId: unknown): string | undefined {
    if (!backendId || backendId === '_active_') return this.ids[0];
    return this.ids.find((id) => id === backendId);
  }

  /** Makes a call: records it, finds its rule, schedules the landing. `deliver` is called at the answer's moment (a target hops a microtask from there). */
  issue(call: BackendCall, deliver: (d: BackendDelivery) => void): void {
    const recorded: BackendCall = { op: call.op, backend: call.backend, args: call.args };
    this.calls.push(recorded);
    for (const l of this.listeners) l(recorded);
    // AUTH (s26, s27) — answered before the wire: at once, inside the call, no rule read
    const before = this.authBeforeWire(call.op, call.backend, call.args as Readonly<Record<string, unknown>>) ?? fileBeforeWire(call.op, call.args);
    if (before !== undefined) {
      deliver(before);
      return;
    }
    const collection = (call.args as { collection?: unknown }).collection;
    const rule = this.ruleFor(call);
    if (!rule) {
      const what = `${call.op} ${String(collection)} on ${call.backend}`;
      this.violations.push(`${what}: no rule in the world's script answers it`);
      deliver({ error: `the world has no answer for ${what}` });
      return;
    }
    const a = rule.answer;
    if ('never' in a) return;
    if ('stream' in a) throw new Error(`world: ${call.op} was answered by a stream — only a subscribe is (REALTIME)`);
    const d = deliveryOf(a);
    if (rule.after !== undefined && rule.after > 0) this.clock.schedule(rule.after, () => deliver(d));
    else deliver(d);
  }

  /**
   * REALTIME (s33): opens a subscription — recorded as handed, answered by its rule's stream on the clock, each entry told
   * through `tell` at its moment by the handle's rules (REALTIME above). Returns the handle the node holds.
   */
  subscribe(call: BackendCall, tell: (e: RealtimeTold) => void): WorldSubscription {
    const record = (op: string) => {
      const recorded: BackendCall = { op, backend: call.backend, args: call.args };
      this.calls.push(recorded);
      for (const l of this.listeners) l(recorded);
    };
    record('subscribe');
    let status = 'connecting';
    /** stopped or disposed: the transport is closed and nothing more is told */
    let ended = false;
    let disposed = false;
    const timers: number[] = [];
    const handle: WorldSubscription = {
      get status() {
        return status;
      },
      // RealtimeSubscription.ts `dispose` — guarded by `_disposed` alone: a subscription a fatal error stopped is still disposed
      dispose: () => {
        if (disposed) return;
        disposed = true;
        ended = true;
        status = 'stopped';
        for (const t of timers.splice(0)) this.clock.cancel(t);
        record('unsubscribe');
      }
    };
    // the handle's `_notify`: a handler's throw is logged and goes no further
    const safely = (e: RealtimeTold) => {
      try {
        tell(e);
      } catch {
        /* RealtimeSubscription.ts `_notify` — "the subscription is unaffected" */
      }
    };
    const setStatus = (next: string) => {
      if (status === next) return;
      status = next;
      if (next === 'stopped') ended = true;
      safely({ status: next });
    };
    const collection = (call.args as { collection?: unknown }).collection;
    const rule = this.ruleFor({ op: 'subscribe', backend: call.backend, args: call.args });
    if (!rule) {
      this.violations.push(`subscribe ${String(collection)} on ${call.backend}: no rule in the world's script answers it`);
      return handle;
    }
    const a = rule.answer;
    if ('never' in a) return handle;
    if (!('stream' in a)) throw new Error(`world: a subscribe is answered by a stream or never (REALTIME), not ${JSON.stringify(a)}`);
    for (const entry of a.stream) {
      const id = this.clock.schedule(entry.at ?? 1, () => {
        timers.splice(timers.indexOf(id), 1);
        if (ended) return;
        if ('status' in entry) setStatus(entry.status);
        else if ('change' in entry) {
          const c = entry.change;
          safely({ change: { type: c.type, collection, ids: c.ids ?? [], records: c.records ?? [], recordsComplete: c.recordsComplete ?? true } });
        } else {
          const kind = entry.error.kind ?? REALTIME_FAILURE_KINDS[entry.error.code];
          safely({ error: { message: entry.error.message, code: entry.error.code, kind } });
          if (kind === 'fatal') setStatus('stopped');
        }
      });
      timers.push(id);
    }
    return handle;
  }

  /** How many calls each rule has answered (s28 `times`). */
  private readonly answered = new Map<BackendRule, number>();

  /** The first of the script's `answers` whose `match` fits the call and whose `times` is not spent (BACKEND above); counts it. */
  private ruleFor(call: BackendCall): BackendRule | undefined {
    const collection = (call.args as { collection?: unknown }).collection;
    const rule = (this.script.answers ?? []).find((r) => {
      if (r.times !== undefined && (this.answered.get(r) ?? 0) >= r.times) return false;
      const m = r.match;
      if (!m) return true;
      if (m.op !== undefined && m.op !== call.op) return false;
      if (m.collection !== undefined && m.collection !== collection) return false;
      if (m.backend !== undefined && m.backend !== call.backend) return false;
      return true;
    });
    if (rule) this.answered.set(rule, (this.answered.get(rule) ?? 0) + 1);
    return rule;
  }
}

// ------------------------------------------------------------------------------------------------
// the world

/** The play's viewport (VIEWPORT above): its size now, and the `resize` listeners the scripted resizes run. */
export class Viewport {
  width: number;
  height: number;
  private listeners: Array<() => void> = [];

  constructor(clock: Clock, script: ViewportScript) {
    this.width = script.width;
    this.height = script.height;
    for (const r of script.resizes ?? []) {
      clock.schedule(r.at, () => {
        this.width = r.width;
        this.height = r.height;
        for (const l of [...this.listeners]) l();
      });
    }
  }

  /** Subscribes a `resize` listener; returns the unsubscribe. */
  listen(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }
}

/** One `window.open` call, as handed (LOCATION above). */
export interface OpenRecord {
  url: unknown;
  target: unknown;
  features: unknown;
}

/** One call the location recorded, in the order made (LOCATION above): an open, a push, a dispatch. */
export type LocationCall =
  | ({ call: 'open' } & OpenRecord)
  | { call: 'push'; url: unknown }
  | { call: 'replace'; url: unknown }
  | { call: 'back' }
  | { call: 'dispatch'; event: string };

/** Where a play's location starts when its script names none (LOCATION above). */
export const DEFAULT_HREF = 'https://app.example/';

/** The targets a popup blocker never refuses: the page itself (LOCATION above). */
const SAME_PAGE_TARGETS = ['_self', '_parent', '_top'];

/**
 * What `window.open` hands back (LOCATION above): `null` with `noopener` / `noreferrer` in the
 * features, or when the popup blocker refuses — activation `false` and a target that is not the
 * page itself; a window otherwise. A spec reads it through `WorldView.opens`.
 */
export function openReturnsWindow(target: unknown, features: unknown, activation: boolean | undefined): boolean {
  const tokens = typeof features === 'string' ? features.toLowerCase().split(/[\s,]+/) : [];
  if (tokens.some((t) => t === 'noopener' || t.startsWith('noopener=') || t === 'noreferrer' || t.startsWith('noreferrer='))) return false;
  const samePage = typeof target === 'string' && SAME_PAGE_TARGETS.includes(target.toLowerCase());
  return !(activation === false && !samePage);
}

/** The trace event a location call is recorded as (LOCATION above; trace.ts) — the one translation every target shares. */
export function locationEvent(c: LocationCall): TraceEvent {
  if (c.call === 'push' || c.call === 'replace') return { t: 'history', op: c.call, url: canonicalise(c.url) };
  if (c.call === 'back') return { t: 'history', op: 'back' };
  if (c.call === 'dispatch') return { t: 'dispatch', event: c.event };
  const e: TraceEvent = { t: 'open', url: canonicalise(c.url) };
  if (c.target !== undefined) e.target = canonicalise(c.target);
  if (c.features !== undefined) e.features = canonicalise(c.features);
  return e;
}

/**
 * Where `history.pushState(…, url)` takes a location at `href` (LOCATION above): `url` resolved
 * against it, or `null` when the browser refuses — a url that does not resolve, or one on another
 * origin. A spec reads it through `WorldView.pushes`.
 */
export function pushTarget(url: unknown, href: string): string | null {
  let next: URL;
  try {
    next = new URL(String(url), href);
  } catch {
    return null;
  }
  return next.origin === new URL(href).origin ? next.href : null;
}

/** One call a navigation node made to a Component Stack (STACK above), as handed. */
export type StackCall =
  | { call: 'push' | 'replace'; stack: unknown; target: unknown; params: unknown; transition: unknown }
  | { call: 'back'; action: unknown; results: unknown };

/** The trace event a stack call is recorded as (STACK above; trace.ts) — canonical NOW, since a node hands its live objects. */
export function stackEvent(c: StackCall): TraceEvent {
  if (c.call === 'back') {
    const e: TraceEvent = { t: 'stack', op: 'back', results: canonicalise(c.results) ?? null };
    if (c.action !== undefined) e.action = canonicalise(c.action);
    return e;
  }
  const e: TraceEvent = { t: 'stack', op: c.call, params: canonicalise(c.params) ?? null, transition: canonicalise(c.transition) ?? null };
  if (c.stack !== undefined) e.stack = canonicalise(c.stack);
  if (c.target !== undefined) e.target = canonicalise(c.target);
  return e;
}

/** The handler's name rule (STACK above): `name || 'Main'`, as a property key. */
export function stackName(name: unknown): string {
  return String(name || 'Main');
}

/** The Component Stacks of a play (STACK above): who is registered, what they answer, every call made. */
export class WorldStack {
  /** Every call, as its trace event, in the order made. */
  readonly calls: TraceEvent[] = [];
  private listeners: Array<(e: TraceEvent) => void> = [];
  private pops = 0;

  constructor(readonly script: StackScript) {}

  /** Called with every call's event as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (e: TraceEvent) => void): void {
    this.listeners.push(listener);
  }

  /** Records a call as handed. */
  record(c: StackCall): void {
    const e = stackEvent(c);
    this.calls.push(e);
    for (const l of this.listeners) l(e);
  }

  /** How many stacks are registered under the name a node handed (`stackName`). */
  registered(name: unknown): number {
    const key = stackName(name);
    return (this.script.names ?? []).filter((n) => stackName(n) === key).length;
  }

  /** What ONE registered stack tells a push or a replace for this target (first rule, `done` when none fits). */
  answerFor(op: 'push' | 'replace', target: unknown): StackAnswer {
    const key = JSON.stringify(canonicalise(target) ?? null);
    const rule = (this.script.answers ?? []).find((r) => (r.match?.op === undefined || r.match.op === op) && (r.match === undefined || !('target' in r.match) || JSON.stringify(canonicalise(r.match.target) ?? null) === key));
    return rule ? rule.answer : 'done';
  }

  /** What the node is told for a push or a replace — `undefined` when no stack is registered under the name: queued, for good. */
  answer(op: 'push' | 'replace', name: unknown, target: unknown): StackAnswer | undefined {
    return this.registered(name) > 0 ? this.answerFor(op, target) : undefined;
  }

  /** Whether a Pop Component Stack sits in a pushed page (the stack installed its back callback). */
  get inPushedPage(): boolean {
    return this.script.back !== undefined;
  }

  /** What the pop `ahead` calls from now is told (0 = the next); `undefined` when not in a pushed page. Reads; consumes nothing. */
  backAnswer(ahead = 0): StackAnswer | undefined {
    const b = this.script.back;
    if (b === undefined) return undefined;
    const list: readonly StackAnswer[] = Array.isArray(b) ? b : [b as StackAnswer];
    if (list.length === 0) return 'done';
    return list[Math.min(this.pops + ahead, list.length - 1)];
  }

  /** A pop: records it as handed and returns what the stack tells it (consumes one answer). Only in a pushed page. */
  back(action: unknown, results: unknown): StackAnswer {
    const answer = this.backAnswer(0);
    if (answer === undefined) throw new Error('world: a pop with no stack to pop — the node is not in a pushed page');
    this.record({ call: 'back', action, results });
    this.pops++;
    return answer;
  }
}

/** One navigate a Navigate node handed the RouterHandler (ROUTE above), as handed. */
export interface RouteCall {
  router: unknown;
  target: unknown;
  params: unknown;
  openInNewTab: unknown;
}

/** The trace event a navigate is recorded as (ROUTE above; trace.ts) — canonical NOW, since a node hands its live objects. */
export function routeEvent(c: RouteCall): TraceEvent {
  const e: TraceEvent = { t: 'route', params: canonicalise(c.params) ?? null, openInNewTab: canonicalise(c.openInNewTab) ?? null };
  if (c.router !== undefined) e.router = canonicalise(c.router);
  if (c.target !== undefined) e.target = canonicalise(c.target);
  return e;
}

/** A router registers under `name || 'Main'` (router-handler.ts :70), as a property key. */
export function routerName(name: unknown): string {
  return String(name || 'Main');
}

function sameCanonical(a: unknown, b: unknown): boolean {
  if (a === undefined || b === undefined) return a === b;
  return JSON.stringify(canonicalise(a)) === JSON.stringify(canonicalise(b));
}

/** The Routers of a play (ROUTE above): who is registered, what they answer, every navigate handed. */
export class WorldRouter {
  /** Every navigate, as its trace event, in the order handed. */
  readonly calls: TraceEvent[] = [];
  private listeners: Array<(e: TraceEvent) => void> = [];

  constructor(readonly script: RouterScript) {}

  /** Called with every navigate's event as it is handed — how a target attributes it to the node that made it. */
  onCall(listener: (e: TraceEvent) => void): void {
    this.listeners.push(listener);
  }

  /** Records a navigate as handed. */
  record(c: RouteCall): void {
    const e = routeEvent(c);
    this.calls.push(e);
    for (const l of this.listeners) l(e);
  }

  /** The handler's lookup at +1 ms (router-handler.ts :54-62): the one registered name when there is exactly one, else the name as handed, a blank one as Main (row C118, fixed in P109 ISL-048). */
  resolve(name: unknown): string {
    const keys = Array.from(new Set((this.script.names ?? []).map(routerName)));
    return keys.length === 1 ? keys[0] : routerName(name);
  }

  /** How many routers answer a navigate handed under `name`. */
  registered(name: unknown): number {
    const key = this.resolve(name);
    return (this.script.names ?? []).filter((n) => routerName(n) === key).length;
  }

  /** What ONE registered router tells a navigate to this target (first rule, `done` when none fits). */
  answerFor(target: unknown, openInNewTab: unknown): StackAnswer {
    const rule = (this.script.answers ?? []).find(
      (r) =>
        r.match === undefined ||
        ((!('target' in r.match) || sameCanonical(r.match.target, target)) && (!r.match.noTarget || target === undefined) && (r.match.openInNewTab === undefined || r.match.openInNewTab === openInNewTab))
    );
    return rule ? rule.answer : 'done';
  }

  /** What the node is told at +1 ms — `undefined` when no router answers to the name: queued, for good. */
  answer(name: unknown, target: unknown, openInNewTab: unknown): StackAnswer | undefined {
    return this.registered(name) > 0 ? this.answerFor(target, openInNewTab) : undefined;
  }

  /** The params the Router hands its page (`page`), in order; empty when the node sits in no Router's page. */
  get pages(): ReadonlyArray<{ at: number; params: Record<string, unknown> }> {
    return (this.script.page ?? []).map((p) => ({ at: Number(p.at ?? 0) || 0, params: p.params }));
  }
}

/** The trace event a popup call is recorded as (POPUP above; trace.ts) — canonical NOW, since a node hands its live objects. */
export function popupEvent(c: PopupCall): TraceEvent {
  if (c.op === 'close') {
    const e: TraceEvent = { t: 'popup', op: 'close', results: canonicalise(c.results) ?? null };
    if (c.popup !== undefined) e.popup = canonicalise(c.popup);
    if (c.action !== undefined) e.action = canonicalise(c.action);
    return e;
  }
  const e: TraceEvent = { t: 'popup', op: 'show', params: canonicalise(c.params) ?? null, stackPolicy: canonicalise(c.stackPolicy) ?? null, closeOnEscape: canonicalise(c.closeOnEscape) ?? null, modal: canonicalise(c.modal) ?? null };
  if (c.target !== undefined) e.target = canonicalise(c.target);
  if (c.accessibleName !== undefined) e.accessibleName = canonicalise(c.accessibleName);
  return e;
}

/** The popups of a play (POPUP above): the host, what a show builds, what the person does, every call made. */
export class WorldPopup {
  /** Every call, as its trace event, in the order made. */
  readonly calls: TraceEvent[] = [];
  private listeners: Array<(e: TraceEvent) => void> = [];

  constructor(readonly script: PopupScript) {}

  /** Called with every call's event as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (e: TraceEvent) => void): void {
    this.listeners.push(listener);
  }

  /** Records a call as handed. */
  record(c: PopupCall): void {
    const e = popupEvent(c);
    this.calls.push(e);
    for (const l of this.listeners) l(e);
  }

  /** Whether the app has a popup host. */
  get host(): boolean {
    return this.script.host !== false;
  }

  /** What `showPopup` does with this target (nodecontext.ts :1213, nodescope.ts :293-313, :615-623). */
  answer(target: unknown): PopupAnswer {
    if (!this.host) return 'nohost';
    if (!target) return { error: 'Component instance must have a name' };
    if ((this.script.components ?? []).includes(String(target))) return 'opened';
    return { error: "Can't find component model for " + String(target) };
  }

  /** What the person does, in script order, `at` read as a delay (world.ts CLOCK). */
  get events(): ReadonlyArray<{ at: number; event: PopupEvent }> {
    return (this.script.events ?? []).map((e) => ({
      at: Number(e.at),
      event: 'escape' in e ? { kind: 'escape' as const } : { kind: 'close' as const, popup: e.popup, action: e.close.action, results: { ...(e.close.results ?? {}) } }
    }));
  }

  /** The popups a Close Popup sits inside, nearest first. */
  get inside(): readonly string[] {
    return this.script.inside ?? [];
  }
}

/** The location of a play with a window (LOCATION above): its href, every call made, and the user activation. */
export class WorldLocation {
  /** Every `window.open`, in order. */
  readonly opened: OpenRecord[] = [];
  /** Every call, opens included, in the order made. */
  readonly calls: LocationCall[] = [];
  /** The current href. */
  href: string;
  /** NSP-016 s70 — the session history (LOCATION above): its entries' hrefs, the start first. */
  entries: string[];
  /** Which entry is current. */
  index = 0;
  /** `history.back()` calls whose traversal has not landed yet. */
  private queued = 0;
  private listeners: Array<(c: LocationCall) => void> = [];
  private eventListeners: Array<{ type: string; fn: (e: unknown) => void }> = [];

  constructor(
    readonly activation: boolean | undefined,
    start: string = DEFAULT_HREF
  ) {
    this.href = new URL(start).href;
    this.entries = [this.href];
  }

  /** Called with every call as it is made — how a target attributes it to the node that made it. */
  onCall(listener: (c: LocationCall) => void): void {
    this.listeners.push(listener);
  }

  private record(c: LocationCall): void {
    this.calls.push(c);
    for (const l of this.listeners) l(c);
  }

  /** `window.open`: records the call as handed; opens nothing; returns a stand-in window or `null` (`openReturnsWindow`). */
  open(url: unknown, target: unknown, features: unknown): { closed: false } | null {
    const record: OpenRecord = { url, target, features };
    this.opened.push(record);
    this.record({ call: 'open', ...record });
    return openReturnsWindow(target, features, this.activation) ? { closed: false } : null;
  }

  /** `history.pushState`: records the call as handed; moves the href, or throws a `SecurityError` for a url another origin's or none (`pushTarget`). */
  push(url: unknown): void {
    this.record({ call: 'push', url });
    const next = pushTarget(url, this.href);
    if (next === null) {
      throw new DOMException(`Failed to execute 'pushState' on 'History': A history state object with URL '${String(url)}' cannot be created in a document with origin '${new URL(this.href).origin}'`, 'SecurityError');
    }
    this.entries = [...this.entries.slice(0, this.index + 1), next];
    this.index++;
    this.href = next;
  }

  /** NSP-016 s70 — `history.replaceState`: records the call as handed; the current entry becomes `url`, refused as a push is. */
  replace(url: unknown): void {
    this.record({ call: 'replace', url });
    const next = pushTarget(url, this.href);
    if (next === null) {
      throw new DOMException(`Failed to execute 'replaceState' on 'History': A history state object with URL '${String(url)}' cannot be created in a document with origin '${new URL(this.href).origin}'`, 'SecurityError');
    }
    this.entries[this.index] = next;
    this.href = next;
  }

  /** NSP-016 s70 — `history.back()`: records the call; the traversal lands later (`land`, LOCATION above). */
  back(): void {
    this.record({ call: 'back' });
    this.queued++;
  }

  /** How many `history.back()` traversals wait to land. */
  get waiting(): number {
    return this.queued;
  }

  /**
   * NSP-016 s70 — lands the oldest waiting traversal (a target calls it at each yield to the event loop, then lets the promises its
   * listeners made resolve before the next): the entry before the current one becomes current and the listeners run, as the
   * person's Back runs them — nothing on the first entry. `none` when none waited.
   */
  land(): 'none' | 'moved' | 'stayed' {
    if (this.queued === 0) return 'none';
    this.queued--;
    if (this.index === 0) return 'stayed';
    this.index--;
    this.moveTo(this.entries[this.index]);
    return 'moved';
  }

  /** The href moves to `next`; the `popstate` listeners run, then the `hashchange` ones when the hash moved. */
  private moveTo(next: string): void {
    const hashMoved = new URL(next).hash !== new URL(this.href).hash;
    this.href = next;
    for (const l of this.eventListeners.filter((x) => x.type === 'popstate')) l.fn({ type: 'popstate', state: null });
    if (hashMoved) for (const l of this.eventListeners.filter((x) => x.type === 'hashchange')) l.fn({ type: 'hashchange' });
  }

  /**
   * NSP-016 s57 — the person's Back or Forward (LOCATION above): the href moves to `url` resolved against it (`pushTarget` — another
   * origin's, or none, throws: that is a page load, not a traversal), nothing is recorded, and the `popstate` listeners run, then the
   * `hashchange` ones when the hash moved. s70: the current entry becomes the nearest one holding it (LOCATION above).
   */
  traverse(url: unknown): void {
    const next = pushTarget(url, this.href);
    if (next === null) throw new Error(`world: a traversal stays on the page's origin — ${String(url)} from ${this.href} is a page load`);
    // s70 — the nearest entry holding it, before the current one first; none: the history is that one entry (LOCATION above)
    let at = -1;
    for (let d = 1; at < 0 && (this.index - d >= 0 || this.index + d < this.entries.length); d++) {
      if (this.entries[this.index - d] === next) at = this.index - d;
      else if (this.entries[this.index + d] === next) at = this.index + d;
    }
    if (at < 0) {
      this.entries = [next];
      at = 0;
    }
    this.index = at;
    this.moveTo(next);
  }

  /** `window.dispatchEvent`: records the event's type, then runs that type's listeners in subscription order. */
  dispatch(event: { type: string }): true {
    this.record({ call: 'dispatch', event: event.type });
    for (const l of this.eventListeners.filter((x) => x.type === event.type)) l.fn(event);
    return true;
  }

  /** `addEventListener` for a location event (`popstate`, `hashchange`); returns the unsubscribe. A listener already subscribed to that type is not added twice. */
  listen(type: string, fn: (e: unknown) => void): () => void {
    if (!this.eventListeners.some((x) => x.type === type && x.fn === fn)) this.eventListeners.push({ type, fn });
    return () => {
      this.eventListeners = this.eventListeners.filter((x) => !(x.type === type && x.fn === fn));
    };
  }
}

/** The trace event a click is recorded as (PICKER above; trace.ts): what the element holds at the click. */
export function pickerEvent(c: PickerClick): TraceEvent {
  return { t: 'picker', accept: c.accept, capture: c.capture };
}

/** A file the person chose (PICKER above): Node's own `File` — the class a browser's `File` is — its bytes zeros. */
export function pickedFile(desc: { name: string; type?: string; size?: number }): HostFile {
  return new HostFileCtor([new Uint8Array(desc.size ?? 0)], desc.name, { type: desc.type ?? '', lastModified: 0 });
}

/** The person at the file dialog of a play (PICKER above): every click, and how each is answered. */
export class WorldPicker {
  /** Every click, as its trace event, in the order made. */
  readonly calls: TraceEvent[] = [];
  private listeners: Array<(e: TraceEvent, element: unknown) => void> = [];
  private clicks = 0;

  constructor(
    private readonly clock: Clock,
    readonly script: PickerScript | undefined
  ) {}

  /** Whether the play has a `document` at all — the script has a `picker`. */
  get present(): boolean {
    return this.script !== undefined;
  }

  /** Called with every click's event and the element clicked, as it is made — how a target attributes it to the node that made the element. */
  onCall(listener: (e: TraceEvent, element: unknown) => void): void {
    this.listeners.push(listener);
  }

  /** How the click `ahead` clicks from now (0 = the next) will be answered. Reads; consumes nothing. */
  answer(ahead = 0): PickerAnswer {
    const list = this.script?.answers ?? [];
    if (list.length === 0) return { never: true };
    return list[Math.min(this.clicks + ahead, list.length - 1)];
  }

  /**
   * A click: recorded as the element holds it, then answered — `deliver` fired at the answer's moment with the event (a
   * file made then), unless the answer is `never` or a throw. Returns the answer; a throw is the CALLER's to throw (the
   * element throws it; a spec reports it).
   */
  click(held: PickerClick, element: unknown, deliver: (e: PickerEvent) => void): PickerAnswer {
    const answer = this.answer(0);
    const e = pickerEvent(held);
    this.calls.push(e);
    for (const l of this.listeners) l(e, element);
    this.clicks++;
    if ('never' in answer || 'throws' in answer) return answer;
    this.clock.schedule(answer.after, () => {
      deliver('file' in answer ? { kind: 'change', file: pickedFile(answer.file) } : 'empty' in answer ? { kind: 'change' } : { kind: 'cancel' });
    });
    return answer;
  }
}

/** A file list as a node reads one (`FileList`): `length`, the files by index, `item(i)`. */
function fileList(files: readonly unknown[]): ArrayLike<unknown> & { item(i: number): unknown } {
  const list: Record<number, unknown> & { length: number; item(i: number): unknown } = { length: files.length, item: (i: number) => files[i] ?? null };
  files.forEach((f, i) => (list[i] = f));
  return list;
}

/** The file input the play's `document` hands a node (PICKER above): reflected `accept` / `capture`, `files`, the two handler properties, `click()`. */
export class WorldFileInput {
  type = 'text';
  onchange: ((e: unknown) => void) | null = null;
  oncancel: ((e: unknown) => void) | null = null;
  files: ArrayLike<unknown> & { item(i: number): unknown } = fileList([]);
  private held: PickerClick = { accept: '', capture: '' };

  constructor(private readonly picker: WorldPicker) {}

  get accept(): string {
    return this.held.accept;
  }
  set accept(v: unknown) {
    this.held = { ...this.held, accept: String(v) };
  }
  get capture(): string {
    return this.held.capture;
  }
  set capture(v: unknown) {
    this.held = { ...this.held, capture: String(v) };
  }
  /** P109 ISL-030 (C53, D27): the attribute removed — a reflected attribute that is absent reads `''`. */
  removeAttribute(name: string): void {
    if (name === 'accept' || name === 'capture') this.held = { ...this.held, [name]: '' };
  }
  get value(): string {
    const first = this.files[0] as { name?: string } | undefined;
    return first ? 'C:\\fakepath\\' + String(first.name) : '';
  }
  set value(v: unknown) {
    if (String(v) === '') this.files = fileList([]);
  }

  click(): void {
    const answer = this.picker.click({ ...this.held }, this, (e) => {
      this.files = fileList(e.kind === 'change' && e.file !== undefined ? [e.file] : []);
      const handler = e.kind === 'change' ? this.onchange : this.oncancel;
      if (typeof handler === 'function') handler.call(this, { type: e.kind, target: this });
    });
    if ('throws' in answer) throw new DOMException(answer.throws, 'NotAllowedError');
  }
}

// ------------------------------------------------------------------------------------------------
// the WebSocket servers (SOCKET above)

/** A `socket` trace event for a call (SOCKET above): each value canonical, a field the node did not hand absent. */
export function socketEvent(c: SocketCall): TraceEvent {
  const e: Record<string, unknown> = { t: 'socket', op: c.op };
  const put = (name: string, v: unknown) => {
    if (v !== undefined) e[name] = canonicalise(v);
  };
  if (c.op === 'connect') {
    put('url', c.url);
    put('protocols', c.protocols);
  } else if (c.op === 'send') put('data', c.data);
  else {
    put('code', c.code);
    put('reason', c.reason);
  }
  return e as unknown as TraceEvent;
}

/** SOCKET above: a socket as the world keeps it — its state, and the three calls the node makes on it. */
export interface WorldSocket {
  readonly readyState: number;
  send(data: unknown): void;
  close(code?: unknown, reason?: unknown): void;
}

/** The WebSocket servers (SOCKET above): every construction recorded, answered by the script's first fitting rule. */
export class WorldSockets {
  /** Every call made on a world socket, as the trace records it, in order. */
  readonly calls: TraceEvent[] = [];
  /** Constructions no rule answered (AC5). */
  readonly violations: string[] = [];
  private readonly listeners: Array<(e: TraceEvent, socket: WorldSocket) => void> = [];
  private readonly answered = new Map<SocketRule, number>();

  constructor(
    private readonly clock: Clock,
    private readonly script: SocketScript = {}
  ) {}

  /** Called with every call as it is made, and the socket it was made on — how a target attributes it to the node that holds the socket. */
  onCall(listener: (e: TraceEvent, socket: WorldSocket) => void): void {
    this.listeners.push(listener);
  }

  private record(c: SocketCall, socket: WorldSocket): void {
    const e = socketEvent(c);
    this.calls.push(e);
    for (const l of this.listeners) l(e, socket);
  }

  private fits(rule: SocketRule, url: string): boolean {
    if (rule.times !== undefined && (this.answered.get(rule) ?? 0) >= rule.times) return false;
    const m = rule.match?.url;
    if (m === undefined) return true;
    return m.endsWith('*') ? url.startsWith(m.slice(0, -1)) : url === m;
  }

  /** What the next construction for `url` would meet (SOCKET above), without spending a rule's `times`; `undefined`: no rule — a violation. */
  answerFor(url: unknown): SocketAnswer | undefined {
    return (this.script.answers ?? []).find((r) => this.fits(r, String(url)))?.answer;
  }

  /** A construction (SOCKET above): recorded, answered by its rule; what the server does is told through `tell` at its moment. Throws where the script says the constructor throws. */
  open(url: unknown, protocols: unknown, tell: (e: SocketTold) => void): WorldSocket {
    let readyState = 0;
    /** a `close` event arrived, or the node called `close()`: nothing more is delivered */
    let ended = false;
    const timers: number[] = [];
    // the DOM's "report the exception": a handler's throw goes no further
    const safely = (e: SocketTold) => {
      try {
        tell(e);
      } catch {
        /* reported, never propagated */
      }
    };
    const later = (at: number | undefined, fn: () => void) => {
      const id = this.clock.schedule(at ?? 1, () => {
        timers.splice(timers.indexOf(id), 1);
        if (!ended) fn();
      });
      timers.push(id);
    };
    const end = () => {
      ended = true;
      for (const t of timers.splice(0)) this.clock.cancel(t);
    };
    let replies: readonly SocketReply[] = [];
    const socket: WorldSocket = {
      get readyState() {
        return readyState;
      },
      send: (data: unknown) => {
        this.record({ op: 'send', data }, socket);
        if (readyState === 0) throw new DOMException("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.", 'InvalidStateError');
        if (readyState !== 1 || typeof data !== 'string') return;
        const reply = replies.find((r) => r.to === data);
        if (reply) later(reply.after, () => safely({ kind: 'message', data: reply.with }));
      },
      close: (code?: unknown, reason?: unknown) => {
        this.record({ op: 'close', code, reason }, socket);
        if (readyState !== 3) readyState = 2;
        end();
      }
    };
    this.record({ op: 'connect', url, protocols }, socket);
    const rule = (this.script.answers ?? []).find((r) => this.fits(r, String(url)));
    if (!rule) {
      this.violations.push(`socket ${String(url)}: no rule in the world's script answers it`);
      return socket;
    }
    this.answered.set(rule, (this.answered.get(rule) ?? 0) + 1);
    const a = rule.answer;
    if ('throws' in a) throw new DOMException(a.throws, 'SyntaxError');
    if ('never' in a) return socket;
    replies = a.replies ?? [];
    for (const entry of a.events) {
      later(entry.at, () => {
        if ('open' in entry) {
          readyState = 1;
          safely({ kind: 'open' });
        } else if ('message' in entry) safely({ kind: 'message', data: entry.message });
        else if ('binary' in entry) safely({ kind: 'binary', bytes: [...entry.binary] });
        else if ('error' in entry) safely({ kind: 'error' });
        else {
          const code = entry.close.code ?? 1006;
          readyState = 3;
          end();
          safely({ kind: 'close', code, reason: entry.close.reason ?? '', wasClean: entry.close.wasClean ?? code !== 1006 });
        }
      });
    }
    return socket;
  }
}

/** A `WebSocket` class over this world (SOCKET above): the handler properties, `binaryType`, `readyState`, `send`, `close`. */
export function worldWebSocket(world: World): new (url: unknown, protocols?: unknown) => unknown {
  return class WorldWebSocketFace {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    binaryType = 'blob';
    readonly bufferedAmount = 0;
    readonly protocol = '';
    readonly url: string;
    onopen: ((e: unknown) => void) | null = null;
    onmessage: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onclose: ((e: unknown) => void) | null = null;
    private readonly socket: WorldSocket;

    constructor(url: unknown, protocols?: unknown) {
      this.url = String(url);
      this.socket = world.sockets.open(url, protocols, (e) => {
        if (e.kind === 'open') this.onopen?.call(this, { type: 'open', target: this });
        else if (e.kind === 'message') this.onmessage?.call(this, { type: 'message', target: this, data: e.data });
        else if (e.kind === 'binary') {
          const bytes = new Uint8Array(e.bytes);
          this.onmessage?.call(this, { type: 'message', target: this, data: this.binaryType === 'arraybuffer' ? bytes.buffer : new Blob([bytes]) });
        } else if (e.kind === 'error') this.onerror?.call(this, { type: 'error', target: this });
        else this.onclose?.call(this, { type: 'close', target: this, code: e.code, reason: e.reason, wasClean: e.wasClean });
      });
    }

    get readyState(): number {
      return this.socket.readyState;
    }

    send(data: unknown): void {
      this.socket.send(data);
    }

    close(code?: unknown, reason?: unknown): void {
      this.socket.close(code, reason);
    }
  };
}

export class World {
  readonly script: WorldScript;
  readonly clock = new Clock();
  readonly random: Random;
  readonly network: Network;
  readonly registry: Registry;
  /** The IANA zone the play runs in (TIME ZONE above): the script's, or `UTC`. */
  readonly timeZone: string;
  /** The viewport (VIEWPORT above), or none: a server render. */
  readonly viewport: Viewport | undefined;
  /** The location (LOCATION above) — exactly when there is a window. */
  readonly location: WorldLocation | undefined;
  /** The project's settings (PROJECT above). */
  readonly projectSettings: Readonly<Record<string, unknown>>;
  /** The Component Stacks (STACK above) — always: a play with none registered queues every push. */
  readonly stack: WorldStack;
  /** The Routers (ROUTE above) — always: a play with none registered queues every navigate. */
  readonly router: WorldRouter;
  /** The popups (POPUP above) — always: a play with no script has a host and no components. */
  readonly popup: WorldPopup;
  /** The backends (BACKEND above) — always: a play with no script has one, `main`, that answers nothing. */
  readonly backend: WorldBackend;
  /** The person at the file dialog (PICKER above) — always; `present` only when the script has a `picker`. */
  readonly picker: WorldPicker;
  /** The project's cloud services (PROJECT above, s32), or none. */
  readonly cloudServices: Readonly<CloudServicesScript> | undefined;
  /** The WebSocket servers (SOCKET above, s34) — always: a play with no script answers no construction. */
  readonly sockets: WorldSockets;
  /** NSP-022 s96: the backend process's services (HOST above). */
  readonly host: WorldHost;
  /** The Radio Button Group the node sits in (GROUP above, s42) — always: a play with no script has one, never written. */
  readonly group: WorldGroup;
  /** NSP-016 s62 — the registry writes made elsewhere (REGISTRY above), in script order. */
  readonly registryWrites: readonly RegistryWrite[];
  private readonly registryListeners: Array<(w: RegistryWrite) => void> = [];

  constructor(script: WorldScript = {}) {
    this.script = script;
    this.random = new Random(script.seed ?? 1);
    this.network = new Network(this.clock, script.network ?? []);
    this.registry = new Registry(this.random, script.registry);
    this.timeZone = script.timeZone ?? 'UTC';
    this.viewport = script.viewport ? new Viewport(this.clock, script.viewport) : undefined;
    this.location = this.viewport ? new WorldLocation(script.activation, script.location) : undefined;
    this.projectSettings = { ...(script.projectSettings ?? {}) };
    this.stack = new WorldStack(script.stack ?? {});
    this.router = new WorldRouter(script.router ?? {});
    this.popup = new WorldPopup(script.popup ?? {});
    this.backend = new WorldBackend(this.clock, script.backend ?? {});
    this.picker = new WorldPicker(this.clock, script.picker);
    this.cloudServices = script.cloudServices ? { ...script.cloudServices } : undefined;
    this.sockets = new WorldSockets(this.clock, script.sockets ?? {});
    this.host = new WorldHost(this.clock, script.host ?? {});
    this.group = new WorldGroup(script.group);
    // NSP-016 s62 — writes made elsewhere to the registry: world timers, scheduled before any node's
    this.registryWrites = (script.registry?.writes ?? []).map((w) => {
      if (!(w.at >= 1)) throw new Error(`world: a registry write is at ≥ 1 ms on the clock, not ${JSON.stringify(w.at)} — what the play starts with is the script's \`models\` and \`collections\``);
      return w;
    });
    for (const w of this.registryWrites) this.clock.schedule(w.at, () => [...this.registryListeners].forEach((l) => l(w)));
  }

  /**
   * NSP-016 s62 — called at each registry write made elsewhere (REGISTRY above), in the order subscribed. A target subscribes
   * ONCE per play and performs the write on the tables its nodes hold (`performRegistryWrite`). Returns the unsubscribe.
   */
  onRegistryWrite(listener: (w: RegistryWrite) => void): () => void {
    this.registryListeners.push(listener);
    return () => {
      const i = this.registryListeners.indexOf(listener);
      if (i >= 0) this.registryListeners.splice(i, 1);
    };
  }

  /** The AC5 check: every way this play touched something the script did not answer. */
  get violations(): string[] {
    return [...this.network.violations, ...this.backend.violations, ...this.sockets.violations, ...this.host.violations];
  }
}

// ------------------------------------------------------------------------------------------------
// the globals — how a target whose nodes reach the world through JavaScript's own seams
// (`setTimeout`, `fetch`, `XMLHttpRequest`, `crypto`, `Math.random`, `Date.now`) is pointed at this world.

export interface Installed {
  /** Puts every global back exactly as it was. */
  restore(): void;
  /** The real timer functions, for a harness that needs to yield to the event loop while the fakes are in place. */
  real: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
}

/** A `fetch` over this world: `init.signal` aborts through the world; a `Response` is built from the delivery. */
export function worldFetch(world: World): (input: unknown, init?: RequestInit) => Promise<Response> {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input && typeof input === 'object' && 'url' in (input as object) ? String((input as { url: unknown }).url) : String(input);
    return new Promise<Response>((resolve, reject) => {
      // s34 — a streamed body: a ReadableStream the world feeds, bytes as UTF-8; a reader's cancel tells the world
      let body: ReadableStreamDefaultController<Uint8Array> | undefined;
      const id = world.network.issue({ method: init?.method, url, headers: init?.headers, body: init?.body }, (d) => {
        if ('chunk' in d) body?.enqueue(new TextEncoder().encode(d.chunk));
        else if ('end' in d) body?.close();
        else if ('streamError' in d) body?.error(d.streamError.name === 'AbortError' ? new DOMException(d.streamError.message, 'AbortError') : new TypeError(d.streamError.message));
        else if ('aborted' in d) reject(new DOMException('This operation was aborted', 'AbortError'));
        else if ('error' in d) reject(Object.assign(new TypeError(d.error.message), { name: d.error.name }));
        else if (d.stream) {
          const stream = new ReadableStream<Uint8Array>({
            start: (c) => {
              body = c;
            },
            cancel: () => world.network.cancelStream(id)
          });
          resolve(new Response(NULL_BODY_STATUSES.has(d.status) ? null : stream, { status: d.status, statusText: d.statusText, headers: d.headers }));
        } else resolve(new Response(NULL_BODY_STATUSES.has(d.status) ? null : d.body, { status: d.status, statusText: d.statusText, headers: d.headers }));
      });
      const signal = init?.signal;
      if (signal) {
        if (signal.aborted) world.network.abort(id);
        else signal.addEventListener('abort', () => world.network.abort(id), { once: true });
      }
    });
  };
}

/** Statuses a `Response` may not carry a body for (the Fetch standard's null body statuses). */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * The XHR face of the world's network (NETWORK above, s32): the surface a node that talks through `XMLHttpRequest` reads —
 * `open`, `setRequestHeader`, `send`, `abort`, `readyState`, `status`, `statusText`, `response` / `responseText` and the
 * `onreadystatechange` / `onload` / `onerror` / `onabort` properties. Made per play by `worldXMLHttpRequest`.
 */
export interface WorldXMLHttpRequest {
  readyState: number;
  status: number;
  statusText: string;
  response: string;
  readonly responseText: string;
  onreadystatechange: ((e: unknown) => void) | null;
  onload: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onabort: ((e: unknown) => void) | null;
  open(method: unknown, url: unknown): void;
  setRequestHeader(name: unknown, value: unknown): void;
  send(body?: unknown): void;
  abort(): void;
}

/** An `XMLHttpRequest` class over this world (NETWORK above, TWO FACES). */
export function worldXMLHttpRequest(world: World): new () => WorldXMLHttpRequest {
  return class implements WorldXMLHttpRequest {
    readyState = 0;
    status = 0;
    statusText = '';
    response = '';
    onreadystatechange: ((e: unknown) => void) | null = null;
    onload: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    onabort: ((e: unknown) => void) | null = null;
    private method: unknown;
    private url: unknown;
    private headers: Record<string, string> = {};
    private id: number | undefined;

    get responseText(): string {
      return this.response;
    }

    open(method: unknown, url: unknown): void {
      this.method = method;
      this.url = url;
      this.headers = {};
      this.id = undefined;
      this.state(1);
    }

    setRequestHeader(name: unknown, value: unknown): void {
      const key = String(name);
      const v = String(value);
      const held = Object.keys(this.headers).find((k) => k.toLowerCase() === key.toLowerCase());
      if (held === undefined) this.headers[key] = v;
      else this.headers[held] = this.headers[held] + ', ' + v;
    }

    send(body?: unknown): void {
      this.id = world.network.issue({ method: this.method, url: this.url, headers: this.headers, body: body === null ? undefined : body }, (d) => {
        if (!('status' in d || 'error' in d || 'aborted' in d) || ('stream' in d && d.stream)) throw new Error('world: a streamed body (chunks) answers a fetch only — an XHR waits for the whole body');
        void Promise.resolve().then(() => this.land(d));
      });
    }

    abort(): void {
      if (this.id !== undefined) world.network.abort(this.id);
    }

    private land(d: Delivery): void {
      if ('status' in d) {
        this.status = d.status;
        this.statusText = d.statusText;
        this.response = d.body ?? '';
        this.state(2);
        this.state(3);
        this.state(4);
        this.fire(this.onload, 'load');
        return;
      }
      this.status = 0;
      this.response = '';
      this.state(4);
      if ('aborted' in d) this.fire(this.onabort, 'abort');
      else this.fire(this.onerror, 'error');
    }

    private state(n: number): void {
      this.readyState = n;
      this.fire(this.onreadystatechange, 'readystatechange');
    }

    /** A DOM dispatch: a handler's throw is reported, never propagated (NETWORK above, TWO FACES). */
    private fire(handler: ((e: unknown) => void) | null, type: string): void {
      if (typeof handler !== 'function') return;
      try {
        handler.call(this, { type, target: this });
      } catch {
        // the DOM's "report the exception" — the play has no console to report to
      }
    }
  };
}

/**
 * Makes the world's zone the process's for a play (TIME ZONE above) and hands back the undo.
 * `process.env.TZ` is the one seam Node has: V8 drops its cached zone on every assignment, so a
 * `Date` constructed after the assignment reads the new rules — measured on Node 20 (2026-10-01,
 * NSP-013) before it was relied on. A target with no `process` (a browser) gets the undo and
 * nothing else, and must refuse a `timezone` need itself. A test file that plays a `timezone`
 * spec runs under tests/jest-env-real-process.js (see its header): jest's sandboxed
 * `process.env` is a copy, and a write to it moves nothing.
 */
export function installTimeZone(world: World): () => void {
  // under jest the sandbox's `process.env` is a copy V8 never hears about (jest-util
  // createProcessObject); tests/jest-env-real-process.js hands the real one over on this global
  const g = globalThis as { process?: { env?: Record<string, string | undefined> }; __nodeSpecRealProcessEnv?: Record<string, string | undefined> };
  const env = g.__nodeSpecRealProcessEnv ?? g.process?.env;
  if (!env) return () => undefined;
  const previous = env.TZ;
  env.TZ = world.timeZone;
  return () => {
    if (previous === undefined) delete env.TZ;
    else env.TZ = previous;
  };
}

/** WebCrypto's digest names, the three WebCrypto has (crypto/encoding.ts `DigestAlgorithm`), each to the package's own SHA-2 (sha2.ts; OWN-002: no Node `crypto`, so a page gets the same bytes). */
const DIGESTS: Readonly<Record<string, (data: Uint8Array) => Uint8Array>> = Object.freeze({ 'SHA-256': sha256, 'SHA-384': sha384, 'SHA-512': sha512 });

/**
 * The world's digest (DIGEST above): the standard's bytes for a name WebCrypto knows, computed
 * now. An unknown name throws — the message a node's `Error` port then carries, on every target.
 */
export function digestBytes(algorithm: unknown, data: Uint8Array): Uint8Array {
  const fn = DIGESTS[String(algorithm)];
  if (!fn) throw new Error(`Unrecognized algorithm name: ${String(algorithm)}`);
  return fn(data);
}

/** The block size of each digest HMAC is built on (RFC 2104 `B`): 64 bytes for SHA-256, 128 for the 512 family. */
const HMAC_BLOCK: Readonly<Record<string, number>> = Object.freeze({ 'SHA-256': 64, 'SHA-384': 128, 'SHA-512': 128 });

/**
 * The world's keyed sign (DIGEST above): the HMAC of `data` under `key` on the named SHA-2, computed now. An unknown name
 * throws `digestBytes`'s message; an empty key throws WebCrypto's (`importKey` refuses it before any sign).
 */
export function hmacBytes(algorithm: unknown, key: Uint8Array, data: Uint8Array): Uint8Array {
  const fn = DIGESTS[String(algorithm)];
  if (!fn) throw new Error(`Unrecognized algorithm name: ${String(algorithm)}`);
  if (key.length === 0) throw new Error('Zero-length key is not supported');
  return hmac(fn, HMAC_BLOCK[String(algorithm)], key, data);
}

/** A key the world's `importKey` made: the hash it was imported for and its raw bytes. */
class WorldHmacKey {
  constructor(readonly hash: unknown, readonly bytes: Uint8Array) {}
}

/**
 * Installs the world into the globals for the duration of a play. Everything is restored by
 * `restore()`, whatever happened. `crypto.subtle.digest` is the world's (DIGEST above); the rest
 * of `subtle` stays the host's. The process's zone becomes the world's (TIME ZONE above).
 */
export function installWorld(world: World): Installed {
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const define = (name: string, value: unknown) => {
    saved.set(name, Object.getOwnPropertyDescriptor(g, name));
    Object.defineProperty(g, name, { value, configurable: true, writable: true, enumerable: false });
  };
  const real = { setTimeout: g.setTimeout as typeof setTimeout, clearTimeout: g.clearTimeout as typeof clearTimeout };
  const mathRandom = Math.random;
  const dateNow = Date.now;
  const perf = g.performance as { now?: () => number } | undefined;
  const perfNow = perf?.now;

  const timers = new Map<number, number>(); // fake handle → clock id
  let nextHandle = 1;
  const fakeSetTimeout = (fn: (...a: unknown[]) => void, ms?: unknown, ...args: unknown[]) => {
    const handle = nextHandle++;
    timers.set(handle, world.clock.schedule(ms, () => {
      timers.delete(handle);
      fn(...args);
    }));
    return handle;
  };
  const fakeClearTimeout = (handle: unknown) => {
    const id = timers.get(handle as number);
    if (id !== undefined) {
      world.clock.cancel(id);
      timers.delete(handle as number);
    }
  };
  define('setTimeout', fakeSetTimeout);
  define('clearTimeout', fakeClearTimeout);
  define('fetch', worldFetch(world));
  define('XMLHttpRequest', worldXMLHttpRequest(world));
  // SOCKET (s34): the world's WebSocket in every play — a host's would reach a real network; no EventSource at all
  define('WebSocket', worldWebSocket(world));
  define('EventSource', undefined);
  const restoreZone = installTimeZone(world);
  define('crypto', {
    subtle: {
      importKey: (format: unknown, keyData: Uint8Array, algorithm: { name?: unknown; hash?: { name?: unknown } | string } | undefined): Promise<WorldHmacKey> => {
        if (format !== 'raw' || algorithm?.name !== 'HMAC') return Promise.reject(new Error(`world: importKey(${String(format)}, ${String(algorithm?.name)}) — the play's crypto imports only a raw HMAC key (DIGEST)`));
        const hash = typeof algorithm.hash === 'string' ? algorithm.hash : algorithm.hash?.name;
        if (!DIGESTS[String(hash)]) return Promise.reject(new Error(`Unrecognized algorithm name: ${String(hash)}`));
        if (keyData.length === 0) return Promise.reject(new Error('Zero-length key is not supported'));
        return Promise.resolve(new WorldHmacKey(hash, new Uint8Array(keyData)));
      },
      sign: (algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer> => {
        const name = typeof algorithm === 'string' ? algorithm : (algorithm as { name?: unknown } | undefined)?.name;
        if (name !== 'HMAC' || !(key instanceof WorldHmacKey)) return Promise.reject(new Error(`world: sign(${String(name)}) — the play's crypto signs only with an HMAC key it imported (DIGEST)`));
        const bytes = hmacBytes(key.hash, key.bytes, data);
        return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      },
      digest: (algorithm: unknown, data: Uint8Array): Promise<ArrayBuffer> => {
        try {
          const bytes = digestBytes(algorithm, data);
          return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
        } catch (e) {
          return Promise.reject(e);
        }
      }
    },
    getRandomValues: (arr: Uint8Array) => {
      arr.set(world.random.bytes(arr.length));
      return arr;
    },
    randomUUID: () => world.random.uuid()
  });
  // VIEWPORT: a window only when the script has a viewport — none is a server render, left as the host has it
  const viewport = world.viewport;
  const location = world.location;
  if (viewport && location) {
    const subscribed = new Map<unknown, () => void>();
    // LOCATION: `navigator.userActivation` only when the script says what it is
    const navigator = location.activation === undefined ? {} : { userActivation: { isActive: location.activation } };
    const parts = () => new URL(location.href);
    const pageLocation = {
      get href() {
        return location.href;
      },
      get origin() {
        return parts().origin;
      },
      get pathname() {
        return parts().pathname;
      },
      get search() {
        return parts().search;
      },
      get hash() {
        return parts().hash;
      }
    };
    const history = {
      pushState: (_state: unknown, _title: unknown, url?: unknown) => location.push(url),
      replaceState: (_state: unknown, _title: unknown, url?: unknown) => location.replace(url),
      back: () => location.back()
    };
    const dispatchEvent = (event: { type: string }) => location.dispatch(event);
    const unsubscribe = new Map<string, Map<unknown, () => void>>();
    define('window', {
      navigator,
      location: pageLocation,
      history,
      dispatchEvent,
      open: (url: unknown, target: unknown, features: unknown) => location.open(url, target, features),
      get innerWidth() {
        return viewport.width;
      },
      get innerHeight() {
        return viewport.height;
      },
      addEventListener(type: string, fn: (e: unknown) => void) {
        if (type === 'resize') {
          if (subscribed.has(fn)) return;
          subscribed.set(fn, viewport.listen(() => fn({ type: 'resize' })));
          return;
        }
        if (type !== 'popstate' && type !== 'hashchange') return;
        const byFn = unsubscribe.get(type) ?? new Map<unknown, () => void>();
        unsubscribe.set(type, byFn);
        if (!byFn.has(fn)) byFn.set(fn, location.listen(type, fn));
      },
      removeEventListener(type: string, fn: unknown) {
        if (type === 'resize') {
          subscribed.get(fn)?.();
          subscribed.delete(fn);
          return;
        }
        unsubscribe.get(type)?.get(fn)?.();
        unsubscribe.get(type)?.delete(fn);
      }
    });
    // a page's globals ARE its window's: `location.hash`, `history.pushState`, a bare `dispatchEvent(…)`
    define('location', pageLocation);
    define('history', history);
    define('dispatchEvent', dispatchEvent);
    define(
      'PopStateEvent',
      class PopStateEvent {
        readonly type: string;
        readonly state: unknown;
        constructor(type: string, init?: { state?: unknown }) {
          this.type = type;
          this.state = init?.state ?? null;
        }
      }
    );
  }
  // PICKER: a `document` only when the script has a picker — none otherwise, as the host has it
  if (world.picker.present) {
    define('document', {
      createElement(tag: unknown) {
        if (String(tag).toLowerCase() !== 'input') throw new Error(`world: document.createElement(${String(tag)}) — the play's document makes only a file input (PICKER)`);
        return new WorldFileInput(world.picker);
      }
    });
  }
  // HOST (NSP-022 s96): a global per service the process has — none for one it has not
  for (const service of HOST_SERVICES) {
    const name = HOST_GLOBALS[service];
    if (!world.host.has(service)) {
      define(name, undefined);
      continue;
    }
    if (service === 'secrets') {
      define(name, (secretName: unknown) => {
        const d = world.host.lookup(secretName);
        if ('threw' in d) throw new Error(d.threw);
        return d.ok;
      });
    } else {
      define(name, (request: unknown) => new Promise((resolve, reject) => world.host.issue({ service, request }, (d) => ('threw' in d ? reject(new Error(d.threw)) : resolve(d.ok)))));
    }
  }
  // PROJECT: the settings a node reads through the runtime are the target's to install (the runtime target's `install`)
  Math.random = () => world.random.next();
  Date.now = () => world.clock.now();
  if (perf && perfNow) perf.now = () => world.clock.now();

  return {
    real,
    restore() {
      for (const [name, desc] of saved) {
        if (desc) Object.defineProperty(g, name, desc);
        else delete g[name];
      }
      Math.random = mathRandom;
      Date.now = dateNow;
      if (perf && perfNow) perf.now = perfNow;
      restoreZone();
    }
  };
}
