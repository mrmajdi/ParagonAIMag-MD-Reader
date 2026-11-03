import MiniSearch from 'minisearch';
import type { SearchDoc } from './types';

export interface SearchIndex {
  index: MiniSearch<SearchDoc>;
  docs: SearchDoc[];
}

export function buildSearchIndex(container: HTMLElement): SearchIndex {
  const docs: SearchDoc[] = [];
  let current: SearchDoc | null = null;
  const usedIds = new Set<string>();

  const ensureId = (id: string): string => {
    let candidate = id || `section-${docs.length}`;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${id || 'section'}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(candidate);
    return candidate;
  };

  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const match = child.tagName.match(/^H([1-6])$/);
    if (match) {
      current = {
        id: ensureId(child.id),
        title: (child.textContent ?? '').trim(),
        text: '',
        level: Number(match[1]),
      };
      docs.push(current);
      continue;
    }

    const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (!current) {
      current = { id: ensureId('__start'), title: '', text: '', level: 0 };
      docs.push(current);
    }
    if (current.text.length < 12000) {
      current.text = `${current.text} ${text}`.trim();
    }
  }

  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'text'],
    storeFields: ['title', 'text', 'id', 'level'],
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'AND',
    },
  });
  index.addAll(docs);
  return { index, docs };
}

export function searchDocument(
  index: SearchIndex | null,
  query: string,
): Array<{ id: string; title: string; text: string; level: number; snippet: string }> {
  const trimmed = query.trim();
  if (!index || !trimmed) return [];
  const results = index.index.search(trimmed).slice(0, 14);
  return results.map((result) => {
    const text = String(result.text ?? '');
    const title = String(result.title ?? '');
    return {
      id: String(result.id),
      title,
      text,
      level: Number(result.level ?? 0),
      snippet: makeSnippet(text || title, trimmed),
    };
  });
}

function makeSnippet(text: string, query: string, length = 150): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) return clean.slice(0, length) + (clean.length > length ? '…' : '');
  const start = Math.max(0, index - 45);
  const end = Math.min(clean.length, start + length);
  return `${start > 0 ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}
