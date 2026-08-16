# Phase 7 测试移植规格

> 测试基建已就绪：`packages/actview/test/`（createRenderer/fireEvent/wait/pointer/mergeRefs/addVitestMatchers/resetBrowserPointer/index）。
> 本文件是测试波次（Phase 7）的执行规格。

## 渲染 API 变化（React 测试 → actview 测试）

| React 测试 | actview 测试 |
|---|---|
| `render(<Comp a={1} />)` | `render(Comp, { a: 1 })`（createRenderer.render(组件, props)） |
| `result.setProps({ a: 2 })` | 同（reactive 原地更新 + nextTick） |
| `result.rerender(<Comp b={2} />)` | `result.rerender(Comp, { b: 2 })` |
| `fireEvent.click(el)` / `fireEvent.keyDown(el, {key})` | 同（test/fireEvent 门面，原生事件） |
| `screen.getByRole('x')` / `getByLabelText` | **不支持**（@actview/testing 无 role 查询）→ 用 `screen.getByTestId` 或 `container.querySelector('[role="x"]')`；需要 role 查询时在测试文件内写局部 helper |
| `screen.getByText('x')` | @actview/testing 的 getByText 返回**最外层**包含匹配的元素（与 testing-library 相反）→ 优先 getByTestId |
| `act(async () => {...})` | `await renderer.act(async () => {...})`（内部 nextTick） |
| `React.cloneElement` | 用 render(Comp, props) 传新 props |
| `advanceReactClock` | 无对应物，删除 |
| `flushMicrotasks()` | `await actviewNextTick()`（从 'actview' 导入 nextTick） |

## 移植单位

- 每个组件的 `*.test.tsx`/`*.spec.tsx` 从 react/src/<comp>/ 移植到 actview/src/<comp>/（同文件名）。
- spec 文件（类型测试）用 `expectType`（@base-ui/actview-utils/testUtils 已导出）。
- conformance：移植 `test/conformanceTests/*`（propForwarding/refForwarding/renderProp/className/utils）+ `test/describeConformance.tsx`——签名改为 `describeConformance(Component, props?, getOptions)`；内部用 createRenderer 的 render(Component, {...minimalProps, ...testProps})；`skip`/`only`/`wrappingAllowed`/`button` 选项语义不变。
- `test/popupConformanceTests.tsx`、`test/useTestInteractions.ts`、`test/waitForPositioned.ts`、`test/describeGregorianAdapter` 一并移植（popup 交互用 fireEvent 门面 + waitForPositioned 轮询位置）。

## 测试编写注意

- 组件函数定义在测试文件内时，首字母大写（babel 转换需要）；Harness 模式：`render(Harness)`。
- `waitFor(() => expect(...))` 一条断言一个回调（沿用 react 规范）。
- 不要在 `render` 后立刻断言异步状态：用 waitFor（@actview/testing 已导出）。
- 事件：actview 用原生事件——测试里 `fireEvent.input(el, { target: { value: 'x' } })` 后若组件用 onInput 触发受控更新，需 `await waitFor` 或 nextTick。
- jsdom 边界：pointer/布局测量类测试用 `it.skipIf(isJSDOM)`（isJSDOM 从 @base-ui/actview-utils/testUtils 导入）。

## 执行方式

- 按组件分组并行（与源码波次相同的分组）。
- 每组完成后：`pnpm --filter @base-ui/actview exec vitest run <组件目录> --no-watch` 全绿 + tsgo 0 错。
- 全量跑：`pnpm --filter @base-ui/actview exec vitest run`。
