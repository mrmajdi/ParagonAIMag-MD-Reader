import { FOLLOW_LINKS, MAGAZINE, PRIMARY_FOLLOW_LINKS, type FollowLink } from '../lib/brand';
import type { Translate } from '../lib/i18n';
import { Icon, type IconName } from './Icons';

const ICONS: Record<FollowLink['id'], IconName> = {
  youtube: 'youtube',
  spotify: 'spotify',
  redcircle: 'podcast',
  substack: 'substack',
  instagram: 'instagram',
  linkedin: 'linkedin',
  bluesky: 'bluesky',
  x: 'xSocial',
};

interface FollowStripProps {
  t: Translate;
  links?: FollowLink[];
  showLabel?: boolean;
}

export function FollowStrip({ t, links = PRIMARY_FOLLOW_LINKS, showLabel = true }: FollowStripProps) {
  return (
    <div className="follow-strip">
      {showLabel ? <span className="follow-label">{t('followCta')}</span> : null}
      {links.map((link) => (
        <a
          key={link.id}
          className="social-link"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.label}
        >
          <Icon name={ICONS[link.id]} size={13} />
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}

interface FollowCardProps {
  t: Translate;
}

export function FollowCard({ t }: FollowCardProps) {
  return (
    <a
      className="magazine-card"
      href={FOLLOW_LINKS[0]?.url ?? 'https://paragonaimag.substack.com'}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="mag-kicker">
        <Icon name="spark" size={10} />
        {t('followTitle')}
      </span>
      <span className="mag-name">{MAGAZINE.name}</span>
      <span className="mag-tagline">{MAGAZINE.tagline}</span>
      <span className="mag-cta">
        {t('followCta')}
        <Icon name="arrowRight" size={12} />
      </span>
    </a>
  );
}
