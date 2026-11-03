import type { FileNode } from './types';

export interface CliDocResponse {
  name: string;
  path: string;
  content: string;
  root: string;
  assetBase: string;
}

export interface CliTreeResponse {
  root: string;
  files: FileNode[];
}

export interface CliParams {
  file: string | null;
  dir: string | null;
  url: string | null;
}

export function getCliParams(): CliParams {
  const params = new URLSearchParams(window.location.search);
  return {
    file: params.get('file'),
    dir: params.get('dir'),
    url: params.get('url'),
  };
}

export function isCliMode(): boolean {
  const params = getCliParams();
  return Boolean(params.file || params.dir);
}

export async function fetchCliDoc(path: string): Promise<CliDocResponse> {
  const response = await fetch(`/api/doc?path=${encodeURIComponent(path)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }
  return (await response.json()) as CliDocResponse;
}

export async function fetchCliTree(dir = ''): Promise<CliTreeResponse> {
  const query = dir ? `?dir=${encodeURIComponent(dir)}` : '';
  const response = await fetch(`/api/tree${query}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Could not list ${dir || '.'} (${response.status})`);
  }
  return (await response.json()) as CliTreeResponse;
}

export function subscribeCli(onChange: () => void): () => void {
  if (typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource('/api/events');
  const handler = () => onChange();
  source.addEventListener('change', handler);
  return () => {
    source.removeEventListener('change', handler);
    source.close();
  };
}

export function normalizeMarkdownUrl(input: string): string {
  const url = input.trim();
  const githubBlob = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (githubBlob) {
    const [, owner, repo, branch, path] = githubBlob;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return url;
}

export async function fetchRemoteMarkdown(input: string): Promise<{ content: string; name: string }> {
  const url = normalizeMarkdownUrl(input);
  const response = await fetch(url, { headers: { Accept: 'text/markdown, text/plain, */*' } });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new Error('That URL returned HTML, not Markdown. Try the raw link.');
  }
  const content = await response.text();
  let name = 'remote.md';
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    if (last) name = decodeURIComponent(last);
  } catch {
    // Keep the fallback name.
  }
  return { content, name };
}
