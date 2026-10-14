# OWN-017 s16: the stranger's editor and the drive's scripts, as they ran

- `editor/`: what a fresh `claude -p` (Sonnet) built from `sentence.txt` with the kit from the npm registry. Kept
  as written, without `node_modules` (`npm install && npm start`; set `NODEGX_PROJECT_DIR` to a COPY of
  `../own-015/s15/french-phrases`).
- `run.mjs`: the round. `stack.mjs`: backend (`provision_backend` with `force`, deploy, key from `.env`; touch
  `deploy.now` to redeploy). `drive.mjs`: the app (screens, buttons, the played WAV's tail RMS).
  `editor-drive.mjs`: one edit through the editor's page. `f0.mjs`: median pitch of a WAV. `reload.mjs`: DEEPLINK.
  `validate.mjs`: AC3's `validate_project`.

Paths point at the s16 session's scratchpad and s15's tarballs. None holds a key.
