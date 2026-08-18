# actview toast 移植修复：addEventListener 类型 / context 解包 / 快照响应 / store 导入路径

## 问题
toast（packages/actview/src/toast/）移植时 tsgo 报错：1) watch 数组解构的 element 上 addEventListener 监听 touchmove 的 `(event: TouchEvent)=>{...}` 报 TS2769；2) useToastProviderContext() 返回 ComputedRef<Store> 拿 store 调 useState 的正确姿势；3) 从 context 解构出的普通值（expanded: boolean）setup 期是快照，子组件如何响应式读最新；4) src/toast/store.ts 导入 floating-ui-actview/utils 的相对路径。

## 结论（Evidence level: S6 — 全源码分析）

### (1) addEventListener 的 TS2769 —— 不要从 watch 数组源解构 element
- **根因**：`addEventListener`（actview-utils/src/addEventListener.ts:38-52）有 2 个重载：重载1 要求 `target extends KnownEventTarget`（含 HTMLElement/Window/Document 等）才用 `EventMap` 提供精确事件类型；重载2 落到 `EventListenerOrEventListenerObject`（宽松、无事件类型映射）。
- 从 `watch([() => ref.value, ...], ([element, enabled]) => ...)` **数组源解构**得到的 `element` 类型被推断为宽松/any，**命中重载2** → `(event: TouchEvent) => void` 逆变不匹配 `EventListener` → TS2769。
- **本项目既有正确模式（NumberFieldScrubArea.tsx:233-250，同场景：touchstart preventDefault）**：watch 源只放**纯响应式条件**（`() => [disabled, readOnly]`），**回调体内再 `const element = scrubAreaRef.current`** 从 ref 读元素并用 `if (!element ...) return` 收窄到 `HTMLElement` → 命中重载1，typed handler 正常。
- **修复（推荐，对齐 NumberFieldScrubArea）**：ToastRoot.tsx:404-431 改为
  ```ts
  watch(
    () => [rootRef.value, swipeEnabled],   // 或仅 [] 用条件再读 ref
    (_nv, _old, onCleanup) => {
      const element = rootRef.value;        // 回调体内读 ref
      if (!enabled2 || !element) return;    // 收窄 HTMLElement
      const cleanup = addEventListener(element, 'touchmove', preventDefaultTouchStart, { passive: false });
      onCleanup(cleanup);
    },
    { immediate: true },
  );
  ```
  - 若只是想在现有数组解构上最小改动：`addEventListener(element as HTMLElement, 'touchmove', ...)` 显式断言 target 为具体 DOM 类型即命中重载1。
- 其它既有 typed addEventListener 例：SliderControl.tsx:435（control:'touchstart'）、NumberFieldScrubArea.tsx:207-208（win:'pointerup/move'）、useDismiss.ts:705+（doc:*）、FloatingFocusManager.tsx:548+（domReferenceElement/*）—— target 都是具体 DOM 类型才能 typed listener。

### (2) 从 ComputedRef<Store> 拿 store —— `.value!` 解包
- `useToastProviderContext()` 返回 `ComputedRef<ToastContext>`（ToastProviderContext.ts:9-14）；toast 全局惯例 **`const store = useToastProviderContext().value!;`**（ToastRoot.tsx:60、ToastViewport.tsx:28、ToastClose.tsx:24、ToastPositioner.tsx:32），然后 `store.useState(...)`/`store.set(...)`/`store.pauseTimers()` 直接调用。
- ~~**Bug**：`useToastManager.ts` 曾在 ComputedRef 上直接 `store.useState('toasts')`（无此方法）~~ **已修复**：现为 `const toasts = store.value!.useState('toasts')`。（任何 `ComputedRef<SomeStore>` 拆出 store 都要 `.value!` 再调方法。）

### (3) context 普通值（expanded: boolean）快照 —— 在 computed/渲染 getter 内重读 context.value
- `ToastRootContext`（ToastRootContext.ts:9-16）里 `expanded: boolean` 等是**普通值非 ref**；provider 用 `computed(() => ({ ..., expanded: expanded.value, visibleIndex: visibleIndex.value }))` 提供——整个 context **每次重算**。
- setup 期 `const { expanded } = useToastRootContext().value!` 解构的是**快照**（setup 只跑一次，PD-15/AD-35）→ 不响应 + `expanded` 是 boolean 却写 `expanded.value`（TS 错）。~~ToastContent/ToastClose 最初有此坏例，已在移植时修复。~~
- **正确模式**：读 `context.value.X` 放 **computed/渲染 getter 里**（利用 context 是 ComputedRef 的重算）：
  ```ts
  const context = useToastRootContext();
  const behind = computed(() => context.value.visibleIndex > 0);
  const state = computed(() => ({ expanded: context.value.expanded, behind: behind.value }));
  ```
- **注意**：从 context 取**稳定**的东西（toast 对象、setTitleId/setDescriptionId/recalculateHeight 回调）仍可 setup 解构一次；只有**响应式值**（numeric/boolean 随 store 变化）必须放 computed/getter 里重读。

### (4) src/toast/store.ts 到 floating-ui-actview/utils 的相对路径 —— 已是正确写法
- `src/toast/store.ts` → `../../floating-ui-actview/utils` = `src/floating-ui-actview/utils`（`..`→src/toast/，`../..`→src/）。**无需修改**。
- 该目标即桶 `floating-ui-actview/utils.ts`（utils.ts:1-5 `export * from './utils/element'` 等），`activeElement/contains/getTarget` 从 element.ts:3,7 re-export shadowDom；toast 其它文件同款 `'../../floating-ui-actview/utils'`（ToastRoot.tsx:5、ToastViewport.tsx:7）。

## 文件证据
- actview-utils/src/addEventListener.ts:38-52（两重载）
- number-field/scrub-area/NumberFieldScrubArea.tsx:233-250（watch 回调体读 ref + addEventListener typed）
- toast/root/ToastRoot.tsx:71,404-431（问题源）,60（.value!）,473-480（computed context）
- toast/provider/ToastProviderContext.ts:9-14; toast/root/ToastRootContext.ts:9-16,23-31
- toast/useToastManager.ts:13-15（bug: 未 .value!）
- toast/content/ToastContent.tsx:20,47,50（快照+误当 ref bug）
- toast/close/ToastClose.tsx:25,37
- toast/store.ts:12（路径正确）
- floating-ui-actview/utils.ts:1-5; utils/element.ts:3,7（shadowDom re-export）
- 既有 typed addEventListener 范本：SliderControl.tsx:435、useDismiss.ts:705+、FloatingFocusManager.tsx:548+

> 本文是 toast 移植的**类型级**修复（tsgo 层面）；toast 渲染/更新运行时问题的诊断链路见 toast-render-diagnostics.md（AI-003、waitFor、PD-15 解构冻结、getter 合并 prev、prop 泄漏）。
