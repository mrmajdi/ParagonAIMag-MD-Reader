import yaml from 'js-yaml';
import type { Frontmatter } from './types';

export interface FrontmatterResult {
  body: string;
  data: Frontmatter | null;
  raw: string | null;
  error?: string;
}

/**
 * Extract a leading YAML block. We only treat `---` as frontmatter when the
 * first content line looks like a YAML mapping key; this keeps ordinary
 * horizontal rules at the top of a document from being swallowed.
 */
export function extractFrontmatter(markdown: string): FrontmatterResult {
  const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    return { body: normalized, data: null, raw: null };
  }

  const raw = match[1] ?? '';
  const firstContentLine = raw.split('\n').find((line) => line.trim().length > 0) ?? '';
  if (!/^[\w.-]+\s*:/.test(firstContentLine)) {
    return { body: normalized, data: null, raw: null };
  }

  const body = normalized.slice(match[0].length);
  if (!raw.trim()) {
    return { body, data: null, raw };
  }

  try {
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { body, data: parsed as Frontmatter, raw };
    }
    return { body, data: null, raw, error: 'Frontmatter must be a YAML mapping.' };
  } catch (error) {
    return {
      body,
      data: null,
      raw,
      error: error instanceof Error ? error.message : 'Invalid YAML frontmatter.',
    };
  }
}
