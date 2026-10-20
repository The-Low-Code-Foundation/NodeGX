# SEE-002 — The text form: a component an agent writes in a page, not in a megabyte

**Opened 2026-10-01.** **Depends on nothing to start; NSP-020 to finish** (port lists from the spec, not a viewer).
**Status: 📋 not started.** R1 asked.

## 1. The person sentence

> **An agent authors a component by writing a short text that reads like the component's own description, and the
> editor opens the result as the same graph it always has, laid out, with nothing lost in either direction.**

## 2. Why

README §1 reading 4: the context tax is the JSON and the protocol, not the vocabulary. The training template is 1.6 MB
of JSON for 1,037 nodes; an agent authoring it pays for ids, coordinates, a connection quadruple per wire and a
plan/stage/apply round trip per component. RISE's one durable instinct (README §3) was that the artefact an agent writes
must be dense and familiar. **NodeGX can have that without RISE's sync problem, because the text form and the canvas are
two projections of one graph, not a manifest and generated code.**

## 3. What to build

1. **The grammar**, in `packages/nodegx-node-spec/src/text/` (the spec package, because port names and types come from
   the specs): one component per file; a node is one line, `name: Type param=value …`; a wire is `a.out -> b.in`; a
   visual child is indentation; a Function's body is a fenced block. **Fits on one page of the briefing.** Two trial
   components written by hand first (the todo's task row and the training template's lesson card) and the grammar
   grown from them, the way NSP-004 grew the spec format from five nodes.
2. **The compiler both ways**: text → component JSON (ids minted deterministically from names, R-ISL-019's option),
   JSON → text. Layout (x/y) lives in a sidecar the compiler preserves and the editor's auto-placer fills when absent.
3. **The gate**: every component in the three big templates round-trips JSON → text → JSON byte-identical except
   layout; and text → JSON → text byte-identical. A component that cannot round-trip is a grammar hole, filed as a row
   here, never special-cased.
4. **The MCP**: `write_component_text` (validates, compiles, writes, returns the honesty number) and
   `check_component_text` (compiles, validates, returns diagnostics, writes nothing). The existing tools stay for now.
5. **The measurement**: tokens of the text form against tokens of the JSON for every component in the training template,
   with the model's tokenizer; the factor goes in §5 and the phase's AC2 reads it.

## 4. Acceptance criteria

1. Round trip holds on every component of the three big templates (gate).
2. The grammar page is under 60 lines and a fresh agent, given only that page and `check_component_text`, authors the
   todo's task row green in one try (a stranger test in NSP-006's shape).
3. The training template, written in the text form, costs fewer tokens than its JSON by at least the factor §5 records,
   and that factor is at least 5. If it is less, the task reports why before anything else is built on it.
4. The editor opens a compiled component with the auto-placer's layout and the P93 structure lane drawn.
5. `write_component_text` rejects what `create_component` rejects, with the same diagnostics (one validator).

## 5. Measured

*(filled by the session that builds it: the factor, per component and overall; the grammar holes met; the stranger's
questions.)*

## 6. Watch for

- Memory: *the on-disk editor bundle is not the one running.* Rebuild before driving the editor on a compiled component.
- Do not let the text form invent vocabulary. A parameter name in the text is a port in the spec or it is an error.
- Memory: *a shortcut that skips an empty list outlives the list filling up.* The sidecar-absent auto-place rule must
  keep working once sidecars exist for some components and not others.
