# actview toast 收尾 3 问题：getter 整体替换 / ref.value.map 响应式 / 非元素 prop 泄漏

## 问题
1) ToastAction 的 useRenderElement props 数组里 `() => context.value.toast.actionProps`（getter 忽略 prev）→ action 按钮没渲染（hasRenderableChildren=null）。是否 getter 整体替换丢 props？正确写法？
2) createToastManager 外部 manager.update('one',{title:'After'}) 后 UI title 仍 'Before'，30ms 不变；close 却通过。怀疑 toasts ref（store.useState('toasts')）map 是否被响应式追踪。
3) ToastRoot DOM 上泄漏 `toast="[object Object]"`——setup 只解构 render/className/style 没解构 toast。

## 结论（Evidence level: S6 — 全源码分析）

### (1) getter 整体替换 → 必须 `(prev) => ({ ...prev, ...actionProps })`
`mergePropsN` 的 getter 返回对象**整体替换 prev**，不自动合并（见 merge-props-actview-semantics.md）。`() => actionProps` 这种无参 getter 会**丢弃前面所有 getter/props**（getButtonProps 的 onClick、children、id…），只剩 actionProps 自身 → 按钮无 children → `hasRenderableChildren` 得 null 不渲染。
✅ 正确写法（AD-20/AD-27 每个 getter 合并 prev）：
```ts
(prev: any) => ({ ...prev, ...context.value.toast.actionProps }),
```
（先确认 actionProps 有 children 或按钮有默认 children；且 `context.value.toast` 仍是冻结 toast，见 #2，二者同源。）

### (2) ref.value.map 在 JSX return 里**是**响应式且触发重渲染 —— 坑在下方 stale toast prop
- **机制确认**：actview 把组件 render 用 `runEffect(update, {scheduler: queueJob})` 包起来（mountComponent.ts:257-259），render 内读 `.value`（ref.ts:24）即被 track；`store.useState` 返回的 Ref 由 useStore 订阅、store 通知时更新（useStore.ts:47-52）→ 该 Ref 变化 → render effect 重跑 → patch。**所以 `toasts.value.map(...)` 在 JSX return 里完全被响应式追踪并重渲染。** 这也是 close 能通过的原因（列表**成员移除** → map 重跑 → ToastRoot 卸载）。
- **#2 真因仍是将 toast prop 在 setup 解构冻结（PD-15）**：`update` 不改列表成员，只生成**同 id 的新 toast 对象** → map 重跑产出 `<ToastRoot key="one" toast={newToast}>`，但 ToastRoot **setup 已用旧 toast 解构** → ToastTitle `toast.title`（旧）→ 'Before' 停留。close 通过是因为移除改变的是**列表结构**，与每项内部读取无关。
- ✅ **修复仍是 #2 上一轮**：`const toast = computed(() => componentProps.toast)`，全文件 `toast.xxx`→`toast.value.xxx`；则新 toast prop 到达 → computed 更新 → 渲染重读新 title / transitionStatus / actionProps 全部生效。

### (3) 非元素 prop 必须从 componentProps 排除，否则泄漏到 DOM
actview 无自动透传、组件显式 spread `{...props}`（mountComponent.ts:8-9）；`...elementProps` 会保留所有没解构的键并 setAttribute。`toast` 没解构 → 泄漏为 `toast="[object Object]"`。
✅ 惯例（SelectItem.tsx:27-36 把所有非 DOM prop render/className/style/value/label/disabled/nativeButton 都解构）：ToastRoot 里也把 `toast` 解构出来排除：
```ts
const { toast, render: _render, className: _className, style: _style, swipeDirection = [...], ...elementProps } = componentProps;
```
（配 #2：解构出的 toast 用于 setup 期稳定读取；若需响应式则 `const toastState = computed(() => componentProps.toast)` 另建，elementProps 里排除 toast。）

## 文件证据
- E:\actview\packages\core\src\runtime\mountComponent.ts:257-259（render 被 runEffect 包 → ref.value 读被 track）、:8-9（无透传、显式 spread）
- E:\actview\packages\core\src\reactivity\ref.ts:24（unref 读 .value）
- actview-utils/src/store/useStore.ts:43-56（useState 订阅更新 Ref）
- select/item/SelectItem.tsx:27-36（非元素 prop 全部解构排除）
- toast/root/ToastRoot.tsx:44-48（只解构 render/className/style，漏 toast → 泄漏）
- plantform-diff.md AD-20/AD-27（getter 合并 prev）
