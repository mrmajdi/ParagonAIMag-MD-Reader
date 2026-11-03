# Contributing

Thanks for helping make Markdown readable for everyone. This project takes quality, privacy and RTL seriously.

## Setup

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run typecheck --workspaces --if-present
npm test -w @paragon-ai-mag/core
npm run build
```

Node 20+ is required (Node 22/24 recommended).

## What to work on

- Bugs: open an issue with a minimal Markdown sample and the expected/actual result.
- Rendering: add a test in `packages/core/src/render.test.ts` for parser/sanitiser changes.
- RTL/Persian: include both LTR and RTL screenshots or DOM proof in the PR when layout changes.
- Feed: use the real sources documented in `README.md`; never use rss.com, and never invent posts.
- UI copy: add keys to `apps/web/src/lib/i18n.ts`; keep English as the source dictionary.

## Pull requests

1. Keep the change focused and explain the user problem.
2. Run typecheck, core tests and `npm run build`.
3. Verify the affected flow in a browser (desktop and mobile width).
4. Do not add analytics, trackers or uploads; the app promises local-only processing.
5. Do not commit secrets, generated `dist/` or `node_modules/`.
6. By contributing you agree to license your work under MIT.

## Design rules

- Calm, premium, signal-over-noise.
- Persian/Arabic must be first-class: Vazirmatn, logical properties, no negative tracking, LTR code.
- No fake “coming soon” controls. If it is not implemented, do not show it.
- Accessibility is part of “done”: keyboard reachable, labelled controls, visible focus, reduced motion.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.
