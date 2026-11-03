import tokensCss from '../styles/tokens.css?inline';
import markdownCss from '../styles/markdown.css?inline';
import katexCss from 'katex/dist/katex.min.css?inline';
import vazir400 from '@fontsource/vazirmatn/400.css?inline';
import vazir500 from '@fontsource/vazirmatn/500.css?inline';
import vazir700 from '@fontsource/vazirmatn/700.css?inline';
import { FOLLOW_LINKS, MAGAZINE, PROJECT } from './brand';
import type { Theme } from './types';

export interface ExportOptions {
  html: string;
  title: string;
  direction: 'rtl' | 'ltr';
  language: string;
  theme: Theme;
}

let cachedCss: string | null = null;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read blob'));
    reader.readAsDataURL(blob);
  });
}

async function inlineCssUrls(css: string): Promise<string> {
  if (cachedCss) return cachedCss;

  const urls = new Set<string>();
  for (const match of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
    const value = match[2];
    if (!value || value.startsWith('data:') || value.startsWith('http')) continue;
    urls.add(value);
    if (urls.size >= 36) break;
  }

  const inline = new Map<string, string>();
  let totalBytes = 0;

  await Promise.all(
    Array.from(urls).map(async (value) => {
      try {
        const absolute = new URL(value, document.baseURI).href;
        const response = await fetch(absolute);
        if (!response.ok) return;
        const blob = await response.blob();
        totalBytes += blob.size;
        if (totalBytes > 12 * 1024 * 1024) return;
        inline.set(value, await blobToDataUrl(blob));
      } catch {
        // A missing font should not block export.
      }
    }),
  );

  let result = css;
  for (const [from, to] of inline) {
    result = result.split(from).join(to);
  }
  cachedCss = result;
  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function exportDocument(options: ExportOptions): Promise<void> {
  const baseCss = [tokensCss, vazir400, vazir500, vazir700, katexCss, markdownCss].join('\n');
  const css = await inlineCssUrls(baseCss);
  const followLinks = FOLLOW_LINKS.slice(0, 4)
    .map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`)
    .join(' · ');

  const documentHtml = `<!doctype html>
<html lang="${escapeHtml(options.language)}" dir="${options.direction}" data-theme="${options.theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Paragon AI MAG MD Reader">
<title>${escapeHtml(options.title)}</title>
<style>
${css}
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); }
body { font-family: var(--font-reading); }
.export-shell { max-width: 860px; margin: 0 auto; padding: 48px 24px 72px; }
.export-footer { max-width: 860px; margin: 0 auto; padding: 0 24px 64px; color: var(--muted); font-size: 13px; line-height: 1.8; }
.export-footer a { color: var(--accent); }
@media print { .export-shell { padding: 0; } .export-footer { display: none; } }
</style>
</head>
<body>
<main class="export-shell">
<article class="md-body" dir="${options.direction}">
${options.html}
</article>
</main>
<footer class="export-footer">
  Exported with <strong>${escapeHtml(PROJECT.name)}</strong> · ${escapeHtml(MAGAZINE.tagline)}<br>
  ${followLinks} · <a href="${escapeHtml(PROJECT.repo)}">GitHub</a>
</footer>
</body>
</html>`;

  const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFileName(options.title)}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeFileName(title: string): string {
  const clean = title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || 'paragon-document';
}

export function printDocument(): void {
  window.print();
}
