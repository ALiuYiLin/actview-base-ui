/**
 * formatter.mjs - 格式化输出模块
 *
 * 负责对分析结果进行排序、裁剪和格式化输出。
 * 支持表格、JSON 和树形三种输出格式。
 */

/**
 * 目录模式：格式化输出统计结果。
 *
 * @param {Array}    stats    - buildGraph 返回的统计数组
 * @param {object}   options
 * @param {string}   options.sortBy    - 排序字段：'out-degree'|'in-degree'|'total'
 * @param {'asc'|'desc'} options.order - 排序方向
 * @param {number}   options.top       - 只显示前 N 条（0=不限制）
 * @param {boolean}  options.json      - 是否输出 JSON
 */
export function formatDirectoryResult(stats, options) {
  const { sortBy = 'out-degree', order = 'desc', top = 0, json = false } = options;

  // 排序字段映射
  const sortFieldMap = {
    'out-degree': 'outDegree',
    'in-degree': 'inDegree',
    total: 'totalDeps',
  };
  const field = sortFieldMap[sortBy] || 'outDegree';

  // 排序
  const sorted = [...stats].sort((a, b) => {
    return order === 'desc' ? b[field] - a[field] : a[field] - b[field];
  });

  // 裁剪
  const sliced = top > 0 ? sorted.slice(0, top) : sorted;

  // JSON 输出
  if (json) {
    console.log(JSON.stringify(sliced, null, 2));
    return;
  }

  // 表格输出
  if (sliced.length === 0) {
    console.log('（没有匹配的文件）');
    return;
  }

  // 计算列宽
  const fileMax = Math.max(...sliced.map((s) => s.file.length), 4);
  const colWidth = Math.min(fileMax, 80); // 文件路径列最大 80 字符

  // 表头
  const header = [
    'File'.padEnd(colWidth),
    'Out-Deg'.padStart(8),
    'In-Deg'.padStart(8),
    'Total'.padStart(6),
    'External'.padStart(9),
  ].join('  ');
  console.log(header);
  console.log('─'.repeat(header.length));

  // 数据行
  for (const s of sliced) {
    const displayPath =
      s.file.length > colWidth
        ? '…' + s.file.slice(-(colWidth - 1))
        : s.file.padEnd(colWidth);
    console.log(
      [
        displayPath,
        String(s.outDegree).padStart(8),
        String(s.inDegree).padStart(8),
        String(s.totalDeps).padStart(6),
        String(s.externalDeps).padStart(9),
      ].join('  ')
    );
  }

  // 底部统计
  console.log('');
  console.log(`总计: ${sliced.length} 个文件`);
  console.log(
    `平均出度: ${(sliced.reduce((a, b) => a + b.outDegree, 0) / sliced.length).toFixed(1)}`
  );
  console.log(
    `平均入度: ${(sliced.reduce((a, b) => a + b.inDegree, 0) / sliced.length).toFixed(1)}`
  );
}

/**
 * 单文件模式：格式化输出依赖树。
 *
 * @param {object} tree       - buildDepTree 返回的树结构
 * @param {object} options
 * @param {boolean} options.graph     - 是否用树形结构展示
 * @param {boolean} options.json      - 是否输出 JSON
 * @param {string[]} options.extensions - 过滤后缀列表
 * @param {boolean} options.noExternal - 是否排除外部依赖
 */
export function formatFileResult(tree, options) {
  const { graph = false, json = false, extensions = [], noExternal = false } = options;

  // JSON 输出
  if (json) {
    console.log(JSON.stringify(tree, null, 2));
    return;
  }

  // 显示基础信息
  const extInfo =
    extensions.length > 0
      ? `过滤后缀: ${extensions.join(', ')}`
      : '全部后缀';
  const depthInfo =
    tree.depth === 0
      ? '仅直接依赖'
      : `递归深度: ${tree.depth}`;
  const extMsg = noExternal ? '（已排除外部依赖）' : '';

  if (graph) {
    // 树形展示
    console.log(`\n${tree.rootFile}  [${depthInfo}, ${extInfo}]${extMsg}`);
    console.log('');
    renderTree(tree.children, '');
  } else {
    // 列表展示
    console.log(`\n文件: ${tree.rootFile}`);
    console.log(`${depthInfo}, ${extInfo}${extMsg}`);
    console.log('');

    const internal = tree.children.filter((c) => c.type === 'internal');
    const external = tree.children.filter((c) => c.type === 'external');
    const circular = tree.children.filter((c) => c.type === 'circular');

    if (internal.length > 0) {
      console.log(`内部依赖 (${internal.length}):`);
      for (const dep of internal) {
        console.log(`  ${dep.path}`);
        if (dep.children.length > 0) {
          for (const sub of dep.children) {
            const prefix = sub.type === 'circular' ? '  ↻ ' : '  ';
            console.log(`    ${prefix}${sub.path}`);
          }
        }
      }
      console.log('');
    }

    if (external.length > 0) {
      console.log(`外部依赖 (${external.length}):`);
      for (const dep of external) {
        console.log(`  ${dep.path}`);
      }
      console.log('');
    }

    if (circular.length > 0) {
      console.log(`循环依赖 (${circular.length}):`);
      for (const dep of circular) {
        console.log(`  ↻ ${dep.path}`);
      }
      console.log('');
    }

    if (tree.children.length === 0) {
      console.log('（没有匹配的依赖）');
    }
  }
}

/**
 * 递归渲染树形结构。
 *
 * @param {DepTreeNode[]} nodes    - 当前层级的节点列表
 * @param {string}        prefix   - 行前缀
 */
function renderTree(nodes, prefix) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    let label = node.path;
    if (node.type === 'external') {
      label += '  [external]';
    } else if (node.type === 'circular') {
      label += '  [circular]';
    }

    console.log(prefix + connector + label);

    if (node.children.length > 0) {
      renderTree(node.children, prefix + childPrefix);
    }
  }
}

/**
 * 外部依赖模式：汇总展示所有外部 npm 包的使用情况。
 *
 * @param {Map<string, {count:number, files:string[]}>} packageMap - collectExternalDeps 的结果
 * @param {object|null} packageJson - 根目录下的 package.json 内容（或 null）
 * @param {object} options
 * @param {boolean} options.json - 是否输出 JSON
 * @param {number}  options.top  - 只显示前 N 条（0=不限制）
 */
export function formatExternalResult(packageMap, packageJson, options) {
  const { json = false, top = 0 } = options;

  // 合并所有 package.json 依赖声明
  const declaredDeps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
    ...(packageJson?.peerDependencies || {}),
    ...(packageJson?.optionalDependencies || {}),
  };

  // 按引用次数降序排列
  const entries = [...packageMap.entries()].sort((a, b) => b[1].count - a[1].count);
  const sliced = top > 0 ? entries.slice(0, top) : entries;

  if (json) {
    const result = sliced.map(([name, info]) => ({
      package: name,
      fileCount: info.count,
      declared: name in declaredDeps,
    }));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // 表格输出
  if (sliced.length === 0) {
    console.log('（没有检测到外部依赖）');
    return;
  }

  const pkgCol = 44;
  console.log('External Package'.padEnd(pkgCol) + 'Files'.padStart(8) + '  Declared');
  console.log('─'.repeat(pkgCol + 8 + 22));

  for (const [name, info] of sliced) {
    const declared = name in declaredDeps;
    const pkgLabel = name.length > pkgCol - 1 ? '…' + name.slice(-(pkgCol - 1)) : name.padEnd(pkgCol);
    const status = declared
      ? '✅ 已声明'
      : '❌ 未在 package.json 中找到';
    console.log(`${pkgLabel}${String(info.count).padStart(8)}  ${status}`);
  }

  // 底部统计
  const total = packageMap.size;
  const declaredCount = [...packageMap.keys()].filter((k) => k in declaredDeps).length;
  console.log('');
  console.log(`总计: ${total} 个外部包`);
  console.log(`已声明: ${declaredCount} 个`);
  console.log(`未声明: ${total - declaredCount} 个`);
}