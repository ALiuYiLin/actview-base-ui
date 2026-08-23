# ActView 迁移计划（PLAN）

> 记录 ActView（`packages/actview`）从 React（`packages/react`）逐步迁移的规划与依赖分析。
> 迁移范式详见 [MIGRATION.md](./MIGRATION.md)。

## 1. floating-ui-tests 迁移（进行中）

### 1.1 背景与范围

- 夹具：`packages/react/test/floating-ui-tests/`（11 个文件：Button / Popover / Navigation / Menu / MenuOrientation / Grid / ComplexGrid / EmojiPicker / ListboxFocus / renderGridRows / gridNavigationWithColumns + 各 `.module.css`）
- 消费方（React 侧三个测试，迁移目标）：
  - `packages/react/src/floating-ui-react/hooks/useListNavigation.test.tsx`
  - `packages/react/src/floating-ui-react/hooks/useHover.test.tsx`
  - `packages/react/src/floating-ui-react/components/FloatingFocusManager.test.tsx`
- 关键认知：**floating-ui 测试测的是交互行为（键盘导航 / 焦点管理 / hover / dismiss），不是样式**。CSS Modules 只是让 demo 像真实产品；定位计算由 `@floating-ui/dom` 上游自测。断言查 DOM 的 `activeElement` / `aria-selected` / `tabIndex` / open 状态，与渲染框架无关。

### 1.2 旧实现参考（12c16f0ec 的 `src/floating-ui-actview`，30 个文件）

React hooks 层的 actview 移植，**API 形状与 React 版兼容**：

- Middleware 不移植：`arrow/flip/shift/offset/autoUpdate/computePosition/...` 直接 `export * from '@floating-ui/dom'`（actview 已依赖 `@floating-ui/dom ^1.7.4` + `@floating-ui/utils ^0.2.12`）
- Hooks 用 actview 响应式（`ref/shallowRef/computed/watch`）+ `FloatingRootStore`（`store.useState('open'/'referenceElement'/'floatingId'...)`）；`options.open` 支持 `unref()`；`refs` 保持 `{ current }` + `setReference/setFloating/setPositionReference`；`useFloating` 返回 `{ floatingStyles, refs, context }`
- 组件走 actview 范式：`FloatingPortal`（Teleport + useRenderElement + createContext）、`FloatingFocusManager`（watch + enqueueFocus + markOthers + tabbable 工具）、`FloatingTree/Node/DelayGroup`（TreeStore）
- 文件清单：
  - `components/`：FloatingDelayGroup / FloatingFocusManager / FloatingPortal / FloatingRootStore / FloatingTree / FloatingTreeStore（6）
  - `hooks/`：gridNavigation / useClick / useClientPoint / useDismiss / useFloating / useFloatingRootContext / useFocus / useHover / useHoverFloatingInteraction / useHoverInteractionSharedState / useHoverReferenceInteraction / useHoverShared / useListNavigation / useSyncedFloatingRootContext / useTypeahead（15）
  - `middleware/arrow.ts`、`safePolygon.ts`、`types.ts`、`utils.ts`、`utils/{composite,constants,createAttribute}.ts`、`utils/getEmptyRootContext.ts`、`index.ts`（9）
- 注意：旧版 `useTestInteractions` 无对应；旧版自封装 `createContext`（双参）重新迁移时应改用官方 `createContext<T>(defaultValue)`（MIGRATION.md 案例 5）

### 1.3 完整缺口清单（floating-ui-actview 移植 ≠ 全部）

#### ① floating-ui-actview 移植（上文 1.2）

#### ② 它的依赖链（被 `7e5a6e930` 删除，需随迁）

| 类别 | 文件 |
|---|---|
| actview-utils（9） | `addEventListener` / `mergeCleanups` / `useMergedRefs` / `useValueAsRef` / `useTimeout` / `platform` / `owner` / `empty` / `useId` |
| src internals（6） | `createBaseUIEventDetails` / `reasons`（useHover.test 直接用）/ `constants` / `useRenderElement` / `utils/FocusGuard` / `createContext`（官方） |
| composite 全套 | `internals/composite/{composite,compositeUtils,constants,index}` + `item/` + `list/`（CompositeList、useCompositeListItem）+ `root/`（ListboxFocus/Menu/MenuOrientation 夹具依赖） |
| 其他 | `internals/useBaseUiId`（Menu/MenuOrientation 夹具依赖） |

#### ③ 测试基建缺口

| 项 | 状态 |
|---|---|
| `useTestInteractions`（React `#test-utils`） | ✅ **无需实现**：floating-ui 上游测试不使用它（`floating-ui/packages/react/test/unit/` 零引用），floating-ui/actview 迁移时直接用 actview 的 `useInteractions([...])` 等价替代。base-ui 消费方测试转写时同样处理；若想保持原样，其 `mergeProps` 逻辑是纯函数（仅 React.useCallback 包装，约 120 行），可原样搬入 actview 测试基建 |
| role 查询族：`getByRole` / `getAllByRole` / `queryByRole` / `getByLabelText` / `findByTestId` | ✅ **方案已验证**：floating-ui/actview `test/unit/utils.tsx` 即 RTL 兼容层——re-export `@testing-library/dom` 的 `screen` / `fireEvent` / `waitFor` / `within`（框架无关、零 React 依赖，`@testing-library/dom ^10.4.0` 已声明），并配套 actview `render` / `rerender` / `act`（基于 `@actview/core` render/unmount + nextTick）。直接照搬该层即可 |
| `userEvent`（~160 处调用） | ✅ **已验证**：floating-ui/actview devDeps 已声明 `@testing-library/user-event ^14.6.1`（v14.6.1 零 React 依赖，纯 DOM 事件序列仿真）并全量测试通过，直接复用 |
| 其他 | ✅ 已就绪：`isJSDOM`（actview-utils/testUtils）、`flushMicrotasks`（nextTick）、`render/screen/waitFor`（@actview/testing）、`fireEvent`（actview 自写，全方法）、`act`（createRenderer）、`createRenderer`、vitest 运行基建 |

> 注意：base-ui 的 `floating-ui-react` 是 **base-ui 变体**（含上游没有的 `useListNavigation.webkit.test.tsx`、`gridNavigation.ts`、`FloatingRootStore` 等），测试基建（RTL 兼容层方案）可复用，但 3 个 `.test.tsx` 转写不能 1:1 照搬 floating-ui/actview，需按 base-ui 变体的差异逐文件处理。

#### ④ 测试文件 + 夹具迁移

- 3 个 `.test.tsx` 转写 + 11 个夹具转写（CSS `?scoped` + React hooks → actview 响应式）
- 附：上游 `@floating-ui/vue` 仅 7 文件 / 374 行，只提供定位（`useFloating` + `arrow`），交互层全在 React 版（46 文件 / 7588 行）——**交互 hooks 无法从 Vue 版借鉴**，只能从 React 版移植

##### ④ 进度（截至 useListNavigation 深修完成）

| 测试文件 | 状态 | 说明 |
|---|---|---|
| `useHover.test.tsx` | ✅ 15 通过 / 1 跳过 | 已转译 |
| `useListNavigation.test.tsx` | ✅ 60 通过 / 1 跳过 | 已转译；含 gridNavigation 移植、initial sync 单参（#2604）、isListIndexDisabled 守卫、Escape 分层关闭 + cross-close 父导航（克隆事件模拟 React 合成冒泡）、Escape+nested 跳过 animOut return、setupVitest rAF 同步化、EmojiPicker 非受控 input |
| `FloatingFocusManager.test.tsx` | ⏳ 待转译 | base-ui 2689 行；上游 actview 版已有参考，需按 base-ui 变体（keepMounted/iframes/guards）逐用例处理 |

### 1.4 RTL → ActView API 映射表

| React Testing Library（三个测试实际用法） | ActView 对应 | 状态 |
|---|---|---|
| `render(<App loopFocus disabledIndices={[]} />)` | `createRenderer().render(App, { loopFocus: true, disabledIndices: [] })` | 转写（JSX 元素 → 组件 + props 对象） |
| `screen.getByTestId` / `queryByTestId` / `getByText` / `queryByText` | `@actview/testing` screen | ✅ |
| `screen.getByRole` / `getAllByRole` / `queryByRole` / `getByLabelText` / `findByTestId` / `debug` | ❌ 无，见 ③ | ❌ |
| `fireEvent.click/focus/focusOut/keyDown/mouseEnter/mouseLeave/mouseMove/pointerDown/pointerLeave` | `test/fireEvent.ts`（全方法） | ✅ |
| `act(fn)` / `act(async fn)` | `createRenderer().act(fn)`（async，fn + nextTick） | ✅ 统一 `await act(...)` |
| `waitFor`（~100 处） | `@actview/testing` waitFor | ✅ |
| `flushMicrotasks`（~104 处） | `test-utils/flushMicrotasks`（`await nextTick()`） | ✅ |
| `userEvent`（~160 处） | `@testing-library/user-event` 复用（加 devDep） | ✅ |
| `vi.useFakeTimers` + `advanceTimersByTime`（useHover.test 16 处） | vitest 级 ✓；⚠️ 需确认 actview 版 useHover 内部计时走 `useTimeout`（setTimeout）而非 rAF，fake timers 才能拦截 | ⚠️ 迁移时实测 |
| `ReactDOMClient.createRoot(root).render(<App iframe={root} />)`（FFM iframe 场景） | `render(App, { iframe: root, container: iframeRoot })`（@actview/testing render 支持 container） | ⚠️ 需实测（actview 渲染管线是否绑定全局 document） |
| `isJSDOM` + `describe.skipIf` | actview-utils/testUtils（#test-utils 已导出） | ✅ |
| `useTestInteractions` | 转写为 actview `useInteractions`（等价替代，见 ③） | ✅ |

### 1.5 建议推进顺序

1. **floating-ui-actview 移植**（含 ② 依赖链：actview-utils 9 个 + internals + composite + useBaseUiId）——地基
2. **测试基建三件套**：复用 floating-ui/actview 已验证的 RTL 兼容层方案——`@testing-library/dom` 查询层（getByRole 族，re-export screen/fireEvent/waitFor/within）+ `@testing-library/user-event` devDeps；`useTestInteractions` 用 actview 的 `useInteractions` 等价替代（见 ③）
3. **夹具迁移**：11 个文件，CSS `?scoped` + 跨文件 `scopedId` 手动传递（`<Child className="xxxx">` 要生效需 `<div scopedId={props.scopedId}>`）+ React hooks 转写
4. **测试转写**：3 个 `.test.tsx` 逐文件转写并跑通（渲染/断言层改 actview，交互层 userEvent/断言原样保留）

### 1.6 已完成的迁移（floating-ui 之外）

- 测试基建：`test/test-utils/`（createDescribe / flushMicrotasks / randomStringValue / screen / cloneVNode）、conformance 链（describeConformance + 4 helper）、`describeGregorianAdapter` 套件
- Temporal 家族：`src/internals/temporal` + `temporal-adapter-date-fns` + `temporal-adapter-luxon`（路径别名 `@/` → src、`#/` → 项目根）
- Accordion：Header（含 useRootElement 根 ref 范式）+ ItemContext + 测试（16/16 通过）
