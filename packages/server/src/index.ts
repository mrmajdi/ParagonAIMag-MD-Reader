import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, watch, type FSWatcher } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ServerOptions {
  /** Directory the reader may access. Defaults to the file's directory or cwd. */
  root?: string;
  /** Markdown file to open first, relative to root. */
  file?: string;
  host?: string;
  port?: number;
  watch?: boolean;
  /** Built web app (apps/web/dist). Auto-detected when omitted. */
  webRoot?: string;
}

export interface RunningServer {
  url: string;
  port: number;
  host: string;
  root: string;
  close: () => Promise<void>;
}

interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
}

const VERSION = '0.1.0';
const MARKDOWN = /\.(md|markdown|mdx|txt)$/i;
const IGNORED = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  '.turbo',
  '.freebuff',
]);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.bmp', '.ico']);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveRoot(options: ServerOptions): string {
  if (options.root) return resolve(options.root);
  if (options.file) return resolve(dirname(options.file));
  return process.cwd();
}

function resolveWebRoot(options: ServerOptions): string | null {
  const candidates = [
    options.webRoot,
    process.env.PARAGON_WEB_DIST,
    resolve(process.cwd(), 'apps/web/dist'),
    fileURLToPath(new URL('../../../apps/web/dist/', import.meta.url)),
  ].filter(Boolean) as string[];
  return candidates[0] ?? null;
}

function safeJoin(root: string, requested: string): string {
  const base = resolve(root);
  const target = resolve(base, requested || '.');
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw Object.assign(new Error('Path is outside the reader root'), { status: 403 });
  }
  return target;
}

function toPosix(value: string): string {
  return value.split(sep).join('/');
}

function contentType(file: string): string {
  return MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  response.end(body);
}

function sendText(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(message);
}

async function listTree(root: string, dir = '', depth = 0): Promise<FileNode[]> {
  if (depth > 12) return [];
  const absolute = safeJoin(root, dir);
  let entries;
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes: FileNode[] = [];
  const sorted = entries
    .filter((entry) => !entry.name.startsWith('.') && !IGNORED.has(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    if (entry.isSymbolicLink()) continue;
    const childRel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const children = await listTree(root, childRel, depth + 1);
      if (children.length > 0) {
        nodes.push({ name: entry.name, path: toPosix(childRel), kind: 'directory', children });
      }
    } else if (entry.isFile() && MARKDOWN.test(entry.name)) {
      nodes.push({ name: entry.name, path: toPosix(childRel), kind: 'file' });
    }
    if (nodes.length > 2000) break;
  }
  return nodes;
}

async function firstMarkdown(root: string): Promise<string | null> {
  const tree = await listTree(root);
  const readme = tree.find(
    (node) => node.kind === 'file' && /^readme\.(md|markdown|mdx)$/i.test(node.name),
  );
  if (readme) return readme.path;
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (node.kind === 'file') return node.path;
    if (node.children) stack.unshift(...node.children);
  }
  return null;
}

function docPayload(root: string, relPath: string, content: string) {
  const relDir = toPosix(dirname(relPath));
  const segments = relDir === '.' ? [] : relDir.split('/').map(encodeURIComponent);
  const assetBase = `/api/asset/${segments.length ? `${segments.join('/')}/` : ''}`;
  return {
    name: basename(relPath),
    path: toPosix(relPath),
    content,
    root: basename(root),
    assetBase,
  };
}

async function serveStatic(
  webRoot: string | null,
  pathname: string,
  response: ServerResponse,
  headOnly: boolean,
): Promise<void> {
  if (!webRoot) {
    sendText(response, 503, 'The web app is not built. Run `npm run build:web` first.');
    return;
  }
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = resolve(webRoot, requested);
  if (candidate !== resolve(webRoot) && !candidate.startsWith(`${resolve(webRoot)}${sep}`)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  let file = candidate;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(webRoot, 'index.html');
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': contentType(file),
      'Content-Length': info.size,
      'Cache-Control': extname(file) === '.html' ? 'no-store' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    if (headOnly) {
      response.end();
      return;
    }
    createReadStream(file).pipe(response);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

export async function startServer(options: ServerOptions = {}): Promise<RunningServer> {
  const root = resolveRoot(options);
  const webRoot = resolveWebRoot(options);
  const host = options.host || '127.0.0.1';
  const port = options.port ?? 7331;
  const shouldWatch = options.watch !== false;
  const clients = new Set<ServerResponse>();
  let watcher: FSWatcher | null = null;
  let timer: NodeJS.Timeout | null = null;

  const broadcast = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const client of clients) {
        try {
          client.write('event: change\ndata: {}\n\n');
        } catch {
          clients.delete(client);
        }
      }
    }, 120);
  };

  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'Only GET is supported' });
      return;
    }

    const parsed = new URL(request.url || '/', `http://${request.headers.host || host}`);
    const { pathname } = parsed;
    const headOnly = request.method === 'HEAD';

    try {
      if (pathname === '/api/health') {
        sendJson(response, 200, { ok: true, name: 'Paragon AI MAG MD Reader', version: VERSION, root });
        return;
      }

      if (pathname === '/api/events') {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        response.write('event: ready\ndata: {}\n\n');
        clients.add(response);
        const heartbeat = setInterval(() => {
          try {
            response.write(': ping\n\n');
          } catch {
            // The close handler removes the client.
          }
        }, 25_000);
        request.on('close', () => {
          clearInterval(heartbeat);
          clients.delete(response);
        });
        return;
      }

      if (pathname === '/api/tree') {
        const dir = parsed.searchParams.get('dir') || '';
        const files = await listTree(root, dir);
        sendJson(response, 200, { root: basename(root), files });
        return;
      }

      if (pathname === '/api/doc') {
        const requested = parsed.searchParams.get('path');
        if (!requested) {
          sendJson(response, 400, { error: 'Missing path' });
          return;
        }
        const absolute = safeJoin(root, requested);
        const info = await stat(absolute);
        if (!info.isFile() || info.size > 32 * 1024 * 1024) {
          sendJson(response, 400, { error: 'Not a readable Markdown file' });
          return;
        }
        const content = await readFile(absolute, 'utf8');
        sendJson(response, 200, docPayload(root, relative(root, absolute), content));
        return;
      }

      if (pathname.startsWith('/api/asset/')) {
        const rel = pathname
          .slice('/api/asset/'.length)
          .split('/')
          .map((part) => decodeURIComponent(part))
          .join('/');
        if (!IMAGE_EXT.has(extname(rel).toLowerCase())) {
          sendText(response, 403, 'Only image assets are exposed');
          return;
        }
        const absolute = safeJoin(root, rel);
        const info = await stat(absolute);
        if (!info.isFile()) throw new Error('not found');
        response.writeHead(200, {
          'Content-Type': contentType(absolute),
          'Content-Length': info.size,
          'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        });
        if (headOnly) response.end();
        else createReadStream(absolute).pipe(response);
        return;
      }

      if (pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'Unknown API route' });
        return;
      }

      await serveStatic(webRoot, pathname, response, headOnly);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : 'Unexpected error',
      });
    }
  });

  if (shouldWatch) {
    try {
      watcher = watch(root, { recursive: true }, (_event, filename) => {
        const name = filename ?? '';
        if (!name) return;
        if (name.includes('node_modules') || name.includes('.git')) return;
        if (MARKDOWN.test(name) || IMAGE_EXT.has(extname(name).toLowerCase())) broadcast();
      });
    } catch {
      watcher = null;
    }
  }

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, host, () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://${host}:${actualPort}/`;

  return {
    url,
    port: actualPort,
    host,
    root,
    close: async () => {
      if (timer) clearTimeout(timer);
      watcher?.close();
      for (const client of clients) client.end();
      clients.clear();
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    },
  };
}

export const DEFAULT_PORT = 7331;
export const DEFAULT_HOST = '127.0.0.1';
