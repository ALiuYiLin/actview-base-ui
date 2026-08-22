/**
 * Script to rewrite relative imports in `packages/actview/src/` to use `@/*` and `#/*` path aliases.
 *
 * Transforms (src → @/):
 *   import { X } from '../../internals/types'   -> import { X } from '@/internals/types'
 *   import { Y } from './useCollapsibleRoot'    -> import { Y } from '@/collapsible/root/useCollapsibleRoot'
 *   export type * from '../root/AccordionRoot'  -> export type * from '@/accordion/root/AccordionRoot'
 *
 * Transforms (package root → #/):
 *   import { createRenderer } from '../../../test/createRenderer'
 *     -> import { createRenderer } from '#/test/createRenderer'
 *
 * Usage: node scripts/rewrite-imports.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const srcDir = path.resolve(packageRoot, 'src');

/**
 * Recursively collect all .ts and .tsx files under a directory.
 */
function collectFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Resolve a relative import path against the file's directory.
 */
function resolveRelativeImport(relativePath, filePath) {
  const fileDir = path.dirname(filePath);
  return path.resolve(fileDir, relativePath);
}

/**
 * Convert an absolute path to a path relative to a base directory, using forward slashes.
 */
function makeRelative(baseDir, absolutePath) {
  return path.relative(baseDir, absolutePath).replace(/\\/g, '/');
}

/**
 * Try to resolve a path to an actual file by checking common extensions.
 * Returns the resolved path with extension, or null if not found.
 */
function resolveFilePath(basePath) {
  // Check if the path already exists as-is
  try {
    if (statSync(basePath).isFile()) return basePath;
  } catch {
    // not found
  }

  // Try extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  for (const ext of extensions) {
    try {
      const candidate = basePath + ext;
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not found
    }
  }

  // Try as directory with index file
  for (const indexFile of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
    try {
      const candidate = path.join(basePath, indexFile);
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not found
    }
  }

  return null;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip the file extension and trailing /index from a path.
 */
function cleanAliasPath(aliasPath) {
  return aliasPath
    .replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '')
    .replace(/\/index$/, '');
}

/**
 * Rewrite imports in a single file.
 * Returns the number of imports rewritten, or 0 if no changes.
 */
function rewriteFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const relativeFilePath = path.relative(packageRoot, filePath);

  // Regex to match relative paths in import/export statements
  // Matches: from './...' or from '../...' or export * from './...' or export { x } from './...'
  const importPattern = /(?:from\s+|import\s+)(['"])(\.\.?\/[^'"]+)\1/g;

  const matches = [];
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    matches.push({
      full: match[0],
      quote: match[1],
      importPath: match[2],
      index: match.index,
    });
  }

  if (matches.length === 0) {
    return 0;
  }

  const replacements = [];

  for (const m of matches) {
    const resolvedPath = resolveRelativeImport(m.importPath, filePath);
    const resolvedFile = resolveFilePath(resolvedPath);

    if (resolvedFile) {
      if (resolvedFile.startsWith(srcDir)) {
        // File is inside src/ → use @/ alias
        const srcRelative = makeRelative(srcDir, resolvedFile);
        const cleanPath = cleanAliasPath(srcRelative);
        replacements.push({
          oldPath: m.importPath,
          newPath: `@/${cleanPath}`,
          quote: m.quote,
        });
      } else if (resolvedFile.startsWith(packageRoot + path.sep)) {
        // File is inside the package root but outside src/ → use #/ alias
        const pkgRelative = makeRelative(packageRoot, resolvedFile);
        const cleanPath = cleanAliasPath(pkgRelative);
        replacements.push({
          oldPath: m.importPath,
          newPath: `#/${cleanPath}`,
          quote: m.quote,
        });
      }
      // else: outside the package → leave as relative import
    }
  }

  if (replacements.length === 0) {
    return 0;
  }

  let newContent = content;
  for (const { oldPath, newPath, quote } of replacements) {
    // Replace the exact import path within quotes
    const escapedOld = escapeRegex(oldPath);
    const pattern = new RegExp(`(['"])${escapedOld}\\1`, 'g');
    newContent = newContent.replace(pattern, `${quote}${newPath}${quote}`);
  }

  writeFileSync(filePath, newContent, 'utf-8');
  console.log(`  Rewrote ${relativeFilePath} (${replacements.length} import${replacements.length > 1 ? 's' : ''})`);
  return replacements.length;
}

function main() {
  console.log('Scanning for files in src/...\n');

  const files = collectFiles(srcDir);

  console.log(`Found ${files.length} files to process.\n`);

  let rewrittenCount = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const count = rewriteFile(file);
    if (count > 0) {
      rewrittenCount++;
      totalReplacements += count;
    }
  }

  console.log(`\nDone. Rewrote ${rewrittenCount} / ${files.length} files (${totalReplacements} total imports).`);
}

main();