# watch 数组源问题：函数源被当 getter 调用 & 卸载期 stale undefined（AD-13/33 家族）

> 合并自 watch-array-undefined-after-unmount + combobox §1 + toast B§1。三个子问题共享同一主题「watch 数组源与回调体的边界」。

## 子问题 1：数组源放函数/方法 —— 被当 getter 调用（组件挂载早期崩）
- **机制**：actview 的 watch 数组源把**每个函数元素当 getter 调用**（watch.ts:138-144 `typeof s === 'function' ? s() : s`）。把 `setIndices`（store 方法）等直接放 `watch([a, setIndices, c], ...)` → setup 早期同步执行 `runJob` 收集依赖时 store 尚未就绪 → getter 里解构 store 状态 → `Cannot read properties of undefined (reading 'activeIndex')`。
- **规则**：watch 数组源只放**纯响应式源**（ref / `() => ref.value` 标量 getter）；逻辑/方法调用放**回调体内**。

## 子问题 2：卸载后 stale 微任务把 undefined 传给数组回调 → 解构崩（AD-33）
- **机制（S6 源码链）**：watch 数组源 scheduler 把 `runJob` 调成**微任务**（watch.ts:96-106）→ 微任务执行前组件卸载 → `effect.stop()` 置 `active=false` → 微任务到点 `runJob()` 未查 active 就 `effect.run()` → `ReactiveEffect.run()` `if (!this.active) return` 返回 **undefined** → `hasChanged(undefined, oldValue)`（Object.is 不等）→ **`cb(undefined, ...)`** → `([isOpen])` 解构 undefined → `undefined is not iterable`。
- **修复（已全部落地 ✅）**：
  - 框架根因：`runJob` 开头加 `if (!effect.active) return`（watch.ts:81，stale 微任务 no-op），一处根治全部组件。
  - 库内存活防御：3 处补 `const [a,b] = Array.isArray(newVals) ? newVals : []`——useTransitionStatus.ts:66（AD-33 漏网）、useOpenChangeComplete.tsx:16、useSyncedFloatingRootContext.ts:85。
- **为何 menu 触发、select 不触发**：两边都可能（都用 useTransitionStatus/useOpenChangeComplete），select 只是时机没踩中；menu 概率高 = 独有 useSyncedFloatingRootContext 的 watch 绑 `[open, referenceElement, floatingElement]` 在每次 open/close **剧烈变化**（大量 pending 微任务）× 菜单 open→立即 close/unmount 常见（卸载窗口撞上）。差别在「触发频次 × 卸载竞态窗口」，非结构正确性。

## 子问题 3（类型层）：从数组源解构 element 用 addEventListener → TS2769
- **机制**：addEventListener（actview-utils/src/addEventListener.ts:38-52）重载 1 要求 `target extends KnownEventTarget`（HTMLElement/Window/Document…）才有精确事件类型；数组源解构出的 element 是宽松/any → 命中重载 2（无事件类型映射）→ typed handler 逆变不匹配。
- **正确模式**（NumberFieldScrubArea.tsx:233-250 同场景）：watch 源只放纯响应式条件 `() => [disabled, readOnly]`，**回调体内** `const element = rootRef.value` 读 ref + `if (!element) return` 收窄 HTMLElement → 命中重载 1。最小改动 `element as HTMLElement`。

## 通用规则（三合一）
1. watch 数组源：只放 ref / 标量 getter（`() => ref.value`）；**不放函数方法、不放会重建引用的对象字面量**（引用比较防死循环，AD-13）。
2. DOM 元素与 store 逻辑：在**回调体内**从 ref 读，不要从数组源解构。
3. 数组回调解构前：`Array.isArray(newVals) ? newVals : []` 防御卸载期 undefined。

## 文件证据
- E:\actview\packages\core\src\reactivity\watch.ts:76-82（:81 已加 active 守卫）、:87、:96-109、:138-144
- E:\actview\packages\core\src\reactivity\reactive-system.ts:16-17（queueJob 有守卫对照）、:66-67（run 停后回 undefined）、:87-92（stop→active=false）
- internals/useTransitionStatus.ts:29,50,87（有守卫）、:66（漏网已补）；internals/useOpenChangeComplete.tsx:16；floating-ui-actview/hooks/useSyncedFloatingRootContext.ts:85
- actview-utils/src/addEventListener.ts:38-52；number-field/scrub-area/NumberFieldScrubArea.tsx:233-250
- 既有守卫范本：floating-ui-actview/hooks/useDismiss.ts:282、components/FloatingFocusManager.tsx:306,332,389,565,618,696,842,860,880
- plantform-diff.md AD-13/AD-33
