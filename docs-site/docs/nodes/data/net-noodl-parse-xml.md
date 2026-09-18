---
title: "Parse XML"
---
Turns XML text that arrived at runtime into an object, with attributes prefixed and hostile documents refused rather than parsed.

Parse XML reads XML text into a plain object. An element's attributes arrive under keys prefixed with @ (so <a href="x"/> is { "@href": "x" }) and a tag that carries both attributes and text keeps its text under #text — which is the shape that catches everyone, because String(node.title) on such a tag gives [object Object] and not the words. Namespace prefixes are kept, deliberately: content:encoded and yt:videoId are how you tell one kind of item from another, and stripping the prefix would collide media:title with title. Every value is a string, the same rule Parse CSV set — an id of 0123 stays "0123" and never becomes the number 123. Always Array names tags that must be an array however many times they appear, so a document with one <item> and a document with ten have the same shape and nothing downstream needs a branch. Two guards run before parsing rather than during it: a document over Max Bytes is refused, and a document that declares its own entities (<!ENTITY>, or a DOCTYPE with an inline subset) is refused outright — that is the billion-laughs attack, where a dozen lines expand to gigabytes, and no feed or document format legitimately needs it. Both fail on Failure with a code on Error Code, in milliseconds, leaving the process alive.

## When to use it

XML arriving from anywhere at runtime: an RSS or Atom feed, a SOAP or sitemap response, a supplier's export, an upload. For a feed specifically, use Parse Feed instead — it is this node plus the mapping that turns four incompatible feed formats into one item shape. Pair either with an HTTP Request node whose Response Type is Text, so the body reaches you untouched whatever content-type the server claimed.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.ParseXML` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `alwaysArray` | String | `` | Comma-separated tag names that are always an array, however many times they appear. Without this, a document with one <item> and a document with ten have different shapes and everything downstream needs a branch |
| `attributePrefix` | String | `@` | What an attribute's key starts with, so it cannot collide with a child element of the same name. With the default, <a href="x"/> is { "@href": "x" } |
| `maxBytes` | Number | `5242880` | Refuse a document larger than this, before parsing it. A big document costs many times its own size in memory once it is an object, and a server can always send more than you expected |
| `text` | String | — | The XML text to parse. Wire an HTTP Request node's Response here with its Response Type set to Text, so the body reaches this node untouched whatever content-type the server claimed |
| `trimValues` | Boolean | `true` | Strip leading and trailing whitespace from text. Untick it to keep a document's indentation |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | Object | — | The document as an object. Every value is a string, including ones that look numeric — an id of 0123 stays "0123". A tag carrying both attributes and text becomes { "@attr": "…", "#text": "…" }. Unchanged while the XML cannot be parsed |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires once Result holds the freshly parsed document |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the XML could not be read; empty until a parse fails |
| `errorCode` | String | — | A stable code for the failure, for a graph that branches rather than reads: xml/too-large, xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty |
| `failure` | Signal | — | Fires when the XML could not be parsed or was refused, leaving Result as it was |

## Patterns

- HTTP Request (Response Type: Text) → Parse XML `text`. Text is what guarantees the body arrives untouched — a server that labels XML as application/json will otherwise break the fetch itself, before this node runs.
- Set Always Array for any tag you will loop over. Without it, a document that happens to carry one of something gives you an object where you expected a list.
- Wire `failure` somewhere that answers the caller. A cloud function whose only wired path is the happy one hangs forever when the document is bad (CWF-018).

## Watch out for

- Expecting numbers. Every value is a string; convert explicitly where you need one.
- Reading a tag's text with String(node.tag) when the tag also has attributes — that gives [object Object]. Read node.tag['#text'].
- Raising Max Bytes to take any document a server offers. The object costs several times the text in memory, and a server can always send more than you expected.
- Using this for a feed and writing the RSS-versus-Atom mapping by hand. Parse Feed already did it, including the four cases that are easy to get wrong.

## Examples

**Read an XML response that is not a feed**

A supplier's export, a sitemap, a SOAP reply: XML that arrives at runtime and is not a feed. Parse XML turns it into a plain object and then it is ordinary graph work. Three things about the shape it hands you, each of which catches people once. Attributes arrive under keys prefixed with @, so <tool id="t1"> becomes { "@id": "t1" } and cannot collide with a child element called id. A tag that carries BOTH attributes and text keeps its text under #text — so <name lang="en">Bench tools</name> is { "@lang": "en", "#text": "Bench tools" }, and reading it as if it were a plain string gives you [object Object] rather than the words. And every value is a string, the same rule Parse CSV set: an id of 0123 stays "0123" and never silently becomes the number 123. Always Array is set to 'tool' here, and that is the setting worth understanding. XML has no way to say 'this is a list', so a document with ten <tool> elements gives you an array and a document with one gives you a single object — and the graph that worked all week breaks on the day a supplier ships one item. Naming the tag in Always Array makes it an array in both cases. Max Bytes is left at its default: a document larger than it is refused BEFORE parsing, as is any document that declares its own entities, which is the billion-laughs attack. Both fail on Failure with a code on Error Code, in milliseconds, rather than taking the process with them — so wiring Failure somewhere is what turns that guard into something a person finds out about.

## Related nodes

[Parse Feed](./net-noodl-parse-feed.md), [Parse CSV](./net-noodl-parse-csv.md), [HTTP Request](./net-noodl-http.md), [Static Array](./static-data.md)


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
