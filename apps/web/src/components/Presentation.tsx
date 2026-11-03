import { useEffect, useRef, useState } from 'react';
import { translate, type Locale, type Translate } from '../lib/i18n';
import { renderMermaidImmediately } from '../lib/mermaid';
import type { Theme } from '../lib/types';
import { Icon } from './Icons';
import { LogoMark } from './Logo';

interface PresentationProps {
  open: boolean;
  html: string;
  title: string;
  direction: 'rtl' | 'ltr';
  language: string;
  theme: Theme;
  locale: Locale;
  t: Translate;
  onClose: () => void;
  onExpand: (svg: string, title: string) => void;
}

function splitSlides(html: string): string[] {
  const slides = html
    .split(/<hr\s*\/?>/i)
    .map((slide) => slide.trim())
    .filter(Boolean);
  return slides.length > 0 ? slides : [html];
}

export function Presentation({
  open,
  html,
  title,
  direction,
  language,
  theme,
  locale,
  t,
  onClose,
  onExpand,
}: PresentationProps) {
  const slides = splitSlides(html);
  const [index, setIndex] = useState(0);
  const slideRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    document.body.style.overflow = 'hidden';
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    return () => {
      document.body.style.overflow = '';
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        setIndex((current) => Math.min(slides.length - 1, current + 1));
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        setIndex((current) => Math.max(0, current - 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setIndex(slides.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, slides.length, onClose]);

  useEffect(() => {
    if (!open || !slideRef.current) return;
    const slide = slideRef.current;
    void renderMermaidImmediately(
      slide,
      theme,
      {
        loading: translate(locale, 'renderingDiagram'),
        error: translate(locale, 'diagramError'),
        expand: translate(locale, 'expand'),
      },
      (svg) => onExpand(svg, title),
    );
  }, [open, index, theme, locale, onExpand, title]);

  if (!open) return null;

  const current = slides[Math.min(index, slides.length - 1)] ?? '';

  return (
    <div className="presentation" role="dialog" aria-modal="true" aria-label={t('presentation')}>
      <div className="presentation-bar">
        <span className="presentation-brand">
          <LogoMark size={22} />
          {title}
        </span>
        <span className="presentation-counter" aria-live="polite">
          {t('slide')} {index + 1} {t('of')} {slides.length}
        </span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t('exitPresentation')} title={t('exitPresentation')}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="presentation-stage">
        <div
          key={index}
          ref={slideRef}
          className="slide"
          dir={direction}
          lang={language === 'und' ? undefined : language}
          dangerouslySetInnerHTML={{ __html: current }}
        />
      </div>

      <div className="presentation-nav">
        <button
          type="button"
          className="btn"
          onClick={() => setIndex((currentIndex) => Math.max(0, currentIndex - 1))}
          disabled={index === 0}
        >
          <Icon name="chevronLeft" size={16} />
          {t('slide')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setIndex((currentIndex) => Math.min(slides.length - 1, currentIndex + 1))}
          disabled={index >= slides.length - 1}
        >
          {t('slide')}
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
