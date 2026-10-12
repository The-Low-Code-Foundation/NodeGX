# TBM-002 — Mission 4: la machine se souvient

**Opened 2026-10-11.** **Depends on TBM-001.** **Status: 📋.** **Model:** either.

## 1. The person sentence

> **Every 💥 is written down; the wall shows the book of records; close the page, come back tomorrow, the book is still there.**

## 2. What to build

1. In `tchac/`: a `backendServices` entry for the browser backend (TBM-001 §3.2); a `Create Record` ("Le carnet") with
   class `Boum`, fields `billes` (the count at the pop) and `quand`; a `Query Records` ("Le livre des records", sorted by
   `billes` desc, limit 5) feeding a `Repeater` of Texts on the screen; a costume for each (📒, 📖) in `metadata.tchac`.
2. The mission, locked today in the page: *Montre-moi* ties `ballon · vient de s'allumer → carnet · écrire`, the
   count's value → `carnet · billes`, and `carnet · écrit → livre · relire`. *Vérifier* plays a copy: pops twice (3 and
   5 marbles), reads the book's first row as 5, then **re-mounts the copy** and reads it again.
3. The gate's fourth mission block, and a fourth French verdict naming the idea: *une donnée enregistrée* (stockage).

## 3. Acceptance criteria

1. The fourth mission fails on the starting graph, passes after Montre-moi, and its Vérifier reads the record back after a re-mount.
2. Zero network requests during the check (the records went to IndexedDB).
3. The official editor opens the saved project and validates the record nodes clean against the browser backend.
