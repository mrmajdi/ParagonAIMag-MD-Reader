#!/usr/bin/env node
import('../dist/index.js').catch((error) => {
  process.stderr.write(`Paragon MCP failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
