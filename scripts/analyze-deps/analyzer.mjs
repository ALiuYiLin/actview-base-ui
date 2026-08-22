/**
 * analyzer.mjs - 依赖图构建与分析模块
 *
 * 提供两种分析模式：
 *   1. buildGraph  — 目录模式：构建完整依赖图，统计每个文件的出度/入度
 *   2. buildDepTree — 单文件模式：递归展开依赖树，支持深度限制
 */

import path from 'node:path';
import { parseImports } from './parser.mjs';
import { resolveImport } from './resolver.mjs';
import { isExcluded } from './scanner.mjs';

/**
 * 目录模式：构建依赖图，返回每个文件的统计信息。
 *
 * @param {string[]}   files      - 所有目标文件的绝对路径列表
 * @param {string}     rootDir    - 项目根目录（用于计算相对路径）
 * @param {string[]}   extensions - 允许的后缀列表
 * @param {Array<{prefix:string, target:string}>} [aliases] - 路径别名列表
 * @returns {Array<{ file:string, ext:string, outDegree:number, inDegree:number, totalDeps:number, externalDeps:number, dependencies:string[], dependents:string[] }>}
 */
export function buildGraph(files, rootDir, extensions, aliases = []) {
  // 建立文件索引：绝对路径 → 节点下标
  const fileSet = new Set(files);
  const fileIndex = new Map(); // 绝对路径 → 节点
  const extSet = new Set(extensions);

  // 初始化所有节点
  for (const filePath of files) {
    fileIndex.set(filePath, {
      path: filePath,
      relativePath: path.relative(rootDir, filePath),
      ext: path.extname(filePath),
      dependencies: [],    // 出边：依赖了哪些文件
      dependents: [],      // 入边：被哪些文件依赖
      externalDeps: [],    // 外部依赖列表
    });
  }

  // 逐文件解析
  for (const filePath of files) {
    const node = fileIndex.get(filePath);
    const imports = parseImports(filePath);

    for (const imp of imports) {
      const { resolved, type } = resolveImport(imp, filePath, rootDir, aliases);

      if (type === 'internal' && resolved && fileSet.has(resolved)) {
        // 内部依赖，且目标文件在扫描范围内
        node.dependencies.push(resolved);

        // 建立反向边
        const target = fileIndex.get(resolved);
        if (target) {
          target.dependents.push(filePath);
        }
      } else if (type === 'external') {
        node.externalDeps.push(imp);
      }
      // unresolved 的依赖直接忽略
    }
  }

  // 组装统计结果
  const result = [];
  for (const filePath of files) {
    const node = fileIndex.get(filePath);
    result.push({
      file: node.relativePath,
      ext: node.ext,
      outDegree: node.dependencies.length,
      inDegree: node.dependents.length,
      totalDeps: node.dependencies.length + node.externalDeps.length,
      externalDeps: node.externalDeps.length,
      dependencies: node.dependencies.map((d) => path.relative(rootDir, d)),
      dependents: node.dependents.map((d) => path.relative(rootDir, d)),
    });
  }

  return result;
}

/**
 * 单文件模式：递归构建依赖树。
 *
 * @param {string}   filePath       - 目标文件的绝对路径
 * @param {string}   rootDir        - 项目根目录（process.cwd()）
 * @param {string[]} extensions     - 只显示这些后缀的依赖（空数组=全部显示）
 * @param {number}   maxDepth       - 最大递归深度，0=仅直接依赖
 * @param {boolean}  noExternal     - 是否排除外部依赖
 * @param {RegExp[]} [excludeREs]   - 排除模式的正则列表（编译后的）
 * @param {Array<{prefix:string, target:string}>} [aliases] - 路径别名列表
 * @returns {{ rootFile: string, depth: number, children: DepTreeNode[] }}
 *
 * @typedef {{ path:string, absolutePath:string|null, type:'internal'|'external'|'circular', children: DepTreeNode[] }} DepTreeNode
 */
export function buildDepTree(filePath, rootDir, extensions, maxDepth, noExternal, excludeREs = [], aliases = []) {
  const extSet = new Set(extensions);
  const visited = new Set(); // 当前递归路径，用于检测循环

  /**
   * 递归遍历依赖。
   *
   * @param {string}  currentPath - 当前文件的绝对路径
   * @param {number}  depth       - 当前递归深度
   * @returns {DepTreeNode[]} 子节点列表
   */
  function traverse(currentPath, depth) {
    // 已达最大深度，不再递归展开内部依赖
    const shouldRecurse = depth < maxDepth;

    // 检测循环依赖
    if (visited.has(currentPath)) {
      return [
        {
          path: path.relative(rootDir, currentPath),
          absolutePath: currentPath,
          type: 'circular',
          children: [],
        },
      ];
    }

    visited.add(currentPath);

    const imports = parseImports(currentPath);
    const children = [];

    for (const imp of imports) {
      const { resolved, type } = resolveImport(imp, currentPath, rootDir, aliases);

      if (type === 'external') {
        if (!noExternal) {
          children.push({
            path: imp,
            absolutePath: null,
            type: 'external',
            children: [],
          });
        }
        continue;
      }

      if (type === 'unresolved' || resolved === null) {
        continue;
      }

      // 按后缀过滤
      const resolvedExt = path.extname(resolved);
      if (extSet.size > 0 && !extSet.has(resolvedExt)) {
        continue;
      }

      // 按排除模式过滤
      if (excludeREs.length > 0) {
        const rel = path.relative(rootDir, resolved);
        if (isExcluded(rel, excludeREs)) {
          continue;
        }
      }

      // 递归或终止
      if (shouldRecurse) {
        const subChildren = traverse(resolved, depth + 1);
        children.push({
          path: path.relative(rootDir, resolved),
          absolutePath: resolved,
          type: 'internal',
          children: subChildren,
        });
      } else {
        children.push({
          path: path.relative(rootDir, resolved),
          absolutePath: resolved,
          type: 'internal',
          children: [],
        });
      }
    }

    // 回溯：从当前路径中移除，以便其他分支可以引用此文件
    visited.delete(currentPath);

    return children;
  }

  const children = traverse(filePath, 0);

  return {
    rootFile: path.relative(rootDir, filePath),
    depth: maxDepth,
    children,
  };
}

// ──────────────────────────────────────
// 外部依赖统计
// ──────────────────────────────────────

/**
 * 解析包名：从 import 路径中提取 npm 包名。
 *
 * 示例:
 *   'react'                  → 'react'
 *   'react-dom/client'       → 'react-dom'
 *   '@base-ui/utils/store'   → '@base-ui/utils'
 *   '@floating-ui/utils/dom' → '@floating-ui/utils'
 *   'node:path'              → null（跳过）
 *
 * @param {string} importPath
 * @returns {string|null}
 */
function extractPackageName(importPath) {
  if (importPath.startsWith('node:')) return null;
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }
  const parts = importPath.split('/');
  return parts[0] || null;
}

/**
 * 扫描所有文件，收集外部 npm 包的使用情况。
 *
 * @param {string[]}   files      - 所有目标文件的绝对路径列表
 * @param {string}     rootDir    - 项目根目录
 * @param {string[]}   extensions - 允许的后缀列表
 * @param {Array<{prefix:string, target:string}>} [aliases] - 路径别名
 * @returns {Map<string, { count:number, files:string[] }>}
 */
export function collectExternalDeps(files, rootDir, extensions, aliases = []) {
  const packageMap = new Map();

  for (const filePath of files) {
    const imports = parseImports(filePath);
    const seen = new Set(); // 每个文件去重

    for (const imp of imports) {
      // 跳过相对路径
      if (imp.startsWith('./') || imp.startsWith('../')) continue;
      // 跳过绝对路径
      if (path.isAbsolute(imp)) continue;
      // 跳过 Node.js 内置模块
      if (imp.startsWith('node:')) continue;
      // 跳过别名匹配的路径（如 @/ → src/，属于内部路径）
      let isAlias = false;
      for (const alias of aliases) {
        if (imp.startsWith(alias.prefix)) {
          isAlias = true;
          break;
        }
      }
      if (isAlias) continue;

      const pkgName = extractPackageName(imp);
      if (!pkgName) continue;

      if (!seen.has(pkgName)) {
        seen.add(pkgName);
        if (!packageMap.has(pkgName)) {
          packageMap.set(pkgName, { count: 0, files: [] });
        }
        const entry = packageMap.get(pkgName);
        entry.count++;
        entry.files.push(path.relative(rootDir, filePath));
      }
    }
  }

  return packageMap;
}