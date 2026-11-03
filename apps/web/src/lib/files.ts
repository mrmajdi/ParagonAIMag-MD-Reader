import type { FileNode, FsDirectoryHandle, FsFileHandle } from './types';

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx', '.mdown', '.mkd'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'];
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.turbo',
  '.venv',
  'venv',
  'vendor',
  '__pycache__',
]);

export function isMarkdownFile(name: string): boolean {
  const lower = name.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function isImageFile(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function isTextFile(name: string): boolean {
  return isMarkdownFile(name) || name.toLowerCase().endsWith('.txt');
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

export function joinPath(base: string, name: string): string {
  if (!base || base === '.') return name;
  return `${base.replace(/\/+$/, '')}/${name}`;
}

export function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

export function normalizePath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join('/');
}

export function resolveRelativePath(currentPath: string, href: string): string {
  const clean = decodeURIComponent(href.split('#')[0]?.split('?')[0] ?? '');
  if (!clean) return '';
  if (clean.startsWith('/')) return normalizePath(clean);
  return normalizePath(joinPath(dirname(currentPath), clean));
}

export function fileNameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1) || normalized;
}

export function findFileNode(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findFileNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function flattenFileNodes(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.kind === 'file') files.push(node);
    else if (node.children) files.push(...flattenFileNodes(node.children));
  }
  return files;
}

export function countFiles(nodes: FileNode[]): number {
  return nodes.reduce(
    (total, node) => total + (node.kind === 'file' ? 1 : countFiles(node.children ?? [])),
    0,
  );
}

export interface ScanResult {
  tree: FileNode[];
  markdownHandles: Map<string, FsFileHandle>;
  imageHandles: Map<string, FsFileHandle>;
  count: number;
}

interface ScanBudget {
  entries: number;
  files: number;
  maxEntries: number;
  maxFiles: number;
}

const DEFAULT_BUDGET: ScanBudget = {
  entries: 0,
  files: 0,
  maxEntries: 8000,
  maxFiles: 1500,
};

async function scanDirectoryHandle(
  handle: FsDirectoryHandle,
  basePath: string,
  depth: number,
  result: ScanResult,
  budget: ScanBudget,
): Promise<FileNode[]> {
  if (depth > 8 || budget.entries > budget.maxEntries || budget.files > budget.maxFiles) {
    return [];
  }

  const entries: Array<FsFileHandle | FsDirectoryHandle> = [];
  for await (const entry of handle.values()) {
    entries.push(entry);
    budget.entries += 1;
    if (budget.entries > budget.maxEntries) break;
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const path = joinPath(basePath, entry.name);

    if (entry.kind === 'directory') {
      if (IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) continue;
      const children = await scanDirectoryHandle(entry, path, depth + 1, result, budget);
      if (children.length > 0) {
        nodes.push({ name: entry.name, path, kind: 'directory', children });
      }
      continue;
    }

    if (isMarkdownFile(entry.name)) {
      result.markdownHandles.set(path, entry);
      result.count += 1;
      budget.files += 1;
      nodes.push({ name: entry.name, path, kind: 'file', handle: entry });
    } else if (isImageFile(entry.name)) {
      result.imageHandles.set(path, entry);
    }
  }

  return nodes;
}

export async function scanDirectory(root: FsDirectoryHandle): Promise<ScanResult> {
  const result: ScanResult = {
    tree: [],
    markdownHandles: new Map(),
    imageHandles: new Map(),
    count: 0,
  };
  result.tree = await scanDirectoryHandle(root, '', 0, result, { ...DEFAULT_BUDGET });
  return result;
}

export async function readHandleText(handle: FsFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export function buildDroppedFiles(files: FileList | File[]): {
  tree: FileNode[];
  handles: Map<string, File>;
} {
  const list = Array.from(files).filter((file) => isTextFile(file.name));
  const handles = new Map<string, File>();
  const tree: FileNode[] = list
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    .map((file) => {
      handles.set(file.name, file);
      return { name: file.name, path: file.name, kind: 'file' as const, file };
    });
  return { tree, handles };
}

export async function resolveImageHandle(
  imageHandles: Map<string, FsFileHandle>,
  documentPath: string,
  src: string,
): Promise<Blob | null> {
  if (!src || src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:')) {
    return null;
  }
  const resolved = resolveRelativePath(documentPath, src);
  const handle = imageHandles.get(resolved);
  if (!handle) return null;
  try {
    return await handle.getFile();
  } catch {
    return null;
  }
}
