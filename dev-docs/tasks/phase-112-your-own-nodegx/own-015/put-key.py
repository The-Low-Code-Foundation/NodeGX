#!/usr/bin/env python3
# Puts GEMINI_TTS_API_KEY from the OpenNoodl checkout's .env into the round-2 backend's secrets.json, under
# "functions" -> GEMINI_API_KEY, the name the stranger's Speak function reads. Prints no value. The file keeps its
# 0600 mode (it is rewritten in place). The backend reads it on every call, so no restart is needed.
import json, re

ENV = '/Users/richardosborne/vscode_projects/OpenNoodl/.env'
SECRETS = ('/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/'
           '90d15357-ad9e-42d5-9f90-ae98badd2ba0/scratchpad/own015-r2/home/.noodl/backends/'
           'backend_mv53wqaxdal0j/secrets.json')

m = re.search(r'^GEMINI_TTS_API_KEY=(.*)$', open(ENV).read(), re.M)
if not m:
    raise SystemExit('No GEMINI_TTS_API_KEY line in ' + ENV)
key = m.group(1).strip().strip('"\'')
data = json.load(open(SECRETS))
data.setdefault('functions', {})['GEMINI_API_KEY'] = key
with open(SECRETS, 'w') as f:
    json.dump(data, f, indent=2)
print('GEMINI_API_KEY written to the backend (%d characters).' % len(key))
