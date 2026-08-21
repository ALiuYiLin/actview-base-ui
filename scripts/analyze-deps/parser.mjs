/**
 * parser.mjs - 依赖解析模块
 *
 * 读取文件内容，通过正则提取所有 import/require 语句中的模块路径。
 * 先剥离注释再匹配，避免误抓。
 */

import fs from 'node:fs';

/**
 * 解析单个文件，返回所有 import 的模块路径列表（去重）。
 *
 * 覆盖的语法：
 *   - import x from '...'
 *   - import { x } from '...'
 *   - import * as x from '...'
 *   - import '...'                    (side-effect)
 *   - export { x } from '...'
 *   - export * from '...'
 *   - export * as x from '...'
 *   - require('...')
 *   - import('...')
 *
 * @param {string} filePath - 文件的绝对路径
 * @returns {string[]} 去重后的模块路径数组
 */
export function parseImports(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  // 第一步：剥离注释，避免误抓注释中的 import 路径
  const cleaned = content
    // 多行注释 /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 单行注释 // ...（注意不要匹配到 URL 中的 //）
    .replace(/(?:^|[^:])\/\/.*$/gm, '');

  const imports = [];

  // 1. import ... from '...' 或 export ... from '...'
  //    也匹配纯 side-effect import: import '...'
  const fromRe = /(?:from\s+)(['"])([^'"]+)\1/g;
  const sideEffectImportRe = /(?:^|\n)\s*import\s+(['"])([^'"]+)\1/g;

  // 2. require('...')
  const requireRe = /require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;

  // 3. 动态 import('...')
  const dynamicImportRe = /import\s*\(\s*(['"])([^'"]+)\1\s*\)/g;

  let match;

  while ((match = fromRe.exec(cleaned)) !== null) {
    imports.push(match[2]);
  }
  while ((match = sideEffectImportRe.exec(cleaned)) !== null) {
    imports.push(match[2]);
  }
  while ((match = requireRe.exec(cleaned)) !== null) {
    imports.push(match[2]);
  }
  while ((match = dynamicImportRe.exec(cleaned)) !== null) {
    imports.push(match[2]);
  }

  // 去重并返回
  return [...new Set(imports)];
}