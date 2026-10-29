#!/bin/sh
# NodeGX for Goose. Goose Desktop 1.57.0 does not pass an extension's `envs` from config.yaml, so they are set here.
# Goose runs with HOME=~/.goose-home (start-goose.sh, to hide ~/.claude/skills); NodeGX and its Chrome get the real one.
export HOME=/Users/richardosborne
EXT="/Users/richardosborne/Library/Application Support/Claude/Claude Extensions/local.mcpb.the-low-code-foundation.nodegx"
GEMMA="/Users/richardosborne/vscode_projects/NodeGX Gemma projects"
export NODEGX_SERVER_NAME=nodegx
export NODEGX_STUDIO="$EXT/studio"
export NODEGX_NODE="$EXT/node/bin/node"
export NODEGX_DEPLOY_CLI="$EXT/studio/node_modules/@nodegx/preview/dist/nodegx-deploy.cjs"
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export NODEGX_KNOWN_PROJECTS="$GEMMA/.known-projects.json"
export NODEGX_PROJECTS_DIR="$GEMMA"
export NODEGX_LOCAL_MODEL=gemma4-e4b-32k
exec "$EXT/node/bin/node" /Users/richardosborne/vscode_projects/OpenNoodl/packages/noodl-mcp/dist/noodl-mcp-goose.cjs --allow-writes
