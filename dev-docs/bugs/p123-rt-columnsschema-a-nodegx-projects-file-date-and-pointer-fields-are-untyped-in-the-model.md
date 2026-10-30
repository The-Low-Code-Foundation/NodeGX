---
id: P123-RT-COLUMNSSCHEMA
title: The runtime's Model glue read field types only from a Parse-era declaration, so a NodeGX project's File reached an Image as "[object Object]"
status: fixed
commit: 34e72ff70
severity: high
kit: core
regression: packages/noodl-runtime/test/nodes/p123-columnsschema-a-records-field-types-from-either-declaration.test.ts "a File field reads as a Cloud File, which an Image takes as its url" (NodeGX declaration)
area: noodl-runtime `src/api/cloudstore.js` `_fromJSON` and `_serializeObject` (`CloudStore._collections[c].schema.properties` only)
found: STU-090 follow-up, a repeating group of Swapshop's listings with a photo, 2026-10-30
evidence: Swapshop copy (Listing.photo declared `{ name: 'photo', type: 'File' }` in `dbCollections[].columns`), two listings with an uploaded photo: the row's Image had `src="/runtime/[object Object]"`, and the trace showed the photo wire carrying `{__type:"File",name:…,url:…}`
---

`dbCollections` holds a collection in one of two shapes: a Parse-era entry (`schema.properties`, a map) or a NodeGX
one (`columns`, a list). The built-in backend's schema cache, the MCP server's write-back and NodeGX Studio all write
`columns`. `queryutils.ts` and `schema-ports.ts` were taught both shapes earlier; the Model glue in `cloudstore.js`
was not. So on every NodeGX project a record's fields were untyped there:
- **File:** a File stayed the wire object, not a `CloudFile` (whose `toString` is its url). An Image wired to it asked
  for `/runtime/[object Object]`.
- **Date:** a Date stayed `{ __type: 'Date', iso }` unless something else converted it.
- **Pointer:** written as an id, a Pointer went out as a bare string, not a Pointer to its class (OWN-026 FIX-05 had
  patched only the read side, for an undeclared Pointer).

The Date and Pointer consequences in a running app were not driven; the File one was.

Fixed: `_schemaOf(collectionName)` returns `{ properties }` from either shape, and both functions use it. Test: the
same three cases (a File reads as a Cloud File, a Date as a Date, an id Pointer is wrapped on write) under both
declarations. Reaches NodeGX Studio only with an `@nodegx/preview` release (Studio runs the npm pin).
