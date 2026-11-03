import { useEffect } from 'react';
import { PROJECT } from '../lib/brand';
import { LOCALE_NAMES, type Locale, type Translate } from '../lib/i18n';
import type { Settings } from '../lib/storage';
import type { DirectionSetting, FontFamily, Theme } from '../lib/types';
import { FollowStrip } from './FollowLinks';
import { Icon } from './Icons';

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  t: Translate;
  locale: Locale;
  canInstall: boolean;
  isStandalone: boolean;
  onClose: () => void;
  onChange: (settings: Settings) => void;
  onInstall: () => void;
  notify: (message: string) => void;
}

const THEMES: Array<{ id: Theme; label: string }> = [
  { id: 'light', label: 'light' },
  { id: 'dark', label: 'dark' },
  { id: 'sepia', label: 'sepia' },
];

const LOCALES = Object.keys(LOCALE_NAMES) as Locale[];

export function SettingsPanel({
  open,
  settings,
  t,
  canInstall,
  isStandalone,
  onClose,
  onChange,
  onInstall,
  notify,
}: SettingsPanelProps) {
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);

  if (!open) return null;

  const patch = (partial: Partial<Settings>) => onChange({ ...settings, ...partial });

  const copyCommand = () => {
    void navigator.clipboard?.writeText('npx paragon-md-reader install');
    notify(t('copied'));
  };

  return (
    <>
      <div className="drawer-scrim" onMouseDown={onClose} aria-hidden="true" />
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-label={t('settings')}>
        <div className="drawer-head">
          <h2>{t('settings')}</h2>
          <button type="button" className="icon-btn icon-btn-sm" onClick={onClose} aria-label={t('close')}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="drawer-body">
          <section className="settings-group">
            <h3>{t('theme')}</h3>
            <div className="theme-grid">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-card${settings.theme === theme.id ? ' is-active' : ''}`}
                  onClick={() => patch({ theme: theme.id })}
                >
                  <span className={`theme-swatch ${theme.id}`} />
                  <span>{t(theme.label as 'light' | 'dark' | 'sepia')}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-group">
            <h3>{t('fontSize')}</h3>
            <div className="size-row">
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => patch({ fontSize: Math.max(12, settings.fontSize - 1) })}
                aria-label="Smaller"
              >
                A−
              </button>
              <input
                type="range"
                min={12}
                max={30}
                step={1}
                value={settings.fontSize}
                onChange={(event) => patch({ fontSize: Number(event.target.value) })}
                aria-label={t('fontSize')}
              />
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => patch({ fontSize: Math.min(30, settings.fontSize + 1) })}
                aria-label="Larger"
              >
                A+
              </button>
              <span className="size-value">{settings.fontSize}px</span>
            </div>
          </section>

          <section className="settings-group">
            <h3>{t('fontFamily')}</h3>
            <div className="segmented">
              {(['sans', 'serif'] as FontFamily[]).map((family) => (
                <button
                  key={family}
                  type="button"
                  className={settings.fontFamily === family ? 'is-active' : ''}
                  onClick={() => patch({ fontFamily: family })}
                >
                  {t(family)}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-group">
            <h3>{t('direction')}</h3>
            <div className="segmented">
              {(['auto', 'rtl', 'ltr'] as DirectionSetting[]).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className={settings.direction === direction ? 'is-active' : ''}
                  onClick={() => patch({ direction })}
                >
                  {t(direction)}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-group">
            <h3>{t('uiLanguage')}</h3>
            <select
              className="select"
              value={settings.locale}
              onChange={(event) => patch({ locale: event.target.value as Locale })}
              aria-label={t('uiLanguage')}
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {LOCALE_NAMES[locale]}
                </option>
              ))}
            </select>
          </section>

          <section className="settings-group">
            <h3>{t('install')}</h3>
            <p className="setting-hint">{t('installHint')}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ marginBlockStart: 8 }}
              onClick={onInstall}
              disabled={isStandalone}
            >
              <Icon name="download" size={14} />
              {isStandalone ? t('live') : t('install')}
            </button>
            <p className="setting-hint" style={{ marginBlockStart: 6 }}>
              {canInstall ? t('installSteps') : t('installUnavailable')}
            </p>
          </section>

          <section className="settings-group">
            <h3>{t('desktopIntegration')}</h3>
            <p className="setting-hint">{t('defaultApp')}</p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBlockStart: 8,
                padding: '7px 9px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-2)',
              }}
            >
              <code style={{ fontSize: 10.5, direction: 'ltr', flex: 1 }}>npx paragon-md-reader install</code>
              <button type="button" className="icon-btn icon-btn-sm" onClick={copyCommand} aria-label={t('copyText')}>
                <Icon name="copy" size={13} />
              </button>
            </div>
          </section>

          <section className="settings-group">
            <h3>{t('followTitle')}</h3>
            <FollowStrip t={t} showLabel={false} />
          </section>

          <section className="settings-group">
            <h3>{t('shortcuts')}</h3>
            <div className="meta-rows" style={{ fontSize: 11.5 }}>
              <div className="meta-row">
                <dt>{t('shortcutOpen')}</dt>
                <dd>
                  <span className="kbd">⌘O</span>
                </dd>
              </div>
              <div className="meta-row">
                <dt>{t('shortcutSearch')}</dt>
                <dd>
                  <span className="kbd">⌘K</span>
                </dd>
              </div>
              <div className="meta-row">
                <dt>{t('shortcutClose')}</dt>
                <dd>
                  <span className="kbd">Esc</span>
                </dd>
              </div>
            </div>
            <p className="setting-hint">{t('shortcutsHint')}</p>
          </section>

          <div className="settings-links">
            <a href={PROJECT.repo} target="_blank" rel="noopener noreferrer">
              <Icon name="github" size={14} />
              {t('viewOnGitHub')}
            </a>
            <span style={{ color: 'var(--muted)', fontSize: 10.5, paddingInlineStart: 21 }}>
              {t('version')} {PROJECT.version} · {PROJECT.license}
            </span>
          </div>
        </div>

        <div className="drawer-foot">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onChange({ ...settings, theme: 'light', fontSize: 17, fontFamily: 'sans', direction: 'auto' })}
          >
            <Icon name="trash" size={13} />
            {t('settingsReset')}
          </button>
        </div>
      </aside>
    </>
  );
}
