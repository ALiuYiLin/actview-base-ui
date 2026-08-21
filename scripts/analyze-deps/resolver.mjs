/**
 * resolver.mjs - 路径解析模块
 *
 * 将 import 语句中的模块路径解析为文件系统中的真实路径。
 * 处理相对路径、后缀补全、index 文件查找等场景。
 */

import fs from 'node:fs';
import path from 'node:path';

/** 尝试补全的扩展名顺序（按优先级排列） */
const EXT_ORDER = [
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.mts',
  '.cjs',
  '.cts',
];

/**
 * 解析一个 import 路径。
 *
 * @param {string} importPath  - import 语句中的原始路径，如 './foo'、'react'
 * @param {string} currentFile - 当前文件的绝对路径
 * @param {string} rootDir     - 项目根目录，用于判断外部依赖
 * @returns {{ resolved: string|null, type: 'internal'|'external'|'unresolved' }}
 */
export function resolveImport(importPath, currentFile, rootDir) {
  // 相对路径：./ 或 ../ 开头
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const currentDir = path.dirname(currentFile);
    const resolved = path.resolve(currentDir, importPath);
    const found = tryResolveFile(resolved);
    if (found) {
      return { resolved: found, type: 'internal' };
    }
    return { resolved: null, type: 'unresolved' };
  }

  // 绝对路径（极少见，但仍可能）
  if (path.isAbsolute(importPath)) {
    const found = tryResolveFile(importPath);
    if (found) {
      return { resolved: found, type: 'internal' };
    }
    return { resolved: null, type: 'unresolved' };
  }

  // 非相对路径：可能是 npm 包或 monorepo 内部包
  // 检查是否在 rootDir 范围内（monorepo 场景）
  // 例如 import 'src/utils/format' 指向 rootDir/src/utils/format
  const trial = path.resolve(rootDir, importPath);
  if (trial.startsWith(rootDir)) {
    const found = tryResolveFile(trial);
    if (found) {
      return { resolved: found, type: 'internal' };
    }
  }

  // 不属于以上任何一种 → 外部依赖（npm 包）
  return { resolved: null, type: 'external' };
}

/**
 * 尝试将 basePath 解析为真实文件路径。
 * 按顺序尝试：精确路径 → 补后缀 → 指向 index 文件。
 *
 * @param {string} basePath - 不带后缀的候选路径
 * @returns {string|null} 找到的文件绝对路径，或 null
 */
function tryResolveFile(basePath) {
  // 1. 精确匹配（已有后缀）
  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isFile()) {
      return basePath;
    }
  }

  // 2. 顺序尝试补后缀
  for (const ext of EXT_ORDER) {
    const withExt = basePath + ext;
    if (fs.existsSync(withExt)) {
      const stat = fs.statSync(withExt);
      if (stat.isFile()) {
        return withExt;
      }
    }
  }

  // 3. 指向目录 → 尝试 index 文件
  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isDirectory()) {
      for (const ext of EXT_ORDER) {
        const indexFile = path.join(basePath, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          const stat = fs.statSync(indexFile);
          if (stat.isFile()) {
            return indexFile;
          }
        }
      }
    }
  }

  return null;
}