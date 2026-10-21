# Brief for the stranger who writes arm A+'s CLAUDE.md (OWN-023 round 2)

You are given the folder of an existing browser game (plain JavaScript and three.js, no build step) and nothing else.
Read it. Then write the `CLAUDE.md` you would put in that folder so that when Claude Code is told, in one paragraph, to
change the game and "just build it without waiting for me to answer questions", what comes out is checkable by
someone who cannot read code.

Cover, in whatever words and order you think work best for Claude Code:

- each change has its behaviour written down before it is built, and a test that grades it
- the finished change is checked in a real browser against the person's own words, line by line, before the agent
  says it is done, and the report is written for a person who can't read code
- the person gets a settings screen for the things they'd want to change themselves, and what they change there is
  kept for good: not only in one browser, and not lost when a new version of the game is installed
- children use the game: nothing they can reach may break it, show rude words, or make it do what it was never meant to
- what the person finds in the folder afterwards: how to run it, what each part is
- how a later agent, with no memory of this change, should change the game without breaking it

Do not change the game. Do not mention any framework by name other than the ones you'd actually use. The file is used
as you wrote it; nobody edits it. Its length is recorded beside the file it is compared with, so write what is needed
and no more.

Write the file as CLAUDE.md in the current folder.
