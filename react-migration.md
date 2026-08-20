# React → ActView 迁移案例库

> 目标：`packages/react` → `packages/actview`（@base-ui/actview）
> 本文档记录迁移过程中的**典型案例**：为什么这样改、这样做的好处，作为后续组件的参考范式。
> 同类问题只保留一个完整案例，其余案例引用之。

---

## 案例 1：组件写法范式 —— `defineComponent` 显式包裹 + 渲染期解构

**组件**：`packages/actview/src/separator/Separator.tsx`

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

1. **setup 冻结问题（PD-15）**：`function App(props)` 这种组件函数会被 Babel 转换成 `defineComponent` 的形式，但其函数体 = setup（只执行一次）。如果在 setup 层解构 props，拿到的是一份**快照**——props 后续变化不会反映到已解构的变量上。**测试包装组件同样受此约束**（必须 defineComponent + `return () =>` 渲染期解构）。
2. **显式 `defineComponent`**：直接写明组件定义，不依赖 Babel 隐式转换。
3. **解构放渲染期**：`return () => {...}` 每次渲染都执行，解构永远拿到最新值。

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

### 迁移前（React 惯性双参）

```ts
export type ComponentRenderFn<Props, State> = (
  props: Props,
  state: State,          // ← 第二参数，React 式 (props, state) 双参
) => VNode | null | undefined;
```

### 迁移后（ActView 单对象）

```ts
export type ComponentRenderFn<RenderFunctionProps, State> = (
  props: RenderFunctionProps & State & { ref?: RefValue },  // ← 单对象：全合并
) => VNode | null | undefined;
```

### 为什么这样改

**ActView 的设计——组件世界处处是"单 props 对象"**：组件 setup/render 收一个 props 对象、渲染函数无参数、render prop 也应该是单对象——用户拿到的 props 里既有元素属性也有状态，无头组件和普通组件的心智模型统一。

### 库侧调用

```ts
if (typeof render === 'function') {
  return render({ ...merged, ...state, ref: rootRef });  // 单对象，state/ref 全在 props 里
}
```

---

## 案例 3：VNode 透传 —— key 是顶层字段，必须显式透传

**位置**：`Separator.tsx` 的 render VNode 分支

### 问题

VNode 的 `key` 存在 **`render.key` 顶层字段**（不在 `props` 里），`{...render.props}` 带不过去。列表场景下 key 丢失 → diff 错乱。

### 修复（VNode 透传完整覆盖）

| 字段 | 位置 | 透传方式 |
|---|---|---|
| `key` | `render.key`（顶层） | `key={render.key}` 显式传 |
| 其余 props | `render.props` | `{...render.props}` 展开 |
| 组件注入 | merged（ARIA/className/style/事件） | `{...merged}` 放中间覆盖 |
| `ref` | 内部模板 ref | `ref={rootRef}` **放最后**兜底（覆盖 VNode/merged 自带的 ref） |

```tsx
const Tag = render.type as any;
return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
```

---

## 案例 4：className/style 函数形态解析

**位置**：`Separator.tsx` 渲染函数

`BaseUIComponentProps` 的 `className`/`style` 支持**函数形态**（`(state) => string`）。直接 `...elementProps` 展开到原生元素会类型报错，且运行时函数不会被调用。渲染期按 state 解析：

```tsx
const merged: HTMLProps = {
  ...,
  className: typeof className === 'function' ? className(state) : className,
  style: typeof style === 'function' ? style(state) : style,
  ...elementProps,
};
```

---

## 案例 5：context —— 官方 `createContext`（自封装替换 + 三种 Provider 形态）

**覆盖**：案例 5/11/13/15 的 context 相关内容合并于此。

### 自封装版 → 框架官方版

| | 自封装版 | 框架官方版 |
|---|---|---|
| 签名 | `createContext(key, defaultValue)` 两参 | `createContext(defaultValue)` 单参 |
| Provider 注入 | 包 `computed(() => unref(props.value))`（注入"值"需惰性求值） | **注入 ref 本体**（provide(key, state)） |
| use() 返回 | ComputedRef（包装过） | 注入的 ref 本身（ComputedRef 和 Ref 都是 `.value` 读取） |

```ts
// 官方版（单参 defaultValue）
import { createContext } from 'actview';
export const DirectionContext = createContext<DirectionContext | undefined>(undefined);
```

**框架版全链机制**：`<Provider value={ctx}>` → setup `state = ref(ctx ?? undefined)` + `provide(key, state)` + `watch(() => props.value)` 同步 → 消费方 setup 顶层 `use()` 拿 ref → 渲染期读 `.value` 追踪。

### Provider 传值不传 ref

```tsx
// ✅ value 传解包后的值（computed 惰性缓存 → 引用稳定，watch 只在真正变化时同步）
<DirectionContext.Provider value={contextValue.value}>
// ❌ 传 computed 本体会类型报错（value 类型是值类型，不是 ComputedRef）
<DirectionContext.Provider value={contextValue}>
```

### 三种 Provider 组件形态

| 形态 | 写法 | 示例 |
|---|---|---|
| **无 DOM 的 Provider** | 无 rootRef / 无三形态 / 无 className-style；setup computed + 渲染期解构 children | DirectionProvider / CSPProvider |
| **有 DOM 根 + Provider 包裹** | 根 ref 显式挂载（案例 6）+ 三形态 + Provider 始终包裹 | ToolbarGroup / MeterRoot / Form |
| **有 DOM 根 + 自身也是 Provider 消费方** | 直接渲染元素（不套 CompositeRoot），三形态 | Toolbar 内的 ToggleGroup 分支 |

### 消费方 use() 形态：computed 包一层保持兼容

官方 `createContext.use()` 返回注入 ref；消费 hook 包 `computed` 保持 `.value` 读取形态不变，10+ 个调用方零改动：

```ts
export function useDirection() {
  const context = DirectionContext.use();           // setup 调用（依赖 useInjects）
  return computed(() => context.value?.direction ?? 'ltr');
}
```

### 默认值：undefined vs 完整对象

- 默认 `undefined`（missing 抛错）：`useMeterRootContext` 检查 `context.value === undefined` 抛 `'Base UI: ...Context is missing'`
- 完整默认值对象（无 Provider 时消费方仍可读）：FormContext 默认 `{ elementRef, formRef, errors, ... }`——直接传对象给 `createContext(defaultValue)`

**注意**：自封装 createContext 仍有 50+ 处使用（未重构家族的全部 context），不能删——逐个家族迁移时换掉。

---

## 案例 6：根 ref 形态 —— useRootElement / ref() / 手动 { current }

**覆盖**：案例 6/13/14 的 ref 相关内容合并于此。

### 选择规则（先问：根 VNode 是元素还是包裹组件？）

| 场景 | 用什么 | 修法 |
|---|---|---|
| **根是元素** | `useRootElement()`（自动绑定） | Toggle / useButton / useCompositeItem |
| **根是 Provider/Fragment/List 包裹**（实际元素在深层） | `ref()` + **显式模板 ref 挂到渲染元素** | CompositeRoot / ToolbarGroup / MeterRoot / Form |
| 组件自身元素 | `ref()`（value 形态） | 所有内部模板 ref |

```tsx
// Provider 包裹根：useRootElement 拿不到实际元素（subTree.el 是 Provider），恒 null
const rootRef = ref<HTMLElement | null>(null);
// 渲染期显式挂载：
<form ref={rootRef} {...merged} />
```

**排查法**：事件处理里给 rootRef 加日志，事件触发时若为 null → 根绑定失败。

### ⚠️ 模板 ref 只赋值 ref() 创建的 Ref——手动 { current } 对象取不到 DOM

**验证结论**（probe 用例实测）：`{ current: null }` 手动对象 → 模板 ref **不赋值**（probe 显示 'null'）；`ref()` → 正确绑定（probe 显示 'bound'）。

```tsx
// ❌ 手动 { current } 对象：actview 模板 ref 不认这个形态，取不到 DOM
const elementRef: RefObject<HTMLFormElement | null> = { current: null };
// ✅ ref()（value 形态）：模板 ref 原生支持，挂载后 elementRef.value = 元素
const elementRef = ref<HTMLFormElement | null>(null);
```

消费方读 ref 必须按 `.value`——旧写法读 `.current` 是错的（TS 报错 + 运行时 undefined，迁移时一并改）。

**但手动 { current } 对象手动赋值完全可行**（不是模板绑定）——注册类 ref 用 `watch` 同步（案例 7）。"别把手动对象当模板 ref 用"，不是"别用手动对象"。

**验证技巧**：probe 组件渲染期直读 `.value`（Ref 响应式追踪，模板 ref 赋值后自动重渲染）——注意 onMounted 里读可能仍是 null（模板 ref 赋值时机在异步 flush 之后），渲染期直读更可靠。

---

## 案例 7：watch 时序 —— 注册类 ref flush:sync + 卸载清理 onUnmounted

**覆盖**：案例 7/15 的 watch 相关内容合并于此。

### 注册类 ref 必须 flush: 'sync'

`useCompositeItem` 里 `useCompositeListItem` 返回的 `ref` 是**注册回调**，用 `watch` 桥接：

```tsx
// flush 'sync'：卸载时序是 beforeUnmount（useRootElement 置 null）→ scope.stop()
// → 微任务才跑；默认 flush（微任务）的 runJob 在 effect 停止后执行 → 回调被丢弃。
watch(
  rootRef,
  (node) => { ref(node as HTMLElement | null); },
  { immediate: true, flush: 'sync' },
);
```

### ⚠️ watch 的 onCleanup 在组件卸载时不调用——必须显式 onUnmounted

`useRegisteredLabelId` 原用 `watch(id, (_, __, onCleanup) => {...})` 的 onCleanup 做清理——**组件卸载时 onCleanup 不执行**（actview scope.stop 直接丢弃 watch 回调，即使 flush: 'sync'）→ Root 的 labelId 残留旧值。必须显式：

```ts
onUnmounted(() => {
  if (registeredLabelId.get(setLabelId) === id.value) {
    registeredLabelId.set(setLabelId, undefined);
    setLabelId(undefined);
  }
});
```

flush: 'sync' 保证**值变化**时同步，但**卸载清理**仍需 onUnmounted。

### 手动 { current } 同步（案例 6 的应用）

```tsx
const inputRef = ref<HTMLInputElement | null>(null);
watch(
  inputRef,
  (node) => {
    validation.inputRef.current = node;   // 手动同步到 { current } 对象
    if (node && !isControlled.value && componentProps.defaultValue !== undefined) {
      node.defaultValue = String(componentProps.defaultValue); // PD-01/19：setAttribute 不设 input.value
    }
  },
  { flush: 'sync', immediate: true },
);
```

---

## 案例 8：`defineComponent` 泛型组件 —— `as` 断言保留泛型签名

**文件**：`CompositeItem.tsx`、`CompositeRoot.tsx`、`ToggleGroup.tsx`、`Form.tsx`

`defineComponent(fn)` 的返回类型**丢失内层函数的泛型参数**——导出后的组件是非泛型类型，JSX 里 `<CompositeItem<A, B>>` 报"应有 0 个类型参数"（ts(2558)）。导出时 `as` 断言贴回泛型签名（像 React `forwardRef`）：

```tsx
export const CompositeItem = defineComponent(function <
  Metadata,
  State extends Record<string, any>,
>(componentProps: CompositeItem.Props<Metadata, State>) {
  // ...
}) as <Metadata, State extends Record<string, any>>(
  props: CompositeItem.Props<Metadata, State>,
) => any;

// 泛型组件（Form）：断言带泛型签名
}) as <FormValues extends Record<string, any> = Record<string, any>>(
  props: Form.Props<FormValues>,
) => any;
```

**若调用处能自动推断则可不写显式泛型**（`metadata`/`state` props 类型可推断时）。

---

## 案例 9：测试基建 —— await act / data-testid / setProps / 包装组件

**覆盖**：案例 9/15 的测试相关内容合并于此。

### actview 响应式更新是异步 flush——fireEvent 后必须 await act()

actview 的响应式更新是**异步 flush**（computed → Provider watch → 重渲染是微任务链），`fireEvent` 是同步 dispatch，事件后的状态变化还没落到 DOM。

```tsx
await act(() => {
  fireEvent.click(button1);
});
expect(button1).toHaveAttribute('aria-pressed', 'true');
```

| 场景 | 处理 |
|---|---|
| `render()` 后立即断言初始状态 | ✅ 同步（actviewRender 同步挂载） |
| `fireEvent` 交互后断言 | ⚠️ 必须 `await act(() => { fireEvent... })` |
| `setProps` 后断言 | ✅ `await result.setProps(...)`（内部已 nextTick） |
| **跨组件 watch 链**（子件注册 → Root 重渲染） | ⚠️ 需要额外 `await act(() => {})` flush |

### 查询：无 getByRole，用 data-testid + querySelector

`createRenderer` 的 result **没有** `getByRole`/`getAllByRole`（actview 测试无 screen）——用 `data-testid` + `document.querySelector('[data-testid="..."]')`。label 关联断言用 `getElementById`（`getByText` 会匹配到祖先元素）。

### ⚠️ setProps 语义：只合并不删除（对齐 React cloneElement）

```ts
// 修复前（错误）：删除未在 newProps 里的键 → setProps({ value: 60 }) 会删掉 renderFn
// 等未提供的键 → 函数 children 丢失 → render 函数永不调用（断言旧值）
const setProps = async (newProps) => {
  for (const key of Object.keys(state)) {
    if (!(key in newProps)) delete state[key];  // 元凶
  }
  Object.assign(state, newProps);
  await nextTick();
};

// 修复后：对齐 React cloneElement(element, newProps) 语义——浅合并，不删除
const setProps = async (newProps) => {
  Object.assign(state, newProps);
  await nextTick();
};
```

排查此 bug 时曾误判为 Provider watch/context 问题——链路全部正常，是函数 children 在源头丢了。

### 包装组件必须渲染期解构（PD-15）

测试包装组件同样受 PD-15 约束——setup 解构冻结快照，setProps 后收不到新值。直接 `{...props}` 展开代理也可以（引用稳定）：

```tsx
// ✅ 渲染期解构（defineComponent + return () =>）
const Wrapper = defineComponent(function (props: any) {
  return () => {
    const { renderFn, ...rootProps } = props;
    return <MeterRoot {...rootProps}><MeterValue>{renderFn}</MeterValue></MeterRoot>;
  };
});
```

### setup 错误断言：console.error 双参数日志

actview 的 setup 错误被框架捕获为 `console.error('[actview] 组件渲染错误:', Error{...})` **双参数**日志（不 rethrow），断言日志而非 rejects：

```tsx
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
try {
  await render(Component, {}); // 无必要 context 包裹
  expect(errorSpy).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      message: expect.stringContaining('Base UI: ...Context is missing...'),
    }),
  );
} finally {
  errorSpy.mockRestore();
}
```

---

## 案例 10：props 数组传函数 —— propsGetter 替换语义与例外

**覆盖**：案例 10/12/14 的 propsGetter 相关内容合并于此。

### 规则：props 数组里的函数是「替换语义」

`mergePropsN` 对数组项的处理：**对象** → `mutablyMergeInto`（右覆盖左合并）；**函数** → `resolvePropsGetter`（`fn(previousProps)` 的返回值**整体替换** merged，不自动合并）。

```ts
function mergeInto(merged, inputProps) {
  if (isPropsGetter(inputProps)) return resolvePropsGetter(inputProps, merged); // 替换！
  return mutablyMergeInto(merged, inputProps);                                  // 合并
}
```

**典型 bug**：`() => EMPTY_OBJECT` 传进数组 → merged 被整体替换成空对象，`data-testid` 等透传属性全丢（排查时 DOM 里 button/input 只剩 aria-disabled）。

### 判断规则

| props 数组里的函数 | 是否消费 previousProps | 处理 |
|---|---|---|
| `getButtonProps`（useButton 产物，`(externalProps?) => props`） | ✅ 消费 | **传函数，放数组最后**（externalProps 链 + disabled 拦截） |
| `getValidationProps`（`(disabled, props?) => props`） | ✅ 消费 | **传函数，放数组最后**（同 getButtonProps） |
| `() => EMPTY_OBJECT` / 不接收参数的 getter | ❌ 不消费 | 渲染期求值对象（否则替换冲掉一切） |

### ⚠️ getButtonProps 传函数放最后：disabled 拦截的关键差异

| 传法 | 用户 onClick 的 disabled 拦截 | 透传属性 |
|---|---|---|
| 函数（propsGetter，放最后） | ✅ **拦截**：`getButtonProps(previousProps)` 把 previous 当 externalProps，用户 onClick 进 `externalOnClick`，disabled 时内部 `return` 直接跳过 | ✅ `...otherExternalProps` 展开保留 |
| 对象（`getButtonProps()` 渲染期调用） | ❌ **不拦截**：用户 onClick 在事件链外层（mergeEventHandlers 的 ourHandler），disabled 时仍被调用 | ✅ |

**为什么放最后**：mergePropsN 从左到右合并，`mergeEventHandlers(our, their)` 里 **their（右侧）先执行**。getButtonProps 在最右 → 它的 onClick 第一个跑（disabled 拦截）→ 成功；放前面则用户 onClick 先跑，拦不住。

**类型**：`mergePropsN([...] as any)`——getButtonProps 事件签名（BaseUIEvent）与 JSX 事件类型不匹配（tsgo 基线同款错误），运行时兼容；数组内函数参数需显式标注（`(p: HTMLProps) => ...`）。

---

## 案例 11：DirectionProvider / CSPProvider —— 无 DOM 的 Provider 组件

**context 换官方见案例 5**。这里只讲组件形态：

Provider 组件不渲染自身元素，只包 children + 提供 context。defineComponent + setup computed + 渲染期解构 children：

```tsx
export const DirectionProvider = defineComponent(function (componentProps: DirectionProvider.Props) {
  // setup：context 值 computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo）
  const contextValue = computed<DirectionContext>(() => ({
    direction: componentProps.direction ?? 'ltr',
  }));

  return () => {
    const { children } = componentProps; // 渲染期解构
    return (
      <DirectionContext.Provider value={contextValue.value}>
        {children}
      </DirectionContext.Provider>
    );
  };
}) as (props: DirectionProvider.Props) => any;
```

要点：没有根元素 → 无 rootRef / 无 render 三形态 / 无 className-style 解析；`as` 断言贴回 Props 签名。

**测试**：probe 子组件读 context 验证传导 + setProps 响应式（案例 9 的 probe 技巧）。

---

## 案例 12：Button —— getButtonProps 传函数放最后（disabled 拦截）

**propsGetter 完整规则见案例 10**。这里记录 Button 特有的验证点：

- **data-* 属性**：`getStateAttributesProps(state)` 默认映射即可（`disabled: true` → `data-disabled=""`），无需 customMapping
- **ref**：不解构（留 elementProps 顺带绑定到根元素）——组件 ref 回调仍触发
- **render 三形态**：render 函数形态 `render({ ...merged, ...state })`；VNode 形态 `key` 显式透传；默认 `<button {...merged} />`
- **merged 顺序**：`[stateAttributes, elementProps, {className, style}, getButtonProps]`——getButtonProps 放最后（案例 10 规则）

---

## 案例 13：Form / Input —— 泛型 Provider 组件 + 薄委托

**ref 形态见案例 6，context 换官方见案例 5，泛型 as 见案例 8**。

### Form：泛型组件 + 根是 Provider 包裹 + 复杂 setup 状态

```tsx
export const Form = defineComponent(function <
  FormValues extends Record<string, any> = Record<string, any>,
>(componentProps: Form.Props<FormValues>) {
  // setup：注册表 Map / submittedRef / submitAttemptedRef / errors ref + watch /
  // validate / clearErrors / focusFirstInvalid / onMounted·onUnmounted(actionsRef)
  const onSubmit = (event: Event) => { /* setup 定义：闭包读 props 代理（事件时最新） */ };

  const contextValue = computed<FormContext>(() => ({ elementRef, formRef, /* ... */ }));

  return () => {
    const { render, className, style, /* 控制参数全解构排除 */ ...elementProps } = componentProps;
    const merged = mergePropsN([{ noValidate: true, onSubmit }, elementProps, { className, style }]);
    // 三形态 + Provider 包裹（value={contextValue.value} 传值）
  };
}) as <FormValues extends Record<string, any> = Record<string, any>>(
  props: Form.Props<FormValues>,
) => any;
```

要点：onSubmit setup 定义（闭包读代理最新）；elementRef = `ref()` + 渲染期 `<form ref={elementRef} {...merged} />`（案例 6）；`noValidate: true` 放 defaultProps（用户 `noValidate={false}` 经 elementProps 覆盖）。

### Input：薄委托组件的 defineComponent（JSX 透传，PD-17 作废）

```tsx
export const Input = defineComponent(function (componentProps: Input.Props) {
  return () => <FieldControl {...componentProps} />; // 直接 JSX 委托
}) as (props: Input.Props) => any;
```

`className`/`style` 的函数 union 类型（BaseUIComponentProps）合法，不存在 JSX 元素检查拒绝的问题，`createElement` workaround 不需要。

---

## 案例 14：FieldControl —— 复杂 setup 状态 + watch 注册类 ref + propsGetter 链

**ref 分工见案例 6/7，propsGetter 链见案例 10**。

### setup 保持的部分（一次性初始化）

context hooks（FieldRoot/Form/Labelable）+ `set*` 稳定函数 setup 解构 + computed（disabled/name/validityData/validationMode/id）+ `useControlled` + `useRegisterFieldControl` + `useIsoLayoutEffect` + `useValueChanged`。

### getControlProps setup 定义 + 渲染期调用

```tsx
const getControlProps = () => ({ id: id.value, disabled: disabled.value, /* 事件闭包读代理 */ });
// 渲染期：
const merged = mergePropsN([
  getControlProps(),                                     // 对象（渲染期调用）
  getStateAttributesProps(state, fieldValidityMapping),  // state → data-valid/data-invalid
  elementProps,
  (p: HTMLProps) => validation.getValidationProps(disabled.value, p), // propsGetter → 函数放最后（案例 10）
  { className: fn, style: fn },
] as any);
```

`getValidationProps(disabled, externalProps)` 消费 previous props（同 `getButtonProps`）→ **传函数放数组最后**（案例 10 规则）。

### 测试

Input 7/7、Field 12/12、NumberField 13/13 全过（FieldControl 重构后）；Form 测试（6 个）：novalidate 默认/关闭、onSubmit 冒泡、invalid 阻止提交（Field 集成）、onFormSubmit 值收集、actionsRef.validate。

---

## 案例 15：Meter 家族 —— 完整家族重构（Root + 4 子件 + context）

**context/ref/watch/测试基建见案例 5/6/7/9**。

标准"Root 提供 context + 子件消费"模型，6 文件全自包含（仅 actview-utils + valueToPercent）：

- **MeterRoot**：setup 派生计算（valueToPercent → clamp → formatNumber）+ contextValue computed + **根是 Provider 包裹 → rootRef 显式挂载**（案例 6）+ 渲染期解构 + `mergePropsN` + 三形态；defaultProps 里注入 children（visuallyHidden span）
- **子件**（Label/Value/Indicator/Track）：薄组件，setup 读 context + 渲染期解构 + 三形态；MeterValue 支持 **children 函数形态**（`typeof children === 'function' ? children(formattedValue, value)`）
- **useRegisteredLabelId 响应式改造**（setup 冻结修复）：idProp 改 `MaybeRef`（消费方传 computed）+ 返回 `Ref<string | undefined>`；卸载清理用 onUnmounted（案例 7）

```ts
const id = computed(() => unref(idProp) ?? fallbackId);  // fallbackId = useBaseUiId()（setup 一次）
watch(id, (_, __, onCleanup) => {...}, { immediate: true, flush: 'sync' });
```

### 测试要点

- 完整移植 React 原版 27 用例（conformance 跳过——actview 无此基建；computed style 用例 jsdom 下 skip）
- `[role="meter"]` + `data-testid` 查询；label 关联用 `getElementById`
- 跨组件 watch 链（子件注册 → Root 重渲染）需要 `await act(() => {})` flush（案例 9）

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

## 范式决策速查

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
| props 数组传函数？ | 对象=合并；函数=propsGetter **替换**——消费 previous（getButtonProps/getValidationProps）→ 传函数放最后；不消费 → 渲染期求值对象（案例 10） |
| 无 DOM 的 Provider 组件？ | defineComponent + setup computed + 渲染期解构 children + `value={contextValue.value}` 传值，无三形态（案例 11） |
| context 用自封装还是官方？ | 已重构家族用**框架官方 `createContext(defaultValue)`**；自封装只在未重构家族暂存，逐个迁移时换掉（案例 5） |
| watch 的 onCleanup？ | **组件卸载时不调用**（scope.stop 丢弃回调）——卸载清理必须显式 `onUnmounted`（案例 7） |
| setProps 语义？ | **只合并不删除**（对齐 React cloneElement）——旧的 delete 分支会删掉未提供键（函数 children 丢失）（案例 9） |
| 薄委托组件？ | defineComponent + 渲染期 **JSX 透传**子组件（函数 union 类型合法，createElement 不需要——PD-17 作废）（案例 13） |
| 测试包装组件？ | 必须渲染期解构（defineComponent + `return () =>`）或直接展开 props 代理——setup 解构冻结（案例 9） |
