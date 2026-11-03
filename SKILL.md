---
name: paragon-md-reader
description: Open, outline, search and navigate local Markdown files with Paragon AI MAG MD Reader. Use when a task involves READMEs, plans, specs, AGENTS.md/CLAUDE.md, research notes or any folder of Markdown produced by an AI agent.
---

# Paragon MD Reader

Paragon Reader is a local-first Markdown reader with RTL, Mermaid, KaTeX and GFM support. It ships a stdio MCP server and a CLI; neither uploads files.

## Tools

Prefer the MCP tools when they are configured:

- `open_markdown` — read a local Markdown file (`path`, optional `max_chars`). Use this before summarizing or editing.
- `outline_markdown` — heading outline with levels, text and line numbers.
- `list_markdown` — recursively list Markdown files in a folder, ignoring `node_modules`, `dist`, `.git` and caches.
- `search_markdown` — case-insensitive full-text search with file and line numbers.

## Configure MCP

Build the workspace once, then add this to the MCP client config (Claude Code `.mcp.json`, Codex, Cursor, etc.):

```json
{
  "mcpServers": {
    "paragon-reader": {
      "command": "node",
      "args": ["/absolute/path/to/ParagonAIMag-MD-Reader/packages/mcp/bin/paragon-mcp.js"]
    }
  }
}
```

After npm publication, use:

```json
{ "mcpServers": { "paragon-reader": { "command": "npx", "args": ["-y", "@paragon-ai-mag/mcp"] } } }
```

## CLI fallback

```bash
node packages/cli/bin/paragon.js list .
node packages/cli/bin/paragon.js README.md --no-open
```

`paragon install` makes Paragon the current user's `.md` handler on macOS, Windows or Linux. `paragon uninstall` reverses it.

## Notes

- Never claim a file was uploaded; processing is local.
- Use `open_markdown` rather than shell `cat` so the user gets a stable path and truncation guard.
- Keep edits in the user's original file; the reader is a viewer, not a cloud editor.
