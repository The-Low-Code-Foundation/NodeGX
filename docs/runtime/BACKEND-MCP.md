# Connecting a NodeGX backend to Claude, or to another app

Your backend can hand an AI client — Claude on your laptop, a NodeGX app on
another machine, anything that speaks MCP — a set of tools for **your**
collections and **your** cloud functions. Nothing is installed on either side.
You paste an address and a key.

This page is the whole of it: the address, how to make a key, a worked example
with a todo app, and — the part worth reading twice — what a key can never do.

Related: [Access control](./BACKEND-ACCESS-CONTROL.md) for the permission model
underneath, and [Operations](./BACKEND-OPERATIONS.md) for the audit trail these
calls write into.

---

## The address

```
POST https://your-backend.example.com/mcp
```

That is the whole endpoint. It speaks **Streamable HTTP**, statelessly — no
session to keep, nothing to reconnect, and it works behind whatever proxy your
backend already works behind. If your client asks you to choose a transport,
choose *Streamable HTTP* (sometimes listed as "HTTP"), not SSE and not stdio.

Send the key in either header your client offers:

```
X-NodeGX-Api-Key: ngxk_…
Authorization: Bearer ngxk_…
```

In Claude Desktop or Claude Code, that is a custom connector with the URL above
and one custom header.

---

## Making a key

A key is made by an operator, from the admin dashboard's **Keys** panel or over
HTTP with the admin credential:

```bash
curl -X POST https://your-backend.example.com/admin/keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{
        "name": "richard-laptop",
        "scopes": ["classes:read", "classes:write", "functions:*"],
        "actsAsUserId": "a6c8479d-f1b4-4455-9fed-6c57eadadab5"
      }'
```

The response carries `secret` **once**. It is hashed at rest and cannot be read
back; lose it and you issue another.

### The scopes

| scope | what it opens |
|---|---|
| `classes:read` | `_find` and `_get` tools, for every collection the key may read |
| `classes:write` | `_create` and `_update` tools |
| `classes:*` | both of the above |
| `functions:<name>` | one cloud function |
| `functions:*` | every cloud function |

### `actsAsUserId` — the important one

**An API key is not a person.** Left unbound, a key with `classes:read` sees
*every row in the collection*, including rows that belong to your users. That is
right for a server-to-server credential doing bulk work and wrong for a key you
paste into a chat client.

Set `actsAsUserId` to a `_User`'s `objectId` and the key becomes **that person**
for every question about rows: it sees what they see, it creates rows they own,
it is bound by the roles they hold. It stays the *key* for everything about the
credential — the rate limit, the audit trail, revocation.

Binding can only ever take access away. A bound key is allowed what its scopes
allow **and** what that user is allowed — never the union.

> **If you are connecting your own backend to your own Claude, bind the key to
> your own user.** It is the difference between "let Claude read my todo list"
> and "let Claude read everybody's todo list".

A key bound to a user you later delete stops working. That is deliberate: the
alternative is a key quietly gaining access the day its user is removed.

---

## What the client sees

The tool list is **computed for your key on every request**. Change a scope, and
the next call sees a different list — there is nothing to refresh.

For each collection the key may reach:

| tool | what it does |
|---|---|
| `Task_find` | query rows — `where`, `order`, `limit`, `skip` |
| `Task_get` | one row by `objectId` |
| `Task_create` | add a row |
| `Task_update` | change fields on one row |

For each cloud function the key may call, one tool named after the function,
whose arguments are the parameters the function's **Request** node declares. If
you gave those parameters types and marked some required (the *Parameter Types*
group on the node), the client sees that — which is the difference between a
model guessing at your function and calling it correctly first time.

---

## Worked example — the todo app

Alice's backend has a `Task` collection with `creatorOwns` on: every task
belongs to whoever made it. She makes herself a key:

```bash
curl -X POST http://localhost:8577/admin/keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"alice-laptop","scopes":["classes:*"],"actsAsUserId":"<alice objectId>"}'
```

She adds it to Claude as a connector pointing at `http://localhost:8577/mcp`.
Now:

> **Alice:** what's on my list?

Claude calls `Task_find` with no arguments and gets Alice's tasks. Bob's tasks
are not in the answer, and there is no argument Claude could send to include
them.

> **Alice:** add "renew the domain", due Friday

Claude calls `Task_create` with `{"title": "renew the domain", "dueAt": "…"}`.
The row is stamped as Alice's, exactly as if she had typed it into the app.

Another NodeGX app does the same thing with its own key, bound to a service
user: the second backend's functions call the first one's tools, and the first
backend's rules decide what it gets. Neither side installs anything.

---

## What a key can never do

This is the list worth knowing before you paste a key anywhere.

- **Delete a row.** There is no `_delete` tool, for any collection, ever — not
  even one whose HTTP delete rule is wide open. Deleting stays on the HTTP API,
  where the collection's own rule applies. An MCP client reads and adds.
- **Reach a system collection.** `_User`, `_Session`, `_ApiKey`, `_Audit` and
  the rest are refused to every key, on this endpoint and on `/classes` alike.
  Only the admin credential reaches them.
- **Administer anything.** No permissions, no roles, no keys, no schema, no
  backups, no secrets, no config. None of it is on this endpoint at all.
- **Use the master key.** `/mcp` refuses the admin credential on purpose and
  tells you to make a scoped key. An MCP client gets a scoped key or nothing.
- **Exceed the user it acts as.** A bound key cannot read a row that user
  cannot read, cannot write one they cannot write, and cannot call a function
  whose rule their roles do not satisfy.
- **Escape by using the other door.** The same narrowing applies to `/classes`.
  A bound key doing a plain HTTP query gets exactly the rows its tools return.

And two things it *can* do that are worth being deliberate about: a key with
`classes:write` can **change** existing rows, and a key with `functions:*` can
run **any** cloud function it is allowed to call, including ones that charge
money or send email. Scope keys to what you mean.

---

## Seeing what it did

Every tool call writes a row to the audit trail — the key's name, the tool, the
collection or function, the row's id, how long it took, and whether it worked.
Refused calls are recorded too.

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  'https://your-backend.example.com/admin/audit?action=mcp.tool.call&limit=50'
```

The dashboard's **Audit** section shows the same rows with a filter on
`mcp.tool.call`.

---

## Troubleshooting

| what you see | what it means |
|---|---|
| `401` with "needs a NodeGX API key" | no key reached the server — check the header name, and that your client sends custom headers on every request |
| `401` with "acts as a user that no longer exists" | the key is bound to a deleted `_User`. Issue a new key |
| `403` mentioning the master key | you pasted the admin credential. Make a scoped key |
| an empty tool list | the key is valid but has no covering scope, or the user it acts as may not reach anything. The `instructions` text your client shows says which |
| `405` on a GET | expected — this endpoint is stateless and has no SSE stream. Your client should be set to Streamable HTTP |
| a function answering "not accepted" | the function's graph requires a signed-in caller. Bind the key to a user with `actsAsUserId` |

---

## What this is not

`/mcp` is your **backend's** MCP endpoint — your data and your functions. It is
not the NodeGX editor's MCP server (`packages/noodl-mcp`), which is a different
thing for a different job: that one lets an AI build your app, this one lets an
AI use it.

This endpoint offers **tools only** in this release — no resources, no prompts.
