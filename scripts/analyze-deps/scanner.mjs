/**
 * scanner.mjs - 目录扫描模块
 *
 * 递归遍历目录，按后缀过滤，返回文件列表。
 * 跳过 node_modules 和隐藏目录。
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * 扫描目录，返回所有匹配后缀的文件绝对路径列表。
 *
 * @param {string} dir - 要扫描的目录路径
 * @param {string[]} extensions - 允许的后缀列表，如 ['.ts', '.tsx']
 * @returns {string[]} 匹配的文件绝对路径数组
 */
export function scanDirectory(dir, extensions) {
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
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}