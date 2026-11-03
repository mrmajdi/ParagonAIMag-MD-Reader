# Security

Paragon Reader processes untrusted Markdown locally. We take XSS, path traversal and privacy seriously.

## Report a vulnerability

Email the maintainer or open a private security advisory on GitHub. Do not publish exploit details in an issue before a fix is available. Include:

- affected version/commit,
- a minimal Markdown or HTTP request that reproduces it,
- impact and suggested fix if known.

## Scope

In scope: renderer sanitisation bypasses (script/event handler/`javascript:` URLs), path traversal in the local server, arbitrary file read outside the opened root, service-worker cache poisoning, and extension permission overreach.

Out of scope: remote content hosted by Substack/YouTube/RedCircle, third-party embeds, and social engineering.

## Design

- Markdown HTML is sanitised with DOMPurify; remote links get `rel="noopener noreferrer"` and images `referrerpolicy="no-referrer"`.
- The local server binds to `127.0.0.1` by default, rejects non-GET methods, normalises paths and refuses anything outside the opened root.
- Only image extensions are exposed through `/api/asset`.
- No analytics, accounts or uploads. Remote images and embeds the user explicitly starts are the only external requests from a document.
- Extensions request the minimum permissions available; the Chrome wrapper uses `contextMenus` only.

## Supported versions

Security fixes land on `main` and the latest release. Pre-1.0 versions are supported on a best-effort basis.
