import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Translate } from '../lib/i18n';
import { searchDocument, type SearchIndex } from '../lib/search';
import { shortcutMod } from '../lib/platform';
import { Icon } from './Icons';

interface SearchPaletteProps {
  open: boolean;
  t: Translate;
  index: SearchIndex | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export function SearchPalette({ open, t, index, onClose, onNavigate }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    if (!index) return [];
    if (!query.trim()) {
      return index.docs
        .filter((doc) => doc.title)
        .slice(0, 10)
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          text: doc.text,
          level: doc.level,
          snippet: doc.text.slice(0, 120),
        }));
    }
    return searchDocument(index, query);
  }, [index, query]);

  useEffect(() => {
    if (!open) return;
    setSelected(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (selected >= results.length) setSelected(Math.max(0, results.length - 1));
  }, [results.length, selected]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);

  if (!open) return null;

  const choose = (id: string) => {
    onNavigate(id);
    onClose();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((current) => Math.min(results.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[selected];
      if (result) choose(result.id);
    }
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('search')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="search-panel">
        <div className="search-input-wrap">
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="icon-btn icon-btn-sm search-close" onClick={onClose} aria-label={t('close')}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="search-results">
          {results.length === 0 ? (
            <p className="search-empty">{query.trim() ? t('noResults') : t('searchHint')}</p>
          ) : (
            results.map((result, position) => (
              <button
                key={result.id}
                type="button"
                className={`search-result${position === selected ? ' is-selected' : ''}`}
                onMouseEnter={() => setSelected(position)}
                onClick={() => choose(result.id)}
              >
                <span className="search-result-title">
                  {result.level > 0 ? <span className="search-level">H{result.level}</span> : null}
                  <span>{result.title || result.snippet || t('document')}</span>
                </span>
                {result.title && result.snippet ? <span className="search-snippet">{result.snippet}</span> : null}
              </button>
            ))
          )}
        </div>

        <div className="search-foot">
          <span>
            <span className="kbd">↑</span> <span className="kbd">↓</span> {t('search')}
          </span>
          <span>
            <span className="kbd">Esc</span> {t('close')} · <span className="kbd">{shortcutMod}K</span>
          </span>
        </div>
      </div>
    </div>
  );
}
