# ActView 框架问题记录（Framework Issues）

> 用途：记录**框架本身的问题**（非本库适配问题）。每个条目含：场景、复现方式、观察到的现象。
> 由框架维护者处理；处理完成后在条目标记并回到组件实现。
> 本库侧的适配/差异见 `plantform-diff.md`；迁移问题见 `issue.md`。

---

## AI-001 watch(flush:'post') 在挂载期不触发 → CompositeList 的 onMapChange 从不执行

- **状态**：🟢 **可绕过**（代码层面不依赖框架修复，见下方"本库侧处理方式"）
- **组件**：tabs、slider、及所有使用 `flush:'post'` + `immediate:true` 的组件
- **场景**：组件挂载期间（ref 回调 / register 调用时）改变一个 ref 的值，`watch(ref, cb, { flush: 'post' })` 之后**永不执行回调**。
- **复现方式**：
  1. `packages/actview/src/tabs/Tabs.test.tsx` —— `render(TabsDemo)`（无 defaultValue，期待自动选中第一个 tab）。
  2. 断言 `tab-a` 有 `data-active` → 失败；`onValueChange` 从未调用。
- **观察到的现象**（已加日志验证）：
  - `CompositeList.register` 被调用（map.size = 2）✓
  - `mapTick` ref 被翻转 ✓
  - `watch(mapTick, ..., { flush: 'post' })` 的回调**从未执行**（无日志）
  - 挂载期 `useIsoLayoutEffect` 的 flush 执行了一次，但此时 item 的 `isConnected === false`（见 AI-002），`getCompositeListSnapshot` 将其过滤 → `onMapChange` 收到空 map（size 0），且 flush 后 `isDirtyRef=false`，后续不会重跑
- **期望行为**：post-flush watch 在挂载完成后（整棵树插入后）至少执行一次回调，使 onMapChange 携带真实 items。
- **本库侧处理方式**（不依赖框架修复，逐组件落地）：
  - **原则**：`watch` 只负责"变化时"（此时 DOM 已就绪），初始态由 `onMounted`（`useIsoLayoutEffect`）单独处理。
  - **不再使用** `watch(src, cb, { immediate: true, flush: 'post' })` 这种混合写法。
  - **替代模式**：
    ```tsx
    // ❌ 旧模式（在挂载期不触发，refs 也可能为 null）
    watch(src, fn, { immediate: true, flush: 'post' })

    // ✅ 新模式：「初始」+「变化」彻底分离
    onMounted(() => {
      if (/* 初始条件满足 */) fn()    // DOM 刚就绪，refs 可用
    })
    watch(src, () => {               // 变化时触发，DOM 已就绪
      if (/* 条件满足 */) fn()
    })
    ```
  - **注意**：`onMounted` 返回的函数作为 cleanup（`onUnmounted`），替代 `onCleanup` 的清理注册。
  - **适用场景**：所有 `flush:'post'` + `immediate:true` 的 watch 都应按此模式拆分；`flush:'post'` 不带 `immediate` 的 watch（如 CompositeList 的 mapTick watch）仅用于变化后响应，初始态由 `useIsoLayoutEffect` 兜底，且挂载后正常工作，无需改动。

## AI-002 挂载期 ref 回调触发时，元素 `isConnected === false`

- **状态**：🟢 **可绕过**（见下方\"本库侧处理方式\"）
- **组件**：tabs / slider / composite
- **场景**：组件挂载过程中，子元素（如 tablist 里的 button）的 ref 回调触发时，其祖先链尚未 appendChild，`element.isConnected === false`。
- **复现方式**：
  1. 在 `CompositeList.register(node)` 内断言 `node.isConnected` → 挂载时为 `false`。
  2. `getCompositeListSnapshot` 的 `if (!node.isConnected) return;` 分支将刚注册的项全部过滤 → map 空。
- **观察到的现象**：register 打印 tagName=BUTTON 正常，但紧接着 flush 时 `items.length === 0`（map.size=2）。
- **期望行为**：ref 回调在 DOM 完全插入后触发（与 React 一致），或提供等价时机保证 `isConnected === true`。
- **本库侧处理方式**：
  - **原则上，初始时不需要依赖 ref 回调的 isConnected**：使用 `onMounted`（`useIsoLayoutEffect`）处理初始态，此时整棵树已插入，`isConnected === true`。
  - **CompositeList 内部**：`getCompositeListSnapshot` 依然过滤 disconnected 节点（不变），但 `useIsoLayoutEffect` 在挂载后再次调用 flush，此时所有节点的 `isConnected` 为 `true`，snapshot 正常。
  - **副作用**：`useIsoLayoutEffect` 的 flush 执行后 `isDirtyRef = false`，后续 ref 回调不会再触发 flush（已稳定）。若后续有动态增减（add/remove），ref 回调会再次触发 register/unregister → `scheduleMapUpdate` → post watch 在挂载后正常工作。

---

## AI-003 组件 VNode 作为 string 类型元素的子节点时渲染失败

- **状态**：🟢 **可绕过**（本库侧已统一规避：组件末尾 `return <>{getElement()}</>`，2026-08-17 全部落地）
- **组件**：所有使用 `useRenderElement` 的子组件作为 JSX 子节点的复合组件（slider、tabs、select 等）
- **场景**：组件 VNode（如 `SliderControl`）作为 string 类型元素 VNode（如 `<div>`）的子节点时，actview 渲染器抛 `DOMException` 且静默吞掉该子树。
- **根因（经项目 QA 定位）**：actview 的 Babel 插件（@actview/plugin-vite）只把**结尾 return 直接是 JSX / `_jsx` 调用 / `null`** 的组件函数转换为 `{ __setup }` VNode 类型；`return getElement()`（函数调用结尾）不被识别 → 组件保持裸函数 → 运行时 `isComponentVNode` 只认带 `__setup` 的对象 → 裸函数被当原生元素 → `document.createElement(裸函数)` 抛 `DOMException: InvalidCharacterError`，子树被 try/catch 静默丢弃。actview 仓库测试 `test/createElement-child.test.tsx`（A/C 用例）证明：直接 JSX 结尾的组件作为 children 正常。
- **本库侧处理方式**（已落地，全部 10 处）：
  - **组件末尾用 Fragment 包裹**：`return <>{getElement()}</>;`（替代 `return getElement();`），使 Babel 插件识别为 JSX return 并转换为 `{ __setup }`。
  - 已修改文件：`slider/control|track|thumb|indicator|label|value`、`field/description`、`fieldset/legend`、`utils/listbox-separator`、`switch/thumb`。
  - 验证：slider 23/23 测试通过（此前组件链渲染失败、DOMException）。scroll-area 各组件的 `return <>{getElement()}</>` 模式在实现时已使用，无需修改。
