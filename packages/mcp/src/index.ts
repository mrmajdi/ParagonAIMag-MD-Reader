#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const VERSION = '0.1.0';
const PROTOCOL = '2024-11-05';
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

type JsonRpcId = string | number | null;

interface RpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

const TOOLS = [
  {
    name: 'open_markdown',
    description:
      'Read a local Markdown file and return its raw text. Use this before summarizing or editing a document.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to a .md/.markdown/.mdx/.txt file' },
        max_chars: {
          type: 'number',
          description: 'Maximum characters to return (default 200000)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'outline_markdown',
    description: 'Return the heading outline of a Markdown file with level, text and line number.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path to a Markdown file' } },
      required: ['path'],
    },
  },
  {
    name: 'list_markdown',
    description: 'List Markdown files in a folder, recursively by default, ignoring build and dependency folders.',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Folder to scan (default: current directory)' },
        recursive: { type: 'boolean', description: 'Scan subfolders (default true)' },
        limit: { type: 'number', description: 'Maximum files to return (default 500)' },
      },
    },
  },
  {
    name: 'search_markdown',
    description: 'Search text across Markdown files and return matching lines with file and line number.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Case-insensitive text to find' },
        dir: { type: 'string', description: 'Folder to search (default: current directory)' },
        limit: { type: 'number', description: 'Maximum matches (default 50)' },
      },
      required: ['query'],
    },
  },
] as const;

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function requireMarkdown(path: string): Promise<string> {
  if (!path) throw new Error('A path is required.');
  const absolute = resolve(path);
  const info = await stat(absolute);
  if (!info.isFile()) throw new Error(`Not a file: ${absolute}`);
  if (!MARKDOWN.test(absolute)) throw new Error('Only Markdown/text files are supported.');
  if (info.size > 32 * 1024 * 1024) throw new Error('File is too large (limit 32 MB).');
  return absolute;
}

async function listFiles(dir: string, recursive = true, limit = 500): Promise<string[]> {
  const root = resolve(dir || '.');
  const files: string[] = [];

  const walk = async (folder: string, depth: number) => {
    if (files.length >= limit || depth > 12) return;
    const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (files.length >= limit) return;
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || IGNORED.has(entry.name)) continue;
      const child = join(folder, entry.name);
      if (entry.isDirectory() && recursive) await walk(child, depth + 1);
      else if (entry.isFile() && MARKDOWN.test(entry.name)) files.push(child);
    }
  };

  await walk(root, 0);
  return files;
}

function outline(source: string): Array<{ level: number; text: string; line: number }> {
  const headings: Array<{ level: number; text: string; line: number }> = [];
  let fenced = false;
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    const level = match[1]?.length ?? 1;
    const label = match[2]?.trim() ?? '';
    if (label) headings.push({ level, text: label, line: index + 1 });
  }
  return headings;
}

async function search(
  dir: string,
  query: string,
  limit: number,
): Promise<Array<{ file: string; line: number; text: string }>> {
  if (!query.trim()) throw new Error('A non-empty query is required.');
  const needle = query.toLowerCase();
  const files = await listFiles(dir, true, 2000);
  const matches: Array<{ file: string; line: number; text: string }> = [];
  for (const file of files) {
    if (matches.length >= limit) break;
    const source = await readFile(file, 'utf8').catch(() => '');
    if (!source.toLowerCase().includes(needle)) continue;
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length && matches.length < limit; index += 1) {
      const line = lines[index] ?? '';
      if (line.toLowerCase().includes(needle)) {
        matches.push({ file, line: index + 1, text: line.trim().slice(0, 400) });
      }
    }
  }
  return matches;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    if (name === 'open_markdown') {
      const absolute = await requireMarkdown(String(args.path ?? ''));
      const max = Math.max(1000, Math.min(Number(args.max_chars) || 200_000, 2_000_000));
      const source = await readFile(absolute, 'utf8');
      const body = source.length > max ? `${source.slice(0, max)}\n\n[truncated at ${max} characters]` : source;
      return text(`# ${basename(absolute)}\n\n${body}`);
    }
    if (name === 'outline_markdown') {
      const absolute = await requireMarkdown(String(args.path ?? ''));
      const source = await readFile(absolute, 'utf8');
      const headings = outline(source);
      if (headings.length === 0) return text(`No headings found in ${absolute}.`);
      return text(
        `${absolute}\n\n${headings
          .map((heading) => `${'  '.repeat(heading.level - 1)}${'#'.repeat(heading.level)} ${heading.text} (line ${heading.line})`)
          .join('\n')}`,
      );
    }
    if (name === 'list_markdown') {
      const dir = resolve(String(args.dir ?? '.'));
      const files = await listFiles(dir, args.recursive !== false, Math.max(1, Math.min(Number(args.limit) || 500, 2000)));
      return text(
        files.length === 0
          ? `No Markdown files in ${dir}.`
          : `${files.length} Markdown file(s) in ${dir}:\n\n${files.join('\n')}`,
      );
    }
    if (name === 'search_markdown') {
      const matches = await search(
        String(args.dir ?? '.'),
        String(args.query ?? ''),
        Math.max(1, Math.min(Number(args.limit) || 50, 500)),
      );
      return text(
        matches.length === 0
          ? 'No matches.'
          : matches.map((match) => `${match.file}:${match.line}: ${match.text}`).join('\n'),
      );
    }
    return fail(`Unknown tool: ${name}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function send(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function respond(id: JsonRpcId | undefined, result: unknown): void {
  if (id === undefined) return;
  send({ jsonrpc: '2.0', id, result });
}

function respondError(id: JsonRpcId | undefined, code: number, message: string): void {
  if (id === undefined) return;
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handle(request: RpcRequest): Promise<void> {
  const method = request.method ?? '';
  const id = request.id;

  if (method === 'initialize') {
    respond(id, {
      protocolVersion:
        typeof request.params?.protocolVersion === 'string'
          ? request.params.protocolVersion
          : PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: 'paragon-md-reader', version: VERSION },
    });
    return;
  }
  if (method === 'notifications/initialized' || method === 'initialized') return;
  if (method === 'ping') {
    respond(id, {});
    return;
  }
  if (method === 'tools/list') {
    respond(id, { tools: TOOLS });
    return;
  }
  if (method === 'tools/call') {
    const name = String(request.params?.name ?? '');
    const args =
      request.params?.arguments && typeof request.params.arguments === 'object'
        ? (request.params.arguments as Record<string, unknown>)
        : {};
    respond(id, await callTool(name, args));
    return;
  }
  respondError(id, -32601, `Method not found: ${method}`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
let chain: Promise<void> = Promise.resolve();

input.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let request: RpcRequest;
  try {
    request = JSON.parse(trimmed) as RpcRequest;
  } catch {
    process.stderr.write('Paragon MCP: invalid JSON message ignored.\n');
    return;
  }
  chain = chain
    .then(() => handle(request))
    .catch((error) => {
      process.stderr.write(`Paragon MCP: ${error instanceof Error ? error.message : error}\n`);
    });
});

input.on('close', () => {
  void chain.finally(() => process.exit(0));
});

process.on('uncaughtException', (error) => {
  process.stderr.write(`Paragon MCP: ${error.message}\n`);
});
