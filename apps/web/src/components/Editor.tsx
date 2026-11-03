import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { renderMarkdown } from '@paragon-ai-mag/core';
import { LOCALE_TAGS, translate, type Locale, type Translate } from '../lib/i18n';
import { setupMermaid } from '../lib/mermaid';
import { exportMarkdown } from '../lib/convert';
import type { Theme } from '../lib/types';
import { Icon, type IconName } from './Icons';
import { LogoMark } from './Logo';

interface EditorProps {
  open: boolean;
  initial: { content: string; name: string } | null;
  t: Translate;
  locale: Locale;
  theme: Theme;
  onClose: () => void;
  onApply: (content: string, name: string) => void;
  notify: (message: string) => void;
}

type EditorMode = 'write' | 'split' | 'preview';

interface ToolbarAction {
  id: string;
  icon: IconName;
  label: string;
  before: string;
  after?: string;
  placeholder?: string;
  block?: boolean;
}

const ACTIONS: ToolbarAction[] = [
  { id: 'h1', icon: 'type', label: 'H1', before: '# ', placeholder: 'Heading' },
  { id: 'h2', icon: 'type', label: 'H2', before: '## ', placeholder: 'Heading' },
  { id: 'bold', icon: 'type', label: 'Bold', before: '**', after: '**', placeholder: 'bold text' },
  { id: 'italic', icon: 'type', label: 'Italic', before: '*', after: '*', placeholder: 'italic text' },
  { id: 'code', icon: 'code', label: 'Code', before: '`', after: '`', placeholder: 'code' },
  { id: 'link', icon: 'link', label: 'Link', before: '[', after: '](https://)', placeholder: 'link text' },
  { id: 'image', icon: 'image', label: 'Image', before: '![', after: '](https://)', placeholder: 'alt text' },
  { id: 'quote', icon: 'message', label: 'Quote', before: '> ', placeholder: 'quote', block: true },
  { id: 'task', icon: 'check', label: 'Task', before: '- [ ] ', placeholder: 'task', block: true },
  { id: 'table', icon: 'table', label: 'Table', before: '\n| Column | Column |\n| --- | --- |\n| Text | Text |\n', block: true },
  { id: 'math', icon: 'math', label: 'Math', before: '\n$$\n', after: '\n$$\n', placeholder: 'E = mc^2', block: true },
  {
    id: 'mermaid',
    icon: 'barChart',
    label: 'Mermaid',
    before: '\n```mermaid\ngraph TD\n  A --> B\n```\n',
    block: true,
  },
  { id: 'hr', icon: 'list', label: 'Divider', before: '\n---\n', block: true },
];

export function Editor({
  open,
  initial,
  t,
  locale,
  theme,
  onClose,
  onApply,
  notify,
}: EditorProps) {
  const [content, setContent] = useState('');
  const [name, setName] = useState('untitled.md');
  const [mode, setMode] = useState<EditorMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !initial) return;
    setContent(initial.content);
    setName(initial.name);
    setMode(window.innerWidth < 860 ? 'write' : 'split');
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, initial]);

  const preview = useMemo(
    () =>
      renderMarkdown(content, {
        filename: name,
        direction: 'auto',
        alertLabels: {
          note: translate(locale, 'alertNote'),
          tip: translate(locale, 'alertTip'),
          important: translate(locale, 'alertImportant'),
          warning: translate(locale, 'alertWarning'),
          caution: translate(locale, 'alertCaution'),
        },
      }),
    [content, name, locale],
  );

  useEffect(() => {
    if (!open || !previewRef.current) return;
    return setupMermaid(
      previewRef.current,
      theme,
      {
        loading: translate(locale, 'renderingDiagram'),
        error: translate(locale, 'diagramError'),
        expand: translate(locale, 'expand'),
      },
      () => undefined,
    );
  }, [open, preview.html, theme, locale]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onApply(content, name);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, content, name, onApply, onClose]);

  if (!open || !initial) return null;

  const insert = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || action.placeholder || '';
    const prefix = action.block && start > 0 && content[start - 1] !== '\n' ? '\n' : '';
    const inserted = `${prefix}${action.before}${selected}${action.after ?? ''}`;
    const next = content.slice(0, start) + inserted + content.slice(end);
    setContent(next);
    const cursor = start + prefix.length + action.before.length + selected.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const onTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = `${content.slice(0, start)}  ${content.slice(end)}`;
      setContent(next);
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  const copy = () => {
    void navigator.clipboard?.writeText(content);
    notify(t('textCopied'));
  };

  const download = () => {
    exportMarkdown(content, name);
    notify(t('downloadStarted'));
  };

  return (
    <div className="editor-overlay" role="dialog" aria-modal="true" aria-label={t('editMarkdown')}>
      <div className="editor-panel">
        <header className="editor-head">
          <div className="editor-title">
            <LogoMark size={25} />
            <input
              className="editor-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label={t('filename')}
              spellCheck={false}
            />
            <span className="editor-badge">MD</span>
          </div>
          <div className="segmented editor-modes" role="tablist">
            {(['write', 'split', 'preview'] as EditorMode[]).map((entry) => (
              <button
                key={entry}
                type="button"
                role="tab"
                aria-selected={mode === entry}
                className={mode === entry ? 'is-active' : ''}
                onClick={() => setMode(entry)}
              >
                {entry === 'write' ? t('editMarkdown') : entry === 'split' ? 'Split' : t('preview')}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="editor-toolbar" role="toolbar" aria-label={t('editMarkdown')}>
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="editor-tool"
              title={action.label}
              aria-label={action.label}
              onClick={() => insert(action)}
            >
              {action.label === 'Bold' ? <strong>B</strong> : action.label === 'Italic' ? <em>I</em> : action.label === 'H1' || action.label === 'H2' ? <span>{action.label}</span> : <Icon name={action.icon} size={15} />}
            </button>
          ))}
        </div>

        <div className={`editor-body mode-${mode}`}>
          {mode !== 'preview' ? (
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={onTextareaKeyDown}
              dir="auto"
              spellCheck={false}
              aria-label={t('editMarkdown')}
            />
          ) : null}
          {mode !== 'write' ? (
            <div className="editor-preview-wrap">
              <div
                ref={previewRef}
                className="editor-preview md-body"
                dir={preview.direction}
                lang={preview.language === 'und' ? undefined : preview.language}
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          ) : null}
        </div>

        <footer className="editor-foot">
          <span className="editor-stats">
            {new Intl.NumberFormat(LOCALE_TAGS[locale]).format(preview.stats.words)} {t('words')} ·{' '}
            {new Intl.NumberFormat(LOCALE_TAGS[locale]).format(preview.stats.characters)} {t('characters')}
          </span>
          <div className="editor-actions">
            <button type="button" className="btn btn-sm" onClick={copy}>
              <Icon name="copy" size={13} />
              {t('copyText')}
            </button>
            <button type="button" className="btn btn-sm" onClick={download}>
              <Icon name="download" size={13} />
              .md
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onApply(content, name)}>
              <Icon name="save" size={13} />
              {t('apply')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
