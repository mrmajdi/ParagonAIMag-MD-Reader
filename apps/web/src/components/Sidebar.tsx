import type { DocStats, Frontmatter, TocItem } from '@paragon-ai-mag/core';
import { countFiles, fileNameFromPath } from '../lib/files';
import { LOCALE_TAGS, type Locale, type Translate } from '../lib/i18n';
import type { DocumentState, FileNode, SidebarTab } from '../lib/types';
import { FollowCard } from './FollowLinks';
import { Icon } from './Icons';

interface SidebarProps {
  t: Translate;
  locale: Locale;
  open: boolean;
  tab: SidebarTab;
  doc: DocumentState | null;
  toc: TocItem[];
  activeId: string;
  stats: DocStats | null;
  frontmatter: Frontmatter | null;
  title: string;
  language: string;
  tree: FileNode[];
  currentPath?: string;
  onTab: (tab: SidebarTab) => void;
  onNavigate: (id: string) => void;
  onOpenFile: (node: FileNode) => void;
  onClose: () => void;
}

const numberFormat = (locale: Locale): Intl.NumberFormat => {
  try {
    return new Intl.NumberFormat(LOCALE_TAGS[locale]);
  } catch {
    return new Intl.NumberFormat('en');
  }
};

function languageName(code: string, locale: Locale): string {
  if (!code || code === 'und') return 'Auto';
  try {
    return new Intl.DisplayNames([LOCALE_TAGS[locale]], { type: 'language' }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

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

function TocList({
  items,
  activeId,
  depth = 0,
  onNavigate,
}: {
  items: TocItem[];
  activeId: string;
  depth?: number;
  onNavigate: (id: string) => void;
}) {
  return (
    <ul className="toc-list">
      {items.map((item) => (
        <li key={item.id}>
          <a
            className={`toc-link${activeId === item.id ? ' is-active' : ''}`}
            href={`#${item.id}`}
            style={{ paddingInlineStart: `${8 + depth * 12}px` }}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(item.id);
            }}
          >
            {item.text}
          </a>
          {item.children.length > 0 ? (
            <TocList items={item.children} activeId={activeId} depth={depth + 1} onNavigate={onNavigate} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Tree({ nodes, currentPath, onOpenFile }: { nodes: FileNode[]; currentPath?: string; onOpenFile: (node: FileNode) => void }) {
  return (
    <div className="file-tree">
      {nodes.map((node) =>
        node.kind === 'directory' ? (
          <details key={node.path} open>
            <summary>
              <Icon name="folder" size={13} />
              <span>{node.name}</span>
            </summary>
            <div className="tree-children">
              <Tree nodes={node.children ?? []} currentPath={currentPath} onOpenFile={onOpenFile} />
            </div>
          </details>
        ) : (
          <button
            key={node.path}
            type="button"
            className={`file-node${currentPath === node.path ? ' is-active' : ''}`}
            onClick={() => onOpenFile(node)}
            title={node.path}
          >
            <Icon name="fileText" size={13} />
            <span>{node.name}</span>
          </button>
        ),
      )}
    </div>
  );
}

export function Sidebar({
  t,
  locale,
  open,
  tab,
  doc,
  toc,
  activeId,
  stats,
  frontmatter,
  title,
  language,
  tree,
  currentPath,
  onTab,
  onNavigate,
  onOpenFile,
  onClose,
}: SidebarProps) {
  const formatter = numberFormat(locale);
  const tags = normalizeTags(frontmatter?.tags);
  const fileCount = countFiles(tree);
  const hasFiles = tree.length > 0;

  const tabs: Array<{ id: SidebarTab; label: string }> = [
    { id: 'outline', label: t('outline') },
    ...(hasFiles ? [{ id: 'files' as const, label: t('files') }] : []),
    { id: 'info', label: t('info') },
  ];

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label={t('reader')}>
      <div className="sidebar-scroll">
        <div className="sidebar-tabs" role="tablist">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={`sidebar-tab${tab === entry.id ? ' is-active' : ''}`}
              onClick={() => onTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {tab === 'outline' ? (
          <>
            <div className="sidebar-section-title">
              <span>{t('document')}</span>
              {toc.length > 0 ? <span>{formatter.format(toc.length)}</span> : null}
            </div>
            {toc.length > 0 ? (
              <TocList items={toc} activeId={activeId} onNavigate={onNavigate} />
            ) : (
              <p className="toc-empty">{t('outlineEmpty')}</p>
            )}
          </>
        ) : null}

        {tab === 'files' ? (
          <>
            <div className="sidebar-section-title">
              <span>{t('files')}</span>
              <span>{formatter.format(fileCount)}</span>
            </div>
            {hasFiles ? (
              <>
                <p className="file-count">{t('fileCount', { n: formatter.format(fileCount) })}</p>
                <Tree nodes={tree} currentPath={currentPath} onOpenFile={onOpenFile} />
              </>
            ) : (
              <p className="panel-empty">{t('emptyFiles')}</p>
            )}
          </>
        ) : null}

        {tab === 'info' ? (
          <div className="info-stack">
            <section className="info-card">
              <h3>{t('frontmatter')}</h3>
              <p className="info-title">{title || doc?.name || t('document')}</p>
              {typeof frontmatter?.description === 'string' ? (
                <p className="info-description">{frontmatter.description}</p>
              ) : null}
              {tags.length > 0 ? (
                <div className="tag-list">
                  {tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <dl className="meta-rows">
                {typeof frontmatter?.author === 'string' ? (
                  <div className="meta-row">
                    <dt>{t('author')}</dt>
                    <dd>{frontmatter.author}</dd>
                  </div>
                ) : null}
                {frontmatter?.date ? (
                  <div className="meta-row">
                    <dt>{t('date')}</dt>
                    <dd>{formatDate(frontmatter.date, locale)}</dd>
                  </div>
                ) : null}
                {doc?.name ? (
                  <div className="meta-row">
                    <dt>{t('filename')}</dt>
                    <dd>{doc.name}</dd>
                  </div>
                ) : null}
                {doc?.path ? (
                  <div className="meta-row">
                    <dt>{t('path')}</dt>
                    <dd>{doc.path}</dd>
                  </div>
                ) : null}
                <div className="meta-row">
                  <dt>{t('language')}</dt>
                  <dd>{languageName(language, locale)}</dd>
                </div>
              </dl>
            </section>

            {stats ? (
              <section className="info-card">
                <h3>{t('document')}</h3>
                <div className="stat-grid">
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.words)}</span>
                    <span className="stat-label">{t('words')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.readingMinutes)}</span>
                    <span className="stat-label">{t('readingTime')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.headings)}</span>
                    <span className="stat-label">{t('headings')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.tables)}</span>
                    <span className="stat-label">{t('tables')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.diagrams)}</span>
                    <span className="stat-label">{t('diagrams')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.math)}</span>
                    <span className="stat-label">{t('formulas')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.codeBlocks)}</span>
                    <span className="stat-label">{t('codeBlocks')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatter.format(stats.links)}</span>
                    <span className="stat-label">{t('links')}</span>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sidebar-footer">
        <FollowCard t={t} />
        <button type="button" className="icon-btn icon-btn-sm sidebar-close" onClick={onClose} aria-label={t('close')}>
          <Icon name="x" size={14} />
        </button>
      </div>
    </aside>
  );
}

