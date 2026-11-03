#!/usr/bin/env node
import('../dist/cli.js').catch((error) => {
  console.error('Paragon Reader failed to start:', error instanceof Error ? error.message : error);
  console.error('Run `npm run build:cli` first if you are working from source.');
  process.exit(1);
});
