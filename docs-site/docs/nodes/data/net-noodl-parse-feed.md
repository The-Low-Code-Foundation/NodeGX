---
title: "Parse Feed"
---
Reads an RSS, Atom or RDF feed and gives every item one shape — blog, YouTube channel, subreddit or podcast alike.

Parse Feed takes a feed document and hands back Items, always an array, whatever format the feed used and however many items it carried. Each item has Id, Title, Link, Published, Updated, Author, Summary, Content, Image, Enclosure, Tags and Raw. The point of the node is that the mapping is the hard part: the body is description, or content:encoded, or &lt;content>, or buried inside &lt;media:group> on YouTube; the date is RFC 822 on RSS and ISO 8601 on Atom and dc:date on RDF, and Published is converted to ISO 8601 or left null rather than guessed; Atom's &lt;link> is a family of links whose first entry is usually the feed's own XML address, so a naive reader shows that to a person instead of the article; and RDF puts &lt;item> beside &lt;channel> rather than inside it, so a naive reader gets a title and zero items. Id is never empty — it is the guid, or the Atom id, or the link, or a hash of title and date — because that is what lets a collection store each item exactly once however often you poll. Content is NOT sanitised: it is whatever HTML the feed shipped, tracking pixels and all, and sanitising belongs to whatever renders it. Kind tells you which format this was (rss, atom, rdf) and Source is a hint at where it came from (youtube, reddit, podcast, generic) for a graph that wants to branch. Anything the shape does not cover — yt:videoId, itunes:duration — is on Raw.

## When to use it

Any time you are reading a feed: a blog, a news site, a YouTube channel's /feeds/videos.xml, a subreddit's .rss, a podcast, an OPML import's worth of all of them. Put an HTTP Request node in front with Response Type set to Text. For XML that is not a feed, use Parse XML.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.ParseFeed` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `maxBytes` | Number | `5242880` | Refuse a document larger than this, before parsing it. Raise it for a source that really does publish its whole archive in one file |
| `text` | String | — | The feed document — RSS 2.0, Atom 1.0 or RDF/RSS 1.0. Wire an HTTP Request node's Response here with its Response Type set to Text: feeds are served as application/rss+xml, text/xml and, from some sources, text/html, and Text is what guarantees the body arrives untouched |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many items the last successful parse produced |
| `feedDescription` | String | — | The feed's description, or an Atom feed's subtitle |
| `feedLink` | String | — | The site the feed belongs to — its alternate link, never its own XML address |
| `feedTitle` | String | — | The title of the feed itself, not of any item |
| `feedUpdated` | String | — | When the feed last changed, as an ISO 8601 string; empty when it did not say |
| `items` | Array | — | The feed's items, always an array whether the feed carried one or a hundred. Each has Id, Title, Link, Published, Updated, Author, Summary, Content, Image, Enclosure, Tags and Raw. Id is never empty — it is the guid, or the Atom id, or the link, or a hash of title and date — which is what lets a collection store each item once. Unchanged while the feed cannot be parsed |
| `kind` | String | — | Which format this was: rss, atom or rdf |
| `source` | String | — | A hint at where the feed came from, for a graph that wants to branch: youtube, reddit, podcast or generic. A hint, not a promise — generic is what an unrecognised source gets and it is not a failure |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires once Items and the Feed outputs hold the freshly parsed feed |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the feed could not be read; empty until a parse fails |
| `errorCode` | String | — | A stable code for the failure, for a graph that branches rather than reads: feed/unrecognised when the document is XML but not a feed, otherwise the Parse XML codes (xml/too-large, xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty) |
| `failure` | Signal | — | Fires when the feed could not be read, leaving Items and Count as they were |

## Patterns

- HTTP Request (Response Type: Text) → Parse Feed `text` → For Each over `items`: the whole 'poll a source' shape, with no Function node.
- Store items keyed on Id. It is stable across polls by design, so the same item does not arrive twice however often the schedule fires.
- Wire BOTH failure paths — the HTTP node's and this node's. A graph that wires only the parser's Failure still hangs when the fetch itself fails, which is what a mislabelled content-type does (CWF-018).
- Branch on `source` when a YouTube video and a blog post should be shown differently, and read the rest off `raw`.

## Watch out for

- Rendering `content` without sanitising it. It is the publisher's HTML, unaltered, and this node says so rather than quietly changing it.
- Leaving Response Type on Auto. It works for honestly-labelled feeds and fails on the ones that are not, which includes sources that serve XML as text/html.
- Treating `published` as always present. It is null when the feed carried no usable date, on purpose — an invented date sorts wrongly forever and silently.
- Using `title` as the identity. Titles get edited after publication; Id does not.

## Examples

**Show the latest posts from a feed**

The whole of 'read a feed' with no Function node: HTTP Request fetches, Parse Feed normalises, a Repeater draws a row per item. Two things in this graph are not decoration and both cost an afternoon if you leave them out. First, HTTP Request's Response Type is set to Text rather than Auto. Auto decides what to do from the server's content-type header, and feeds are served as application/rss+xml, text/xml, application/xml and — from some real sources — text/html; worse, a server that mislabels an XML body as application/json makes Auto try to parse it as JSON and fail at the FETCH, before Parse Feed ever runs. Text says 'hand me the bytes' and is right for every feed. Second, BOTH failure paths are wired: the HTTP node's and the parser's. They are different failures — one is 'the server did not answer usably', the other is 'the answer was not a feed' — and a graph that wires only the second sits silently when the first happens. Everything after that is ordinary: items all have the same shape whether this feed was RSS, Atom or RDF, so the Repeater's Text nodes read Title and Published without knowing or caring which. Published is an ISO 8601 string, or null when the feed carried no usable date — it is left null rather than guessed, because an invented date sorts wrongly forever and silently. Note what is NOT wired: Content goes nowhere here. It is the publisher's HTML, unsanitised, and putting it straight into an HTML surface is how you inherit someone else's tracking pixels and script tags.

## Related nodes

[Parse XML](./net-noodl-parse-xml.md), [HTTP Request](./net-noodl-http.md), [Parse CSV](./net-noodl-parse-csv.md), [Repeater](../visual/for-each.md)


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
