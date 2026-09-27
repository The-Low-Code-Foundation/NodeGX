# Verdicts

One directory per task, one per date: `verdicts/CHR-00N/<YYYY-MM-DD>/`. Each holds the PNGs the
session looked at, a `manifest.json` (surface, state, viewport, theme, HEAD sha, viewer bundle md5,
build kind: dev | packaged), and — for CHR-001 and CHR-011 — a `numbers.json` with the measured
counts. The verdict itself is written in the task file, with the image in context, per
`phase-81-the-look-is-the-product/VIB-001-THE-JUDGE.md` §5. A verdict written from the numbers
alone is void. Richard's look supersedes a session's in both directions.

Check `git check-ignore -v` on every PNG before committing; a verdict about an uncommitted pixel is
a verdict about nothing.
