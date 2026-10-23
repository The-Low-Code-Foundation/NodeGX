# CCN-006 — A stranger's install

**State:** open. **After:** CCN-001 AC5.

Today Studio is found at `NODEGX_STUDIO` or the sibling checkout. A stranger needs: Studio on npm (`@nodegx/studio`,
`npx` runnable, vendor/ inside); `@nodegx/mcp` resolving it by `require.resolve` first; a `.mcpb` Desktop Extension
bundling the server so Claude Desktop installs it by double-click; `create-nodegx --desktop` writing the
`claude_desktop_config.json` entry (with the same never-overwrite rule the Cline kit has). The stranger audit's
findings on naming and jargon in the packages (`dev-docs/bugs/npmaudit-*`) are the same work's other half.
