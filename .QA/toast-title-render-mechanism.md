# actview 组件模板重跑为何不刷新 getElement 子树：不是框架缓存，是 setup 解构冻结 children

## 问题
toast 更新 title 不生效，已定位到渲染机制：store 更新成功；ToastHost render effect 重跑（probe 显示 After）；ProbeTitle（模板直接 {String(props.children)}）也更新；但 ToastTitle 的 h2 文本仍 Before。ToastTitle 模板 `return <>{useToastLabelElement(getElement, shouldRender, id, setId)}</>`，getElement 里 props getter `(prev) => ({...prev, id, children})`，children 来自 setup 解构。问题：actview 模板重跑时 useToastLabelElement(...) 会重新求值吗？getElement() 每次重跑读到的 componentProps.children 是新的吗？patch 为何不更新 h2？是否 actview 对 setup 返回子树有缓存/静态化？其他组件有没有在模板里用自定义函数包 getElement() 的先例？ToastTitle 正确写法？

## 结论（Evidence level: S6 — 全源码分析）
**不是框架缓存/静态化。** actview 每次响应式变化都**重新调用** setup 返回的 render 函数（mountComponent.ts:213 `instance.render = setupResult`，:217-224 `update()` 调 `instance.render()` 并 `patch` 递归），因此 **`useToastLabelElement(...)` 与 `getElement()` 每次重跑都会重新执行、生成新 VNode**。挂载期 effect 用 `runEffect(update)`（mountComponent.ts:257-259），render 里读 `.value` 建立追踪，变化即重跑。

**h2 不更新的真因是 children 在 setup 期被解构冻结（PD-15）**：
- `ToastTitle.tsx:19` `children: childrenProp`（从 componentProps **setup 解构**）→ `useToastLabelPart(idProp, childrenProp, 'title')` → `children = childrenProp ?? toast.title`（frozen 旧值）。
- `getElement()` 重跑时 props getter `(prev)=>({...prev, id, children})` 读的是**这个冻结的 children** → 产出的新 VNode 仍带旧 children('Before') → patch 见 h2 文本没变 → 无操作。
- **对比 ProbeTitle**：模板直接 `{String(props.children)}` 读的是**响应式 props 代理的 `.children`**（mountComponent.ts:144 建立 shallowReactive props，父 patch 原地写:136-144）→ render 重跑读到新值 → 更新。差别就在「读 props 代理（响应式）」vs「读 setup 解构拷贝（冻结）」。

**结论：actview 没有对 setup 返回子树做缓存/静态化；函数调用表达式在模板重跑时重新求值。** 更新不生效是「解构冻结要读的响应式值」这一 PD-15 反例，与框架无关。

## 本项目先例
- 模板里用自定义函数包 getElement() 的**成功先例**很多，且都重新求值：
  - `ToastAction.tsx:47-54`：`return (<>{(() => { const el = getElement(); return hasRenderableChildren(el) ? el : null; })()}</>)` —— IIFE 条件渲染 getElement，重跑重求值。
  - `useToastLabelElement`（useToastLabelPart.tsx:54-61）：IIFE 内调 getElement + shouldRender 判断。
  - `SliderControl.tsx:540` `return <>{getElement()}</>`。
- 所以「函数包 getElement」本身没问题；关键是**包内/ getElement 内读取的值不能是 setup 冻结的拷贝**。

## ToastTitle 正确写法（响应 children 更新）
不要 setup 解构 children/toast；在渲染求值处读 componentProps（响应式代理）：
```ts
// setup 只解构稳定的（render/className/style/id prop 也谨慎；id 可 setup 读一次）
const { render: _render, className: _className, style: _style, id: idProp, children: childrenProp, ...elementProps } = componentProps;

// 读 toast（store 来的、随更新变）用 computed —— 不再是解构的 toast
const toastState = computed(() => componentProps.toast as ToastObjectType);

// useToastLabelPart 改为接收 getter/读 componentProps.children，
// 不要在 setup 把 children 快照进普通变量：
const children = computed(() => childrenProp ?? toastState.value.title);

// getElement 的 props getter 读 children.value（重新求值）
props: [
  (prev: any) => ({ ...prev, id, children: children.value }),
  elementProps,
],
```
要点：**任何随 store/父更新变化的值（children、toast.title、actionProps）都要在渲染 getter / computed 内从 `componentProps.*` 或 computed 读取，绝不 setup 解构成普通变量**。children 尤其——`useRenderElement` 的 props getter 机制本就为「每次 getElement() 重求值」设计（useRenderElement.tsx:38-48），你只需喂给它响应式的 children。

## 框架机制证据
- E:\actview\packages\core\src\runtime\mountComponent.ts:136-144（props=shallowReactive，父 patch 原地写；delete props.ref）、:213（instance.render=setupResult）、:217-224（update 重调 render + patch 递归）、:257-259（runEffect 包 render → 响应式重跑）
- actview-utils/src/store/useStore.ts:43-56（useState ref 订阅更新）
- toast/title/ToastTitle.tsx:19,31（setup 解构 children → 冻结）
- toast/utils/useToastLabelPart.tsx:33-62（IIFE 包 getElement；watch immediate）
- toast/action/ToastAction.tsx:47-54（函数包 getElement 成功先例）
- internals/useRenderElement.tsx:38-48（getElement getter 每次重求值）、:72-78（computeRenderElementProps → mergePropsN）
- plantform-diff.md PD-15（setup 解构冻结 props）
