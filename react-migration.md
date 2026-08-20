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

## 案例 5：官方 `createContext` —— 替换自封装版（Provider 收值、注入 ref 本体）

**文件**：`toggle-group/ToggleGroupContext.ts`、`toolbar/root/ToolbarRootContext.ts`、`toolbar/group/ToolbarGroupContext.ts`

### 迁移前（自封装 createContext，错误）

```ts
// internals/createContext.tsx（自封装）
export function createContext<T>(key: string, defaultValue: T) {
  function Provider(props: { value: ContextSource<T> }) {
    const live = computed(() => unref(props.value));  // 包 computed 惰性求值
    provide(key, live);
    return <>{props.children}</>;
  }
  function use(): ComputedRef<T> { ... }
}
```

### 迁移后（框架官方 API）

```ts
import { createContext } from 'actview';

export const ToggleGroupContext = createContext<ToggleGroupContext<any> | undefined>(undefined);
//                                            ↑ 只有一个参数：defaultValue

export function useToggleGroupContext<Value>() {
  // 框架 use() 返回 Ref（无 Provider 时返回默认值 ref，.value 为 undefined）
  return ToggleGroupContext.use() as ComputedRef<ToggleGroupContext<Value> | undefined>;
}
```

### 为什么这样改

**框架版与自封装版的机制差异**：

| | 自封装版 | 框架官方版 |
|---|---|---|
| 签名 | `createContext(key, defaultValue)` 两参 | `createContext(defaultValue)` 单参 |
| Provider 注入 | 包 `computed(() => unref(props.value))`（注入"值"需惰性求值） | **注入 ref 本体**（provide(key, state)，state 就是响应式渠道） |
| use() 返回 | ComputedRef（包装过） | 注入的 ref 本身（ComputedRef 和 Ref 都是 `.value` 读取） |

**框架版全链机制**：

```
<ToggleGroupContext.Provider value={ctx}>
  setup: state = ref(ctx ?? undefined)
         provide(key, state)          ← 注入的是 ref 本体
         watch(() => props.value)     ← value prop 变化 → state.value 同步
消费方 setup 顶层: const ctx = ToggleGroupContext.use()   ← 拿到这个 ref
消费方 render: ctx.value?.disabled   ← 读 .value → 追踪 state ref
值变化 → state.value 写入 → 消费方 render effect 重跑 ✓
```

自封装包 computed 是因为注入的是"值"需要惰性求值；**框架版直接把响应式渠道（ref）注入**，use() 返回的就是它。

### 关键点：Provider 传值不传 ref

```tsx
// ✅ 正确：value 传解包后的值（computed 惰性缓存 → 引用稳定）
<ToggleGroupContext.Provider value={contextValue.value}>

// ❌ 错误：传 computed 本体会类型报错
// （框架版 Provider value 类型是值类型，不是 ComputedRef）
<ToggleGroupContext.Provider value={contextValue}>
```

`contextValue` 用 `computed` 惰性缓存——**依赖不变时引用稳定**，Provider 的 `watch(() => props.value)` 只在真正变化时同步（不产生无谓的消费方重渲染）。

---

## 案例 6：`useRootElement` 的边界 —— "根是 Provider/List 包裹"时拿不到实际元素

**文件**：`internals/composite/root/CompositeRoot.tsx`、`useCompositeRoot.ts`

### 问题

`useRootElement()` 绑定的是**调用它的组件根 VNode 的 el**。但 CompositeRoot 的根是：

```tsx
<CompositeRootContext.Provider value={...}>
  <CompositeList>{element}</CompositeList>   // 实际元素在深层
</CompositeRootContext.Provider>
```

组件根是 Provider（非元素）→ `subTree.el` 不是实际渲染的 div/button → **rootRef 恒为 null** → `onKeyDown` 里 `if (!element) return` → 键盘导航失效（ArrowRight/Home/End 不移动焦点）。

### 判断规则（useRootElement 适用边界）

| 组件根形态 | useRootElement | 修法 |
|---|---|---|
| **根是元素**（Toggle/useButton/useCompositeItem） | ✅ 自动绑定 | 直接用 |
| **根是 Provider/Fragment 包裹**（实际元素在深层，如 CompositeRoot） | ❌ 拿不到 | `ref()` + **显式模板 ref 挂到渲染元素** |

### 修复

```tsx
// CompositeRoot.tsx：用 ref() + 显式挂载
const rootRef = ref<HTMLElement | null>(null);   // 不是 useRootElement()

// useCompositeRoot.ts：rootRef 参数传入 + props.ref 显式挂到元素
rootRef: Ref<HTMLElement | null>,   // 参数类型
const props: HTMLProps = {
  ref: rootRef as any,   // ← 显式挂到渲染元素（defaultProps.ref 链）
  onFocus(event) { ... },
  onKeyDown,
};
```

**排查法**：`onKeyDown` 里给 `rootRef` 加日志，事件触发时若为 null → 根绑定失败（useRootElement 拿错根）。

### 教训

这是"根是组件时模板 ref 失效"（PD-02）的**另一面**：
- 根是元素 → useRootElement 自动绑定
- 根是 Provider/Fragment 包裹 → useRootElement 失效，需显式 ref 挂载

选择前先问：**这个组件的根 VNode 是元素还是包裹组件？**

---

## 案例 7：`refs` 数组删除 —— ref 流简化（hook 内部自取根 DOM）

**文件**：`internals/composite/item/CompositeItem.tsx`、`useCompositeItem.ts`、toolbar 家族

### 迁移前（React 式 ref 显式传递）

```tsx
// CompositeItem 收 refs 数组，useRenderElement 合并挂到元素
refs?: RefValue<HTMLElement | null>[] | undefined;
ref: [compositeRef, ...(componentProps.refs ?? EMPTY_ARRAY)] as RefValue<Element>[],
```

### 迁移后（hook 内部自取根）

```tsx
// useCompositeItem 内部：useRootElement() 自取根 DOM（根是元素场景）
const rootRef = useRootElement();
return { compositeProps, compositeRef: rootRef as Ref<HTMLElement | null>, index };

// CompositeItem 渲染层：ref 直接用 compositeRef，不再收 refs 数组
if (typeof render === 'function') {
  return render({ ...merged, ...resolvedState, ref: compositeRef });
}
if (render) {
  const Tag = render.type as any;
  return <Tag key={render.key} {...render.props} {...merged} ref={compositeRef} />;
}
return <component is={tag ?? 'div'} {...merged} ref={compositeRef} />;
```

### 连带影响

- **用户 ref（`componentProps.ref`）不再转发**：渲染期解构 `ref: _ref` 丢弃即可——hook 内部自取根，调用方无需传
- useButton 的 `buttonRef` 从回调 ref 改为 `Ref<HTMLElement|null>`（内部 useRootElement），同样不再需要转发
- 但注意：**只有"根是元素"的组件能自取**；"根是包裹"的组件（CompositeRoot）仍需显式挂载（见案例 6）

### 注册类 ref 仍需显式驱动

`useCompositeItem` 里 `useCompositeListItem` 返回的 `ref` 是**注册回调**（register/unregister 到 CompositeList），不能丢——用 `watch` 桥接：

```tsx
// flush 'sync'：卸载时序是 beforeUnmount（useRootElement 置 null）→ scope.stop()
// → 微任务才跑；默认 flush（微任务）的 runJob 在 effect 停止后执行 → 回调被丢弃。
// 'sync' 在置 null 的瞬间同步执行，scope.stop() 之前完成注销 ✓
watch(
  rootRef,
  (node) => { ref(node as HTMLElement | null); },
  { immediate: true, flush: 'sync' },
);
```

### 补充：`mergeProps` vs `mergePropsN`（数组展开）

```tsx
// ❌ 错误：mergeProps 是固定参数重载（最多 5 参），传数组报
//    "扩张参数必须具有元组类型或传递给 rest 参数"
const merged = mergeProps(props, { className, style });   // props 是数组

// ✅ 正确：mergePropsN 收数组
const merged = mergePropsN([compositeProps, ...(extraProps ?? []), elementProps]);
```

语义完全一致（mergePropsN 内部就是循环 mergeInto）。**props 数组场景一律用 mergePropsN**。

---

## 案例 8：`defineComponent` 泛型组件 —— `as` 断言保留泛型签名

**文件**：`CompositeItem.tsx`、`CompositeRoot.tsx`、`ToggleGroup.tsx`

### 问题

```tsx
// 泛型在 defineComponent 包裹的函数上
export const CompositeItem = defineComponent(function <
  Metadata,
  State extends Record<string, any>,
>(componentProps: CompositeItem.Props<Metadata, State>) {
  ...
});
```

`defineComponent(fn)` 的返回类型**丢失内层函数的泛型参数**——导出后的组件是非泛型类型，JSX 里 `<CompositeItem<A, B>>` 报"应有 0 个类型参数"（ts(2558)）。

### 修复：导出时 `as` 断言贴回泛型签名

```tsx
export const CompositeItem = defineComponent(function <
  Metadata,
  State extends Record<string, any>,
>(componentProps: CompositeItem.Props<Metadata, State>) {
  // ...
}) as <Metadata, State extends Record<string, any>>(
  props: CompositeItem.Props<Metadata, State>,
) => any;
```

像 React `forwardRef` 的 `as` 断言一样，把泛型签名"贴"回导出类型。**若调用处能自动推断则可不写显式泛型**（`metadata`/`state` props 类型可推断时）。

---

## 案例 9：测试必须 `await act()` —— ActView 响应式更新是异步 flush

**文件**：`toggle-group/ToggleGroup.test.tsx`（17 用例）

### 问题

React 版测试用 `await user.click()`（user-event 自带等待）。actview 移植时直接 `fireEvent.click(button)` 后立即断言 → **12 个测试全挂**（`aria-pressed` 不变、焦点不移动）。

**原因**：actview 的响应式更新是**异步 flush**（computed → Provider watch → 重渲染是微任务链），`fireEvent` 是同步 dispatch，事件后的状态变化还没落到 DOM。

### 修复

```tsx
// createRenderer 提供 act：await fn() + nextTick
await act(() => {
  fireEvent.click(button1);
});
expect(button1).toHaveAttribute('aria-pressed', 'true');
```

### 判断规则

| 场景 | 处理 |
|---|---|
| `render()` 后立即断言初始状态 | ✅ 同步（actviewRender 同步挂载） |
| `fireEvent` 交互后断言 | ⚠️ 必须 `await act(() => { fireEvent... })` |
| `setProps` 后断言 | ✅ `await result.setProps(...)`（内部已 nextTick） |

**注意**：`createRenderer` 的 result **没有** `getByRole`/`getAllByRole`（actview 测试无 screen）——用 `data-testid` + `document.querySelector` 查询。

---

## 案例 10：ToolbarGroup / ToolbarSeparator —— Provider 包裹三形态 + mergePropsN 的 propsGetter 陷阱

### ToolbarGroup：根是 Provider 包裹（div 在内层）

根 VNode 是 `<ToolbarGroupContext.Provider>{...}</...>`——Provider 不产生 DOM，`useRootElement` 拿不到实际元素 → 同 CompositeRoot 边界（案例 6）：`ref()` + 显式挂载。

```tsx
export const ToolbarGroup = defineComponent(function (componentProps: ToolbarGroup.Props) {
  const rootContext = useToolbarRootContext();   // setup 顶层（AD-42）
  const disabled = computed(
    () => (rootContext.value.disabled ?? false) || (componentProps.disabled ?? false),
  );
  const contextValue = computed<ToolbarGroupContext>(() => ({ disabled: disabled.value }));
  const rootRef = ref<HTMLElement | null>(null); // Provider 包裹 → 显式挂载

  return () => {
    const { className, disabled: _disabled, render, style, ref: _ref, ...elementProps } = componentProps;
    const state: ToolbarGroupState = { disabled: disabled.value, orientation: rootContext.value.orientation };
    const merged = mergePropsN([
      { role: 'group' },
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    // 三形态各自 return，Provider 必须始终包裹（Group 的职责是提供 context）
    if (typeof render === 'function') {
      return <Provider>{render({ ...merged, ...state, ref: rootRef })}</Provider>;
    }
    if (render) { /* <Tag key={render.key} {...render.props} {...merged} ref={rootRef} /> */ }
    return <Provider><div ref={rootRef} {...merged} /></Provider>;
  };
}) as (props: ToolbarGroup.Props) => any;
```

### ⚠️ mergePropsN 的 propsGetter 是「替换语义」——函数会冲掉前面的合并结果

排查 data-testid 丢失的根因（DOM 里 button/input 只剩 aria-disabled，透传属性全丢）：

`mergePropsN` 对数组项的处理：**对象** → `mutablyMergeInto`（右覆盖左合并）；**函数** → `resolvePropsGetter`（`fn(previousProps)` 的返回值**整体替换** merged，不自动合并）。

```ts
function mergeInto(merged, inputProps) {
  if (isPropsGetter(inputProps)) return resolvePropsGetter(inputProps, merged); // 替换！
  return mutablyMergeInto(merged, inputProps);                                  // 合并
}
```

ToolbarButton 旧写法（bug）：`conditionalDisabledProps` 是函数且返回 `EMPTY_OBJECT` → 数组里它后面的所有合并结果被替换成空对象，`data-testid` 等全丢：

```tsx
const conditionalDisabledProps = () =>
  componentProps.render ? { disabled: disabled.value } : EMPTY_OBJECT; // 冲掉一切！
props={[elementProps, conditionalDisabledProps, getButtonProps]}
```

修复（对齐 React 原版——那里是**对象**）：渲染期直接求值对象，不传函数：

```tsx
const conditionalDisabledProps = componentProps.render
  ? { disabled: disabled.value }
  : EMPTY_OBJECT; // 对象 → mutablyMergeInto 合并路径，透传属性保留
```

ToolbarInput 同理：`useFocusableWhenDisabled` 返回的 `props` 是 getter **函数**，渲染期先调用得对象再进数组：

```tsx
const focusableProps = focusableWhenDisabledProps(); // 渲染期调用
props={[defaultProps, elementProps, focusableProps]}
```

### 判断规则（props 数组里能放什么）

| 数组项 | 语义 | 正确用法 |
|---|---|---|
| 对象 | 合并（右覆盖左） | 渲染期求值的普通对象（首选） |
| 函数 | propsGetter：`fn(previousProps)` 返回值**替换** merged | 仅当函数自己展开 previousProps（如 `getButtonProps(externalProps)` 内部 `{...otherExternalProps}` 把 previous 带回来）；`() => EMPTY_OBJECT` 会冲掉一切 |

### ToolbarSeparator：委托组件的 defineComponent 包装

薄包装委托已重构的 Separator。defineComponent 包裹 + 渲染期算 orientation：

```tsx
export const ToolbarSeparator = defineComponent(function (componentProps: ToolbarSeparator.Props) {
  const rootContext = useToolbarRootContext(); // setup 顶层（AD-42）
  return () => {
    const orientation =
      componentProps.orientation ??
      (rootContext.value.orientation === 'vertical' ? 'horizontal' : 'vertical');
    return (
      <Separator {...componentProps} orientation={orientation} /* className/style as any 保类型 */ />
    );
  };
}) as (props: ToolbarSeparator.Props) => any;
```

委托子组件时透传全部 componentProps（含 ref）——子组件内部自己处理 ref / 三形态 / className 函数解析，包装层不重复实现。

### 测试要点

- **断言透传属性（data-testid）是否到达 DOM** 是验证 mergePropsN 链的有效手段——ToolbarGroup 测试靠它抓出了上述存量 bug。
- actview 的 setup 错误被框架捕获为 `console.error('[actview] 组件渲染错误:', Error{...})` **双参数**日志（不 rethrow），断言日志而非 rejects：

```tsx
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
try {
  await render(ToolbarSeparator, {}); // 无 ToolbarRoot 包裹
  expect(errorSpy).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      message: expect.stringContaining('Base UI: ToolbarRootContext is missing...'),
    }),
  );
} finally {
  errorSpy.mockRestore();
}
```

---

## 案例 11：DirectionProvider / CSPProvider —— 无 DOM 的 Provider 组件 + context 换官方 createContext

### 无 DOM 的 Provider 组件：比普通组件更简单（无三形态）

Provider 组件不渲染自身元素，只包 children + 提供 context。defineComponent + setup computed + 渲染期解构 children：

```tsx
export const DirectionProvider = defineComponent(function (componentProps: DirectionProvider.Props) {
  // setup：context 值 computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo，
  // 也保证 Provider watch 只在 direction 真正变化时同步）
  const contextValue = computed<DirectionContext>(() => ({
    direction: componentProps.direction ?? 'ltr',
  }));

  return () => {
    const { children } = componentProps; // 渲染期解构

    // Provider 传值不传 ref（案例 5）：value={contextValue.value}
    return (
      <DirectionContext.Provider value={contextValue.value}>
        {children}
      </DirectionContext.Provider>
    );
  };
}) as (props: DirectionProvider.Props) => any;
```

要点：
- 没有根元素 → 无 rootRef / 无 render 三形态 / 无 className-style 解析
- `as` 断言贴回 Props 签名（无泛型时 `(props: X.Props) => any`）
- **传值不传 ref**：`value={contextValue.value}`。原实现传 `value={contextValue}`（computed 本体）虽也能工作（框架 watch 会解包 ref），但不符约定，统一传值

### context 基建换官方 createContext（自封装双参 → 官方单参）

DirectionContext/CspContext 原用自封装 `internals/createContext`（`createContext(key, defaultValue)` 双参 + name + `ContextSource` 三态），换框架官方：

```ts
// 自封装版（旧）
import { createContext } from '../createContext';
export const DirectionContext = createContext<DirectionContext | undefined>(
  'base-ui-direction-context', // key
  undefined,
);

// 官方版（新）——单参 defaultValue
import { createContext } from 'actview';
export const DirectionContext = createContext<DirectionContext | undefined>(undefined);
```

### use() 消费者形态：computed 包一层保持兼容

官方 `createContext.use()` 返回注入 ref；自封装返回 `ComputedRef`。消费 hook 包 `computed` 保持 `.value` 读取形态不变，10+ 个调用方零改动：

```ts
export function useDirection() {
  const context = DirectionContext.use();           // setup 调用（依赖 useInjects）
  return computed(() => context.value?.direction ?? 'ltr'); // 渲染期读 .value 追踪
}
```

**注意**：自封装 createContext 仍有 59 处使用（未重构家族的全部 context），不能删——已重构家族（ToggleGroup/Toolbar/Direction/CSP）用官方版，未重构的继续用自封装，逐个家族迁移时换掉。

### 测试：probe 组件验证 context 传导

Provider 本身不渲染 DOM，用 probe 子组件读 context 验证（React 原版同款思路）：

```tsx
function DirectionProbe() {
  const direction = useDirection();
  return <span data-testid="direction">{direction.value}</span>;
}

it('provides the configured direction to descendants', async () => {
  const result = await render(DirectionProviderTest, { direction: 'rtl' });
  expect(document.querySelector('[data-testid="direction"]')).toHaveTextContent('rtl');

  await result.setProps({ direction: 'ltr' }); // 响应式传导验证
  expect(document.querySelector('[data-testid="direction"]')).toHaveTextContent('ltr');
});
```

---

## 案例 12：Button —— getButtonProps 传函数 vs 对象：disabled 拦截的关键差异

### 背景

Button 重构为 defineComponent。已有 7 个测试（disabled 原生属性、render 三形态、focusableWhenDisabled、Enter/Space 键盘激活、ref）全部保持通过。

### ⚠️ getButtonProps 必须传「函数」（propsGetter）且放数组最后——不能像 Toggle 那样渲染期调用成对象

案例 10 说"函数=替换语义，`() => EMPTY_OBJECT` 会冲掉一切，需要追加时渲染期求值对象"——**但 getButtonProps 是例外**：

| 传法 | 用户 onClick 的 disabled 拦截 | 透传属性 |
|---|---|---|
| 函数（propsGetter，放最后） | ✅ **拦截**：`getButtonProps(previousProps)` 把 previous 当 externalProps，用户 onClick 进 `externalOnClick`，disabled 时内部 `return` 直接跳过 | ✅ `...otherExternalProps` 展开保留 |
| 对象（`getButtonProps()` 渲染期调用） | ❌ **不拦截**：用户 onClick 在事件链外层（mergeEventHandlers 的 ourHandler），useButton 的 onClick 只拦 externalOnClick（空），disabled 时用户 onClick 仍被调用 | ✅ |

```tsx
// ✅ Button（传函数，放最后）：merged = mergePropsN([stateAttributes, elementProps, {className, style}, getButtonProps])
// ❌ Toggle 用户版（对象）：props = [aria对象, elementProps, getButtonProps()]——Toggle 无
//    focusableWhenDisabled 点击测试所以没暴露；Button 测试 5 会挂
```

**为什么函数放最后**：mergePropsN 从左到右合并，`mergeEventHandlers(our, their)` 里 **their（右侧）先执行**。getButtonProps 在最右 → 它的 onClick 第一个跑（disabled → `preventDefault + return`，不调 externalOnClick=用户）→ 拦截成功。放前面则用户 onClick 先跑，拦不住。

### 判断规则升级（案例 10 补充）

| props 数组里的函数 | 是否消费 previousProps | 处理 |
|---|---|---|
| `getButtonProps`（useButton 产物，`(externalProps?) => props`） | ✅ 消费 | **传函数，放数组最后**（externalProps 链 + disabled 拦截） |
| `() => EMPTY_OBJECT` / 不接收参数的 getter | ❌ 不消费 | 渲染期求值对象（案例 10），否则替换冲掉一切 |

### 其余范式点

- **data-* 属性**：`getStateAttributesProps(state)` 默认映射即可（`disabled: true` → `data-disabled=""`），无需 customMapping
- **ref**：不解构（留 elementProps 顺带绑定到根元素，同 Toggle）——组件 ref 回调仍触发
- **render 三形态**：render 函数形态 `render({ ...merged, ...state })`；VNode 形态 `key` 显式透传；默认 `<button {...merged} />`
- **类型**：`mergePropsN([...] as any)`——getButtonProps 事件签名（BaseUIEvent）与 JSX 事件类型不匹配（tsgo 基线同款错误），运行时兼容

---

## 案例总结：定义组件范式清单（后续组件照此实现）

```tsx
export const Xxx = defineComponent(function (componentProps: Xxx.Props) {
  // 1. setup：只做一次性初始化（ref / watch / store / context hooks 顶层调用）
  const rootRef = ref<HTMLElement | null>(null);   // 或 useRootElement()（根是元素时）
  const ctx = useSomeContext();                     // context hook 必须在 setup 顶层（AD-42）

  return () => {
    // 2. 渲染期解构 props（避免 setup 冻结，PD-15）
    const { render, className, style, ...elementProps } = componentProps;
    // 3. 计算 state（纯对象，非 computed——渲染期每次算）
    const state: XxxState = { ... };
    // 4. merged：ARIA/data-* 状态 + className/style 函数解析 + 用户透传
    //    （props 数组场景用 mergePropsN，不用 mergeProps）
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

## 范式决策速查（本次新增）

| 问题 | 答案 |
|---|---|
| 组件怎么写？ | `defineComponent(fn)` + setup 初始化 + 渲染期解构（案例 1） |
| render prop 类型？ | 单对象 `(props: RenderFunctionProps & State & { ref? }) => VNode`（案例 2） |
| VNode 透传？ | `key={render.key}` 显式 + `{...render.props}` + ref 兜底（案例 3） |
| className/style？ | 渲染期函数形态解析（案例 4） |
| context 用哪个？ | **框架官方 `createContext(defaultValue)`**（案例 5），Provider 传值不传 ref |
| 根 ref 怎么拿？ | 根是元素 → `useRootElement()`；根是 Provider/List 包裹 → `ref()` + 显式挂载（案例 6） |
| refs 数组？ | 删除——hook 内部自取根；注册类 ref 用 `watch(..., { flush: 'sync' })`（案例 7） |
| props 数组合并？ | `mergePropsN([...])`，不用 `mergeProps`（固定 5 参）（案例 7） |
| 泛型组件？ | 导出时 `as` 断言贴回泛型签名（案例 8） |
| 测试交互？ | `fireEvent` 后必须 `await act(...)`；无 `getByRole`，用 `data-testid`（案例 9） |
| state → data-*？ | `getStateAttributesProps(state, mapping)` 单值映射（对齐 Base UI 契约） |
| props 数组传函数？ | 对象=合并；函数=propsGetter **替换**（`fn(previous)` 返回值整体替换 merged）——`() => EMPTY_OBJECT` 会冲掉透传属性，需要追加时渲染期求值对象（案例 10） |
| 无 DOM 的 Provider 组件？ | defineComponent + setup computed + 渲染期解构 children + `value={contextValue.value}` 传值，无三形态（案例 11） |
| context 用自封装还是官方？ | 已重构家族用**框架官方 `createContext(defaultValue)`**；自封装 internals/createContext（双参+name）只在未重构家族暂存，逐个迁移时换掉（案例 11） |
| getButtonProps 传函数还是对象？ | **传函数放数组最后**（previousProps 进 externalProps → disabled 拦截生效）；`() => EMPTY_OBJECT` 类不消费 previous 的函数才渲染期求值对象（案例 12） |
