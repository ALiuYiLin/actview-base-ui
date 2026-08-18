# actview 测试基建：@actview/testing + createRenderer + jsdom/portal/hidden-input 惯例

## 问题
actview 侧（packages/actview）测试基建怎么用？@actview/testing 的 render/cleanup 和 actview-utils 的 testUtils（createRenderer?）怎么用？jsdom 环境（PointerEvent、portal 残留、waitFor）注意什么？测试组件必须文件顶层定义吗？afterEach 清理 [data-base-ui-portal]？select 的 portal 元素如何查询？select root 的 hidden input（visualHiddenInput）如何断言？

## 结论（Evidence level: S6 — 源码 + 文档）
- **createRenderer 不在 actview-utils/testUtils**：`@base-ui/actview-utils/testUtils` 只有 `isJSDOM`（testUtils.ts:4）和类型级 `expectType`（testUtils.ts:21）。真正的 `createRenderer()` 在 `packages/actview/test/createRenderer.tsx`（test/index.ts:3 re-export）。
- **actview 测试主入口** `packages/actview/test/index.ts`：re-export `@base-ui/actview-utils/testUtils`（isJSDOM/expectType）、`@actview/testing`（cleanup/screen/waitFor）、`createRenderer`、`fireEvent` 门面、`wait`、`pointer`、`mergeRefs`、`resetBrowserPointer`。
- **@actview/testing**（`E:\code3\actview\packages\testing`）：原生 `render(component, {container?})`（自动建 div append 到 body，id='testing-N'）、`cleanup()`（只卸容器）、`fireEvent(el, event, {value})`、`waitFor(cb,{timeout=1000,interval=20})`、`screen`（作用于最近 render 容器）。RenderResult：container/unmount/getBy*Text/class/testId。**不用 role 查询**（TEST-WAVE.md:14），getByText 返回最外层包含匹配（:15）。
- **createRenderer（推荐正门）**：`render(Component, props)` 经 Harness + reactive props + shallowRef 原地重渲染，返回 `{...actviewRender(...), setProps, rerender}`，均 async（内部 nextTick）；`act(fn)=await fn()+nextTick`。等价 react 的 `render(<C/>)`/`setProps`/`rerender`（test/createRenderer.tsx）。
- **setupVitest 已全局 afterEach `cleanup()`**（setupVitest.ts:12-18），但 **只删 render 容器，不删 portal 节点** → 弹层测试仍需手动 afterEach 删 `[data-base-ui-portal], [data-base-ui-focus-guard]`。jsdom 下 rAF 用 setTimeout 垫（:22-26）。
- **jsdom 三点**：①PointerEvent polyfill `beforeAll(() => (window as any).PointerEvent = window.MouseEvent;)`（Popover.test.tsx:15-18，across accordion/field/number-field/tabs/slider）；②portal 残留用上述 afterEach 清理（Popover.test.tsx:20-26）；③waitFor——不在 render/fireEvent 后立刻断言异步状态，一条断言一个 waitFor 回调（TEST-WAVE.md:31-32）。
- **测试组件命名**：函数首字母大写（Babel 转换需要，TEST-WAVE.md:30）；惯例文件顶层定义稳定组件（Popover.test.tsx:36-187）。
- **select portal 查询**：portal 渲染到 document.body，容器内 query 看不到；写 `queryPopup()` helper 用全局 `document.querySelector('[data-testid="popup"]')`（Popover.test.tsx:30-34）。
- **hidden input 断言**：react 用 `screen.getByRole('textbox',{hidden:true})` + `toHaveValue`/`toHaveAttribute('id','x-hidden-input')`（react/SelectRoot.test.tsx:291-294,2931-2933）；multiple 用 `container.querySelectorAll('input[name="..."]')`（:330-333）。actview 无 role → 给 input 加 `data-testid` 或用 `container.querySelector('input[aria-hidden="true"]')` + `toHaveAttribute('value',...)`/`toHaveValue`。
- **hidden input 实现依据**：`name ? visuallyHiddenInput : visuallyHidden`（actview-utils/visuallyHidden.ts；input prop：type/name/value={serializedValue}/disabled/required/readOnly/tabIndex={-1}/aria-hidden，react SelectRoot.tsx:559-572）；id 规则——有 name 无 id，无 name 时 `id={generatedId}-hidden-input`（:559）。

## 建议 actview SelectRoot.test.tsx 骨架
```tsx
import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { SelectRoot } from './root/SelectRoot';
// ... 其他 part
import { createRenderer } from '../../test/createRenderer';
import { isJSDOM } from '@base-ui/actview-utils/testUtils';

beforeAll(() => {
  (window as any).PointerEvent = window.MouseEvent; // jsdom PointerEvent 不全
});
afterEach(() => {
  // @actview/testing cleanup 不清理 portal 节点
  document.querySelectorAll('[data-base-ui-portal], [data-base-ui-focus-guard]')
    .forEach((node) => node.remove());
});

const { render, fireEvent, act, waitFor } = createRenderer();

function queryPopup(): HTMLElement | null {
  return document.querySelector('[data-testid="popup"]'); // portal 在 body，用全局查询
}

function SimpleSelect(props: any) { /* 顶层、首字母大写 */ ... }

describe('<Select />', () => {
  it('renders hidden input', async () => {
    const result = await render(SimpleSelect, { name: 'country', defaultValue: 'a' });
    // actview 无 role 查询：给 hidden input 加 data-testid 或用属性查询
    const input = result.container.querySelector('input[aria-hidden="true"]') as HTMLInputElement;
    expect(input).toHaveAttribute('name', 'country');
    expect(input).toHaveAttribute('value', 'a'); // serializedValue = stringifyAsValue
  });
  it('opens on mousedown', async () => {
    const result = await render(SimpleSelect, {});
    fireEvent.mouseDown(result.getByTestId('trigger'));
    await waitFor(() => { expect(queryPopup()).not.toBe(null); });
  });
});
```
- multiple 多个 hidden input：`result.container.querySelectorAll('input[name="countries"]')`，逐个 `toHaveAttribute('value', ...)`。
- 位置/可见性类 jsdom 无法测的用 `it.skipIf(isJSDOM)`（TEST-WAVE.md:34）。

> 证据（路径与行号）已在各 bullet 内联；关键文件：actview/test/{createRenderer.tsx,index.ts,setupVitest.ts,fireEvent.ts,wait.ts}、actview-utils/src/{testUtils.ts,visuallyHidden.ts}、E:\actview\packages\testing\src\testing.ts、popover/Popover.test.tsx、TEST-WAVE.md、react/select/root/SelectRoot{.tsx,.test.tsx}。

> 框架测试差异的权威长文见根目录 plantform-diff.md（PD-16 测试 API / AD-16 jsdom 布局策略 / AD-18 waitFor flush / AD-19 原生 button 键盘 / AD-23 顶层定义），本文是其精简速查。
