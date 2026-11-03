import type { FeedItem, FeedPayload } from './types';

/**
 * Bundled fallback used only when public/feed.json cannot be fetched.
 * The real feed is generated from Substack, YouTube and RedCircle RSS by
 * scripts/update-feed.mjs (see README/IMPLEMENTATION docs).
 */
const curated: FeedItem[] = [
  {
    id: 'redcircle-ai-robot-boxers',
    type: 'podcast',
    title: 'AI Robot Boxers Learn by Falling',
    url: 'https://redcircle.com/shows/cbce814a-d451-4913-a015-fe05b4d0e059',
    publishedAt: '2026-11-03T05:11:35.000Z',
    summary: 'A robot boxer does not win by never falling. It wins by falling better.',
    source: 'RedCircle',
    image:
      'https://media.redcircle.com/images/2026/11/3/5/0f366793-a3e6-407f-96b2-4c156d6ff9db_podcast-cover.jpg',
    audio:
      'https://audio4.redcircle.com/episodes/f2222807-7416-4d73-9b54-d97185a9c5e4/stream.mp3',
  },
  {
    id: 'robot-knocked-down',
    type: 'article',
    title: 'The Robot Got Knocked Down — and That Was the Lesson',
    url: 'https://paragonaimag.substack.com/p/the-robot-got-knocked-down-and-that',
    publishedAt: '2026-11-03T04:31:36.000Z',
    summary: 'The knockdown, the reset and what ring-tested robots mean for the real world.',
    source: 'Substack',
  },
  {
    id: 'youtube-it-fell',
    type: 'video',
    title: 'It Fell. Then It LEARNED. 🤯',
    url: 'https://www.youtube.com/shorts/CtP54wB4FHg',
    publishedAt: '2026-11-02T20:40:32.000Z',
    summary: 'A short briefing on the robot that turned a fall into training data.',
    source: 'YouTube',
    videoId: 'CtP54wB4FHg',
    image: 'https://i.ytimg.com/vi/CtP54wB4FHg/hqdefault.jpg',
  },
  {
    id: 'chatgpt-predicting',
    type: 'article',
    title: "How Does ChatGPT Work? It's Not Thinking — It's Predicting",
    url: 'https://paragonaimag.substack.com/p/how-does-chatgpt-work-its-not-thinking',
    publishedAt: '2026-10-31T00:00:00.000Z',
    summary: 'A plain-words tour of the 175-billion-parameter machine behind the chat box.',
    source: 'Substack',
  },
  {
    id: 'youtube-keys',
    type: 'video',
    title: 'AI Found the KEYS to Millions of Websites 🔑',
    url: 'https://www.youtube.com/shorts/BefDgo9TEVg',
    publishedAt: '2026-10-30T00:00:00.000Z',
    summary: 'A short briefing on the security story everyone shared.',
    source: 'YouTube',
    videoId: 'BefDgo9TEVg',
    image: 'https://i.ytimg.com/vi/BefDgo9TEVg/hqdefault.jpg',
  },
  {
    id: 'redcircle-chatgpt',
    type: 'podcast',
    title: "How ChatGPT Actually Works — It's Not Thinking, It's Predicting",
    url: 'https://redcircle.com/shows/cbce814a-d451-4913-a015-fe05b4d0e059',
    publishedAt: '2026-10-30T00:00:00.000Z',
    summary: 'The full episode: prediction, training and why the chat box feels alive.',
    source: 'RedCircle',
  },
];

export const FALLBACK_FEED: FeedPayload = {
  updatedAt: '2026-11-03T00:00:00.000Z',
  items: curated,
};

export const FEED_REFRESH_MS = 15 * 60 * 1000;

function isFeedItem(value: unknown): value is FeedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<FeedItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.url === 'string' &&
    (item.type === 'article' || item.type === 'video' || item.type === 'podcast')
  );
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeItem(value: FeedItem): FeedItem {
  return {
    ...value,
    publishedAt: typeof value.publishedAt === 'string' ? value.publishedAt : '',
    summary: optionalString(value.summary),
    image: optionalString(value.image),
    videoId: optionalString(value.videoId),
    audio: optionalString(value.audio),
    duration: optionalString(value.duration),
  };
}

export async function loadFeed(options: { signal?: AbortSignal } = {}): Promise<FeedPayload> {
  try {
    const response = await fetch('./feed.json', {
      cache: 'no-store',
      signal: options.signal,
    });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    const payload = (await response.json()) as Partial<FeedPayload>;
    const items = Array.isArray(payload.items)
      ? payload.items.filter(isFeedItem).map(normalizeItem)
      : [];
    if (items.length === 0) throw new Error('Feed is empty');
    return {
      updatedAt:
        typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
      items,
    };
  } catch {
    return FALLBACK_FEED;
  }
}

export function formatFeedDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatDuration(value?: string): string {
  if (!value) return '';
  if (value.includes(':')) return value;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
