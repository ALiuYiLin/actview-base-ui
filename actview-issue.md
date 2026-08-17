# ActView 框架问题记录（Framework Issues）

> 用途：记录**框架本身的问题**（非本库适配问题）。每个条目含：场景、复现方式、观察到的现象。
> 由框架维护者处理；处理完成后在条目标记并回到组件实现。
> 本库侧的适配/差异见 `plantform-diff.md`；迁移问题见 `issue.md`。

---

## AI-001 watch(flush:'post') 在挂载期不触发 → CompositeList 的 onMapChange 从不执行

- **状态**：🟡 开放（已停止 tabs 组件实现等待处理）
- **组件**：tabs（依赖 composite/CompositeList）
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

## AI-002 挂载期 ref 回调触发时，元素 `isConnected === false`

- **状态**：🟡 开放（与 AI-001 关联）
- **组件**：tabs / composite
- **场景**：组件挂载过程中，子元素（如 tablist 里的 button）的 ref 回调触发时，其祖先链尚未 appendChild，`element.isConnected === false`。
- **复现方式**：
  1. 在 `CompositeList.register(node)` 内断言 `node.isConnected` → 挂载时为 `false`。
  2. `getCompositeListSnapshot` 的 `if (!node.isConnected) return;` 分支将刚注册的项全部过滤 → map 空。
- **观察到的现象**：register 打印 tagName=BUTTON 正常，但紧接着 flush 时 `items.length === 0`（map.size=2）。
- **期望行为**：ref 回调在 DOM 完全插入后触发（与 React 一致），或提供等价时机保证 `isConnected === true`。
