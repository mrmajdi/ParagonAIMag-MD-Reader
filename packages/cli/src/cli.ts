#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { chmod, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { startServer, type RunningServer } from '@paragon-ai-mag/server';

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

interface Options {
  target: string;
  port: number;
  host: string;
  open: boolean;
  watch: boolean;
}

function help(): string {
  return `
Paragon AI MAG MD Reader ${VERSION}

Usage
  paragon [file.md]              Open a Markdown file
  paragon .                      Open a folder and its Markdown tree
  paragon list [dir]             List Markdown files recursively
  paragon install                Make Paragon the default .md app (this user)
  paragon uninstall              Remove the file association
  paragon --version

Options
  --port <number>                Port (default 7331)
  --host <address>               Bind address (default 127.0.0.1)
  --no-open                      Do not open the browser
  --no-watch                     Disable live reload
  --help

All content stays on this machine. The server binds to 127.0.0.1 and refuses
paths outside the opened file/folder.
`.trim();
}

function positivePort(value: string | undefined): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function parseArgs(argv: string[]): { command: 'serve' | 'list' | 'install' | 'uninstall' | 'help' | 'version'; options: Options } {
  const positional: string[] = [];
  let port = 7331;
  let host = '127.0.0.1';
  let open = true;
  let watch = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? '';
    if (arg === '--help' || arg === '-h') return { command: 'help', options: { target: '.', port, host, open, watch } };
    if (arg === '--version' || arg === '-v') return { command: 'version', options: { target: '.', port, host, open, watch } };
    if (arg === '--no-open') { open = false; continue; }
    if (arg === '--no-watch') { watch = false; continue; }
    if (arg === '--port') { port = positivePort(argv[++index]); continue; }
    if (arg.startsWith('--port=')) { port = positivePort(arg.slice(7)); continue; }
    if (arg === '--host') { host = argv[++index] || host; continue; }
    if (arg.startsWith('--host=')) { host = arg.slice(7) || host; continue; }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }

  const [first, ...rest] = positional;
  if (first === 'install' || first === 'uninstall' || first === 'list' || first === 'help') {
    return { command: first, options: { target: rest[0] ?? '.', port, host, open, watch } };
  }
  return { command: 'serve', options: { target: first ?? '.', port, host, open, watch } };
}

async function listMarkdown(root: string, dir = '', depth = 0): Promise<string[]> {
  if (depth > 12) return [];
  const absolute = resolve(root, dir);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink() || entry.name.startsWith('.') || IGNORED.has(entry.name)) continue;
    const child = dir ? join(dir, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...(await listMarkdown(root, child, depth + 1)));
    else if (entry.isFile() && MARKDOWN.test(entry.name)) files.push(child.split(sep).join('/'));
    if (files.length > 2000) break;
  }
  return files;
}

async function initialDocument(root: string): Promise<string | null> {
  const files = await listMarkdown(root);
  const readme = files.find((file) => /(^|\/)readme\.(md|markdown|mdx)$/i.test(file));
  return readme ?? files[0] ?? null;
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args =
    process.platform === 'win32' ? ['/c', 'start', '""', url] : [url];
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    console.log(`Open ${url} in your browser.`);
  }
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function associationEntry(): { node: string; cli: string } {
  return {
    node: process.execPath,
    cli: resolve(process.argv[1] ?? join(process.cwd(), 'node_modules/paragon-reader/bin/paragon.js')),
  };
}

async function installMac(): Promise<void> {
  const { node, cli } = associationEntry();
  const app = join(homedir(), 'Applications', 'Paragon MD Reader.app');
  const macos = join(app, 'Contents', 'MacOS');
  await mkdir(macos, { recursive: true });
  const script = `#!/bin/sh\nexec "${node}" "${cli}" "$@"\n`;
  const executable = join(macos, 'paragon');
  await writeFile(executable, script, 'utf8');
  await chmod(executable, 0o755);

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>paragon</string>
  <key>CFBundleIdentifier</key><string>com.paragonaimag.mdreader</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Paragon MD Reader</string>
  <key>CFBundleDisplayName</key><string>Paragon MD Reader</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${VERSION}</string>
  <key>CFBundleVersion</key><string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeName</key><string>Markdown document</string>
      <key>CFBundleTypeRole</key><string>Viewer</string>
      <key>LSHandlerRank</key><string>Default</string>
      <key>CFBundleTypeExtensions</key>
      <array><string>md</string><string>markdown</string><string>mdx</string></array>
      <key>LSItemContentTypes</key>
      <array><string>net.daringfireball.markdown</string><string>public.plain-text</string></array>
    </dict>
  </array>
</dict>
</plist>`;
  await writeFile(join(app, 'Contents', 'Info.plist'), plist, 'utf8');
  const lsregister =
    '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
  try {
    execFileSync(lsregister, ['-f', app], { stdio: 'ignore' });
  } catch {
    // LaunchServices updates on next login if the tool is unavailable.
  }
  console.log(`Installed ${app}`);
  console.log('If the association does not change immediately, log out and back in.');
}

async function installWindows(): Promise<void> {
  const { node, cli } = associationEntry();
  const command = `"${node}" "${cli}" "%1"`;
  const classes = 'HKCU\\Software\\Classes';
  for (const extension of ['.md', '.markdown', '.mdx']) {
    execFileSync('reg', ['add', `${classes}\\${extension}`, '/ve', '/d', 'Paragon.Markdown', '/f'], { stdio: 'ignore' });
  }
  execFileSync('reg', ['add', `${classes}\\Paragon.Markdown`, '/ve', '/d', 'Markdown document', '/f'], { stdio: 'ignore' });
  execFileSync('reg', ['add', `${classes}\\Paragon.Markdown\\shell\\open\\command`, '/ve', '/d', command, '/f'], { stdio: 'ignore' });
  console.log('Registered .md, .markdown and .mdx for the current Windows user.');
}

async function installLinux(): Promise<void> {
  const { node, cli } = associationEntry();
  const applications = join(homedir(), '.local', 'share', 'applications');
  await mkdir(applications, { recursive: true });
  const desktop = `[Desktop Entry]
Type=Application
Name=Paragon MD Reader
Comment=Read Markdown locally, with RTL, diagrams and math
Exec="${node}" "${cli}" %f
Terminal=false
MimeType=text/markdown;text/x-markdown;
Categories=Utility;TextTools;Office;
StartupNotify=true
`;
  const file = join(applications, 'paragon-md-reader.desktop');
  await writeFile(file, desktop, 'utf8');
  await chmod(file, 0o755);
  for (const mime of ['text/markdown', 'text/x-markdown']) {
    try {
      execFileSync('xdg-mime', ['default', 'paragon-md-reader.desktop', mime], { stdio: 'ignore' });
    } catch {
      // xdg-mime is optional in minimal environments.
    }
  }
  console.log(`Installed ${file}`);
}

async function install(): Promise<void> {
  if (process.platform === 'darwin') return installMac();
  if (process.platform === 'win32') return installWindows();
  return installLinux();
}

async function uninstall(): Promise<void> {
  if (process.platform === 'darwin') {
    const app = join(homedir(), 'Applications', 'Paragon MD Reader.app');
    await rm(app, { recursive: true, force: true });
    console.log(`Removed ${app}`);
    return;
  }
  if (process.platform === 'win32') {
    const classes = 'HKCU\\Software\\Classes';
    for (const key of [`${classes}\\Paragon.Markdown`, `${classes}\\.md`, `${classes}\\.markdown`, `${classes}\\.mdx`]) {
      try {
        execFileSync('reg', ['delete', key, '/f'], { stdio: 'ignore' });
      } catch {
        // Already absent.
      }
    }
    console.log('Removed the per-user Markdown association.');
    return;
  }
  await rm(join(homedir(), '.local', 'share', 'applications', 'paragon-md-reader.desktop'), { force: true });
  console.log('Removed the desktop entry. Choose a new default Markdown app in your desktop settings.');
}

async function serve(options: Options): Promise<void> {
  const target = resolve(options.target);
  const info = await stat(target).catch(() => null);
  if (!info) throw new Error(`No such file or folder: ${target}`);

  let root: string;
  let initial: string | null;
  if (info.isDirectory()) {
    root = target;
    initial = await initialDocument(root);
  } else {
    if (!MARKDOWN.test(target) && !/\.txt$/i.test(target)) {
      throw new Error('Paragon Reader opens Markdown files (.md, .markdown, .mdx, .txt).');
    }
    root = dirname(target);
    initial = relative(root, target).split(sep).join('/');
  }

  let server: RunningServer | null = null;
  server = await startServer({
    root,
    file: initial ?? undefined,
    host: options.host,
    port: options.port,
    watch: options.watch,
  });

  const query = initial
    ? `?file=${encodeURIComponent(initial)}`
    : `?dir=${encodeURIComponent('.')}`;
  const url = `${server.url}${query}`;
  console.log(`Paragon MD Reader ${VERSION}`);
  console.log(`Root: ${server.root} (${root})`);
  console.log(`Open: ${url}`);
  console.log(options.watch ? 'Watching for changes. Ctrl+C to stop.' : 'Live reload disabled. Ctrl+C to stop.');

  if (options.open) openBrowser(url);

  const stop = async () => {
    await server?.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === 'help') {
    console.log(help());
    return;
  }
  if (command === 'version') {
    console.log(VERSION);
    return;
  }
  if (command === 'install') return install();
  if (command === 'uninstall') return uninstall();
  if (command === 'list') {
    const root = resolve(options.target);
    const files = await listMarkdown(root);
    if (files.length === 0) console.log('No Markdown files found.');
    else files.forEach((file) => console.log(file));
    return;
  }
  await serve(options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error('Run `paragon --help` for usage.');
  process.exit(1);
});
