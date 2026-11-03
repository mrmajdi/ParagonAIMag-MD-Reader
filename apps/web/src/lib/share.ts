import { MAGAZINE } from './brand';

const SHARE_PREFIX = '#share=';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function encodeShare(markdown: string): Promise<string> {
  const bytes = new TextEncoder().encode(markdown);
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return `gz.${bytesToBase64Url(compressed)}`;
  }
  return `raw.${bytesToBase64Url(bytes)}`;
}

export async function decodeShare(payload: string): Promise<string | null> {
  try {
    const separator = payload.indexOf('.');
    if (separator === -1) return null;
    const kind = payload.slice(0, separator);
    const data = payload.slice(separator + 1);
    if (!data) return null;
    const bytes = base64UrlToBytes(data);
    if (kind === 'gz') {
      if (typeof DecompressionStream === 'undefined') return null;
      const stream = new Blob([bytes.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export async function decodeShareHash(payload: string): Promise<string | null> {
  return decodeShare(payload);
}

export async function buildShareUrl(markdown: string): Promise<string> {
  const payload = await encodeShare(markdown);
  const url = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${payload}`;
  if (url.length > 120000) {
    throw new Error('Document is too large for a share link. Export HTML or PDF instead.');
  }
  return url;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export async function copyShareLink(markdown: string): Promise<void> {
  await writeClipboard(await buildShareUrl(markdown));
}

export async function shareDocument(options: {
  title: string;
  markdown: string;
}): Promise<'shared' | 'copied'> {
  const url = await buildShareUrl(options.markdown);
  if (typeof navigator.share === 'function' && url.length < 30000) {
    try {
      await navigator.share({
        title: options.title,
        text: `${MAGAZINE.name} — ${MAGAZINE.tagline}`,
        url,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
    }
  }
  await writeClipboard(url);
  return 'copied';
}
