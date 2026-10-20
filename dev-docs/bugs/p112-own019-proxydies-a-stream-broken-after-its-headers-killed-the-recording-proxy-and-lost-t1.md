---
id: P112-OWN019-PROXYDIES
title: "The lab's recording proxy died when an upstream stream broke after its headers were sent — writeHead(502) threw inside the catch, the rejection went unhandled, the process exited — so T1's sitting 2 ended on \"Network error\", sitting 3 retried a dead port for 5 minutes, and the lab stopped the round at 8/12"
status: fixed
commit: (this commit)
phase: P112
task: OWN-019
severity: high
area: the lab — `dev-docs/tasks/phase-112-your-own-nodegx/own-018/record-proxy.mjs` (the handler's catch), `own-018/round-kit.mjs` (`--record`: the proxy's stderr piped and never read)
found: P112 OWN-019 s7, 2026-10-15 07:15 (T1, quiz, tgz33)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s7)
---

T1 sitting 1 ran 60 min to a sound hand-over note ("fix the timeout-gate re-fire"). Sitting 2 sent its bootstrap calls
(254–259 in `calls/log.txt`) and one chat call that returned (257), then request 260, which was saved (`req-260.json`)
but never logged — neither a status nor a "proxy error". Vibe then failed with `provider_message: Network error` at
the endpoint `127.0.0.1:9332`, the proxy (567 s). **Sitting 3 sent nothing the proxy saw** — not even the bootstrap
calls every sitting starts with — and failed the same way after 308 s of retries ($0). round-kit's "NEXT.md unchanged
for two sittings" stop then ended the round with the app half-fixed (8/12: score, best, keep, reload).

Cause: when `fetch`'s body breaks after `res.writeHead(upstream.status)`, the catch calls `res.writeHead(502)`, which
throws `ERR_HTTP_HEADERS_SENT`; the async handler's rejection is unhandled and Node exits. What broke request 260 upstream
is not known (the proxy died before it could say); round-kit piped the proxy's stderr and never read it.

**Fixed:** a stream that breaks after its headers is passed on broken (`res.destroy`) and logged with its cause in
`log.txt` and `calls.jsonl`; `unhandledRejection` / `uncaughtException` are logged, never fatal; round-kit writes the
proxy's stderr to `calls/proxy.stderr` and logs a non-zero exit. **Proven** with a fake upstream that sends headers
and one chunk, then cuts the socket: HEAD's proxy exits 1 and the next call fails; the fixed proxy logs `proxy error
after 153 ms: TypeError: terminated (cause: UND_ERR_SOCKET other side closed)` and serves the next call 200.
RL2 (s5) was not this: its later sittings reached the proxy. T1 is a lab loss and is re-run as T1b.
