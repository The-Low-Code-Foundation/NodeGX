# OWN-007 — The brief

**Opened 2026-10-02.** **Depends on OWN-001 to OWN-006** (it describes them) **and R3** (where it lives).
**Status: 📋 not started.** **R3 ruled 2026-10-10 (s6), Richard's words: *"A skill in a public repo, recommended for Claude but can be used with any AI coder."*** So §3.2's "served where R3 rules" is a skill in a public repository, written so any coding agent can follow it (Claude named as the one it is made for), not the MCP server.
**Model:** **Opus.** The brief is written from traps already recorded in the task files; it needs care, not new reasoning. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **I type one sentence to my agent, "build me a NodeGX editor that …", and it finds the method on its own, reads one
> document, and builds against the kit instead of guessing.**

## 2. Why

This is the part Richard asked for by name: *"the method via which you can get Claude Code to make you your own NodeGX
editor."* The packages are the kit; the brief is the method. NSP-006's brief is the precedent: one document, the rules
of the room, what to deliver, how to know it is done, and nothing about how to do it that the specs do not already say.

## 3. What to build

1. **`EDITOR-BRIEF.md`**, one document, in this order:
   - what a NodeGX editor is (README §3's six parts, in the agent's terms);
   - the kit: each package, what it answers, how to install it;
   - the adapter and the suite: done means PASS;
   - the traps, each as a sentence with the reason. From the prototype: wires are drawn under cards; cards show only
     connected ports; visual nodes have no spec, so show the real preview; one world per graph, or stores do not work;
     a new wire hands the receiver the current value; a camera's first animation-frame timestamp can be earlier than
     the time you recorded. From OWN-008: whatever the strangers asked.
   - what it must not do: write into the person's project without a copy first; claim a node does something its spec
     does not say.
2. **Served where R3 rules.** If the MCP server: as something the agent reads (a resource or a prompt), not a tool,
   because the tool list has a token budget; reachable with no project open, as `list_examples` is. Measure whether the
   server can serve it that way before promising it.
3. **The wish is the agent's input, not the brief's.** The brief never says what the editor should look like. It says
   what makes it a NodeGX editor.

## 4. Acceptance criteria

1. The brief is one document an agent reads in one sitting; every trap in it cites the task or the stranger that hit it.
2. An agent with only the `nodegx` MCP server installed, asked "build me a NodeGX editor that shows my project as a
   table", finds the brief without being told where it is (measured once, on a clean machine profile).
3. OWN-008's strangers are handed the brief and the kit and nothing else, and their questions are folded back in.

## 5. Watch for

- Memory: *the MCP tool surface has a token budget gate*. Anything that grows a tool description pays there.
- Memory: *documentation inside a scanned directory reads as a reference*. If the brief sits beside the packages,
  make sure no tool that scans for references picks it up as one.

## 6. Built

*(empty)*
