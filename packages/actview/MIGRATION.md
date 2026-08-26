# React → ActView 迁移案例库

> 目标：`packages/react` → `packages/actview`（@actview/base-ui）
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
      // VNode 分支：按 React 契约**合并**（详见案例 3）
      const renderProps = render.props ?? {};
      const { className: renderClassName, style: renderStyle, ...restRenderProps } = renderProps;
      const Tag = render.type as any;
      return (
        <Tag
          key={render.key}
          {...merged}
          {...restRenderProps}
          className={mergeClassNames(renderClassName, merged.className)}
          style={mergeStyles(renderStyle, merged.style)}
          ref={rootRef}
        />
      );
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

### ActView 响应式 API 全貌：ref / reactive / props 代理

最近重构的组件只用 `ref()`——本地状态简单，`ref` 够用。但 ActView 还有 `reactive`：

- **`reactive(obj)`**：构建响应式对象。`reactiveObj = reactive(obj)`，**渲染中 `reactiveObj.key` 直接读属性值——不用 `.value`**，且仍具响应式特性（属性读取被 track，变化触发重渲染）
- **`ref()`**：`refObj.value` 读写（已大量使用）
- **props 本身就是 shallowReactive 代理**：渲染期 `componentProps.xxx` 直接读——这也是"解构放渲染期"能工作的底层原因（案例 1）

⚠️ 唯一注意点：**setup 阶段解构 reactive 对象必须用 `toRefs`**——`const { a, b } = reactiveObj` 解构出的是普通值快照（同 PD-15 语义，后续变化不反映）；`toRefs(reactiveObj)` 解构出的才是保持响应式的 ref 集合。

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

## 案例 3：VNode 透传 —— key 顶层显式透传 + className/style 合并（对齐 React 契约）

**位置**：`Separator.tsx` 的 render VNode 分支

### 问题 1：key 是顶层字段

VNode 的 `key` 存在 **`render.key` 顶层字段**（不在 `props` 里），`{...render.props}` 带不过去。列表场景下 key 丢失 → diff 错乱。

### 问题 2：className/style 必须合并，不能覆盖（React 契约）

React 的 `useRenderElement` 对 VNode 形态是**合并**语义：`mergeProps(组件props, render.props)` 里 className 走 `mergeClassNames`（**两者都保留**，render 元素 className 在前）、style 走 `mergeObjects`（浅合并，render 元素覆盖同名键）、其余键 render 元素优先。

❌ 错误写法（早期范式）：`{...render.props} {...merged}` —— merged 后展开会**覆盖** render 元素的 className/style，conformance 的 className 合并用例（`classList.contains` 两者断言）失败。

✅ 正确写法：从 `render.props` 里**提取** className/style，与 merged 的合并，其余 props 让 render 元素优先。

### 修复（VNode 透传完整覆盖）

| 字段 | 位置 | 透传方式 |
|---|---|---|
| `key` | `render.key`（顶层） | `key={render.key}` 显式传 |
| className/style | `render.props.className` / `.style` | **提取出来**，与 merged 的合并（`mergeClassNames` / `mergeStyles`，两者都保留） |
| 其余 props | `render.props`（除 className/style） | `{...merged}` 先展开、`{...restRenderProps}` 后展开——**render 元素优先** |
| `ref` | 内部模板 ref | `ref={rootRef}` **放最后**兜底（覆盖 VNode/merged 自带的 ref） |

```tsx
const renderProps = render.props ?? {};
const { className: renderClassName, style: renderStyle, ...restRenderProps } = renderProps;
const Tag = render.type as any;
return (
  <Tag
    key={render.key}
    {...merged}
    {...restRenderProps}
    className={mergeClassNames(renderClassName, merged.className)}
    style={mergeStyles(renderStyle, merged.style)}
    ref={rootRef}
  />
);
```

**注意**：函数形态（`typeof render === 'function'`）不自动合并——框架只把含已解析 className 的 props 对象交给用户函数，是否合并由用户的展开顺序决定（`{...props}` 透传保留组件 className；显式 className 覆盖）。

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

### ⚠️ watch 的 onCleanup 在组件卸载时不调用——三种卸载清理方案

**根因**（effectScope.ts:49-58）：`scope.stop()` 只做 `this.effects.forEach((e) => e.stop())`——调的是 `effect.stop()`，不是 watch 的 `stop()` 闭包（watch.ts:113-119，cleanup 只在闭包里执行）。实测：pre 和 sync 两种 flush 卸载时 onCleanup 都不调用。

`useRegisteredLabelId` 原用 `watch(id, (_, __, onCleanup) => {...})` 的 onCleanup 做清理——**组件卸载时 onCleanup 不执行** → Root 的 labelId 残留旧值（aria-labelledby 不清除）。三种方案：

```ts
// 方案 A（初版）：onUnmounted 显式清理 —— ✓ 正确但重复了清理逻辑
onUnmounted(() => {
  if (registeredLabelId.get(setLabelId) === id.value) {
    registeredLabelId.set(setLabelId, undefined);
    setLabelId(undefined);
  }
});

// 方案 B（推荐）：保存 watch 的 stop，卸载时调用 → 触发 onCleanup（复用同一份清理代码）
const stopW = watch(id, (v, _o, onCleanup) => {
  onCleanup(() => {
    registeredLabelId.set(setLabelId, undefined);   // 注销（值变化重跑时也执行）
    setLabelId(undefined);
  });
  registeredLabelId.set(setLabelId, v);            // 注册
});
onUnmounted(stopW);                                  // 卸载 → stop() → cleanup 执行 ✓

// 方案 C：onScopeDispose —— scope.stop() 时 cleanups 数组自动执行（卸载时机等价）
onScopeDispose(() => { registeredLabelId.set(setLabelId, undefined); setLabelId(undefined); });
```

**选型**：对"id 变化要注销旧 id、卸载要注销"的场景，方案 B 最优雅——onCleanup 天然处理"重跑前注销旧值"，`onUnmounted(stopW)` 补齐卸载路径，清理逻辑零重复。flush: 'sync' 保证**值变化**时同步注册/注销。

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

测试包装组件同样受 PD-15 约束——setup 解构冻结快照，setProps 后收不到新值。直接 `{...props}` 展开代理也可以——机制上**两者缺一不可**：props 代理引用稳定（`updateProps` 原地写不换代理，渲染期始终拿到最新值），而展开本身每次渲染产新对象（`_jsx` 编译的 `{...props}` 材料化）——**新对象 + 新值** → `isSameProps` 正常判变。若真的"引用稳定"（同一个对象反复传）反而会短路（判为 same，不重渲染）：

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
- **useRegisteredLabelId 响应式改造**（setup 冻结修复）：idProp 改 `MaybeRef`（消费方传 computed）+ 返回 `Ref<string | undefined>`；卸载清理用 `onUnmounted(stopW)`——保存 watch 的 stop，卸载时调用触发 onCleanup（案例 7 方案 B，清理零重复）

```ts
const id = computed(() => unref(idProp) ?? fallbackId);  // fallbackId = useBaseUiId()（setup 一次）
const stopW = watch(id, (_, __, onCleanup) => {...}, { immediate: true, flush: 'sync' });
onUnmounted(stopW);  // 卸载 → stop() → onCleanup 执行（注销）
```

### 测试要点

- 完整移植 React 原版 27 用例（conformance 跳过——actview 无此基建；computed style 用例 jsdom 下 skip）
- `[role="meter"]` + `data-testid` 查询；label 关联用 `getElementById`
- 跨组件 watch 链（子件注册 → Root 重渲染）需要 `await act(() => {})` flush（案例 9）

---

## 案例 16：Radio 家族 —— 事件语义对齐（onInput + click 修饰键）+ 官方 context 时序坑（PD-16）+ AD-24 htmlFor

**组件**：`RadioRoot.tsx`、`RadioGroup.tsx`、`RadioGroupContext.ts`

### 16.1 React onChange vs 原生事件：radio 激活用 onInput

React 对 radio 的 `onChange` 由 **click 委托**触发（`nativeEvent` 是 click，含修饰键）。actview 只有原生事件：

- 原生 **`change` 事件不继承 click 修饰键**（jsdom 探针验证 shiftKey undefined）——`eventDetails` 的修饰键（shift/ctrl/alt/meta）对不上 React 语义
- 原生 **`input` 事件**在 radio 激活时**先于 change 触发** → 用 `onInput` 承接"值变化"

```tsx
// setup 作用域：记录 input 上的 click（React 版 onChange 的 nativeEvent 是 click）
let lastInputClickEvent: MouseEvent | null = null;

// inputProps.onClick：记录 + stopPropagation
// onInput（原生 input 事件，radio 激活先于 change 触发）：
onInput(event: Event) {
  if (event.defaultPrevented) return;
  if (disabled || readOnly || value === undefined) return;
  const details = createChangeEventDetails(REASONS.none, lastInputClickEvent ?? event);
  groupContext.value?.setCheckedValue?.(value, details);
  if (details.isCanceled) return;
  fieldRootContext.value.setTouched(true);
}
```

**规则**：React 合成事件映射到 actview 时，先确认"React 合成事件由哪个原生事件委托触发"——click 委托的合成事件（onChange）要拆成原生 click/input 记录，而不是用同名原生事件（change）硬映射。

### 16.2 context 传播时序（PD-16）：事件回调里读 context 必须用 internals createContext

**症状**：Arrow 键导航的 radio 自动选中 3 用例失败——`[PROBE-PR] focus touched= false`（capture 已设 true）。

**根因**：actview **官方 createContext** 的 Provider 用 `watch(() => props.value, v => state.value = v)`（**pre flush 微任务**）同步——消费方读 `.value` 滞后一个微任务。**internals createContext**（`internals/createContext.tsx`）用 `computed(() => unref(props.value))` 包裹——消费方读 `.value` 时**同步重算**。

Arrow 键导航的 focus 在 `queueMicrotask` 触发（同步事件回调之后）——官方版 Provider watch 未跑 → 消费方读到旧 touched → 自动选中失败。

**规则**：**事件回调（onFocus/onClick 等同步执行）里读 context**，Provider 必须用 **internals createContext**（computed 同步）；纯渲染期读 context 官方版即可（渲染本来就在 flush 后）。

```ts
// RadioGroupContext 改用 internals 版（注释记录 PD-16）
export const RadioGroupContext = createContext('base-ui-radio-group-context', undefined);
```

### 16.3 AD-24：actview 不映射 htmlFor→for

actview renderer `setProp` 直接 `setAttribute('htmlFor', ...)` → DOM 无效属性。JSX/组件内必须写**原生属性名 `for`**：

```tsx
<label for="my-input">...</label>   // ✅ actview
<label htmlFor="my-input">...</label> // ❌ React 写法，jsdom label 激活转发与 input.labels 关联全断
```

测试转写 React 原版的 `htmlFor` 时必须改 `for`（AD-24 注释标记）——jsdom 的 label 激活转发（htmlFor 目标）依赖 `for` 属性。

---

## 案例 17：Field 子件去 useRenderElement 重构 —— FieldItem / FieldDescription / FieldError

**文件**：`field/item/FieldItem.tsx`、`field/description/FieldDescription.tsx`、`field/error/FieldError.tsx`

**背景**：用户裁决「不允许使用 useRenderElement 实现任何组件」——field 家族三子件（含过渡渲染的 FieldError）全部改 defineComponent + render closure + mergePropsN 三形态（案例 1 范式）。

### 17.1 FieldError 的过渡渲染：mounted 判断放 render 函数

useTransitionStatus 的 `mounted` 是响应式 ref——**setup 只跑一次，条件渲染必须在 render 函数里判断**：

```tsx
return () => {
  if (!mounted.value) {
    return null;   // 未挂载 → 不渲染（actview render 返回 null 合法）
  }
  // ...解构 props、stateAttributes、mergePropsN、三形态
};
```

useOpenChangeComplete 的 `ref` 参数兼容 `{ value }` 形态（useAnimationsFinished 读 current 或 value）——传 `useRootElement()` 返回的 rootRef 即可。

### 17.2 messageId 注册：rendered + id 依赖的 watch（immediate）

FieldError 的 aria-describedby 注册链（labelable messageIds）：

```tsx
watch(
  () => [rendered.value, id],
  (_nv, _ov, onCleanup) => {
    if (!rendered.value || !id) return;
    const current = labelableContext.value.messageIds;
    labelableContext.value.setMessageIds([...current, id]);
    onCleanup(() => { /* filter 掉 id */ });
  },
  { immediate: true },
);
```

FieldDescription 的 messageId 用 `onMounted` 注册 + `onUnmounted` 注销（id 是 setup 固定值，无 rendered 条件）。

### 17.3 mergePropsN 顺序：`{ id, children }` 放 elementProps 后

FieldError merged：`[stateAttributes, elementProps, { id, children: childrenProp ?? errorMessage.value }, { className, style }]`——`id`/`children` 覆盖 elementProps（解构已排除 id/children，实际不冲突）。**mergePropsN 对 `id` 走 default 分支直接赋值**（探针验证：对象/getter 两种形态都正确透传 id）——id 丢失排查方向不在 mergePropsN，而在渲染链下游（patch setProp）或查询层。

### 17.4 测试陷阱：description 查询用精确标签，别用 `querySelectorAll('div')`

**症状**：`aria-describedby toContain(null)`——error/description 渲染都正常（探针 outerHTML 有 id、aria-describedby 含两个 id）。

**根因**：`querySelectorAll('div').find(el => el.textContent === 'description')` **匹配到 Field.Item 的 div**——它的子元素只有 description 文本，textContent 也是 'description'，且**无 id**。真正的 Field.Description 是 `<p>`，不在 div 查询里 → `description.getAttribute('id')` 为 null → `toContain(null)` 失败。

```tsx
// ❌ 祖先 div 也匹配文本（actview getByText 前序 DFS 同样返回最外层）
const descriptions = document.querySelectorAll('div');
// ✅ 按默认标签精确查
const descriptions = document.querySelectorAll('p');
```

**规则**：文本查询优先**按目标元素的默认标签**（`p`/`div`/`legend`）限定，再用 textContent 过滤；或 `getAllByText(...)` 取最后一个（actview getByText 前序 DFS 返回最外层，会命中祖先）。

### 17.5 Form 验证链测试转写要点（radio 家族）

| React 原版 | actview 转写 |
|---|---|
| `renderFakeTimers` | 无此基建——普通 `render` + `act` + `fireEvent.click(submit)` |
| `user.click(Submit)` | `fireEvent.click(document.querySelector('button[type="submit"]'))` |
| `getByRole('radio')` | `document.querySelector('[role="radio"]')`（根元素是 span，非 input） |
| `validationMode="onChange"`（revalidates 用例） | 必须显式传——默认 onSubmit 时 `shouldValidateOnChange()` false → change 不重验 |
| required 约束 | `RadioGroup name="group" required` + `Field.Error match="valueMissing"`（FieldError 已支持 match prop，rendered 判定 `validityData.state[match]`） |
| 卸载语义 | React 版「RadioGroup 保留、仅 Radio.Root 卸载」——Field 仍在表单注册表 → validate 重跑 → 阻止提交；转写不能把整个 RadioGroup 卸载 |

### 17.6 验证结果

- Field.test 25/25（重构无回归）
- RadioRoot 11/11、RadioGroup 62/62（含 2 个重写后的 Form 用例）

---

## 案例 18：测试渲染计数 —— `onUpdated` 生命周期钩子 + 计数 ref 不参与 render 读取

**文件**：`packages/actview/src/field/control/FieldControl.test.tsx`

**背景**：React 原版测试用 `renderCountRef = { current: 0 }` 在 render prop 里计数，验证非受控 input 的值变化不会导致组件重渲染。移植到 actview 时遇到两个错误写法。

### 错误写法 1：`{ current: 0 }` 手动对象

```tsx
// ❌ 手动对象不是响应式，语义不对，碰巧通过
const renderCountRef = { current: 0 };

function Demo() {
  return () => {
    renderCountRef.current++;  // 渲染函数内 ++
    return <FieldControl />;
  };
}
```

**为什么碰巧过**：`{ current: 0 }` 不是响应式数据，改它不触发重渲染。非受控 input 的 DOM 值变化本来就不触发 actview 重渲染，所以计数不乱。但语义完全错误——手动对象不是 actview 管理状态的方式。

### 错误写法 2：`ref(0)` 在 render 函数内 `++`

```tsx
// ❌ 响应式 ref 在 render 函数内 ++ → 改值触发重渲染 → 无限循环
const renderCountRef = ref(0);

function Demo() {
  return () => {
    renderCountRef.value++;  // 渲染函数读并改 ref
    // render 函数读了 renderCountRef.value →
    // 变化触发重渲染 → 又执行 ++ → 无限循环
    return <FieldControl />;
  };
}
```

**为什么无限循环**：actview 的响应式系统在 render 函数（`return () => {...}` 内部）读取的 ref 变化时会触发重新渲染。`renderCountRef.value++` 既读又改 → 改完触发重渲染 → 重渲染又读又改 → 死循环。

### 正确写法：`onUpdated` 生命周期钩子

```tsx
// ✅ onUpdated 在 setup 注册，DOM 更新后执行，计数 ref 不参与 render 读取
const renderCountRef = ref(0);

function Demo() {
  onUpdated(() => {
    renderCountRef.value++;  // setup 注册，渲染后触发
  });
  // render 函数不读 renderCountRef.value → 变化不触发重渲染
  return (
    <FieldRoot>
      <FieldControl data-testid="control" />
    </FieldRoot>
  );
}
```

### 原理

修改响应式数据**一定**触发组件重新渲染，不管在哪儿改。关键区别在于**修改的时机**：

| 位置 | 行为 | 结果 |
|---|---|---|
| **render 函数内**（`return () => {...}` 内部） | render 执行 → 改 ref → 触发重渲染 → render 又执行 → 又改 ref | **同步死循环**（渲染没结束又触发新一轮渲染） |
| **`onUpdated` 回调内**（setup 注册，渲染后触发） | render 已提交 DOM → `onUpdated` 触发 → 改 ref → `queueJob` 入队 → 下一轮微任务 render → `onUpdated` 再触发 → 再改 ref | **新的一轮异步队列**，`queueJob` 去重，不会无限循环 |

```tsx
// ❌ render 函数内改 ref → 同步死循环
function Demo() {
  return () => {
    renderCountRef.value++;  // 改 → 触发重渲染 → 又执行到这行 → 死循环
    return <FieldControl />;
  };
}

// ✅ onUpdated 里改 ref → 新的一轮异步队列，不会无限循环
function Demo() {
  onUpdated(() => {
    renderCountRef.value++;  // render 已提交后才改，不影响当前渲染
  });
  return () => {
    // render 函数不读 renderCountRef → 但即使读了也不死循环
    // 因为 onUpdated 是下一轮，不是同一轮
    return <FieldControl />;
  };
}
```

**关键区别**：render 函数是同步执行链的一部分，改数据 → 立即触发重渲染 → 当前执行还没结束又从头开始 → 死循环。`onUpdated` 是生命周期钩子，执行在 render 提交之后，它触发的重渲染由 `queueJob` 调度到下一轮微任务——即使 `onUpdated` 里改的 ref 被 render 读取，也只是正常的新一轮渲染，不会无限循环。

> ⚠️ 但测试中 `onUpdated` 里改的 `renderCountRef` 确实**没有被 render 函数读取**，所以即使 `onUpdated` 触发了重渲染，render 输出不变，DOM 不更新，`onUpdated` 在下一轮仍然会触发（因为组件确实重渲染了），计数仍然 +1。但 `onUpdated` 里改 ref 触发重渲染 → 重渲染触发 `onUpdated` → 再改 ref → 再触发重渲染... 这个链理论上会无限继续。**实际不会**，因为 `queueJob` 会去重：同一 effect 在微任务队列中只保留一个，如果 `onUpdated` 修改 ref 时没有其他原因触发重渲染，`onUpdated` 触发的新一轮渲染完成后，`onUpdated` 再次触发并再次修改 ref → 再次入队，但由于没有其他数据变化，渲染输出不变，`patch` 短路，`onUpdated` 仍会触发。这是微任务循环，不是死循环，测试中**有限次数的 fireEvent 互动后断言计数**，不会无限跑下去。

### 测试用例对照

```tsx
// 非受控 input：值变化不应触发重渲染
it('avoids rerendering for uncontrolled input changes', async () => {
  const renderCountRef = ref(0);
  function Demo() {
    onUpdated(() => { renderCountRef.value++; });
    return (
      <FieldRoot>
        <FieldControl data-testid="control" />
      </FieldRoot>
    );
  }
  const result = await render(Demo, {});
  const control = result.getByTestId('control') as HTMLInputElement;
  const initial = renderCountRef.value;

  fireEvent.input(control, { target: { value: 'a' } });
  await act(() => {});
  const afterFirst = renderCountRef.value;  // 与 initial 相同 → 不重渲染

  expect(afterFirst).toBeLessThanOrEqual(initial + 1);
});

// 受控 input：每次值变化都应触发重渲染
it('renders once per keystroke for controlled input changes', async () => {
  const renderCountRef = ref(0);
  function Demo() {
    const value = ref('');
    onUpdated(() => { renderCountRef.value++; });
    return (
      <FieldRoot>
        <FieldControl
          value={value.value}
          onValueChange={(v) => { value.value = v; }}
        />
      </FieldRoot>
    );
  }
  // 两次 fireEvent → settledRenderCount + 2
});
```

### 18.1 测试组件中的 `ref()` 状态管理

受控值测试用 `ref()` + Babel 自动转换：

```tsx
function Demo() {
  const value = ref('');         // setup：ref 创建一次
  return (
    <FieldControl
      value={value.value}        // Babel 自动包裹为 return () => {...}
      onValueChange={(v) => { value.value = v; }}
    />
  );
}
```

`ref('')` 在 setup 创建，`value.value` 在 render 读取 → 变化触发重渲染。`onValueChange` 回调里 `value.value = v` 写 ref → 触发重渲染 → 新值传入 FieldControl。

> ⚠️ 不要手动写 `return () => { return JSX; }` —— Babel 插件会自动将函数声明返回 JSX 转换为 `defineComponent`，内部的 JSX 部分会被自动包装为 `return () => JSX`。手动写双层 `return () =>` 会导致 Babel 二次包装，产生不符合规范的组件（案例 19）。

---

## 案例 19：测试组件正确写法 —— 函数声明直接返回 JSX，Babel 自动转换

**不要手动写 `return () => { return JSX; }`**

### 错误写法

```tsx
// ❌ Babel 插件会二次包装，产生不符合规范的组件
function Demo() {
  const showB = ref(false);
  return () => {
    return (
      <>
        <FieldRoot>
          <FieldLabel data-testid="label">Label</FieldLabel>
          {showB.value ? <FieldControl key="b" id="control-b" /> : <FieldControl key="a" id="control-a" />}
        </FieldRoot>
        <button onClick={() => { showB.value = true; }}>Toggle</button>
      </>
    );
  };
}
```

### 正确写法

```tsx
// ✅ 函数声明直接返回 JSX，Babel 自动转换为 defineComponent
function Demo() {
  const showB = ref(false);   // setup：一次性初始化
  return (                    // Babel 自动包装为 return () => { return (...); }
    <>
      <FieldRoot>
        <FieldLabel data-testid="label">Label</FieldLabel>
        {showB.value ? <FieldControl key="b" id="control-b" /> : <FieldControl key="a" id="control-a" />}
      </FieldRoot>
      <button onClick={() => { showB.value = true; }}>Toggle</button>
    </>
  );
}
```

### 原理

actview 的 Babel 插件将**函数声明**（`function X() {}`）中返回 JSX 的部分自动转换为 `defineComponent` 的 `return () => {...}` 渲染函数：

```js
// 源码（tsx）
function Demo() {
  const showB = ref(false);
  return <div>{showB.value}</div>;
}

// Babel 转换后（js）
const Demo = defineComponent(function Demo() {
  const showB = ref(false);        // → setup（只执行一次）
  return () => <div>{showB.value}</div>;  // → render（每次渲染执行）
});
```

所以：
- **函数体最外层** = setup（只执行一次）—— `ref()` 等初始化放这里
- **JSX 返回部分** = Babel 自动包装为 `return () => JSX`（每次渲染执行）

手动写 `return () => { return JSX; }` 会导致 Babel 二次包装，函数体变成 setup，但内部的 `return () => {...}` 又包了一层渲染函数，造成组件结构异常。

### 区分：测试组件 vs 源码组件

| 场景 | 写法 | Babel 处理 |
|---|---|---|
| **测试组件**（`*.test.tsx`） | `function Demo() { setup; return JSX; }` | 自动转换为 `defineComponent` + `return () => JSX` |
| **源码组件**（`packages/actview/src/`） | `export const Xxx = defineComponent(function(props) { setup; return () => { ... }; })` | 手动写 `defineComponent` 和 `return () => {...}`，Babel 不额外转换 |

> 源码组件用 `defineComponent(...)` 显式包裹，`return () => {...}` 是手动写的渲染函数，Babel 不会二次包装。测试组件用函数声明，依赖 Babel 自动转换。

### 测试文件中正确的写法对照

```tsx
// ✅ 静态组件（无状态变化）
function StaticDemo() {
  return (
    <FieldRoot>
      <FieldControl data-testid="control" />
    </FieldRoot>
  );
}

// ✅ 有状态组件的受控值
function ControlledDemo() {
  const value = ref('');
  return (
    <FieldControl
      value={value.value}
      onValueChange={(v) => { value.value = v; }}
    />
  );
}

// ✅ 有状态组件的条件渲染 + 事件
function ToggleDemo() {
  const showB = ref(false);
  return (
    <>
      <FieldRoot>
        <FieldLabel>Label</FieldLabel>
        {showB.value ? <FieldControl id="b" /> : <FieldControl id="a" />}
      </FieldRoot>
      <button onClick={() => { showB.value = true; }}>Toggle</button>
    </>
  );
}
```

### 函数表达式（`const f = function() {}`）不被 Babel 转换

```tsx
// ❌ 函数表达式不会被 Babel 转换——不是 defineComponent，JSX 会报错
const renderFieldItem = function(merged: any) {
  return <div {...merged} data-testid="item" />;
};

// ✅ 正确：仅当目标组件期望 render prop 是函数（非 defineComponent 对象）时
// 函数表达式 + JSX 不会被 Babel 转换 → typeof 始终是 'function' → render prop 正常
const renderFieldItem = function(merged: any) {
  return <div {...merged} data-testid="item" />;
};
```

**规则**：
- 测试中的**组件**（`function Demo()`）→ 函数声明 → Babel 自动转换 → 直接返回 JSX
- 测试中的**render prop 函数**（`const renderFn = function()`）→ 函数表达式 → Babel 不转换 → 保留函数形态

## 案例总结：源码组件定义范式清单（后续组件照此实现）

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
    // 5. render 三形态：函数（单对象）/ VNode（key 显式 + className/style 合并 + ref 兜底）/ 默认 JSX
    if (render) {
      if (typeof render === 'function') return render({ ...merged, ...state, ref: rootRef });
      // VNode 分支：className/style 提取后与 merged 合并（两者都保留），
      // 其余 props render 元素优先，ref 兜底放最后（案例 3）
      const renderProps = render.props ?? {};
      const { className: renderClassName, style: renderStyle, ...restRenderProps } = renderProps;
      const Tag = render.type as any;
      return (
        <Tag
          key={render.key}
          {...merged}
          {...restRenderProps}
          className={mergeClassNames(renderClassName, merged.className)}
          style={mergeStyles(renderStyle, merged.style)}
          ref={rootRef}
        />
      );
    }
    return <div ref={rootRef} {...merged} />;
  };
});
```

## 范式决策速查

| 问题 | 答案 |
|---|---|
| 组件怎么写？ | 源码 `defineComponent(fn)` + setup 初始化 + `return () => {...}` 渲染函数（案例 1）；测试组件 `function Demo() { setup; return JSX; }` Babel 自动转换（案例 19） |
| render prop 类型？ | 单对象 `(props: RenderFunctionProps & State & { ref? }) => VNode`（案例 2） |
| VNode 透传？ | `key={render.key}` 显式；className/style **提取后与 merged 合并**（两者都保留，对齐 React）；其余 props render 元素优先；ref 兜底放最后（案例 3） |
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
| watch 的 onCleanup？ | **组件卸载时不调用**（scope.stop 丢弃回调）——保存 watch 的 stop，`onUnmounted(stopW)` 触发 onCleanup，清理零重复（案例 7 方案 B） |
| setProps 语义？ | **只合并不删除**（对齐 React cloneElement）——旧的 delete 分支会删掉未提供键（函数 children 丢失）（案例 9） |
| 薄委托组件？ | defineComponent + 渲染期 **JSX 透传**子组件（函数 union 类型合法，createElement 不需要——PD-17 作废）（案例 13） |
| 测试包装组件？ | 必须渲染期解构（defineComponent + `return () =>`）或直接展开 props 代理——setup 解构冻结（案例 9） |
| 本地状态？ | `ref()`（`.value` 读写）；复杂对象用 `reactive(obj)` 属性直读（`.key` 不用 `.value`，仍响应式）；**setup 解构 reactive 必须 `toRefs`**（案例 1） |
| React 合成 onChange？ | 确认委托的原生事件——click 委托（radio onChange）拆成原生 `onInput` + click 记录，不硬映射同名 `change`（案例 16.1） |
| 事件回调里读 context？ | Provider 必须用 **internals createContext**（computed 同步）；官方版 Provider watch 是 pre flush 微任务，同步事件回调读滞后（案例 16.2） |
| htmlFor？ | actview 不映射 htmlFor→for——JSX/测试一律写原生 `for`（AD-24）（案例 16.3） |
| 条件渲染（mounted 等 ref 判断）？ | 判断放 render 函数里（setup 只跑一次），`return null` 合法（案例 17.1） |
| 文本查询？ | 按默认标签精确查（`querySelectorAll('p')`）或用 getAllByText 取最后一个——`div` 查询/前序 DFS 会命中祖先（案例 17.4） |
| 测试渲染计数？ | `onUpdated` 在 setup 注册，计数 ref 在渲染后修改，不阻塞当前渲染；render 函数内改 ref 会同步死循环（案例 18） |
| 测试组件怎么写？ | `function Demo() { setup; return JSX; }` 函数声明，Babel 自动转换（案例 19） |
| 测试 render prop 函数？ | `const renderFn = function() { return JSX; }` 函数表达式，Babel 不转换，保留函数形态（案例 19） |
| 源码组件 vs 测试组件？ | 源码：`defineComponent(fn)` + `return () => {...}`；测试：`function Demo() { setup; return JSX; }`（案例 19） |

