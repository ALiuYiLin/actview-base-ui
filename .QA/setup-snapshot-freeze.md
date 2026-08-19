# setup 解构/对象快照冻结响应式值（PD-15 家族）——多组件实例

## 问题本质
actview 组件 **setup 只执行一次**，props 是 shallowReactive 代理、父组件更新时**原地写**——setup 里解构/构造的局部对象捕获的是**当时的旧值**，后续响应式变化读到的都是**冻结快照**，渲染函数重跑也没用（它读的是 setup 已缓存的 const）。渲染函数本身每次重跑，但 setup 局部 const 是快照。

## 共通修复
凡是要「跟着 props 变化」的值，一律不 setup 解构，改**惰性读取**：`const x = computed(() => componentProps.x)`（或渲染 getter 内读 `componentProps.x`），全组件读 `x.value`。

## 各组件实例（同一问题的不同触发场景）
1. **toast —— store 换新对象**（AD-36/37）：store 每次 add/update/close 换**新 toast 对象**（`setToasts(toasts.map(...))`），`const { toast } = componentProps` 冻结旧对象 → transitionStatus 永远 'starting'（data-starting-style 残留）、close 的 ending 读不到（永不消失）、update 的 title/actionProps 不刷新。修复 `const toast = computed(() => componentProps.toast)`，全组件读 `toast.value.xxx`（watch 源 / state computed / getDefaultProps / 事件回调）。
2. **toast —— children 快照覆盖 getter**（AD-36）：`children` 也必须从 setup 解构排除（`children: _children`），由 getter/computed 读 `componentProps.children`——否则 elementProps 里的旧 children VNode 会**覆盖** getter 的新 children，title 永不更新。
3. **combobox —— filterQuery 解构快照**（AD-39 族）：AriaCombobox 原在 setup `const { filterQuery } = componentProps` 解构 → 恒为初始值，autocomplete mode=both 时 typed query 过滤失效（inline 补全改变了显示值但过滤仍用首帧 query）。修复：消费处改 `componentProps.filterQuery` **代理读**（computed 内响应式）。
4. **combobox/autocomplete —— Item index 快照**（AD-40 关联）：Item 的 `index` 若 setup 解构，不随过滤更新 → 走响应式 indexFromFilter（见 structural-ref-registration.md）。
5. **useRenderElement props 数组里的普通对象字面量在 setup 冻结**（AD-17/35/21）：`props: [{静态对象}]` 读到的 `x.value` 不更新 → 依赖响应式的 props 一律写成 **getter 函数** `(prev) => ...`。排查：grep `props: [` 后跟普通对象。
6. **getElement() 在 setup 缓存成 VNode**（AD-38）：`const renderedInput = <Provider>{getElement()}</Provider>` 缓存整棵渲染元素，useRenderElement 的 props getter 只在 setup 执行一次 → 后续响应式变化（受控 value/inline 补全/aria）**永不反映到 DOM**。修复：getElement() 调用**内联进最终 return 的 JSX**（三元直接内联，每次渲染求值）。排查：给 getter 加日志——状态已更新但 getter 不重跑即为缓存。
7. **context 普通值快照**（toast B 族）：`ToastRootContext` 里 `expanded: boolean` 等是普通值非 ref，provider 用整个 `computed(() => ({...}))` 提供；setup 期 `const { expanded } = useToastRootContext().value!` 解构是**快照**（不响应 + 误写 `expanded.value` TS 错）。修复：`const context = useToastRootContext(); const behind = computed(() => context.value.visibleIndex > 0);`——**响应式值放 computed/渲染 getter 里重读**；稳定东西（对象、回调）才可 setup 解构一次。
8. **setup 期 `if (!shouldRender) return null` 提前返回固定**（AD-34）：return null 分支是 setup 快照 → 改放进返回 JSX 里条件求值 `return <>{cond.value && createElement(...)}</>`（Portal/Clear/ItemIndicator）。

## 排查顺序（状态变了但 UI 不更新）
① 给 props getter/渲染 getter 加日志，确认 getter 是否重跑：
- getter 不重跑 & 整棵渲染元素是 setup 缓存的 → **AD-38**；
- getter 不重跑 & props 数组是普通对象 → **AD-17/35**；
- getter 重跑但读的还是旧值 → **PD-15 setup 解构快照**（改 computed 惰性读）。

## 文件证据
- E:\actview\packages\core\src\runtime\mountComponent.ts:136-144（props=shallowReactive）、:213,217-224,257-259（render 重跑）
- toast/root/ToastRoot.tsx:43,53；title/ToastTitle.tsx:19,35；content/ToastContent.tsx:20,47,50；root/ToastRootContext.ts:9-16,23-31
- combobox/root/AriaCombobox.tsx（filterQuery 代理读）；combobox/input/ComboboxInput.tsx:471-491（getElement 内联）；combobox/item/ComboboxItem.tsx（indexFromFilter）
- plantform-diff.md PD-15、AD-17/21/34/35/36/37/38/39
