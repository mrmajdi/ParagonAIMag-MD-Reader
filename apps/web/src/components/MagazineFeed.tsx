import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FOLLOW_LINKS, MAGAZINE } from '../lib/brand';
import {
  FEED_REFRESH_MS,
  formatDuration,
  formatFeedDate,
  loadFeed,
} from '../lib/feed';
import { LOCALE_TAGS, type Locale, type Translate } from '../lib/i18n';
import type { FeedItem, FeedPayload } from '../lib/types';
import { FollowStrip } from './FollowLinks';
import { Icon, type IconName } from './Icons';

type FeedTab = 'all' | FeedItem['type'];

const TYPE_ICONS: Record<FeedItem['type'], IconName> = {
  article: 'article',
  video: 'play',
  podcast: 'podcast',
};

interface MagazineFeedProps {
  t: Translate;
  locale: Locale;
  compact?: boolean;
}

export function MagazineFeed({ t, locale, compact = false }: MagazineFeedProps) {
  const [feed, setFeed] = useState<FeedPayload | null>(null);
  const [tab, setTab] = useState<FeedTab>('all');
  const [playing, setPlaying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async (manual = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (manual) setRefreshing(true);
    const payload = await loadFeed({ signal: controller.signal });
    if (!mounted.current || controller.signal.aborted) return;
    setFeed(payload);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(), FEED_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted.current = false;
      request.current?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const items = useMemo(() => {
    if (!feed) return [];
    const filtered = tab === 'all' ? feed.items : feed.items.filter((item) => item.type === tab);
    return compact ? filtered.slice(0, 3) : filtered.slice(0, 8);
  }, [feed, tab, compact]);

  const tabs: Array<{ id: FeedTab; label: string }> = [
    { id: 'all', label: t('feedAll') },
    { id: 'article', label: t('feedArticles') },
    { id: 'video', label: t('feedVideos') },
    { id: 'podcast', label: t('feedPodcasts') },
  ];

  const updated = feed ? formatFeedDate(feed.updatedAt, LOCALE_TAGS[locale]) : '';
  const playingItem = feed?.items.find((item) => item.id === playing) ?? null;

  return (
    <section
      className={`magazine-section${compact ? ' is-compact' : ''}${playing ? ' has-player' : ''}`}
      aria-labelledby={compact ? undefined : 'magazine-feed-title'}
    >
      <div className="magazine-head">
        <div>
          <p className="magazine-kicker">{MAGAZINE.name}</p>
          <h2 id={compact ? undefined : 'magazine-feed-title'}>{t('latestFromMagazine')}</h2>
          {!compact ? <p className="mag-desc">{t('followText')}</p> : null}
          {feed ? (
            <p className="feed-updated">
              {t('feedUpdated', { date: updated })}
              {!compact ? (
                <button
                  type="button"
                  className={`feed-refresh${refreshing ? ' is-busy' : ''}`}
                  onClick={() => void refresh(true)}
                  disabled={refreshing}
                  aria-label={t('feedRefresh')}
                  title={t('feedRefresh')}
                >
                  <Icon name="refresh" size={11} />
                  {t('feedRefresh')}
                </button>
              ) : null}
            </p>
          ) : null}
        </div>
        <a
          className="btn btn-sm"
          href={FOLLOW_LINKS[0]?.url ?? 'https://paragonaimag.substack.com'}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('followCta')}
          <Icon name="external" size={12} />
        </a>
      </div>

      {!compact ? (
        <div className="feed-tabs" role="tablist" aria-label={t('fromMagazine')}>
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={`feed-tab${tab === entry.id ? ' is-active' : ''}`}
              onClick={() => {
                setTab(entry.id);
                setPlaying(null);
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="feed-list">
        {items.map((item) => {
          const isPlaying = playing === item.id;
          const canPlay = Boolean(item.videoId || item.audio);
          return (
            <article
              key={item.id}
              className={`feed-item${isPlaying ? ' is-playing' : ''}${item.image ? ' has-image' : ''}`}
            >
              {item.image ? (
                <button
                  type="button"
                  className="feed-thumb"
                  onClick={() => {
                    if (item.videoId) setPlaying(isPlaying ? null : item.id);
                    else window.open(item.url, '_blank', 'noopener,noreferrer');
                  }}
                  aria-label={
                    item.videoId
                      ? isPlaying
                        ? t('feedClosePlayer')
                        : t('feedWatchHere')
                      : item.title
                  }
                >
                  <img src={item.image} alt="" loading="lazy" decoding="async" />
                  <span className="feed-thumb-badge">
                    <Icon name={TYPE_ICONS[item.type]} size={13} />
                  </span>
                  {item.videoId ? (
                    <span className="feed-thumb-play" aria-hidden="true">
                      <Icon name={isPlaying ? 'pause' : 'play'} size={15} />
                    </span>
                  ) : null}
                </button>
              ) : (
                <span className="feed-type" aria-hidden="true">
                  <Icon name={TYPE_ICONS[item.type]} size={14} />
                </span>
              )}

              <div className="feed-body">
                <span className="feed-meta">
                  {item.source}
                  {item.publishedAt ? ` · ${formatFeedDate(item.publishedAt, LOCALE_TAGS[locale])}` : ''}
                  {item.duration ? ` · ${formatDuration(item.duration)}` : ''}
                </span>
                <a className="feed-title" href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                {!compact && item.summary ? (
                  <span className="feed-summary">{item.summary}</span>
                ) : null}

                {canPlay ? (
                  <div className="feed-actions">
                    <button
                      type="button"
                      className={`feed-play-button${isPlaying ? ' is-active' : ''}`}
                      onClick={() => setPlaying(isPlaying ? null : item.id)}
                    >
                      <Icon name={isPlaying ? 'pause' : item.audio ? 'headphones' : 'play'} size={12} />
                      {isPlaying
                        ? t('feedClosePlayer')
                        : item.audio
                          ? t('feedListenHere')
                          : t('feedWatchHere')}
                    </button>
                    <a
                      className="feed-open"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('readMore')}
                      <Icon name="external" size={10} />
                    </a>
                  </div>
                ) : null}

                {isPlaying && item.videoId ? (
                  <div className="feed-player feed-player-video">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`}
                      title={item.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : null}

                {isPlaying && item.audio ? (
                  <div className="feed-player feed-player-audio">
                    <audio
                      src={item.audio}
                      controls
                      autoPlay
                      preload="metadata"
                      aria-label={item.title}
                    >
                      <track kind="captions" />
                    </audio>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        {items.length === 0 ? <p className="feed-empty">{t('feedEmpty')}</p> : null}
      </div>

      {playingItem ? (
        <p className="feed-now-playing" aria-live="polite">
          <Icon name="headphones" size={11} />
          {playingItem.title}
        </p>
      ) : null}

      {!compact ? <FollowStrip t={t} /> : null}
    </section>
  );
}
