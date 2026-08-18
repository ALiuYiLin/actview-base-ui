# actview toast 更新不重渲染诊断：props 解构冻结 toast + waitFor 误用

## 问题
toast 测试：add 后 setTimeout 50ms 看 body.innerHTML toast 已完整渲染，但测试 `await waitFor(() => queryToast())` 返回 null；data-starting-style 残留（transitionStatus 没被清）；close 不消失；createToastManager 外部 add 不渲染；manager.update 改 title UI 停留 'Before'。共同点疑似 store 更新后组件不重渲染 / watch 不触发。debug 显示 `style="transition: undefined;"`。

## 结论（Evidence level: S6 — 全源码分析）
两个核心根因：
1. **`waitFor(() => queryToast())` 误用**（#2 及多数“超时/返回 null”）：`@actview/testing` 的 `waitFor`（@actview/testing/src/testing.ts:162-181）只在回调 **throw** 时重试；`queryToast()` 返回 null 是「成功」不抛 → waitFor **立即返回 null**。必须把断言放进回调：`await waitFor(() => { expect(queryToast()).not.toBeNull(); })`（对照 TEST-WAVE.md:31「一条断言一个 waitFor 回调」）。
2. **ToastRoot 在 setup 期解构 toast prop 冻结快照**（#3/#4/#6 主因）：`ToastRoot.tsx:43` `const { toast, ... } = componentProps` 违反 PD-15（props 是 shallowReactive 代理、父更新原地写；setup 解构捕获旧值）。store 每次更新（`updateToastInternal`/`closeToast` 产生**新 toast 对象**，`setToasts(toasts.map(...))`）→ ToastHost 重渲染传新 `toast` prop → 但 ToastRoot 解构出的旧 `toast` 不更新。于是：
   - state computed（`:493-500 transitionStatus: toast.transitionStatus`）与 watch 源（`:128 () => toast.transitionStatus`）、getDefaultProps 全读**冻结的旧 toast** → store 里 transitionStatus 已清，但渲染仍显 data-starting-style（#3）；close 的 ending 状态读不到 → removeToast 不触发 → 不消失（#4）；manager.update 改 title 读旧 toast → UI 不变（#6）。
   - **正确模式**（对齐 select）：`SelectRoot.tsx:89-97` 每个响应式 prop 用 `computed(() => componentProps.xxx)` 读取，**不在 setup 解构**。toast 应改为 `const toast = computed(() => componentProps.toast as ToastObjectType)`，所有 `toast.xxx` 改 `toast.value.xxx`（watch 源、state computed、getDefaultProps、recalculateHeight、useOpenChangeComplete）。
   - 次要：首挂载 `recalculateHeight` 在 `rootRef.value` 仍 null 时 early-return；根因修复后建议用 `onMounted`/`useIsoLayoutEffect` 保证首次能跑（ref 回调+watch 挂载期时机见 AI-002/AD-33）。
3. **`transition: undefined` 序列化成字符串**（debug 干扰项，非崩溃）：ToastRoot `getDragStyles`（`:442-444`）`transform: isSwiping ? '...' : undefined`，actview 把 undefined 序列化进 style → `"transition: undefined;"`（PD-25 只过滤 `--*` 键，undefined 值不丢弃）。修法：条件包含键 `...(isSwiping.value ? { transform: '...' } : {})`，别塞 undefined。

## 补充：外部 add（#5）
`createToastManager`/`ToastProvider` 的 `' subscribe'`（注意键名含前导空格，两处一致，非 bug）订阅→`store.addToast` 路径对；新 toast 是全新 ToastRoot（key 新）本应渲染，若仍失败多为 #1 的 waitFor 误用（立刻返回 null 而非重试）。先修 waitFor。

## ToastHost / toasts.value.map 用法的判定
- `toasts.value.map(...)` 在 JSX return 里渲染列表**正确且响应式**（`toasts` 是 `store.useState('toasts')` 的 Ref，DST 每次 store 通知重算，`useStore.ts:47-52` 用 `Object.is` 比较更新 shallowRef）。map 本身不是问题——问题是 map 出的 `<ToastRoot toast={toast}>` 子组件 setup 解构冻结。

## 文件证据
- toast/root/ToastRoot.tsx:43（解构 toast prop，PD-15 bug）、:84-98（store.useState + useOpenChangeComplete 读 toast）、:127-149（watch 源读 toast）、:453-472（getDefaultProps）、:493-500（state computed 读 toast.transitionStatus）
- toast/viewport/ToastViewport.tsx:35-40（useState refs 正确）、:280-288（children 转发）、:291-306（return JSX）
- actview-utils/src/store/useStore.ts:43-56（useState 订阅更新 Ref）
- E:\actview\packages\testing\src\testing.ts:162-181（waitFor 只在 throw 时重试）
- select/root/SelectRoot.tsx:89-97（响应式 prop 用 computed，不 setup 解构）
- toast/createToastManager.ts:22,85（' subscribe' 键）；toast/provider/ToastProvider.tsx:40-51（订阅→store.addToast）
- plantform-diff.md PD-15（setup 解构冻结）、AD-17/AD-35（getter/computed 内读）；TEST-WAVE.md:31（waitFor 断言进回调）

## 修复清单
1. 测试：所有 `await waitFor(() => queryToast())` 改 `await waitFor(() => { expect(...).not.toBeNull(); })`。
2. ToastRoot：`const toast = computed(() => componentProps.toast)`，全文件 `toast.xxx` → `toast.value.xxx`；不为它解构。
3. getDragStyles：undefined 键用条件展开省略，避免 `transition: undefined;`。
4. （可选）首挂载 recalculateHeight 用 onMounted 兜底。
