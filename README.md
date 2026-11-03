# Paragon AI MAG MD Reader

**Markdown, finally readable — for the AI era.**

A local-first, multilingual Markdown reader built for the files AI agents produce: READMEs, plans, specs, reports, `AGENTS.md`, `CLAUDE.md` and research notes. Tables, diagrams, math, code and RTL text are rendered properly, on every device — and nothing ever leaves your machine.

By **[Paragon AI MAG](https://paragonaimag.substack.com)** — daily AI explainers, research and predictions. One video and one podcast every day.

[Substack](https://paragonaimag.substack.com) · [YouTube](https://www.youtube.com/@ParagonAIMag) · [RedCircle](https://www.redcircle.com/shows/cbce814a-d451-4913-a015-fe05b4d0e059) · [Spotify](https://open.spotify.com/show/2T9KN4qv9TXH1jYIzY9bev) · [Instagram](https://www.instagram.com/paragonaimag/) · [LinkedIn](https://www.linkedin.com/company/paragonaimag) · [Bluesky](https://bsky.app/profile/paragonaimag.bsky.social) · [X](https://x.com/ParagonAIMag)

---

## Why this reader

- **RTL-native.** Per-block bidi, Persian typography, LTR code and math inside RTL documents. No more broken mixed text.
- **Everything renders.** GFM tables, task lists, footnotes, definition lists, alerts, Mermaid diagrams, KaTeX math, syntax highlighting, images, raw HTML (sanitised).
- **Local-first.** Files are read in your browser. No accounts, no uploads, no tracking.
- **Every device.** Responsive PWA, installable, offline after first load.
- **Every language.** Unicode-first rendering and eight UI languages (English, Persian, Arabic, Spanish, French, German, Russian, Chinese).
- **The magazine, inside.** Latest articles, videos and podcast episodes from Paragon AI MAG, with **inline video and audio playback**.
- **Made for work.** Outline, full-text search, presentation mode, print/PDF, self-contained HTML export, DOCX/PPTX/XLSX export, editor, file/folder opening, URL import and sharing.

## Quick start

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. Drop a `.md` file, open a folder, paste Markdown, or try the demo.

Production build:

```bash
npm run build:web
# output: apps/web/dist — deploy to any static host
```

## Terminal, agents and editors

Every surface uses the same local reader and the same renderer.

```bash
# Open a file or a whole folder with live reload
node packages/cli/bin/paragon.js README.md
node packages/cli/bin/paragon.js .

# Make Paragon the default .md app for this user (macOS/Windows/Linux)
node packages/cli/bin/paragon.js install
```

The MCP server lets Claude Code, Codex, Cursor and other agents open, outline, list and search Markdown:

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

- **VS Code / Cursor / Windsurf / VSCodium:** `extensions/vscode` adds “Paragon: Open Markdown in Reader” to the command palette and editor title.
- **Chrome / Edge:** `extensions/chrome` adds a context-menu and toolbar entry; run `npm run build:chrome`, then load the folder unpacked.
- **Agents:** see [SKILL.md](SKILL.md) and [examples/mcp.json](examples/mcp.json).

## The magazine feed is real

`apps/web/public/feed.json` is generated from the actual syndication feeds:

| Format | Source |
| --- | --- |
| Articles | Substack — `paragonaimag.substack.com/feed` |
| Videos | YouTube channel RSS |
| Podcast | RedCircle — `feeds.redcircle.com/cbce814a-d451-4913-a015-fe05b4d0e059` |

```bash
npm run feed   # refresh feed.json
```

The app refreshes the feed every 15 minutes and when the tab regains focus. If a source is unavailable, the last good items are kept. Videos play in a privacy-enhanced YouTube embed; podcast episodes play from the RedCircle enclosure. rss.com is not used — the show moved to RedCircle.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build:web` | Production build (refreshes the feed first) |
| `npm run feed` | Rebuild `apps/web/public/feed.json` from RSS |
| `npm run typecheck -w @paragon-ai-mag/web` | TypeScript check |
| `npm run test -w @paragon-ai-mag/core` | Renderer tests |

## Project structure

```
apps/web/          React + Vite reader, PWA, magazine feed UI
packages/core/     Framework-free Markdown renderer (markdown-it, KaTeX, DOMPurify)
packages/server/   Loopback-only file server with live reload
packages/cli/      paragon CLI and OS file association
packages/mcp/      stdio MCP server for AI agents
extensions/vscode/ VS Code / Cursor / Windsurf command
extensions/chrome/ MV3 Chrome / Edge wrapper
scripts/           feed updater
```

## Privacy

- No accounts, no analytics, no uploads, no telemetry.
- Remote images in a document and media embeds you explicitly start are the only external requests.
- Your files are processed in the browser; folder access uses the File System Access API where available.

## Status

This repository ships the **web reader, magazine feed, local server/CLI, MCP server and VS Code/Chrome integrations**. Native desktop/mobile packages, store listings, cloud connectors and the admin/update backend are planned, but are **not** included yet.

`npm run build` builds all current packages. For just the deployable web app, use `npm run build:web` (output `apps/web/dist`).

Internal strategy and research docs are intentionally kept out of this public repository.

## License

MIT © Paragon AI MAG
