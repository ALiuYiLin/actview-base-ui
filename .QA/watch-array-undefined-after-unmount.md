# actview watch 数组回调收 undefined：卸载与微任务竞态（AD-33 延伸）— 根因 + 为何 menu 触发 / select 不触发

## 问题
menu 测试全过但 vitest 报 3 个 unhandled rejection（卸载/测试结束阶段）：`useTransitionStatus.ts:66 ([isOpen])`、`useOpenChangeComplete.tsx:16 ([isEnabled])`、`useSyncedFloatingRootContext.ts:85 ([openValue, referenceValue, floatingValue])`，都是 `TypeError: undefined is not iterable`。select/popover 也用 useTransitionStatus/useOpenChangeComplete 但无 unhandled errors。MenuRoot 独有 useSyncedFloatingRootContext 且传 store.state.floatingRootContext。

## 根因（Evidence level: S6 — watch/effect 源码）
**框架 watch 的 runJob 在 effect 被 stop 后仍执行 stale 微任务，把 `undefined` 当 newValue 传给回调并触发疑似变化。**
机制（watch.ts + reactive-system.ts）：
1. watch 数组源 scheduler 把 `runJob` 调成**微任务**（watch.ts:96-106，`Promise.resolve().then(runJob)`）。
2. 若组件在微任务执行**前**卸载 → 组件 scope 停 → `effect.stop()` 置 `active=false`（reactive-system.ts:87-92）。
3. 微任务到点执行 `runJob()` → `runJob`（watch.ts:76-92）未检查 active → 调用 `effect.run()`。
4. `ReactiveEffect.run()`（reactive-system.ts:66-67）`if (!this.active) return` → **返回 undefined**。
5. `runJob` 里 `hasChanged(undefined, oldValue)`（oldValue 是数组）→ 非双数组 → `Object.is` 不等 → true → **`cb(undefined, oldValue, onCleanup)`** → `([isOpen])` 解构 undefined → **"undefined is not iterable"**。

**核心框架缺陷**：`runJob` 没有 `if (!effect.active) { pending=false; return; }` 守卫——stale 微任务在 stop 后应被跳过（对比 `queueJob` reactive-system.ts:16-17 会查 active）。

## 为何 menu 触发、select 不触发（不是 menu 用法错误，是竞态概率）
- **两边都可能触发**（都用 useTransitionStatus/useOpenChangeComplete）。select 只是**运气/时机**没踩中——其卸载时序没让 pending 微任务撞上 stopped effect。
- **menu 触发概率高**：① 独有 `useSyncedFloatingRootContext`（仅 MenuRoot 用），其 watch `[open, referenceElement, floatingElement]` 绑定的 store ref（activeTriggerElement/positionerElement）在**每次 open/close 都剧烈变化** → 产生大量 pending 微任务；② 菜单 open→立即 close/unmount 很常见 → 微任务还没 flush 组件已卸载。select 用 `useFloatingRootContext`，其 watch 绑的是稳定 refs、改动少、卸载时序错开。**所以差别在「触发频次 × 卸载竞态窗口」，非结构正确性。** `floatingRootContext: store.state.floatingRootContext` 只是 store 持有的对象，与本次 crash 无关。

## 修复建议（可操作）
**① 框架根因修（primary，推荐）** — `watch.ts` 的 `runJob` 开头加：
```ts
const runJob = () => {
  if (!effect.active) { pending = false; return; }   // stale 微任务：stop 后直接跳过
  ...
}
```
让 stop 后的 pending 微任务成为 no-op，**永远不把 undefined 传给回调**。一处修复惠及全部组件（含 select/popover 潜在隐患）。

**② 库内存活防御（AD-33 既有模式，推荐补全）** — 给 3 个未加防的回调补 `Array.isArray` 守卫（与本库 useDismiss/FloatingFocusManager/useTransitionStatus 其它 watch 一致）：
```ts
// useTransitionStatus.ts:66
([isOpen], _old, onCleanup) => { ... }
→ ([isOpen] = [], _old, onCleanup) => {}   // 或 const [isOpen] = Array.isArray(newVals) ? newVals : []
```
- `useTransitionStatus.ts:29/50/87` **已有**此守卫（AD-33 曾修 3 处但漏了 :66）；`useOpenChangeComplete.tsx:16`、`useSyncedFloatingRootContext.ts:85` 完全没有。
- 语义：即使回调仍被触发，卸载后逻辑也应惰性（isOpen/undefined → 直接 return），加防后**不崩**。

**结论**：menu 侧「组件卸载时主动清理」**无法可靠解决**——pending 微任务在 cleanup 之前已计划好，组件 cleanup 拿不到它。正确做法是**改框架 runJob 守卫（①）＋ 补库内 Array.isArray（②）**。①是真好；②是 AD-33 一贯的纵深防御，务必给这 3 处统一（含 useTransitionStatus:66 这个漏网者）。

## 文件证据
- E:\actview\packages\core\src\reactivity\watch.ts:76-92（runJob 无 active 守卫）、:96-106（scheduler 微任务）
- E:\actview\packages\core\src\reactivity\reactive-system.ts:16-17（queueJob 有 active 守卫对照）、:66-67（run() 停后返回 undefined）、:87-92（stop → active=false）
- internals/useTransitionStatus.ts:29,50,87（**有** Array.isArray 守卫）、:66（**无**，漏网）
- internals/useOpenChangeComplete.tsx:16（无守卫）
- floating-ui-actview/hooks/useSyncedFloatingRootContext.ts:85（无守卫）
- 既有守卫范本：floating-ui-actview/hooks/useDismiss.ts:282、components/FloatingFocusManager.tsx:306,332,389,565,618,696,842,860,880
- plantform-diff.md AD-33（watch 数组源 undefined 防御；useTransitionStatus 曾加过 3 处）PS：AD-33 原文说「useTransitionStatus 的三个数组 watch 已一并加防御」——但实测 4 个 watch 里有 3 个加、:66 漏了。
