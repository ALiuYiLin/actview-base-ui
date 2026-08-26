/**
 * Rewrite `@/*` / `#/*` path-alias imports in emitted declaration files (build/)
 * to relative paths, so published consumers don't need the `@`/`#` tsconfig
 * `paths` mapping (tsgo/tsc emit declarations without resolving path aliases).
 *
 *   build/accordion/root/AccordionRoot.d.ts:
 *     import type { X } from '@/internals/types'
 *       -> import type { X } from '../../internals/types'
 *
 * Usage: node scripts/rewrite-dts-aliases.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const buildDir = path.resolve(packageRoot, 'build');

/**
 * Recursively collect all .d.ts files under a directory.
 */
function collectDts(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectDts(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Rewrite alias imports in a single declaration file.
 * Returns the number of rewritten imports.
 */
function rewriteFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Depth of the file's directory relative to build/ (0 = build root).
  const rel = path.relative(buildDir, path.dirname(filePath));
  const depth = rel ? rel.split(path.sep).length : 0;
  const prefix = './' + '../'.repeat(depth);

  let count = 0;
  const next = content.replace(
    /(from\s+)(['"])(?:@|#)\/([^'"]+)\2/g,
    (_, head, quote, spec) => {
      count++;
      return `${head}${quote}${prefix}${spec}${quote}`;
    },
  );
  // Dynamic imports: import('@/x')
  const next2 = next.replace(
    /(import\s*\(\s*)(['"])(?:@|#)\/([^'"]+)\2/g,
    (_, head, quote, spec) => {
      count++;
      return `${head}${quote}${prefix}${spec}${quote}`;
    },
  );

  if (next2 !== content) {
    writeFileSync(filePath, next2, 'utf-8');
  }
  return count;
}

function main() {
  if (!existsSync(buildDir)) {
    console.error(`build/ directory not found: ${buildDir}`);
    process.exit(1);
  }

  const files = collectDts(buildDir);
  let rewrittenFiles = 0;
  let totalRewrites = 0;

  for (const file of files) {
    const count = rewriteFile(file);
    if (count > 0) {
      rewrittenFiles++;
      totalRewrites += count;
    }
  }

  console.log(
    `Rewrote ${totalRewrites} alias import${totalRewrites === 1 ? '' : 's'} across ${rewrittenFiles} / ${files.length} declaration files.`,
  );
}

main();
