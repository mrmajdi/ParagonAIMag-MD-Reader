#!/usr/bin/env node
/**
 * Builds apps/web/public/feed.json from the magazine's real syndication feeds.
 *
 * Sources:
 *   - Substack RSS (articles)
 *   - YouTube channel RSS (videos, with video ids for inline playback)
 *   - RedCircle RSS (podcast episodes, with audio enclosures for inline playback)
 *
 * rss.com is deliberately NOT used: the show moved to RedCircle. It stays
 * disabled there and must not be read.
 *
 * The script never fails a build because a platform is temporarily down: it
 * keeps the previous items for that source instead. Run it manually with
 * `npm run feed`, or let the scheduled workflow refresh the committed JSON.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('..', import.meta.url);
const OUT = fileURLToPath(new URL('apps/web/public/feed.json', ROOT));
const LIMIT_PER_TYPE = 8;

const SOURCES = {
  substack: 'https://paragonaimag.substack.com/feed',
  youtube: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6jN_MjipzbY1O4ivA_cNRw',
  redcircle: 'https://feeds.redcircle.com/cbce814a-d451-4913-a015-fe05b4d0e059',
};

const TYPE_FOR_SOURCE = {
  substack: 'article',
  youtube: 'video',
  redcircle: 'podcast',
};

const SOURCE_LABEL = {
  substack: 'Substack',
  youtube: 'YouTube',
  redcircle: 'RedCircle',
};

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decodeEntities(input) {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function cleanText(input = '') {
  return decodeEntities(input)
    .replace(/<!\[CDATA\[|\]\]>/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(input, title = '') {
  const text = cleanText(input);
  const withoutByline = text.replace(/^by paragon ai mag[.\s—-]*/i, '').trim();
  const body = withoutByline || text;
  if (!body || body.toLowerCase() === title.toLowerCase()) return undefined;
  if (body.length <= 190) return body;
  const cut = body.slice(0, 190);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : 190).trim()}…`;
}

function firstTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!match) return '';
  return match[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
}

function attribute(block, tag, name) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function blocks(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi'))].map(
    (match) => match[1],
  );
}

function isoDate(value) {
  const stamp = Date.parse(decodeEntities(String(value)).replace(/\s+/g, ' ').trim());
  return Number.isNaN(stamp) ? new Date().toISOString() : new Date(stamp).toISOString();
}

function normalizeTitle(value) {
  return value
    .toLowerCase()
    .replace(/\|\s*paragon ai mag\s*$/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function parseSubstack(xml) {
  return blocks(xml, 'item')
    .map((item, index) => {
      const title = cleanText(firstTag(item, 'title'));
      const url = cleanText(firstTag(item, 'link'));
      if (!title || !url) return null;
      const image =
        attribute(item, 'enclosure', 'url') ||
        attribute(item, 'media:content', 'url') ||
        attribute(item, 'media:thumbnail', 'url');
      return {
        id: `substack-${cleanText(firstTag(item, 'guid')) || url || index}`,
        type: 'article',
        title,
        url,
        publishedAt: isoDate(firstTag(item, 'pubDate')),
        summary: summarize(firstTag(item, 'content:encoded') || firstTag(item, 'description'), title),
        source: SOURCE_LABEL.substack,
        image: /^https?:/i.test(image) ? image : undefined,
      };
    })
    .filter(Boolean);
}

function parseYouTube(xml) {
  return blocks(xml, 'entry')
    .map((entry) => {
      const videoId = cleanText(firstTag(entry, 'yt:videoId'));
      const title = cleanText(firstTag(entry, 'title'));
      if (!videoId || !title) return null;
      const url =
        attribute(entry, 'link', 'href') || `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnail = attribute(entry, 'media:thumbnail', 'url');
      return {
        id: `youtube-${videoId}`,
        type: 'video',
        title,
        url,
        publishedAt: isoDate(firstTag(entry, 'published')),
        summary: summarize(firstTag(entry, 'media:description'), title),
        source: SOURCE_LABEL.youtube,
        image: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        videoId,
      };
    })
    .filter(Boolean);
}

function parseRedCircle(xml) {
  return blocks(xml, 'item')
    .map((item, index) => {
      const title = cleanText(firstTag(item, 'title')).replace(/\s*\|\s*Paragon AI MAG\s*$/i, '');
      const url = cleanText(firstTag(item, 'link'));
      if (!title || !url) return null;
      const audio = attribute(item, 'enclosure', 'url');
      const image =
        attribute(item, 'itunes:image', 'href') || attribute(item, 'media:thumbnail', 'url');
      return {
        id: `redcircle-${cleanText(firstTag(item, 'guid')) || url || index}`,
        type: 'podcast',
        title,
        url,
        publishedAt: isoDate(firstTag(item, 'pubDate')),
        summary: summarize(firstTag(item, 'description'), title),
        source: SOURCE_LABEL.redcircle,
        image: /^https?:/i.test(image) ? image : undefined,
        audio: /^https?:/i.test(audio) ? audio : undefined,
        duration: cleanText(firstTag(item, 'itunes:duration')) || undefined,
      };
    })
    .filter(Boolean);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; ParagonAIMagFeedBot/1.0; +https://github.com/mrmajdi/ParagonAIMag-MD-Reader)',
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function dedupe(items) {
  const seen = new Set();
  const seenTitles = new Set();
  return items.filter((item) => {
    // Dedupe inside a format, not across formats: the same story is often an
    // article, a video and a podcast episode, and readers want all three.
    const titleKey = `${item.type}:${normalizeTitle(item.title)}`;
    if (seen.has(item.url) || (titleKey && seenTitles.has(titleKey))) return false;
    seen.add(item.url);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const previous = await readPrevious();
  const parsers = {
    substack: parseSubstack,
    youtube: parseYouTube,
    redcircle: parseRedCircle,
  };
  const collected = [];
  const failures = [];

  for (const [source, url] of Object.entries(SOURCES)) {
    try {
      const xml = await fetchText(url);
      const items = dedupe(parsers[source](xml))
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, LIMIT_PER_TYPE);
      if (items.length === 0) throw new Error('feed contained no usable items');
      collected.push(...items);
      console.log(`✓ ${source}: ${items.length} items`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push(`${source}: ${reason}`);
      const fallback = Array.isArray(previous?.items)
        ? previous.items
            .filter((item) => item.type === TYPE_FOR_SOURCE[source])
            .slice(0, LIMIT_PER_TYPE)
        : [];
      collected.push(...fallback);
      console.warn(`! ${source}: ${reason}${fallback.length ? ' — kept previous items' : ''}`);
    }
  }

  const items = dedupe(collected).sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  if (items.length === 0) {
    console.error('No feed items could be collected. Keeping the existing feed.json.');
    process.exitCode = previous ? 0 : 1;
    return;
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    items,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${items.length} items to apps/web/public/feed.json`);
  if (failures.length > 0) console.warn(`${failures.length} source(s) unavailable; partial feed.`);
}

await main();
