# actview toast 组件渲染崩溃诊断：DOMException{}（AI-003 root-cause 复发）

## 问题
toast 测试：点 add 后控制台 `[actview] 组件渲染错误: DOMException {}`，toast 子树 querySelector 为 null，DOMException 无 message。结构 ToastProvider>ToastHost(useToastManager().toasts.value.map 渲染 ToastRoot>ToastTitle/ToastDescription/ToastContent/ToastClose/ToastAction)+add 按钮。ToastRoot defaultProps 含 role/tabIndex/aria-modal=false/inert/多 CSS 变量 style。问题：1) DOMException 来自哪个属性？2) 这种 defaultProps 怎么写安全？3) toasts ref 在 JSX map 是否对？

## 结论（Evidence level: S6 — 全源码分析）
**根因是 AI-003 复发，不是属性问题**：`ToastTitle.tsx:38` 与 `ToastDescription.tsx:39` 都是 `return useToastLabelElement(...)`——**函数调用结尾**，Babel 插件（@actview/plugin-vite）只转换「最后 return 为 JSX/_jsx/null/含 JSX 三元」的组件；裸函数调用结尾不转换 → 运行时组件保持裸函数 → 渲染器把它误当**原生元素** → `document.createElement(rawFn)` 抛 `DOMException`（jsdom 无 message）→ 子树被 try/catch 静默吞掉 → querySelector null。

### (1) DOMException 来自哪
- 不是 `role/tabIndex/aria-modal/inert/CSS 变量`——这些属性都合法，不抛 DOMException：
  - `inert` 是原生布尔透传（actview-utils/inertValue.ts:5-6 直接返回 boolean|undefined）。
  - 对象 style 的 `--*` CSS 变量键会被渲染器**过滤丢弃**（PD-25），不会抛错；`undefined` 值被跳过。
  - `aria-modal:false`/布尔同 PD-01（渲染空串，可容忍）。
- 真正的抛错点是**组件本身未被 Babel 转换**。本项目既有同病案例：`SliderControl.tsx:536-540` 注释 "A bare `return getElement()` stays a raw function at runtime, which the renderer misroutes as a native element (DOMException) — see actview-issue.md AI-003"（slider 曾 23 测试全挂，包裹 `return <>{getElement()}</>` 后通过）。
- toast 包内只有 ToastTitle/ToastDescription 中招：其余（ToastRoot.tsx:510、ToastClose.tsx:56、ToastContent.tsx:61、ToastArrow.tsx:39、ToastAction.tsx:47-54）都是 JSX return，正确。
- 触发顺序：点 add → ToastRoot 渲染 children → 遇到 ToastTitle/ToastDescription（裸函数）→ DOMException → 整个 toast 子树丢弃 → `[data-testid^="toast-"]` null。

### (2) defaultProps 安全写法
- 现有写法 **本身正确**：`getDefaultProps = (): HTMLProps => ({ ... })`（ToastRoot.tsx:453-472）作为 **getter** 放进 `useRenderElement` 的 `props` 数组（`:506` `props: [getDefaultProps, elementProps]`），每次渲染重新求值（AD-17/AD-35）；只读响应式值（`isHighPriority`/`titleId.value` 等），对。
- CSS 变量 + `undefined` + 布尔都安全（如上），无需改。`toast.height ? \`${...}px\` : undefined` 也是标准 optional-value 写法。
- **唯一要改的是 return**：`ToastTitle`/`ToastDescription` 的 `return useToastLabelElement(...)` → 包一层 Fragment：
  ```ts
  return <>{useToastLabelElement(getElement, shouldRender, id, setId)}</>;
  ```
  `useToastLabelElement` 本身就返回 Fragment（useToastLabelPart.tsx:54-61），再包一层无害且保证 Babel 转换。

### (3) toasts ref 在 JSX map —— 写法正确
- `toasts.value.map(...)` 在 ToastRoot 渲染（Toast.test.tsx:32-41）是**正确且响应式**的：`toasts` 是 `store.useState('toasts')` 返回的 Ref，`.value` 在每次 render 重求值（PD-10）。
- 崩溃不是 map 的问题，而是 map 出的 ToastTitle/Description 未转换。修好 return 后 map 正常。
- 给 ToastRoot 加 `key={toast.id}` 正确（列表 diff 需要）。

### 附加：用户自加 limit 用例失败
- 期望「limit=3 加 3 个 toast → 最老 limited=true」是**理解偏差**，不是 bug：`applyLimited` 用 `activeIndex >= limit` 标记（store.ts:76-86）；`addToast` 最新在前（store.ts:194 `[toastToAdd, ...]`）。limit=3 时第 3 个（最老，末尾）activeIndex=2，`2 >= 3` 为 false → **不 limited**。只有当超过 limit（第 4 个，index 3 >= 3）才开始 marked。要测 limited 需加 4 个。

## 文件证据
- toast/title/ToastTitle.tsx:38（bug：return useToastLabelElement(...)）
- toast/description/ToastDescription.tsx:39（同）
- toast/utils/useToastLabelPart.tsx:33-62（useToastLabelElement 返回 Fragment）
- toast/root/ToastRoot.tsx:453-472（defaultProps 正确 getter）、:506（props 数组）、:510（JSX return 正确）
- toast/action/ToastAction.tsx:47-54（正确的 JSX return 范本）、toast/close/ToastClose.tsx:56、content/ToastContent.tsx:61、arrow/ToastArrow.tsx:39
- slider/control/SliderControl.tsx:536-540（AI-003 注释与修复范本）
- actview-issue.md AI-003（根因长文）
- actview-utils/src/inertValue.ts:5-6（inert 原生布尔透传）
- plantform-diff.md PD-25（对象 style 过滤 --* 不抛错）、PD-01（布尔空串）、AD-17/AD-35（getter 求值）
- toast/Toast.test.tsx:32-41（map 渲染）、:80-94（断言）
- toast/store.ts:76-86（applyLimited / activeIndex>=limit）、:194（最新在前）
