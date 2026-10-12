---
id: P107-C162
title: Parse XML and Parse Feed — "Max Bytes" counts characters, not bytes, and its description says "larger than this"
status: fixed
commit: dccaa77e0
severity: low
area: runtime / Parse XML and Parse Feed (noodl-runtime/src/nodes/std-library/data/xml.ts `parseXML` :118; feed.ts :383 goes through the same call)
found: P107 NSP-018 s77, 2026-10-10 — writing the two nodes' rules in words (the streams-and-parsers lane)
kit: node-spec
evidence: read on the runtime 2026-10-10 — xml.ts :118 `if (text.length > maxBytes)` refuses on the JavaScript string length (UTF-16 code units), never on a byte count; the spec's parse-xml.ts and parse-feed.ts mirror it, and their s77 words say "(counted in characters)"; the port is named Max Bytes and described as the size the text may not be larger than
---

Both parsers refuse a text past the cap by `text.length` (xml.ts :118), which is the number of UTF-16 code units, not
bytes. A 2 MB text of plain ASCII and a 2 MB text of CJK have the same byte count in the cap's name and very different
lengths under the check; a text of emoji counts two per character. The port is called **Max Bytes** and the description
reads as a byte size.

**Why no test saw it:** the spec copies the runtime's check (parse-xml.ts, parse-feed.ts), so conformance agrees by
construction, and every cap scenario uses ASCII, where the two counts coincide.

**Why it matters now:** NSP-018's rule line for the port says "(counted in characters)" — a published rule that
contradicts the port's name one line above it, like C161's "second 0" beside "the beginning".

**Ruling needed (Richard):** either measure bytes (`new TextEncoder().encode(text).length`, a cost on every parse of a
large text, and the spec's cap changes with it — a version), or rename / re-describe the port ("Max Length, in
characters") and keep the check. The words stay as they are until then.

**Ruled 2026-10-12 (R28, P107 s91 rulings page, asked in plain words with the reach measured that morning):** **"Rename it 'Max Characters' and keep the check"** — display name and description only, on both parsers; the port id `maxBytes` stays, so saved projects need no migration. 0 Parse XML / Parse Feed nodes in Richard's projects. Built s92 (below).

**Fixed 2026-10-12 (P107 s92):** display name "Max Characters" on both parsers (runtime and spec), the description
"Refuse a document longer than this many characters (not bytes)…", and the xml/too-large Error, which named the port: now
"This XML is N K characters, over the M K limit. Raise Max Characters on the node…" in the runtime (`xml.ts`), the spec's copy
and the export's copy (`nodegx-export/src/emit/parseLib.ts`, the same sentence). The port id `maxBytes` stays. Parse XML v3 and
Parse Feed v5 (the Error's words are in their traces), each with a `changes` entry; the two cap scenarios are renamed.
