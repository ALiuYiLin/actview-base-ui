#!/usr/bin/env node

/**
 * analyze-deps — 依赖分析工具
 *
 * 用法:
 *   目录模式:  node index.mjs --dir <目录> [选项] -- <后缀1> [后缀2 ...]
 *   单文件模式: node index.mjs --file <文件> [选项] -- <后缀1> [后缀2 ...]
 *
 * 选项:
 *   --dir <path>       分析整个目录
 *   --file <path>      分析单个文件
 *   --exclude <glob>   排除模式，如 "*.test.*" "*.spec.*" 可重复使用
 *   --sort <asc|desc>  排序方向 (默认: desc)
 *   --by <metric>      排序依据: out-degree|in-degree|total (默认: out-degree)
 *   --json             输出 JSON 格式
 *   --top <n>          只显示前 N 条 (目录模式)
 *   --depth <n>        递归深度 (单文件模式，0=仅直接依赖，默认: 0)
 *   --direct-only      等价于 --depth 0
 *   --no-external      不显示外部依赖 (单文件模式)
 *   --graph            树形展示 (单文件模式)
 *   -- <ext>           文件后缀列表，如 .ts .tsx
 *
 * 示例:
 *   node index.mjs --dir ./src --exclude "*.test.*" --sort desc -- .ts
 *   node index.mjs --dir ./packages --exclude "*.test.*" "*.stories.*" --by in-degree --top 10 -- .ts .tsx
 *   node index.mjs --file src/components/Button.tsx --depth 1 --graph -- .tsx
 *   node index.mjs --file src/index.ts --direct-only --no-external -- .ts
 */

import path from 'node:path';
import fs from 'node:fs';
import { scanDirectory, compileGlob } from './scanner.mjs';
import { parseImports } from './parser.mjs';
import { resolveImport } from './resolver.mjs';
import { buildGraph, buildDepTree } from './analyzer.mjs';
import { formatDirectoryResult, formatFileResult } from './formatter.mjs';

// ──────────────────────────────────────
// CLI 参数解析
// ──────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dir: null,
    file: null,
    exclude: [],
    sort: 'desc',
    by: 'out-degree',
    json: false,
    top: 0,
    depth: 0,
    directOnly: false,
    noExternal: false,
    graph: false,
    extensions: [],
  };

  let i = 2; // 跳过 node 和脚本自身
  let afterDoubleDash = false;

  while (i < argv.length) {
    const arg = argv[i];

    if (afterDoubleDash) {
      // 收集后缀列表
      args.extensions.push(arg);
      i++;
      continue;
    }

    if (arg === '--') {
      afterDoubleDash = true;
      i++;
      continue;
    }

    switch (arg) {
      case '--dir':
        args.dir = argv[++i];
        if (!args.dir) {
          console.error('错误: --dir 后需要指定目录路径');
          process.exit(1);
        }
        break;
      case '--file':
        args.file = argv[++i];
        if (!args.file) {
          console.error('错误: --file 后需要指定文件路径');
          process.exit(1);
        }
        break;
      case '--exclude':
        args.exclude.push(argv[++i]);
        if (!args.exclude[args.exclude.length - 1]) {
          console.error('错误: --exclude 后需要指定排除模式');
          process.exit(1);
        }
        break;
      case '--sort':
        args.sort = argv[++i];
        if (args.sort !== 'asc' && args.sort !== 'desc') {
          console.error('错误: --sort 只能是 asc 或 desc');
          process.exit(1);
        }
        break;
      case '--by':
        args.by = argv[++i];
        if (!['out-degree', 'in-degree', 'total'].includes(args.by)) {
          console.error('错误: --by 只能是 out-degree、in-degree 或 total');
          process.exit(1);
        }
        break;
      case '--json':
        args.json = true;
        break;
      case '--top':
        args.top = parseInt(argv[++i], 10);
        if (isNaN(args.top) || args.top < 0) {
          console.error('错误: --top 后需要指定一个正整数');
          process.exit(1);
        }
        break;
      case '--depth':
        args.depth = parseInt(argv[++i], 10);
        if (isNaN(args.depth) || args.depth < 0) {
          console.error('错误: --depth 后需要指定一个非负整数');
          process.exit(1);
        }
        break;
      case '--direct-only':
        args.directOnly = true;
        args.depth = 0;
        break;
      case '--no-external':
        args.noExternal = true;
        break;
      case '--graph':
        args.graph = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`错误: 未知参数 ${arg}`);
          process.exit(1);
        }
        // 忽略其他非选项参数
        i++;
        continue;
    }
    i++;
  }

  // 标准化后缀（确保以 . 开头）
  args.extensions = args.extensions.map((e) => (e.startsWith('.') ? e : `.${e}`));

  // 校验：--dir 和 --file 互斥
  if (args.dir && args.file) {
    console.error('错误: --dir 和 --file 不能同时使用');
    process.exit(1);
  }
  if (!args.dir && !args.file) {
    console.error('错误: 必须指定 --dir 或 --file');
    process.exit(1);
  }

  // 校验 --direct-only 和 --depth 冲突
  if (args.directOnly && args.depth !== 0) {
    console.error('错误: --direct-only 和 --depth 不能同时使用');
    process.exit(1);
  }

  return args;
}

// ──────────────────────────────────────
// 目录模式
// ──────────────────────────────────────

function directoryMode(args) {
  const rootDir = path.resolve(args.dir);

  // 检查目录是否存在
  if (!fs.existsSync(rootDir)) {
    console.error(`错误: 目录不存在: ${rootDir}`);
    process.exit(1);
  }
  if (!fs.statSync(rootDir).isDirectory()) {
    console.error(`错误: 路径不是目录: ${rootDir}`);
    process.exit(1);
  }

  // 编译排除模式
  const excludeREs = args.exclude.map((p) => compileGlob(p));

  console.error(`扫描目录: ${rootDir}`);
  console.error(`后缀过滤: ${args.extensions.length > 0 ? args.extensions.join(', ') : '全部'}`);
  if (excludeREs.length > 0) {
    console.error(`排除模式: ${args.exclude.join(', ')}`);
  }
  console.error('');

  // 扫描
  const files = scanDirectory(rootDir, args.extensions, excludeREs, rootDir);
  if (files.length === 0) {
    console.error('没有找到匹配的文件');
    return;
  }
  console.error(`找到 ${files.length} 个文件，正在分析依赖...`);

  // 构建依赖图
  const stats = buildGraph(files, rootDir, args.extensions);
  console.error('分析完成\n');

  // 输出
  formatDirectoryResult(stats, {
    sortBy: args.by,
    order: args.sort,
    top: args.top,
    json: args.json,
  });
}

// ──────────────────────────────────────
// 单文件模式
// ──────────────────────────────────────

function fileMode(args) {
  const rootDir = process.cwd();
  const filePath = path.resolve(rootDir, args.file);

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    console.error(`错误: 文件不存在: ${filePath}`);
    process.exit(1);
  }
  if (!fs.statSync(filePath).isFile()) {
    console.error(`错误: 路径不是文件: ${filePath}`);
    process.exit(1);
  }

  // 如果文件自身的后缀不在过滤列表中，自动加入
  const selfExt = path.extname(filePath);
  if (args.extensions.length > 0 && !args.extensions.includes(selfExt)) {
    args.extensions.push(selfExt);
  }

  // 编译排除模式
  const excludeREs = args.exclude.map((p) => compileGlob(p));

  // 构建依赖树
  const tree = buildDepTree(
    filePath,
    rootDir,
    args.extensions,
    args.depth,
    args.noExternal,
    excludeREs,
  );

  // 输出
  formatFileResult(tree, {
    graph: args.graph,
    json: args.json,
    extensions: args.extensions,
    noExternal: args.noExternal,
  });
}

// ──────────────────────────────────────
// 入口
// ──────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);

  if (args.dir) {
    directoryMode(args);
  } else {
    fileMode(args);
  }
}

main();