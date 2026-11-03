import { useState, type FormEvent } from 'react';
import { MAGAZINE, PROJECT } from '../lib/brand';
import type { Locale, Translate, TranslationKey } from '../lib/i18n';
import type { FileNode } from '../lib/types';
import { Icon, type IconName } from './Icons';
import { LogoMark } from './Logo';
import { MagazineFeed } from './MagazineFeed';

interface WelcomeProps {
  t: Translate;
  locale: Locale;
  canUseFolder: boolean;
  files: FileNode[];
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onDemo: () => void;
  onNewDocument: () => void;
  onOpenUrl: (url: string) => void;
  onInstall: () => void;
  onOpenFileNode: (node: FileNode) => void;
}

const FEATURES: Array<{ icon: IconName; title: TranslationKey; text: TranslationKey }> = [
  { icon: 'alignRight', title: 'featureRtl', text: 'featureRtlText' },
  { icon: 'barChart', title: 'featureDiagrams', text: 'featureDiagramsText' },
  { icon: 'math', title: 'featureMath', text: 'featureMathText' },
  { icon: 'cloud', title: 'featureOffline', text: 'featureOfflineText' },
  { icon: 'shield', title: 'featurePrivate', text: 'featurePrivateText' },
  { icon: 'languages', title: 'featureLanguages', text: 'featureLanguagesText' },
];

export function Welcome({
  t,
  locale,
  canUseFolder,
  files,
  onOpenFile,
  onOpenFolder,
  onDemo,
  onNewDocument,
  onOpenUrl,
  onInstall,
  onOpenFileNode,
}: WelcomeProps) {
  const [url, setUrl] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);

  const submitUrl = (event: FormEvent) => {
    event.preventDefault();
    if (url.trim()) onOpenUrl(url.trim());
  };

  const [heroLead, ...heroRest] = t('heroTitle').split(/[،,]/);
  const heroAccent = heroRest.join(',').trim();

  return (
    <div className="welcome">
      <section className="welcome-hero">
        <span className="eyebrow">
          <span className="dot" />
          {MAGAZINE.name} · {t('appBadge')}
        </span>
        <div className="welcome-logo">
          <LogoMark size={74} />
        </div>
        <h1>
          {heroLead}
          {heroAccent ? (
            <>
              <span aria-hidden="true">, </span>
              <em>{heroAccent}</em>
            </>
          ) : null}
        </h1>
        <p className="welcome-subtitle">{t('heroText')}</p>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary" onClick={onOpenFile}>
            <Icon name="folderOpen" size={16} />
            {t('openFile')}
          </button>
          {canUseFolder ? (
            <button type="button" className="btn" onClick={onOpenFolder}>
              <Icon name="folder" size={16} />
              {t('openFolder')}
            </button>
          ) : null}
          <button type="button" className="btn" onClick={onDemo}>
            <Icon name="spark" size={16} />
            {t('tryDemo')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onNewDocument}>
            <Icon name="plus" size={16} />
            {t('newDocument')}
          </button>
        </div>
      </section>

      <section
        className="drop-card"
        onClick={onOpenFile}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenFile();
          }
        }}
      >
        <div className="drop-card-inner">
          <span className="drop-icon">
            <Icon name="upload" size={24} />
          </span>
          <p className="drop-title">{t('dropTitle')}</p>
          <p className="drop-hint">{t('dropHint')}</p>
          <div className="drop-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="btn btn-primary btn-sm" onClick={onOpenFile}>
              {t('openFile')}
            </button>
            {canUseFolder ? (
              <button type="button" className="btn btn-sm" onClick={onOpenFolder}>
                {t('openFolder')}
              </button>
            ) : null}
            <button type="button" className="btn btn-sm" onClick={() => setUrlOpen((open) => !open)}>
              <Icon name="link" size={13} />
              {t('openUrl')}
            </button>
            <button type="button" className="btn btn-sm" onClick={onInstall}>
              <Icon name="download" size={13} />
              {t('install')}
            </button>
          </div>
          {urlOpen ? (
            <form className="url-row" onSubmit={submitUrl} onClick={(event) => event.stopPropagation()}>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={t('urlPlaceholder')}
                aria-label={t('openUrl')}
                autoFocus
              />
              <button type="submit" className="btn btn-primary btn-sm">
                {t('loadUrl')}
              </button>
            </form>
          ) : null}
          <p className="drop-note">
            <Icon name="shield" size={12} />
            {t('privacyNote')}
          </p>
        </div>
      </section>

      {files.length > 0 ? (
        <section className="feature-card" style={{ marginBlockStart: 14, padding: 16 }}>
          <div className="sidebar-section-title" style={{ margin: 0 }}>
            <span>{t('files')}</span>
            <span>{t('fileCount', { n: files.length })}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBlockStart: 8 }}>
            {files.slice(0, 10).map((file) => (
              <button
                key={file.path}
                type="button"
                className="file-node"
                style={{ width: 'auto', border: '1px solid var(--border)' }}
                onClick={() => onOpenFileNode(file)}
              >
                <Icon name="fileText" size={13} />
                {file.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="feature-grid">
        {FEATURES.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <span className="feature-icon">
              <Icon name={feature.icon} size={17} />
            </span>
            <h3>{t(feature.title)}</h3>
            <p>{t(feature.text)}</p>
          </article>
        ))}
      </section>

      <MagazineFeed t={t} locale={locale} />

      <footer className="reader-footer" style={{ marginBlockStart: 28 }}>
        <span>
          <strong>{t('madeBy')}</strong> · {t('noTracking')}
        </span>
        <span className="footer-links">
          <a href={PROJECT.repo} target="_blank" rel="noopener noreferrer">
            {t('viewOnGitHub')}
          </a>
          <span>·</span>
          <span>
            {t('version')} {PROJECT.version}
          </span>
          <span>·</span>
          <span>{PROJECT.license}</span>
        </span>
      </footer>
    </div>
  );
}
