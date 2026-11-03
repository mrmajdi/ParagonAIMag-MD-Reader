import { useEffect } from 'react';
import type { LightboxContent } from '../lib/types';
import type { Translate } from '../lib/i18n';
import { Icon } from './Icons';

interface LightboxProps {
  content: LightboxContent | null;
  t: Translate;
  onClose: () => void;
}

export function Lightbox({ content, t, onClose }: LightboxProps) {
  useEffect(() => {
    if (!content) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [content, onClose]);

  if (!content) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={content.kind === 'image' ? content.alt || t('image') : t('diagramSource')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label={t('close')}>
        <Icon name="x" size={19} />
      </button>
      <div className="lightbox-inner">
        {content.kind === 'image' ? (
          <img src={content.src} alt={content.alt} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: content.svg }} />
        )}
      </div>
    </div>
  );
}
