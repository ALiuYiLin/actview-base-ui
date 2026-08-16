# Base UI React → ActView 重构设计方案

> 目标：将 `packages/react`（1149 个源文件、约 20.7 万行、41 个公共入口）整体重构为 ActView 框架实现，输出到 `packages/actview`（npm 名 `@base-ui/actview`）；同时将 `packages/utils` 重构为 `packages/actview-utils`（`@base-ui/actview-utils`）。
> 依据：`E:\code3\actview\docs\react-migration.md`（迁移指南，本方案不深究框架实现，以其为 API 事实来源）。

---

## 0. 事实基线

| 项目 | 事实 |
|---|---|
| actview 框架 | `E:\code3\actview`，包：`actview`（聚合入口，re-export `@actview/core`）、`@actview/core`（零依赖核心）、`@actview/jsx`（jsx-runtime + VNode 类型体系）、`@actview/testing`（render/fireEvent/waitFor/screen）、`@actview/router`；插件：`plugin-babel` / `plugin-vite` / `plugin-scoped` |
| base-ui 现状 | `packages/actview` 与 `packages/actview-utils` 均为**空目录**（占位）；pnpm workspace 已含 `packages/*` |
| 迁移文档核心 | 组件函数体只执行一次（setup），JSX 包成 render 函数每次更新执行；状态 `ref`/`reactive`；派生 `computed`；副作用 `watch`/`onMounted`/`onUnmounted`；依赖注入 `provide`/`useInjects`；portal → `Teleport`；函数子组件 = 作用域插槽；列表必须 `key`；`reactive` 不可整体重赋值；事件命名与 React 一致 |

### 0.1 已实测验证的运行时事实（Phase 0 冒烟测试 + 渲染器源码核查）

- 组件定义：babel 插件把首字母大写函数组件包成 `defineComponent(fn, name)` → `{ __setup, name }`；`__setup(props)` 返回 render 函数；**setup 在 `pauseTracking` 下执行一次**（setup 内读响应式不收集依赖）；render 函数在组件 effect 中运行，读到的 ref/computed/props 自动追踪。
- props：`shallowReactive` 代理，父组件 `updateProps` 原地增量写入（含删除不再传的键）；render 内读 `props.x` 可追踪，父更新自动重渲染。**setup 层解构 props 仍会冻结**。
- 事件：`onClick`→`click`、`onClickCapture`→capture、原生 DOM 事件无合成包装；**`onChange` = 原生 `change` 事件**（受控文本框必须用 `onInput`）。
- DOM props：`class`/`className` 都映射 `el.className`；`style` 支持字符串或对象；`value/checked/disabled/readonly` 走 property；`dangerouslySetInnerHTML` 支持；布尔 true → `setAttribute('','')`，null/false 移除。
- ref：DOM 模板引用支持**函数 ref** 与 **`{ value }` 对象 ref**（`applyRef` 给对象写 `.value`，**不是 `.current`**）；组件 ref 指向组件实例。
- 生命周期：`onMounted` 在首次渲染后同步触发（子先父后）；watch 回调第三个参数是 `onCleanup`；`nextTick` 存在。
- 测试（@actview/testing）：`render(组件)` **不接受 props**（内部 `createApp(component).mount('#id')`），传 props 需外层 Harness 组件；`getByText` 返回**最外层** textContent 包含匹配的元素（非 testing-library 的最深匹配），尽量用 `getByTestId`；`fireEvent(el, 'click')` 派发原生事件；`waitFor(cb)` 轮询。
- `@actview/core` 导出 `Ref`/`ComputedRef`/`WatchSource` 等类型；`actview` 聚合包只导出运行时 API + 少量类型（不含 Ref 类型，类型请从 `@actview/core` 导入）。
- 错误处理：render 抛错走 onErrorCaptured 链 → ErrorBoundary → console.error。

### 0.2 工程接线（已落地）

- `packages/actview`、`packages/actview-utils` 的 package.json 依赖：`actview`/`@actview/core`/`@actview/jsx`/`@actview/plugin-vite`/`@actview/testing` 用 `link:../../../actview/...` 协议（**pnpm 以包目录为基准解析相对路径**）；`@floating-ui/dom`、`@floating-ui/utils`、`reselect`、`clsx` 常规依赖。
- tsconfig：`"jsx": "react-jsx"` + `"jsxImportSource": "@actview/jsx"`；build/test 配置 `"module": "esnext"`、`"moduleResolution": "bundler"`、`"types": ["node"]`（build）/`["vitest/globals","@testing-library/jest-dom","node"]`（test）；**解决方案级 tsconfig.json 必须加 `"files": []`**（否则 tsgo 会以 base 的 nodenext 选项编译全目录并因 actview 包的扩展名省略 import 报错）。
- vitest：actview 包使用独立 `defineProject` 配置（不合并 sharedConfig），`plugins: [actviewPlugin()]`，自建 `test/setupVitest.ts`（actview-utils 的 error/useAnimationFrame 重置 + @actview/testing cleanup）。
- 根 `tsconfig.base.json` paths 已加 `@base-ui/actview`、`@base-ui/actview/*`、`@base-ui/actview-utils/*`。

## 1. 目标与验收标准

1. `packages/actview` 与 `@base-ui/react` 拥有**完全一致的入口清单**（`accordion` … `use-render`、`types`、`internals/*`）与组件/part/props/事件命名，公共 API 保持源码级兼容。
2. 两包源码中**零引用** `react` / `react-dom` / `use-sync-external-store` / `@floating-ui/react-dom`。
3. `pnpm --filter @base-ui/actview typescript`、`--filter @base-ui/actview-utils typescript` 通过；eslint 通过。
4. 测试移植到 `@actview/testing` + vitest jsdom，核心交互（switch/popover/dialog/menu/select/combobox/tabs 等）通过。
5. 文档网站（docs）与 e2e/回归测试**不在本次范围**（用户只要求 packages 重构）。

## 2. 工程接入（Phase 0）

- `packages/actview/package.json`：
  - name `@base-ui/actview`，exports 镜像 `@base-ui/react`（`"./accordion": "./src/accordion/index.ts"` 等）。
  - dependencies：`actview`、`@actview/core`、`@actview/jsx`（`link:` 协议指向 `E:\code3\actview\packages\*`，pnpm 对 link: 依赖不安装其依赖，靠 actview 仓库自身 node_modules 解析，单实例无重复包风险）；`@base-ui/actview-utils: workspace:*`；`@floating-ui/dom`。
  - devDependencies：`@actview/testing`、`@actview/plugin-vite`（link: 协议；vitest 必须用其 `actviewPlugin()` 做 defineComponent 转换）。
  - 移除：`@babel/runtime`、`@floating-ui/react-dom`、`@floating-ui/utils`、`use-sync-external-store`、react 全家桶。
- tsconfig：`"jsx": "react-jsx"`、`"jsxImportSource": "@actview/jsx"`（TS 自动生成 `@actview/jsx/jsx-runtime` 导入）。
- `packages/actview-utils` 同理（name `@base-ui/actview-utils`）。
- 冒烟：最小 actview 函数组件能通过 tsc 并在 jsdom 中由 `@actview/testing` 挂载、触发事件。

## 3. 分层与依赖顺序

```
Phase 1  @base-ui/actview-utils   （store + hooks 胶水层）
Phase 2  packages/actview/src/internals + merge-props + use-render
Phase 3  弹层共享设施（Portal/Backdrop/Positioner + 定位）
Phase 4  叶子组件（无 composite/弹层依赖）
Phase 5  表单/复合组件
Phase 6  弹层家族
Phase 7  测试移植 + 全量验证
```

### Phase 1 — actview-utils
- `store/Store.ts`：与框架无关，**原样保留**；`store/useStore.ts` 用订阅 + ref 同步重写（保持 `Object.is` 快照比较、跳过重复通知的 useSyncExternalStore 语义；selector 在订阅回调里求值，值变化才写 ref）。
- `useControlled`：改返回 `{ value: Ref<...>, setValue, setValueIfChanged }`（call site 从解构改为 `.value` 读取）。
- hooks 用 actview 原语重写：`useTimeout` / `useAnimationFrame` / `useInterval` / `useIdleCallback` / `useOnMount` / `useOnFirstRender` / `usePreviousValue` / `useRefWithInit` / `useValueAsRef` / `useMergedRefs`（归一函数 ref 与 `{value}` ref）/ `useForcedRerendering`（返回 `forceUpdate()`，内部计数器 ref）/ `useScrollLock` / `useEnhancedClickHandler` / `useIsoLayoutEffect`（映射 `onMounted`/`watch` post 模式）。
- `useStableCallback` → 恒等包装（actview 闭包天然稳定，保留签名兼容）。
- 删除 React 专用：`safeReact` / `reactVersion` / `getReactElementRef`。
- 纯工具原样保留：`mergeObjects` / `owner` / `shadowDom` / `generateId` / `clamp` / `areArraysEqual` / `formatErrorMessage` / `warn` / `inertValue` / `platform/*` 等。
- `visuallyHidden` 的 `React.CSSProperties` 换 actview 样式类型。

### Phase 2 — internals
- **Context 模式统一**：`createXxxContext(defaultValue)` 返回 `{ Provider, use }`；Provider 是函数组件（setup 中 `provide(key, props.value)`，`return <>{props.children}</>`）；`use()` = `useInjects(key) ?? defaultValue`。覆盖：csp-context、direction-context、field-root-context、field-register-control、form-context、labelable-provider 等全部 context。
- 基础 internal：`useBaseUiId`（generateId）、`useValueChanged`（watch）、`usePressAndHold`、`useTransitionStatus`、`useAnimationsFinished`、`useOpenChangeComplete`、`useAnchorPositioning`、constants / reasons / serializeValue / RequestQueue / TimeoutManager / temporal 三件套（date-fns / luxon adapter，与框架无关直接保留）。
- `merge-props`：改成框架无关的 props 对象合并（去 `React.ElementType` 类型依赖，泛型改基于 `ComponentType`）。
- `use-render`：返回可在 JSX（render 函数）内调用的渲染函数；内部状态全部 ref 化。
- `use-button`、`composite`（list/root/item，store + provide/inject 驱动）。
- 类型基建：`internals/types.ts` 的 `BaseUIComponentProps` 等改挂 actview `VNode` / `ComponentType` / `PropsOf`。

### Phase 3 — 弹层共享设施
- `Portal` / `InternalBackdrop` / `FocusGuard` / `FloatingPortalLite` → 基于 `Teleport`（`to={container ?? 'body'}`）。
- 定位：**放弃 `@floating-ui/react-dom`**，改 `@floating-ui/dom`（`computePosition` / `autoUpdate` / middleware）；重写 `usePositioner` / `useAnchorPositioning` / `popupStoreUtils` / `useAnchoredPopupScrollLock` / `usePopupAutoResize` / `usePopupViewport` / swipe-dismiss 等；popup 状态机（store 驱动）天然适配 ref 订阅模型。
- `stateAttributesMapping` / `dispatchClickWithModifiers` / `getElementAtPoint` 等纯 DOM 工具直接保留（去 React 类型）。

### Phase 4 — 叶子组件
`separator`、`button`、`input`、`switch`、`checkbox`、`checkbox-group`、`radio`、`radio-group`、`toggle`、`toggle-group`、`progress`、`meter`、`avatar`、`slider`、`collapsible`、`accordion`、`direction-provider`、`csp-provider`、`unstable-use-media-query`、`use-render`。

### Phase 5 — 表单/复合
`field`、`fieldset`、`form`、`otp-field`、`number-field`、`scroll-area`、`tabs`、`toolbar`。

### Phase 6 — 弹层家族
`tooltip`、`popover`、`dialog`、`alert-dialog`、`drawer`、`preview-card`、`menu`、`menubar`、`context-menu`、`select`、`combobox`、`autocomplete`、`toast`、`navigation-menu`。

### Phase 7 — 验证
- 移植 45 个测试文件到 `@actview/testing`（`render`/`fireEvent`/`waitFor`/`screen` 签名对齐 testing-library，成本可控）。
- 全量 tsgo + eslint；grep 断言无 react 引用。

## 3.5 框架编译硬约束（已核查 @actview/plugin-babel 转换器）

> 这些约束来自 actview 编译器的**实际行为**（`plugins/babel/src/babel-plugin.ts`），比迁移文档更严格，是所有移植代码必须遵守的底线：

- **R1（渲染表达式唯一）**：组件函数必须以 `return <JSX/>` 收尾（也接受 `cond ? <A/> : <B/>`、`cond && <A/>`、`return null` 结尾）。其余函数体代码是 setup，**只执行一次**。
- **R2（每帧重算必须进 render）**：任何依赖响应式值、需每次更新重算的逻辑（派生值、props 对象构造、条件渲染），只能放进 ① `computed`、② JSX 表达式 `{}`、③ 被 JSX 调用的函数（getter）。setup 层的 `const x = props.a + 1` 会永久冻结。
- **R3（props 对象构造器化）**：`const rootProps = {...}` 顶层构造 → 改为 `getRootProps()` 函数，JSX 中 `{...getRootProps()}` 每次更新重新求值。
- **R4（禁止 setup 层动态早退）**：`if (state) return null` 早退条件在 setup 时求值一次，永不刷新 → 动态条件渲染改为三元放进 JSX；仅 setup 期常量（如 `typeof document === 'undefined'`）可保留早退。
- **R5（props 只读活对象）**：setup 层禁止解构 props（闭包旧值）；在 getter/JSX 内读 `props.x` 或用 `useProp`/`useProps` 取 ComputedRef。
- **R6（事件/闭包天然稳定）**：普通闭包即稳定引用，无需 useCallback/useEventCallback。
- 编译产物自动注入 `import { defineComponent } from '@actview/core'` 与 `import { jsx as _jsx, Fragment as _Fragment } from '@actview/jsx/jsx-runtime'`；`Fragment` 用 `<>` 即可。
- 测试/构建必须经 `@actview/plugin-vite` 的 `actviewPlugin()`（内部走 babel 转换），运行时只认 `{ __setup }` VNode，裸函数组件会崩溃。

## 4. 关键 API 映射（内部迁移规范）

| React | ActView |
|---|---|
| `useState` / `useReducer` | `ref` / `reactive` |
| `useSyncExternalStore(store)` | `useStore` → 订阅同步 `ref` |
| `useMemo` | `computed` |
| `useEffect` / `useLayoutEffect` | `watch` / `onMounted` / `onUnmounted` |
| `useRef` | 闭包变量 / `ref`；DOM 用模板引用（`ref={(n) => (el = n)}`） |
| `useContext` | `provide` / `useInjects`（Context.Provider 组件封装） |
| `forwardRef` | 无需转发：组件直接读 `props.ref` 并透传给 DOM |
| `React.Fragment` | `<>...</>`（jsx-runtime Fragment） |
| `createPortal` | `<Teleport to={...}>` |
| `cloneElement` | 消除；个别场景改用直接 props 合并 |
| `useId` | `generateId` 实现 |
| `useEventCallback` / `useStableCallback` | 普通闭包 |
| `React.Children.*` | 直接数组处理（VNodeChild 递归数组） |

## 5. 组件移植范式（以 Switch 为例）

React 版结构：setup（hooks + 派生）+ 每次 render 重算的 props 对象 + JSX。ActView 版：

- **setup 层**只保留「活引用」：`useControlled` 返回的 Ref、context 注入函数、DOM 引用变量、闭包函数、`computed`。禁止解构 props、禁止构造 props 对象、禁止动态早退。
- **JSX（render）层**直接读 `checked.value`；`{...getRootProps()}` 每次更新重新求值 —— getter 内部读 ref/props，天然响应，无需 useCallback。所有 rootProps/inputProps 等构造逻辑改为 getter 函数（R3）。
- `getButtonProps()` / `getRootProps()` 内的 onChange/onClick 闭包读 `props` 对象本身（actview props 原地更新）与 ref。
- 派生 state 对象（如 `SwitchRootState`）用 `computed`，喂给 Provider 与 `useRender`；有条件渲染（如 Portal 的 `if (!open) return null`）改写为 JSX 内三元（R4）。
- render prop：`props.render ? props.render(renderProps) : <element {...elementProps} />` 全部放在 JSX 内；`useRenderElement` 返回的 getter 同样在 JSX 内调用。
- `useValueChanged(checkedRef, cb)` → `watch`。
- `React.useMemo(() => state, deps)` → `computed`。

## 6. 已知风险与对策（逐项在 Phase 7 验证）

| 风险 | 对策 |
|---|---|
| `onChange` 语义（React 的 change = input 事件 vs 原生 change） | 迁移指南声明事件与 React 一致；测试验证，若为原生 change 则文本输入类内部改挂 `onInput`，公共 API 不变 |
| 事件对象无合成包装（React 代码大量用 `event.nativeEvent`） | 全局清理：actview 直接给原生事件，`nativeEvent` 用法删除或改为事件本体 |
| ref 形状（函数 ref / `{value}` ref） | `useMergedRefs` 归一处理；透传时保持用户传入形状 |
| `class` / `className` | 公共 props 保留 `className`（兼容）；渲染层统一输出 `class`，`useRenderElement` 内部归一 |
| `reactive` 整体重赋值丢代理 | store 快照类/整体替换的状态一律用 `ref` 包对象 |
| props 原地更新 + 解构陷阱 | 规范：getProps getter 内读 `props.x` 或 `useProp`，禁止 setup 层解构 |
| SSR/hydration 等价性（`useIsHydrating`、prehydrationScript） | 尽力移植（renderToString 存在）；不能对齐的行为在代码注释中标注 |
| `children` 类型差异（VNodeChild 数组 vs ReactNode） | 类型层适配；Base UI 不依赖 React.Children 遍历 |

## 7. 执行方式

- 严格按 Phase 依赖顺序推进（Phase 4/5/6 内互不依赖的组件并行迁移）。
- 每个组件迁移完即跑类型检查冒烟，Phase 7 统一回归。
- 迁移中每完成一层，更新本文件末尾的进度清单（组件 → 状态）。

## 8. 进度清单

- [x] Phase 0 工程接线（package.json/tsconfig/link 依赖/tsgo+vitest 冒烟通过）
- [x] Phase 1 actview-utils（store 核心 + 全部 hooks + 纯工具，tsgo 0 错）
- [x] Phase 2 internals 基础 + field/form/labelable/use-button（子代理 B）+ composite/temporal/杂项 hooks（子代理 C），全部 0 自身错误
- [x] Phase 3 弹层工具（子代理 E，31 文件）+ floating-ui-actview（子代理 D，37 文件全部落盘；收尾类型修正中）；popups/store+popupStoreUtils 与 D 的 API 对齐验证通过
- [~] Phase 4/5 波次：4b switch/checkbox/checkbox-group、4c toggle/toggle-group/radio/radio-group、4d progress/meter/avatar、4e collapsible/accordion、4f slider、5a fieldset/form/toolbar/tabs、5b field/otp-field、5c number-field/scroll-area（8 个并行）
- [~] Phase 6 波次：6a tooltip/preview-card、6b popover/dialog/alert-dialog、6c menu/menubar/context-menu、6d select、6e combobox/autocomplete、6f toast、6g drawer/navigation-menu（7 个并行）
- [x] src/index.ts 最终 rollup 已写入（41 入口）
- [ ] Phase 7 测试移植 + 全量验证（测试基建 test/ 已就绪并验证）

### 已发现并解决的坑（备忘）

- pnpm `link:` 路径以**包目录**为基准解析；需三层 `../../../actview/...`。
- 解决方案级 tsconfig.json 必须 `"files": []`，否则 tsgo 用 base 的 nodenext 编译全目录（actview 包扩展名省略 import 报 TS2834）。
- @actview/testing 的 `render(组件)` 不接受 props（用 Harness 组件包一层）；`getByText` 返回最外层匹配元素（用 getByTestId）。
- actview 聚合包不导出类型（Ref/ComputedRef 从 '@actview/core' 导入）。
- 含 JSX 的文件必须 `.tsx` 后缀（babel 插件只按扩展名 + 全量转换）。
- `actview` 运行时的 props 是 shallowReactive 代理：`props.render` 元素形态的 ref 在 `props.ref`（VNode.props 内）。
