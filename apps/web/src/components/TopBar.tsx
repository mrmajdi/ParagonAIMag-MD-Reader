import { useEffect, useRef, useState } from 'react';
import { FOLLOW_LINKS } from '../lib/brand';
import type { Translate } from '../lib/i18n';
import { shortcutMod } from '../lib/platform';
import type { DocumentState, ExportFormat, Theme } from '../lib/types';
import { Icon } from './Icons';
import { LogoMark } from './Logo';

interface TopBarProps {
  t: Translate;
  doc: DocumentState | null;
  theme: Theme;
  progress: number;
  canInstall: boolean;
  canUseFolder: boolean;
  onHome: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onOpenUrl: () => void;
  onNewDocument: () => void;
  onSearch: () => void;
  onTheme: () => void;
  onSettings: () => void;
  onPresentation: () => void;
  onPrint: () => void;
  onExport: (format: ExportFormat) => void;
  onCopyText: () => void;
  onShare: () => void;
  onEdit: () => void;
  onInstall: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  t,
  doc,
  theme,
  progress,
  canInstall,
  canUseFolder,
  onHome,
  onOpenFile,
  onOpenFolder,
  onOpenUrl,
  onNewDocument,
  onSearch,
  onTheme,
  onSettings,
  onPresentation,
  onPrint,
  onExport,
  onCopyText,
  onShare,
  onEdit,
  onInstall,
  onToggleSidebar,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  const themeIcon = theme === 'dark' ? 'moon' : theme === 'sepia' ? 'coffee' : 'sun';
  const themeLabel = theme === 'dark' ? t('dark') : theme === 'sepia' ? t('sepia') : t('light');

  const exportItems: Array<{ format: ExportFormat; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
    { format: 'html', label: 'HTML', icon: 'code' },
    { format: 'docx', label: 'Word (.docx)', icon: 'fileText' },
    { format: 'pptx', label: 'PowerPoint (.pptx)', icon: 'presentation' },
    { format: 'xlsx', label: 'Excel (.xlsx)', icon: 'table' },
    { format: 'csv', label: 'CSV', icon: 'table' },
    { format: 'txt', label: 'Plain text (.txt)', icon: 'file' },
    { format: 'md', label: 'Markdown (.md)', icon: 'download' },
  ];

  const run = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn menu-btn"
          onClick={onToggleSidebar}
          aria-label={t('outline')}
        >
          <Icon name="menu" />
        </button>
        <button type="button" className="brand" onClick={onHome} aria-label={`${t('appName')} — ${t('appBadge')}`}>
          <LogoMark size={31} className="brand-mark" />
          <span className="brand-text">
            <span className="brand-name">{t('appName')}</span>
            <span className="brand-badge">{t('appBadge')}</span>
          </span>
        </button>
        {doc ? (
          <div className="topbar-file">
            <span className="file-name" title={doc.path || doc.name}>
              {doc.name}
            </span>
            {doc.live ? <span className="live-pill">{t('live')}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="topbar-actions">
        {doc ? (
          <>
            <button type="button" className="icon-btn" onClick={onSearch} title={`${t('search')} · ${shortcutMod}K`} aria-label={t('search')}>
              <Icon name="search" />
            </button>
            <button type="button" className="icon-btn" onClick={onEdit} title={t('editMarkdown')} aria-label={t('editMarkdown')}>
              <Icon name="edit" />
            </button>
            <button type="button" className="icon-btn" onClick={onPresentation} title={t('presentation')} aria-label={t('presentation')}>
              <Icon name="presentation" />
            </button>
            <span className="topbar-divider" aria-hidden="true" />
          </>
        ) : null}
        <button type="button" className="icon-btn" onClick={onTheme} title={`${t('theme')}: ${themeLabel}`} aria-label={t('theme')}>
          <Icon name={themeIcon as 'sun' | 'moon' | 'coffee'} />
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} title={t('settings')} aria-label={t('settings')}>
          <Icon name="settings" />
        </button>
        {canInstall ? (
          <button type="button" className="btn btn-primary btn-sm topbar-install" onClick={onInstall}>
            <Icon name="download" size={14} />
            <span className="btn-label">{t('install')}</span>
          </button>
        ) : null}
        {!doc ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenFile}>
            <Icon name="folderOpen" size={14} />
            <span className="btn-label">{t('openFile')}</span>
          </button>
        ) : null}
        <div className="menu-wrap" ref={menuRef}>
          <button
            type="button"
            className={`icon-btn${menuOpen ? ' is-active' : ''}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={t('more')}
            aria-label={t('more')}
          >
            <Icon name="moreHorizontal" />
          </button>
          {menuOpen ? (
            <div className="menu" role="menu">
              <button type="button" className="menu-item" role="menuitem" onClick={() => run(onNewDocument)}>
                <Icon name="plus" size={15} />
                {t('newDocument')}
              </button>
              <button type="button" className="menu-item" role="menuitem" onClick={() => run(onOpenFile)}>
                <Icon name="folderOpen" size={15} />
                {t('openFile')}
                <span className="menu-shortcut">{shortcutMod}O</span>
              </button>
              {canUseFolder ? (
                <button type="button" className="menu-item" role="menuitem" onClick={() => run(onOpenFolder)}>
                  <Icon name="folder" size={15} />
                  {t('openFolder')}
                </button>
              ) : null}
              <button type="button" className="menu-item" role="menuitem" onClick={() => run(onOpenUrl)}>
                <Icon name="link" size={15} />
                {t('openUrl')}
              </button>
              {doc ? (
                <>
                  <div className="menu-separator" />
                  <button type="button" className="menu-item" role="menuitem" onClick={() => run(onCopyText)}>
                    <Icon name="copy" size={15} />
                    {t('copyText')}
                  </button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => run(onShare)}>
                    <Icon name="share" size={15} />
                    {t('shareDocument')}
                  </button>
                  <button type="button" className="menu-item" role="menuitem" onClick={() => run(onPrint)}>
                    <Icon name="printer" size={15} />
                    {t('print')}
                  </button>
                  <div className="menu-separator" />
                  <div className="menu-label" role="presentation">
                    {t('exportFormats')}
                  </div>
                  {exportItems.map((item) => (
                    <button
                      key={item.format}
                      type="button"
                      className="menu-item"
                      role="menuitem"
                      onClick={() => run(() => onExport(item.format))}
                    >
                      <Icon name={item.icon} size={15} />
                      {item.label}
                    </button>
                  ))}
                  <div className="menu-separator" />
                  <button type="button" className="menu-item" role="menuitem" onClick={() => run(onEdit)}>
                    <Icon name="edit" size={15} />
                    {t('editMarkdown')}
                  </button>
                </>
              ) : null}
              <div className="menu-separator" />
              <a
                className="menu-item"
                role="menuitem"
                href={FOLLOW_LINKS[0]?.url ?? 'https://paragonaimag.substack.com'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="spark" size={15} />
                {t('magazine')}
                <Icon name="external" size={12} />
              </a>
              <button type="button" className="menu-item" role="menuitem" onClick={() => run(onSettings)}>
                <Icon name="settings" size={15} />
                {t('settings')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </header>
  );
}
