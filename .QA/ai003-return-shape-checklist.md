# AI-003 完整清单：哪些 return 形态不被 Babel 插件转换（裸函数 → DOMException）

> 权威依据：`@actview/plugins/babel/src/babel-plugin.ts` 的 `wrapComponentFn`(285-340) + `wrapEarlyReturns`(349-368) + `isRenderExpr`(380-400)。**只要最后 return（或箭头 expression body）不是「JSX 字面量/_jsx 调用/null/含渲染分支的三元·逻辑」，组件就保持裸函数**，运行时渲染器把它当原生元素 → `document.createElement(rawFn)` → DOMException{} → 子树静默丢失（AI-003/AD-31 机制）。

## 1. 能触发转换（安全）的 return 形态（babel-plugin.ts:302-317）
判定序列：`isJsx || isJsxCall || isNullRet || isCondRet`
- **JSXElement / JSXFragment 字面量**：`return <div/>`、`return <>{x}</>`（isJsx，302）
- **`_jsx`/`_jsxs`/`_jsxDEV` 调用**（JSX 已被 esbuild/rolldown 降级后）：`return _jsx('div', ...)`（isJsxCall，306-307，callee 匹配 `/^_?jsx/`）
- **`return null`**（isNullRet，310）
- **含渲染分支的三元/逻辑**（isCondRet=isRenderExpr，311-313）：
  - `return cond ? <A/> : null` ✓、`return cond && <A/>` ✓、`return a ? <A/> : <B/>` ✓（isRenderExpr 380-400 只递归 ConditionalExpression/LogicalExpression，任一分支是 JSX/_jsx 即 true）
- **不触发但安全**：小写函数、非组件、手动 defineComponent、`return function(){...}`（setup 风格刻意不转换，:283/316）

## 2. 不转换（触发器，保持裸函数 → DOMException）的形态
**凡最后 return 不是上述四类，即 `isRenderExpr` 之外的一切**：
- `return variable`（**变量引用/标识符**——本 menu 案例：MenuRoot `return content`）
- `return fn(...)`（任意非 `_?jsx` 的函数调用——toast 案例：`return useToastLabelElement(...)`）
- `return objectLiteral` / `return [array]` / `return otherExpr`
- `return <somethingThatIsNotJsx>`、`return str`、`return number`
- 关键细节：**`isRenderExpr` 只认 conditional/logical**，对 `ret` 是 CallExpression（非 `_?jsx`）、Identifier、ObjectExpression、ArrayExpression 都返回 false（babel-plugin.ts:380-399）。所以 `return content`、`return getElement()`、`return useX()` 全部中招。
- 注意：**三元里若分支是标识符/裸函数调用也不触发**（`c ? content : null` ✗；只有分支是 JSX/_jsx 才 ✓）。

## 3. 扫描全部 src 组件（批量检查手段）
原理：只扫 `.tsx` 且「函数体最后一条 return 的 argument 不是 JSX/`_?jsx`/null/含渲染分支的三元」，且组件名大写。可给两类命令：
- **A. 快速怀疑（凡是「结尾 return 一个标识符/调用」且组件开头看像组件）**：grep 组件内 `return <标识符>/<调用>` 结尾。但 grep 无法区分这是否是组件的**最终** return 或是否大写组件——更可靠是「先编译后运行时崩溃」或「脚本 AST 扫描」。
- **B. 一次性 grep 疑似点（非最终判据，用于缩小范围）**：
  ```
  # 结尾 return 变量或非JSX调用（在 .tsx 内）
  grep -rnE 'return [a-zA-Z_$][a-zA-Z0-9_$]*\s*$' packages/actview/src --include=*.tsx
  grep -rnE 'return (getElement|use[A-Za-z]*Element|render|content|[a-zA-Z]+Element)\([^)]*\)' --include=*.tsx
  ```
  这些命中的**大多是早期 return（if 内），不是最终 return**——真正判定必须看函数体最后一条语句。所以更稳的是：
- **C. 权威做法（跑测试即可暴露）**：任何组件未转换 → 运行时 `[actview] 组件渲染错误: DOMException {}` + 子树丢 → 测试必然"组件没渲染/查询 null"。所以每个组件跑其 actview 测试（`pnpm --filter @base-ui/actview exec vitest run <目录>`）即 100% 检出；配合 console 里 DOMException 定位。
- **D. 若能写脚本（一次性）：用 babel 解析每个 .tsx 的顶层大写函数/箭头，取 body 最后 ReturnStatement 的 argument，套用与 wrapComponentFn 相同的判定（isJSX/isJsxCall/isNull/isCondRet），非这四类即报**。这是精确清单的依据本身。
- 建议：用 C（跑测试）+ A（grep 缩小）组合，D 可作一次性巡检。

## 4. 修复标准写法 & 原理
- **写法**：把「最终 return 的非字面量」包进 **Fragment 字面量**：`return <>{content}</>` / `return <>{getElement()}</>` / `return <>{useToastLabelElement(...)}</>`。
- **原理**：`wrapComponentFn` 只认**最后 return 的 argument 本身是 JSXElement/Fragment 字面量**（isJsx，302）。`<>{content}</>` 是 **JSXFragment 字面量**——即便其内部 `{content}` 是变量引用，整个节点类型是 JSXFragment → isJsx=true → 转换。变量/调用的裸返回是 Identifier/CallExpression，不匹配任一支 → 不转换。同理 `_jsx(_Fragment, ...)`（降级后）也是 isJsxCall。
- 封装：`return <>{expr}</>` 对「组件只渲染一个……可用表达式结果」通用；若已知是函数/渲染函数调用，也可 `return <>{fn()}</>`。**只要最终 return 的 AST 节点是 JSXElement/Fragment 字面量即可。**
- 自查已修复实例：MenuRoot `return <>{content}</>`、ToastTitle/Description `return <>{useToastLabelElement(...)}</>`、slider 等 `return <>{getElement()}</>`（SliderControl.tsx:536-540 注释）。

## 文件证据
- E:\actview\plugins\babel\src\babel-plugin.ts:285-340（wrapComponentFn）、349-368（wrapEarlyReturns）、380-400（isRenderExpr）、302-317（判定）、:283/:314-316（设计约束注释）
- E:\actview\plugins\babel\test\plugin.test.ts:31-39,58-62（setup 风格不转换用例）、66-71（return null）、161-185（三元/逻辑）
- E:\actview\plugins\babel\src\index.ts（插件入口）；plugins/vite/src/vite-plugin.ts:14-29（只认 __setup）
- actview-issue.md AI-003；plantform-diff.md AD-31；toast-render-diagnostics.md §1
- 已修复实例：menu/root/MenuRoot.tsx 末尾 `return <>{content}</>`、toast/title/ToastTitle.tsx:44、slider/control/SliderControl.tsx:540
