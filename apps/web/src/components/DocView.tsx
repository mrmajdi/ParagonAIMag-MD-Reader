import { useEffect, useRef } from 'react';
import type { RenderResult } from '@paragon-ai-mag/core';
import { LOCALE_TAGS, translate, type Locale, type Translate } from '../lib/i18n';
import { setupMermaid } from '../lib/mermaid';
import type { DocumentState, LightboxContent, Theme } from '../lib/types';
import { FollowStrip } from './FollowLinks';
import { Icon } from './Icons';
import { MagazineFeed } from './MagazineFeed';

interface DocViewProps {
  t: Translate;
  locale: Locale;
  doc: DocumentState;
  render: RenderResult;
  theme: Theme;
  onViewReady: (container: HTMLElement) => void;
  onActiveHeading: (id: string) => void;
  onZoom: (content: LightboxContent) => void;
  onOpenPath: (href: string) => void;
  resolveAsset: (src: string) => Promise<string | null>;
  notify: (message: string) => void;
}

const LINK_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function formatDate(value: unknown, locale: Locale): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return Promise.resolve();
}

export function DocView({
  t,
  locale,
  doc,
  render,
  theme,
  onViewReady,
  onActiveHeading,
  onZoom,
  onOpenPath,
  resolveAsset,
  notify,
}: DocViewProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const callbacks = useRef({
    onViewReady,
    onActiveHeading,
    onZoom,
    onOpenPath,
    resolveAsset,
    notify,
  });
  callbacks.current = {
    onViewReady,
    onActiveHeading,
    onZoom,
    onOpenPath,
    resolveAsset,
    notify,
  };

  const tags = normalizeTags(render.frontmatter?.tags);
  const hasMetadata = Boolean(
    render.frontmatter?.title ||
      render.frontmatter?.description ||
      render.frontmatter?.author ||
      render.frontmatter?.date ||
      tags.length > 0,
  );
  const description =
    typeof render.frontmatter?.description === 'string' ? render.frontmatter.description : '';
  const author = typeof render.frontmatter?.author === 'string' ? render.frontmatter.author : '';
  const date = formatDate(render.frontmatter?.date, locale);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    let disposed = false;
    const objectUrls: string[] = [];
    const cleanups: Array<() => void> = [];

    const copy = (text: string, message: string) => {
      void copyToClipboard(text).then(() => callbacks.current.notify(message));
    };

    const enhanceHeadings = () => {
      for (const heading of Array.from(article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))) {
        if (heading.querySelector(':scope > .heading-anchor')) continue;
        const anchor = document.createElement('a');
        anchor.className = 'heading-anchor';
        anchor.href = `#${heading.id}`;
        anchor.setAttribute('aria-label', translate(locale, 'copyLink'));
        anchor.innerHTML = LINK_ICON;
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          const url = new URL(window.location.href);
          url.hash = heading.id;
          copy(url.toString(), translate(locale, 'linkCopied'));
          history.replaceState(null, '', url);
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        heading.append(anchor);
      }
    };

    const enhanceCode = () => {
      for (const pre of Array.from(article.querySelectorAll<HTMLPreElement>('pre.hljs'))) {
        if (pre.closest('.md-mermaid')) continue;
        if (pre.parentElement?.classList.contains('md-code')) continue;

        const wrapper = document.createElement('div');
        wrapper.className = 'md-code';
        const head = document.createElement('div');
        head.className = 'md-code-head';
        const lang = document.createElement('span');
        lang.className = 'md-code-lang';
        lang.textContent = (pre.dataset.language || 'text').toUpperCase();
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'md-code-copy';
        button.textContent = translate(locale, 'copyText');
        button.addEventListener('click', () => {
          copy(pre.innerText, translate(locale, 'codeCopied'));
        });
        head.append(lang, button);
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.append(head, pre);
      }
    };

    const enhanceLinks = () => {
      for (const link of Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
        const href = link.getAttribute('href') ?? '';
        if (href.startsWith('#')) {
          link.addEventListener('click', (event) => {
            event.preventDefault();
            const target = document.getElementById(href.slice(1));
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          continue;
        }
        if (/\.(md|markdown|mdx|txt)(?:[?#].*)?$/i.test(href) && !/^[a-z]+:/i.test(href)) {
          link.addEventListener('click', (event) => {
            event.preventDefault();
            callbacks.current.onOpenPath(href);
          });
          continue;
        }
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    };

    const enhanceImages = () => {
      for (const image of Array.from(article.querySelectorAll<HTMLImageElement>('img'))) {
        image.setAttribute('loading', 'lazy');
        image.setAttribute('decoding', 'async');
        image.addEventListener('click', (event) => {
          event.preventDefault();
          callbacks.current.onZoom({
            kind: 'image',
            src: image.currentSrc || image.src,
            alt: image.alt || '',
          });
        });
      }
    };

    const resolveImages = async () => {
      for (const image of Array.from(article.querySelectorAll<HTMLImageElement>('img[src]'))) {
        const src = image.getAttribute('src') ?? '';
        if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) continue;
        const resolved = await callbacks.current.resolveAsset(src);
        if (disposed) return;
        if (resolved) {
          image.src = resolved;
          objectUrls.push(resolved);
        }
      }
    };

    const setupActiveHeading = () => {
      const headings = Array.from(article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]'));
      if (headings.length === 0) return;
      let frame = 0;
      const update = () => {
        frame = 0;
        const threshold = 110;
        let current = headings[0]?.id ?? '';
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= threshold) current = heading.id;
          else break;
        }
        callbacks.current.onActiveHeading(current);
      };
      const onScroll = () => {
        if (frame) return;
        frame = requestAnimationFrame(update);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        if (frame) cancelAnimationFrame(frame);
      });
    };

    enhanceHeadings();
    enhanceCode();
    enhanceLinks();
    enhanceImages();
    void resolveImages();
    setupActiveHeading();

    const mermaidCleanup = setupMermaid(
      article,
      theme,
      {
        loading: translate(locale, 'renderingDiagram'),
        error: translate(locale, 'diagramError'),
        expand: translate(locale, 'expand'),
      },
      (svg) => callbacks.current.onZoom({ kind: 'svg', svg, title: render.title }),
    );
    cleanups.push(mermaidCleanup);

    callbacks.current.onViewReady(article);

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [render.html, render.title, theme, locale, doc.path]);

  return (
    <div className="doc-shell">
      {hasMetadata ? (
        <header className="doc-header">
          <div className="doc-eyebrow">
            <Icon name="bookOpen" size={12} />
            {t('document')}
            {doc.live ? <span className="live-pill">{t('live')}</span> : null}
          </div>
          {render.title ? <h1 className="doc-title">{render.title}</h1> : null}
          {description ? <p className="doc-description">{description}</p> : null}
          <div className="doc-meta">
            {author ? <span>{author}</span> : null}
            {author && date ? <span className="meta-dot" /> : null}
            {date ? <span>{date}</span> : null}
            {author || date ? <span className="meta-dot" /> : null}
            <span>
              {render.stats.readingMinutes} {t('readingTime')}
            </span>
          </div>
          {tags.length > 0 ? (
            <div className="tag-list">
              {tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="doc-stats">
            <span className="stat-chip">
              <Icon name="clock" size={11} />
              {render.stats.words} {t('words')}
            </span>
            <span className="stat-chip">
              <Icon name="globe" size={11} />
              {render.language.toUpperCase()}
            </span>
            <span className="stat-chip">
              <Icon name="alignRight" size={11} />
              {render.direction === 'rtl' ? t('rtl') : t('ltr')}
            </span>
            {render.stats.diagrams > 0 ? (
              <span className="stat-chip">
                <Icon name="barChart" size={11} />
                {render.stats.diagrams} {t('diagrams')}
              </span>
            ) : null}
            {render.stats.math > 0 ? (
              <span className="stat-chip">
                <Icon name="math" size={11} />
                {render.stats.math} {t('formulas')}
              </span>
            ) : null}
          </div>
        </header>
      ) : null}

      <article className="reader-card">
        <div className="md-article">
          <article
            ref={articleRef}
            className="md-body"
            dir={render.direction}
            lang={render.language === 'und' ? undefined : render.language}
            dangerouslySetInnerHTML={{ __html: render.html }}
          />
        </div>
      </article>

      <div className="doc-footer">
        <MagazineFeed t={t} locale={locale} compact />
        <div className="reader-footer">
          <span>
            <strong>{t('madeBy')}</strong> · {t('noTracking')}
          </span>
          <FollowStrip t={t} showLabel={false} />
        </div>
      </div>
    </div>
  );
}
