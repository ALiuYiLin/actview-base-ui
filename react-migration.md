# React → ActView 迁移案例库

> 目标：`packages/react` → `packages/actview`（@base-ui/actview）
> 本文档记录迁移过程中的**典型案例**：为什么这样改、这样做的好处，作为后续组件的参考范式。

---

## 案例 1：组件写法范式 —— `defineComponent` 显式包裹 + 渲染期解构

**组件**：`packages/actview/src/separator/Separator.tsx`
**日期**：2026-08-（手动教学重构，跟随用户重构全部组件实现方式）

### 迁移前（错误范式）

```tsx
export function Separator(componentProps: Separator.Props) {
  const getElementProps = () => {
    const { render: _render, className: _className, style: _style, orientation: _orientation, ...elementProps } = componentProps;
    return elementProps;
  };

  const state = computed(() => ({ orientation: componentProps.orientation ?? 'horizontal' }) as SeparatorState);

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      { role: 'separator', 'aria-orientation': componentProps.orientation ?? 'horizontal' },
      getElementProps,
    ],
  });

  // 必须 JSX return，否则 Babel 不转 defineComponent
  return <>{getElement()}</>;
}
```

### 迁移后（正确范式）

```tsx
export const Separator = defineComponent(function (componentProps: Separator.Props) {
  // setup：只做一次性初始化（ref 等）
  const rootRef = ref<HTMLElement | null>(null);

  return () => {
    // 渲染函数：每次渲染执行，这里才解构 props
    const { render, orientation = 'horizontal', className, style, ...elementProps } = componentProps;
    const state: SeparatorState = { orientation };

    const merged: HTMLProps = {
      role: 'separator',
      'aria-orientation': orientation,
      className: typeof className === 'function' ? className(state) : className,
      style: typeof style === 'function' ? style(state) : style,
      ...elementProps,
    };

    if (render) {
      if (typeof render === 'function') {
        return render({ ...merged, ...state, ref: rootRef });
      }
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
});
```

### 为什么这样改

1. **setup 冻结问题（PD-15）**：`function App(props)` 这种组件函数会被 Babel 转换成 `defineComponent` 的形式，但其函数体 = setup（只执行一次）。如果在 setup 层解构 props，拿到的是一份**快照**——props 后续变化（父组件更新传新值）不会反映到已解构的变量上，这就是"响应式丢失"。解构方式复杂时（层层剥 render/className/style/事件），还会引出大量响应式 API 绕弯。
2. **显式 `defineComponent`**：直接写明组件定义，不依赖 Babel 隐式转换，语义清晰。
3. **解构放渲染期**：`return () => {...}` 是渲染函数，**每次渲染都执行**，此时解构 props 永远拿到最新值，天然规避 setup 冻结。

### 这样做的好处

| 维度 | 好处 |
|---|---|
| **简单** | 不用 `useRenderElement` 那套 getter 链（`getElement()` 每次渲染调用、mergeProps 5 参上限、props 数组展开覆盖 on* handler 等坑全部消失） |
| **简洁** | 组件函数体 = setup（初始化）+ 渲染函数（JSX 直出），心智模型与"普通组件"完全一致 |
| **高效** | 渲染期直接 JSX，无额外代理/合并层 |
| **响应式正确** | 渲染函数每次执行读取 props 代理 → 变化自然触发重渲染 |

---

## 案例 2：render prop 类型 —— 单 props 对象（元素 props + state + ref）

**文件**：`packages/actview/src/types/index.ts` 的 `ComponentRenderFn`

### 迁移前（错误类型，React 惯性）

```ts
export type ComponentRenderFn<Props, State> = (
  props: Props,
  state: State,          // ← 第二参数，React 式 (props, state) 双参
) => VNode | null | undefined;
```

### 迁移后（ActView 设计）

```ts
export type ComponentRenderFn<RenderFunctionProps, State> = (
  props: RenderFunctionProps & State & { ref?: RefValue },  // ← 单对象：全合并
) => VNode | null | undefined;
```

### 为什么这样改

**ActView 的设计——组件世界处处是"单 props 对象"**：

- 组件 setup/render：`function App(props) { return () => ... }` —— 一个 props 对象
- 渲染函数（render）：`() => JSX` —— 无参数
- render prop：`(props) => VNode` —— **一个合并 props 对象（元素 props + state + ref）**

React 的 `(props, state)` 双参是 React 心智（render prop 惯例），但 ActView 里组件到处都收单个 props 对象，render prop 也应该是单对象——**用户拿到的 props 里既有元素属性也有状态，无头组件和普通组件的心智模型统一**。

### 用户侧体验（无头组件使用）

```tsx
<Separator
  render={(props) => (
    <div {...props} class="my-sep">
      {props.orientation}   // ← state 就在 props 里，无需第二参
    </div>
  )}
/>
```

### 库侧调用

```ts
if (typeof render === 'function') {
  return render({ ...merged, ...state, ref: rootRef });  // 单对象，state/ref 全在 props 里
}
```

### 这样做的好处

- 用户心智统一：不用记"第二个参数是什么类型、要不要传"
- 组件内部也不用维护双参签名，类型更简单（`RenderFunctionProps & State & { ref? }` 一个交叉类型搞定）
- state 直接可读：`props.orientation` 即状态，无需从别处取

---

## 案例 3：VNode 透传 —— key 是顶层字段，必须显式透传

**位置**：`Separator.tsx` 的 render VNode 分支

### 问题

```tsx
// ❌ 错误
const Tag = render.type as any;
return <Tag {...render.props} {...merged} ref={rootRef} />;
//              ^^^^^^^^^^^^^^ 只展开了 props
```

VNode 的 `key` 存在 **`render.key` 顶层字段**（不在 `props` 里），`{...render.props}` 带不过去。列表场景（`<Separator render={<div key={item.id} />} />`）下 key 丢失 → diff 错乱（复用错误节点 / 重复渲染）。

### 修复

```tsx
const Tag = render.type as any;
return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
//          ^^^^^^^^^^^^^^ 显式透传顶层 key
```

### 注意事项（VNode 透传完整覆盖）

| 字段 | 位置 | 透传方式 |
|---|---|---|
| `key` | `render.key`（顶层） | `key={render.key}` 显式传 |
| 其余 props | `render.props` | `{...render.props}` 展开 |
| 组件注入 | merged（ARIA/className/style/事件） | `{...merged}` 放中间覆盖 |
| `ref` | 内部模板 ref | `ref={rootRef}` **放最后**兜底（覆盖 VNode/merged 自带的 ref） |

### 为什么这样做

- key 是 diff 的关键标识，丢了会导致整个列表复用逻辑错乱，是隐性 bug
- ref 放最后是"内部 ref 优先"策略：组件内部需要 rootRef 做测量/事件，不能允许外部 VNode 的 ref 顶掉它

---

## 案例 4：className/style 函数形态解析

**位置**：`Separator.tsx` 渲染函数

### 问题

`BaseUIComponentProps` 的 `className`/`style` 支持**函数形态**（`(state) => string`，state 驱动的动态样式）。直接 `...elementProps` 展开到原生 `<div>` 上会类型报错，且运行时函数不会被调用。

### 修复

```tsx
const { render, orientation = 'horizontal', className, style, ...elementProps } = componentProps;
const state: SeparatorState = { orientation };

const merged: HTMLProps = {
  role: 'separator',
  'aria-orientation': orientation,
  className: typeof className === 'function' ? className(state) : className,  // 函数形态按 state 解析
  style: typeof style === 'function' ? style(state) : style,                  // 函数形态按 state 解析
  ...elementProps,
};
```

### 好处

- 类型干净：merged 是 `HTMLProps`，可安全 spread 到 JSX 元素
- 功能完整：`className={(state) => state.orientation === 'vertical' ? 'v' : 'h'}` 这类 Base UI 惯例写法可用

---

## 案例总结：定义组件范式清单（后续组件照此实现）

```tsx
export const Xxx = defineComponent(function (componentProps: Xxx.Props) {
  // 1. setup：只做一次性初始化（ref / watch / store 等）
  const rootRef = ref<HTMLElement | null>(null);

  return () => {
    // 2. 渲染期解构 props（避免 setup 冻结，PD-15）
    const { render, className, style, ...elementProps } = componentProps;
    // 3. 计算 state（纯对象，非 computed——渲染期每次算）
    const state: XxxState = { ... };
    // 4. merged：ARIA/data-* 状态 + className/style 函数解析 + 用户透传
    const merged: HTMLProps = { role: '...', 'aria-...': ..., className: ..., style: ..., ...elementProps };
    // 5. render 三形态：函数（单对象）/ VNode（key 显式透传 + ref 兜底）/ 默认 JSX
    if (render) {
      if (typeof render === 'function') return render({ ...merged, ...state, ref: rootRef });
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
});
```
