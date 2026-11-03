import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import deflist from 'markdown-it-deflist';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import markdownItKatex from '@vscode/markdown-it-katex';
import hljs from 'highlight.js';
import GithubSlugger from 'github-slugger';
import DOMPurify from 'dompurify';
import type { Config as PurifyConfig } from 'dompurify';
import type Token from 'markdown-it/lib/token.mjs';
import type { HeadingInput } from './toc';
import { buildToc } from './toc';
import { extractFrontmatter } from './frontmatter';
import { alertsPlugin } from './alerts';
import { installMermaidRenderer } from './mermaid';
import { countWords, detectDirection, detectLanguage, escapeHtml, readingMinutes, stripHtml } from './utils';
import type { DocStats, RenderOptions, RenderResult, ResolvedDirection } from './types';

const SANITIZE_CONFIG: PurifyConfig = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'button', 'textarea', 'select', 'option'],
  FORBID_ATTR: ['style', 'srcset', 'formaction', 'xlink:href'],
  // Only ordinary web links and relative paths. This blocks javascript:,
  // vbscript:, file:, blob: and data: URLs in both href and src.
  ALLOWED_URI_REGEXP: /^(?!(?:javascript|vbscript|data|file|blob):)/i,
  ADD_ATTR: [
    'target',
    'rel',
    'loading',
    'decoding',
    'referrerpolicy',
    'data-alert',
    'data-alert-label',
    'data-mermaid',
    'data-language',
    'align',
  ],
};

if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const blocked = /^(?:\s*(?:javascript|vbscript|data|file|blob):)/i;
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (blocked.test(href)) {
        node.removeAttribute('href');
      } else if (href && !href.startsWith('#')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') ?? '';
      if (blocked.test(src)) node.removeAttribute('src');
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (node.tagName === 'INPUT') {
      const type = (node.getAttribute('type') || '').toLowerCase();
      if (type !== 'checkbox' || !node.hasAttribute('disabled')) {
        node.remove();
      }
    }
  });
}

function highlightCode(code: string, language: string, enabled: boolean): string {
  const lang = (language || '').trim().toLowerCase();
  let body: string;

  if (enabled && lang && hljs.getLanguage(lang)) {
    try {
      body = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      body = escapeHtml(code);
    }
  } else {
    body = escapeHtml(code);
  }

  const safeLang = escapeHtml(lang || 'text');
  return `<pre class="hljs" data-language="${safeLang}" dir="ltr" tabindex="0"><code class="hljs language-${safeLang}">${body}</code></pre>`;
}

function createMarkdown(options: RenderOptions): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: false,
    highlight: (code, language) => highlightCode(code, language, options.highlight !== false),
  });
  const slugger = new GithubSlugger();

  md.use(anchor, {
    slugify: (value: string) => slugger.slug(value),
    level: [1, 2, 3, 4, 5, 6],
    permalink: false,
  });
  md.use(footnote);
  md.use(taskLists, { enabled: false, label: true, labelAfter: false });
  md.use(deflist);
  md.use(mark);
  md.use(sub);
  md.use(sup);
  md.use(markdownItKatex, { throwOnError: false });
  alertsPlugin(md, options.alertLabels);
  installMermaidRenderer(md);
  installBidiAndTableWrappers(md);

  return md;
}

function installBidiAndTableWrappers(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'paragon-bidi', (state) => {
    const tokens = state.tokens as Token[];
    const autoDirection = new Set([
      'paragraph_open',
      'heading_open',
      'list_item_open',
      'blockquote_open',
      'td_open',
      'th_open',
      'dd_open',
      'dt_open',
    ]);

    for (const token of tokens) {
      if (autoDirection.has(token.type)) token.attrSet('dir', 'auto');
      if (token.type === 'fence' || token.type === 'code_block') token.attrSet('dir', 'ltr');
    }

    return true;
  });

  const defaultTableOpen = md.renderer.rules.table_open;
  const defaultTableClose = md.renderer.rules.table_close;

  md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
    const rendered = defaultTableOpen
      ? defaultTableOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
    return `<div class="md-table-wrap">${rendered}`;
  };

  md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
    const rendered = defaultTableClose
      ? defaultTableClose(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
    return `${rendered}</div>`;
  };
}

function collectHeadings(md: MarkdownIt, tokens: Token[], slugger: GithubSlugger): HeadingInput[] {
  const headings: HeadingInput[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.type !== 'heading_open') continue;

    const inline = tokens[index + 1];
    const raw = inline?.content ?? '';
    const id = token.attrGet('id') || slugger.slug(stripHtml(md.renderInline(raw)));
    const text = stripHtml(md.renderInline(raw));
    const level = Number(token.tag.slice(1)) || 1;

    if (text) headings.push({ id, text, level });
  }

  return headings;
}

function count(html: string, regex: RegExp): number {
  return (html.match(regex) ?? []).length;
}

function collectStats(html: string, body: string): DocStats {
  const textOnly = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ');
  const words = countWords(textOnly);

  return {
    words,
    characters: body.replace(/\s/g, '').length,
    readingMinutes: readingMinutes(words),
    headings: count(html, /<h[1-6]\b/g),
    links: count(html, /<a\b/g),
    images: count(html, /<img\b/g),
    codeBlocks: count(html, /<pre\b/g),
    tables: count(html, /<table\b/g),
    diagrams: count(html, /class="md-mermaid"/g),
    math: count(html, /class="katex"/g),
  };
}

function resolveDirection(
  options: RenderOptions,
  frontmatter: Record<string, unknown> | null,
  sample: string,
): ResolvedDirection {
  const frontmatterDirection =
    typeof frontmatter?.direction === 'string'
      ? frontmatter.direction
      : typeof frontmatter?.dir === 'string'
        ? frontmatter.dir
        : null;

  const requested =
    options.direction && options.direction !== 'auto'
      ? options.direction
      : frontmatterDirection === 'rtl' || frontmatterDirection === 'ltr'
        ? frontmatterDirection
        : 'auto';

  return requested === 'auto' ? detectDirection(sample) : requested;
}

function resolveLanguage(frontmatter: Record<string, unknown> | null, body: string): string {
  const declared =
    typeof frontmatter?.lang === 'string'
      ? frontmatter.lang
      : typeof frontmatter?.language === 'string'
        ? frontmatter.language
        : null;
  return declared || detectLanguage(body);
}

function firstHeading(tokens: Token[]): string | null {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.type !== 'heading_open') continue;
    if (token.tag !== 'h1') continue;
    const inline = tokens[index + 1];
    const text = stripHtml(inline?.content ?? '');
    if (text) return text;
  }
  return null;
}

export function renderMarkdown(markdown: string, options: RenderOptions = {}): RenderResult {
  const { body, data: frontmatter } = extractFrontmatter(markdown);
  const md = createMarkdown(options);
  const slugger = new GithubSlugger();
  const env: Record<string, unknown> = {};
  const tokens = md.parse(body, env);
  const rawHtml = md.renderer.render(tokens, md.options, env);
  const html = options.sanitize === false ? rawHtml : DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);

  const headings = collectHeadings(md, tokens, slugger);
  const toc = buildToc(headings);
  const fallbackTitle = options.filename?.replace(/\.[^.]+$/, '') || '';
  const frontmatterTitle = typeof frontmatter?.title === 'string' ? frontmatter.title : '';
  const title = frontmatterTitle || firstHeading(tokens) || headings[0]?.text || fallbackTitle || 'Untitled';
  const direction = resolveDirection(options, frontmatter, `${title}\n${body.slice(0, 6000)}`);
  const language = resolveLanguage(frontmatter, body);
  const stats = collectStats(html, body);

  return {
    html,
    frontmatter,
    toc,
    title,
    stats,
    direction,
    language,
    body,
  };
}
