/**
 * scanner.mjs - 目录扫描模块
 *
 * 递归遍历目录，按后缀过滤，返回文件列表。
 * 跳过 node_modules 和隐藏目录。
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * 将 glob 模式串编译为正则表达式。
 *
 * 支持的通配符：
 *   *   — 匹配除路径分隔符外的任意字符
 *   **  — 匹配任意字符（含路径分隔符）
 *   ?   — 匹配单个字符（除路径分隔符外）
 *
 * 匹配时不区分大小写。
 *
 * @param {string} pattern - glob 模式，如 '*.test.*'、'xx/__tests__/*'
 * @returns {RegExp}
 */
export function compileGlob(pattern) {
  let reStr = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') {
      if (i + 1 < pattern.length && pattern[i + 1] === '*') {
        // ** 匹配任意字符（含路径分隔符）
        reStr += '.*';
        i++;
        // 跳过紧跟的 / 或 \（如果有）
        if (i + 1 < pattern.length && (pattern[i + 1] === '/' || pattern[i + 1] === '\\')) {
          i++;
        }
      } else {
        // * 匹配非路径分隔符
        reStr += '[^/\\\\]*';
      }
    } else if (ch === '?') {
      reStr += '[^/\\\\]';
    } else if (ch === '/' || ch === '\\') {
      // 路径分隔符：同时匹配 / 和 \（跨平台兼容）
      reStr += '[/\\\\]';
    } else if (/[.+^${}()|[\]\\]/.test(ch)) {
      reStr += '\\' + ch;
    } else {
      reStr += ch;
    }
  }
  return new RegExp(`^${reStr}$`, 'i');
}

/**
 * 判断文件路径（相对路径）是否匹配任一排除模式。
 *
 * @param {string} relativePath  - 相对于 rootDir 的路径
 * @param {RegExp[]} excludeREs  - 编译后的排除正则列表
 * @returns {boolean} true=应当排除
 */
export function isExcluded(relativePath, excludeREs) {
  // 相对路径（含目录）与 basename 都尝试匹配：glob `*.test.*` 中的 `*` 不含
  // 路径分隔符，直接匹配含目录的相对路径会失败（Windows 反斜杠分隔）。
  const basename = relativePath.split(/[\\/]/).pop() ?? relativePath;
  for (const re of excludeREs) {
    if (re.test(relativePath) || re.test(basename)) {
      return true;
    }
  }
  return false;
}

/**
 * 扫描目录，返回所有匹配后缀的文件绝对路径列表。
 *
 * @param {string} dir            - 要扫描的目录路径
 * @param {string[]} extensions   - 允许的后缀列表，如 ['.ts', '.tsx']
 * @param {RegExp[]} [excludeREs] - 排除模式的正则列表（编译后的）
 * @param {string}   [rootDir]    - 根目录，用于计算相对路径做排除判断
 * @returns {string[]} 匹配的文件绝对路径数组
 */
export function scanDirectory(dir, extensions, excludeREs = [], rootDir = dir) {
  const results = [];

  function walk(currentPath) {
    let entries;
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      // 无权限读取的目录直接跳过
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // 跳过隐藏目录、node_modules 和 .git
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.length === 0 || extensions.includes(ext)) {
          // 排除模式过滤
          if (excludeREs.length > 0) {
            const rel = path.relative(rootDir, fullPath);
            if (isExcluded(rel, excludeREs)) {
              continue;
            }
          }
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}