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
| `useTestInteractions`（React `#test-utils`） | ❌ 需实现（依赖 floating-ui-actview 的 `ElementProps` + constants 的 `ACTIVE_KEY` / `SELECTED_KEY` / `FOCUSABLE_ATTRIBUTE`） |
| role 查询族：`getByRole` / `getAllByRole` / `queryByRole` / `getByLabelText` / `findByTestId` | ❌ `@actview/testing` 的 screen 只有 text/class/testid 查询；菜单/网格导航测试主干用 `getByRole('button'/'menu')`、`getAllByRole('option')`。方案：actview 测试基建引入 `@testing-library/dom` 查询层（框架无关，scoped 到最近 render container） |
| `userEvent`（~160 处调用） | ✅ **直接复用** `@testing-library/user-event`：v14.6.1 dependencies 为空、peer 仅 `@testing-library/dom >=7.21.4`，**零 React 依赖**；`@testing-library/dom` v10.4.1 同样零 React 依赖（纯 DOM 事件序列仿真：click → pointerdown/mousedown/...、keyboard、tab、type）。actview 组件用原生 DOM 事件绑定可收到。需在 actview 声明 devDeps |
| 其他 | ✅ 已就绪：`isJSDOM`（actview-utils/testUtils）、`flushMicrotasks`（nextTick）、`render/screen/waitFor`（@actview/testing）、`fireEvent`（actview 自写，全方法）、`act`（createRenderer）、`createRenderer`、vitest 运行基建 |

#### ④ 测试文件 + 夹具迁移

- 3 个 `.test.tsx` 转写 + 11 个夹具转写（CSS `?scoped` + React hooks → actview 响应式）
- 附：上游 `@floating-ui/vue` 仅 7 文件 / 374 行，只提供定位（`useFloating` + `arrow`），交互层全在 React 版（46 文件 / 7588 行）——**交互 hooks 无法从 Vue 版借鉴**，只能从 React 版移植

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
| `useTestInteractions` | ❌ 需实现（见 ③） | ❌ |

### 1.5 建议推进顺序

1. **floating-ui-actview 移植**（含 ② 依赖链：actview-utils 9 个 + internals + composite + useBaseUiId）——地基
2. **测试基建三件套**：`@testing-library/dom` 查询层封装（getByRole 族，scoped 到最近 container）+ `@testing-library/user-event` devDeps + `useTestInteractions` 实现
3. **夹具迁移**：11 个文件，CSS `?scoped` + 跨文件 `scopedId` 手动传递（`<Child className="xxxx">` 要生效需 `<div scopedId={props.scopedId}>`）+ React hooks 转写
4. **测试转写**：3 个 `.test.tsx` 逐文件转写并跑通（渲染/断言层改 actview，交互层 userEvent/断言原样保留）

### 1.6 已完成的迁移（floating-ui 之外）

- 测试基建：`test/test-utils/`（createDescribe / flushMicrotasks / randomStringValue / screen / cloneVNode）、conformance 链（describeConformance + 4 helper）、`describeGregorianAdapter` 套件
- Temporal 家族：`src/internals/temporal` + `temporal-adapter-date-fns` + `temporal-adapter-luxon`（路径别名 `@/` → src、`#/` → 项目根）
- Accordion：Header（含 useRootElement 根 ref 范式）+ ItemContext + 测试（16/16 通过）
