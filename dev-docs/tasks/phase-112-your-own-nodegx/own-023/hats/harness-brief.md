# Brief for the stranger who writes arm A+'s CLAUDE.md

You are given an empty folder and nothing else. Write the `CLAUDE.md` you would put in that folder so that when
Claude Code is told, in one paragraph, to build a full-stack web app and "just build it without waiting for me to
answer questions", what comes out is checkable by someone who cannot read code.

Cover, in whatever words and order you think work best for Claude Code:

- each part of the app has its behaviour written down before it is built, and a test that grades it
- the finished app is checked in a real browser, at phone width, against the person's own words, line by line,
  before the agent says it is done, and the report is written for a person who can't read code
- secrets stay on the server and never reach the browser; the person adds them through a file, not a chat
- the person gets a settings screen for the things they'd want to change themselves
- what the person finds in the folder afterwards: how to run it, how to deploy it, what each part is
- how a later agent, with no memory of this build, should change the app without breaking it

Do not mention any framework by name other than the ones you'd actually use. Do not write the app. The file is used
as you wrote it; nobody edits it. Its length is recorded beside the file it is compared with, so write what is
needed and no more.
