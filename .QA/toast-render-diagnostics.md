# actview toast 渲染/更新问题诊断合并（已修复，附最终正确写法）

> 合并自旧的 4 篇 toast 渲染/更新诊断（crash-diagnosis / render-update-diagnosis / final-three-fixes / title-render-mechanism）。**全部问题已在 toast 移植完成时修复**，本条记录根因链路与最终 correct 写法，供复用。根因共同点：**setup 解构冻结响应式值（PD-15）+ actview 每次重跑 render（无子树缓存）**。

## 0. 核心机制：actview 无子树缓存，模板重跑会重新求值所有函数调用
- actview 每次响应式变化**重新调用** setup 返回的 render（mountComponent.ts:213 `instance.render=setupResult`，:217-224 `update()` 调 `render()` 并 `patch` 递归），render effect 用 `runEffect(update)` 包裹（:257-259），**render 里读的 `.value` 被 track，一变即重跑**。
- 因此 `ref.value.map(...)` 在 JSX return 里**完全响应式且触发重渲染**（`store.useState` 的 Ref 由 useStore.ts:47-52 订阅、`Object.is` 比较更新；close 能通过正是因为列表成员移除 → map 重跑 → 卸载）。actview **不会**对 setup 返回子树做缓存/静态化。
- **推论**：模板里的函数调用表达式（如 `useToastLabelElement(getElement, ...)`、IIFE 包 getElement）每次重跑都重执行、生成新 VNode——"包函数"没问题（ToastAction.tsx:47-54、useToastLabelPart.tsx:54-61、SliderControl.tsx:540 都是成功先例）。
- **所以"模板重跑了但 DOM/文本不更新"的根因几乎总是：getElement()/computed 内读取的值是 setup 解构的冻结拷贝（PD-15），不是框架问题。**

## 1. DOMException{} 崩溃 = AI-003 复发（裸函数 return）
- 组件以**函数调用结尾**（`return getElement()` / `return useToastLabelElement(...)`）时，Babel 插件只转换「最后 return 为 JSX/_jsx/null/含 JSX 三元」的组件 → 不转换 → 运行时裸函数被渲染器当**原生元素** → `document.createElement(rawFn)` 抛 `DOMException {}`（jsdom 无 message）→ 子树被 try/catch 静默吞掉 → querySelector null。
- **修复**：一律 `return <>{ getElement() }</>`（或包在 JSX 表达式里）。toast 的 ToastTitle/ToastDescription 曾是 `return useToastLabelElement(...)`，已改 `return <>{useToastLabelElement(...)}</>`（AI-003；既有范本 slider/control/SliderControl.tsx:536-540）。
- **排除项**：`role/tabIndex/aria-modal=false/inert/CSS 变量 style` 都不抛 DOMException——`inert` 是原生布尔透传（inertValue.ts:5-6）、对象 style 的 `--*` 键被过滤（PD-25）、undefined 值被略过；别归因到属性上。

## 2. waitFor 误用（测试拿不到更新）
- `@actview/testing` 的 `waitFor` 只在回调 **throw 时重试**；`waitFor(() => queryToast())` 返回 null 是「成功」不抛 → **立即返回 null**，不轮询。
- **修复**：断言必须进回调 `await waitFor(() => { expect(queryToast()).not.toBeNull(); })`（TEST-WAVE.md:31 一条断言一个 waitFor 回调）。

## 3. setup 解构冻结响应式 prop（PD-15）——store 换新对象场景
- 根：props 是 shallowReactive 代理、父更新原地写，**setup 解构捕获旧值**。当 store 每次 add/update/close 换**新 toast 对象**（`setToasts(toasts.map(...))`）时，`const { toast } = componentProps` 冻结旧对象 → transitionStatus 永远 'starting'（data-starting-style 残留）、close 的 ending 读不到（不消失）、update 的 title/actionProps 不刷新。
- **修复（最终正确写法）**：`const toast = computed(() => componentProps.toast)`，全组件读 `toast.value.xxx`（watch 源 / state computed / getDefaultProps / 事件回调）。别在 setup 解构。
- 同理：`children` 也必须从 setup 解构排除（`children: _children`），由 getter/`computed` 读 `componentProps.children` —— 否则 elementProps 里的旧 children VNode **覆盖** getter 的新 children → title 永不更新（AD-36）。
- 次要：首挂载 `recalculateHeight` 在 rootRef 仍 null 时 early-return，可用 `onMounted`/`useIsoLayoutEffect` 兜底（ref 回调+watch 挂载期时机 AI-002/AD-33）。

## 4. getter 必须合并 prev（AD-20/27/35）
- `mergePropsN` 的 getter 返回对象**整体替换 prev**，无参 getter（`() => x`）会**丢弃前面所有 getter/props**（onClick/children/id…）。正确：`(prev) => ({ ...prev, ...x })`。ToastAction 的 `actionProps` 即此（已修）。完整语义见 merge-props-actview-semantics.md。

## 5. 非元素 prop 必须解构排除（否则泄漏到 DOM）
- actview 无自动透传、组件显式 spread `{...props}`；`...elementProps` 保留所有未解构键并 setAttribute。`toast` 未解构 → 泄漏 `toast="[object Object]"`。惯例（SelectItem.tsx:27-36）：所有非 DOM prop（render/className/style/value/label/disabled/nativeButton/toast…）一律解构排除。

## 6. transition:undefined 序列化（debug 干扰项）
- 对象 style 塞 `undefined` 值会被序列化成 `"transition: undefined;"`（PD-25 只过滤 `--*` 键，不丢 undefined 值）。修法：条件展开键 `...(cond ? { transform: '...' } : {})`，别塞 undefined。

## 补充
- `createToastManager`/`ToastProvider` 的订阅键 `' subscribe'`（含前导空格，两处一致）是刻意"伪私有"，非 bug；新 toast 若"外部 add 不渲染"，多为 §2 的 waitFor 误用。
- store 的 `applyLimited` 用 `activeIndex >= limit`（store.ts:76-86），`addToast` 最新在前 → limit=3 加 3 个 toast 最老 activeIndex=2 不 limited，**要测 limited 需加第 4 个**（用户自加用例的期望是理解偏差）。

## 文件证据
- E:\actview\packages\core\src\runtime\mountComponent.ts:136-144,213,217-224,257-259（props=shallowReactive + render 重跑 + runEffect）
- E:\actview\packages\core\src\reactivity\ref.ts:24；actview-utils/src/store/useStore.ts:43-56
- E:\actview\packages\testing\src\testing.ts:162-181（waitFor 只在 throw 时重试）
- toast/root/ToastRoot.tsx:43,53（toast: _toast + computed）、title/ToastTitle.tsx:19,35（children: _children + resolveChildren）、action/ToastAction.tsx:38（getter 合并 prev）
- slider/control/SliderControl.tsx:536-540（AI-003 范本）；select/item/SelectItem.tsx:27-36（非元素 prop 排除）
- plantform-diff.md PD-15（setup 解构冻结）、AD-36、AD-37（toast prop computed 化 + elementProps children 快照）、AD-20/27/35（getter 合并 prev）；actview-issue.md AI-003
- 相关类型级修复（addEventListener / .value! 解包）见 toast-port-fixes.md
