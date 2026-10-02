# The census — every picker node, its tier, and where its behaviour is written

**Generated 2026-10-02 by `scripts/node-spec/census.js` — do not edit by hand; edit `tiers.json` and regenerate.**

Catalog format 1.1.0: **180** node types, of which **147** are in the picker and not deprecated (the population), **33** excluded (listed at the end). Cardinality checked both ways by the script.

How every column is found is in the header of the script. `tests` is an upper bound (files that quote the type name, counted, not read); `typed` counts only files where the name follows a type-ish key and is what the drift order uses.

## Phase-level facts

- **91** of 147 nodes call `beginOutcome` (the ERG-001 outcome contract) — their specs carry an outcome on every signal path.
- **68** have dynamic ports — NSP-001's derived-port design is not a corner case.
- **99** are named as a string literal somewhere in `plan.ts` (the exporter's special cases).
- P18 export status over the population: translated 122 · stubbed 1 · deferred 7 · backend-only 17.
- **9** nodes are named by **no test file at all**, even loosely: Delete User (`noodl.cloud.deleteuser`), HMAC (`noodl.cloud.hmac`), JWT Sign (`noodl.cloud.jwtsign`), JWT Verify (`noodl.cloud.jwtverify`), List Users In Role (`noodl.cloud.listusersinrole`), Model Request (`noodl.cloud.modelrequest`), Remove User From Role (`noodl.cloud.removeuserfromrole`), Update User (`noodl.cloud.updateuser`), Verify Session Token (`noodl.cloud.verifysessiontoken`). For these the spec would be the first test.

## Totals by tier

| tier | what | nodes |
|---|---|---:|
| **T1** | pure / state machine | 46 |
| **T2** | clock, randomness & environment | 11 |
| **T3** | network & backend | 39 |
| **T4** | graph | 27 |
| **T5** | visual | 19 |
| **T6** | escape hatch | 5 |
| | **total** | **147** |

## Totals by batch

| batch | what | nodes | tiers |
|---|---|---:|---|
| [NSP-004](NSP-004-THE-PILOT-FIVE.md) | the pilot five | 5 | T1 ×5 |
| [NSP-011](NSP-011-BATCH-LOGIC-MATH-STRINGS.md) | logic, math, strings, variables, converters | 13 | T1 ×13 |
| [NSP-012](NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md) | arrays, objects, variables, stores, events | 26 | T1 ×13, T4 ×13 |
| [NSP-013](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md) | dates, time, randomness, parsers, animation | 24 | T1 ×14, T2 ×10 |
| [NSP-014](NSP-014-BATCH-DATA-AND-CLOUD.md) | records, users, files, HTTP, streams (the browser half; s21 split) | 24 | T1 ×1, T2 ×1, T3 ×22 |
| [NSP-015](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md) | navigation, popups, component utilities | 14 | T4 ×14 |
| [NSP-016](NSP-016-VISUAL-NODES.md) | visual nodes | 19 | T5 ×19 |
| [NSP-017](NSP-017-THE-ESCAPE-HATCHES.md) | the escape hatches | 5 | T6 ×5 |
| [NSP-022](NSP-022-BATCH-CLOUD-ONLY.md) | the cloud-only nodes (split from NSP-014, s21) | 17 | T3 ×17 |
| | **total** | **147** | 5 pilot + 142 in batches |

## The ten nodes whose behaviour is written in the most places

The drift-risk order: `placesWritten` = the runtime file + `plan.ts` lines that name the type + emit libs that name it + test files that name it after a type key (`typed`; the loose count is beside it).

| # | node | tier | batch | places | plan.ts lines | emit libs | tests typed | tests loose |
|---:|---|---|---|---:|---:|---|---:|---:|
| 1 | **Text** | T5 | NSP-016 | 58 | 1 | sseLib.ts | 55 | 92 |
| 2 | **Group** | T5 | NSP-016 | 57 | 0 | — | 56 | 93 |
| 3 | **Set Variable** | T1 | NSP-012 | 49 | 12 | — | 36 | 43 |
| 4 | **Repeater** (`For Each`) | T5 | NSP-016 | 46 | 24 | — | 21 | 49 |
| 5 | **Component Inputs** | T4 | NSP-015 | 34 | 10 | — | 23 | 47 |
| 6 | **Component Outputs** | T4 | NSP-015 | 34 | 20 | — | 13 | 25 |
| 7 | **String** | T1 | NSP-011 | 27 | 1 | — | 25 | 36 |
| 8 | **Button** (`net.noodl.controls.button`) | T5 | NSP-016 | 25 | 0 | — | 24 | 39 |
| 9 | **Variable** (`Variable2`) | T1 | NSP-012 | 22 | 5 | — | 16 | 24 |
| 10 | **States** | T2 | NSP-013 | 21 | 10 | statesLib.ts | 9 | 25 |

## Every node

`out` = uses the outcome contract (`beginOutcome`); `dyn` = has dynamic ports; `plan` = lines in `plan.ts`; `tests` = typed / loose test-file counts across runtime / viewer-react / viewer-cloud / core / export / mcp.

### NSP-004 — the pilot five (5)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **And** | `And` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/and.ts` |  | ✓ | 3 |  | translated | 1 / 4 |  |
| **Condition** | `Condition` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/condition.ts` | ✓ |  | 7 |  | translated | 9 / 19 |  |
| **Counter** | `Counter` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/counter.ts` | ✓ |  | 3 |  | translated | 6 / 13 |  |
| **String Format** | `String Format` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/stringformat.ts` |  | ✓ | 3 |  | translated | 3 / 5 | dynamic ports from a parameter — proves NSP-001's derived-port design |
| **Switch** | `Switch` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/switch.ts` | ✓ |  | 4 |  | translated | 6 / 10 |  |

### NSP-011 — logic, math, strings, variables, converters (13)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Boolean** | `Boolean` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/variables/boolean.ts` |  |  | 1 |  | translated | 9 / 13 | carries the coercion table — spec first |
| **Boolean To String** | `Boolean To String` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/booleantostring.ts` |  |  | 2 | utilLib | translated | 1 / 1 |  |
| **Color** | `Color` | T1 | browser | `noodl-viewer-react/src/nodes/std-library/variables/color.ts` |  |  | 0 |  | translated | 0 / 5 | carries the coercion table — spec first |
| **Color Blend** | `Color Blend` | T1 | browser | `noodl-viewer-react/src/nodes/std-library/colorblend.ts` |  | ✓ | 3 | utilLib | translated | 2 / 3 |  |
| **Inverter** | `Inverter` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/inverter.ts` |  |  | 2 |  | translated | 0 / 3 |  |
| **Log** | `net.noodl.Log` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/log.ts` | ✓ |  | 1 |  | translated | 2 / 4 | the console line is an effect routed to the world (NSP-007), checked not ignored |
| **Number** | `Number` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/variables/number.ts` |  |  | 1 | animateLib | translated | 16 / 22 | carries the coercion table — spec first |
| **Number Remapper** | `Number Remapper` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/numberremapper.ts` |  |  | 4 | utilLib | translated | 2 / 2 | first node where units (C10) matter |
| **Or** | `Or` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/or.ts` |  | ✓ | 2 |  | translated | 0 / 1 |  |
| **String** | `String` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/variables/string.ts` |  |  | 1 |  | translated | 25 / 36 | carries the coercion table — spec first |
| **String Mapper** | `String Mapper` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/stringmapper.ts` |  | ✓ | 7 | utilLib | translated | 1 / 2 |  |
| **Substring** | `Substring` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/substring.ts` |  |  | 6 | utilLib | translated | 1 / 2 |  |
| **Value Changed** | `Value Changed` | T1 | browser | `noodl-viewer-react/src/nodes/std-library/valuechanged.ts` |  |  | 6 |  | translated | 5 / 10 | defined by equality; the rule for objects, NaN and -0 feeds the canonicaliser |

### NSP-012 — arrays, objects, variables, stores, events (26)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Array** | `Collection2` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/collectionnode2.ts` | ✓ |  | 8 |  | translated | 5 / 8 | shared identity by id is a graph scenario (NSP-008); the node alone is pure |
| **Clear Array** | `CollectionClear` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/collectionnode-clear.ts` | ✓ |  | 2 |  | translated | 6 / 6 | mutates a shared array — the trace must show mutation, not replacement |
| **Insert Object Into Array** | `CollectionInsert` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/collectionnode-insert.ts` | ✓ |  | 3 |  | translated | 4 / 4 | mutates a shared array |
| **Create New Array** | `CollectionNew` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/collectionnode-new.ts` | ✓ |  | 0 |  | translated | 4 / 4 |  |
| **Remove Object From Array** | `CollectionRemove` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/collectionnode-remove.ts` | ✓ |  | 3 |  | translated | 3 / 3 | mutates a shared array |
| **Receive Event** | `Event Receiver` | T4 | browser | `noodl-viewer-react/src/nodes/std-library/eventreceiver.ts` |  | ✓ | 3 |  | translated | 3 / 3 |  |
| **Send Event** | `Event Sender` | T4 | browser | `noodl-viewer-react/src/nodes/std-library/eventsender.ts` | ✓ | ✓ | 6 |  | translated | 6 / 6 | channel names and propagation scope — each scope is a graph scenario |
| **Array Filter** | `Filter Collection` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts` | ✓ | ✓ | 2 |  | translated | 4 / 8 |  |
| **Repeater Item** | `For Each Actions` | T4 | browser | `noodl-viewer-react/src/nodes/std-library/data/foreachactions.ts` | ✓ |  | 2 |  | translated | 2 / 3 | reads the surrounding Repeater's row |
| **Array Map** | `Map Collection` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/mapcollectionnode.ts` | ✓ |  | 4 |  | translated | 3 / 7 |  |
| **Object** | `Model2` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/modelnode2.ts` | ✓ | ✓ | 3 |  | translated | 6 / 13 | an Object with id x in two components is the same object — graph scenario; the node alone is pure |
| **Action Dispatcher** | `net.noodl.ActionDispatcher` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/actiondispatchernode.ts` | ✓ |  | 0 |  | deferred | 0 / 3 | dispatcher and handler are one behaviour across two nodes |
| **Action Handler** | `net.noodl.ActionHandler` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/actionhandlernode.ts` | ✓ |  | 0 |  | deferred | 1 / 4 |  |
| **Global Store** | `net.noodl.GlobalStore` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/globalstorenode.ts` |  |  | 0 |  | translated | 2 / 5 | meaning needs a second node reading the same store |
| **Set Global Store** | `net.noodl.GlobalStore.Set` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/globalstoresetnode.ts` | ✓ |  | 1 |  | translated | 4 / 7 |  |
| **Subscribe to Store** | `net.noodl.GlobalStore.Subscribe` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/globalstoresubscribenode.ts` |  |  | 0 |  | translated | 4 / 6 |  |
| **Optimistic Update** | `net.noodl.OptimisticUpdate` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/optimisticupdatenode.ts` | ✓ |  | 0 |  | deferred | 0 / 2 |  |
| **State History** | `net.noodl.StateHistory` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/statehistorynode.ts` | ✓ |  | 0 |  | deferred | 3 / 4 | observes other nodes' models |
| **Undo / Redo** | `net.noodl.StateHistory.Undo` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/undonode.ts` | ✓ |  | 0 |  | deferred | 2 / 3 |  |
| **State Snapshot** | `net.noodl.StateSnapshot` | T4 | browser | `noodl-runtime/src/nodes/std-library/agent/statesnapshotnode.ts` | ✓ |  | 0 |  | deferred | 1 / 3 |  |
| **Create New Object** | `NewModel` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/newmodelnode.ts` | ✓ | ✓ | 2 |  | translated | 0 / 2 |  |
| **Run Tasks** | `RunTasks` | T4 | browser+cloud | `noodl-runtime/src/nodes/std-library/runtasks.ts` | ✓ |  | 4 | errorsLib, runTasksLib | translated | 11 / 13 | runs a template component per item — graph by construction |
| **Set Variable** | `Set Variable` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/setvariablenode.ts` | ✓ | ✓ | 12 |  | translated | 36 / 43 |  |
| **Set Object Properties** | `SetModelProperties` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/setmodelpropertiesnode.ts` |  | ✓ | 1 |  | translated | 2 / 6 |  |
| **Static Array** | `Static Data` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/staticdata.ts` |  | ✓ | 8 |  | translated | 5 / 14 |  |
| **Variable** | `Variable2` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/variablenode2.ts` | ✓ |  | 5 |  | translated | 16 / 24 |  |

### NSP-013 — dates, time, randomness, parsers, animation (24)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Date To String** | `Date To String` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/datetostring.ts` |  |  | 3 | dateLib | translated | 3 / 8 |  |
| **Animate To Value** | `net.noodl.animatetovalue` | T2 | browser | `noodl-viewer-react/src/nodes/std-library/animate-to-value.ts` |  |  | 1 |  | translated | 1 / 4 |  |
| **Date Add** | `net.noodl.DateAdd` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/date/dateadd.ts` |  |  | 1 |  | translated | 1 / 3 | pure given its inputs; the zone and locale come from the world |
| **Date Compare** | `net.noodl.DateCompare` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/date/datecompare.ts` |  |  | 1 |  | translated | 1 / 2 |  |
| **Date Difference** | `net.noodl.DateDifference` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/date/datedifference.ts` |  |  | 1 |  | translated | 1 / 2 |  |
| **Date Parts** | `net.noodl.DateParts` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/date/dateparts.ts` |  |  | 1 |  | translated | 1 / 2 |  |
| **Hash** | `net.noodl.Hash` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/crypto/hash.ts` | ✓ |  | 1 |  | translated | 1 / 3 | deterministic — no entropy |
| **JSON Stream Parser** | `net.noodl.JSONStreamParser` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/agent/json-stream-parser.ts` | ✓ |  | 1 | streamingLib | translated | 2 / 5 |  |
| **Now** | `net.noodl.Now` | T2 | browser+cloud | `noodl-runtime/src/nodes/std-library/date/now.ts` | ✓ |  | 1 |  | translated | 3 / 4 |  |
| **Parse CSV** | `net.noodl.ParseCSV` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/parsecsv.ts` |  |  | 1 |  | translated | 1 / 4 |  |
| **Parse Feed** | `net.noodl.ParseFeed` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/parsefeed.ts` |  |  | 1 |  | translated | 1 / 2 |  |
| **Parse XML** | `net.noodl.ParseXML` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/parsexml.ts` |  |  | 1 |  | translated | 1 / 2 |  |
| **Pattern Extractor** | `net.noodl.PatternExtractor` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/agent/pattern-extractor.ts` | ✓ |  | 1 |  | translated | 2 / 4 |  |
| **Random Bytes** | `net.noodl.RandomBytes` | T2 | browser+cloud | `noodl-runtime/src/nodes/std-library/crypto/randombytes.ts` | ✓ |  | 1 |  | translated | 1 / 2 |  |
| **Stream Buffer** | `net.noodl.StreamBuffer` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/agent/stream-buffer.ts` | ✓ |  | 1 | streamingLib | translated | 2 / 5 |  |
| **Text Accumulator** | `net.noodl.TextAccumulator` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/agent/text-accumulator.ts` | ✓ |  | 1 | streamingLib | translated | 2 / 7 |  |
| **To CSV** | `net.noodl.ToCSV` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/tocsv.ts` |  |  | 2 |  | translated | 1 / 4 |  |
| **UUID** | `net.noodl.UUID` | T2 | browser+cloud | `noodl-runtime/src/nodes/std-library/crypto/uuid.ts` | ✓ |  | 1 |  | translated | 2 / 3 |  |
| **On App Error** | `On App Error` | T2 | browser+cloud | `noodl-runtime/src/nodes/std-library/onapperror.ts` |  |  | 11 | errorsLib, realtimeLib | translated | 3 / 14 | listens to the environment's error stream — world-fed |
| **Repeat** | `Repeat` | T2 | browser | `noodl-viewer-react/src/nodes/std-library/repeat.ts` | ✓ |  | 4 | repeatLib | translated | 2 / 6 |  |
| **Screen Resolution** | `Screen Resolution` | T2 | browser | `noodl-viewer-react/src/nodes/std-library/screenresolution.ts` |  |  | 8 | screenLib | translated | 0 / 3 | reads the environment (window size) — world-fed |
| **States** | `States` | T2 | browser | `noodl-viewer-react/src/nodes/std-library/states.ts` | ✓ | ✓ | 10 | statesLib | translated | 9 / 25 | sits in Animation; a state machine (T1 shape) with timed transitions — the clock decides the tier |
| **Delay** | `Timer` | T2 | browser | `noodl-viewer-react/src/nodes/std-library/timer.ts` | ✓ |  | 4 |  | translated | 3 / 11 | one-shot, not a ticker |
| **Unique Id** | `Unique Id` | T2 | browser+cloud | `noodl-runtime/src/nodes/std-library/uniqueid.ts` | ✓ |  | 15 | idLib | translated | 4 / 5 | sits in String Manipulation but needs randomness |

### NSP-014 — records, users, files, HTTP, streams (the browser half; s21 split) (24)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Add Record Relation** | `AddDbModelRelation` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/dbmodelnode-addrelation.ts` | ✓ | ✓ | 0 |  | translated | 3 / 4 |  |
| **Cloud File** | `Cloud File` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/cloudfilenode.ts` |  |  | 19 |  | translated | 0 / 2 |  |
| **Cloud Function** | `CloudFunction2` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/data/cloudfunction2.ts` | ✓ | ✓ | 2 | errorsLib | translated | 4 / 14 |  |
| **Query Records** | `DbCollection2` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/dbcollectionnode2.ts` |  | ✓ | 5 |  | stubbed | 2 / 20 | the request is part of the behaviour |
| **Record** | `DbModel2` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/dbmodelnode2.ts` | ✓ | ✓ | 4 |  | translated | 6 / 12 |  |
| **Delete Record** | `DeleteDbModelProperties` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/deletedbmodelpropertiesnode.ts` | ✓ | ✓ | 0 |  | translated | 3 / 12 |  |
| **Filter Records** | `FilterDBModels` | T1 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/filterdbmodelsnode.ts` | ✓ | ✓ | 2 |  | translated | 3 / 5 | client-side over the store ('one subscription, no requests' — filterdbmodelsnode.ts:42), so T1 with the store as a world fake |
| **HTTP Request** | `net.noodl.HTTP` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/httpnode.ts` | ✓ | ✓ | 1 |  | translated | 6 / 10 |  |
| **Server-Sent Events** | `net.noodl.SSE` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/agent/sse.ts` | ✓ |  | 1 | sseLib | translated | 3 / 7 |  |
| **Log In** | `net.noodl.user.LogIn` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/user/login.ts` | ✓ |  | 2 |  | translated | 3 / 6 |  |
| **Log Out** | `net.noodl.user.LogOut` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/user/logout.ts` | ✓ |  | 2 |  | translated | 3 / 6 |  |
| **Request Magic Link** | `net.noodl.user.RequestMagicLink` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/user/requestmagiclink.ts` | ✓ |  | 2 |  | translated | 2 / 3 |  |
| **Set User Properties** | `net.noodl.user.SetUserProperties` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/user/setuserproperties.ts` | ✓ | ✓ | 3 |  | translated | 3 / 5 |  |
| **Sign In With** | `net.noodl.user.SignInWith` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/user/signinwith.ts` | ✓ |  | 0 |  | deferred | 8 / 10 |  |
| **Sign Up** | `net.noodl.user.SignUp` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/user/signup.ts` | ✓ | ✓ | 2 |  | translated | 3 / 6 |  |
| **User** | `net.noodl.user.User` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/user/user.ts` | ✓ | ✓ | 3 |  | translated | 4 / 7 |  |
| **WebSocket** | `net.noodl.WebSocket` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/agent/websocket.ts` | ✓ |  | 1 | websocketLib | translated | 2 / 9 |  |
| **Create Record** | `NewDbModelProperties` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/newdbmodelpropertiesnode.ts` | ✓ | ✓ | 0 |  | translated | 6 / 18 |  |
| **Open File Picker** | `Open File Picker` | T2 | browser | `noodl-viewer-react/src/nodes/std-library/openfilepicker.ts` | ✓ |  | 5 |  | translated | 2 / 4 | no network — a DOM input and a user gesture; environment-fed, so T2, kept with the file family |
| **Remove Record Relation** | `RemoveDbModelRelation` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/dbmodelnode-removerelation.ts` | ✓ | ✓ | 0 |  | translated | 4 / 4 |  |
| **Update Record** | `SetDbModelProperties` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/setdbmodelpropertiesnode.ts` | ✓ | ✓ | 0 |  | translated | 4 / 14 |  |
| **Sign File URL** | `Sign File URL` | T3 | browser+cloud | `noodl-runtime/src/nodes/std-library/data/signfileurl.ts` | ✓ | ✓ | 8 |  | translated | 1 / 5 |  |
| **Subscribe To Changes** | `SubscribeToChanges` | T3 | browser | `noodl-runtime/src/nodes/std-library/data/subscribetochanges.ts` |  | ✓ | 1 | realtimeLib | translated | 2 / 5 |  |
| **Upload File** | `Upload File` | T3 | browser | `noodl-viewer-react/src/nodes/std-library/uploadfile.ts` | ✓ | ✓ | 5 |  | translated | 1 / 5 |  |

### NSP-015 — navigation, popups, component utilities (14)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Component Inputs** | `Component Inputs` | T4 | browser+cloud | `noodl-runtime/src/nodes/componentinputs.ts` |  | ✓ | 10 |  | translated | 23 / 47 | the interface every component depends on — parent + child scenarios, placed more than once |
| **Component Outputs** | `Component Outputs` | T4 | browser+cloud | `noodl-runtime/src/nodes/componentoutputs.ts` |  | ✓ | 20 |  | translated | 13 / 25 |  |
| **Close Popup** | `NavigationClosePopup` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/closepopup.ts` | ✓ | ✓ | 5 |  | translated | 4 / 6 | returns values to the Show Popup that opened it — the round trip is the scenario |
| **Show Popup** | `NavigationShowPopup` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/showpopup.ts` | ✓ | ✓ | 7 |  | translated | 9 / 12 |  |
| **Component Object** | `net.noodl.ComponentObject` | T4 | browser+cloud | `noodl-runtime/src/nodes/std-library/componentutils/componentobject.ts` | ✓ | ✓ | 1 |  | translated | 7 / 9 |  |
| **External Link** | `net.noodl.externallink` | T4 | browser | `noodl-viewer-react/src/nodes/std-library/externallink.ts` | ✓ |  | 1 |  | translated | 3 / 6 | the world records the last external URL opened |
| **Parent Component Object** | `net.noodl.ParentComponentObject` | T4 | browser | `noodl-viewer-react/src/nodes/std-library/componentutils/parentcomponentobject.ts` | ✓ | ✓ | 2 |  | translated | 5 / 6 |  |
| **Set Component Object Properties** | `net.noodl.SetComponentObjectProperties` | T4 | browser+cloud | `noodl-runtime/src/nodes/std-library/componentutils/setcomponentobjectproperties.ts` |  | ✓ | 1 |  | translated | 3 / 4 |  |
| **Set Parent Component Object Properties** | `net.noodl.SetParentComponentObjectProperties` | T4 | browser | `noodl-viewer-react/src/nodes/std-library/componentutils/setparentcomponentobjectproperties.ts` |  | ✓ | 2 |  | translated | 4 / 4 |  |
| **Page Inputs** | `PageInputs` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/page-inputs.ts` |  | ✓ | 5 |  | translated | 3 / 6 |  |
| **Push Component To Stack** | `PageStackNavigate` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/navigate.ts` | ✓ | ✓ | 1 |  | translated | 2 / 4 |  |
| **Pop Component Stack** | `PageStackNavigateBack` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/navigate-back.ts` | ✓ | ✓ | 1 |  | translated | 4 / 5 |  |
| **Navigate To Path** | `PageStackNavigateToPath` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/navigate-to-path.ts` | ✓ | ✓ | 1 |  | translated | 3 / 5 |  |
| **Navigate** | `RouterNavigate` | T4 | browser | `noodl-viewer-react/src/nodes/navigation/router-navigate.ts` | ✓ | ✓ | 4 |  | translated | 12 / 20 | observable as a location change in the world, not a rendered page |

### NSP-016 — visual nodes (19)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Shape** | `Circle` | T5 | browser | `noodl-viewer-react/src/nodes/visual/circle.ts` |  | ✓ | 0 |  | translated | 0 / 8 |  |
| **Component Children** | `Component Children` | T5 | browser | `noodl-runtime/src/nodelibraryexport.ts` |  |  | 4 |  | translated | 1 / 5 | providedBy noodl-editor in the catalog |
| **Drag** | `Drag` | T5 | browser | `noodl-viewer-react/src/nodes/visual/drag.ts` |  |  | 10 | dragLib | translated | 2 / 9 |  |
| **Repeater** | `For Each` | T5 | browser | `noodl-viewer-react/src/nodes/std-library/data/foreach.tsx` | ✓ | ✓ | 24 |  | translated | 21 / 49 |  |
| **Group** | `Group` | T5 | browser | `noodl-viewer-react/src/nodes/visual/group.ts` | ✓ | ✓ | 0 |  | translated | 56 / 93 |  |
| **Image** | `Image` | T5 | browser | `noodl-viewer-react/src/nodes/visual/image.ts` |  | ✓ | 0 |  | translated | 2 / 11 |  |
| **Button** | `net.noodl.controls.button` | T5 | browser | `noodl-viewer-react/src/nodes/controls/button.ts` |  | ✓ | 0 |  | translated | 24 / 39 |  |
| **Checkbox** | `net.noodl.controls.checkbox` | T5 | browser | `noodl-viewer-react/src/nodes/controls/checkbox.ts` | ✓ | ✓ | 1 |  | translated | 2 / 9 |  |
| **Dropdown** | `net.noodl.controls.options` | T5 | browser | `noodl-viewer-react/src/nodes/controls/options.ts` |  | ✓ | 0 |  | translated | 1 / 5 |  |
| **Radio Button** | `net.noodl.controls.radiobutton` | T5 | browser | `noodl-viewer-react/src/nodes/controls/radiobutton.ts` |  | ✓ | 0 |  | translated | 1 / 7 |  |
| **Slider** | `net.noodl.controls.range` | T5 | browser | `noodl-viewer-react/src/nodes/controls/slider.ts` |  | ✓ | 0 |  | translated | 1 / 4 |  |
| **Text Input** | `net.noodl.controls.textinput` | T5 | browser | `noodl-viewer-react/src/nodes/controls/text-input.ts` | ✓ | ✓ | 0 |  | translated | 8 / 18 |  |
| **Columns** | `net.noodl.visual.columns` | T5 | browser | `noodl-viewer-react/src/nodes/visual/columns.ts` |  |  | 0 |  | translated | 2 / 9 |  |
| **Icon** | `net.noodl.visual.icon` | T5 | browser | `noodl-viewer-react/src/nodes/visual/icon.ts` |  | ✓ | 0 |  | translated | 0 / 3 |  |
| **Component Stack** | `Page Stack` | T5 | browser | `noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx` | ✓ | ✓ | 4 |  | translated | 1 / 5 |  |
| **Radio Button Group** | `Radio Button Group` | T5 | browser | `noodl-viewer-react/src/nodes/controls/radiobuttongroup.ts` |  | ✓ | 0 |  | translated | 0 / 5 |  |
| **Page Router** | `Router` | T5 | browser | `noodl-viewer-react/src/nodes/navigation/router.tsx` | ✓ | ✓ | 5 |  | translated | 2 / 20 |  |
| **Text** | `Text` | T5 | browser | `noodl-viewer-react/src/nodes/visual/text.ts` |  | ✓ | 1 | sseLib | translated | 55 / 92 |  |
| **Video** | `Video` | T5 | browser | `noodl-viewer-react/src/nodes/visual/video.ts` |  | ✓ | 0 |  | translated | 0 / 8 |  |

### NSP-017 — the escape hatches (5)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **CSS Definition** | `CSS Definition` | T6 | browser | `noodl-viewer-react/src/nodes/visual/css-definition.ts` |  |  | 5 |  | translated | 1 / 5 | web-only by nature — exempt with that reason, or spec only its outputs |
| **Expression** | `Expression` | T6 | browser+cloud | `noodl-runtime/src/nodes/std-library/expression.ts` | ✓ | ✓ | 0 |  | translated | 12 / 23 | not really an escape hatch — its grammar is ours; the most valuable spec in the batch |
| **Script** | `Javascript2` | T6 | browser | `noodl-viewer-react/src/nodes/std-library/javascript.ts` |  | ✓ | 1 | scriptLib | translated | 2 / 6 |  |
| **Function** | `JavaScriptFunction` | T6 | browser+cloud | `noodl-runtime/src/nodes/std-library/simplejavascript.ts` | ✓ | ✓ | 0 |  | translated | 18 / 36 |  |
| **Visual Function** | `Logic Builder` | T6 | browser+cloud | `noodl-runtime/src/nodes/std-library/logic-builder.ts` | ✓ | ✓ | 0 |  | translated | 4 / 11 | the Blockly node; the user's blocks are the behaviour |

### NSP-022 — the cloud-only nodes (split from NSP-014, s21) (17)

| node | type name | tier | runs in | runtime file | out | dyn | plan | libs | export | tests | note |
|---|---|---|---|---|:-:|:-:|---:|---|---|---:|---|
| **Add User To Role** | `noodl.cloud.addusertorole` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/addusertorole.ts` | ✓ |  | 0 |  | backend-only | 0 / 3 |  |
| **Aggregate Records** | `noodl.cloud.aggregate` | T3 | cloud | `noodl-viewer-cloud/src/nodes/data/aggregatenode.js` |  | ✓ | 0 |  | backend-only | 0 / 1 | category Cloud Services but availableIn is cloud ONLY — the 17th cloud-only node |
| **Create User** | `noodl.cloud.createuser` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/createuser.ts` | ✓ | ✓ | 0 |  | backend-only | 0 / 1 |  |
| **Delete User** | `noodl.cloud.deleteuser` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/deleteuser.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 |  |
| **Get User Roles** | `noodl.cloud.getuserroles` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/getuserroles.ts` | ✓ |  | 0 |  | backend-only | 0 / 1 |  |
| **HMAC** | `noodl.cloud.hmac` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/hmac.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 | deterministic given the secret — T1 shape on the cloud target |
| **JWT Sign** | `noodl.cloud.jwtsign` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/jwtsign.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 | deterministic given key and clock |
| **JWT Verify** | `noodl.cloud.jwtverify` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/jwtverify.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 | needs the clock for expiry |
| **List Users In Role** | `noodl.cloud.listusersinrole` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/listusersinrole.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 |  |
| **Model Request** | `noodl.cloud.modelrequest` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 |  |
| **Remove User From Role** | `noodl.cloud.removeuserfromrole` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/removeuserfromrole.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 |  |
| **Request** | `noodl.cloud.request` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/request.ts` |  | ✓ | 0 |  | backend-only | 10 / 16 | the inbound request — a protocol's first event |
| **Response** | `noodl.cloud.response` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/response.ts` | ✓ | ✓ | 0 |  | backend-only | 9 / 14 | the outbound response — a protocol's last event |
| **Secret** | `noodl.cloud.secret` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/secret.ts` | ✓ |  | 0 |  | backend-only | 0 / 3 |  |
| **Send Email** | `noodl.cloud.sendemail` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/sendemail.ts` | ✓ |  | 0 |  | backend-only | 0 / 2 |  |
| **Update User** | `noodl.cloud.updateuser` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/updateuser.ts` | ✓ | ✓ | 0 |  | backend-only | 0 / 0 |  |
| **Verify Session Token** | `noodl.cloud.verifysessiontoken` | T3 | cloud | `noodl-viewer-cloud/src/nodes/cloud/verifysessiontoken.ts` | ✓ |  | 0 |  | backend-only | 0 / 0 |  |

## Excluded from the population (33)

| type name | display name | category | reason |
|---|---|---|---|
| `Animation` | Animation | Animation | deprecated |
| `Button` | Button | Visual | deprecated |
| `Checkbox` | Checkbox | Visual | deprecated |
| `Cloud Function` | Cloud Function | Cloud Services | deprecated |
| `Collection` | Array | Data | deprecated |
| `Component State` | Component Object | Component Utilities | deprecated |
| `DbCollection` | Query Collection | Cloud Services | deprecated |
| `DbModel` | Model | Cloud Services | deprecated |
| `Field Set` | Field Set | Visual | deprecated |
| `Form` | Form | Visual | deprecated |
| `Globals` | Globals | Utilities | deprecated |
| `Gyroscope` | Device Orientation | Sensors | deprecated |
| `Label` | Label | Visual | deprecated |
| `Model` | Object | Data | deprecated |
| `net.noodl.ArrayChanged` | Array Changed | Logic | not in the picker |
| `net.noodl.ObjectChanged` | Object Changed | Logic | not in the picker |
| `net.noodl.user.RequestPasswordReset` | Request Password Reset | Cloud Services | deprecated |
| `net.noodl.user.ResetPassword` | Reset Password | Cloud Services | deprecated |
| `net.noodl.user.SendEmailVerification` | Send Email Verification | Cloud Services | deprecated |
| `net.noodl.user.VerifyEmail` | Verify Email | Cloud Services | deprecated |
| `Number Blend` | Number Blend | Interpolation | deprecated |
| `Options` | Options | Visual | deprecated |
| `Page` | Page | Visual | not in the picker |
| `Parent Component State` | Parent Component Object | Component Utilities | deprecated |
| `Radio Button` | Radio Button | Visual | deprecated |
| `Range` | Range | Visual | deprecated |
| `REST2` | REST | Data | deprecated |
| `Script Downloader` | Script Downloader | Javascript | deprecated |
| `Signal To Index` | Signal To Index | Logic | deprecated |
| `String Selector` | Index To String | Utilities | deprecated |
| `Text Input` | Text Input | Visual | deprecated |
| `Transition` | Transition | Animation | deprecated |
| `Variable` | Variable | Data | deprecated |

