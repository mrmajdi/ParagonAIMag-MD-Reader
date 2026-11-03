import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../apps/web/dist');
const target = resolve(here, 'reader');

try {
  await stat(source);
} catch {
  console.error('apps/web/dist is missing. Run `npm run build:web` before building the Chrome extension.');
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log('Chrome extension ready in extensions/chrome (load unpacked).');
