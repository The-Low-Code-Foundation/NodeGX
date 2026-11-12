---
id: BETA-S11-ENTITYCAP
title: "A feed with more than a thousand escaped characters (`&amp;`, `&lt;`, `&#169;`) reads as not XML: Parse XML and Parse Feed answer \"Entity expansion limit exceeded: 1001 > 1000\""
status: fixed
commit: 0d822ff67
severity: medium
area: "runtime / `noodl-runtime/src/xml.ts` (Parse XML, Parse Feed, in a page and in a cloud function); `fast-xml-parser` 4.5.7"
regression: packages/noodl-runtime/test/beta-s11-entitycap.test.ts "Parse Feed returns every post"
found: the Beta sweep s11, 2026-10-26, diffing fast-xml-parser 4.5.7 against 5.11.2 for P112-OWN008-AUDIT
evidence: this file
---

fast-xml-parser 4.5.7 counts every entity it expands, the five predefined ones and numeric references included,
and throws past 1,000. Every RSS `<description>` is escaped HTML, so an ordinary blog feed of about 150 posts was
refused as `xml/parse-failed` with the library's sentence. Measured on the scratch corpus: 100 posts parse, 2,000
posts (289 KB) throw in 2 ms. The limit was written for entity DECLARATIONS, which never reach the parser here
(`scanForHostileConstructs` refuses `<!ENTITY` and `<!DOCTYPE … [` first).

**Fixed** by moving to fast-xml-parser 5.11.2 (0d822ff67, with P112-OWN008-AUDIT): 20,000 posts, 160,000
expansions, parse in 135 ms. The regression is red 2/2 on 4.5.7 ("Entity expansion limit exceeded: 1001 > 1000") and
green on 5.11.2. Reaches a person with the next runtime in the editor and Studio, the next backend (Parse Feed in a
cloud function), and an exported app (its `package.json` pins the parser too).
