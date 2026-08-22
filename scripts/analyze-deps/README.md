# analyze-deps — 依赖分析工具

分析项目目录下指定文件后缀的依赖关系，支持**目录模式**（宏观统计）和**单文件模式**（微观追踪）。

## 快速开始

```bash
# 目录模式：统计 src 下所有 .ts 文件的依赖数量，按出度从大到小排
node index.mjs --dir ./src -- .ts

# 单文件模式：查看某个文件依赖了哪些 .tsx 文件，树形展开 1 层
node index.mjs --file src/components/Button.tsx --depth 1 --graph -- .tsx
```

---

## 目录模式

分析整个目录，统计每个文件的出度、入度、总依赖数，支持排序和筛选。

### 用法

```bash
node index.mjs --dir <目录> [选项] -- <后缀1> [后缀2 ...]
```

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--dir <path>` | **（必填）** 要扫描的目录 | — |
| `--exclude <glob>` | 排除模式，如 `"*.test.*"` 可重复使用 | 不排除 |
| `--alias <map>` | 路径别名，如 `"@/=./src/"` 可重复使用 | 自动检测 tsconfig.json |
| `--external` | 汇总展示外部 npm 包（取代默认文件统计） | 文件统计 |
| `--sort <asc\|desc>` | 排序方向 | `desc` |
| `--by <metric>` | 排序依据：`out-degree`（出度）、`in-degree`（入度）、`total`（总依赖数） | `out-degree` |
| `--top <n>` | 只显示前 N 条 | 不限制 |
| `--json` | 输出 JSON 格式 | 表格 |
| `-- <ext>` | **（必填）** 文件后缀列表，如 `.ts .tsx` | — |

### 示例

```bash
# 按出度从大到小排（默认）
node index.mjs --dir ./src -- .ts .tsx

# 按入度从小到大排，只看前 10 个
node index.mjs --dir ./packages --by in-degree --sort asc --top 10 -- .ts

# 排除测试文件（.test.ts、.test.tsx、.spec.ts 等）
node index.mjs --dir ./src --exclude "*.test.*" --exclude "*.spec.*" -- .ts .tsx

# 使用路径别名（如 tsconfig 中配置了 @/ → src/）
node index.mjs --dir ./src --alias "@/=./src/" -- .ts .tsx

# 多个别名：@/ 指向 src/，@shared/ 指向 shared/src/
node index.mjs --dir . --alias "@/=./src/" --alias "@shared/=./shared/src/" -- .ts .tsx

# 查看所有外部 npm 包使用情况，与 package.json 对比
node index.mjs --dir ./src --external -- .ts .tsx

# 外部包排名，只看前 10
node index.mjs --dir ./src --external --top 10 -- .ts .tsx

# 输出 JSON 格式
node index.mjs --dir ./src --external --json -- .ts
```

### 输出说明

```
File                           Out-Deg    In-Deg   Total   External
───────────────────────────────────────────────────────────────────────
src/components/Button.tsx         12         3       18         6
src/hooks/useAuth.ts               8         5       10         2
src/utils/format.ts                3        12        5         2
...
```

| 列 | 含义 |
|----|------|
| **Out-Deg**（出度） | 该文件依赖了多少个内部文件 |
| **In-Deg**（入度） | 有多少个内部文件依赖了该文件 |
| **Total** | 总依赖数（内部 + 外部） |
| **External** | 外部依赖数（npm 包） |

### 外部依赖汇总模式（`--external`）

分析目录中所有文件使用了哪些外部 npm 包，统计每个包被多少文件引用，并对比 `package.json` 检查是否已声明。

```bash
# 查看所有外部包，按引用次数排序
node index.mjs --dir ./src --external -- .ts .tsx

# 只看前 10 个引用最多的外部包
node index.mjs --dir ./src --external --top 10 -- .ts .tsx
```

输出示例：

```
External Package                               Files  Declared
──────────────────────────────────────────────────────────────────────────
react                                            582  ✅ 已声明
@base-ui/utils                                   269  ✅ 已声明
@floating-ui/utils                                39  ✅ 已声明
@base-ui/react                                   283  ❌ 未在 package.json 中找到
#test-utils                                      305  ❌ 未在 package.json 中找到

总计: 20 个外部包
已声明: 13 个
未声明: 7 个
```

> `✅ 已声明` 表示该包在 `package.json` 的 `dependencies`、`devDependencies`、`peerDependencies` 或 `optionalDependencies` 中能找到。
>
> `❌ 未在 package.json 中找到` 表示该包被代码引用但未声明——可能是 workspace 内部包、缺少声明的依赖，或需要检查是否应该添加声明。

---

## 单文件模式

查看单个文件依赖了哪些文件，支持递归展开和树形展示。

### 用法

```bash
node index.mjs --file <文件> [选项] -- <后缀1> [后缀2 ...]
```

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--file <path>` | **（必填）** 要分析的文件 | — |
| `--exclude <glob>` | 排除模式，如 `"*.test.*"` 可重复使用 | 不排除 |
| `--alias <map>` | 路径别名，如 `"@/=./src/"` 可重复使用 | 自动检测 tsconfig.json |
| `--depth <n>` | 递归深度：`0`=仅直接依赖，`1`=再展开一层，... | `0` |
| `--direct-only` | 等价于 `--depth 0` | — |
| `--graph` | 以树形结构展示（`├── └──`） | 列表 |
| `--no-external` | 不显示外部依赖（npm 包） | 显示 |
| `--json` | 输出 JSON 格式 | 列表 |
| `-- <ext>` | 只显示这些后缀的依赖文件，如 `.tsx` | 全部 |

### 示例

```bash
# 查看 Button.tsx 直接依赖了哪些 .tsx 文件
node index.mjs --file src/components/Button.tsx -- .tsx

# 递归展开 1 层，树形展示
node index.mjs --file src/components/Button.tsx --depth 1 --graph -- .tsx

# 只看内部依赖，不显示 npm 包
node index.mjs --file src/index.ts --direct-only --no-external -- .ts

# 排除测试文件，只看业务代码的依赖
node index.mjs --file src/App.tsx --exclude "*.test.*" --exclude "*.stories.*" --depth 1 --graph -- .ts .tsx

# 使用路径别名（如 @/ → src/）
node index.mjs --file src/App.tsx --alias "@/=./src/" --depth 1 --graph -- .ts .tsx
```

### 输出示例（列表模式）

```
文件: src/components/Button.tsx
仅直接依赖, 过滤后缀: .tsx

内部依赖 (4):
  src/hooks/useClick.tsx
  src/hooks/useFocus.tsx
  src/utils/cn.tsx
  src/components/Icon.tsx

外部依赖 (2):
  react
  @base-ui/utils/useTimeout
```

### 输出示例（树形模式）

```
src/components/Button.tsx  [递归深度: 1, 过滤后缀: .tsx]
├── src/hooks/useClick.tsx
│   ├── src/hooks/usePointer.tsx
│   └── react  [external]
├── src/hooks/useFocus.tsx
│   └── react  [external]
├── src/utils/cn.tsx
│   └── clsx  [external]
├── src/components/Icon.tsx
│   ├── src/utils/assetPath.tsx
│   └── react  [external]
└── react-dom  [external]
```

---

## 常见场景

### 1. 重构决策 — 找出高耦合的文件

```bash
# 入度最高的文件 = 被最多文件依赖 = 修改影响面最大
node index.mjs --dir ./src --by in-degree --top 10 -- .ts .tsx
```

### 2. 排查依赖链 — 为什么要引入这个包

```bash
# 从入口文件向下追踪，看哪个文件最终依赖了某个 npm 包
node index.mjs --file src/index.ts --depth 3 --graph -- .ts .tsx
```

### 3. 分析模块边界 — 模块间依赖关系

```bash
# 按出度排序，出度高的文件往往是"集线器"式的导入入口
node index.mjs --dir ./src --sort desc -- .ts .tsx
```

### 4. 排除测试文件，只看业务代码

```bash
# 目录模式：排除 .test.、.spec.、.stories. 文件
node index.mjs --dir ./src --exclude "*.test.*" --exclude "*.spec.*" --exclude "*.stories.*" --top 10 -- .ts .tsx

# 单文件模式：排除测试文件
node index.mjs --file src/components/Button.tsx --exclude "*.test.*" --depth 1 --graph -- .tsx
```

### 5. 检测循环依赖

树形模式下，如果检测到循环依赖，节点会标记 `[circular]`：

```
src/hooks/useAuth.ts
├── src/utils/api.ts
│   └── src/hooks/useAuth.ts  [circular]
```

---

## 技术细节

### 依赖提取规则

脚本通过正则提取以下语句中的模块路径（先剥离注释，避免误抓）：

| 语法 | 示例 |
|------|------|
| ESM import | `import { foo } from './bar'` |
| 重导出 | `export * from './bar'` |
| CommonJS | `require('./bar')` |
| 动态导入 | `import('./bar')` |

### 路径解析策略

1. **相对路径**（`./`、`../`）：相对于当前文件解析
2. **后缀补全**：按 `.tsx` → `.ts` → `.jsx` → `.js` → `.mjs` → `.mts` → `.cjs` → `.cts` 顺序尝试
3. **Index 文件**：`./foo` → `./foo/index.tsx` 等
4. **路径别名**：匹配 `--alias` 或 `tsconfig.json` 中配置的别名前缀后替换为目标路径
5. **非相对路径**：先尝试作为项目内路径（monorepo），否则标记为外部依赖

### 路径别名（`--alias`）

支持通过 `--alias` 参数或自动读取 `tsconfig.json` / `jsconfig.json` 中的 `compilerOptions.paths` 来解析路径别名。

**手动指定**：
```bash
# 格式: prefix=target（target 相对于项目根目录）
node index.mjs --dir ./src --alias "@/=./src/" -- .ts .tsx
node index.mjs --file src/App.tsx --alias "@/=./src/" --depth 1 --graph -- .tsx
```

**自动检测**：如果项目根目录下有 `tsconfig.json` 或 `jsconfig.json`，且配置了 `compilerOptions.paths`，脚本会自动读取：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/src/*"]
    }
  }
}
```

上述配置等价于：
```bash
--alias "@/=./src/" --alias "@shared/=../shared/src/"
```

**优先级**：如果手动传了 `--alias`，则只使用手动指定的别名，不会读取 `tsconfig.json`。

### 循环依赖检测

`--file` 模式在递归遍历时维护当前路径链，检测到重复节点后标记为 `[circular]` 并停止展开，避免死循环。

### 文件排除（`--exclude`）

`--exclude` 参数支持简单的 glob 通配符来排除不需要的文件：

| 通配符 | 含义 | 示例 | 匹配 |
|--------|------|------|------|
| `*` | 匹配任意字符（不含路径分隔符） | `*.test.*` | `Button.test.tsx`、`utils.test.ts` |
| `**` | 匹配任意字符（含路径分隔符） | `**/__tests__/*` | `src/__tests__/foo.ts` |
| `?` | 匹配单个字符（不含路径分隔符） | `?.ts` | `a.ts`、`b.ts` |

常见用法：
- `--exclude "*.test.*"` — 排除所有测试文件
- `--exclude "*.spec.*"` — 排除所有 spec 文件
- `--exclude "*.stories.*"` — 排除 Storybook 故事文件
- `--exclude "*.bench.*"` — 排除基准测试文件
- `--exclude "**/__tests__/*"` — 排除 `__tests__` 目录下的文件

多个排除模式可以重复使用 `--exclude`：
```bash
node index.mjs --dir ./src --exclude "*.test.*" --exclude "*.stories.*" -- .ts .tsx
```

---

## 完整参数参考

```
用法:
  目录模式:   node index.mjs --dir <目录> [选项] -- <后缀1> [后缀2 ...]
  单文件模式: node index.mjs --file <文件> [选项] -- <后缀1> [后缀2 ...]

选项:
  --dir <path>       分析整个目录
  --file <path>      分析单个文件
  --exclude <glob>   排除模式，如 "*.test.*" 可重复使用
  --alias <map>      路径别名，如 "@/=./src/" 可重复使用
  --external         汇总展示外部 npm 包（目录模式）
  --sort <asc|desc>  排序方向 (默认: desc)
  --by <metric>      排序依据: out-degree|in-degree|total (默认: out-degree)
  --json             输出 JSON 格式
  --top <n>          只显示前 N 条 (目录模式)
  --depth <n>        递归深度 (单文件模式，0=仅直接依赖，默认: 0)
  --direct-only      等价于 --depth 0
  --no-external      不显示外部依赖 (单文件模式)
  --graph            树形展示 (单文件模式)
  -- <ext>           文件后缀列表，如 .ts .tsx
```