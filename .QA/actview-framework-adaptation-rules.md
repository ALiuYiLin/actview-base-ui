# actview 框架差异与适配规则（提炼自 plantform-diff.md / actview-issue.md）

> 长期可复用的框架行为差异（PD-*）与适配模式（AD-*）。**权威长文在根目录 `plantform-diff.md`（维护态）**；本文是精简规则速查，供实现/审查时快速对号入座。主已捕获到 QA 的（mergeProps 语义、测试基建）这里只交叉引用不重复。

## A. 组件编写核心规则（setup 只执行一次）
- **setup 只执行一次**，JSX return 每渲染重求值（受控对比 React 侧差异主线，plantform-diff PD-06）。派生值用 `computed`；**props 对象构造放 getter / JSX 内调用**（PD-06/AD-17/AD-21/AD-35）。
- **`useRenderElement` 的 props 数组里普通对象字面量在 setup 冻结**，读到的 `x.value` 不更新 → 依赖响应式的 props 一律写成 **getter 函数** `(prev) => ...`（AD-17/AD-35）。排查：grep `props: [` 后跟普通对象。
- **props 数组链中每个 getter 返回对象「整体替换」prev，不自动合并** → 每个 getter 必须写 `(prev) => ({ ...prev, ...新属性 })` 或 `(prev) => mergeProps(prev, {...})` 保 id/children/事件链（AD-20/AD-26/AD-27；完整 mergeProps 语义见 merge-props-actview-semantics.md）。排查：props 链里 grep 无 `...prev` 的 `() => ({...})`。
- **组件函数必须以 return JSX 结尾**（babel 插件只识别 `return JSX / _jsx / null / 含 JSX 三元`）；`return getElement()`（调用表达式）不转换 → 运行时 `DOMException`，子树静默丢弃。统一 **`return <>{getElement()}</>`**（PD-07、actview-issue AI-003、issue #19）。`.ts` 文件里返回 null 的组件同样不转换（AD-31）。
- 条件渲染不能 setup 期 `return null`（快照冻结）→ 放进返回 JSX 里求值：`return <>{cond.value && createElement(...)}</>`（AD-34）。

## B. props/事件/事件语义
- 事件是**原生 DOM 事件**，无合成包装（无 `nativeEvent`、无 bivariance）；`onChange`=change 事件（受控文本用 `onInput`）（PD-03/PD-04/PD-17）。
- props 是 shallowReactive 代理、**父更新原地写**；setup 层解构 props 捕获旧值 → getter/JSX 内读 `props.x`（PD-15）。`reactive` 不能整体重赋值（PD-14）。
- **布尔 true 属性渲染为空串**：`aria-disabled=""` / `data-disabled=""`（规范要求 "true"）→ ARIA 布尔显式字符串 `'true'/'false'`（PD-01/PD-19/AD-27）。data-* 只需存在性可容忍空串。
- **无 htmlFor→for 映射**：必须写标准属性名 `for`（AD-24）。
- `defaultValue` 被当普通属性（不设 `.value`）→ ref 回调里手动赋值（PD-23）。

## C. 组件/ref/渲染器
- **组件级 ref 指向组件实例**（非根 DOM），setup 前 `delete props.ref`；DOM ref 用 render 元素 ref / 内部 ref（PD-02/AD-30，issue #21）。测试按实例语义断言。
- `<component is={Comp}>` 会把 `is` 残留进 props（PD-24）；JSX 标签不支持成员表达式 `<A.b/>`；动态组件用 `<component is>`（PD-08）。
- 含 JSX 文件必须 `.tsx`（PD-09）。
- `resolveRef` 不能仅用 `'value' in x` 判 ref（DOM 元素自带 value）→ 先判 `nodeType != null`（AD-32）。
- 对象 style 渲染时**过滤 `--*` CSS 变量键** → 用命令式 `element.style.setProperty('--x', v)` + watch（PD-25）。
- `pointerenter/pointerleave` **不冒泡**（依赖冒泡的交互要用 pointermove）（PD-26）。
- onMounted 子先于父、同步触发（与 React 相反，PD-20）；渲染错误走 onErrorCaptured（PD-21）。

## D. 弹层/焦点
- **无 createPortal → `<Teleport to={...}>`**（string→querySelector，null→当前容器）（AD-22）。
- `FloatingFocusManager` 的 `disabled`/`modal` 是**挂载时快照**不响应 → 用条件渲染（`mounted && reason !== hover`）在挂载时固定 disabled（AD-28）。
- 树结构变化（单元素↔Fragment）会**重建 DOM 节点** → trigger 的守卫用 `{cond && renderFocusGuard}` 固定 element 在 Fragment 中间，避免 DOM 节点重建导致 domReferenceElement 失效（AD-29）。
- FocusGuard 不能当组件 ref（收到组件实例）→ 改为渲染函数返回 `<span ref>`（AD-30）。

## E. store / 订阅 / watch
- `store.use/useState` 返回 Ref，读 `.value`（PD-10）。
- watch 对 source 按**引用比较**：监听标量 getter/computed（`() => state.value.x`），勿监听会重建引用的对象字面量（防死循环）（AD-13）。
- `ref.value = x` 即使同引用也重渲染 → 测量 setter 先浅比较再引用比较（AD-14）。
- **watch 数组源回调首参可能为 undefined**（卸载/重入）→ 用 `const [a,b] = Array.isArray(newVals) ? newVals : []` 防御（AD-33）。
- `setMessageIds` 是替换式写入（非函数式）→ 读当前列表整体替换（AD-25）。
- 无 forceUpdate → 本地 tick ref 模式（PD-13/AD-08）。
- useIsoLayoutEffect ≒ onMounted（无 layout 阶段，PD-12）；useId 无 SSR 稳定（PD-11）；类型从 `@actview/core` 导入（PD-18 see actview-internal）。

## F. 测试（细节见 actview-test-infra-patterns.md）
- 测试组件**定义在文件顶层**（babel 转换范围，AD-23）；jsdom 无布局/ResizeObserver → mock viewport 尺寸 + `it.skipIf(isJSDOM)`（AD-16）；jsdom 不合成原生 button Enter→click（AD-19）。

## 映射到权威长文
| 本文 | 来源 |
|---|---|
| A 组件规则 | plantform-diff PD-06/07/15, AD-17/20/21/26/27/31/34/35, actview-issue AI-003, issue#19 |
| B props/事件 | PD-01/03/04/14/17/19/23, AD-24 |
| C 组件/ref/渲染 | PD-02/08/09/20/21/25/26, AD-30/32, issue#21 |
| D 弹层/焦点 | AD-22/28/29/30 |
| E store/watch | PD-10/11/12/13/18, AD-08/13/14/25/33 |
| F 测试 | PD-16, AD-16/18/19/23 |

## 说明
`plantform-diff.md` 的 PD-01..26 / AD-01..35 是维护中的权威长文（变动需同步 plan.md/issue.md）；`actview-issue.md`（AI-001..003 框架问题）、`issue.md`（迁移日志）、`plan.md`（进度）多为**过程性状态**，非长期知识，不入 QA 正文。
