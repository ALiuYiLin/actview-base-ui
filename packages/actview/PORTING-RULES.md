# ActView 移植规则（内部规范 — 所有迁移子任务必读）

> 目标目录 `packages/actview/src`；源参考 `packages/react/src`（**只读**，不要改）。
> 框架事实与坑见 `MIGRATION-DESIGN.md` 第 0/3.5 节。本文是执行层面的强制规则。

## 1. 组件形态（babel 转换硬约束 R1–R6）

- 组件必须**首字母大写**的函数（`function XxxRoot(props) {...}`，箭头亦可），且**以 `return <JSX/>` 收尾**。`export const XxxRoot = forwardRef(...)` 直接改成普通函数组件，`forwardedRef` 参数改为从 `props.ref` 读取。
- 函数体（setup）只执行一次。**禁止** setup 层：解构 props（用 `props.x` 在 getter/JSX 内读，或 `useProp`）、构造依赖响应式值的 props 对象、动态条件早退 `if (state) return null`（改成 JSX 内三元）、定义依赖响应式值的派生常量。
- 每次更新要重算的逻辑 → ① `computed`，② JSX 表达式，③ 被 JSX 调用的函数（getter：`getRootProps()` 风格）。
- `return <JSX/>` 是唯一合法收尾；条件渲染写 `return cond ? <A/> : <B/>`。
- 事件处理器是普通闭包（天然稳定引用），**不要** useCallback/useStableCallback 包装——直接函数。

## 2. React API → ActView 映射

| React | ActView（import from 'actview'；类型 from '@actview/core'） |
|---|---|
| useState / useReducer | `ref` / `shallowRef` / `reactive`，读写 `.value` |
| useSyncExternalStore(store, sel) | `store.use(sel)`（@base-ui/actview-utils/store 的 Store/ActviewStore）→ 返回 `Ref` |
| useMemo | `computed(() => ...)` |
| useEffect / useLayoutEffect | `watch(src, (nv, ov, onCleanup) => {...}, {immediate})` / `onMounted`+`onUnmounted` / @base-ui/actview-utils 的 useIsoLayoutEffect |
| useRef | 闭包 `let el: HTMLElement \| null = null`（DOM 模板引用 `ref={(n) => (el = n)}`）；值 ref 用 `ref()` |
| useContext | 见第 4 节 createContext |
| forwardRef | 删除；`props.ref` 透传 |
| React.Fragment | `<>...</>` |
| createPortal | `<Teleport to={...}>`（见第 6 节） |
| cloneElement | `src/internals/useRenderElement.tsx` 里的 `cloneVNode`，或 @actview/jsx 的 `createElement(vnode.type, {...vnode.props, ...props})` |
| useId | `useBaseUiId(idProp)`（已移植，@base-ui/actview-utils/useId） |
| useEventCallback | 普通闭包 |
| React.useEffect 依赖数组 | watch 的 source（ref/数组/getter） |

## 3. 渲染范式（useRenderElement 已移植）

`src/internals/useRenderElement.tsx` 的 ActView 版**返回 getter 函数**：

```tsx
const getRoot = useRenderElement('span', props, {
  state,                       // 可为 computed；内部 unref
  ref: [props.ref, internalRef],
  props: [rootProps, elementProps, getButtonProps, (p) => ...],
  stateAttributesMapping,
});
return (
  <SwitchRootContext.Provider value={state}>
    {getRoot()}
    <input {...inputProps} />
  </SwitchRootContext.Provider>
);
```

- 原来 `const element = useRenderElement(...)` 放进 JSX 的位置 → `{getRoot()}`。
- 原来顶层构造的 `rootProps`/`inputProps` 对象 → 改 `getRootProps()`/`getInputProps()` 函数（读 ref/props），JSX 里 `{...getRootProps()}`；`state` 用 `computed`。

## 4. Context 模式（已提供 `src/internals/createContext.ts`）

```tsx
export const XxxContext = createContext<XxxContextValue | undefined>('base-ui-xxx-context', undefined);

export function useXxxContext(optional = true) {
  const value = XxxContext.use();          // ComputedRef
  // 可选性检查：value.value === undefined && !optional → throw（保留原错误文案）
  return value;                             // 消费方在 getter/JSX 内读 value.value.xxx
}
```

- JSX 中 `<XxxContext.Provider value={state}>` → `<XxxContext.Provider value={computed(() => state)}>`（Provider 已接受 value 为 ref/computed/普通值，内部 computed 包装）。
- 消费组件：`const ctx = useXxxContext();` 后在 getter/JSX 里读 `ctx.value.xxx`（**不要**在 setup 里解构 ctx.value）。
- key 用唯一字符串（provide 只接受 string）。
- 事件型 context 值（setTouched 等 setState 函数）→ 直接提供普通函数（闭包），消费方直接调用，不需要 `.value`。

## 5. props 访问

- getter/JSX 内直接读 `props.x`（props 是 shallowReactive 代理，读会被追踪、父更新自动重渲染）。
- setup 层需要默认值：`props.x ?? default` 写在 getter 内，或 `useProp(props, 'x', (v) => v ?? default)`（返回 ComputedRef）。
- **rest props 也必须活读取**：`{...elementProps}` 透传场景写 `getElementProps()` 函数，函数内 `const { render, className, style, ...elementProps } = props`（**连同组件专属 props 一起解构排除**，与 react 版顶层解构清单一致），JSX 里 `{...getElementProps()}`。
- `useControlled`（@base-ui/actview-utils）返回带 `setValueIfUncontrolled` 的 ComputedRef：`checked.value` 读、`checked.setValueIfUncontrolled(v)` 写。

## 6. 弹层相关

- Portal → `<Teleport to={container ?? 'body'}>`（container 是 ref 或 props 值；条件渲染在 Teleport 外面三元）。若 Teleport 的 to 需要响应式，用 `() => ...` 形式的 to（框架支持 to 为函数时每次渲染求值——若不支持则用固定字符串 + watch 手动 append，测试阶段验证）。
- `useTransitionStatus`（已移植）返回 `{ mounted, setMounted, transitionStatus }` 全为 Ref——读 `.value`。
- 定位：`@floating-ui/react-dom` 禁用；用 `@floating-ui/dom` 的 `computePosition`/`autoUpdate` + watch 重写（见 useAnchorPositioning 移植）。

## 7. 事件与 DOM

- 事件是**原生 DOM 事件**（无合成包装）：删除 `event.nativeEvent` 用法（改传 event 本身）；`React.MouseEvent` → `MouseEvent`。
- **`onChange` = 原生 change 事件**：受控文本框用 `onInput`。
- `class`/`className` 都可，统一输出 `class`（公共 props 名保留 `className`）。
- style：字符串或对象（`Record<string, string|number>`）。
- ref 对象：框架写 `.value`；Base UI 公共 API 的 ref（如 inputRef）兼容 `{current}`（内部 useMergedRefs 归一）。
- `suppressHydrationWarning`/`'use client'` 指令：删除。
- `React.CSSProperties` → `StyleValue`（src/internals/types 导出）。

## 8. 类型

- `React.ReactNode` → `VNodeChild`（@actview/jsx）；`React.ReactElement` → `VNode`。
- `React.Ref<T>` → `RefValue<T>`（src/types 导出：函数或 {current}|{value} 对象）。
- `React.ComponentPropsWithRef<'span'>` → `JSX.IntrinsicElements['span']`。
- `React.ComponentProps<typeof X>` → `PropsOf<typeof X>`（@actview/jsx 导出 PropsOf/ComponentType）。
- `React.Dispatch<SetStateAction<T>>` → `(value: T) => void`。
- import type { Ref, ComputedRef } 一律 from '@actview/core'（'actview' 不导出这些类型）。
- import { ref, computed, watch, unref, ... } from 'actview'。

## 9. 文件组织

- 目录/文件名与 react/src 一一对应（含 index.ts 导出清单）。
- `import ... from '@base-ui/utils/x'` → `@base-ui/actview-utils/x`。
- 错误/警告文案、JSDoc、导出名保持与 React 版一致。
- 不写测试（Phase 7 统一移植）；文件内不要 import react。
- **含 JSX 的文件必须 `.tsx` 后缀**（actview 插件只转 .tsx/.js；vite oxc 对 `.ts` 不启用 JSX）。
- **JSX 标签不支持成员表达式**（`<A.b />` 被 oxc 解析器拒绝）；动态组件用框架内置 `<component is={Comp} />`（is 在 render 内求值，天然响应）。
- 每个文件完成后跑 `npx tsgo -b tsconfig.json --force`（在 E:\code3\base-ui\packages\actview 下），修复到 0 错误。
